export type AlertSeverity = 'low' | 'medium' | 'high';
export type HistoryAction = 'create' | 'edit' | 'delete' | 'update';

export interface SystemHistoryItem {
  id: string;
  username: string;
  action: HistoryAction;
  moduleName: string;
  entityName: string;
  information: string;
  createdAt: string;
}

export type NotificationsMode = 'notifications' | 'admin-alerts' | 'calamity-alerts';

export type EditableNotificationType = 'system' | 'alert' | 'weather' | 'coast_guard';
