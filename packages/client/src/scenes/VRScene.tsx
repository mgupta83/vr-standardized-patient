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
} from '@babylonjs/core';
import { useAuthStore } from '../context/authStore.js';
import { api } from '../services/api.js';

export function VRScene() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [xrState, setXrState] = useState<string>('Not in XR');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Start the simulation session on mount
  useEffect(() => {
    if (!token || !scenarioId) return;
    api.sessions
      .start(token, scenarioId)
      .then((s) => {
        const session = s as { id: string };
        setSessionId(session.id);
      })
      .catch(console.error);
  }, [token, scenarioId]);

  // BabylonJS scene setup
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const engine = new Engine(canvas, true, {
      adaptToDeviceRatio: true,
      antialias: true,
    });

    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.02, 0.02, 0.08, 1);

    // Camera
    const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3, 8, Vector3.Zero(), scene);
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 20;
    camera.attachControl(canvas, true);

    // Lighting
    const ambientLight = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.4;

    const pointLight = new PointLight('pointLight', new Vector3(0, 4, -2), scene);
    pointLight.intensity = 0.8;
    pointLight.diffuse = new Color3(0.9, 0.85, 1);

    // ─── Environment ─────────────────────────────────────────────────────────

    // Floor
    const floor = MeshBuilder.CreateGround('floor', { width: 12, height: 12 }, scene);
    const floorMat = new StandardMaterial('floorMat', scene);
    floorMat.diffuseColor = new Color3(0.1, 0.1, 0.15);
    floorMat.specularColor = Color3.Black();
    floor.material = floorMat;

    // Exam table (simplified as a box)
    const examTable = MeshBuilder.CreateBox('examTable', { width: 2, height: 0.6, depth: 0.8 }, scene);
    examTable.position = new Vector3(0, 0.3, 0);
    const tableMat = new StandardMaterial('tableMat', scene);
    tableMat.diffuseColor = new Color3(0.95, 0.95, 0.9);
    examTable.material = tableMat;

    // Patient body (simplified representation)
    const patientBody = MeshBuilder.CreateCapsule(
      'patientBody',
      { radius: 0.18, height: 1.7, tessellation: 12 },
      scene,
    );
    patientBody.position = new Vector3(0, 1.15, 0);
    patientBody.rotation.z = Math.PI / 2;
    const patientMat = new StandardMaterial('patientMat', scene);
    patientMat.diffuseColor = new Color3(0.85, 0.7, 0.6);
    patientBody.material = patientMat;

    // Patient head
    const patientHead = MeshBuilder.CreateSphere('patientHead', { diameter: 0.35 }, scene);
    patientHead.position = new Vector3(0.9, 1.15, 0);
    patientHead.material = patientMat;

    // Monitor (simplified as a box)
    const monitor = MeshBuilder.CreateBox('monitor', { width: 0.8, height: 0.6, depth: 0.05 }, scene);
    monitor.position = new Vector3(-1.5, 1.4, -0.5);
    monitor.rotation.y = Math.PI / 6;
    const monitorMat = new StandardMaterial('monitorMat', scene);
    monitorMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
    monitorMat.emissiveColor = new Color3(0, 0.4, 0.3);
    monitor.material = monitorMat;

    // Walls
    const wallBack = MeshBuilder.CreateBox('wallBack', { width: 12, height: 4, depth: 0.1 }, scene);
    wallBack.position = new Vector3(0, 2, -6);
    const wallMat = new StandardMaterial('wallMat', scene);
    wallMat.diffuseColor = new Color3(0.15, 0.15, 0.2);
    wallBack.material = wallMat;

    // ─── WebXR ───────────────────────────────────────────────────────────────

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
              setXrState('Not in XR');
          }
        });
      })
      .catch((err: Error) => {
        // WebXR not supported in this browser/context — desktop fallback
        console.info('WebXR not available, running in desktop mode.', err.message);
      });

    // Render loop
    engine.runRenderLoop(() => scene.render());

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
    };
  }, []);

  const handleEnd = async () => {
    if (token && sessionId) {
      await api.sessions.complete(token, sessionId).catch(console.error);
    }
    navigate('/');
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />

      {/* HUD overlay */}
      <div style={hudStyle}>
        <span style={{ color: '#a78bfa', fontWeight: 700 }}>VR-SP</span>
        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{xrState}</span>
        <button onClick={handleEnd} style={endBtnStyle}>
          End Session
        </button>
      </div>
    </div>
  );
}

const hudStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  background: 'rgba(0,0,0,0.5)',
  backdropFilter: 'blur(8px)',
  padding: '0.5rem 1.25rem',
  borderRadius: 24,
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#f0f0f0',
  fontFamily: 'system-ui, sans-serif',
};

const endBtnStyle: React.CSSProperties = {
  padding: '0.3rem 0.75rem',
  background: 'rgba(239,68,68,0.3)',
  color: '#f87171',
  border: '1px solid #f87171',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: '0.8rem',
};
