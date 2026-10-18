import { handleApiCall, apiClient } from './core';
import type { Notification } from '@/types/models';

export interface NotificationHistoryEntry {
  id: string;
  username: string;
  action: string;
  moduleName: string;
  entityName: string;
  information: string;
  createdAt: string;
}

export interface CreateNotificationHistoryInput {
  username: string;
  action: string;
  moduleName?: string;
  entityName?: string;
  information: string;
  createdAt?: string;
}

export interface BroadcastNotificationResponse {
  notification: Notification;
  targetedDevices: number;
}

export interface DevicePushTokenStatsResponse {
  totalActive: number;
  userActive: number;
  operatorActive: number;
  publicActive?: number;
}

export const notificationAPI = {
  getNotifications: async (type?: string): Promise<Notification[]> => {
    return handleApiCall(() => apiClient.get('/notifications', { params: { type } }));
  },

  createNotification: async (data: {
    type: Notification['type'];
    title: string;
    message: string;
    priority: Notification['priority'];
    isRead?: boolean;
    userId?: string;
  }): Promise<Notification> => {
    return handleApiCall(() => apiClient.post('/notifications', data));
  },

  broadcastNotification: async (data: {
    title: string;
    message: string;
    priority?: Notification['priority'];
    type?: Notification['type'];
    expiresAt?: string;
  }): Promise<BroadcastNotificationResponse> => {
    return handleApiCall(() =>
      apiClient.post('/notifications/broadcast', {
        title: data.title,
        message: data.message,
        priority: data.priority ?? 'high',
        type: data.type ?? 'system',
        expiresAt: data.expiresAt,
      }),
    );
  },

  getDevicePushTokenStats: async (): Promise<DevicePushTokenStatsResponse> => {
    return handleApiCall(() => apiClient.get('/notifications/device-tokens/stats'));
  },

  updateNotification: async (
    id: string,
    data: Partial<Pick<Notification, 'type' | 'title' | 'message' | 'priority' | 'isRead' | 'userId'>>,
  ): Promise<Notification> => {
    return handleApiCall(() => apiClient.put(`/notifications/${id}`, data));
  },

  markAsRead: async (id: string): Promise<void> => {
    return handleApiCall(() => apiClient.patch(`/notifications/${id}/read`));
  },

  markAllAsRead: async (): Promise<void> => {
    return handleApiCall(() => apiClient.post('/notifications/read-all'));
  },

  deleteNotification: async (id: string): Promise<void> => {
    return handleApiCall(() => apiClient.delete(`/notifications/${id}`));
  },

  getNotificationHistory: async (): Promise<NotificationHistoryEntry[]> => {
    return handleApiCall(() => apiClient.get('/notifications/history'));
  },

  createNotificationHistory: async (data: CreateNotificationHistoryInput): Promise<NotificationHistoryEntry> => {
    return handleApiCall(() => apiClient.post('/notifications/history', data));
  },
};
