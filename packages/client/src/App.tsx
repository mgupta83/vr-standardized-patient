import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './context/authStore.js';
import { LoginPage } from './components/LoginPage.js';
import { VRScene } from './scenes/VRScene.js';
import { ScenarioList } from './components/ScenarioList.js';

export function App() {
  const token = useAuthStore((s) => s.token);

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={token ? <ScenarioList /> : <Navigate to="/login" replace />} />
      <Route
        path="/scene/:scenarioId"
        element={token ? <VRScene /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}
