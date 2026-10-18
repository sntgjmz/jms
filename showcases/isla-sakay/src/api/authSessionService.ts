import axios from 'axios';
import type { LoginCredentials, User } from '../types/models';
import { API_CONFIG } from '../config/constants';
import apiClient, { setAccessToken, clearAccessToken } from './client';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/v1/auth`;

type PrincipalType = 'ADMIN' | 'SUPERADMIN';

interface AuthLoginResponse {
  tokenType: string;
  accessToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  sessionId: string;
  principalType: PrincipalType;
  principalId: number;
  username: string;
}

interface AuthLoginResult {
  user: User;
  accessToken: string;
  sessionId: string;
}

interface AuthIntrospectResponse {
  active: boolean;
  principalType?: PrincipalType;
  principalId?: number;
  username?: string;
  sessionId?: string;
  inactiveReason?: string;
}

const toUser = (response: AuthLoginResponse): User => {
  const isSuperAdmin = response.principalType === 'SUPERADMIN';
  return {
    id: response.principalId.toString(),
    username: response.username,
    email: '',
    role: isSuperAdmin ? 'super_admin' : 'admin',
    status: 'active',
    createdAt: '',
  };
};

export const loginByRole = async (
  credentials: LoginCredentials,
  principalType: PrincipalType,
  options?: { forceLogin?: boolean },
): Promise<AuthLoginResult> => {
  const response = await apiClient.post<AuthLoginResponse>(`${API_BASE_URL}/login`, {
    principalType,
    username: credentials.username,
    password: credentials.password,
    forceLogin: Boolean(options?.forceLogin),
  }, { withCredentials: true });

  setAccessToken(response.data.accessToken);

  return {
    user: toUser(response.data),
    accessToken: response.data.accessToken,
    sessionId: response.data.sessionId,
  };
};

export const logoutSession = async (sessionId: string): Promise<void> => {
  try {
    await apiClient.post(`${API_BASE_URL}/logout`, { sessionId }, { withCredentials: true });
  } finally {
    clearAccessToken();
  }
};

export const refreshSession = async (): Promise<string | null> => {
  try {
    const response = await apiClient.post<AuthLoginResponse>(`${API_BASE_URL}/refresh`, {}, { withCredentials: true });
    const token = response.data?.accessToken ?? null;
    setAccessToken(token);
    return token;
  } catch {
    clearAccessToken();
    return null;
  }
};

export const introspectSession = async (): Promise<AuthIntrospectResponse | null> => {
  try {
    const response = await apiClient.get<AuthIntrospectResponse>('/v1/auth/introspect');
    return response.data ?? null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return { active: false };
    }
    return null;
  }
};
