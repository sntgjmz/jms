import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { EmptyStateRow } from '@/components/ui/empty-state-row';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { showErrorToast } from '@/lib/toast-helpers';
import { pushBellNotification } from '@/lib/notification-helpers';
import { formatDateOrFallback } from '@/lib/date-time';
import { getAppUsers, type AppUserAccount } from '@/api/appUserService';
import { AppUserDetailsSheet } from '@/features/users/app-users/components/AppUserDetailsSheet';
import { cn } from '@/lib/utils';
import { AlertTriangle, ChevronRight, ClipboardCheck, RefreshCcw, Search } from 'lucide-react';

const AppUsersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appUsers, setAppUsers] = useState<AppUserAccount[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAppUserId, setSelectedAppUserId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const fetchAppUsers = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      setFetchError(null);
    }

    try {
      const data = await getAppUsers();
      setAppUsers(data);
      if (silent) {
        setFetchError(null);
      }
    } catch (err) {
      console.error('Error fetching app users:', err);
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const message =
        status === 404
          ? 'App user endpoint not found. Please restart or redeploy backend with /api/v1/app-users.'
          : 'Could not fetch app user data.';
      setFetchError(message);
      if (!silent) {
        showErrorToast('Error', message);
      }
    }
  }, []);

  useEffect(() => {
    void fetchAppUsers();
  }, [fetchAppUsers]);

  const filteredAppUsers = useMemo(
    () =>
      appUsers.filter((appUser) => {
        const matchesSearch =
          appUser.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appUser.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (appUser.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' ? true : appUser.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [appUsers, searchTerm, statusFilter],
  );

  const activeCount = appUsers.filter((appUser) => appUser.status === 'active').length;
  const inactiveCount = appUsers.filter((appUser) => appUser.status === 'inactive').length;
  const hasFilters = searchTerm.trim().length > 0 || statusFilter !== 'all';
  const totalPages = Math.max(1, Math.ceil(filteredAppUsers.length / pageSize));
  const pagedAppUsers = filteredAppUsers.slice((page - 1) * pageSize, page * pageSize);
  const selectedAppUser = selectedAppUserId ? appUsers.find((appUser) => appUser.id === selectedAppUserId) ?? null : null;

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [navigate, user]);

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return null;
  }

  const openDetails = (appUserId: string) => {
    setSelectedAppUserId(appUserId);
    setDetailsOpen(true);
  };

  const copyToClipboard = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      pushBellNotification({
        title: 'Copied',
        message: `${label} copied to clipboard.`,
        type: 'system',
        priority: 'low',
      });
    } catch (err) {
      console.error('Copy failed:', err);
      showErrorToast('Copy failed', `Could not copy ${label.toLowerCase()}.`);
    }
  };

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <AppUserDetailsSheet
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedAppUserId(null);
        }}
        selectedAppUser={selectedAppUser}
        onCopy={copyToClipboard}
      />

      <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
          <div className="space-y-2.5">
            <span className="inline-flex w-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              App User Desk
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">App Users</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">Registered mobile and public user accounts</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">Total</p>
              <p className="mt-1 text-xl font-semibold text-sky-900 dark:text-sky-50">{appUsers.length}</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-emerald-200/70 bg-emerald-50/90 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">Active</p>
              <p className="mt-1 text-xl font-semibold text-emerald-900 dark:text-emerald-50">{activeCount}</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-amber-200/70 bg-amber-50/90 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">Inactive</p>
              <p className="mt-1 text-xl font-semibold text-amber-900 dark:text-amber-50">{inactiveCount}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="mb-4 border-slate-200/70 bg-white/92 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle className="text-lg text-slate-900 dark:text-slate-100">User Table</CardTitle>
            <CardDescription>{filteredAppUsers.length} app user records</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <Button className="h-10 gap-2 rounded-xl" variant="outline" onClick={() => window.location.hash = '/payment-verification'}>
              <ClipboardCheck className="h-4 w-4" />
              Go To Verification
            </Button>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search name, email, phone..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-10 rounded-xl pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="h-10 w-full rounded-xl md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <select
              value={String(pageSize)}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="10">10 rows</option>
              <option value="25">25 rows</option>
              <option value="50">50 rows</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
        <CardContent className="p-0">
          {fetchError && appUsers.length > 0 && (
            <div className="mx-4 mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="flex-1">
                <p className="font-semibold">Some data may be outdated.</p>
                <p>{fetchError}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => void fetchAppUsers()}>
                <RefreshCcw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          )}

          {fetchError && appUsers.length === 0 ? (
            <div className="p-10 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
              <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Couldn't load app users</p>
              <p className="mt-2 text-slate-600 dark:text-slate-300">{fetchError}</p>
              <Button className="mt-6 gap-2" onClick={() => void fetchAppUsers()}>
                <RefreshCcw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Name</TableHead>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Email</TableHead>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Phone</TableHead>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Status</TableHead>
                    <TableHead className="w-[84px] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Online</TableHead>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Last Login</TableHead>
                    <TableHead className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedAppUsers.map((appUser) => (
                    <TableRow key={appUser.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => openDetails(appUser.id)}>
                      <TableCell className="px-4 py-2.5 font-medium">{appUser.fullName}</TableCell>
                      <TableCell className="px-4 py-2.5">{appUser.email}</TableCell>
                      <TableCell className="px-4 py-2.5">{appUser.phone || '-'}</TableCell>
                      <TableCell className="px-4 py-2.5">
                        <Badge
                          className={cn(
                            'font-medium capitalize',
                            appUser.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200',
                          )}
                        >
                          {appUser.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center"
                          aria-label={appUser.isOnline ? 'Online' : 'Offline'}
                          title={appUser.isOnline ? 'Online' : 'Offline'}
                        >
                          <span className={cn('h-2.5 w-2.5 rounded-full', appUser.isOnline ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400')} />
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-2.5">{formatDateOrFallback(appUser.lastLoginAt, 'Never')}</TableCell>
                      <TableCell className="px-4 py-2.5">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 rounded-lg px-3"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDetails(appUser.id);
                            }}
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pagedAppUsers.length === 0 && (
                    <EmptyStateRow colSpan={7} message={hasFilters ? 'No app users match the current filters.' : 'No app users found.'} />
                  )}
                </TableBody>
              </Table>

              {filteredAppUsers.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default AppUsersPage;
