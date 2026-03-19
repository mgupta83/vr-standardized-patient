import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  WebXRDefaultExperience,
  PointLight,
  Color4,
  WebXRState,
  DynamicTexture,
  SpotLight,
} from '@babylonjs/core';
import { useAuthStore } from '../context/authStore.js';
import { api } from '../services/api.js';
import type { Scenario } from '@vr-sp/shared';

// ─── helpers ──────────────────────────────────────────────────────────────────

function vitalColor(hr: number, spo2: number): string {
  if (spo2 < 90 || hr > 130 || hr < 40) return '#ff4444';
  if (spo2 < 95 || hr > 110 || hr < 55) return '#ffaa00';
  return '#00ff88';
}

function drawMonitorTexture(ctx: CanvasRenderingContext2D, scenario: Scenario | null) {
  const W = 512;
  const H = 384;
  ctx.fillStyle = '#001a0a';
  ctx.fillRect(0, 0, W, H);

  // Border glow
  ctx.strokeStyle = '#00ff8844';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  if (!scenario) {
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VITAL SIGNS MONITOR', W / 2, 50);
    ctx.font = '18px monospace';
    ctx.fillStyle = '#33ff88aa';
    ctx.fillText('Loading patient data…', W / 2, H / 2);
    return;
  }

  const vs = scenario.patientProfile.vitalSigns;
  const color = vitalColor(vs.heartRate, vs.oxygenSaturation);

  // Title
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('VITAL SIGNS MONITOR', 16, 30);

  // Separator
  ctx.strokeStyle = '#00ff8833';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(16, 40);
  ctx.lineTo(W - 16, 40);
  ctx.stroke();

  // Patient name
  ctx.fillStyle = '#88ffcc';
  ctx.font = '14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`PT: ${scenario.patientProfile.name.toUpperCase()}`, 16, 62);

  // Main vitals
  const vitals = [
    {
      label: 'HEART RATE',
      value: `${vs.heartRate}`,
      unit: 'bpm',
      warn: vs.heartRate > 110 || vs.heartRate < 55,
    },
    {
      label: 'BLOOD PRESSURE',
      value: `${vs.bloodPressure.systolic}/${vs.bloodPressure.diastolic}`,
      unit: 'mmHg',
      warn: vs.bloodPressure.systolic > 180 || vs.bloodPressure.systolic < 90,
    },
    {
      label: 'SpO₂',
      value: `${vs.oxygenSaturation}`,
      unit: '%',
      warn: vs.oxygenSaturation < 94,
    },
    {
      label: 'RESP RATE',
      value: `${vs.respiratoryRate}`,
      unit: '/min',
      warn: vs.respiratoryRate > 25 || vs.respiratoryRate < 10,
    },
    {
      label: 'TEMP',
      value: `${vs.temperature.toFixed(1)}`,
      unit: '°C',
      warn: vs.temperature > 38.0 || vs.temperature < 36.0,
    },
  ];

  vitals.forEach((v, i) => {
    const y = 95 + i * 56;
    const lineColor = v.warn ? '#ff6644' : color;

    // Row background
    ctx.fillStyle = v.warn ? '#1a0800' : '#001a0a';
    ctx.fillRect(12, y - 20, W - 24, 48);

    // Label
    ctx.fillStyle = '#668877';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(v.label, 20, y - 4);

    // Value
    ctx.fillStyle = lineColor;
    ctx.font = `bold 26px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(v.value, W - 70, y + 20);

    // Unit
    ctx.fillStyle = '#668877';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(v.unit, W - 62, y + 20);

    // Warning indicator
    if (v.warn) {
      ctx.fillStyle = '#ff6644';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('!', W - 22, y + 20);
    }
  });

  // ECG-style line (simulated)
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const lineY = H - 30;
  for (let x = 16; x < W - 16; x += 2) {
    const t = (x / W) * Math.PI * 8;
    const peak = Math.sin(t) > 0.95 ? -20 : Math.sin(t) * 4;
    if (x === 16) ctx.moveTo(x, lineY + peak);
    else ctx.lineTo(x, lineY + peak);
  }
  ctx.stroke();

  // Timestamp
  ctx.fillStyle = '#334455';
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleTimeString(), W - 16, H - 8);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VRScene() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const monitorTexRef = useRef<DynamicTexture | null>(null);
  const [xrState, setXrState] = useState<string>('Desktop Mode');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [showPatientPanel, setShowPatientPanel] = useState(true);

  // ── Fetch scenario data ───────────────────────────────────────────────────

  useEffect(() => {
    if (!token || !scenarioId) return;
    api.scenarios.get(token, scenarioId).then(setScenario).catch(console.error);
    api.sessions
      .start(token, scenarioId)
      .then((s) => setSessionId(s.id))
      .catch(console.error);
  }, [token, scenarioId]);

  // ── Update monitor texture whenever scenario loads ────────────────────────

  useEffect(() => {
    const tex = monitorTexRef.current;
    if (!tex) return;
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    drawMonitorTexture(ctx, scenario);
    tex.update();
  }, [scenario]);

  // ── BabylonJS scene ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const engine = new Engine(canvas, true, { adaptToDeviceRatio: true, antialias: true });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.02, 0.02, 0.08, 1);

    // ── Camera ─────────────────────────────────────────────────────────────
    const camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3.5, 7, new Vector3(0, 0.6, 0), scene);
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 18;
    camera.wheelPrecision = 50;
    camera.attachControl(canvas, true);

    // ── Lighting ───────────────────────────────────────────────────────────
    const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
    ambient.intensity = 0.35;
    ambient.groundColor = new Color3(0.05, 0.05, 0.1);

    const overheadLight = new SpotLight(
      'overhead',
      new Vector3(0, 4, 0),
      new Vector3(0, -1, 0),
      Math.PI / 3,
      2,
      scene,
    );
    overheadLight.intensity = 0.8;
    overheadLight.diffuse = new Color3(0.95, 0.92, 1.0);

    const monitorGlow = new PointLight('monitorGlow', new Vector3(-1.5, 1.4, -0.3), scene);
    monitorGlow.intensity = 0.3;
    monitorGlow.diffuse = new Color3(0.0, 0.8, 0.5);

    // ── Floor ──────────────────────────────────────────────────────────────
    const floor = MeshBuilder.CreateGround('floor', { width: 14, height: 14 }, scene);
    const floorMat = new StandardMaterial('floorMat', scene);
    floorMat.diffuseColor = new Color3(0.08, 0.09, 0.12);
    floorMat.specularColor = new Color3(0.05, 0.05, 0.05);
    floor.material = floorMat;

    // ── Ceiling tiles ──────────────────────────────────────────────────────
    const ceiling = MeshBuilder.CreateGround('ceiling', { width: 14, height: 14 }, scene);
    ceiling.position = new Vector3(0, 4, 0);
    ceiling.rotation.x = Math.PI;
    const ceilMat = new StandardMaterial('ceilMat', scene);
    ceilMat.diffuseColor = new Color3(0.18, 0.18, 0.22);
    ceiling.material = ceilMat;

    // ── Walls ──────────────────────────────────────────────────────────────
    const wallMat = new StandardMaterial('wallMat', scene);
    wallMat.diffuseColor = new Color3(0.13, 0.14, 0.18);

    [
      { pos: new Vector3(0, 2, -7), rot: new Vector3(0, 0, 0), w: 14, h: 4 },
      { pos: new Vector3(-7, 2, 0), rot: new Vector3(0, Math.PI / 2, 0), w: 14, h: 4 },
      { pos: new Vector3(7, 2, 0), rot: new Vector3(0, Math.PI / 2, 0), w: 14, h: 4 },
    ].forEach(({ pos, rot, w, h }, i) => {
      const wall = MeshBuilder.CreateBox(`wall${i}`, { width: w, height: h, depth: 0.1 }, scene);
      wall.position = pos;
      wall.rotation = rot;
      wall.material = wallMat;
    });

    // ── Exam table ─────────────────────────────────────────────────────────
    const tableBase = MeshBuilder.CreateBox('tableBase', { width: 2.2, height: 0.08, depth: 0.9 }, scene);
    tableBase.position = new Vector3(0, 0.75, 0);
    const tableMat = new StandardMaterial('tableMat', scene);
    tableMat.diffuseColor = new Color3(0.88, 0.88, 0.84);
    tableMat.specularColor = new Color3(0.1, 0.1, 0.1);
    tableBase.material = tableMat;

    // Table legs
    [[-0.95, -0.8], [0.95, -0.8], [-0.95, 0.8], [0.95, 0.8]].forEach(([x, z], i) => {
      const leg = MeshBuilder.CreateBox(`leg${i}`, { width: 0.06, height: 0.75, depth: 0.06 }, scene);
      leg.position = new Vector3(x, 0.375, z as number);
      const legMat = new StandardMaterial(`legMat${i}`, scene);
      legMat.diffuseColor = new Color3(0.7, 0.7, 0.72);
      leg.material = legMat;
    });

    // ── Patient body ────────────────────────────────────────────────────────
    const skinColor = new Color3(0.85, 0.72, 0.62);
    const skinMat = new StandardMaterial('skinMat', scene);
    skinMat.diffuseColor = skinColor;

    // Torso
    const torso = MeshBuilder.CreateBox('torso', { width: 0.48, height: 0.3, depth: 1.3 }, scene);
    torso.position = new Vector3(0.1, 0.85, 0.05);
    torso.material = skinMat;

    // Head
    const head = MeshBuilder.CreateSphere('head', { diameter: 0.32, segments: 12 }, scene);
    head.position = new Vector3(0.1, 0.88, 0.85);
    head.material = skinMat;

    // Pillow
    const pillow = MeshBuilder.CreateBox('pillow', { width: 0.5, height: 0.1, depth: 0.4 }, scene);
    pillow.position = new Vector3(0.1, 0.82, 0.85);
    const pillowMat = new StandardMaterial('pillowMat', scene);
    pillowMat.diffuseColor = new Color3(0.95, 0.92, 0.88);
    pillow.material = pillowMat;

    // Arms
    [-0.31, 0.31].forEach((xOff, i) => {
      const arm = MeshBuilder.CreateCapsule(`arm${i}`, { radius: 0.065, height: 1.0, tessellation: 8 }, scene);
      arm.position = new Vector3(xOff + 0.1, 0.85, 0.1);
      arm.material = skinMat;
    });

    // Legs
    [-0.14, 0.14].forEach((xOff, i) => {
      const leg = MeshBuilder.CreateCapsule(`leg${i}`, { radius: 0.09, height: 1.3, tessellation: 8 }, scene);
      leg.position = new Vector3(xOff + 0.1, 0.85, -0.6);
      leg.material = skinMat;
    });

    // Hospital gown (covering patient body)
    const gown = MeshBuilder.CreateBox('gown', { width: 0.54, height: 0.32, depth: 1.35 }, scene);
    gown.position = new Vector3(0.1, 0.83, 0.02);
    const gownMat = new StandardMaterial('gownMat', scene);
    gownMat.diffuseColor = new Color3(0.55, 0.72, 0.85);
    gownMat.alpha = 0.9;
    gown.material = gownMat;

    // Blanket
    const blanket = MeshBuilder.CreateBox('blanket', { width: 0.58, height: 0.04, depth: 1.1 }, scene);
    blanket.position = new Vector3(0.1, 0.855, -0.35);
    const blanketMat = new StandardMaterial('blanketMat', scene);
    blanketMat.diffuseColor = new Color3(0.22, 0.42, 0.62);
    blanket.material = blanketMat;

    // IV pole
    const ivPole = MeshBuilder.CreateCylinder('ivPole', { height: 2.2, diameter: 0.03, tessellation: 8 }, scene);
    ivPole.position = new Vector3(-1.3, 1.1, 0.7);
    const metalMat = new StandardMaterial('metalMat', scene);
    metalMat.diffuseColor = new Color3(0.75, 0.75, 0.78);
    metalMat.specularColor = new Color3(0.3, 0.3, 0.3);
    ivPole.material = metalMat;

    // IV bag
    const ivBag = MeshBuilder.CreateBox('ivBag', { width: 0.15, height: 0.25, depth: 0.04 }, scene);
    ivBag.position = new Vector3(-1.3, 2.15, 0.7);
    const ivMat = new StandardMaterial('ivMat', scene);
    ivMat.diffuseColor = new Color3(0.75, 0.9, 0.75);
    ivMat.alpha = 0.7;
    ivBag.material = ivMat;

    // ── Vital signs monitor (on stand) ────────────────────────────────────
    const monitorStand = MeshBuilder.CreateCylinder(
      'monitorStand',
      { height: 1.5, diameter: 0.05, tessellation: 8 },
      scene,
    );
    monitorStand.position = new Vector3(-1.6, 0.75, -0.6);
    monitorStand.material = metalMat;

    const monitorScreen = MeshBuilder.CreateBox(
      'monitorScreen',
      { width: 0.85, height: 0.6, depth: 0.06 },
      scene,
    );
    monitorScreen.position = new Vector3(-1.6, 1.55, -0.6);
    monitorScreen.rotation.y = Math.PI / 8;
    const monitorMat = new StandardMaterial('monitorMat', scene);

    // DynamicTexture for real patient data
    const monitorTex = new DynamicTexture('monitorTex', { width: 512, height: 384 }, scene, false);
    monitorTexRef.current = monitorTex;
    const ctx = monitorTex.getContext() as CanvasRenderingContext2D;
    drawMonitorTexture(ctx, null);
    monitorTex.update();

    monitorMat.diffuseColor = new Color3(0.05, 0.05, 0.05);
    monitorMat.emissiveTexture = monitorTex;
    monitorScreen.material = monitorMat;

    // Monitor bezel
    const bezel = MeshBuilder.CreateBox('bezel', { width: 0.92, height: 0.67, depth: 0.05 }, scene);
    bezel.position = new Vector3(-1.6, 1.55, -0.565);
    bezel.rotation.y = Math.PI / 8;
    const bezelMat = new StandardMaterial('bezelMat', scene);
    bezelMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
    bezel.material = bezelMat;

    // ── Medical cart ───────────────────────────────────────────────────────
    const cart = MeshBuilder.CreateBox('cart', { width: 0.6, height: 0.8, depth: 0.4 }, scene);
    cart.position = new Vector3(1.6, 0.4, -0.3);
    const cartMat = new StandardMaterial('cartMat', scene);
    cartMat.diffuseColor = new Color3(0.75, 0.75, 0.78);
    cart.material = cartMat;

    const cartTop = MeshBuilder.CreateBox('cartTop', { width: 0.65, height: 0.03, depth: 0.45 }, scene);
    cartTop.position = new Vector3(1.6, 0.815, -0.3);
    cartTop.material = tableMat;

    // Stethoscope on cart
    const stetho = MeshBuilder.CreateTorus('stetho', { diameter: 0.12, thickness: 0.015, tessellation: 12 }, scene);
    stetho.position = new Vector3(1.58, 0.84, -0.28);
    const stethMat = new StandardMaterial('stethMat', scene);
    stethMat.diffuseColor = new Color3(0.15, 0.15, 0.15);
    stetho.material = stethMat;

    // ── Chair ──────────────────────────────────────────────────────────────
    const chairSeat = MeshBuilder.CreateBox('chair', { width: 0.45, height: 0.05, depth: 0.45 }, scene);
    chairSeat.position = new Vector3(1.8, 0.47, 0.8);
    chairSeat.material = tableMat;

    const chairBack = MeshBuilder.CreateBox('chairBack', { width: 0.45, height: 0.5, depth: 0.05 }, scene);
    chairBack.position = new Vector3(1.8, 0.75, 0.58);
    chairBack.material = tableMat;

    // ── WebXR ──────────────────────────────────────────────────────────────
    WebXRDefaultExperience.CreateAsync(scene, {
      floorMeshes: [floor],
      optionalFeatures: true,
    })
      .then((xr) => {
        xr.baseExperience.onStateChangedObservable.add((state) => {
          switch (state) {
            case WebXRState.IN_XR:
              setXrState('In VR');
              break;
            case WebXRState.ENTERING_XR:
              setXrState('Entering VR…');
              break;
            case WebXRState.EXITING_XR:
              setXrState('Exiting VR…');
              break;
            default:
              setXrState('Desktop Mode');
          }
        });
      })
      .catch((err: Error) =>
        console.info('WebXR not available, running in desktop mode.', err.message),
      );

    // Render loop
    engine.runRenderLoop(() => scene.render());
    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      monitorTexRef.current = null;
      engine.dispose();
    };
  }, []);

  // ── Session end ───────────────────────────────────────────────────────────

  const handleEnd = async () => {
    if (token && sessionId) {
      await api.sessions.complete(token, sessionId).catch(console.error);
    }
    navigate('/');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const vs = scenario?.patientProfile.vitalSigns;
  const inXR = xrState === 'In VR';

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />

      {/* ── Top HUD ── */}
      <div style={hudStyle}>
        <span style={{ color: '#a78bfa', fontWeight: 700 }}>🏥 VR-SP</span>
        {scenario && (
          <span style={{ color: '#e2e8f0', fontSize: '0.85rem', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {scenario.title}
          </span>
        )}
        <span style={{ color: xrState === 'In VR' ? '#22c55e' : '#64748b', fontSize: '0.75rem' }}>
          {xrState}
        </span>
        <button onClick={handleEnd} style={endBtnStyle}>
          ✕ End Session
        </button>
      </div>

      {/* ── Patient info panel (left) — hidden in XR ── */}
      {!inXR && scenario && showPatientPanel && (
        <div style={patientPanelStyle}>
          <div style={panelHeaderStyle}>
            <span style={{ fontWeight: 700, color: '#a78bfa' }}>👤 Patient Chart</span>
            <button
              style={closeBtnStyle}
              onClick={() => setShowPatientPanel(false)}
              title="Hide panel"
            >
              ✕
            </button>
          </div>

          <div style={panelRowStyle}>
            <span style={labelStyle}>Name</span>
            <span style={valueStyle}>{scenario.patientProfile.name}</span>
          </div>
          <div style={panelRowStyle}>
            <span style={labelStyle}>Age / Sex</span>
            <span style={valueStyle}>
              {scenario.patientProfile.age} y/o {scenario.patientProfile.gender}
            </span>
          </div>

          <div style={dividerStyle} />

          <div style={{ ...panelRowStyle, flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem' }}>
            <span style={labelStyle}>Chief Complaint</span>
            <span style={{ ...valueStyle, fontStyle: 'italic', color: '#fde68a', lineHeight: 1.4 }}>
              &ldquo;{scenario.patientProfile.chiefComplaint}&rdquo;
            </span>
          </div>

          <div style={{ ...panelRowStyle, flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem' }}>
            <span style={labelStyle}>History</span>
            <span style={{ ...valueStyle, color: '#94a3b8', lineHeight: 1.4, fontSize: '0.78rem' }}>
              {scenario.patientProfile.history}
            </span>
          </div>

          <div style={dividerStyle} />

          {/* Scenario meta */}
          <div style={panelRowStyle}>
            <span style={labelStyle}>Difficulty</span>
            <span style={{ ...valueStyle, color: diffColor(scenario.difficulty) }}>
              {scenario.difficulty.toUpperCase()}
            </span>
          </div>
          <div style={panelRowStyle}>
            <span style={labelStyle}>Duration</span>
            <span style={valueStyle}>{scenario.durationMinutes} minutes</span>
          </div>
        </div>
      )}

      {/* Show panel toggle when hidden */}
      {!inXR && scenario && !showPatientPanel && (
        <button style={showPanelBtnStyle} onClick={() => setShowPatientPanel(true)}>
          👤 Patient Chart
        </button>
      )}

      {/* ── Vitals panel (right) — hidden in XR ── */}
      {!inXR && vs && (
        <div style={vitalsPanelStyle}>
          <div style={{ ...panelHeaderStyle, marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 700, color: '#00ff88' }}>📊 Vital Signs</span>
          </div>

          <VitalRow
            label="Heart Rate"
            value={`${vs.heartRate} bpm`}
            warn={vs.heartRate > 110 || vs.heartRate < 55}
          />
          <VitalRow
            label="Blood Pressure"
            value={`${vs.bloodPressure.systolic} / ${vs.bloodPressure.diastolic} mmHg`}
            warn={vs.bloodPressure.systolic > 180 || vs.bloodPressure.systolic < 90}
          />
          <VitalRow
            label="SpO₂"
            value={`${vs.oxygenSaturation}%`}
            warn={vs.oxygenSaturation < 94}
            critical={vs.oxygenSaturation < 90}
          />
          <VitalRow
            label="Resp. Rate"
            value={`${vs.respiratoryRate} /min`}
            warn={vs.respiratoryRate > 25 || vs.respiratoryRate < 10}
          />
          <VitalRow
            label="Temperature"
            value={`${vs.temperature.toFixed(1)} °C`}
            warn={vs.temperature > 38.0 || vs.temperature < 36.0}
          />

          {/* Alarm indicator */}
          {(vs.oxygenSaturation < 90 || vs.heartRate > 130) && (
            <div style={alarmStyle}>⚠️ CRITICAL — IMMEDIATE ATTENTION</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VitalRow({
  label,
  value,
  warn = false,
  critical = false,
}: {
  label: string;
  value: string;
  warn?: boolean;
  critical?: boolean;
}) {
  return (
    <div style={{ ...vitalRowStyle, background: critical ? 'rgba(239,68,68,0.15)' : warn ? 'rgba(245,158,11,0.1)' : 'transparent' }}>
      <span style={vitalLabelStyle}>{label}</span>
      <span
        style={{
          ...vitalValueStyle,
          color: critical ? '#f87171' : warn ? '#fbbf24' : '#00ff88',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function diffColor(d: string) {
  return d === 'beginner' ? '#22c55e' : d === 'intermediate' ? '#f59e0b' : '#ef4444';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const glassBase: React.CSSProperties = {
  background: 'rgba(10,10,20,0.85)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#f0f0f0',
  fontFamily: 'system-ui, sans-serif',
};

const hudStyle: React.CSSProperties = {
  ...glassBase,
  position: 'absolute',
  top: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '0.5rem 1.25rem',
  borderRadius: 24,
  zIndex: 20,
};

const endBtnStyle: React.CSSProperties = {
  padding: '0.3rem 0.75rem',
  background: 'rgba(239,68,68,0.25)',
  color: '#f87171',
  border: '1px solid rgba(239,68,68,0.5)',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: '0.8rem',
};

const patientPanelStyle: React.CSSProperties = {
  ...glassBase,
  position: 'absolute',
  top: 70,
  left: 16,
  width: 280,
  maxHeight: 'calc(100vh - 100px)',
  overflowY: 'auto',
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  zIndex: 20,
};

const vitalsPanelStyle: React.CSSProperties = {
  ...glassBase,
  position: 'absolute',
  top: 70,
  right: 16,
  width: 260,
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  zIndex: 20,
};

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.9rem',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#64748b',
  cursor: 'pointer',
  fontSize: '0.8rem',
  padding: '0 0.25rem',
};

const showPanelBtnStyle: React.CSSProperties = {
  ...glassBase,
  position: 'absolute',
  top: 70,
  left: 16,
  padding: '0.4rem 0.8rem',
  border: '1px solid rgba(167,139,250,0.4)',
  color: '#a78bfa',
  cursor: 'pointer',
  fontSize: '0.8rem',
  zIndex: 20,
};

const panelRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '0.5rem',
};

const labelStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: '0.75rem',
  flexShrink: 0,
  marginTop: '0.1rem',
};

const valueStyle: React.CSSProperties = {
  color: '#e2e8f0',
  fontSize: '0.82rem',
  textAlign: 'right',
};

const dividerStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(255,255,255,0.07)',
  margin: '0.25rem 0',
};

const vitalRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.3rem 0.4rem',
  borderRadius: 6,
};

const vitalLabelStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: '0.75rem',
};

const vitalValueStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: '0.9rem',
  fontFamily: 'monospace',
};

const alarmStyle: React.CSSProperties = {
  background: 'rgba(239,68,68,0.2)',
  border: '1px solid #f87171',
  borderRadius: 6,
  color: '#f87171',
  fontSize: '0.75rem',
  fontWeight: 700,
  textAlign: 'center',
  padding: '0.4rem',
  marginTop: '0.5rem',
  animation: 'pulse 1.5s ease-in-out infinite',
};
