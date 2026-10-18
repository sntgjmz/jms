import { handleApiCall, apiClient } from './core';
import type { AuthResponse, LoginCredentials, User } from '@/types/models';

export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return handleApiCall(() => apiClient.post('/auth/login', credentials));
  },

  logout: async (): Promise<void> => {
    return handleApiCall(() => apiClient.post('/auth/logout'));
  },

  refreshToken: async (): Promise<AuthResponse> => {
    return handleApiCall(() => apiClient.post('/auth/refresh'));
  },

  getCurrentUser: async (): Promise<User> => {
    return handleApiCall(() => apiClient.get('/auth/me'));
  },
};
