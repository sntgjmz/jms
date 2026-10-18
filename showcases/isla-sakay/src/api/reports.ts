import { apiClient, handleApiCall } from './core';

export interface AdminReportDTO {
  adminUsers: number;
  actionsToday: number;
  systemHealth: number;
}

export interface BancaReportDTO {
  activeBancas: number;
  tripsToday: number;
  utilizationRate: number;
}

export interface AnalyticsReportDTO {
  avgRevenuePerDay: number;
  growthRate: number;
  topRoute: string;
  forecastNextMonth: number;
}

export const reportsAPI = {
  getAdminReport: async (): Promise<AdminReportDTO> => handleApiCall(() => apiClient.get('/reports/admin')),
  getBancaReport: async (): Promise<BancaReportDTO> => handleApiCall(() => apiClient.get('/reports/banca')),
  getAnalyticsReport: async (): Promise<AnalyticsReportDTO> => handleApiCall(() => apiClient.get('/reports/analytics')),
};
