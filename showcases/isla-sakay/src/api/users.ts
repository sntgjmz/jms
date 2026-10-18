import { handleApiCall, apiClient } from './core';
import type { BoatOperator, CreateUserForm, User } from '@/types/models';

export const userAPI = {
  getUsers: async (role?: string): Promise<User[]> => {
    return handleApiCall(() => apiClient.get('/users', { params: { role } }));
  },

  getUserById: async (id: string): Promise<User> => {
    return handleApiCall(() => apiClient.get(`/users/${id}`));
  },

  createUser: async (data: CreateUserForm): Promise<User> => {
    return handleApiCall(() => apiClient.post('/users', data));
  },

  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    return handleApiCall(() => apiClient.put(`/users/${id}`, data));
  },

  deleteUser: async (id: string): Promise<void> => {
    return handleApiCall(() => apiClient.delete(`/users/${id}`));
  },

  getBoatOperators: async (): Promise<BoatOperator[]> => {
    return handleApiCall(() => apiClient.get('/users/operators'));
  },
};
