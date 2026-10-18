import { handleApiCall, apiClient } from './core';
import type { Boat, CreateBoatForm } from '@/types/models';

const normalizeRouteNames = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
      }
    } catch {
      return value
        .split('|')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
  }
  return [];
};

const normalizeBoat = (boat: Boat & { routeNames?: unknown; operatorIds?: unknown; operatorNames?: unknown }): Boat => ({
  ...boat,
  operatorIds: normalizeRouteNames(boat.operatorIds),
  operatorNames: normalizeRouteNames(boat.operatorNames),
  routeNames: normalizeRouteNames(boat.routeNames),
});

export const boatAPI = {
  getBoats: async (filters?: Record<string, unknown>): Promise<Boat[]> => {
    const response = await apiClient.get<Array<Boat & { routeNames?: unknown; operatorIds?: unknown; operatorNames?: unknown }>>('/boats', { params: filters });
    return response.data.map((boat) => normalizeBoat(boat));
  },

  getBoatById: async (id: string): Promise<Boat> => {
    const response = await apiClient.get<Boat & { routeNames?: unknown; operatorIds?: unknown; operatorNames?: unknown }>(`/boats/${id}`);
    return normalizeBoat(response.data);
  },

  createBoat: async (data: CreateBoatForm): Promise<Boat> => {
    const response = await apiClient.post<Boat & { routeNames?: unknown; operatorIds?: unknown; operatorNames?: unknown }>('/boats', data);
    return normalizeBoat(response.data);
  },

  updateBoat: async (id: string, data: Partial<Boat>): Promise<Boat> => {
    const response = await apiClient.put<Boat & { routeNames?: unknown; operatorIds?: unknown; operatorNames?: unknown }>(`/boats/${id}`, data);
    return normalizeBoat(response.data);
  },

  deleteBoat: async (id: string): Promise<void> => {
    return handleApiCall(() => apiClient.delete(`/boats/${id}`));
  },

  updateBoatStatus: async (id: string, status: string): Promise<void> => {
    return handleApiCall(() => apiClient.patch(`/boats/${id}/status`, { status }));
  },
};
