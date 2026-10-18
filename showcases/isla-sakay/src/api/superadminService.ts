import apiClient from './core';
import type { User, LoginCredentials } from '../types/models';
import { API_CONFIG } from '../config/constants';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/v1/superadmins`;

interface SuperAdminResponse {
  superAdminId: number;
  username: string;
  email: string;
  isActive: boolean;
  createdAt?: string | null;
}

export const loginSuperAdmin = async (credentials: LoginCredentials): Promise<User> => {
  const response = await apiClient.post<SuperAdminResponse>(`${API_BASE_URL}/login`, {
    username: credentials.username,
    password: credentials.password,
  });
  const superAdmin = response.data;
  return {
    id: superAdmin.superAdminId.toString(),
    username: superAdmin.username,
    email: superAdmin.email,
    role: 'super_admin',
    status: superAdmin.isActive ? 'active' : 'inactive',
    createdAt: superAdmin.createdAt ?? '',
  };
};

export const changeSuperAdminPassword = async (payload: {
  username: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> => {
  await apiClient.post(`${API_BASE_URL}/change-password`, payload);
};
