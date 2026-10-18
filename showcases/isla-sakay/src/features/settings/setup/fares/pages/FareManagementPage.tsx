import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useSettingsStore } from '@/stores';
import type { Fare } from '@/stores/SettingsStore';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, ArrowDownAZ, ArrowUpAZ, ClipboardCheck, Filter, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { pushBellNotification } from '@/lib/notification-helpers';
import { EmptyStateRow } from '@/components/ui/empty-state-row';
import { cn } from '@/lib/utils';
import '@/styles/animations.css';

type FareFormType = 'commuter' | 'cargo';
type FareFormStep = 1 | 2 | 3;
type FareSortKey = 'fareName' | 'type' | 'route' | 'distanceKm' | 'price' | 'status';

const ROUTE_SEPARATOR = ' -> ';
const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ');

const splitRoute = (route: string): { from: string; to: string } => {
  const [from = '', to = ''] = route.split(ROUTE_SEPARATOR).map((value) => value.trim());
  return { from, to };
};

const formatFareAmount = (amount: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);

const FareManagementPage = observer(() => {
  const settingsStore = useSettingsStore();
  const [query, setQuery] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStatusChanging, setIsStatusChanging] = useState(false);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<Fare | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Fare | null>(null);
  const [editingFare, setEditingFare] = useState<Fare | null>(null);
  const [formStep, setFormStep] = useState<FareFormStep>(1);
  const [formType, setFormType] = useState<FareFormType>('commuter');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<FareSortKey>('fareName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState({
    fareName: '',
    fromBarangay: '',
    toBarangay: '',
    distanceKm: '',
    baseFare: '',
    percentagePerKilometer: '',
    rentalFare: '',
    weightLimitKg: '',
  });
  const [formSnapshot, setFormSnapshot] = useState('');
  const isFormDirty = isModalOpen && (JSON.stringify(formData) !== formSnapshot || formStep !== 1);
  const { confirmDiscard, discardDialog } = useUnsavedChangesGuard(isFormDirty);

  useAutoRefresh(
    () => Promise.all([settingsStore.fetchFares(), settingsStore.fetchBarangays(), settingsStore.fetchFareScheduleUsageCounts()]).then(() => undefined),
    [settingsStore],
    { intervalMs: 7000 },
  );

  const barangayOptions = useMemo(() => {
    const values = settingsStore.barangays
      .map((barangay) => barangay.barangayName.trim())
      .filter((name) => name.length > 0);
    return Array.from(new Set(values)).sort();
  }, [settingsStore.barangays]);

  const generatedRoute = useMemo(() => {
    if (!formData.fromBarangay || !formData.toBarangay) return '';
    return `${formData.fromBarangay}${ROUTE_SEPARATOR}${formData.toBarangay}`;
  }, [formData.fromBarangay, formData.toBarangay]);
  const normalizedFareName = normalizeText(formData.fareName);
  const distanceKm = Number(formData.distanceKm);
  const baseFare = Number(formData.baseFare);
  const percentagePerKilometer = Number(formData.percentagePerKilometer);
  const rentalFare = Number(formData.rentalFare);
  const weightLimitKg = Number(formData.weightLimitKg);
  const duplicateFare = useMemo(
    () =>
      settingsStore.fares.find(
        (fare) => fare.id !== editingFare?.id && fare.fareName.trim().toLowerCase() === normalizedFareName.toLowerCase(),
      ) ?? null,
    [editingFare?.id, normalizedFareName, settingsStore.fares],
  );
  const fareFieldErrors = {
    fareName: !normalizedFareName
      ? 'Fare name is required.'
      : duplicateFare
        ? 'Fare name already exists.'
        : null,
    route:
      !formData.fromBarangay || !formData.toBarangay
        ? 'Select both origin and destination barangays.'
        : formData.fromBarangay === formData.toBarangay
          ? 'From and To barangay must be different.'
          : null,
    distanceKm:
      formStep >= 2 && (!Number.isFinite(distanceKm) || distanceKm <= 0)
        ? 'Distance must be greater than 0.'
        : null,
    baseFare:
      formStep === 3 && formType === 'commuter' && (!Number.isFinite(baseFare) || baseFare < 0)
        ? 'Base fare must be zero or greater.'
        : null,
    percentagePerKilometer:
      formStep === 3 && formType === 'commuter' && (!Number.isFinite(percentagePerKilometer) || percentagePerKilometer < 0)
        ? 'Percentage per kilometer must be zero or greater.'
        : null,
    rentalFare:
      formStep === 3 && formType === 'cargo' && (!Number.isFinite(rentalFare) || rentalFare < 0)
        ? 'Rental fare must be zero or greater.'
        : null,
    weightLimitKg:
      formStep === 3 && formType === 'cargo' && (!Number.isFinite(weightLimitKg) || weightLimitKg <= 0)
        ? 'Weight limit must be greater than 0.'
        : null,
  };

  const filteredFares = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return settingsStore.fares.filter((fare) => {
      const matchesQuery = !trimmed || [fare.fareName, fare.route, fare.type].join(' ').toLowerCase().includes(trimmed);
      if (!matchesQuery) return false;

      if (statusFilter === 'active') return fare.isActive;
      if (statusFilter === 'inactive') return !fare.isActive;
      return true;
    });
  }, [query, settingsStore.fares, statusFilter]);

  const sortedFares = useMemo(() => {
    const rows = [...filteredFares];
    rows.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'distanceKm') return (a.distanceKm - b.distanceKm) * direction;
      if (sortBy === 'price') {
        const priceA = a.type === 'commuter' ? (a.baseFare || 0) : (a.rentalFare || 0);
        const priceB = b.type === 'commuter' ? (b.baseFare || 0) : (b.rentalFare || 0);
        return (priceA - priceB) * direction;
      }
      return String(a[sortBy as keyof Fare] || '').localeCompare(String(b[sortBy as keyof Fare] || ''), 'en', { sensitivity: 'base' }) * direction;
    });
    return rows;
  }, [filteredFares, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedFares.length / pageSize));
  const pagedFares = sortedFares.slice((page - 1) * pageSize, page * pageSize);
  const activeFareCount = useMemo(() => filteredFares.filter((fare) => fare.isActive).length, [filteredFares]);
  const inactiveFareCount = useMemo(() => filteredFares.filter((fare) => !fare.isActive).length, [filteredFares]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize, sortBy, sortDirection]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const toggleSort = (key: FareSortKey) => {
    if (sortBy === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(key);
    setSortDirection('asc');
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  const resetForm = () => {
    setFormData({
      fareName: '',
      fromBarangay: '',
      toBarangay: '',
      distanceKm: '',
      baseFare: '',
      percentagePerKilometer: '',
      rentalFare: '',
      weightLimitKg: '',
    });
    setFormType('commuter');
    setEditingFare(null);
    setFormError(null);
    setShowErrors(false);
    setFormStep(1);
  };

  const openAddModal = () => {
    resetForm();
    setFormSnapshot(JSON.stringify({
      fareName: '',
      fromBarangay: '',
      toBarangay: '',
      distanceKm: '',
      baseFare: '',
      percentagePerKilometer: '',
      rentalFare: '',
      weightLimitKg: '',
    }));
    setShowErrors(false);
    setIsModalOpen(true);
  };

  const openEditModal = (fare: Fare) => {
    const parsedRoute = splitRoute(fare.route);
    setEditingFare(fare);
    setFormType(fare.type);
    setFormData({
      fareName: fare.fareName,
      fromBarangay: parsedRoute.from,
      toBarangay: parsedRoute.to,
      distanceKm: String(fare.distanceKm),
      baseFare: fare.type === 'commuter' ? String(fare.baseFare) : '',
      percentagePerKilometer: fare.type === 'commuter' ? String(fare.percentagePerKilometer) : '',
      rentalFare: fare.type === 'cargo' ? String(fare.rentalFare) : '',
      weightLimitKg: fare.type === 'cargo' ? String(fare.weightLimitKg) : '',
    });
    setFormSnapshot(JSON.stringify({
      fareName: fare.fareName,
      fromBarangay: parsedRoute.from,
      toBarangay: parsedRoute.to,
      distanceKm: String(fare.distanceKm),
      baseFare: fare.type === 'commuter' ? String(fare.baseFare) : '',
      percentagePerKilometer: fare.type === 'commuter' ? String(fare.percentagePerKilometer) : '',
      rentalFare: fare.type === 'cargo' ? String(fare.rentalFare) : '',
      weightLimitKg: fare.type === 'cargo' ? String(fare.weightLimitKg) : '',
    }));
    setShowErrors(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    setShowErrors(true);
    setFormError(null);
    if (fareFieldErrors.fareName) {
      setFormError(fareFieldErrors.fareName);
      triggerShake();
      return;
    }
    if (fareFieldErrors.route) {
      setFormError(fareFieldErrors.route);
      triggerShake();
      return;
    }
    if (fareFieldErrors.distanceKm) {
      setFormError(fareFieldErrors.distanceKm);
      triggerShake();
      return;
    }

    if (formType === 'commuter') {
      if (fareFieldErrors.baseFare || fareFieldErrors.percentagePerKilometer) {
        triggerShake();
        return;
      }

      const payload = {
        fareName: normalizedFareName,
        route: generatedRoute,
        origin: formData.fromBarangay,
        destination: formData.toBarangay,
        distanceKm,
        type: 'commuter' as const,
        baseFare,
        percentagePerKilometer,
        rentalFare: null,
        weightLimitKg: null,
      };

      setIsSubmitting(true);
      try {
        if (editingFare) {
          try {
            await settingsStore.updateFare(editingFare.id, payload);
            pushBellNotification({
              title: 'Fare updated',
              message: `${payload.fareName} has been updated successfully.`,
              type: 'system',
            });
          } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Failed to update fare.');
            return;
          }
        } else {
          try {
            await settingsStore.addFare(payload);
            pushBellNotification({
              title: 'Fare added',
              message: `${payload.fareName} has been added to the fare list.`,
              type: 'system',
            });
          } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Failed to add fare.');
            return;
          }
        }
        setIsModalOpen(false);
        resetForm();
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (fareFieldErrors.rentalFare || fareFieldErrors.weightLimitKg) {
        triggerShake();
        return;
      }

      const payload = {
        fareName: normalizedFareName,
        route: generatedRoute,
        origin: formData.fromBarangay,
        destination: formData.toBarangay,
        distanceKm,
        type: 'cargo' as const,
        rentalFare,
        weightLimitKg,
        baseFare: null,
        percentagePerKilometer: null,
      };

      setIsSubmitting(true);
      try {
        if (editingFare) {
          try {
            await settingsStore.updateFare(editingFare.id, payload);
            pushBellNotification({
              title: 'Fare updated',
              message: `${payload.fareName} has been updated successfully.`,
              type: 'system',
            });
          } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Failed to update fare.');
            return;
          }
        } else {
          try {
            await settingsStore.addFare(payload);
            pushBellNotification({
              title: 'Fare added',
              message: `${payload.fareName} has been added to the fare list.`,
              type: 'system',
            });
          } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Failed to add fare.');
            return;
          }
        }
        setIsModalOpen(false);
        resetForm();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const requestCloseModal = async () => {
    if (!(await confirmDiscard())) return;
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const result = await settingsStore.deleteFare(deleteTarget.id);
      if (!result.success) {
        setDeleteError(result.message || 'Failed to delete fare.');
        return;
      }
      pushBellNotification({
        title: 'Fare deleted',
        message: `${deleteTarget.fareName} has been removed.`,
        type: 'system',
      });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async () => {
    if (!statusConfirmTarget) return;
    setIsStatusChanging(true);
    try {
      await settingsStore.toggleFareStatus(statusConfirmTarget.id);
      pushBellNotification({
        title: 'Status Updated',
        message: `Fare "${statusConfirmTarget.fareName}" is now ${!statusConfirmTarget.isActive ? 'Active' : 'Inactive'}.`,
        type: 'system',
      });
      setStatusConfirmTarget(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsStatusChanging(false);
    }
  };

  const validateStep1 = () => {
    setShowErrors(true);
    if (fareFieldErrors.fareName) {
      setFormError(fareFieldErrors.fareName);
      triggerShake();
      return false;
    }
    setFormError(null);
    return true;
  };

  const validateStep2 = () => {
    setShowErrors(true);
    if (fareFieldErrors.route || fareFieldErrors.distanceKm) {
      setFormError(fareFieldErrors.route ?? fareFieldErrors.distanceKm);
      triggerShake();
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleNextStep = () => {
    if (formStep === 1 && !validateStep1()) return;
    if (formStep === 2 && !validateStep2()) return;
    setFormStep((prev) => (prev === 1 ? 2 : 3));
  };

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
          <div className="space-y-2.5">
            <span className="inline-flex w-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              Fare Desk
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Fare Management</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                Route and pricing rules
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">Total</p>
              <p className="mt-1 text-xl font-semibold text-sky-900 dark:text-sky-50">{filteredFares.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/90 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">Active</p>
              <p className="mt-1 text-xl font-semibold text-emerald-900 dark:text-emerald-50">{activeFareCount}</p>
            </div>
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/90 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">Inactive</p>
              <p className="mt-1 text-xl font-semibold text-amber-900 dark:text-amber-50">{inactiveFareCount}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="mb-4 border-slate-200/70 bg-white/92 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Fare Table</CardTitle>
            <CardDescription>{filteredFares.length} fare records</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
              <Button className="h-10 gap-2 rounded-xl" variant="outline" onClick={() => window.location.hash = '/payment-verification'}>
                <ClipboardCheck className="h-4 w-4" />
                Go To Verification
              </Button>
              <Button className="h-10 gap-2 rounded-xl" onClick={openAddModal}>
                <Plus className="h-4 w-4" />
                Add Fare
              </Button>
              <div className="relative w-full md:w-80">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search fare, route, type..."
                className="h-10 rounded-xl pl-9"
              />
              </div>
              <Select value={statusFilter} onValueChange={(val: 'all' | 'active' | 'inactive') => setStatusFilter(val)}>
                <SelectTrigger className="h-10 w-[140px] rounded-xl">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="h-10 w-[110px] rounded-xl">
                  <SelectValue placeholder="Rows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 rows</SelectItem>
                  <SelectItem value="25">25 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
      </Card>

      <Card className="border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('fareName')}>
                    Fare Name {sortBy === 'fareName' && (sortDirection === 'asc' ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />)}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('type')}>
                    Type {sortBy === 'type' && (sortDirection === 'asc' ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />)}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('route')}>
                    Route {sortBy === 'route' && (sortDirection === 'asc' ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />)}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('distanceKm')}>
                    Distance {sortBy === 'distanceKm' && (sortDirection === 'asc' ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />)}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('price')}>
                    Pricing {sortBy === 'price' && (sortDirection === 'asc' ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />)}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Status</TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Usage</TableHead>
                <TableHead className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedFares.map((fare) => {
                const relatedScheduleCount = settingsStore.fareScheduleUsageCounts[fare.id] ?? 0;
                const isInUse = relatedScheduleCount > 0;

                return (
                  <TableRow key={fare.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TableCell className="px-4 py-3 font-medium">{fare.fareName}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="outline">{fare.type}</Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">{fare.route}</TableCell>
                    <TableCell className="px-4 py-3">{fare.distanceKm} km</TableCell>
                    <TableCell className="px-4 py-3">
                      {fare.type === 'commuter'
                        ? formatFareAmount(
                            (fare.baseFare ?? 0) +
                              (fare.baseFare ?? 0) *
                                ((fare.percentagePerKilometer ?? 0) / 100) *
                                Math.max(fare.distanceKm - 1, 0),
                          )
                        : formatFareAmount(fare.rentalFare ?? 0)}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Button
                        variant={fare.isActive ? 'outline' : 'secondary'}
                        size="sm"
                        onClick={() => setStatusConfirmTarget(fare)}
                      >
                        {fare.isActive ? 'Active' : 'Inactive'}
                      </Button>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {relatedScheduleCount > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700">
                              {relatedScheduleCount} Schedules
                            </Badge>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3">
                            <p className="mb-2 text-xs font-semibold text-slate-500">Used in Schedules</p>
                            <p className="text-xs text-slate-500">
                              {relatedScheduleCount} schedules currently use this fare.
                            </p>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(fare)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isInUse}
                          title={isInUse ? 'Cannot delete: Currently in use' : 'Delete Fare'}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(fare);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {pagedFares.length === 0 && (
                <EmptyStateRow colSpan={8} message="No fare records found." />
              )}
            </TableBody>
          </Table>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsModalOpen(true);
            return;
          }
          void requestCloseModal();
        }}
      >
        <DialogContent className={cn("max-h-[90vh] overflow-hidden border-slate-200 bg-white p-0 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:max-w-[760px]", isShaking && "animate-shake")}>
          <DialogHeader className="border-b border-slate-100 px-6 pb-5 pt-6 dark:border-white/10">
            <DialogTitle className="text-slate-900 dark:text-white">{editingFare ? 'Edit Fare' : 'Add Fare'}</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">Set route and pricing rules for commuter or cargo fares.</DialogDescription>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Badge className={formStep === 1 ? 'bg-sky-500 text-slate-950' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-200'}>Step 1: Basics</Badge>
              <Badge className={formStep === 2 ? 'bg-sky-500 text-slate-950' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-200'}>Step 2: Route</Badge>
              <Badge className={formStep === 3 ? 'bg-sky-500 text-slate-950' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-200'}>Step 3: Pricing</Badge>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(90vh-170px)] space-y-4 overflow-y-auto px-6 py-5" style={{ scrollbarGutter: 'stable' }}>
            {formStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fareType" className="text-slate-700 dark:text-slate-200">Type <span className="text-red-500">*</span></Label>
                  <Select value={formType} onValueChange={(value) => setFormType(value as FareFormType)}>
                    <SelectTrigger id="fareType" className={cn("border-slate-200 bg-white text-slate-900 dark:border-white/15 dark:bg-slate-950/50 dark:text-white")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commuter">Commuter</SelectItem>
                      <SelectItem value="cargo">Cargo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fareName" className="text-slate-700 dark:text-slate-200">Fare Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="fareName"
                    value={formData.fareName}
                    onChange={(event) => setFormData((prev) => ({ ...prev, fareName: event.target.value }))}
                    title={showErrors && fareFieldErrors.fareName ? fareFieldErrors.fareName : undefined}
                    placeholder="e.g. Morning Route A"
                    className={cn("border-slate-200 bg-white text-slate-900 dark:border-white/15 dark:bg-slate-950/50 dark:text-white", showErrors && fareFieldErrors.fareName && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {showErrors && fareFieldErrors.fareName && (
                    <p className="text-xs text-rose-400">{fareFieldErrors.fareName}</p>
                  )}
                </div>
              </div>
            )}

            {formStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-200">From Barangay <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.fromBarangay}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, fromBarangay: value }))}
                      disabled={barangayOptions.length === 0}
                    >
                      <SelectTrigger className={cn("border-slate-200 bg-white text-slate-900 dark:border-white/15 dark:bg-slate-950/50 dark:text-white", showErrors && fareFieldErrors.route && "border-red-500 focus:ring-red-500")}>
                        <SelectValue placeholder={barangayOptions.length === 0 ? 'No clusters available' : 'Select source'} />
                      </SelectTrigger>
                      <SelectContent>
                        {barangayOptions.map((barangay) => (
                          <SelectItem
                            key={`from-${barangay}`}
                            value={barangay}
                            disabled={formData.toBarangay === barangay}
                          >
                            {barangay}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-200">To Barangay <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.toBarangay}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, toBarangay: value }))}
                      disabled={barangayOptions.length === 0}
                    >
                      <SelectTrigger className={cn("border-slate-200 bg-white text-slate-900 dark:border-white/15 dark:bg-slate-950/50 dark:text-white", showErrors && fareFieldErrors.route && "border-red-500 focus:ring-red-500")}>
                        <SelectValue placeholder={barangayOptions.length === 0 ? 'No clusters available' : 'Select destination'} />
                      </SelectTrigger>
                      <SelectContent>
                        {barangayOptions.map((barangay) => (
                          <SelectItem
                            key={`to-${barangay}`}
                            value={barangay}
                            disabled={formData.fromBarangay === barangay}
                          >
                            {barangay}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {barangayOptions.length === 0 && (
                  <p className="text-xs text-amber-300">No cluster records found. Add them first in Barangay Management.</p>
                )}
                {showErrors && fareFieldErrors.route && (
                  <p className="text-xs text-rose-400">{fareFieldErrors.route}</p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="generatedRoute" className="text-slate-700 dark:text-slate-200">Route</Label>
                  <Input id="generatedRoute" value={generatedRoute} readOnly placeholder="Select From and To barangay" className="border-slate-200 bg-white text-slate-900 dark:border-white/15 dark:bg-slate-950/50 dark:text-white" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="distanceKm" className="text-slate-700 dark:text-slate-200">Distance (km) <span className="text-red-500">*</span></Label>
                  <Input
                    id="distanceKm"
                    type="number"
                    min={1}
                    value={formData.distanceKm}
                    onChange={(event) => setFormData((prev) => ({ ...prev, distanceKm: event.target.value }))}
                    title={showErrors && fareFieldErrors.distanceKm ? fareFieldErrors.distanceKm : undefined}
                    placeholder="e.g. 1"
                    className={cn("border-slate-200 bg-white text-slate-900 dark:border-white/15 dark:bg-slate-950/50 dark:text-white", showErrors && fareFieldErrors.distanceKm && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {showErrors && fareFieldErrors.distanceKm && (
                    <p className="text-xs text-rose-400">{fareFieldErrors.distanceKm}</p>
                  )}
                </div>
              </div>
            )}

            {formStep === 3 && (
              <div className="space-y-4">
                {formType === 'commuter' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="baseFare" className="text-slate-700 dark:text-slate-200">Base Fare <span className="text-red-500">*</span></Label>
                      <Input
                        id="baseFare"
                        type="number"
                        min={0}
                        value={formData.baseFare}
                        onChange={(event) => setFormData((prev) => ({ ...prev, baseFare: event.target.value }))}
                        title={showErrors && fareFieldErrors.baseFare ? fareFieldErrors.baseFare : undefined}
                        placeholder="e.g. 30"
                        className={cn("border-slate-200 bg-white text-slate-900 dark:border-white/15 dark:bg-slate-950/50 dark:text-white", showErrors && fareFieldErrors.baseFare && "border-red-500 focus-visible:ring-red-500")}
                      />
                      {showErrors && fareFieldErrors.baseFare && (
                        <p className="text-xs text-rose-400">{fareFieldErrors.baseFare}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="percentagePerKilometer" className="text-slate-700 dark:text-slate-200">Percentage per Kilometer <span className="text-red-500">*</span></Label>
                      <Input
                        id="percentagePerKilometer"
                        type="number"
                        min={0}
                        value={formData.percentagePerKilometer}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, percentagePerKilometer: event.target.value }))
                        }
                        title={showErrors && fareFieldErrors.percentagePerKilometer ? fareFieldErrors.percentagePerKilometer : undefined}
                        placeholder="e.g. 10"
                        className={cn("border-slate-200 bg-white text-slate-900 dark:border-white/15 dark:bg-slate-950/50 dark:text-white", showErrors && fareFieldErrors.percentagePerKilometer && "border-red-500 focus-visible:ring-red-500")}
                      />
                      {showErrors && fareFieldErrors.percentagePerKilometer && (
                        <p className="text-xs text-rose-400">{fareFieldErrors.percentagePerKilometer}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="rentalFare" className="text-slate-700 dark:text-slate-200">Rental Fare <span className="text-red-500">*</span></Label>
                      <Input
                        id="rentalFare"
                        type="number"
                        min={0}
                        value={formData.rentalFare}
                        onChange={(event) => setFormData((prev) => ({ ...prev, rentalFare: event.target.value }))}
                        title={showErrors && fareFieldErrors.rentalFare ? fareFieldErrors.rentalFare : undefined}
                        placeholder="e.g. 500"
                        className={cn("border-slate-200 bg-white text-slate-900 dark:border-white/15 dark:bg-slate-950/50 dark:text-white", showErrors && fareFieldErrors.rentalFare && "border-red-500 focus-visible:ring-red-500")}
                      />
                      {showErrors && fareFieldErrors.rentalFare && (
                        <p className="text-xs text-rose-400">{fareFieldErrors.rentalFare}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weightLimitKg" className="text-slate-700 dark:text-slate-200">Weight Limit (kg) <span className="text-red-500">*</span></Label>
                      <Input
                        id="weightLimitKg"
                        type="number"
                        min={1}
                        value={formData.weightLimitKg}
                        onChange={(event) => setFormData((prev) => ({ ...prev, weightLimitKg: event.target.value }))}
                        title={showErrors && fareFieldErrors.weightLimitKg ? fareFieldErrors.weightLimitKg : undefined}
                        placeholder="e.g. 300"
                        className={cn("border-slate-200 bg-white text-slate-900 dark:border-white/15 dark:bg-slate-950/50 dark:text-white", showErrors && fareFieldErrors.weightLimitKg && "border-red-500 focus-visible:ring-red-500")}
                      />
                      {showErrors && fareFieldErrors.weightLimitKg && (
                        <p className="text-xs text-rose-400">{fareFieldErrors.weightLimitKg}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {formError && <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{formError}</p>}
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-slate-100 bg-white/80 px-6 py-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
            <Button variant="outline" onClick={() => void requestCloseModal()} className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
              Cancel
            </Button>
            {formStep > 1 && (
              <Button variant="outline" onClick={() => { setFormError(null); setFormStep((prev) => (prev === 3 ? 2 : 1)); }} className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                Back
              </Button>
            )}
            {formStep < 3 ? (
              <Button onClick={handleNextStep} className="bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400">
                {formStep === 1 ? 'Next: Route' : 'Next: Pricing'}
              </Button>
            ) : (
              <Button onClick={() => void handleSave()} disabled={isSubmitting} className="bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingFare ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingFare ? 'Update Fare' : 'Add Fare'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {discardDialog}

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Delete Fare</DialogTitle>
            <DialogDescription>
              This will remove the fare rule for <strong>{deleteTarget?.fareName || 'this route'}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm text-slate-600">
            <p><strong>Route:</strong> {deleteTarget?.route || '-'}</p>
            <p><strong>Type:</strong> {deleteTarget?.type || '-'}</p>
            {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Fare'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(statusConfirmTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusConfirmTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{statusConfirmTarget?.isActive ? 'Deactivate Fare' : 'Activate Fare'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to {statusConfirmTarget?.isActive ? 'deactivate' : 'activate'} <strong>{statusConfirmTarget?.fareName}</strong>?
            </DialogDescription>
          </DialogHeader>

          {statusConfirmTarget?.isActive && (() => {
            const relatedScheduleCount = settingsStore.fareScheduleUsageCounts[statusConfirmTarget.id] ?? 0;
            if (relatedScheduleCount > 0) {
              return (
                <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold">Warning: In Use</p>
                      <p className="mt-1">
                        This fare is currently assigned to {relatedScheduleCount} schedule{relatedScheduleCount !== 1 ? 's' : ''}.
                        Deactivating it may prevent future bookings on those schedules.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusConfirmTarget(null)} disabled={isStatusChanging}>
              Cancel
            </Button>
            <Button onClick={() => void handleStatusChange()} disabled={isStatusChanging} variant={statusConfirmTarget?.isActive ? 'destructive' : 'default'}>
              {isStatusChanging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {statusConfirmTarget?.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
});

export default FareManagementPage;
