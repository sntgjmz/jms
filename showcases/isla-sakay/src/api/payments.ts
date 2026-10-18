import { handleApiCall, apiClient } from './core';

export const paymentAPI = {
  verifyPayment: async (id: string, approved: boolean, reason?: string): Promise<void> => {
    return handleApiCall(() =>
      apiClient.post(`/payments/${id}/verify`, { approved, reason }, { params: { approved } }),
    );
  },
};
