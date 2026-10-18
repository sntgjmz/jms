import rootStore from '@/stores/RootStore';
import type { Notification } from '@/types';

export function pushBellNotification(params: {
  title: string;
  message: string;
  type?: Notification['type'];
  priority?: Notification['priority'];
  userId?: string;
}) {
  void rootStore.notificationStore.createNotification({
    title: params.title,
    message: params.message,
    type: params.type ?? 'system',
    priority: params.priority ?? 'low',
    userId: params.userId,
  });
}
