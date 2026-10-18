import { useCallback, useMemo, useState } from 'react';
import axios from 'axios';
import { observer } from 'mobx-react-lite';
import Layout from '@/components/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Anchor, ChevronDown, ClipboardList, Loader2, Package2, Pencil, PlusCircle, Route as RouteIcon, Search, ShieldCheck, Trash2, UserRound, Users } from 'lucide-react';
import { getBoatOperators } from '@/api/boatOperatorService';
import type { Boat, BoatOperator } from '@/types/models';
import { useBoatStore, useSettingsStore } from '@/stores';
import type { BoatType } from '@/types';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { showErrorToast, showWarningToast } from '@/lib/toast-helpers';
import { cn } from '@/lib/utils';

type TabStatus = 'registered' | 'unregistered' | 'coding';
type BoatFormStep = 1 | 2 | 3;

type BoatRow = Boat & {
  normalizedStatus: TabStatus;
  normalizedType: 'banca' | 'cargo';
};

type RowDensity = 'comfortable' | 'compact';
type BoatQuickFilter = 'all' | 'banca' | 'cargo' | 'assigned' | 'open';

const TEMPLATE_PREFIX = {
  banca: 'B',
  cargo: 'C',
} as const;

const formatSeq = (value: number) => String(value).padStart(4, '0');

const sanitizeVesselLabel = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);

const extractTemplateSeq = (value?: string) => {
  if (!value) return 0;
  const match = value.toUpperCase().match(/(?:^|[-])(\d{4})$/);
  return match ? Number(match[1]) : 0;
};

const defaultVesselLabel = (type: 'banca' | 'cargo') => (type === 'cargo' ? 'CARGO' : 'BOAT');
const buildTemplateName = (type: 'banca' | 'cargo', label: string, seq: number) =>
  `${TEMPLATE_PREFIX[type]}-${sanitizeVesselLabel(label) || defaultVesselLabel(type)}-${formatSeq(seq)}`;
const buildTemplateRegistration = (type: 'banca' | 'cargo', label: string, seq: number) =>
  `REG-${TEMPLATE_PREFIX[type]}-${sanitizeVesselLabel(label) || defaultVesselLabel(type)}-${formatSeq(seq)}`;
const templateNamePattern = {
  banca: /^B-[A-Z]+(?:-[A-Z]+)*-\d{4}$/i,
  cargo: /^C-[A-Z]+(?:-[A-Z]+)*-\d{4}$/i,
} as const;
const templateRegistrationPattern = {
  banca: /^REG-B-[A-Z]+(?:-[A-Z]+)*-\d{4}$/i,
  cargo: /^REG-C-[A-Z]+(?:-[A-Z]+)*-\d{4}$/i,
} as const;

const extractTemplateLabel = (value: string | undefined, type: 'banca' | 'cargo') => {
  if (!value) return '';
  const pattern = type === 'cargo'
    ? /^C-([A-Z]+(?:-[A-Z]+)*)-\d{4}$/i
    : /^B-([A-Z]+(?:-[A-Z]+)*)-\d{4}$/i;
  const match = value.trim().toUpperCase().match(pattern);
  return match?.[1] ?? '';
};

const emptyForm = {
  name: '',
  codeSuffix: '',
  operatorIds: [] as string[],
  registrationNumber: '',
  type: 'banca' as 'banca' | 'cargo',
  capacity: '10',
  routeNames: [] as string[],
  status: 'registered' as TabStatus,
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);

const compactStatusLabel: Record<TabStatus, string> = {
  registered: 'Ready',
  unregistered: 'Registry Hold',
  coding: 'Coding Hold',
};

const normalizeRouteValue = (value: string) =>
  value.replace(/\s+/g, ' ').replace(/→/g, '->').trim();

const compactRouteSummary = (routes?: string[]) => {
  if (!routes || routes.length === 0) return { primary: 'No routes assigned', secondary: null };
  if (routes.length === 1) return { primary: routes[0], secondary: null };
  return {
    primary: routes[0],
    secondary: `+${routes.length - 1} more`,
  };
};

const RegistryDetailCard = ({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'slate',
}: {
  icon: typeof UserRound;
  label: string;
  value: string | number;
  detail?: string;
  tone?: 'sky' | 'emerald' | 'amber' | 'violet' | 'rose' | 'slate';
}) => {
  const toneClasses: Record<NonNullable<typeof tone>, string> = {
    sky: 'border-sky-500/20 bg-sky-500/10 text-sky-200',
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
    violet: 'border-violet-500/20 bg-violet-500/10 text-violet-200',
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
    slate: 'border-slate-700 bg-slate-900/60 text-slate-200',
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-2 break-words text-xl font-semibold text-slate-50">{value}</p>
          {detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}
        </div>
        <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-2xl border', toneClasses[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
};

const BoatManagementPage = observer(() => {
  const boatStore = useBoatStore();
  const settingsStore = useSettingsStore();
  const [tab, setTab] = useState<TabStatus>('registered');
  const [openForm, setOpenForm] = useState(false);
  const [formStep, setFormStep] = useState<BoatFormStep>(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'banca' | 'cargo'>('all');
  const [routeFilter, setRouteFilter] = useState<'all' | string>('all');
  const [rowDensity, setRowDensity] = useState<RowDensity>('compact');
  const [quickFilter, setQuickFilter] = useState<BoatQuickFilter>('all');
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [operatorPickerOpen, setOperatorPickerOpen] = useState(false);
  const [routeQuery, setRouteQuery] = useState('');
  const [operatorQuery, setOperatorQuery] = useState('');
  const [operators, setOperators] = useState<BoatOperator[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingBoat, setEditingBoat] = useState<Boat | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Boat | null>(null);
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [formSnapshot, setFormSnapshot] = useState(JSON.stringify(emptyForm));
  const isFormDirty = openForm && (JSON.stringify(formData) !== formSnapshot || formStep !== 1);
  const { confirmDiscard, discardDialog } = useUnsavedChangesGuard(isFormDirty);

  const fetchOperators = useCallback(async () => {
    setOperatorsLoading(true);
    try {
      const data = await getBoatOperators();
      setOperators(data);
    } finally {
      setOperatorsLoading(false);
    }
  }, []);

  useAutoRefresh(
    () => Promise.all([boatStore.fetchBoats(), settingsStore.fetchFares(), fetchOperators()]).then(() => undefined),
    [boatStore, settingsStore, fetchOperators],
    { intervalMs: 7000 },
  );

  const allRouteOptions = useMemo(
    () =>
      [...new Set(settingsStore.fares.map((fare) => fare.route.trim()).filter((route) => route.length > 0))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [settingsStore.fares],
  );

  const routeOptionRows = useMemo(() => {
    const targetType = formData.type === 'cargo' ? 'cargo' : 'commuter';
    const grouped = new Map<string, typeof settingsStore.fares>();

    settingsStore.fares
      .filter((fare) => fare.type === targetType)
      .forEach((fare) => {
        const route = normalizeRouteValue(fare.route);
        if (!route) return;
        const bucket = grouped.get(route) ?? [];
        bucket.push(fare);
        grouped.set(route, bucket);
      });

    return [...grouped.entries()]
      .map(([route, fares]) => {
        const activeFares = fares.filter((fare) => fare.isActive);
        const primaryFare = activeFares[0] ?? fares[0];
        const amount =
          primaryFare.type === 'cargo'
            ? primaryFare.rentalFare ?? 0
            : (primaryFare.baseFare ?? 0) +
              (primaryFare.baseFare ?? 0) * ((primaryFare.percentagePerKilometer ?? 0) / 100) * Math.max(primaryFare.distanceKm - 1, 0);

        return {
          route,
          priceLabel: formatCurrency(amount),
          fareNames: [...new Set(fares.map((fare) => fare.fareName.trim()).filter(Boolean))],
          activeCount: activeFares.length,
          totalCount: fares.length,
        };
      })
      .sort((a, b) => a.route.localeCompare(b.route));
  }, [formData.type, settingsStore.fares]);
  const routeOptions = useMemo(() => routeOptionRows.map((row) => row.route), [routeOptionRows]);

  const formatRoutes = (routes?: string[]) => {
    if (!routes || routes.length === 0) return 'No routes assigned';
    if (routes.length === 1) return routes[0];
    return `${routes.length} routes selected`;
  };

  const formatOperators = (names?: string[], fallback?: string) => {
    if (names && names.length > 0) {
      if (names.length === 1) return names[0];
      return `${names.length} operators selected`;
    }
    return fallback || 'No operators assigned';
  };

  const rows = useMemo<BoatRow[]>(() => {
    return boatStore.boats
      .map((boat) => {
        const normalizedStatus: TabStatus = boat.status === 'non_registered' ? 'unregistered' : (boat.status as TabStatus);
        const normalizedType: 'banca' | 'cargo' = boat.type === 'cargo' ? 'cargo' : 'banca';
        return { ...boat, normalizedStatus, normalizedType };
      })
      .filter((boat) => {
        if (boat.normalizedStatus !== tab) return false;
        if (typeFilter !== 'all' && boat.normalizedType !== typeFilter) return false;
        if (routeFilter !== 'all' && !(boat.routeNames ?? []).includes(routeFilter)) return false;
        if (quickFilter === 'banca' && boat.normalizedType !== 'banca') return false;
        if (quickFilter === 'cargo' && boat.normalizedType !== 'cargo') return false;
        if (quickFilter === 'assigned' && !(boat.routeNames?.length || boat.operatorNames?.length || boat.operatorName)) return false;
        if (quickFilter === 'open' && (boat.routeNames?.length || 0) > 0 && ((boat.operatorNames?.length || 0) > 0 || boat.operatorName)) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return [boat.name, boat.operatorName, ...(boat.operatorNames ?? []), boat.registrationNumber ?? '', boat.id, ...(boat.routeNames ?? [])]
          .join(' ')
          .toLowerCase()
          .includes(q);
      });
  }, [boatStore.boats, quickFilter, routeFilter, search, tab, typeFilter]);

  const counts = useMemo(() => {
    const normalized = boatStore.boats.map((boat) => (boat.status === 'non_registered' ? 'unregistered' : boat.status));
    return {
      registered: normalized.filter((status) => status === 'registered').length,
      unregistered: normalized.filter((status) => status === 'unregistered').length,
      coding: normalized.filter((status) => status === 'coding').length,
    };
  }, [boatStore.boats]);

  const rowSummary = useMemo(
    () => ({
      ready: rows.length,
      assigned: rows.filter((boat) => (boat.routeNames?.length || 0) > 0).length,
      banca: rows.filter((boat) => boat.normalizedType === 'banca').length,
      cargo: rows.filter((boat) => boat.normalizedType === 'cargo').length,
    }),
    [rows],
  );

  const filteredOperators = useMemo(() => {
    const targetType = formData.type === 'cargo' ? 'cargo' : 'banca';
    return operators.filter((operator) => operator.operatorType === targetType);
  }, [formData.type, operators]);

  const filteredRouteOptions = useMemo(() => {
    const q = routeQuery.trim().toLowerCase();
    if (!q) return routeOptionRows;
    return routeOptionRows.filter((row) =>
      [row.route, ...row.fareNames].join(' ').toLowerCase().includes(q),
    );
  }, [routeOptionRows, routeQuery]);

  const filteredOperatorOptions = useMemo(() => {
    const q = operatorQuery.trim().toLowerCase();
    if (!q) return filteredOperators;
    return filteredOperators.filter((operator) =>
      [operator.name, operator.username ?? '', operator.phone, operator.email ?? '', operator.licenseNumber ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [filteredOperators, operatorQuery]);

  const mapTypeToBoatType = (type: 'banca' | 'cargo'): BoatType => (type === 'cargo' ? 'cargo' : 'banca');
  const mapStatus = (status: TabStatus) => (status === 'unregistered' ? 'non_registered' : status);
  const nextBoatTemplateSeq = useMemo(() => {
    const highest = boatStore.boats.reduce((max, boat) => {
      const fromName = extractTemplateSeq(boat.name);
      const fromReg = extractTemplateSeq(boat.registrationNumber);
      return Math.max(max, fromName, fromReg);
    }, 3000);
    return highest + 1;
  }, [boatStore.boats]);

  const createTemplateForm = (type: 'banca' | 'cargo') => ({
    ...emptyForm,
    type,
    name: '',
    codeSuffix: formatSeq(nextBoatTemplateSeq),
    registrationNumber: '',
  });

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingBoat(null);
    setFormError(null);
    setIsSubmitting(false);
    setRouteQuery('');
    setOperatorQuery('');
    setRoutePickerOpen(false);
    setOperatorPickerOpen(false);
    setFormStep(1);
  };

  const openCreate = () => {
    const nextForm = createTemplateForm('banca');
    setFormData(nextForm);
    setEditingBoat(null);
    setFormError(null);
    setIsSubmitting(false);
    setRouteQuery('');
    setOperatorQuery('');
    setRoutePickerOpen(false);
    setOperatorPickerOpen(false);
    setFormStep(1);
    setFormSnapshot(JSON.stringify(nextForm));
    setOpenForm(true);
  };

  const openEdit = (boat: Boat) => {
    const nextForm: typeof emptyForm = {
      name: extractTemplateLabel(boat.name, boat.type === 'cargo' ? 'cargo' : 'banca'),
      codeSuffix: formatSeq(extractTemplateSeq(boat.name || boat.registrationNumber) || nextBoatTemplateSeq),
      operatorIds: boat.operatorIds && boat.operatorIds.length > 0 ? boat.operatorIds : [boat.operatorId],
      registrationNumber: boat.registrationNumber ?? '',
      type: boat.type === 'cargo' ? 'cargo' : 'banca',
      capacity: String(boat.capacity),
      routeNames: boat.routeNames ?? [],
      status: boat.status === 'non_registered' ? 'unregistered' : (boat.status as TabStatus),
    };
    setEditingBoat(boat);
    setFormError(null);
    setIsSubmitting(false);
    setFormData(nextForm);
    setFormSnapshot(JSON.stringify(nextForm));
    setOpenForm(true);
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    setFormError(null);
    const capacity = Number(formData.capacity);
    const normalizedLabel = sanitizeVesselLabel(formData.name);
    const computedName = buildTemplateName(formData.type, normalizedLabel, Number(formData.codeSuffix || nextBoatTemplateSeq));
    const computedRegistration = buildTemplateRegistration(formData.type, normalizedLabel, Number(formData.codeSuffix || nextBoatTemplateSeq));
    if (!normalizedLabel || formData.operatorIds.length === 0 || formData.routeNames.length === 0 || !Number.isFinite(capacity) || capacity <= 0) {
      setFormError('Please complete all required fields.');
      return;
    }
    if (!templateNamePattern[formData.type].test(computedName)) {
      setFormError(formData.type === 'cargo' ? 'Cargo vessel name must follow C-NAME-1234.' : 'Boat vessel name must follow B-NAME-1234.');
      return;
    }
    if (!templateRegistrationPattern[formData.type].test(computedRegistration)) {
      setFormError(formData.type === 'cargo' ? 'Cargo registration must follow REG-C-NAME-1234.' : 'Boat registration must follow REG-B-NAME-1234.');
      return;
    }
    const duplicateByName = boatStore.boats.some((boat) =>
      boat.id !== editingBoat?.id && boat.name.trim().toLowerCase() === computedName.trim().toLowerCase(),
    );
    if (duplicateByName) {
      setFormError('Boat name already exists. Please use a different name.');
      return;
    }

    const selectedOperators = operators.filter((item) => formData.operatorIds.includes(item.id));
    if (selectedOperators.length === 0) {
      setFormError('Please select at least one valid operator.');
      return;
    }
    const primaryOperator = selectedOperators[0];

    setIsSubmitting(true);
    try {
      if (editingBoat) {
        const result = await boatStore.updateBoat(editingBoat.id, {
          name: computedName,
          registrationNumber: computedRegistration,
          type: mapTypeToBoatType(formData.type),
          section: formData.type === 'cargo' ? 'cargo' : 'banca',
          capacity,
          status: mapStatus(formData.status),
          operatorId: primaryOperator.id,
          operatorName: primaryOperator.name,
          operatorIds: selectedOperators.map((item) => item.id),
          operatorNames: selectedOperators.map((item) => item.name),
          clusterName: '',
          barangay: '',
          routeNames: formData.routeNames,
        });
        if (!result.success) {
          setFormError(result.message);
          return;
        }
      } else {
        const createResult = await boatStore.createBoat({
          name: computedName,
          registrationNumber: computedRegistration,
          type: mapTypeToBoatType(formData.type),
          section: formData.type === 'cargo' ? 'cargo' : 'banca',
          capacity,
          status: mapStatus(formData.status),
          operatorId: primaryOperator.id,
          operatorName: primaryOperator.name,
          operatorIds: selectedOperators.map((item) => item.id),
          operatorNames: selectedOperators.map((item) => item.name),
          barangay: '',
          routeNames: formData.routeNames,
        });

        if (!createResult.success) {
          setFormError(createResult.message);
          return;
        }

        if (createResult.boatId) {
          await boatStore.updateBoat(createResult.boatId, {
            status: mapStatus(formData.status),
            operatorName: primaryOperator.name,
            operatorIds: selectedOperators.map((item) => item.id),
            operatorNames: selectedOperators.map((item) => item.name),
            clusterName: '',
            routeNames: formData.routeNames,
          });
        }
      }

      await boatStore.fetchBoats();
      setOpenForm(false);
      resetForm();
      setFormSnapshot(JSON.stringify(emptyForm));
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestCloseForm = async () => {
    if (!(await confirmDiscard())) return;
    setOpenForm(false);
    resetForm();
    setFormSnapshot(JSON.stringify(emptyForm));
  };

  const validateStep1 = () => {
    const capacity = Number(formData.capacity);
    const normalizedLabel = sanitizeVesselLabel(formData.name);
    const computedName = buildTemplateName(formData.type, normalizedLabel, Number(formData.codeSuffix || nextBoatTemplateSeq));
    const computedRegistration = buildTemplateRegistration(formData.type, normalizedLabel, Number(formData.codeSuffix || nextBoatTemplateSeq));
    if (!normalizedLabel || !Number.isFinite(capacity) || capacity <= 0) {
      setFormError('Please complete vessel name and valid capacity.');
      return false;
    }
    if (!templateNamePattern[formData.type].test(computedName)) {
      setFormError(formData.type === 'cargo' ? 'Cargo vessel name must follow C-NAME-1234.' : 'Boat vessel name must follow B-NAME-1234.');
      return false;
    }
    if (!templateRegistrationPattern[formData.type].test(computedRegistration)) {
      setFormError(formData.type === 'cargo' ? 'Cargo registration must follow REG-C-NAME-1234.' : 'Boat registration must follow REG-B-NAME-1234.');
      return false;
    }
    setFormError(null);
    return true;
  };

  const validateStep2 = () => {
    if (formData.routeNames.length === 0 || formData.operatorIds.length === 0) {
      setFormError('Please select at least one route and one operator.');
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

  const previewName = buildTemplateName(formData.type, formData.name, Number(formData.codeSuffix || nextBoatTemplateSeq));
  const previewRegistration = buildTemplateRegistration(formData.type, formData.name, Number(formData.codeSuffix || nextBoatTemplateSeq));

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleteLoading(true);
    const result = await boatStore.deleteBoat(deleteTarget.id);
    setDeleteLoading(false);
    if (!result.success) {
      setDeleteError(result.message);
      return;
    }
    setDeleteTarget(null);
  };

  const handleStatusUpdate = async (boat: Boat, nextStatus: TabStatus) => {
    try {
      await boatStore.updateBoatStatus(boat.id, mapStatus(nextStatus));
      await boatStore.fetchBoats();
    } catch (error) {
      const isAxios = axios.isAxiosError(error);
      const status = isAxios ? error.response?.status : undefined;
      const message = isAxios
        ? (error.response?.data as { message?: string; error?: string } | undefined)?.message
          ?? (error.response?.data as { message?: string; error?: string } | undefined)?.error
          ?? error.message
        : error instanceof Error
          ? error.message
          : 'Unable to update vessel status.';

      if (status === 409) {
        showWarningToast('Status change blocked', message);
      } else {
        showErrorToast('Status update failed', message);
      }
    }
  };

  const toggleRouteSelection = (route: string) => {
    setFormData((prev) => ({
      ...prev,
      routeNames: prev.routeNames.includes(route)
        ? prev.routeNames.filter((item) => item !== route)
        : [...prev.routeNames, route],
    }));
  };

  const toggleOperatorSelection = (operatorId: string) => {
    setFormData((prev) => ({
      ...prev,
      operatorIds: prev.operatorIds.includes(operatorId)
        ? prev.operatorIds.filter((item) => item !== operatorId)
        : [...prev.operatorIds, operatorId],
    }));
  };

  return (
    <Layout className="p-6">
      <Dialog
        open={openForm}
        onOpenChange={(open) => {
          if (open) {
            setOpenForm(true);
            return;
          }
          void requestCloseForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-hidden border-slate-800/70 bg-[linear-gradient(180deg,rgba(8,15,34,0.98),rgba(7,16,39,0.96))] p-0 text-slate-100 sm:max-w-[760px]">
          <DialogHeader className="border-b border-white/10 px-6 pb-5 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <Anchor className="h-5 w-5 text-blue-600" />
              {editingBoat ? 'Edit Vessel' : 'Add Vessel'}
            </DialogTitle>
            <DialogDescription>
              {editingBoat ? 'Update this vessel record across all modules.' : 'Create a vessel record shared across all modules.'}
            </DialogDescription>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className={formStep === 1 ? 'rounded px-2 py-1 bg-sky-500 text-slate-950' : 'rounded px-2 py-1 bg-white/10 text-slate-200'}>Step 1: Vessel</span>
              <span className={formStep === 2 ? 'rounded px-2 py-1 bg-sky-500 text-slate-950' : 'rounded px-2 py-1 bg-white/10 text-slate-200'}>Step 2: Assignment</span>
              <span className={formStep === 3 ? 'rounded px-2 py-1 bg-sky-500 text-slate-950' : 'rounded px-2 py-1 bg-white/10 text-slate-200'}>Step 3: Review</span>
            </div>
          </DialogHeader>
          <div className="max-h-[calc(90vh-170px)] space-y-4 overflow-y-auto px-6 py-5" style={{ scrollbarGutter: 'stable' }}>
            {formStep === 1 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Readable Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: sanitizeVesselLabel(e.target.value) }))}
                    placeholder={formData.type === 'cargo' ? 'e.g. HABAGAT' : 'e.g. TALIM'}
                    className="border-white/15 bg-slate-950/50 text-white"
                  />
                  <p className="text-xs text-slate-400">Enter the readable vessel label only. The system builds the final code automatically.</p>
                </div>
                <div className="space-y-2">
                  <Label>System Code</Label>
                  <Input value={previewName} readOnly className="border-white/15 bg-slate-950/50 text-white" />
                  <p className="text-xs text-slate-400">Template: {formData.type === 'cargo' ? 'C-NAME-1234' : 'B-NAME-1234'}</p>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData((prev) => {
                        const nextType = value as 'banca' | 'cargo';
                        const next = {
                          ...prev,
                          type: nextType,
                          operatorIds: [],
                          routeNames: [],
                        };
                        if (editingBoat) {
                          return next;
                        }
                        next.codeSuffix = formatSeq(nextBoatTemplateSeq);
                        return next;
                      })
                    }
                  >
                    <SelectTrigger className="border-white/15 bg-slate-950/50 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banca">Banca</SelectItem>
                      <SelectItem value="cargo">Cargo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{formData.type === 'cargo' ? 'Max Weight Limit (kg)' : 'Capacity'}</Label>
                  <Input type="number" min={1} value={formData.capacity} onChange={(e) => setFormData((prev) => ({ ...prev, capacity: e.target.value }))} className="border-white/15 bg-slate-950/50 text-white" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Registration Number</Label>
                  <Input value={previewRegistration} readOnly className="border-white/15 bg-slate-950/50 text-white" />
                  <p className="text-xs text-slate-400">Template: {formData.type === 'cargo' ? 'REG-C-NAME-1234' : 'REG-B-NAME-1234'}</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as TabStatus }))}>
                    <SelectTrigger className="border-white/15 bg-slate-950/50 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="registered">Registered</SelectItem>
                      <SelectItem value="unregistered">Unregistered</SelectItem>
                      <SelectItem value="coding">Coding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {formStep === 2 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Routes</Label>
                  <Button variant="outline" className="w-full justify-between border-white/15 bg-slate-950/50 text-white hover:bg-white/10" onClick={() => setRoutePickerOpen(true)}>
                    <span className="truncate text-left">{formatRoutes(formData.routeNames)}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-70" />
                  </Button>
                  {routeOptions.length === 0 && (
                    <p className="text-xs text-amber-300">Add route records first in Fare Management.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Boat Operators</Label>
                  <Button
                    variant="outline"
                    className="w-full justify-between border-white/15 bg-slate-950/50 text-white hover:bg-white/10"
                    onClick={() => setOperatorPickerOpen(true)}
                    disabled={operatorsLoading}
                  >
                    <span className="truncate text-left">
                      {operatorsLoading
                        ? 'Loading operators...'
                        : formatOperators(
                            operators
                              .filter((item) => formData.operatorIds.includes(item.id))
                              .map((item) => item.name),
                          )}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-70" />
                  </Button>
                </div>
              </div>
            )}

            {formStep === 3 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Vessel</p>
                  <p className="mt-2 text-base font-semibold text-white">{previewName}</p>
                  <p className="text-sm text-slate-300">{previewRegistration}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {formData.type === 'cargo' ? 'Type / Max Weight Limit' : 'Type / Capacity'}
                  </p>
                  <p className="mt-2 text-base font-semibold capitalize text-white">{formData.type} / {formData.capacity || '-'}</p>
                  <p className="text-sm text-slate-300 capitalize">Status: {formData.status}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Assignment</p>
                  <p className="mt-2 text-sm text-slate-200">Routes: {formatRoutes(formData.routeNames)}</p>
                  <p className="text-sm text-slate-200">
                    Operators: {
                      formatOperators(
                        operators.filter((item) => formData.operatorIds.includes(item.id)).map((item) => item.name),
                      )
                    }
                  </p>
                </div>
              </div>
            )}

            {formError && <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{formError}</p>}
          </div>
          <DialogFooter className="sticky bottom-0 border-t border-white/10 bg-slate-950/80 px-6 py-4 backdrop-blur">
            <Button
              type="button"
              variant="outline"
              onClick={() => void requestCloseForm()}
              disabled={isSubmitting}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            {formStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormError(null);
                  setFormStep((prev) => (prev === 3 ? 2 : 1));
                }}
                disabled={isSubmitting}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                Back
              </Button>
            )}
            {formStep < 3 ? (
              <Button type="button" onClick={handleNextStep} disabled={isSubmitting} className="bg-sky-500 text-slate-950 hover:bg-sky-400">
                {formStep === 1 ? 'Next: Assignment' : 'Next: Review'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSubmitting}
                className="gap-2 bg-sky-500 text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-80"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {editingBoat ? 'Saving...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    {editingBoat ? 'Save Changes' : 'Add Vessel'}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {discardDialog}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Vessel</DialogTitle>
            <DialogDescription>
              Remove {deleteTarget?.name ?? 'this vessel'} from Boat Management?
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleteLoading}>
              {deleteLoading ? 'Deleting...' : 'Delete Vessel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedBoat} onOpenChange={(open) => !open && setSelectedBoat(null)}>
        <DialogContent className="border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 p-0 text-slate-100 sm:left-auto sm:right-4 sm:top-4 sm:h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-2rem)] sm:w-[min(92vw,820px)] sm:max-w-[820px] sm:translate-x-0 sm:translate-y-0 sm:rounded-[28px]">
          <DialogHeader className="border-b border-slate-800 px-6 pb-4 pt-6">
            <DialogTitle>Vessel Registry Details</DialogTitle>
            <DialogDescription className="text-slate-300">
              {selectedBoat ? `${selectedBoat.name} (${selectedBoat.id})` : 'Vessel details'}
            </DialogDescription>
          </DialogHeader>

          {selectedBoat && (
            <div className="space-y-4 overflow-y-auto px-6 pb-6">
              <div className="rounded-[26px] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl border border-sky-500/30 bg-sky-500/12 text-sky-200">
                      {selectedBoat.type === 'cargo' ? <Package2 className="h-6 w-6" /> : <Anchor className="h-6 w-6" />}
                    </span>
                    <div className="min-w-0 space-y-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/80">
                          {selectedBoat.type === 'cargo' ? 'Cargo Registry' : 'Passenger Registry'}
                        </p>
                        <h3 className="mt-1 break-words text-2xl font-semibold tracking-tight text-white">{selectedBoat.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                          {selectedBoat.type === 'cargo' ? 'Cargo vessel' : 'Banca vessel'}
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] font-medium text-slate-300">
                          {compactRouteSummary(selectedBoat.routeNames).secondary
                            ? `${selectedBoat.routeNames?.length ?? 0} routes assigned`
                            : compactRouteSummary(selectedBoat.routeNames).primary}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="self-start rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-left lg:min-w-[172px] lg:text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Registry State</p>
                    <p className="mt-1 font-semibold text-slate-100">
                      {selectedBoat.status === 'non_registered'
                        ? compactStatusLabel.unregistered
                        : selectedBoat.status === 'coding'
                          ? compactStatusLabel.coding
                          : compactStatusLabel.registered}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <RegistryDetailCard
                  icon={selectedBoat.type === 'cargo' ? Package2 : Users}
                  label="Type"
                  value={selectedBoat.type === 'cargo' ? 'Cargo Vessel' : 'Banca Vessel'}
                  detail="Registry classification"
                  tone="sky"
                />
                <RegistryDetailCard
                  icon={ClipboardList}
                  label="Load"
                  value={selectedBoat.type === 'cargo' ? `${selectedBoat.capacity ?? '-'} kg` : selectedBoat.capacity ?? '-'}
                  detail={selectedBoat.type === 'cargo' ? 'Configured max weight' : 'Passenger seats'}
                  tone="amber"
                />
                <RegistryDetailCard
                  icon={RouteIcon}
                  label="Routes"
                  value={selectedBoat.routeNames?.length ?? 0}
                  detail={compactRouteSummary(selectedBoat.routeNames).primary}
                  tone="violet"
                />
                <RegistryDetailCard
                  icon={ShieldCheck}
                  label="Operators"
                  value={(selectedBoat.operatorNames?.length ?? 0) || (selectedBoat.operatorName ? 1 : 0)}
                  detail={selectedBoat.operatorNames?.[0] ?? selectedBoat.operatorName ?? 'No operators assigned'}
                  tone="emerald"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.08fr,0.92fr]">
                <Card className="border-slate-800 bg-slate-900/50 text-slate-100 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Assigned Routes</CardTitle>
                    <CardDescription>
                      {(selectedBoat.routeNames?.length ?? 0) > 0
                        ? `${selectedBoat.routeNames?.length ?? 0} route assignment(s)`
                        : 'No routes assigned yet'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(selectedBoat.routeNames ?? []).length > 0 ? (
                      selectedBoat.routeNames?.map((route) => (
                        <div
                          key={`${selectedBoat.id}-${route}`}
                          className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] p-4"
                        >
                          <div className="flex items-start gap-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-200">
                              <RouteIcon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-100">{route}</p>
                              <p className="mt-1 text-xs text-slate-400">Active route assignment from fare setup.</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">No route assignments yet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/50 text-slate-100 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Assigned Operators</CardTitle>
                    <CardDescription>
                      {(selectedBoat.operatorNames?.length ?? 0) > 0 || selectedBoat.operatorName
                        ? 'Crew and registry owner assignments'
                        : 'No operators assigned yet'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(selectedBoat.operatorNames ?? []).length > 0 ? (
                      selectedBoat.operatorNames?.map((operatorName, index) => (
                        <div
                          key={`${selectedBoat.id}-${operatorName}-${index}`}
                          className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] p-4"
                        >
                          <div className="flex items-start gap-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
                              <UserRound className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-100">{operatorName}</p>
                              <p className="mt-1 text-xs text-slate-400">Assigned operator record.</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : selectedBoat.operatorName ? (
                      <div className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] p-4">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
                            <UserRound className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-100">{selectedBoat.operatorName}</p>
                            <p className="mt-1 text-xs text-slate-400">Primary operator assignment.</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">No operators assigned.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-800 bg-slate-900/50 text-slate-100 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Registry Profile</CardTitle>
                  <CardDescription>Core registry identifiers for this vessel record.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-sm text-slate-400">Registration Number</p>
                    <p className="mt-1 break-all text-sm font-medium text-slate-100">{selectedBoat.registrationNumber ?? '-'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-sm text-slate-400">System ID</p>
                    <p className="mt-1 break-all text-sm font-medium text-slate-100">{selectedBoat.id}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={routePickerOpen} onOpenChange={setRoutePickerOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Select Routes</DialogTitle>
            <DialogDescription>Pick one or more routes from Fare Management for this boat.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search routes..."
                value={routeQuery}
                onChange={(e) => setRouteQuery(e.target.value)}
              />
            </div>
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-md border bg-slate-50 px-3 py-2 text-sm">
              <span className="font-medium text-slate-700">{formData.routeNames.length} route(s) selected</span>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setFormData((prev) => ({ ...prev, routeNames: [] }))}>
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData((prev) => ({ ...prev, routeNames: [...routeOptions] }))}
                  disabled={routeOptions.length === 0}
                >
                  Select all
                </Button>
              </div>
            </div>
            <div className="max-h-[360px] overflow-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Route</th>
                    <th className="px-4 py-3 text-left">Price</th>
                    <th className="px-4 py-3 text-left">Fare Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRouteOptions.map((row) => (
                    <tr
                      key={row.route}
                      className={`cursor-pointer transition ${
                        formData.routeNames.includes(row.route) ? 'bg-sky-50 text-sky-900' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => toggleRouteSelection(row.route)}
                    >
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold ${
                              formData.routeNames.includes(row.route)
                                ? 'border-sky-500 bg-sky-500 text-white'
                                : 'border-slate-300 text-slate-400'
                            }`}
                          >
                            {formData.routeNames.includes(row.route) ? '✓' : ''}
                          </span>
                          <div className="min-w-0">
                            <div>{row.route}</div>
                            <div className="text-xs font-normal text-slate-500">
                              {row.fareNames.length > 0 ? row.fareNames.join(', ') : 'No fare label'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{row.priceLabel}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-600">
                          {row.activeCount} active / {row.totalCount} total fare record{row.totalCount === 1 ? '' : 's'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredRouteOptions.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-500">No routes found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoutePickerOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={operatorPickerOpen} onOpenChange={setOperatorPickerOpen}>
        <DialogContent className="sm:max-w-[840px]">
          <DialogHeader>
            <DialogTitle>Select Boat Operators</DialogTitle>
            <DialogDescription>Choose one or more operators who can drive this boat.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search operators..."
                value={operatorQuery}
                onChange={(e) => setOperatorQuery(e.target.value)}
              />
            </div>
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-md border bg-slate-50 px-3 py-2 text-sm">
              <span className="font-medium text-slate-700">{formData.operatorIds.length} operator(s) selected</span>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setFormData((prev) => ({ ...prev, operatorIds: [] }))}>
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      operatorIds: filteredOperators.map((operator) => operator.id),
                    }))
                  }
                  disabled={filteredOperators.length === 0}
                >
                  Select all
                </Button>
              </div>
            </div>
            <div className="max-h-[360px] overflow-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Username</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredOperatorOptions.map((operator) => (
                    <tr
                      key={operator.id}
                      className={`cursor-pointer transition ${
                        formData.operatorIds.includes(operator.id) ? 'bg-sky-50 text-sky-900' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => toggleOperatorSelection(operator.id)}
                    >
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold ${
                              formData.operatorIds.includes(operator.id)
                                ? 'border-sky-500 bg-sky-500 text-white'
                                : 'border-slate-300 text-slate-400'
                            }`}
                          >
                            {formData.operatorIds.includes(operator.id) ? '✓' : ''}
                          </span>
                          <span>{operator.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{operator.username ?? '-'}</td>
                      <td className="px-4 py-3 capitalize">{operator.operatorType ?? '-'}</td>
                      <td className="px-4 py-3">{operator.phone}</td>
                    </tr>
                  ))}
                  {filteredOperatorOptions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500">No operators found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOperatorPickerOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
          <div className="space-y-2.5">
            <span className="inline-flex w-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              Vessel Desk
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Boat Management</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                Registry control for deployable banca and cargo vessels
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-emerald-200/70 bg-emerald-50/90 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">Ready</p>
              <p className="mt-1 text-xl font-semibold text-emerald-900 dark:text-emerald-50">{counts.registered}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Schedulable vessels</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-amber-200/70 bg-amber-50/90 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">Registry Hold</p>
              <p className="mt-1 text-xl font-semibold text-amber-900 dark:text-amber-50">{counts.unregistered}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Profile not active</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-blue-200/70 bg-blue-50/90 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">Coding Hold</p>
              <p className="mt-1 text-xl font-semibold text-blue-900 dark:text-blue-50">{counts.coding}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Temporary stop</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr),320px]">
        <div className="space-y-4">
          <Card className="shadow-lg border border-gray-200 dark:border-slate-800 dark:bg-slate-950/78">
            <CardContent className="p-0">
          <div className="grid gap-3 border-b border-slate-200/70 px-4 py-4 dark:border-slate-800 lg:grid-cols-3">
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-200">Ready</p>
              <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">Ready for scheduling, booking, and public visibility.</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-amber-200/70 bg-amber-50/70 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-200">Registry Hold</p>
              <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">Saved in registry only until the vessel is ready to go live.</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-blue-200/70 bg-blue-50/70 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-200">Coding Hold</p>
              <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">Temporarily unavailable and excluded from fresh operational use.</p>
            </div>
          </div>
          <Tabs value={tab} onValueChange={(value) => setTab(value as TabStatus)} className="w-full">
            <TabsList className="mx-4 my-3 grid h-auto w-full max-w-[360px] grid-cols-3 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
              <TabsTrigger value="registered" className="rounded-xl py-2">{compactStatusLabel.registered}</TabsTrigger>
              <TabsTrigger value="unregistered" className="rounded-xl py-2">{compactStatusLabel.unregistered}</TabsTrigger>
              <TabsTrigger value="coding" className="rounded-xl py-2">{compactStatusLabel.coding}</TabsTrigger>
            </TabsList>
            <div className="mx-4 mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  {([
                    ['all', 'All'],
                    ['banca', 'Banca'],
                    ['cargo', 'Cargo'],
                    ['assigned', 'Assigned'],
                    ['open', 'Open setup'],
                  ] as Array<[BoatQuickFilter, string]>).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickFilter(value)}
                      className={cn(
                        'h-8 rounded-full px-3 text-xs',
                        quickFilter === value
                          ? 'border-sky-500 bg-sky-500 text-slate-950 hover:bg-sky-400'
                          : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200',
                      )}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950">
                  {([
                    ['comfortable', 'Comfortable'],
                    ['compact', 'Compact'],
                  ] as Array<[RowDensity, string]>).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRowDensity(value)}
                      className={cn(
                        'h-8 rounded-full px-3 text-xs',
                        rowDensity === value && 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white',
                      )}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {rowSummary.ready} in view
                </span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
                  {rowSummary.assigned} assigned
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                  {rowSummary.banca} banca
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  {rowSummary.cargo} cargo
                </span>
              </div>
            </div>
            <TabsContent value="registered">
              <TableView rows={rows} density={rowDensity} onEdit={openEdit} onDelete={setDeleteTarget} onStatusChange={handleStatusUpdate} onOpenDetails={setSelectedBoat} />
            </TabsContent>
            <TabsContent value="unregistered">
              <TableView rows={rows} density={rowDensity} onEdit={openEdit} onDelete={setDeleteTarget} onStatusChange={handleStatusUpdate} onOpenDetails={setSelectedBoat} />
            </TabsContent>
            <TabsContent value="coding">
              <TableView rows={rows} density={rowDensity} onEdit={openEdit} onDelete={setDeleteTarget} onStatusChange={handleStatusUpdate} onOpenDetails={setSelectedBoat} />
            </TabsContent>
          </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-slate-200/70 bg-white/92 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
            <div className="space-y-3">
              <div className="space-y-1">
                <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Registry Queue</CardTitle>
                <CardDescription>{rows.length} vessels in the current registry view</CardDescription>
              </div>
              <div className="flex flex-col gap-2">
                <Button className="h-10 gap-2 rounded-xl" onClick={openCreate}>
                  <PlusCircle className="h-4 w-4" />
                  Add Vessel
                </Button>
                <Input
                  placeholder="Search by name, operator, registration, route..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 rounded-xl"
                />
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="banca">Banca</SelectItem>
                    <SelectItem value="cargo">Cargo</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={routeFilter} onValueChange={(value) => setRouteFilter(value as typeof routeFilter)}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Route" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All routes</SelectItem>
                    {allRouteOptions.map((route) => (
                      <SelectItem key={route} value={route}>{route}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-900 dark:text-slate-100">Registry Snapshot</CardTitle>
              <CardDescription>Current queue view and filter state</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Quick Filter</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{quickFilter.replace('_', ' ')}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Density</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{rowDensity}</p>
                </div>
              </div>
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Operational Notes</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">Ready vessels can flow into schedules and bookings. Hold states remain visible but stay out of live operations.</p>
              </div>
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Queue Focus</p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {counts.registered} ready
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    {counts.unregistered} registry hold
                  </span>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                    {counts.coding} coding hold
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
});

const TableView = ({
  rows,
  density,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenDetails,
}: {
  rows: BoatRow[];
  density: RowDensity;
  onEdit: (boat: Boat) => void;
  onDelete: (boat: Boat) => void;
  onStatusChange: (boat: Boat, nextStatus: TabStatus) => void;
  onOpenDetails: (boat: Boat) => void;
}) => (
  <div className="mx-4 mb-4 overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800">
    <div className="max-h-[520px] overflow-x-auto overflow-y-auto">
    <table className="min-w-full text-sm">
      <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 uppercase text-[11px] tracking-[0.2em] dark:bg-slate-900/95 dark:text-slate-300">
        <tr>
          <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 text-left font-semibold dark:bg-slate-900/95">Vessel</th>
          <th className="px-4 py-3 text-left font-semibold">Operator</th>
          <th className="px-4 py-3 text-left font-semibold">Load</th>
          <th className="px-4 py-3 text-left font-semibold">Route</th>
          <th className="px-4 py-3 text-left font-semibold">Registration</th>
          <th className="px-4 py-3 text-left font-semibold">Status</th>
          <th className="px-4 py-3 text-right font-semibold">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/40">
        {rows.map((boat) => (
          <tr
            key={boat.id}
            className={cn(
              'group cursor-pointer transition-colors hover:bg-sky-50/70 dark:hover:bg-slate-900/75',
              density === 'compact' ? 'h-14' : 'h-[72px]',
            )}
            onClick={() => onOpenDetails(boat)}
          >
            <td className={cn('sticky left-0 z-10 bg-white px-4 dark:bg-slate-950/40', density === 'compact' ? 'py-3' : 'py-4')}>
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-900 dark:text-slate-100">{boat.name}</div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{boat.normalizedType === 'cargo' ? 'Cargo' : 'Banca'}</div>
              </div>
            </td>
            <td className={cn('px-4 text-slate-600 dark:text-slate-300', density === 'compact' ? 'py-3' : 'py-4')}>
              <div className="truncate max-w-[220px]">
                {boat.operatorNames && boat.operatorNames.length > 0 ? boat.operatorNames.join(', ') : boat.operatorName}
              </div>
            </td>
            <td className={cn('px-4 text-slate-600 dark:text-slate-300', density === 'compact' ? 'py-3' : 'py-4')}>
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {boat.normalizedType === 'cargo' ? `${boat.capacity} kg` : boat.capacity}
              </span>
            </td>
            <td className={cn('px-4 text-slate-600 dark:text-slate-300', density === 'compact' ? 'py-3' : 'py-4')}>
              {(() => {
                const routeSummary = compactRouteSummary(boat.routeNames);
                return (
                  <div className="min-w-0">
                    <span className="inline-flex max-w-[220px] items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
                      <RouteIcon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{routeSummary.primary}</span>
                    </span>
                    {routeSummary.secondary && (
                      <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{routeSummary.secondary}</div>
                    )}
                  </div>
                );
              })()}
            </td>
            <td className={cn('px-4 text-slate-600 dark:text-slate-300', density === 'compact' ? 'py-3' : 'py-4')}>
              <span className="font-medium">{boat.registrationNumber ?? '-'}</span>
            </td>
            <td className={cn('px-4', density === 'compact' ? 'py-3' : 'py-4')} onClick={(event) => event.stopPropagation()}>
              <Select
                value={boat.normalizedStatus}
                onValueChange={(value) => void onStatusChange(boat, value as TabStatus)}
              >
                <SelectTrigger className="h-8 w-[150px] rounded-lg border-slate-200 bg-white capitalize dark:border-slate-700 dark:bg-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="unregistered">Unregistered</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                </SelectContent>
              </Select>
            </td>
            <td className={cn('px-4', density === 'compact' ? 'py-3' : 'py-4')} onClick={(event) => event.stopPropagation()}>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg border-slate-200 p-0 dark:border-slate-700 dark:bg-slate-950" onClick={() => onEdit(boat)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" className="h-8 w-8 rounded-lg p-0" onClick={() => onDelete(boat)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No vessels found.</td>
          </tr>
        )}
      </tbody>
    </table>
    </div>
  </div>
);

export default BoatManagementPage;
