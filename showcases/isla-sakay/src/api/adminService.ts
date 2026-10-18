
import type { User, UserStatus, LoginCredentials } from '../types/models';
import { API_CONFIG } from '../config/constants';
import apiClient from './client';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/v1/admins`;
const API_BASE_PATH = '/v1/admins';

interface AdminResponse {
  adminId: number;
  username: string;
  email: string;
  isActive: boolean;
  createdAt?: string | null;
  mustChangePassword?: boolean;
  requirePasswordChange?: boolean;
  must_change_password?: boolean;
  require_password_change?: boolean;
  lastLoginAt?: string | null;
  isOnline?: boolean | null;
  lastSeenAt?: string | null;
}

interface CreateAdminData {
  username: string;
  fullName?: string;
  email: string;
  contactNumber?: string;
  birthday?: string;
  password: string;
  status: UserStatus;
  requirePasswordChange?: boolean;
}

interface UpdateAdminData {
  username: string;
  email: string;
  password?: string;
  status: UserStatus;
}

export const getAdmins = async (): Promise<User[]> => {
  const response = await apiClient.get<AdminResponse[]>(API_BASE_PATH);
  return response.data.map((admin) => ({
    id: admin.adminId.toString(),
    username: admin.username,
    email: admin.email,
    role: 'admin',
    status: admin.isActive ? 'active' : 'inactive',
    isOnline: Boolean(admin.isOnline),
    lastSeenAt: admin.lastSeenAt ?? undefined,
    lastLoginAt: admin.lastLoginAt ?? undefined,
    createdAt: admin.createdAt ?? '',
    mustChangePassword:
      admin.mustChangePassword ??
      admin.requirePasswordChange ??
      admin.must_change_password ??
      admin.require_password_change ??
      false,
  }));
};

export const checkAdminUsername = async (username: string): Promise<boolean> => {
  const response = await apiClient.get<{ available: boolean }>(`${API_BASE_PATH}/check-username`, {
    params: { username },
  });
  return response.data.available;
};

export const createAdmin = async (adminData: CreateAdminData): Promise<User> => {
  const mustChangePassword = adminData.requirePasswordChange ?? false;
  const backendPayload = {
    username: adminData.username,
    ...(adminData.fullName ? { fullName: adminData.fullName } : {}),
    email: adminData.email,
    ...(adminData.contactNumber ? { contactNumber: adminData.contactNumber } : {}),
    ...(adminData.birthday ? { birthday: adminData.birthday } : {}),
    password: adminData.password,
    isActive: adminData.status === 'active',
    mustChangePassword,
    ...(mustChangePassword ? { requirePasswordChange: true } : {}),
  };

  const response = await apiClient.post<AdminResponse>(API_BASE_PATH, backendPayload);
  const newAdmin = response.data;

  return {
    id: newAdmin.adminId.toString(),
    username: newAdmin.username,
    email: newAdmin.email,
    role: 'admin',
    status: newAdmin.isActive ? 'active' : 'inactive',
    isOnline: Boolean(newAdmin.isOnline),
    lastSeenAt: newAdmin.lastSeenAt ?? undefined,
    lastLoginAt: newAdmin.lastLoginAt ?? undefined,
    mustChangePassword:
      newAdmin.mustChangePassword ??
      newAdmin.requirePasswordChange ??
      newAdmin.must_change_password ??
      newAdmin.require_password_change ??
      adminData.requirePasswordChange ??
      false,
    createdAt: newAdmin.createdAt ?? '',
  };
};

export const deleteAdmin = async (adminId: string): Promise<void> => {
  await apiClient.delete(`${API_BASE_PATH}/${adminId}`);
};

export const updateAdmin = async (adminId: string, adminData: UpdateAdminData): Promise<User> => {
  const payload: {
    username: string;
    email: string;
    password?: string;
    isActive: boolean;
  } = {
    username: adminData.username,
    email: adminData.email,
    isActive: adminData.status === 'active',
  };

  if (adminData.password && adminData.password.trim().length > 0) {
    payload.password = adminData.password;
  }

  const response = await apiClient.put<AdminResponse>(`${API_BASE_PATH}/${adminId}`, payload);
  const updated = response.data;

  return {
    id: updated.adminId.toString(),
    username: updated.username,
    email: updated.email,
    role: 'admin',
    status: updated.isActive ? 'active' : 'inactive',
    isOnline: Boolean(updated.isOnline),
    lastSeenAt: updated.lastSeenAt ?? undefined,
    lastLoginAt: updated.lastLoginAt ?? undefined,
    mustChangePassword:
      updated.mustChangePassword ??
      updated.requirePasswordChange ??
      updated.must_change_password ??
      updated.require_password_change ??
      false,
    createdAt: updated.createdAt ?? '',
  };
};

export const loginAdmin = async (credentials: LoginCredentials): Promise<User> => {
  const response = await apiClient.post<AdminResponse>(`${API_BASE_URL}/login`, {
    username: credentials.username,
    password: credentials.password
  });
  
  const admin = response.data;
  return {
    id: admin.adminId.toString(),
    username: admin.username,
    email: admin.email,
    role: 'admin',
    status: admin.isActive ? 'active' : 'inactive',
    isOnline: Boolean(admin.isOnline),
    lastSeenAt: admin.lastSeenAt ?? undefined,
    mustChangePassword:
      admin.mustChangePassword ??
      admin.requirePasswordChange ??
      admin.must_change_password ??
      admin.require_password_change ??
      false,
    createdAt: admin.createdAt ?? '',
  };
};

export const changeAdminPassword = async (payload: {
  username: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> => {
  await apiClient.post(`${API_BASE_URL}/change-password`, payload);
};
