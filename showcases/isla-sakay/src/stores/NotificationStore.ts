import { makeAutoObservable, runInAction } from 'mobx';
import { notificationAPI } from '@/api';
import type { Notification } from '@/types';

export interface BroadcastResult {
  notification: Notification;
  targetedDevices: number;
}

export class NotificationStore {
  notifications: Notification[] = [];
  isLoading = false;
  error: string | null = null;
  hasFetched = false;

  constructor() {
    makeAutoObservable(this);
  }

  get unreadNotifications(): Notification[] {
    return this.notifications.filter(n => !n.isRead);
  }

  get unreadCount(): number {
    return this.unreadNotifications.length;
  }

  get weatherAlerts(): Notification[] {
    return this.notifications.filter(n => n.type === 'weather');
  }

  get coastGuardNotifications(): Notification[] {
    return this.notifications.filter(n => n.type === 'coast_guard');
  }

  get systemUpdates(): Notification[] {
    return this.notifications.filter(n => n.type === 'system');
  }

  get criticalNotifications(): Notification[] {
    return this.notifications.filter(n => n.priority === 'critical');
  }

  async fetchNotifications(type?: string): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const notifications = await notificationAPI.getNotifications(type);
      
      runInAction(() => {
        this.notifications = notifications;
        this.isLoading = false;
        this.hasFetched = true;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to fetch notifications';
        this.isLoading = false;
        this.hasFetched = true;
      });
    }
  }

  async createNotification(input: {
    title: string;
    message: string;
    type?: Notification['type'];
    priority?: Notification['priority'];
    userId?: string;
  }): Promise<Notification | null> {
    try {
      const created = await notificationAPI.createNotification({
        title: input.title,
        message: input.message,
        type: input.type ?? 'system',
        priority: input.priority ?? 'low',
        userId: input.userId,
      });

      runInAction(() => {
        this.notifications = [created, ...this.notifications.filter((item) => item.id !== created.id)].slice(0, 100);
      });

      return created;
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to create notification';
      });
      return null;
    }
  }

  async broadcastNotification(input: {
    title: string;
    message: string;
    type?: Notification['type'];
    priority?: Notification['priority'];
    expiresAt?: string;
  }): Promise<BroadcastResult | null> {
    try {
      const result = await notificationAPI.broadcastNotification({
        title: input.title,
        message: input.message,
        type: input.type ?? 'alert',
        priority: input.priority ?? 'high',
        expiresAt: input.expiresAt,
      });
      const created = result.notification;

      runInAction(() => {
        this.notifications = [created, ...this.notifications.filter((item) => item.id !== created.id)].slice(0, 100);
      });

      return result;
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to broadcast notification';
      });
      return null;
    }
  }

  async updateNotification(
    id: string,
    updates: { title?: string; message?: string; priority?: Notification['priority'] },
  ): Promise<boolean> {
    try {
      const updated = await notificationAPI.updateNotification(id, updates);
      runInAction(() => {
        const index = this.notifications.findIndex((item) => item.id === id);
        if (index >= 0) {
          this.notifications[index] = updated;
        } else {
          this.notifications = [updated, ...this.notifications].slice(0, 100);
        }
      });
      return true;
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Failed to update notification';
      });
      return false;
    }
  }

  async markAsRead(id: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === id);
    const previous = notification ? notification.isRead : undefined;
    if (notification) {
      runInAction(() => {
        notification.isRead = true;
      });
    }
    try {
      await notificationAPI.markAsRead(id);
    } catch (error: any) {
      if (notification && previous !== undefined) {
        runInAction(() => {
          notification.isRead = previous;
        });
      }
      this.error = error.message || 'Failed to mark notification as read';
    }
  }

  async markAllAsRead(): Promise<void> {
    const previousStates = this.notifications.map((n) => ({ id: n.id, isRead: n.isRead }));
    runInAction(() => {
      this.notifications.forEach(n => {
        n.isRead = true;
      });
    });
    try {
      await notificationAPI.markAllAsRead();
    } catch (error: any) {
      runInAction(() => {
        previousStates.forEach((state) => {
          const target = this.notifications.find((n) => n.id === state.id);
          if (target) target.isRead = state.isRead;
        });
      });
      this.error = error.message || 'Failed to mark all notifications as read';
    }
  }

  async deleteNotification(id: string): Promise<void> {
    try {
      await notificationAPI.deleteNotification(id);
      
      runInAction(() => {
        this.notifications = this.notifications.filter(n => n.id !== id);
      });
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to delete notification';
    }
  }

  filterByType(type: string): Notification[] {
    return this.notifications.filter(n => n.type === type);
  }

  filterByPriority(priority: string): Notification[] {
    return this.notifications.filter(n => n.priority === priority);
  }

  getRecentNotifications(count: number = 5): Notification[] {
    return [...this.notifications]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, count);
  }
}
