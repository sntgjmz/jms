import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { EmptyStateRow } from '@/components/ui/empty-state-row';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BoatOperator } from '@/types/models';
import { AddBoatOperatorModal } from '@/features/users/boat-operators/components/AddBoatOperatorModal';
import { BoatOperatorConfirmDialog } from '@/features/users/boat-operators/components/BoatOperatorConfirmDialog';
import { BoatOperatorDetailsSheet } from '@/features/users/boat-operators/components/BoatOperatorDetailsSheet';
import { BoatOperatorEditDialog } from '@/features/users/boat-operators/components/BoatOperatorEditDialog';
import { BoatOperatorEditConfirmDialog } from '@/features/users/boat-operators/components/BoatOperatorEditConfirmDialog';
import { BoatOperatorPasswordDialog } from '@/features/users/boat-operators/components/BoatOperatorPasswordDialog';
import { BoatOperatorStatusConfirmDialog } from '@/features/users/boat-operators/components/BoatOperatorStatusConfirmDialog';
import { deleteBoatOperator, getBoatOperators, updateBoatOperator } from '@/api/boatOperatorService';
import { loginSuperAdmin } from '@/api/superadminService';
import { loginAdmin } from '@/api/adminService';
import { useAuth } from '@/contexts/AuthContext';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';
import { pushBellNotification } from '@/lib/notification-helpers';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { formatDateOrFallback, toEpochMs } from '@/lib/date-time';
import { cn } from '@/lib/utils';
import { ChevronRight, ClipboardCheck, Plus, Search, Trash2 } from 'lucide-react';

export default function BoatOperatorsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [operators, setOperators] = useState<BoatOperator[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<BoatOperator | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    superAdminPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BoatOperator | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [editServerFieldErrors, setEditServerFieldErrors] = useState({ username: '', email: '', licenseNumber: '' });
  const [editSubmitError, setEditSubmitError] = useState('');
  const [pendingEdit, setPendingEdit] = useState<{
    username: string;
    fullName: string;
    licenseNumber: string;
    operatorType: 'cargo' | 'banca';
    email: string;
    contactNumber: string;
    birthday: string;
  } | null>(null);
  const [editChanges, setEditChanges] = useState<{ label: string; value: string }[]>([]);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [statusConfirmPassword, setStatusConfirmPassword] = useState('');
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<BoatOperator | null>(null);
  const [statusConfirmLoading, setStatusConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [statusConfirmError, setStatusConfirmError] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadOperators = useCallback(async () => {
    try {
      const data = await getBoatOperators();
      setOperators(data);
      setFetchError(null);
    } catch (err) {
      console.error(err);
      setFetchError('Could not fetch operators.');
    }
  }, []);

  useAutoRefresh(loadOperators, [loadOperators], { intervalMs: 5000 });

  const filteredOperators = useMemo(() => {
    const sorted = [...operators].sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));

    return sorted.filter((operator) => {
      const matchesSearch =
        operator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (operator.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        operator.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (operator.licenseNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' ? true : operator.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [operators, searchTerm, statusFilter]);

  const activeCount = operators.filter((operator) => operator.status === 'active').length;
  const inactiveCount = operators.filter((operator) => operator.status === 'inactive').length;
  const hasFilters = searchTerm.trim().length > 0 || statusFilter !== 'all';
  const totalPages = Math.max(1, Math.ceil(filteredOperators.length / pageSize));
  const pagedOperators = filteredOperators.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const selectedOperator = selectedOperatorId
    ? operators.find((operator) => operator.id === selectedOperatorId) ?? null
    : null;

  const openDetails = (operatorId: string) => {
    setSelectedOperatorId(operatorId);
    setDetailsOpen(true);
  };

  const openPasswordModal = (operator: BoatOperator) => {
    setSelectedOperatorId(operator.id);
    setPasswordForm({
      superAdminPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordError('');
    setPasswordModalOpen(true);
  };

  const openEditModal = (operator: BoatOperator) => {
    setEditTarget(operator);
    setEditModalOpen(true);
  };

  const requestStatusChange = (operator: BoatOperator) => {
    setStatusConfirmTarget(operator);
    setStatusConfirmPassword('');
    setStatusConfirmError('');
    setStatusConfirmOpen(true);
  };

  const openDeleteConfirm = (operator: BoatOperator) => {
    setConfirmTarget(operator);
    setConfirmPassword('');
    setConfirmName('');
    setConfirmError('');
    setConfirmOpen(true);
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

  const handleDeleteConfirm = async () => {
    if (!confirmTarget || !user) return;
    if (!confirmPassword) {
      setConfirmError('Please enter your password.');
      showErrorToast('Validation Error', 'Please enter your password.');
      return;
    }
    if (confirmName.trim() !== confirmTarget.name) {
      setConfirmError('Please type the exact operator name to confirm deletion.');
      showErrorToast('Validation Error', 'Please type the exact operator name to confirm deletion.');
      return;
    }

    setConfirmLoading(true);
    setConfirmError('');
    try {
      if (user.role === 'super_admin') {
        await loginSuperAdmin({ username: user.username, password: confirmPassword });
      } else {
        await loginAdmin({ username: user.username, password: confirmPassword });
      }
      await deleteBoatOperator(confirmTarget.id);
      setOperators((prev) => prev.filter((item) => item.id !== confirmTarget.id));
      if (selectedOperatorId === confirmTarget.id) {
        setDetailsOpen(false);
        setSelectedOperatorId(null);
      }
      showSuccessToast('Operator Deleted', `Operator "${confirmTarget.name}" has been deleted.`);
      setConfirmOpen(false);
      setConfirmTarget(null);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setConfirmError('Password is incorrect.');
        showErrorToast('Authorization Failed', 'Password is incorrect.');
      } else {
        const message = err.response?.data?.message || 'Failed to delete operator.';
        setConfirmError(message);
        showErrorToast('Error', message);
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleEditSubmit = async (payload: {
    username: string;
    fullName: string;
    licenseNumber: string;
    operatorType: 'cargo' | 'banca';
    email: string;
    contactNumber: string;
    birthday: string;
  }) => {
    if (!editTarget) return;
    setEditServerFieldErrors({ username: '', email: '', licenseNumber: '' });
    setEditSubmitError('');
    setPendingEdit(payload);
    const changes: { label: string; value: string }[] = [];
    if (payload.username !== editTarget.username) {
      changes.push({ label: 'Username', value: payload.username });
    }
    if (payload.fullName !== editTarget.name) {
      changes.push({ label: 'Name', value: payload.fullName });
    }
    if (payload.email !== (editTarget.email || '')) {
      changes.push({ label: 'Email', value: payload.email });
    }
    if (payload.contactNumber !== editTarget.phone) {
      changes.push({ label: 'Contact', value: payload.contactNumber });
    }
    if (payload.licenseNumber !== (editTarget.licenseNumber || '')) {
      changes.push({ label: 'License', value: payload.licenseNumber });
    }
    if ((payload.operatorType || '') !== (editTarget.operatorType || '')) {
      changes.push({ label: 'Type', value: payload.operatorType });
    }
    if (payload.birthday !== (editTarget.birthday || '')) {
      changes.push({ label: 'Birthday', value: payload.birthday });
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
    if (!editTarget || !pendingEdit || !user) return;
    if (!editConfirmPassword) {
      showErrorToast('Validation Error', 'Please enter your password.');
      return;
    }
    setEditLoading(true);
    try {
      if (user.role === 'super_admin') {
        await loginSuperAdmin({ username: user.username, password: editConfirmPassword });
      } else {
        await loginAdmin({ username: user.username, password: editConfirmPassword });
      }
      const updated = await updateBoatOperator(editTarget.id, pendingEdit);
      setOperators((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditModalOpen(false);
      setEditConfirmOpen(false);
      setEditTarget(null);
      setPendingEdit(null);
      showSuccessToast('Operator Updated', `Operator "${updated.name}" has been updated.`);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        showErrorToast('Authorization Failed', 'Password is incorrect.');
      } else {
        const message = err.response?.data?.message || 'Failed to update operator.';
        const normalized = String(message).toLowerCase();
        if (normalized.includes('username')) {
          setEditServerFieldErrors((prev) => ({ ...prev, username: message }));
          setEditConfirmOpen(false);
        } else if (normalized.includes('email')) {
          setEditServerFieldErrors((prev) => ({ ...prev, email: message }));
          setEditConfirmOpen(false);
        } else if (normalized.includes('license')) {
          setEditServerFieldErrors((prev) => ({ ...prev, licenseNumber: message }));
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

  const handlePasswordChange = async () => {
    if (!selectedOperator || !user) return;

    if (!passwordForm.superAdminPassword) {
      setPasswordError('Please enter your password.');
      showErrorToast('Validation Error', 'Please enter your password.');
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
      if (user.role === 'super_admin') {
        await loginSuperAdmin({ username: user.username, password: passwordForm.superAdminPassword });
      } else {
        await loginAdmin({ username: user.username, password: passwordForm.superAdminPassword });
      }
      await updateBoatOperator(selectedOperator.id, { password: passwordForm.newPassword });
      showSuccessToast('Password Updated', `Password updated for "${selectedOperator.name}".`);
      setPasswordModalOpen(false);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setPasswordError('Password is incorrect.');
        showErrorToast('Authorization Failed', 'Password is incorrect.');
      } else {
        const message = err.response?.data?.message || 'Failed to update operator password.';
        setPasswordError(message);
        showErrorToast('Error', message);
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleStatusConfirm = async () => {
    if (!statusConfirmTarget || !user) return;

    if (!statusConfirmPassword) {
      setStatusConfirmError('Please enter your password.');
      showErrorToast('Validation Error', 'Please enter your password.');
      return;
    }

    setStatusConfirmLoading(true);
    setStatusConfirmError('');
    const nextStatus = statusConfirmTarget.status === 'active' ? 'inactive' : 'active';

    try {
      if (user.role === 'super_admin') {
        await loginSuperAdmin({ username: user.username, password: statusConfirmPassword });
      } else {
        await loginAdmin({ username: user.username, password: statusConfirmPassword });
      }
      await updateBoatOperator(statusConfirmTarget.id, { isActive: nextStatus === 'active' });
      setOperators((prev) =>
        prev.map((item) => (item.id === statusConfirmTarget.id ? { ...item, status: nextStatus } : item))
      );
      showSuccessToast('Status Updated', `Operator is now ${nextStatus}.`);
      setStatusConfirmOpen(false);
      setStatusConfirmTarget(null);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setStatusConfirmError('Password is incorrect.');
        showErrorToast('Authorization Failed', 'Password is incorrect.');
      } else {
        const message = err.response?.data?.message || 'Failed to update operator status.';
        setStatusConfirmError(message);
        showErrorToast('Error', message);
      }
    } finally {
      setStatusConfirmLoading(false);
    }
  };

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <AddBoatOperatorModal
        open={showModal}
        onOpenChange={setShowModal}
        onCreate={(operator) => setOperators((prev) => [operator, ...prev])}
      />

      <BoatOperatorDetailsSheet
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedOperatorId(null);
        }}
        selectedOperator={selectedOperator}
        onToggleStatus={requestStatusChange}
        onDeleteRequest={openDeleteConfirm}
        onCopy={copyToClipboard}
        onOpenPasswordModal={openPasswordModal}
        onOpenEditModal={openEditModal}
      />

      <BoatOperatorPasswordDialog
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

      <BoatOperatorEditDialog
        open={editModalOpen}
        operator={editTarget}
        loading={editLoading}
        serverFieldErrors={editServerFieldErrors}
        submitError={editSubmitError}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setEditTarget(null);
            setEditServerFieldErrors({ username: '', email: '', licenseNumber: '' });
            setEditSubmitError('');
          }
        }}
        onClearFieldError={(field) => setEditServerFieldErrors((prev) => ({ ...prev, [field]: '' }))}
        onSubmit={handleEditSubmit}
      />

      <BoatOperatorEditConfirmDialog
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

      <BoatOperatorStatusConfirmDialog
        open={statusConfirmOpen}
        loading={statusConfirmLoading}
        operator={statusConfirmTarget}
        confirmPassword={statusConfirmPassword}
        error={statusConfirmError}
        onOpenChange={(open) => {
          setStatusConfirmOpen(open);
          if (!open) {
            setStatusConfirmTarget(null);
            setStatusConfirmError('');
          }
        }}
        onConfirmPasswordChange={(value) => {
          setStatusConfirmPassword(value);
          if (statusConfirmError) setStatusConfirmError('');
        }}
        onConfirm={handleStatusConfirm}
      />

      <BoatOperatorConfirmDialog
        open={confirmOpen}
        operator={confirmTarget}
        loading={confirmLoading}
        confirmPassword={confirmPassword}
        confirmName={confirmName}
        error={confirmError}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setConfirmTarget(null);
            setConfirmError('');
          }
        }}
        onConfirmPasswordChange={(value) => {
          setConfirmPassword(value);
          if (confirmError) setConfirmError('');
        }}
        onConfirmNameChange={(value) => {
          setConfirmName(value);
          if (confirmError) setConfirmError('');
        }}
        onCancel={() => {
          setConfirmError('');
          setConfirmOpen(false);
        }}
        onConfirm={handleDeleteConfirm}
      />

      <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
          <div className="space-y-2.5">
            <span className="inline-flex w-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              Operator Desk
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Boat Operators</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">Operator accounts and license registry</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">Total</p>
              <p className="mt-1 text-xl font-semibold text-sky-900 dark:text-sky-50">{operators.length}</p>
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
            <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Operator Table</CardTitle>
            <CardDescription>{filteredOperators.length} operator records</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <Button className="h-10 gap-2 rounded-xl" variant="outline" onClick={() => window.location.hash = '/payment-verification'}>
              <ClipboardCheck className="h-4 w-4" />
              Go To Verification
            </Button>
            <Button className="h-10 gap-2 rounded-xl" onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" />
              Add Operator
            </Button>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name, email, phone, license..."
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
          {fetchError && (
            <div className="mx-4 mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
              {fetchError}
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Username</TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Full Name</TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Type</TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Status</TableHead>
                <TableHead className="w-[84px] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Online</TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Last Login</TableHead>
                <TableHead className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedOperators.map((operator) => (
                <TableRow
                  key={operator.id}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  onClick={() => openDetails(operator.id)}
                >
                  <TableCell className="px-4 py-2.5 font-medium">{operator.username || '-'}</TableCell>
                  <TableCell className="px-4 py-2.5">{operator.name}</TableCell>
                  <TableCell className="px-4 py-2.5 capitalize">{operator.operatorType || '-'}</TableCell>
                  <TableCell className="px-4 py-2.5">
                    <Badge
                      className={cn(
                        'font-medium capitalize',
                        operator.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200'
                      )}
                    >
                      {operator.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-2.5">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center"
                      aria-label={operator.isOnline ? 'Online' : 'Offline'}
                      title={operator.isOnline ? 'Online' : 'Offline'}
                    >
                      <span
                        className={cn(
                          'h-2.5 w-2.5 rounded-full',
                          operator.isOnline ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400'
                        )}
                      />
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-2.5">{formatDateOrFallback(operator.lastLoginAt, 'Never')}</TableCell>
                  <TableCell className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 rounded-lg px-3"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDetails(operator.id);
                        }}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg px-3"
                        onClick={(event) => {
                          event.stopPropagation();
                          requestStatusChange(operator);
                        }}
                      >
                        {operator.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 gap-1 rounded-lg px-3"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDeleteConfirm(operator);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {pagedOperators.length === 0 && (
                <EmptyStateRow
                  colSpan={7}
                  message={hasFilters ? 'No operators match the current filters.' : 'No boat operators found.'}
                />
              )}
            </TableBody>
          </Table>

          {filteredOperators.length > 0 && (
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
        </CardContent>
      </Card>
    </Layout>
  );
}
