// Shared types for VR Standardized Patient

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'instructor' | 'admin';

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

// ─── Scenario ─────────────────────────────────────────────────────────────────

export interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationMinutes: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PatientProfile {
  id: string;
  scenarioId: string;
  name: string;
  age: number;
  gender: string;
  chiefComplaint: string;
  history: string;
  vitalSigns: VitalSigns;
}

export interface VitalSigns {
  heartRate: number;
  bloodPressure: { systolic: number; diastolic: number };
  respiratoryRate: number;
  temperature: number;
  oxygenSaturation: number;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface SimulationSession {
  id: string;
  scenarioId: string;
  userId: string;
  startedAt: string;
  completedAt?: string;
  score?: number;
  feedback?: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
