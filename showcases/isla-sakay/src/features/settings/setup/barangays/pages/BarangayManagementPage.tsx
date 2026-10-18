import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useSettingsStore } from '@/stores';
import type { Barangay, Fare } from '@/stores/SettingsStore';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ArrowDownAZ, ArrowUpAZ, ClipboardCheck, Filter, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { pushBellNotification } from '@/lib/notification-helpers';
import { formatDateTime } from '@/lib/date-utils';
import { EmptyStateRow } from '@/components/ui/empty-state-row';
import { cn } from '@/lib/utils';
import '@/styles/animations.css';

type BarangayFormStep = 1 | 2;
type BarangaySortKey = 'barangayName' | 'zone' | 'population' | 'updatedAt';

const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ');

const BarangayManagementPage = observer(() => {
  const settingsStore = useSettingsStore();
  const [query, setQuery] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterInUse, setFilterInUse] = useState(false);
  const [formStep, setFormStep] = useState<BarangayFormStep>(1);
  const [editingBarangay, setEditingBarangay] = useState<Barangay | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Barangay | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    barangayName: '',
    zone: '',
    population: '',
    notes: '',
  });
  const [formSnapshot, setFormSnapshot] = useState('');
  const [sortBy, setSortBy] = useState<BarangaySortKey>('barangayName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const isFormDirty = isModalOpen && (JSON.stringify(formData) !== formSnapshot || formStep !== 1);
  const { confirmDiscard, discardDialog } = useUnsavedChangesGuard(isFormDirty);

  useAutoRefresh(
    () => Promise.all([settingsStore.fetchBarangays(), settingsStore.fetchFares(), settingsStore.fetchBarangayScheduleUsageCounts()]).then(() => undefined),
    [settingsStore],
    { intervalMs: 7000 },
  );

  const usageMap = useMemo(() => {
    const map = new Map<string, { fares: Fare[]; scheduleCount: number }>();
    settingsStore.barangays.forEach((b) => {
      const fares = settingsStore.fares.filter((f) => f.origin === b.barangayName || f.destination === b.barangayName);
      const scheduleCount = settingsStore.barangayScheduleUsageCounts[b.barangayName] ?? 0;
      map.set(b.id, { fares, scheduleCount });
    });
    return map;
  }, [settingsStore.barangays, settingsStore.barangayScheduleUsageCounts, settingsStore.fares]);

  const filteredBarangays = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return settingsStore.barangays.filter((barangay) => {
      const matchesQuery = !trimmed || [barangay.barangayName, barangay.zone, barangay.notes ?? ''].join(' ').toLowerCase().includes(trimmed);
      if (!matchesQuery) return false;

      if (filterInUse) {
        const usage = usageMap.get(barangay.id);
        return usage && (usage.fares.length > 0 || usage.scheduleCount > 0);
      }
      return true;
    });
  }, [query, settingsStore.barangays, filterInUse, usageMap]);

  const sortedBarangays = useMemo(() => {
    const rows = [...filteredBarangays];
    rows.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'population') return (a.population - b.population) * direction;
      if (sortBy === 'updatedAt') {
        const aTime = new Date(a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt).getTime();
        return (aTime - bTime) * direction;
      }
      return String(a[sortBy]).localeCompare(String(b[sortBy]), 'en', { sensitivity: 'base' }) * direction;
    });
    return rows;
  }, [filteredBarangays, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedBarangays.length / pageSize));
  const pagedBarangays = sortedBarangays.slice((page - 1) * pageSize, page * pageSize);
  const inUseCount = useMemo(
    () => sortedBarangays.filter((barangay) => {
      const usage = usageMap.get(barangay.id);
      return Boolean(usage && (usage.fares.length > 0 || usage.scheduleCount > 0));
    }).length,
    [sortedBarangays, usageMap],
  );
  const normalizedBarangayName = normalizeText(formData.barangayName);
  const normalizedZone = normalizeText(formData.zone);
  const population = Number(formData.population);
  const duplicateBarangay = useMemo(
    () =>
      settingsStore.barangays.find(
        (barangay) =>
          barangay.id !== editingBarangay?.id
          && barangay.barangayName.trim().toLowerCase() === normalizedBarangayName.toLowerCase(),
      ) ?? null,
    [editingBarangay?.id, normalizedBarangayName, settingsStore.barangays],
  );
  const barangayFieldErrors = {
    barangayName: !normalizedBarangayName
      ? 'Barangay name is required.'
      : duplicateBarangay
        ? 'Barangay name already exists.'
        : null,
    zone: !normalizedZone ? 'Zone is required.' : null,
    population:
      formStep === 2 && (!Number.isFinite(population) || population < 0)
        ? 'Population must be zero or greater.'
        : null,
  };

  useEffect(() => {
    setPage(1);
  }, [query, sortBy, sortDirection, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const toggleSort = (key: BarangaySortKey) => {
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
      barangayName: '',
      zone: '',
      population: '',
      notes: '',
    });
    setShowErrors(false);
    setFormError(null);
    setEditingBarangay(null);
    setFormStep(1);
  };

  const openAddModal = () => {
    resetForm();
    setFormSnapshot(JSON.stringify({
      barangayName: '',
      zone: '',
      population: '',
      notes: '',
    }));
    setShowErrors(false);
    setIsModalOpen(true);
  };

  const openEditModal = (barangay: Barangay) => {
    setFormError(null);
    setShowErrors(false);
    setEditingBarangay(barangay);
    setFormData({
      barangayName: barangay.barangayName,
      zone: barangay.zone,
      population: String(barangay.population),
      notes: barangay.notes ?? '',
    });
    setFormSnapshot(JSON.stringify({
      barangayName: barangay.barangayName,
      zone: barangay.zone,
      population: String(barangay.population),
      notes: barangay.notes ?? '',
    }));
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    setShowErrors(true);
    setFormError(null);
    if (barangayFieldErrors.barangayName || barangayFieldErrors.zone) {
      triggerShake();
      return;
    }
    if (barangayFieldErrors.population) {
      triggerShake();
      return;
    }

    const payload = {
      barangayName: normalizedBarangayName,
      zone: normalizedZone,
      population,
      notes: normalizeText(formData.notes),
    };

    setIsSubmitting(true);
    try {
      if (editingBarangay) {
        try {
          await settingsStore.updateBarangay(editingBarangay.id, payload);
          pushBellNotification({
            title: 'Barangay updated',
            message: `${payload.barangayName} has been updated successfully.`,
            type: 'system',
          });
        } catch (error) {
          setFormError(error instanceof Error ? error.message : 'Failed to update barangay.');
          return;
        }
      } else {
        try {
          await settingsStore.addBarangay(payload);
          pushBellNotification({
            title: 'Barangay added',
            message: `${payload.barangayName} has been added to the cluster list.`,
            type: 'system',
          });
        } catch (error) {
          setFormError(error instanceof Error ? error.message : 'Failed to add barangay.');
          return;
        }
      }
      setIsModalOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const result = await settingsStore.deleteBarangay(deleteTarget.id);
      if (!result.success) {
        setDeleteError(result.message || 'Failed to delete barangay.');
        return;
      }
      pushBellNotification({
        title: 'Barangay deleted',
        message: `${deleteTarget.barangayName} has been removed.`,
        type: 'system',
      });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const requestCloseModal = async () => {
    if (!(await confirmDiscard())) return;
    setIsModalOpen(false);
    resetForm();
  };

  const validateStep1 = () => {
    setShowErrors(true);
    if (barangayFieldErrors.barangayName || barangayFieldErrors.zone) {
      if (duplicateBarangay) {
        setFormError('Use a different barangay name before continuing.');
      }
      triggerShake();
      return false;
    }
    setFormError(null);
    return true;
  };

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
          <div className="space-y-2.5">
            <span className="inline-flex w-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              Barangay Desk
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Barangay Management</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                Cluster and route origin registry
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">Total</p>
              <p className="mt-1 text-xl font-semibold text-sky-900 dark:text-sky-50">{sortedBarangays.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/90 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">In Use</p>
              <p className="mt-1 text-xl font-semibold text-emerald-900 dark:text-emerald-50">{inUseCount}</p>
            </div>
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/90 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">Unused</p>
              <p className="mt-1 text-xl font-semibold text-amber-900 dark:text-amber-50">{Math.max(sortedBarangays.length - inUseCount, 0)}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="mb-4 border-slate-200/70 bg-white/92 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Barangay Table</CardTitle>
            <CardDescription>{sortedBarangays.length} barangay records</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <Button className="h-10 gap-2 rounded-xl" variant="outline" onClick={() => window.location.hash = '/payment-verification'}>
              <ClipboardCheck className="h-4 w-4" />
              Go To Verification
            </Button>
            <Button className="h-10 gap-2 rounded-xl" onClick={openAddModal}>
              <Plus className="h-4 w-4" />
              Add Barangay
            </Button>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search barangay, zone, notes..."
                className="h-10 rounded-xl pl-9"
              />
            </div>
            <Button
              variant={filterInUse ? 'secondary' : 'outline'}
              className="h-10 w-10 rounded-xl"
              onClick={() => setFilterInUse(!filterInUse)}
              title={filterInUse ? 'Showing in-use only' : 'Filter by usage'}
            >
              <Filter className={`h-4 w-4 ${filterInUse ? 'text-sky-500' : 'text-gray-500'}`} />
            </Button>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('barangayName')}>
                    Barangay Name {sortBy === 'barangayName' && (sortDirection === 'asc' ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />)}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('zone')}>
                    Zone {sortBy === 'zone' && (sortDirection === 'asc' ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />)}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('population')}>
                    Population {sortBy === 'population' && (sortDirection === 'asc' ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />)}
                  </button>
                </TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Notes</TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('updatedAt')}>
                    Updated {sortBy === 'updatedAt' && (sortDirection === 'asc' ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />)}
                  </button>
                </TableHead>
                <TableHead className="w-[100px] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Usage</TableHead>
                <TableHead className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedBarangays.map((barangay) => {
                const { fares: relatedFares, scheduleCount } = usageMap.get(barangay.id) || { fares: [], scheduleCount: 0 };
                const isInUse = relatedFares.length > 0 || scheduleCount > 0;
                return (
                  <TableRow key={barangay.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TableCell className="px-4 py-3 font-medium">{barangay.barangayName}</TableCell>
                    <TableCell className="px-4 py-3">{barangay.zone}</TableCell>
                    <TableCell className="px-4 py-3">{barangay.population.toLocaleString()}</TableCell>
                    <TableCell className="px-4 py-3">{barangay.notes || 'N/A'}</TableCell>
                    <TableCell className="px-4 py-3">
                      {formatDateTime(barangay.updatedAt || barangay.createdAt)}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {relatedFares.length > 0 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Badge variant="secondary" className="w-fit cursor-pointer text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700">
                                {relatedFares.length} Routes
                              </Badge>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3">
                              <p className="mb-2 text-xs font-semibold text-slate-500">Used in Routes</p>
                              <ul className="max-h-[200px] overflow-y-auto text-xs space-y-1">
                                {relatedFares.map((f) => (
                                  <li key={f.id} className="truncate">- {f.fareName}</li>
                                ))}
                              </ul>
                            </PopoverContent>
                          </Popover>
                        )}
                        {scheduleCount > 0 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Badge variant="secondary" className="w-fit cursor-pointer text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700">
                                {scheduleCount} Schedules
                              </Badge>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3">
                              <p className="mb-2 text-xs font-semibold text-slate-500">Used in Schedules</p>
                              <div className="text-xs text-slate-600 dark:text-slate-300">
                                Total schedules: {scheduleCount}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                        {!isInUse && <span className="text-xs text-slate-400">-</span>}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(barangay)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isInUse}
                          title={isInUse ? 'Cannot delete: Currently in use' : 'Delete Barangay'}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(barangay);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {pagedBarangays.length === 0 && (
                <EmptyStateRow colSpan={7} message="No barangay records found." />
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
        <DialogContent className={cn("max-h-[90vh] overflow-hidden border-slate-200 bg-white p-0 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:max-w-[680px]", isShaking && "animate-shake")}>
          <DialogHeader className="border-b border-slate-100 px-6 pb-5 pt-6 dark:border-white/10">
            <DialogTitle className="text-slate-900 dark:text-white">{editingBarangay ? 'Edit Barangay' : 'Add Barangay'}</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">Set cluster details for routing and vessel assignment.</DialogDescription>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Badge className={formStep === 1 ? 'bg-sky-500 text-slate-950' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-200'}>Step 1: Cluster</Badge>
              <Badge className={formStep === 2 ? 'bg-sky-500 text-slate-950' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-200'}>Step 2: Details</Badge>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(90vh-170px)] space-y-4 overflow-y-auto px-6 py-5" style={{ scrollbarGutter: 'stable' }}>
            {formStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="barangayName" className="text-slate-700 dark:text-slate-200">Barangay Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="barangayName"
                    value={formData.barangayName}
                    onChange={(event) => setFormData((prev) => ({ ...prev, barangayName: event.target.value }))}
                    title={showErrors && barangayFieldErrors.barangayName ? barangayFieldErrors.barangayName : undefined}
                    placeholder="e.g. Talim..."
                    className={cn("border-slate-200 bg-white text-slate-900 dark:border-white/15 dark:bg-slate-950/50 dark:text-white", showErrors && barangayFieldErrors.barangayName && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {showErrors && barangayFieldErrors.barangayName && (
                    <p className="text-xs text-rose-400">{barangayFieldErrors.barangayName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zone" className="text-slate-700 dark:text-slate-200">Zone <span className="text-red-500">*</span></Label>
                  <Input
                    id="zone"
                    value={formData.zone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, zone: event.target.value }))}
                    title={showErrors && barangayFieldErrors.zone ? barangayFieldErrors.zone : undefined}
                    placeholder="e.g. Zone 2"
                    className={cn("border-slate-200 bg-white text-slate-900 dark:border-white/15 dark:bg-slate-950/50 dark:text-white", showErrors && barangayFieldErrors.zone && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {showErrors && barangayFieldErrors.zone && (
                    <p className="text-xs text-rose-400">{barangayFieldErrors.zone}</p>
                  )}
                </div>
              </div>
            )}

            {formStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="population" className="text-slate-700 dark:text-slate-200">Population <span className="text-red-500">*</span></Label>
                  <Input
                    id="population"
                    value={formData.population}
                    onChange={(event) => setFormData((prev) => ({ ...prev, population: event.target.value }))}
                    type="number"
                    min={0}
                    title={showErrors && barangayFieldErrors.population ? barangayFieldErrors.population : undefined}
                    placeholder="e.g. 1200"
                    className={cn("border-slate-200 bg-white text-slate-900 dark:border-white/15 dark:bg-slate-950/50 dark:text-white", showErrors && barangayFieldErrors.population && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {showErrors && barangayFieldErrors.population && (
                    <p className="text-xs text-rose-400">{barangayFieldErrors.population}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-slate-700 dark:text-slate-200">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Optional operational note"
                    className="border-slate-200 bg-white text-slate-900 dark:border-white/15 dark:bg-slate-950/50 dark:text-white"
                  />
                </div>
              </div>
            )}
            {formError && <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{formError}</p>}
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-slate-100 bg-white/80 px-6 py-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
            <Button variant="outline" onClick={() => void requestCloseModal()} className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
              Cancel
            </Button>
            {formStep === 2 && (
              <Button variant="outline" onClick={() => { setFormError(null); setFormStep(1); }} className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                Back
              </Button>
            )}
            {formStep === 1 ? (
              <Button
                onClick={() => {
                  if (!validateStep1()) return;
                  setFormStep(2);
                }}
                className="bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
              >
                Next: Details
              </Button>
            ) : (
              <Button onClick={() => void handleSave()} disabled={isSubmitting} className="bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingBarangay ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingBarangay ? 'Update Barangay' : 'Add Barangay'
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
            <DialogTitle>Delete Barangay</DialogTitle>
            <DialogDescription>
              This will remove <strong>{deleteTarget?.barangayName}</strong>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Barangay'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
});

export default BarangayManagementPage;

