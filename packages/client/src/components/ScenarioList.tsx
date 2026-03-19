import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/authStore.js';
import { api } from '../services/api.js';
import type { Scenario } from '@vr-sp/shared';

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: '#22c55e',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

const DIFFICULTY_BG: Record<string, string> = {
  beginner: 'rgba(34,197,94,0.15)',
  intermediate: 'rgba(245,158,11,0.15)',
  advanced: 'rgba(239,68,68,0.15)',
};

export function ScenarioList() {
  const { token, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api.scenarios
      .list(token)
      .then((res) => setScenarios(res.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleStart = (scenarioId: string) => {
    navigate(`/scene/${scenarioId}`);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>🏥</span>
          <div>
            <h1 style={styles.title}>VR Standardized Patient</h1>
            <p style={styles.subtitle}>Medical simulation training platform</p>
          </div>
        </div>
        <div style={styles.userBar}>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{user?.name}</span>
            <span
              style={{
                ...styles.roleBadge,
                background: user?.role === 'admin' ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.1)',
                color: user?.role === 'admin' ? '#a78bfa' : '#94a3b8',
              }}
            >
              {user?.role}
            </span>
          </div>
          <button style={styles.logoutBtn} onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Available Scenarios</h2>
          <span style={styles.scenarioCount}>
            {!loading && `${scenarios.length} scenario${scenarios.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {loading && (
          <div style={styles.centered}>
            <p style={styles.message}>Loading scenarios…</p>
          </div>
        )}
        {error && <p style={styles.error}>⚠️ {error}</p>}
        {!loading && scenarios.length === 0 && !error && (
          <div style={styles.centered}>
            <p style={{ fontSize: '3rem' }}>🩺</p>
            <p style={styles.message}>No scenarios available yet.</p>
            <p style={{ ...styles.message, fontSize: '0.85rem', marginTop: '0.5rem' }}>
              {user?.role === 'admin' || user?.role === 'instructor'
                ? 'Use the API to POST to /api/scenarios to create one.'
                : 'Ask an instructor or admin to create scenarios.'}
            </p>
          </div>
        )}

        <div style={styles.grid}>
          {scenarios.map((s) => (
            <ScenarioCard key={s.id} scenario={s} onStart={handleStart} />
          ))}
        </div>
      </main>
    </div>
  );
}

function ScenarioCard({
  scenario: s,
  onStart,
}: {
  scenario: Scenario;
  onStart: (id: string) => void;
}) {
  const color = DIFFICULTY_COLOR[s.difficulty] ?? '#94a3b8';
  const bg = DIFFICULTY_BG[s.difficulty] ?? 'rgba(148,163,184,0.1)';

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={{ ...styles.badge, color, background: bg }}>{s.difficulty}</span>
        <span style={styles.duration}>⏱ {s.durationMinutes} min</span>
      </div>

      <h3 style={styles.cardTitle}>{s.title}</h3>
      <p style={styles.cardDesc}>{s.description}</p>

      {s.patientProfile && (
        <div style={styles.patientSnippet}>
          <div style={styles.patientHeader}>
            <span style={styles.patientIcon}>👤</span>
            <span style={styles.patientName}>
              {s.patientProfile.name}, {s.patientProfile.age} y/o {s.patientProfile.gender}
            </span>
          </div>
          <p style={styles.chiefComplaint}>
            <em>&ldquo;{s.patientProfile.chiefComplaint}&rdquo;</em>
          </p>
          <div style={styles.vitalsRow}>
            <VitalPill label="HR" value={`${s.patientProfile.vitalSigns.heartRate} bpm`} />
            <VitalPill
              label="BP"
              value={`${s.patientProfile.vitalSigns.bloodPressure.systolic}/${s.patientProfile.vitalSigns.bloodPressure.diastolic}`}
            />
            <VitalPill
              label="SpO₂"
              value={`${s.patientProfile.vitalSigns.oxygenSaturation}%`}
            />
            <VitalPill label="Temp" value={`${s.patientProfile.vitalSigns.temperature}°C`} />
          </div>
        </div>
      )}

      {s.tags.length > 0 && (
        <div style={styles.tags}>
          {s.tags.map((t) => (
            <span key={t} style={styles.tag}>
              #{t}
            </span>
          ))}
        </div>
      )}

      <button style={styles.startBtn} onClick={() => onStart(s.id)}>
        ▶ Enter VR Scene
      </button>
    </div>
  );
}

function VitalPill({ label, value }: { label: string; value: string }) {
  return (
    <span style={styles.vitalPill}>
      <span style={styles.vitalLabel}>{label}</span> {value}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(8px)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  logo: { fontSize: '2rem' },
  title: { color: '#a78bfa', fontSize: '1.25rem', margin: 0 },
  subtitle: { color: '#64748b', fontSize: '0.75rem', margin: 0 },
  userBar: { display: 'flex', alignItems: 'center', gap: '1rem' },
  userInfo: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' },
  userName: { color: '#e2e8f0', fontSize: '0.9rem' },
  roleBadge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '0.1rem 0.5rem',
    borderRadius: 999,
  },
  logoutBtn: {
    padding: '0.4rem 1rem',
    background: 'rgba(239,68,68,0.15)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.4)',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  main: { flex: 1, padding: '2rem' },
  sectionHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  sectionTitle: { color: '#e2e8f0', margin: 0 },
  scenarioCount: { color: '#64748b', fontSize: '0.875rem' },
  centered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40vh',
    gap: '0.5rem',
  },
  message: { color: '#94a3b8', textAlign: 'center' as const },
  error: { color: '#f87171', padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    padding: '0.2rem 0.6rem',
    borderRadius: 999,
  },
  duration: { color: '#64748b', fontSize: '0.8rem' },
  cardTitle: { color: '#f0f0f0', fontSize: '1.05rem', margin: 0 },
  cardDesc: { color: '#94a3b8', fontSize: '0.85rem', margin: 0, flex: 1 },
  patientSnippet: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  patientHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  patientIcon: { fontSize: '1.1rem' },
  patientName: { color: '#e2e8f0', fontSize: '0.875rem', fontWeight: 600 },
  chiefComplaint: {
    color: '#cbd5e1',
    fontSize: '0.8rem',
    margin: 0,
    lineHeight: 1.4,
    fontStyle: 'italic',
  },
  vitalsRow: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' as const, marginTop: '0.25rem' },
  vitalPill: {
    background: 'rgba(124,58,237,0.2)',
    color: '#c4b5fd',
    fontSize: '0.72rem',
    padding: '0.15rem 0.5rem',
    borderRadius: 999,
  },
  vitalLabel: { color: '#a78bfa', fontWeight: 700 },
  tags: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' as const },
  tag: { color: '#64748b', fontSize: '0.75rem' },
  startBtn: {
    padding: '0.65rem 1rem',
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
    marginTop: '0.25rem',
    letterSpacing: '0.02em',
  },
};
