import { useCallback, useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Layout from '@/components/Layout';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { notificationAPI } from '@/api';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';
import { useNotificationStore } from '@/stores';
import { AdminAlertsSection, CalamityAlertsSection } from '../components/AlertSections';
import {
  CalamityAlertDialog,
  EditNotificationDialog,
  GeneralAlertDialog,
  WeatherAlertDialog,
} from '../components/NotificationDialogs';
import NotificationsHistoryTable from '../components/NotificationsHistoryTable';
import type { AlertSeverity, HistoryAction, NotificationsMode, SystemHistoryItem } from '../types';
import { toPriority, toSeverity } from '../utils';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

interface NotificationsPageProps {
  mode: NotificationsMode;
}

const NotificationsPage = ({ mode }: NotificationsPageProps) => {
  const notificationStore = useNotificationStore();

  const [systemHistory, setSystemHistory] = useState<SystemHistoryItem[]>([]);
  const [pushStats, setPushStats] = useState({ totalActive: 0, userActive: 0, operatorActive: 0, publicActive: 0 });
  const [lastBroadcastTargetCount, setLastBroadcastTargetCount] = useState<number | null>(null);

  const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [isCalamityModalOpen, setIsCalamityModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [generalSeverity, setGeneralSeverity] = useState<AlertSeverity>('low');
  const [generalMessage, setGeneralMessage] = useState('');
  const [weatherSeverity, setWeatherSeverity] = useState<AlertSeverity>('low');
  const [weatherMessage, setWeatherMessage] = useState('');
  const [calamitySignal, setCalamitySignal] = useState('');
  const [calamityMessage, setCalamityMessage] = useState('');
  const [calamityType, setCalamityType] = useState('');

  const [editNotificationId, setEditNotificationId] = useState('');
  const [editNotificationType, setEditNotificationType] = useState<'system' | 'weather' | 'coast_guard'>('system');
  const [editSeverity, setEditSeverity] = useState<AlertSeverity>('low');
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');

  const generalDirty = generalMessage.trim().length > 0;
  const weatherDirty = weatherMessage.trim().length > 0;
  const calamityDirty =
    calamitySignal.trim().length > 0 || calamityType.trim().length > 0 || calamityMessage.trim().length > 0;
  const editDirty = editTitle.trim().length > 0 || editMessage.trim().length > 0;
  const { confirmDiscard: confirmDiscardGeneral, discardDialog: generalDiscardDialog } = useUnsavedChangesGuard(generalDirty);
  const { confirmDiscard: confirmDiscardBroadcast, discardDialog: broadcastDiscardDialog } = useUnsavedChangesGuard(generalDirty);
  const { confirmDiscard: confirmDiscardWeather, discardDialog: weatherDiscardDialog } = useUnsavedChangesGuard(weatherDirty);
  const { confirmDiscard: confirmDiscardCalamity, discardDialog: calamityDiscardDialog } = useUnsavedChangesGuard(calamityDirty);
  const { confirmDiscard: confirmDiscardEdit, discardDialog: editDiscardDialog } = useUnsavedChangesGuard(editDirty);

  const loadSystemHistory = useCallback(async () => {
    try {
      const records = await notificationAPI.getNotificationHistory();
      setSystemHistory(
        records.map((record) => ({
          id: record.id,
          username: record.username,
          action: record.action as HistoryAction,
          moduleName: record.moduleName || 'other',
          entityName: record.entityName || 'other',
          information: record.information,
          createdAt: record.createdAt,
        })),
      );
    } catch {
      setSystemHistory([]);
    }
  }, []);

  const loadPushStats = useCallback(async () => {
    try {
      const stats = await notificationAPI.getDevicePushTokenStats();
      setPushStats({
        totalActive: stats.totalActive ?? 0,
        userActive: stats.userActive ?? 0,
        operatorActive: stats.operatorActive ?? 0,
        publicActive: stats.publicActive ?? 0,
      });
    } catch {
      setPushStats({ totalActive: 0, userActive: 0, operatorActive: 0, publicActive: 0 });
    }
  }, []);

  useAutoRefresh(() => notificationStore.fetchNotifications(), [notificationStore], { intervalMs: 5000 });
  useAutoRefresh(loadSystemHistory, [loadSystemHistory], { intervalMs: 7000 });
  useAutoRefresh(loadPushStats, [loadPushStats], { intervalMs: 7000 });

  useEffect(() => {
    if (!notificationStore.hasFetched) {
      return;
    }

    if (mode === 'notifications') {
      const hasUnread = notificationStore.notifications.some((item) => !item.isRead);
      if (hasUnread) {
        void notificationStore.markAllAsRead();
      }
      return;
    }

    if (mode === 'admin-alerts') {
      const unreadAdminAlerts = notificationStore.notifications.filter(
        (item) => !item.isRead && (item.type === 'system' || item.type === 'weather'),
      );
      unreadAdminAlerts.forEach((item) => {
        void notificationStore.markAsRead(item.id);
      });
      return;
    }

    if (mode === 'calamity-alerts') {
      const unreadCalamityAlerts = notificationStore.notifications.filter(
        (item) => !item.isRead && item.type === 'coast_guard',
      );
      unreadCalamityAlerts.forEach((item) => {
        void notificationStore.markAsRead(item.id);
      });
    }
  }, [mode, notificationStore, notificationStore.hasFetched, notificationStore.notifications]);

  const generalAlerts = useMemo(
    () => notificationStore.notifications.filter((item) => item.type === 'system'),
    [notificationStore.notifications],
  );

  const weatherAlerts = useMemo(
    () => notificationStore.notifications.filter((item) => item.type === 'weather'),
    [notificationStore.notifications],
  );

  const calamityAlerts = useMemo(
    () => notificationStore.notifications.filter((item) => item.type === 'coast_guard'),
    [notificationStore.notifications],
  );

  const openEditModal = (input: {
    id: string;
    type: 'system' | 'weather' | 'coast_guard';
    title: string;
    message: string;
    priority: string;
  }) => {
    setEditNotificationId(input.id);
    setEditNotificationType(input.type);
    setEditTitle(input.title);
    setEditMessage(input.message);
    setEditSeverity(toSeverity(input.priority));
    setIsEditModalOpen(true);
  };

  const handleDeleteNotification = async (id: string, label: string) => {
    const countBefore = notificationStore.notifications.length;
    await notificationStore.deleteNotification(id);
    const deleted = notificationStore.notifications.length < countBefore;
    if (deleted) {
      showSuccessToast(`${label} deleted`, 'The alert was removed successfully.');
    } else {
      showErrorToast(`Failed to delete ${label.toLowerCase()}`, notificationStore.error || 'Please try again.');
      return;
    }
  };

  const handleUpdateNotification = async () => {
    const trimmedTitle = editTitle.trim();
    const trimmedMessage = editMessage.trim();
    if (!editNotificationId) {
      showErrorToast('Update failed', 'No notification is selected for update.');
      return;
    }
    if (!trimmedTitle || !trimmedMessage) {
      showErrorToast('Validation Error', 'Title and message are required.');
      return;
    }

    const success = await notificationStore.updateNotification(editNotificationId, {
      title: trimmedTitle,
      message: trimmedMessage,
      priority: editNotificationType === 'coast_guard' ? 'critical' : toPriority(editSeverity),
    });

    if (success) {
      const label =
        editNotificationType === 'system'
          ? 'General Alert'
          : editNotificationType === 'weather'
            ? 'Weather Alert'
            : 'Calamity Alert';
      showSuccessToast(`${label} updated`, 'Changes were saved successfully.');
      setIsEditModalOpen(false);
      return;
    }
    showErrorToast('Update failed', notificationStore.error || 'Please review the form and try again.');
  };

  const handleSendGeneralAlert = async () => {
    const trimmedMessage = generalMessage.trim();
    if (!trimmedMessage) {
      showErrorToast('Validation Error', 'General alert message is required.');
      return;
    }

    const created = await notificationStore.createNotification({
      type: 'system',
      title: 'General Alert',
      message: trimmedMessage,
      priority: toPriority(generalSeverity),
    });

    if (!created) {
      showErrorToast('Failed to send general alert', notificationStore.error || 'Please try again.');
      return;
    }

    showSuccessToast('General alert sent', 'Recipients can now see this notification.');
    setGeneralMessage('');
    setGeneralSeverity('low');
    setIsGeneralModalOpen(false);
  };

  const handleBroadcastGeneralAlert = async () => {
    const trimmedMessage = generalMessage.trim();
    if (!trimmedMessage) {
      showErrorToast('Validation Error', 'Broadcast message is required.');
      return;
    }

    const broadcast = await notificationStore.broadcastNotification({
      type: 'alert',
      title: 'Global Mobile Alert',
      message: trimmedMessage,
      priority: toPriority(generalSeverity),
    });

    if (!broadcast) {
      showErrorToast('Failed to broadcast alert', notificationStore.error || 'Please try again.');
      return;
    }

    showSuccessToast('Broadcast sent', `Targeted ${broadcast.targetedDevices} device(s).`);
    setLastBroadcastTargetCount(broadcast.targetedDevices);
    setGeneralMessage('');
    setGeneralSeverity('low');
    setIsBroadcastModalOpen(false);
  };

  const handleSendWeatherAlert = async () => {
    const trimmedMessage = weatherMessage.trim();
    if (!trimmedMessage) {
      showErrorToast('Validation Error', 'Weather alert message is required.');
      return;
    }

    const broadcast = await notificationStore.broadcastNotification({
      type: 'weather',
      title: 'Weather Alert',
      message: trimmedMessage,
      priority: toPriority(weatherSeverity),
    });

    if (!broadcast) {
      showErrorToast('Failed to broadcast weather alert', notificationStore.error || 'Please try again.');
      return;
    }

    showSuccessToast('Weather alert broadcasted', `Targeted ${broadcast.targetedDevices} device(s).`);
    setLastBroadcastTargetCount(broadcast.targetedDevices);
    setWeatherMessage('');
    setWeatherSeverity('low');
    setIsWeatherModalOpen(false);
  };

  const handleSendCalamityAlert = async () => {
    const trimmedSignal = calamitySignal.trim();
    const trimmedMessage = calamityMessage.trim();
    const trimmedType = calamityType.trim();
    if (!trimmedSignal || !trimmedMessage || !trimmedType) {
      showErrorToast('Validation Error', 'Signal, calamity type, and message are required.');
      return;
    }

    const broadcast = await notificationStore.broadcastNotification({
      type: 'coast_guard',
      title: `Calamity Alert: ${trimmedType} (${trimmedSignal})`,
      message: trimmedMessage,
      priority: 'critical',
    });

    if (!broadcast) {
      showErrorToast('Failed to broadcast calamity alert', notificationStore.error || 'Please try again.');
      return;
    }

    showSuccessToast('Calamity alert broadcasted', `Targeted ${broadcast.targetedDevices} device(s).`);
    setLastBroadcastTargetCount(broadcast.targetedDevices);
    setCalamitySignal('');
    setCalamityMessage('');
    setCalamityType('');
    setIsCalamityModalOpen(false);
  };

  const moduleDescription = useMemo(() => {
    if (mode === 'admin-alerts') return 'General and weather alerts for administrators';
    if (mode === 'calamity-alerts') return 'High-priority calamity alerts with signal details';
    return 'System history of create, edit, delete, and update actions';
  }, [mode]);

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
          <div className="space-y-2.5">
            <span className="inline-flex w-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              Notification Desk
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Notifications Module</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">{moduleDescription}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">General</p>
              <p className="mt-1 text-xl font-semibold text-sky-900 dark:text-sky-50">{generalAlerts.length}</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-amber-200/70 bg-amber-50/90 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">Weather</p>
              <p className="mt-1 text-xl font-semibold text-amber-900 dark:text-amber-50">{weatherAlerts.length}</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-rose-200/70 bg-rose-50/90 p-3 dark:border-rose-500/20 dark:bg-rose-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-700 dark:text-rose-200">Calamity</p>
              <p className="mt-1 text-xl font-semibold text-rose-900 dark:text-rose-50">{calamityAlerts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {(mode === 'admin-alerts' || mode === 'calamity-alerts') && (
        <div className="mb-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-[0.08em] text-emerald-900 dark:text-emerald-100">Push Delivery Monitor</h2>
            <span className="text-xs text-emerald-700 dark:text-emerald-300">Auto-refresh every 7s</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            <div className="rounded-xl border border-emerald-200/70 bg-white/80 p-3 dark:border-emerald-500/20 dark:bg-slate-950/40">
              <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Active Devices</p>
              <p className="mt-1 text-lg font-semibold text-emerald-900 dark:text-emerald-100">{pushStats.totalActive}</p>
            </div>
            <div className="rounded-xl border border-emerald-200/70 bg-white/80 p-3 dark:border-emerald-500/20 dark:bg-slate-950/40">
              <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Users</p>
              <p className="mt-1 text-lg font-semibold text-emerald-900 dark:text-emerald-100">{pushStats.userActive}</p>
            </div>
            <div className="rounded-xl border border-emerald-200/70 bg-white/80 p-3 dark:border-emerald-500/20 dark:bg-slate-950/40">
              <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Operators</p>
              <p className="mt-1 text-lg font-semibold text-emerald-900 dark:text-emerald-100">{pushStats.operatorActive}</p>
            </div>
            <div className="rounded-xl border border-emerald-200/70 bg-white/80 p-3 dark:border-emerald-500/20 dark:bg-slate-950/40">
              <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Public Devices</p>
              <p className="mt-1 text-lg font-semibold text-emerald-900 dark:text-emerald-100">{pushStats.publicActive ?? 0}</p>
            </div>
            <div className="rounded-xl border border-emerald-200/70 bg-white/80 p-3 dark:border-emerald-500/20 dark:bg-slate-950/40">
              <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Last Broadcast</p>
              <p className="mt-1 text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                {lastBroadcastTargetCount === null ? "-" : `${lastBroadcastTargetCount} devices`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        {mode === 'notifications' && <NotificationsHistoryTable items={systemHistory} />}

        {mode === 'admin-alerts' && (
          <AdminAlertsSection
            generalAlerts={generalAlerts}
            weatherAlerts={weatherAlerts}
            onOpenGeneralModal={() => setIsGeneralModalOpen(true)}
            onOpenBroadcastModal={() => setIsBroadcastModalOpen(true)}
            onOpenWeatherModal={() => setIsWeatherModalOpen(true)}
            onEdit={openEditModal}
            onDelete={(id, label) => void handleDeleteNotification(id, label)}
          />
        )}

        {mode === 'calamity-alerts' && (
          <CalamityAlertsSection
            calamityAlerts={calamityAlerts}
            onOpenCalamityModal={() => setIsCalamityModalOpen(true)}
            onEdit={openEditModal}
            onDelete={(id, label) => void handleDeleteNotification(id, label)}
          />
        )}
      </div>

      <GeneralAlertDialog
        open={isGeneralModalOpen}
        severity={generalSeverity}
        message={generalMessage}
        mode="normal"
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setIsGeneralModalOpen(true);
            return;
          }
          void (async () => {
            if (!(await confirmDiscardGeneral())) return;
            setIsGeneralModalOpen(false);
          })();
        }}
        onSeverityChange={setGeneralSeverity}
        onMessageChange={setGeneralMessage}
        onSubmit={() => void handleSendGeneralAlert()}
      />

      <GeneralAlertDialog
        open={isBroadcastModalOpen}
        severity={generalSeverity}
        message={generalMessage}
        mode="broadcast"
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setIsBroadcastModalOpen(true);
            return;
          }
          void (async () => {
            if (!(await confirmDiscardBroadcast())) return;
            setIsBroadcastModalOpen(false);
          })();
        }}
        onSeverityChange={setGeneralSeverity}
        onMessageChange={setGeneralMessage}
        onSubmit={() => void handleBroadcastGeneralAlert()}
      />

      <WeatherAlertDialog
        open={isWeatherModalOpen}
        severity={weatherSeverity}
        message={weatherMessage}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setIsWeatherModalOpen(true);
            return;
          }
          void (async () => {
            if (!(await confirmDiscardWeather())) return;
            setIsWeatherModalOpen(false);
          })();
        }}
        onSeverityChange={setWeatherSeverity}
        onMessageChange={setWeatherMessage}
        onSubmit={() => void handleSendWeatherAlert()}
      />

      <CalamityAlertDialog
        open={isCalamityModalOpen}
        signal={calamitySignal}
        calamityType={calamityType}
        message={calamityMessage}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setIsCalamityModalOpen(true);
            return;
          }
          void (async () => {
            if (!(await confirmDiscardCalamity())) return;
            setIsCalamityModalOpen(false);
          })();
        }}
        onSignalChange={setCalamitySignal}
        onCalamityTypeChange={setCalamityType}
        onMessageChange={setCalamityMessage}
        onSubmit={() => void handleSendCalamityAlert()}
      />

      <EditNotificationDialog
        open={isEditModalOpen}
        notificationType={editNotificationType}
        severity={editSeverity}
        title={editTitle}
        message={editMessage}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setIsEditModalOpen(true);
            return;
          }
          void (async () => {
            if (!(await confirmDiscardEdit())) return;
            setIsEditModalOpen(false);
          })();
        }}
        onSeverityChange={setEditSeverity}
        onTitleChange={setEditTitle}
        onMessageChange={setEditMessage}
        onSubmit={() => void handleUpdateNotification()}
      />

      {generalDiscardDialog}
      {broadcastDiscardDialog}
      {weatherDiscardDialog}
      {calamityDiscardDialog}
      {editDiscardDialog}
    </Layout>
  );
};

export default observer(NotificationsPage);
