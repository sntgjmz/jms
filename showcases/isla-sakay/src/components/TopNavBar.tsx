import { Bell, LogOut, Settings, HelpCircle, ChevronDown, Clock3 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationStore } from '@/stores';
import { observer } from 'mobx-react-lite';
import { CommandPalette } from './CommandPalette';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatDateTimeOrFallback, toEpochMs } from '@/lib/date-time';

const formatPageTitle = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) return '';

  return last
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getNotificationPath = (type: string) => {
  if (type === 'weather') return '/notifications/admin-alerts';
  if (type === 'coast_guard') return '/notifications/calamity-alerts';
  if (type === 'system') return '/notifications';
  if (type === 'payment') return '/payment-verification';
  return '/notifications';
};

const getNotificationPathByContext = (type: string, title?: string) => {
  const normalizedTitle = (title ?? '').toLowerCase();
  if (normalizedTitle.includes('login activity') || normalizedTitle.includes('activity alert')) {
    return '/notifications/admin-alerts';
  }
  return getNotificationPath(type);
};

const getPriorityChipClass = (priority: string) => {
  if (priority === 'critical') return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200';
  if (priority === 'high') return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200';
  if (priority === 'medium') return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200';
  return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
};

const formatTimeAgo = (createdAt?: string) => {
  const created = toEpochMs(createdAt);
  if (created <= 0) return 'N/A';
  const diffMs = Date.now() - created;
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

function TopNavBar() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const notificationStore = useNotificationStore();
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const hasInitializedSeenRef = useRef(false);
  const pageTitle = formatPageTitle(location.pathname) || 'Dashboard';
  const [activeNotificationTab, setActiveNotificationTab] = useState<'unread' | 'read' | 'all'>('unread');
  const recentNotifications = notificationStore.getRecentNotifications(10);
  const unreadNotifications = recentNotifications.filter((item) => !item.isRead);
  const readNotifications = recentNotifications.filter((item) => item.isRead);
  const allNotifications = recentNotifications;
  const currentTabItems = useMemo(() => {
    if (activeNotificationTab === 'read') return readNotifications;
    if (activeNotificationTab === 'all') return allNotifications;
    return unreadNotifications;
  }, [activeNotificationTab, readNotifications, allNotifications, unreadNotifications]);
  const unreadCount = notificationStore.unreadCount;
  const [phNowLabel, setPhNowLabel] = useState(
    new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date()),
  );

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const intervalId = window.setInterval(() => {
      setPhNowLabel(formatter.format(new Date()));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!notificationStore.hasFetched && !notificationStore.isLoading) {
      void notificationStore.fetchNotifications();
    }
  }, [notificationStore]);

  useEffect(() => {
    if (!notificationStore.hasFetched) {
      return;
    }

    const current = notificationStore.notifications;
    const seen = seenNotificationIdsRef.current;

    if (!hasInitializedSeenRef.current) {
      current.forEach((item) => seen.add(item.id));
      hasInitializedSeenRef.current = true;
      return;
    }

    const newItems = current.filter((item) => !seen.has(item.id));
    newItems.forEach((item) => {
      seen.add(item.id);
      if (
        item.title === 'Login Activity' ||
        item.title === 'Activity Alert' ||
        item.title === 'Account Updated' ||
        item.title === 'Account Access Changed'
      ) {
        toast({
          title: item.title,
          description: item.message,
          variant: 'info',
        });
      }
    });
  }, [notificationStore.hasFetched, notificationStore.notifications.length, toast, notificationStore.notifications]);

  const handleNotificationClick = async (notificationId: string, type: string, title?: string) => {
    await notificationStore.markAsRead(notificationId);
    navigate(getNotificationPathByContext(type, title));
  };

  const handleClearRead = async () => {
    const readIds = readNotifications.map((item) => item.id);
    await Promise.all(readIds.map((id) => notificationStore.deleteNotification(id)));
  };

  return (
    <header className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 flex items-center px-6 h-14 shadow-sm z-40 hidden lg:flex">
      <div className="flex-1 flex items-center gap-4 min-w-0">
        <div className="flex flex-col min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {pageTitle}
          </h2>
        </div>
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
        <div className="flex-1 min-w-[220px] max-w-[360px]">
          <CommandPalette />
        </div>
      </div>
      
      <div className="mr-3 hidden lg:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <span className="h-1 w-1 rounded-full bg-slate-400 dark:bg-slate-500" />
        <Clock3 className="h-3.5 w-3.5" />
        <span>{phNowLabel} (PHT)</span>
      </div>
      <div className="flex items-center gap-2 ml-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4 text-slate-600 dark:text-slate-300 mx-auto" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[11px] font-semibold flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-xl">
            <div className="flex items-center justify-between px-2 py-1">
              <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
              <div className="flex items-center gap-2">
                {readNotifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleClearRead()}
                    className="text-xs text-slate-600 dark:text-slate-300 hover:underline"
                  >
                    Clear read
                  </button>
                )}
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void notificationStore.markAllAsRead()}
                    className="text-xs text-blue-600 dark:text-blue-300 hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            </div>
            <DropdownMenuSeparator />
            <Tabs value={activeNotificationTab} onValueChange={(value) => setActiveNotificationTab(value as 'unread' | 'read' | 'all')}>
              <div className="px-2 pt-2">
                <TabsList className="grid h-8 w-full grid-cols-3">
                  <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
                  <TabsTrigger value="read" className="text-xs">Read</TabsTrigger>
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="unread" className="mt-0">
                <div className="max-h-80 overflow-y-auto py-1">
                  {currentTabItems.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">No unread notifications.</div>
                  ) : (
                    currentTabItems.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        onClick={() => void handleNotificationClick(notification.id, notification.type, notification.title)}
                        className="flex flex-col items-start gap-1 rounded-lg px-3 py-2 cursor-pointer"
                      >
                        <div className="w-full flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate w-full">
                            {notification.title}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getPriorityChipClass(notification.priority)}`}>
                              {notification.priority}
                            </span>
                            <span className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{notification.message}</p>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400" title={formatDateTimeOrFallback(notification.createdAt)}>
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="read" className="mt-0">
                <div className="max-h-80 overflow-y-auto py-1">
                  {currentTabItems.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">No read notifications yet.</div>
                  ) : (
                    currentTabItems.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        onClick={() => void handleNotificationClick(notification.id, notification.type, notification.title)}
                        className="flex flex-col items-start gap-1 rounded-lg px-3 py-2 cursor-pointer"
                      >
                        <div className="w-full flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate w-full">{notification.title}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getPriorityChipClass(notification.priority)}`}>
                            {notification.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{notification.message}</p>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400" title={formatDateTimeOrFallback(notification.createdAt)}>
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="all" className="mt-0">
                <div className="max-h-80 overflow-y-auto py-1">
                  {currentTabItems.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">No notifications yet.</div>
                  ) : (
                    currentTabItems.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        onClick={() => void handleNotificationClick(notification.id, notification.type, notification.title)}
                        className="flex flex-col items-start gap-1 rounded-lg px-3 py-2 cursor-pointer"
                      >
                        <div className="w-full flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate w-full">{notification.title}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getPriorityChipClass(notification.priority)}`}>
                              {notification.priority}
                            </span>
                            {!notification.isRead && <span className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{notification.message}</p>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400" title={formatDateTimeOrFallback(notification.createdAt)}>
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
        {/* Profile dropdown for desktop views */}
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                aria-label="Open account menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex items-center">
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate max-w-[140px]">{user?.username}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-300 ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 shadow-xl">
              {/* User Info Section */}
              <div className="flex items-center gap-2 mb-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex items-center">
                  <span className="font-bold text-base text-neutral-900 dark:text-white truncate max-w-[140px]">{user?.username}</span>
                </div>
              </div>
              <hr className="my-1 border-neutral-200 dark:border-neutral-700" />
              {/* Menu Items */}
              <DropdownMenuItem asChild>
                <Link to="/settings/account" className="flex items-center gap-2 py-1 text-base font-normal text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                  <Settings className="w-4 h-4 text-neutral-500 dark:text-neutral-400" /> Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings/about" className="flex items-center gap-2 py-1 text-base font-normal text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                  <HelpCircle className="w-4 h-4 text-neutral-500 dark:text-neutral-400" /> Help Center
                </Link>
              </DropdownMenuItem>
              <hr className="my-1 border-neutral-200 dark:border-neutral-700" />
              <DropdownMenuItem 
                className="flex items-center gap-2 py-1 text-base font-normal text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg" 
                onClick={logout}
              >
                <LogOut className="w-4 h-4" /> Reset demo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default observer(TopNavBar);
