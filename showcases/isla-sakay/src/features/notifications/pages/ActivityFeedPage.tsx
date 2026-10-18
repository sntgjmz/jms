import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ClipboardCheck, LogIn, Search, ShieldAlert } from 'lucide-react';
import Layout from '@/components/Layout';
import { useNotificationStore } from '@/stores';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTimeOrFallback, toEpochMs } from '@/lib/date-time';
import { cn } from '@/lib/utils';

const formatExact = (value?: string) => {
  return formatDateTimeOrFallback(value, 'Unknown time');
};

const formatAgo = (value?: string) => {
  const created = toEpochMs(value);
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

function ActivityFeedPageImpl() {
  const notificationStore = useNotificationStore();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'all' | 'login' | 'activity'>('all');

  useEffect(() => {
    if (!notificationStore.hasFetched && !notificationStore.isLoading) {
      void notificationStore.fetchNotifications();
    }
  }, [notificationStore]);

  const feedItems = useMemo(() => {
    const base = notificationStore.notifications.filter((item) => {
      if (mode === 'login') return item.title === 'Login Activity';
      if (mode === 'activity') return item.title === 'Activity Alert';
      return item.title === 'Login Activity' || item.title === 'Activity Alert';
    });
    const lowered = query.trim().toLowerCase();
    return base
      .filter((item) => !lowered || `${item.title} ${item.message}`.toLowerCase().includes(lowered))
      .sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));
  }, [mode, notificationStore.notifications, query]);

  const feedSummary = useMemo(
    () => ({
      visible: feedItems.length,
      login: feedItems.filter((item) => item.title === 'Login Activity').length,
      activity: feedItems.filter((item) => item.title === 'Activity Alert').length,
    }),
    [feedItems],
  );

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
          <div className="space-y-2.5">
            <span className="inline-flex w-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              Activity Desk
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Activity Feed</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">Live timeline of login and management actions across your admin system</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">All</p>
              <p className="mt-1 text-xl font-semibold text-sky-900 dark:text-sky-50">{notificationStore.notifications.filter((item) => item.title === 'Login Activity' || item.title === 'Activity Alert').length}</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-emerald-200/70 bg-emerald-50/90 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">Login</p>
              <p className="mt-1 text-xl font-semibold text-emerald-900 dark:text-emerald-50">{notificationStore.notifications.filter((item) => item.title === 'Login Activity').length}</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-amber-200/70 bg-amber-50/90 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">Activity</p>
              <p className="mt-1 text-xl font-semibold text-amber-900 dark:text-amber-50">{notificationStore.notifications.filter((item) => item.title === 'Activity Alert').length}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="mb-4 border-slate-200/70 bg-white/92 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Activity Timeline</CardTitle>
            <CardDescription>{feedItems.length} feed entries</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <Button className="h-10 gap-2 rounded-xl" variant="outline" onClick={() => window.location.hash = '/payment-verification'}>
              <ClipboardCheck className="h-4 w-4" />
              Go To Verification
            </Button>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search activity message..."
                className="h-10 rounded-xl pl-9"
              />
            </div>
            <Button className="h-10 rounded-xl" variant={mode === 'all' ? 'default' : 'outline'} onClick={() => setMode('all')}>All</Button>
            <Button className="h-10 rounded-xl" variant={mode === 'login' ? 'default' : 'outline'} onClick={() => setMode('login')}>Login</Button>
            <Button className="h-10 rounded-xl" variant={mode === 'activity' ? 'default' : 'outline'} onClick={() => setMode('activity')}>Activity</Button>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
          {feedSummary.visible} visible
        </span>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          {feedSummary.login} login
        </span>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {feedSummary.activity} activity
        </span>
      </div>

      <div className="space-y-3">
        {feedItems.length === 0 && (
          <Card>
            <CardContent className="p-6 text-sm text-slate-500 dark:text-slate-300">
              No activity found for current filters.
            </CardContent>
          </Card>
        )}
        {feedItems.map((item) => (
          <Card key={item.id} className="border-slate-200/70 bg-white/92 shadow-[0_10px_24px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-950/78">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'mt-0.5 rounded-2xl border p-2.5',
                    item.title === 'Login Activity'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
                      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200',
                  )}>
                    {item.title === 'Login Activity' ? <LogIn className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{item.message}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" title={formatExact(item.createdAt)}>
                    {formatAgo(item.createdAt)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
}

export default observer(ActivityFeedPageImpl);
