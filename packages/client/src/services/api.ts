import type { AuthResponse, LoginRequest, RegisterRequest, Scenario } from '@vr-sp/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    const errorType = (data as { error?: string }).error ?? 'Error';
    const message = (data as { message?: string }).message ?? 'Request failed';
    throw new Error(`[${res.status}] ${errorType}: ${message}`);
  }
  return data as T;
}

function authRequest<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  return request<T>(path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });
}

export const api = {
  auth: {
    login: (body: LoginRequest) =>
      request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    register: (body: RegisterRequest) =>
      request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
  scenarios: {
    list: (token: string, page = 1, pageSize = 10) =>
      authRequest<{ data: Scenario[]; total: number }>(
        `/api/scenarios?page=${page}&pageSize=${pageSize}`,
        token,
      ),
    get: (token: string, id: string) => authRequest<Scenario>(`/api/scenarios/${id}`, token),
  },
  sessions: {
    list: (token: string) => authRequest<unknown[]>('/api/sessions', token),
    start: (token: string, scenarioId: string) =>
      authRequest<{ id: string }>('/api/sessions/start', token, {
        method: 'POST',
        body: JSON.stringify({ scenarioId }),
        headers: { 'Content-Type': 'application/json' },
      }),
    complete: (token: string, sessionId: string, score?: number, feedback?: string) =>
      authRequest<unknown>(`/api/sessions/${sessionId}/complete`, token, {
        method: 'PATCH',
        body: JSON.stringify({ score, feedback }),
        headers: { 'Content-Type': 'application/json' },
      }),
  },
};
