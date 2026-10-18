import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { EmptyStateRow } from '@/components/ui/empty-state-row';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddAdminModal } from '@/features/users/admin/components/AddAdminModal';
import { AdminConfirmDialog } from '@/features/users/admin/components/AdminConfirmDialog';
import { AdminDetailsSheet } from '@/features/users/admin/components/AdminDetailsSheet';
import { AdminEditDialog } from '@/features/users/admin/components/AdminEditDialog';
import { AdminEditConfirmDialog } from '@/features/users/admin/components/AdminEditConfirmDialog';
import { AdminPasswordDialog } from '@/features/users/admin/components/AdminPasswordDialog';
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';
import { pushBellNotification } from '@/lib/notification-helpers';
import { getAdmins, deleteAdmin, updateAdmin } from '@/api/adminService';
import { loginSuperAdmin } from '@/api/superadminService';
import { formatDateOrFallback } from '@/lib/date-time';
import { cn } from '@/lib/utils';
import type { User } from '@/types/models';
import { AlertTriangle, ChevronRight, ClipboardCheck, Plus, RefreshCcw, Search, Trash2 } from 'lucide-react';

const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<User[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deleteAnimation, setDeleteAnimation] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    superAdminPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmUsername, setConfirmUsername] = useState('');
  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'activate' | 'delete' | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [editServerFieldErrors, setEditServerFieldErrors] = useState({ username: '', email: '' });
  const [editSubmitError, setEditSubmitError] = useState('');
  const [pendingEdit, setPendingEdit] = useState<{ username: string; email: string } | null>(null);
  const [editChanges, setEditChanges] = useState<{ label: string; value: string }[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const fetchAdmins = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      setFetchError(null);
    }

    try {
      const data = await getAdmins();
      setAdmins(data);
      if (silent) {
        setFetchError(null);
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
      setFetchError('Could not fetch admin data.');
      if (!silent) {
        showErrorToast('Error', 'Could not fetch admin data.');
      }
    }
  }, []);

  useEffect(() => {
    void fetchAdmins();
  }, [fetchAdmins]);

  const filteredAdmins = useMemo(
    () =>
      admins.filter((admin) => {
        const matchesSearch =
          admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          admin.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' ? true : admin.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [admins, searchTerm, statusFilter],
  );

  const activeCount = admins.filter((admin) => admin.status === 'active').length;
  const inactiveCount = admins.filter((admin) => admin.status === 'inactive').length;
  const hasFilters = searchTerm.trim().length > 0 || statusFilter !== 'all';
  const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / pageSize));
  const pagedAdmins = filteredAdmins.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [navigate, user]);

  if (user?.role !== 'super_admin') {
    return null;
  }

  const selectedAdmin = selectedAdminId ? admins.find((admin) => admin.id === selectedAdminId) ?? null : null;

  const openDetails = (adminId: string) => {
    setSelectedAdminId(adminId);
    setDetailsOpen(true);
  };

  const openPasswordModal = (admin: User) => {
    setSelectedAdminId(admin.id);
    setPasswordForm({
      superAdminPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordError('');
    setPasswordModalOpen(true);
  };

  const openConfirmModal = (action: 'deactivate' | 'activate' | 'delete', admin: User) => {
    setSelectedAdminId(admin.id);
    setConfirmAction(action);
    setConfirmPassword('');
    setConfirmUsername('');
    setConfirmError('');
    setConfirmModalOpen(true);
  };

  const openEditModal = (admin: User) => {
    setSelectedAdminId(admin.id);
    setEditTarget(admin);
    setEditServerFieldErrors({ username: '', email: '' });
    setEditSubmitError('');
    setEditModalOpen(true);
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

  const handlePasswordChange = async () => {
    if (!selectedAdmin || !user) return;

    if (!passwordForm.superAdminPassword) {
      setPasswordError('Please enter your super admin password.');
      showErrorToast('Validation Error', 'Please enter your super admin password.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      showErrorToast('Validation Error', 'New password must be at least 6 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match.');
      showErrorToast('Validation Error', 'Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');

    try {
      await loginSuperAdmin({ username: user.username, password: passwordForm.superAdminPassword });

      await updateAdmin(selectedAdmin.id, {
        username: selectedAdmin.username,
        email: selectedAdmin.email,
        password: passwordForm.newPassword,
        status: selectedAdmin.status,
      });

      showSuccessToast('Password Updated', `Password updated for "${selectedAdmin.username}".`);
      setPasswordModalOpen(false);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setPasswordError('Super admin password is incorrect.');
        showErrorToast('Authorization Failed', 'Super admin password is incorrect.');
      } else {
        const message = err.response?.data?.message || 'Failed to update admin password.';
        setPasswordError(message);
        showErrorToast('Error', message);
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedAdmin || !user || !confirmAction) return;

    if (!confirmPassword) {
      setConfirmError('Please enter your super admin password.');
      showErrorToast('Validation Error', 'Please enter your super admin password.');
      return;
    }

    if (confirmAction === 'delete' && confirmUsername.trim() !== selectedAdmin.username) {
      setConfirmError('Please type the exact username to confirm deletion.');
      showErrorToast('Validation Error', 'Please type the exact username to confirm deletion.');
      return;
    }

    setConfirmLoading(true);
    setConfirmError('');

    try {
      await loginSuperAdmin({ username: user.username, password: confirmPassword });

      if (confirmAction === 'delete') {
        await deleteAdmin(selectedAdmin.id);
        setDeleteAnimation(selectedAdmin.id);
        setDetailsOpen(false);
        setSelectedAdminId(null);
        setTimeout(() => {
          setAdmins((prev) => prev.filter((admin) => admin.id !== selectedAdmin.id));
          setDeleteAnimation(null);
          showSuccessToast('Admin Deleted', `Admin account "${selectedAdmin.username}" has been deleted.`);
        }, 300);
      } else {
        const nextStatus = confirmAction === 'deactivate' ? 'inactive' : 'active';
        await updateAdmin(selectedAdmin.id, {
          username: selectedAdmin.username,
          email: selectedAdmin.email,
          status: nextStatus,
        });

        setAdmins((prev) =>
          prev.map((admin) => (admin.id === selectedAdmin.id ? { ...admin, status: nextStatus } : admin)),
        );
        showSuccessToast(
          'Status Updated',
          `Admin "${selectedAdmin.username}" is now ${nextStatus === 'active' ? 'active' : 'inactive'}.`,
        );
      }

      setConfirmModalOpen(false);
      setConfirmAction(null);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setConfirmError('Super admin password is incorrect.');
        showErrorToast('Authorization Failed', 'Super admin password is incorrect.');
      } else {
        const message = err.response?.data?.message || 'Action failed. Please try again.';
        setConfirmError(message);
        showErrorToast('Error', message);
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleEditSubmit = async (payload: { username: string; email: string }) => {
    if (!editTarget) return;
    setEditServerFieldErrors({ username: '', email: '' });
    setEditSubmitError('');
    setPendingEdit(payload);
    const changes: { label: string; value: string }[] = [];
    if (payload.username !== editTarget.username) {
      changes.push({ label: 'Username', value: payload.username });
    }
    if (payload.email !== editTarget.email) {
      changes.push({ label: 'Email', value: payload.email });
    }
    if (changes.length === 0) {
      showErrorToast('No Changes', 'There are no changes to save.');
      return;
    }
    setEditChanges(changes);
    setEditConfirmPassword('');
    setEditConfirmOpen(true);
  };

  const handleEditConfirm = async () => {
    if (!editTarget || !pendingEdit) return;
    if (!editConfirmPassword) {
      showErrorToast('Validation Error', 'Please enter your password.');
      return;
    }
    setEditLoading(true);
    try {
      await loginSuperAdmin({ username: user?.username || '', password: editConfirmPassword });
      const updated = await updateAdmin(editTarget.id, {
        username: pendingEdit.username,
        email: pendingEdit.email,
        status: editTarget.status,
      });
      setAdmins((prev) => prev.map((admin) => (admin.id === updated.id ? updated : admin)));
      setEditModalOpen(false);
      setEditConfirmOpen(false);
      setEditTarget(null);
      setPendingEdit(null);
      showSuccessToast('Admin Updated', `Admin "${updated.username}" has been updated.`);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        showErrorToast('Authorization Failed', 'Password is incorrect.');
      } else {
        const message = err.response?.data?.message || 'Failed to update admin.';
        const normalized = String(message).toLowerCase();
        if (normalized.includes('username')) {
          setEditServerFieldErrors((prev) => ({ ...prev, username: message }));
          setEditConfirmOpen(false);
        } else if (normalized.includes('email')) {
          setEditServerFieldErrors((prev) => ({ ...prev, email: message }));
          setEditConfirmOpen(false);
        } else {
          setEditSubmitError(message);
        }
        showErrorToast('Error', message);
      }
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <AddAdminModal
        open={showModal}
        onOpenChange={(isOpen) => {
          setShowModal(isOpen);
          if (!isOpen) void fetchAdmins();
        }}
      />

      <AdminPasswordDialog
        open={passwordModalOpen}
        loading={passwordLoading}
        error={passwordError}
        passwordForm={passwordForm}
        onOpenChange={(open) => {
          setPasswordModalOpen(open);
          if (!open) setPasswordError('');
        }}
        onPasswordFormChange={(next) => {
          setPasswordForm(next);
          if (passwordError) setPasswordError('');
        }}
        onSubmit={handlePasswordChange}
      />

      <AdminConfirmDialog
        open={confirmModalOpen}
        loading={confirmLoading}
        error={confirmError}
        confirmAction={confirmAction}
        confirmPassword={confirmPassword}
        confirmUsername={confirmUsername}
        selectedAdmin={selectedAdmin}
        onOpenChange={(open) => {
          setConfirmModalOpen(open);
          if (!open) setConfirmError('');
        }}
        onConfirmPasswordChange={(value) => {
          setConfirmPassword(value);
          if (confirmError) setConfirmError('');
        }}
        onConfirmUsernameChange={(value) => {
          setConfirmUsername(value);
          if (confirmError) setConfirmError('');
        }}
        onConfirm={handleConfirmAction}
      />

      <AdminDetailsSheet
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedAdminId(null);
        }}
        selectedAdmin={selectedAdmin}
        onCopy={copyToClipboard}
        onOpenPasswordModal={openPasswordModal}
        onOpenConfirmModal={openConfirmModal}
        onOpenEditModal={openEditModal}
      />

      <AdminEditDialog
        open={editModalOpen}
        admin={editTarget}
        loading={editLoading}
        serverFieldErrors={editServerFieldErrors}
        submitError={editSubmitError}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setEditTarget(null);
            setEditServerFieldErrors({ username: '', email: '' });
            setEditSubmitError('');
          }
        }}
        onClearFieldError={(field) => setEditServerFieldErrors((prev) => ({ ...prev, [field]: '' }))}
        onSubmit={handleEditSubmit}
      />

      <AdminEditConfirmDialog
        open={editConfirmOpen}
        loading={editLoading}
        confirmPassword={editConfirmPassword}
        changes={editChanges}
        onOpenChange={(open) => {
          setEditConfirmOpen(open);
          if (!open) {
            setPendingEdit(null);
            setEditChanges([]);
          }
        }}
        onConfirmPasswordChange={setEditConfirmPassword}
        onConfirm={handleEditConfirm}
      />

      <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
          <div className="space-y-2.5">
            <span className="inline-flex w-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              Admin Desk
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Admin Management</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">System access and admin account registry</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">Total</p>
              <p className="mt-1 text-xl font-semibold text-sky-900 dark:text-sky-50">{admins.length}</p>
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
            <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Admin Table</CardTitle>
            <CardDescription>{filteredAdmins.length} admin records</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <Button className="h-10 gap-2 rounded-xl" variant="outline" onClick={() => window.location.hash = '/payment-verification'}>
              <ClipboardCheck className="h-4 w-4" />
              Go To Verification
            </Button>
            <Button className="h-10 gap-2 rounded-xl" onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" />
              New Admin
            </Button>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search username or email..."
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
          {fetchError && admins.length > 0 && (
            <div className="mx-4 mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div className="flex-1">
                <p className="font-semibold">Some data may be outdated.</p>
                <p>{fetchError}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => void fetchAdmins()}>
                <RefreshCcw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          )}

          {fetchError && admins.length === 0 ? (
            <div className="p-10 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
              <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Couldn't load admins</p>
              <p className="mt-2 text-slate-600 dark:text-slate-300">{fetchError}</p>
              <Button className="mt-6 gap-2" onClick={() => void fetchAdmins()}>
                <RefreshCcw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Username</TableHead>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Email</TableHead>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Status</TableHead>
                    <TableHead className="w-[84px] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Online</TableHead>
                    <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Last Login</TableHead>
                    <TableHead className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedAdmins.map((admin) => (
                    <TableRow
                      key={admin.id}
                      className={cn(
                        'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50',
                        deleteAnimation === admin.id && 'animate-fade-out',
                      )}
                      onClick={() => openDetails(admin.id)}
                    >
                      <TableCell className="px-4 py-2.5 font-medium">{admin.username}</TableCell>
                      <TableCell className="px-4 py-2.5">{admin.email}</TableCell>
                      <TableCell className="px-4 py-2.5">
                        <Badge
                          className={cn(
                            'font-medium capitalize',
                            admin.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200',
                          )}
                        >
                          {admin.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center"
                          aria-label={admin.isOnline ? 'Online' : 'Offline'}
                          title={admin.isOnline ? 'Online' : 'Offline'}
                        >
                          <span
                            className={cn(
                              'h-2.5 w-2.5 rounded-full',
                              admin.isOnline ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400',
                            )}
                          />
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-2.5">{formatDateOrFallback(admin.lastLoginAt, 'Never')}</TableCell>
                      <TableCell className="px-4 py-2.5">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 rounded-lg px-3"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDetails(admin.id);
                            }}
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg px-3"
                            onClick={(event) => {
                              event.stopPropagation();
                              openConfirmModal(admin.status === 'active' ? 'deactivate' : 'activate', admin);
                            }}
                          >
                            {admin.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 gap-1 rounded-lg px-3"
                            onClick={(event) => {
                              event.stopPropagation();
                              openConfirmModal('delete', admin);
                            }}
                            disabled={admin.role === 'super_admin'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pagedAdmins.length === 0 && (
                    <EmptyStateRow
                      colSpan={6}
                      message={hasFilters ? 'No admins match the current filters.' : 'No admins found.'}
                    />
                  )}
                </TableBody>
              </Table>

              {filteredAdmins.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="text-slate-500 dark:text-slate-400">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={page >= totalPages}
                    >
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

export default AdminPage;
