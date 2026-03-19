import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/authStore.js';
import { api } from '../services/api.js';
import type { Scenario } from '@vr-sp/shared';

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
      .then((res) => setScenarios(res.data as Scenario[]))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleStart = async (scenarioId: string) => {
    navigate(`/scene/${scenarioId}`);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🏥 VR Standardized Patient</h1>
        <div style={styles.userBar}>
          <span style={styles.userName}>{user?.name}</span>
          <button style={styles.logoutBtn} onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <h2 style={styles.sectionTitle}>Available Scenarios</h2>
        {loading && <p style={styles.message}>Loading scenarios…</p>}
        {error && <p style={styles.error}>{error}</p>}
        {!loading && scenarios.length === 0 && (
          <p style={styles.message}>
            No scenarios yet. Ask an instructor to create one.
          </p>
        )}
        <div style={styles.grid}>
          {scenarios.map((s) => (
            <div key={s.id} style={styles.card}>
              <div style={styles.badge}>{s.difficulty}</div>
              <h3 style={styles.cardTitle}>{s.title}</h3>
              <p style={styles.cardDesc}>{s.description}</p>
              <div style={styles.cardMeta}>
                <span>⏱ {s.durationMinutes} min</span>
                <span>🏷 {s.tags.join(', ')}</span>
              </div>
              <button style={styles.startBtn} onClick={() => handleStart(s.id)}>
                ▶ Enter VR Scene
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

const difficultyColor: Record<string, string> = {
  beginner: '#22c55e',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.3)',
  },
  title: { color: '#a78bfa', fontSize: '1.5rem' },
  userBar: { display: 'flex', alignItems: 'center', gap: '1rem' },
  userName: { color: '#e2e8f0' },
  logoutBtn: {
    padding: '0.4rem 1rem',
    background: 'rgba(239,68,68,0.2)',
    color: '#f87171',
    border: '1px solid #f87171',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  main: { flex: 1, padding: '2rem' },
  sectionTitle: { color: '#e2e8f0', marginBottom: '1.5rem' },
  message: { color: '#94a3b8', textAlign: 'center', marginTop: '3rem' },
  error: { color: '#f87171' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  badge: {
    display: 'inline-block',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#22c55e',
  },
  cardTitle: { color: '#f0f0f0', fontSize: '1.1rem' },
  cardDesc: { color: '#94a3b8', fontSize: '0.875rem', flex: 1 },
  cardMeta: { display: 'flex', gap: '1rem', color: '#64748b', fontSize: '0.8rem' },
  startBtn: {
    padding: '0.6rem 1rem',
    background: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    marginTop: '0.5rem',
  },
};

// Apply difficulty color dynamically
void difficultyColor;
