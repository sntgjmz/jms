import type { BoatOperator } from '../types/models';
import apiClient from './client';

const API_BASE_PATH = '/v1/boat-operators';

interface BoatOperatorResponse {
  operatorId: number;
  username: string;
  fullName: string;
  licenseNumber: string;
  operatorType: 'cargo' | 'banca';
  email: string;
  contactNumber: string;
  birthday: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  requirePasswordChange?: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
  isOnline?: boolean | null;
  lastSeenAt?: string | null;
}

interface CreateOperatorPayload {
  username: string;
  fullName: string;
  licenseNumber: string;
  operatorType: 'cargo' | 'banca';
  email: string;
  contactNumber: string;
  birthday: string;
  password: string;
  isActive: boolean;
  requirePasswordChange: boolean;
}

export const getBoatOperators = async (): Promise<BoatOperator[]> => {
  const response = await apiClient.get<BoatOperatorResponse[]>(API_BASE_PATH);
  return response.data.map((operator) => ({
    id: operator.operatorId.toString(),
    username: operator.username,
    name: operator.fullName,
    email: operator.email,
    phone: operator.contactNumber,
    licenseNumber: operator.licenseNumber,
    operatorType: operator.operatorType,
    birthday: operator.birthday,
    boats: [],
    status: operator.isActive ? 'active' : 'inactive',
    isOnline: Boolean(operator.isOnline),
    lastSeenAt: operator.lastSeenAt ?? undefined,
    createdAt: operator.createdAt ?? '',
    lastLoginAt: operator.lastLoginAt ?? undefined,
    mustChangePassword: operator.mustChangePassword ?? operator.requirePasswordChange ?? false,
  }));
};

export const checkBoatOperatorUsername = async (username: string): Promise<boolean> => {
  const response = await apiClient.get<{ available: boolean }>(`${API_BASE_PATH}/check-username`, {
    params: { username },
  });
  return response.data.available;
};

export const checkBoatOperatorLicense = async (licenseNumber: string): Promise<boolean> => {
  const response = await apiClient.get<{ available: boolean }>(`${API_BASE_PATH}/check-license`, {
    params: { licenseNumber },
  });
  return response.data.available;
};

export const checkBoatOperatorEmail = async (email: string): Promise<boolean> => {
  const response = await apiClient.get<{ available: boolean }>(`${API_BASE_PATH}/check-email`, {
    params: { email },
  });
  return response.data.available;
};

export const createBoatOperator = async (payload: CreateOperatorPayload): Promise<BoatOperator> => {
  const response = await apiClient.post<BoatOperatorResponse>(API_BASE_PATH, payload);
  const operator = response.data;
  return {
    id: operator.operatorId.toString(),
    username: operator.username,
    name: operator.fullName,
    email: operator.email,
    phone: operator.contactNumber,
    licenseNumber: operator.licenseNumber,
    operatorType: operator.operatorType,
    birthday: operator.birthday,
    boats: [],
    status: operator.isActive ? 'active' : 'inactive',
    isOnline: Boolean(operator.isOnline),
    lastSeenAt: operator.lastSeenAt ?? undefined,
    createdAt: operator.createdAt ?? '',
    lastLoginAt: operator.lastLoginAt ?? undefined,
    mustChangePassword: operator.mustChangePassword ?? operator.requirePasswordChange ?? false,
  };
};

export const updateBoatOperator = async (
  operatorId: string,
  payload: Partial<CreateOperatorPayload>
): Promise<BoatOperator> => {
  const response = await apiClient.put<BoatOperatorResponse>(`${API_BASE_PATH}/${operatorId}`, payload);
  const operator = response.data;
  return {
    id: operator.operatorId.toString(),
    username: operator.username,
    name: operator.fullName,
    email: operator.email,
    phone: operator.contactNumber,
    licenseNumber: operator.licenseNumber,
    operatorType: operator.operatorType,
    birthday: operator.birthday,
    boats: [],
    status: operator.isActive ? 'active' : 'inactive',
    isOnline: Boolean(operator.isOnline),
    lastSeenAt: operator.lastSeenAt ?? undefined,
    createdAt: operator.createdAt ?? '',
    lastLoginAt: operator.lastLoginAt ?? undefined,
    mustChangePassword: operator.mustChangePassword ?? operator.requirePasswordChange ?? false,
  };
};

export const deleteBoatOperator = async (operatorId: string): Promise<void> => {
  await apiClient.delete(`${API_BASE_PATH}/${operatorId}`);
};
