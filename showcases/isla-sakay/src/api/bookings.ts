import { handleApiCall, apiClient } from './core';
import type { CargoBooking, CreateBookingForm, PersonBooking } from '@/types/models';
import type { PagedResponse } from './settings';

export const bookingAPI = {
  getPersonBookings: async (filters?: Record<string, unknown>): Promise<PersonBooking[]> => {
    return handleApiCall(() => apiClient.get('/bookings/person', { params: filters }));
  },

  getCargoBookings: async (filters?: Record<string, unknown>): Promise<CargoBooking[]> => {
    return handleApiCall(() => apiClient.get('/bookings/cargo', { params: filters }));
  },

  getPagedPersonBookings: async (filters?: Record<string, unknown>): Promise<PagedResponse<PersonBooking>> => {
    return handleApiCall(() => apiClient.get('/bookings/person/paged', { params: filters }));
  },

  getPagedCargoBookings: async (filters?: Record<string, unknown>): Promise<PagedResponse<CargoBooking>> => {
    return handleApiCall(() => apiClient.get('/bookings/cargo/paged', { params: filters }));
  },

  createPersonBooking: async (data: CreateBookingForm): Promise<PersonBooking> => {
    return handleApiCall(() => apiClient.post('/bookings/person', data));
  },

  createCargoBooking: async (data: CreateBookingForm): Promise<CargoBooking> => {
    return handleApiCall(() => apiClient.post('/bookings/cargo', data));
  },

  updateBookingStatus: async (id: string, status: string): Promise<void> => {
    return handleApiCall(() => apiClient.patch(`/bookings/${id}/status`, { status }));
  },

  cancelBooking: async (id: string): Promise<void> => {
    return handleApiCall(() => apiClient.post(`/bookings/${id}/cancel`));
  },
};
