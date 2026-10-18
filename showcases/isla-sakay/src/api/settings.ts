
import { API_CONFIG } from '@/config/constants';
import { apiClient, handleApiCall } from './core';

const API_BASE_URL = API_CONFIG.BASE_URL;

export interface ContactConfigDTO {
  id?: string;
  email: string;
  phone: string;
  officeAddress: string;
  officeHours: string;
}

export interface ScheduleConfigDTO {
  id: string;
  boatId?: string;
  boatName?: string;
  boatType?: string;
  operatorId?: string;
  operatorName?: string;
  routeFareId?: string;
  route: string;
  origin?: string;
  destination?: string;
  capacity?: number;
  availableSeats?: number;
  cargoBooked?: boolean;
  cargoBookingStatus?: string;
  departure: string;
  arrival: string;
  departureDatetime?: string;
  arrivalDatetime?: string;
  frequency?: string;
  notes?: string;
  recurrenceGroupId?: string;
  tripStatus?: string;
  tripStatusReason?: string;
  tripStatusEta?: string;
  selectedDays?: string[];
  validUntil?: string | null;
}

export interface BarangayConfigDTO {
  id: string;
  barangayName: string;
  zone: string;
  population: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FareMatrixConfigDTO {
  id: string;
  fareName: string;
  route: string;
  distanceKm: number;
  type: 'commuter' | 'cargo';
  baseFare?: number;
  percentagePerKilometer?: number;
  rentalFare?: number;
  weightLimitKg?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface ScheduleQueryParams {
  from?: string;
  to?: string;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

interface ScheduleCalendarCountParams extends ScheduleQueryParams {
  q?: string;
  status?: string;
  mode?: 'trips' | 'boats';
  boatTypes?: string;
}

interface PagedScheduleQueryParams extends ScheduleQueryParams {
  q?: string;
  status?: string;
  selectedDate?: string;
  page?: number;
  size?: number;
}

export const settingsAPI = {
  getContact: async (): Promise<ContactConfigDTO> => handleApiCall(() => apiClient.get('/settings/contact')),
  getPublicContact: async (): Promise<ContactConfigDTO> => {
    const response = await apiClient.get<ContactConfigDTO>(`${API_BASE_URL}/v1/settings/public/contact`, {
      withCredentials: true,
    });
    return response.data;
  },
  updateContact: async (data: ContactConfigDTO): Promise<ContactConfigDTO> =>
    handleApiCall(() => apiClient.put('/settings/contact', data)),

  getSchedules: async (params?: ScheduleQueryParams): Promise<ScheduleConfigDTO[]> =>
    handleApiCall(() => apiClient.get('/settings/schedules', { params })),
  getPagedSchedules: async (params?: PagedScheduleQueryParams): Promise<PagedResponse<ScheduleConfigDTO>> =>
    handleApiCall(() => apiClient.get('/settings/schedules/paged', { params })),
  getPublicSchedules: async (params?: ScheduleQueryParams): Promise<ScheduleConfigDTO[]> => {
    const response = await apiClient.get<ScheduleConfigDTO[]>(`${API_BASE_URL}/v1/settings/public/schedules`, {
      params,
      withCredentials: true,
    });
    return response.data;
  },
  getPublicBoatStatuses: async (): Promise<Record<string, string>> => {
    const response = await apiClient.get<Record<string, string>>(`${API_BASE_URL}/v1/settings/public/boat-statuses`, {
      withCredentials: true,
    });
    return response.data;
  },
  getFareScheduleUsageCounts: async (): Promise<Record<string, number>> =>
    handleApiCall(() => apiClient.get('/settings/schedules/usage/fare-counts')),
  getBarangayScheduleUsageCounts: async (): Promise<Record<string, number>> =>
    handleApiCall(() => apiClient.get('/settings/schedules/usage/barangay-counts')),
  getScheduleCalendarCounts: async (params: ScheduleCalendarCountParams): Promise<Record<string, number>> =>
    handleApiCall(() => apiClient.get('/settings/schedules/calendar-counts', { params })),
  createSchedule: async (data: Omit<ScheduleConfigDTO, 'id'>): Promise<ScheduleConfigDTO> =>
    handleApiCall(() => apiClient.post('/settings/schedules', data)),
  updateSchedule: async (
    id: string,
    data: Omit<ScheduleConfigDTO, 'id'>,
    options?: { scope?: 'single' | 'future' },
  ): Promise<ScheduleConfigDTO> =>
    handleApiCall(() => apiClient.put(`/settings/schedules/${id}`, data, { params: options })),
  deleteSchedule: async (
    id: string,
    options?: { scope?: 'single' | 'future' | 'until'; untilDate?: string },
  ): Promise<void> => handleApiCall(() => apiClient.delete(`/settings/schedules/${id}`, { params: options })),
  updateScheduleTripStatus: async (
    id: string,
    data: { status: string; reason?: string; estimatedDepartureDatetime?: string },
  ): Promise<ScheduleConfigDTO> => handleApiCall(() => apiClient.patch(`/settings/schedules/${id}/trip-status`, data)),

  getBarangays: async (): Promise<BarangayConfigDTO[]> => handleApiCall(() => apiClient.get('/settings/barangays')),
  getPublicBarangays: async (): Promise<BarangayConfigDTO[]> => {
    const response = await apiClient.get<BarangayConfigDTO[]>(`${API_BASE_URL}/v1/settings/public/barangays`, {
      withCredentials: true,
    });
    return response.data;
  },
  createBarangay: async (
    data: Omit<BarangayConfigDTO, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<BarangayConfigDTO> => handleApiCall(() => apiClient.post('/settings/barangays', data)),
  updateBarangay: async (
    id: string,
    data: Partial<Omit<BarangayConfigDTO, 'id' | 'createdAt'>>,
  ): Promise<BarangayConfigDTO> => handleApiCall(() => apiClient.put(`/settings/barangays/${id}`, data)),
  deleteBarangay: async (id: string): Promise<void> => handleApiCall(() => apiClient.delete(`/settings/barangays/${id}`)),

  getFares: async (): Promise<FareMatrixConfigDTO[]> => handleApiCall(() => apiClient.get('/settings/fares')),
  getPublicFares: async (): Promise<FareMatrixConfigDTO[]> => {
    const response = await apiClient.get<FareMatrixConfigDTO[]>(`${API_BASE_URL}/v1/settings/public/fares`, {
      withCredentials: true,
    });
    return response.data;
  },
  createFare: async (
    data: Omit<FareMatrixConfigDTO, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>,
  ): Promise<FareMatrixConfigDTO> => handleApiCall(() => apiClient.post('/settings/fares', data)),
  updateFare: async (
    id: string,
    data: Partial<Omit<FareMatrixConfigDTO, 'id' | 'createdAt'>>,
  ): Promise<FareMatrixConfigDTO> => handleApiCall(() => apiClient.put(`/settings/fares/${id}`, data)),
  toggleFare: async (id: string): Promise<FareMatrixConfigDTO> =>
    handleApiCall(() => apiClient.patch(`/settings/fares/${id}/toggle`)),
  deleteFare: async (id: string): Promise<void> => handleApiCall(() => apiClient.delete(`/settings/fares/${id}`)),
};
