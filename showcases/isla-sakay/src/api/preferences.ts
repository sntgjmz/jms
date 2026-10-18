
import { API_CONFIG } from '@/config/constants';
import { handleApiCall, apiClient } from './core';

const API_BASE_URL = API_CONFIG.BASE_URL;

export interface AccountPreferenceDTO {
  theme: 'light' | 'dark';
  notificationSoundEnabled: boolean;
  notificationSoundVolume: number;
}

export interface ClientPreferenceDTO {
  cookieConsent: 'accepted' | 'declined' | null;
  rememberedUsername: string | null;
  theme: 'light' | 'dark';
}

export const preferencesAPI = {
  getAccountPreferences: async (): Promise<AccountPreferenceDTO> =>
    handleApiCall(() => apiClient.get('/preferences/account')),

  updateAccountPreferences: async (payload: Partial<AccountPreferenceDTO>): Promise<AccountPreferenceDTO> =>
    handleApiCall(() => apiClient.patch('/preferences/account', payload)),

  getClientPreferences: async (): Promise<ClientPreferenceDTO> => {
    const response = await apiClient.get<ClientPreferenceDTO>(`${API_BASE_URL}/v1/preferences/client`, {
      withCredentials: true,
    });
    return response.data;
  },

  updateClientPreferences: async (payload: Partial<ClientPreferenceDTO>): Promise<ClientPreferenceDTO> => {
    const response = await apiClient.patch<ClientPreferenceDTO>(`${API_BASE_URL}/v1/preferences/client`, payload, {
      withCredentials: true,
    });
    return response.data;
  },
};
