import apiClient from './core';
import { API_CONFIG } from '@/config/constants';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/v1/app-users`;

interface AppUserResponse {
  userId: number;
  googleSub: string;
  email: string;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  phone?: string | null;
  profilePictureUrl?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  isOnline?: boolean | null;
  lastSeenAt?: string | null;
}

export interface AppUserAccount {
  id: string;
  googleSub: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  phone?: string;
  profilePictureUrl?: string;
  status: 'active' | 'inactive';
  isOnline?: boolean;
  lastSeenAt?: string;
  createdAt: string;
  lastLoginAt?: string;
}

const mapAppUser = (user: AppUserResponse): AppUserAccount => ({
  id: user.userId.toString(),
  googleSub: user.googleSub,
  email: user.email,
  fullName: user.fullName?.trim() || user.email,
  firstName: user.firstName ?? undefined,
  lastName: user.lastName ?? undefined,
  nickname: user.nickname ?? undefined,
  phone: user.phone ?? undefined,
  profilePictureUrl: user.profilePictureUrl ?? undefined,
  status: user.isActive ? 'active' : 'inactive',
  isOnline: Boolean(user.isOnline),
  lastSeenAt: user.lastSeenAt ?? undefined,
  createdAt: user.createdAt ?? '',
  lastLoginAt: user.lastLoginAt ?? undefined,
});

export const getAppUsers = async (): Promise<AppUserAccount[]> => {
  const response = await apiClient.get<AppUserResponse[]>(API_BASE_URL);
  return response.data.map(mapAppUser);
};

export const getAppUserById = async (appUserId: string): Promise<AppUserAccount> => {
  const response = await apiClient.get<AppUserResponse>(`${API_BASE_URL}/${appUserId}`);
  return mapAppUser(response.data);
};
