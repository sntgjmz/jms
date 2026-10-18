import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useBoatStore, useSettingsStore } from '@/stores';
import type { Schedule, Fare } from '@/stores/SettingsStore';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Calendar, CalendarDays, CheckCircle2, ClipboardCheck, ClipboardList, Clock3, Edit, Loader2, MapPin, Plus, Ship, Trash2 } from 'lucide-react';
import { pushBellNotification } from '@/lib/notification-helpers';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useScheduleForm } from '@/features/settings/setup/schedules/hooks/useScheduleForm';
import { BoatPickerDialog, OperatorPickerDialog, RoutePickerDialog } from '@/features/settings/setup/schedules/components/SchedulePickers';
import { cn } from '@/lib/utils';
import { formatDateTime, formatDate } from '@/lib/date-utils';
import { EmptyStateRow } from '@/components/ui/empty-state-row';
import BatchProgressDialog from '@/components/BatchProgressDialog';
import AvailabilityCalendarDialog from '@/components/AvailabilityCalendarDialog';
import '@/styles/pages/SchedulesPage.css';

const addDays = (base: Date, days: number) => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

const buildScheduleRange = (dateWindowOffset: number) => {
  const today = new Date();
  const start = addDays(today, dateWindowOffset * 7 - 7);
  const end = addDays(start, 41);
  return {
    from: toManilaIsoDate(start),
    to: toManilaIsoDate(end),
  };
};

const buildVisibleWeekRange = (dateWindowOffset: number) => {
  const today = new Date();
  const start = addDays(today, dateWindowOffset * 7);
  const end = addDays(start, 6);
  return {
    from: toManilaIsoDate(start),
    to: toManilaIsoDate(end),
  };
};

const toManilaIsoDate = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(date);

const parseIsoDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getDateWindowOffset = (targetDate: string) => {
  if (!targetDate) return 0;
  const today = parseIsoDate(toManilaIsoDate(new Date()));
  const target = parseIsoDate(targetDate);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
};

const getScheduleDateKey = (datetime?: string) => {
  if (!datetime) return '';
  const parsed = new Date(datetime);
  if (Number.isNaN(parsed.getTime())) return '';
  return toManilaIsoDate(parsed);
};

const simplifyLocationName = (value?: string) => {
  if (!value) return '-';
  return value
    .replace(/\bbarangay\b/gi, '')
    .replace(/\bcluster\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

type ScheduleRuntimeStatus = 'upcoming' | 'in_progress' | 'completed' | 'invalid';
type ScheduleDisplayStatus =
  | ScheduleRuntimeStatus
  | 'preparing'
  | 'boarding'
  | 'final_call'
  | 'departure'
  | 'in_transit'
  | 'arrived'
  | 'cancelled'
  | 'maintenance'
  | 'delayed'
  | 'out_for_delivery'
  | 'delivered';
const MANUAL_TRIP_OVERRIDE_STATUSES = new Set(['delayed', 'arrived', 'completed', 'cancelled', 'maintenance']);

const resolveRuntimeStatus = (schedule: Schedule): ScheduleRuntimeStatus => {
  const now = Date.now();
  const departureAt = schedule.departureDatetime ? new Date(schedule.departureDatetime).getTime() : NaN;
  const arrivalAt = schedule.arrivalDatetime ? new Date(schedule.arrivalDatetime).getTime() : NaN;
  if (Number.isNaN(departureAt) || Number.isNaN(arrivalAt)) return 'invalid';
  if (now >= arrivalAt) return 'completed';
  if (now >= departureAt) return 'in_progress';
  return 'upcoming';
};
const isScheduleCompleted = (schedule: Schedule) => resolveRuntimeStatus(schedule) === 'completed';

const getLiveBoatTripStatusForSchedule = (
  schedule: Schedule,
  boats: Array<{ id: string; type?: string; bancaTripStatus?: string; cargoTripStatus?: string }>,
): ScheduleDisplayStatus | null => {
  const scheduleDateKey = getScheduleDateKey(schedule.departureDatetime);
  const todayKey = toManilaIsoDate(new Date());
  if (!scheduleDateKey || scheduleDateKey !== todayKey || !schedule.boatId) {
    return null;
  }

  const boat = boats.find((item) => item.id === schedule.boatId);
  if (!boat) return null;

  const normalizedType = boat.type?.trim().toLowerCase();
  const liveStatus = schedule.tripStatus?.trim().toLowerCase();
  const departureAt = schedule.departureDatetime ? new Date(schedule.departureDatetime).getTime() : Number.NaN;
  const arrivalAt = schedule.arrivalDatetime ? new Date(schedule.arrivalDatetime).getTime() : Number.NaN;
  const now = Date.now();

  if (liveStatus && MANUAL_TRIP_OVERRIDE_STATUSES.has(liveStatus)) {
    if (liveStatus === 'departure') return 'departure';
    return liveStatus as ScheduleDisplayStatus;
  }

  if (Number.isNaN(departureAt)) {
    return 'upcoming';
  }
  if (!Number.isNaN(arrivalAt) && now >= arrivalAt) {
    return 'completed';
  }

  const diffSeconds = Math.floor((departureAt - now) / 1000);
  if (normalizedType === 'cargo') {
    if (diffSeconds > 0) return 'preparing';
    if (!Number.isNaN(arrivalAt) && now < arrivalAt) return 'out_for_delivery';
    return 'delivered';
  }

  if (diffSeconds > 1800) return 'upcoming';
  if (diffSeconds > 300) return 'boarding';
  if (diffSeconds > 0) return 'final_call';
  if (!Number.isNaN(arrivalAt) && now < arrivalAt) return 'departure';
  return 'completed';
};

const renderScheduleStatusBadge = (status: ScheduleDisplayStatus) => {
  switch (status) {
    case 'completed':
      return <Badge variant="secondary">Completed</Badge>;
    case 'in_progress':
      return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">In Progress</Badge>;
    case 'upcoming':
      return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Scheduled</Badge>;
    case 'invalid':
      return <Badge variant="destructive">Invalid Time</Badge>;
    case 'preparing':
      return <Badge className="bg-sky-600 text-white hover:bg-sky-700">Scheduled</Badge>;
    case 'boarding':
      return <Badge className="bg-cyan-600 text-white hover:bg-cyan-700">Boarding</Badge>;
    case 'final_call':
      return <Badge className="bg-orange-600 text-white hover:bg-orange-700">Final Call</Badge>;
    case 'departure':
      return <Badge className="bg-indigo-600 text-white hover:bg-indigo-700">Departed</Badge>;
    case 'in_transit':
      return <Badge className="bg-teal-600 text-white hover:bg-teal-700">In Transit</Badge>;
    case 'arrived':
      return <Badge className="bg-emerald-700 text-white hover:bg-emerald-800">Arrived</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    case 'maintenance':
      return <Badge className="bg-amber-600 text-white hover:bg-amber-700">Maintenance</Badge>;
    case 'delayed':
      return <Badge className="bg-yellow-600 text-white hover:bg-yellow-700">Delayed</Badge>;
    case 'out_for_delivery':
      return <Badge className="bg-cyan-600 text-white hover:bg-cyan-700">Out for Delivery</Badge>;
    case 'delivered':
      return <Badge className="bg-emerald-700 text-white hover:bg-emerald-800">Delivered</Badge>;
    default:
      return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Scheduled</Badge>;
  }
};

const DAYS_OF_WEEK_VALUES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_OF_WEEK_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

const calculateTotalFare = (fare: Fare) => {
  if (fare.type === 'cargo') return fare.rentalFare ?? 0;
  const base = fare.baseFare ?? 0;
  const pct = fare.percentagePerKilometer ?? 0;
  const dist = fare.distanceKm ?? 0;
  return base + (base * (pct / 100) * Math.max(dist - 1, 0));
};

const getExpectedFareTypeForBoat = (boatType?: string) => {
  const normalized = boatType?.trim().toLowerCase();
  return normalized === 'cargo' ? 'cargo' : 'commuter';
};

const formatSelectedDateLabel = (value?: string) => {
  if (!value) return 'All dates';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Manila',
  }).format(parsed);
};

type RowDensity = 'comfortable' | 'compact';
type ScheduleQuickFilter = 'all' | 'today' | 'banca' | 'cargo' | 'live' | 'delayed';

const SchedulesPage = observer(() => {
  const settingsStore = useSettingsStore();
  const boatStore = useBoatStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);
  const [selectedScheduleDetails, setSelectedScheduleDetails] = useState<{
    schedule: Schedule;
    runtimeStatus: ScheduleRuntimeStatus;
    displayStatus: ScheduleDisplayStatus;
  } | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteScope, setDeleteScope] = useState<'single' | 'future' | 'until'>('single');
  const [deleteUntilDate, setDeleteUntilDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'upcoming' | 'in_progress' | 'completed'>('active');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [rowDensity, setRowDensity] = useState<RowDensity>('compact');
  const [quickFilter, setQuickFilter] = useState<ScheduleQuickFilter>('all');
  const [dateWindowOffset, setDateWindowOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => toManilaIsoDate(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [schedulePageRows, setSchedulePageRows] = useState<Array<{ schedule: Schedule; runtimeStatus: ScheduleRuntimeStatus; displayStatus: ScheduleDisplayStatus }>>([]);
  const [scheduleTotalItems, setScheduleTotalItems] = useState(0);
  const [scheduleTotalPages, setScheduleTotalPages] = useState(1);
  const [calendarAvailabilityMap, setCalendarAvailabilityMap] = useState<Record<string, number>>({});
  const [dateAvailabilityMap, setDateAvailabilityMap] = useState<Record<string, number>>({});
  const calendarRequestIdRef = useRef(0);
  const [boatPickerOpen, setBoatPickerOpen] = useState(false);
  const [operatorPickerOpen, setOperatorPickerOpen] = useState(false);
  const [routePickerOpen, setRoutePickerOpen] = useState(false);

  const loadData = useCallback(async () => {
    const scheduleRange = buildScheduleRange(dateWindowOffset);
    const weekRange = buildVisibleWeekRange(dateWindowOffset);
    const [pagedSchedules, weekCounts] = await Promise.all([
      settingsStore.fetchPagedSchedules({
        ...scheduleRange,
        q: searchQuery.trim() || undefined,
        status: statusFilter,
        selectedDate: selectedDate || undefined,
        page: page - 1,
        size: pageSize,
      }),
      settingsStore.getScheduleCalendarCounts({
        ...weekRange,
        q: searchQuery.trim() || undefined,
        status: statusFilter,
        mode: 'trips',
      }),
      settingsStore.fetchFares(),
      boatStore.fetchBoats(),
    ]);

    setSchedulePageRows(
      pagedSchedules.items.map((schedule) => {
        const runtimeStatus = resolveRuntimeStatus(schedule);
        const liveStatus = getLiveBoatTripStatusForSchedule(schedule, boatStore.boats);
        return {
          schedule,
          runtimeStatus,
          displayStatus: liveStatus ?? runtimeStatus,
        };
      }),
    );
    setScheduleTotalItems(pagedSchedules.totalItems);
    setScheduleTotalPages(pagedSchedules.totalPages);
    setDateAvailabilityMap(weekCounts);
  }, [boatStore, dateWindowOffset, page, pageSize, searchQuery, selectedDate, settingsStore, statusFilter]);

  useAutoRefresh(() => loadData(), [loadData], { intervalMs: 7000 });

  const boatOptions = useMemo(
    () => boatStore.boats.filter((boat) => boat.status === 'registered'),
    [boatStore.boats],
  );

  const form = useScheduleForm({
    isOpen: showAddModal,
    editingSchedule,
    onSuccess: () => setShowAddModal(false),
  });

  const selectedBoat = useMemo(
    () => boatOptions.find((boat) => boat.id === form.formData.boatId),
    [boatOptions, form.formData.boatId],
  );

  const operatorOptions = useMemo(() => {
    if (!selectedBoat) return [];
    return (selectedBoat.operatorIds ?? []).map((operatorId, index) => ({
      id: operatorId,
      name: selectedBoat.operatorNames?.[index] ?? selectedBoat.operatorName,
    }));
  }, [selectedBoat]);

  const routeOptions = useMemo(() => {
    if (!selectedBoat) return [];
    
    const normalize = (str: string) => str.replace(/\s+/g, '').toLowerCase();
    const expectedFareType = getExpectedFareTypeForBoat(selectedBoat.type);
    const allowedRoutes = new Set((selectedBoat.routeNames ?? []).map(normalize));
    return settingsStore.fares.filter(
      (fare) =>
        fare.isActive &&
        fare.type === expectedFareType &&
        allowedRoutes.has(normalize(fare.route)),
    );
  }, [selectedBoat, settingsStore.fares]);

  const selectedFare = useMemo(
    () => routeOptions.find((fare) => fare.id === form.formData.routeFareId),
    [routeOptions, form.formData.routeFareId],
  );

  const selectedOperator = useMemo(
    () => operatorOptions.find((operator) => operator.id === form.formData.operatorId),
    [operatorOptions, form.formData.operatorId],
  );
  const scheduleFieldErrors = form.getFieldErrors(selectedBoat, selectedOperator, selectedFare);

  const routeParts = useMemo(() => {
    if (!selectedFare) {
      return { origin: '-', destination: '-' };
    }

    if (selectedFare.origin && selectedFare.destination) {
      return { origin: selectedFare.origin, destination: selectedFare.destination };
    }

    if (!selectedFare.route) return { origin: '-', destination: '-' };

    const [origin, destination] = selectedFare.route.split('->').map((part) => part.trim());
    return {
      origin: origin || '-',
      destination: destination || '-',
    };
  }, [selectedFare]);

  const visibleDates = useMemo(() => {
    const today = new Date();
    const start = addDays(today, dateWindowOffset * 7);
    return Array.from({ length: 7 }, (_, index) => {
      const value = addDays(start, index);
      const iso = toManilaIsoDate(value);
      const label = new Intl.DateTimeFormat('en-PH', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        timeZone: 'Asia/Manila',
      }).format(value);
      return { iso, label };
    });
  }, [dateWindowOffset]);

  const { setFormData } = form;
  useEffect(() => {
    if (!selectedBoat) return;

    setFormData((prev) => {
      const isCurrentOperatorValid = operatorOptions.some((op) => op.id === prev.operatorId);
      const nextOperatorId = isCurrentOperatorValid ? prev.operatorId : operatorOptions[0]?.id ?? '';

      const isCurrentRouteValid = routeOptions.some((fare) => fare.id === prev.routeFareId);
      const nextRouteFareId = isCurrentRouteValid ? prev.routeFareId : '';

      if (nextOperatorId !== prev.operatorId || nextRouteFareId !== prev.routeFareId) {
        return { ...prev, operatorId: nextOperatorId, routeFareId: nextRouteFareId };
      }

      return prev;
    });
  }, [selectedBoat, operatorOptions, routeOptions, setFormData]);


  const { confirmDiscard, discardDialog } = useUnsavedChangesGuard(form.isDirty);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, pageSize, selectedDate, dateWindowOffset, quickFilter]);

  useEffect(() => {
    if (page > scheduleTotalPages) {
      setPage(scheduleTotalPages);
    }
  }, [page, scheduleTotalPages]);

  const openAddModal = () => {
    setEditingSchedule(null);
    setShowAddModal(true);
  };

  const openEditModal = (schedule: Schedule) => {
    if (isScheduleCompleted(schedule)) {
      form.setFormError('Completed schedules are locked and can no longer be edited.');
      return;
    }
    setEditingSchedule(schedule);
    setShowAddModal(true);
  };

  const handleNextStep = () => {
    form.setFormError(null);
    form.setShowErrors(true);
    if (form.formStep === 1) {
      if (!form.validateStep1(selectedBoat, selectedOperator, selectedFare)) return;
      form.setFormStep(2);
    } else if (form.formStep === 2) {
      if (!form.validateStep2(selectedBoat, selectedOperator, selectedFare)) return;
      form.setFormStep(3);
    }
  };

  const requestCloseModal = async () => {
    if (form.isSubmitting) return;
    if (!(await confirmDiscard())) return;
    setShowAddModal(false);
  };

  const handleFormSave = () => {
    void form.handleSave(selectedBoat, selectedOperator, selectedFare, routeParts);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (isScheduleCompleted(deleteTarget)) {
      setDeleteError('Completed schedules are locked and can no longer be deleted.');
      return;
    }

    setDeleteError(null);
    if (deleteTarget.recurrenceGroupId && deleteScope === 'until' && !deleteUntilDate) {
      setDeleteError('Select an end date for the recurring delete range.');
      return;
    }
    const result = await settingsStore.deleteSchedule(
      deleteTarget.id,
      deleteTarget.recurrenceGroupId
        ? {
            scope: deleteScope,
            untilDate: deleteScope === 'until' ? deleteUntilDate : undefined,
          }
        : undefined,
    );
    if (!result.success) {
      setDeleteError(result.message || 'Failed to delete schedule.');
      return;
    }
    pushBellNotification({
      title: 'Schedule deleted',
      message: 'Schedule has been removed.',
      type: 'system',
      priority: 'low',
    });
    setDeleteTarget(null);
    setDeleteScope('single');
    setDeleteUntilDate('');
  };

  const getScheduleSummary = () => {
    if (!form.formData.departureTime) return 'Set a departure time to see summary.';

    const timeStr = new Date(`2000-01-01T${form.formData.departureTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    const recurrenceLabel = getDetectedPattern(form.formData.selectedDays);
    
    let summary = `${recurrenceLabel} at ${timeStr}`;

    if (form.formData.validUntil) {
      const dateStr = formatDate(form.formData.validUntil);
      const prefix = form.formData.selectedDays.length === 0 ? 'on' : 'until';
      summary += ` ${prefix} ${dateStr}`;
    }
    
    return summary + '.';
  };

  const getDetectedPattern = (days: string[]) => {
    if (days.length === 0) {
      return `One-time Trip`;
    }
    if (days.length === 7) return 'Every Daily';
    if (days.length === 5 && days.every(d => ['Mon','Tue','Wed','Thu','Fri'].includes(d))) return 'Every Weekdays';
    if (days.length === 2 && days.every(d => ['Sat','Sun'].includes(d))) return 'Every Weekends';
    return `Every ${days.join(', ')}`;
  };

  const toggleDay = (day: string) => {
    form.setFormData((prev) => {
      const current = prev.selectedDays;
      const exists = current.includes(day);
      const next = exists ? current.filter((d) => d !== day) : [...current, day];
      // Sort based on DAYS_OF_WEEK order
      next.sort((a, b) => DAYS_OF_WEEK_VALUES.indexOf(a) - DAYS_OF_WEEK_VALUES.indexOf(b));
      return { ...prev, selectedDays: next };
    });
  };

  const handleTimeChange = (type: 'departure' | 'arrival', part: 'hour' | 'minute' | 'period', value: string) => {
    form.setFormData((prev) => {
      const current = type === 'departure' ? prev.departureTime : prev.arrivalTime;
      const [h24Str, mStr] = (current || '00:00').split(':');
      const h24 = parseInt(h24Str, 10);
      const period = h24 >= 12 ? 'PM' : 'AM';
      let h12 = h24 % 12;
      if (h12 === 0) h12 = 12;

      let newH12 = h12;
      let newM = mStr;
      let newPeriod = period;

      if (part === 'hour') newH12 = parseInt(value, 10);
      if (part === 'minute') newM = value;
      if (part === 'period') newPeriod = value;

      let newH24 = newH12;
      if (newPeriod === 'PM' && newH12 !== 12) newH24 += 12;
      if (newPeriod === 'AM' && newH12 === 12) newH24 = 0;

      const newTime = `${newH24.toString().padStart(2, '0')}:${newM}`;

      if (type === 'departure') return { ...prev, departureTime: newTime };
      return { ...prev, arrivalTime: newTime };
    });
  };

  const get12HourParts = (time24: string) => {
    const [h, m] = (time24 || '00:00').split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    let hour = h % 12;
    if (hour === 0) hour = 12;
    return {
      hour: hour.toString().padStart(2, '0'),
      minute: m.toString().padStart(2, '0'),
      period
    };
  };

  const handleSelectAllDays = () => {
    form.setFormData((prev) => ({ ...prev, selectedDays: [...DAYS_OF_WEEK_VALUES] }));
  };

  const handleClearDays = () => {
    form.setFormData((prev) => ({ ...prev, selectedDays: [] }));
  };

  const handleSelectCalendarDate = (date: string) => {
    setSelectedDate(date);
    setDateWindowOffset(getDateWindowOffset(date));
  };

  const handleCalendarRangeChange = useCallback((range: { from: string; to: string }) => {
    const requestId = ++calendarRequestIdRef.current;
    setCalendarAvailabilityMap({});
    void settingsStore.getScheduleCalendarCounts({
      from: range.from,
      to: range.to,
      q: searchQuery.trim() || undefined,
      status: statusFilter,
      mode: 'trips',
    }).then((counts) => {
      if (calendarRequestIdRef.current !== requestId) return;
      setCalendarAvailabilityMap(counts);
    }).catch(() => {
      if (calendarRequestIdRef.current !== requestId) return;
      setCalendarAvailabilityMap({});
    });
  }, [searchQuery, settingsStore, statusFilter]);

  const selectedDayRows = useMemo(() => {
    if (!selectedDate) return schedulePageRows;
    return schedulePageRows.filter(({ schedule }) => getScheduleDateKey(schedule.departureDatetime) === selectedDate);
  }, [schedulePageRows, selectedDate]);

  const visibleScheduleRows = useMemo(() => {
    const todayKey = toManilaIsoDate(new Date());
    return schedulePageRows.filter(({ schedule, runtimeStatus, displayStatus }) => {
      if (quickFilter === 'today' && getScheduleDateKey(schedule.departureDatetime) !== todayKey) return false;
      if (quickFilter === 'banca' && schedule.boatType?.trim().toLowerCase() === 'cargo') return false;
      if (quickFilter === 'cargo' && schedule.boatType?.trim().toLowerCase() !== 'cargo') return false;
      if (quickFilter === 'live' && runtimeStatus !== 'in_progress') return false;
      if (quickFilter === 'delayed' && displayStatus !== 'delayed') return false;
      return true;
    });
  }, [quickFilter, schedulePageRows]);

  const scheduleStatusSummary = useMemo(
    () => ({
      scheduled: visibleScheduleRows.filter((row) => ['upcoming', 'preparing', 'boarding', 'final_call'].includes(row.displayStatus)).length,
      delayed: visibleScheduleRows.filter((row) => row.displayStatus === 'delayed').length,
      live: visibleScheduleRows.filter((row) => ['in_progress', 'departure', 'in_transit', 'out_for_delivery'].includes(row.displayStatus)).length,
      completed: visibleScheduleRows.filter((row) => ['completed', 'arrived', 'delivered'].includes(row.displayStatus)).length,
    }),
    [visibleScheduleRows],
  );

  const selectedDateLabel = useMemo(() => formatSelectedDateLabel(selectedDate), [selectedDate]);

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
          <div className="space-y-2.5">
            <span className="inline-flex w-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              Schedule Desk
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Schedule Management</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                Trip planning board for route, operator, and vessel assignment
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">Window Total</p>
              <p className="mt-1 text-xl font-semibold text-sky-900 dark:text-sky-50">{scheduleTotalItems}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Current result set</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-emerald-200/70 bg-emerald-50/90 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">Selected Day</p>
              <p className="mt-1 text-xl font-semibold text-emerald-900 dark:text-emerald-50">
                {selectedDayRows.length}
              </p>
              <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{selectedDateLabel}</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-amber-200/70 bg-amber-50/90 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">Live Now</p>
              <p className="mt-1 text-xl font-semibold text-amber-900 dark:text-amber-50">
                {schedulePageRows.filter((row) => row.runtimeStatus === 'in_progress').length}
              </p>
              <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Trips already in motion</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr),320px]">
        <div className="space-y-4">
          <Card className="border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
            <CardContent className="p-4">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Schedule Dates</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCalendarOpen(true)}
                    className="h-7 px-2 text-xs"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    Calendar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate('')}
                    className="h-7 px-2 text-xs"
                  >
                    All dates
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDateWindowOffset((prev) => prev - 1)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {visibleDates.map((item) => {
                    const availability = dateAvailabilityMap[item.iso] || 0;
                    const active = selectedDate === item.iso;
                    const availabilityTone = availability === 0
                      ? (active ? 'text-rose-100' : 'text-rose-600 dark:text-rose-300')
                      : availability <= 2
                        ? (active ? 'text-amber-100' : 'text-amber-600 dark:text-amber-300')
                        : (active ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-300');
                    return (
                      <button
                        key={item.iso}
                        type="button"
                        onClick={() => setSelectedDate(item.iso)}
                        className={`rounded-xl border px-2 py-2 text-left text-xs transition ${
                          active
                            ? 'border-blue-500 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="block font-semibold">{item.label}</span>
                        <span className={`mt-1 block text-[11px] font-semibold ${availabilityTone}`}>
                          {availability} available
                        </span>
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDateWindowOffset((prev) => prev + 1)}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_220px_140px]">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search route, boat, operator, origin, destination..."
                className="h-10 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              />
              <Select
                value={statusFilter}
                onValueChange={(value: 'active' | 'all' | 'upcoming' | 'in_progress' | 'completed') => setStatusFilter(value)}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Rows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 rows</SelectItem>
                  <SelectItem value="25">25 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-gray-500">
              Showing {visibleScheduleRows.length} of {schedulePageRows.length} schedule{schedulePageRows.length === 1 ? '' : 's'} on this page
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  {([
                    ['all', 'All'],
                    ['today', 'Today'],
                    ['banca', 'Banca'],
                    ['cargo', 'Cargo'],
                    ['live', 'Live'],
                    ['delayed', 'Delayed'],
                  ] as Array<[ScheduleQuickFilter, string]>).map(([value, label]) => (
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
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
                  {scheduleStatusSummary.scheduled} scheduled
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  {scheduleStatusSummary.delayed} delayed
                </span>
                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-200">
                  {scheduleStatusSummary.live} live now
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {scheduleStatusSummary.completed} completed
                </span>
              </div>
            </div>

            {visibleScheduleRows.length === 0 ? (
              <div className="rounded-lg border border-dashed"><Table><TableBody><EmptyStateRow colSpan={7} message="No schedules matched your filters." /></TableBody></Table></div>
            ) : (
              <>
                <div className="overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-20 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-900/95 dark:text-slate-300">Route</TableHead>
                      <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Vessel</TableHead>
                      <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Operator</TableHead>
                      <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Trip Window</TableHead>
                      <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Status</TableHead>
                      <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleScheduleRows.map(({ schedule, runtimeStatus, displayStatus }) => (
                      <TableRow
                        key={schedule.id}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-sky-50/70 dark:hover:bg-slate-900/75',
                          rowDensity === 'compact' ? 'h-14' : 'h-[72px]',
                        )}
                        onClick={() => setSelectedScheduleDetails({ schedule, runtimeStatus, displayStatus })}
                      >
                        <TableCell className={cn('sticky left-0 z-10 bg-white dark:bg-slate-950/40', rowDensity === 'compact' ? 'py-2.5' : 'py-4')}>
                          <div className="font-semibold">{simplifyLocationName(schedule.origin)} {'->'} {simplifyLocationName(schedule.destination)}</div>
                          <div className="text-xs text-gray-500">{schedule.route}</div>
                        </TableCell>
                        <TableCell className={rowDensity === 'compact' ? 'py-2.5' : 'py-4'}>
                          <div className="font-semibold">{schedule.boatName ?? '-'}</div>
                          <div className="text-xs uppercase tracking-[0.16em] text-gray-500">{schedule.boatType ?? '-'}</div>
                        </TableCell>
                        <TableCell className={rowDensity === 'compact' ? 'py-2.5' : 'py-4'}>
                          <div className="max-w-[180px] truncate">{schedule.operatorName ?? '-'}</div>
                        </TableCell>
                        <TableCell className={rowDensity === 'compact' ? 'py-2.5' : 'py-4'}>
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{formatDateTime(schedule.departureDatetime)}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{formatDateTime(schedule.arrivalDatetime)}</div>
                        </TableCell>
                        <TableCell className={rowDensity === 'compact' ? 'py-2.5' : 'py-4'}>
                          {renderScheduleStatusBadge(displayStatus)}
                        </TableCell>
                        <TableCell className={rowDensity === 'compact' ? 'py-2.5' : 'py-4'} onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(schedule)}
                              disabled={runtimeStatus === 'completed'}
                              className="text-blue-600 hover:text-blue-700"
                              title={runtimeStatus === 'completed' ? 'Completed schedule cannot be edited.' : 'Edit schedule'}
                              aria-label="Edit schedule"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteScope('single');
                                setDeleteUntilDate(getScheduleDateKey(schedule.departureDatetime));
                                setDeleteTarget(schedule);
                              }}
                              disabled={runtimeStatus === 'completed'}
                              className="text-red-600 hover:text-red-700"
                              title={runtimeStatus === 'completed' ? 'Completed schedule cannot be deleted.' : 'Delete schedule'}
                              aria-label="Delete schedule"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>

                <div className="flex items-center justify-between pt-2 text-sm">
                  <span className="text-gray-500">
                    Page {page} of {scheduleTotalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((prev) => Math.min(scheduleTotalPages, prev + 1))}
                      disabled={page >= scheduleTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-slate-200/70 bg-white/92 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
            <div className="space-y-3">
              <div className="space-y-1">
                <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Dispatch Queue</CardTitle>
                <CardDescription>Boat, operator, route, and trip window stay aligned here.</CardDescription>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                    Registered vessels only
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {selectedDateLabel}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button className="h-10 gap-2 rounded-xl" variant="outline" onClick={() => window.location.hash = '/payment-verification'}>
                  <ClipboardCheck className="h-4 w-4" />
                  Go To Verification
                </Button>
                <Button onClick={openAddModal} className="h-10 gap-2 rounded-xl">
                  <Plus className="h-4 w-4" />
                  Add Schedule
                </Button>
              </div>
            </div>
          </Card>

          <Card className="border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-900 dark:text-slate-100">Dispatch Snapshot</CardTitle>
              <CardDescription>Current queue state and planning context</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Selected Day</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedDateLabel}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Quick Filter</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-slate-900 dark:text-slate-100">{quickFilter}</p>
                </div>
              </div>
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Dispatch Notes</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">This board favors active planning. Live and delayed filters help you isolate schedules that need immediate attention.</p>
              </div>
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Queue Focus</p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
                    {visibleScheduleRows.length} visible
                  </span>
                  <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-200">
                    {scheduleStatusSummary.live} live
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    {scheduleStatusSummary.delayed} delayed
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showAddModal} onOpenChange={(open) => {
        if (open) {
          setShowAddModal(true);
          return;
        }
        void requestCloseModal();
      }}>
        <DialogContent className={cn("max-h-[90vh] overflow-hidden border-slate-200 bg-white p-0 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:max-w-[940px]", form.isShaking && "animate-shake")}>
          <DialogHeader className="border-b border-slate-100 px-6 pb-5 pt-6 dark:border-white/10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                  {editingSchedule ? 'Edit Schedule' : 'Create Scheduled Trip'}
                </DialogTitle>
                <DialogDescription className="mt-2 max-w-2xl text-slate-500 dark:text-slate-300">Boat, operator, route, departure, arrival.</DialogDescription>
              </div>
            </div>
            {/* Visual Stepper */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 flex-1 rounded-full transition-colors", form.formStep >= 1 ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700")} />
                  <div className={cn("h-2 flex-1 rounded-full transition-colors", form.formStep >= 2 ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700")} />
                  <div className={cn("h-2 flex-1 rounded-full transition-colors", form.formStep >= 3 ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700")} />
                </div>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Step {form.formStep} of 3</span>
            </div>
          </DialogHeader>

          <div
            className="schedule-modal-scroll max-h-[calc(90vh-170px)] space-y-5 overflow-y-auto px-6 py-5"
            style={{ scrollbarGutter: 'stable' }}
          >
            <div className="space-y-5">
              {form.formStep === 1 && (
                <>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 dark:border-white/10 dark:bg-white/5 dark:shadow-[0_18px_50px_rgba(15,23,42,0.32)] dark:backdrop-blur">
                  <div className="mb-4 flex items-center gap-2">
                    <Ship className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Trip Source</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="boatId" className="text-slate-600 dark:text-slate-200">Boat <span className="text-red-500">*</span></Label>
                      <Button
                        type="button"
                        title={form.showErrors && scheduleFieldErrors.boatId ? scheduleFieldErrors.boatId : undefined}
                        variant="outline"
                        onClick={() => setBoatPickerOpen(true)}
                        className={cn(
                          "h-12 w-full justify-between rounded-2xl border text-left transition-colors",
                          "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                          "dark:border-white/15 dark:bg-slate-950/50 dark:text-white dark:hover:bg-white/10",
                          selectedBoat && "border-sky-500/50 bg-sky-50 dark:bg-sky-500/10",
                          form.showErrors && scheduleFieldErrors.boatId && "border-red-500 focus-visible:ring-red-500"
                        )}
                      >
                        <span className="truncate flex items-center gap-2">
                          {selectedBoat && <CheckCircle2 className="h-4 w-4 text-sky-400" />}
                          {selectedBoat
                            ? selectedBoat.name
                            : 'Select boat from Boat Management'}
                        </span>
                        <span className="ml-2 text-xs text-slate-400 dark:text-slate-300">Pick</span>
                      </Button>
                      {form.showErrors && scheduleFieldErrors.boatId && (
                        <p className="text-xs text-rose-400">{scheduleFieldErrors.boatId}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="operatorId" className="text-slate-600 dark:text-slate-200">Assigned Operator <span className="text-red-500">*</span></Label>
                      <Button
                        type="button"
                        title={form.showErrors && scheduleFieldErrors.operatorId ? scheduleFieldErrors.operatorId : undefined}
                        variant="outline"
                        onClick={() => selectedBoat && setOperatorPickerOpen(true)}
                        disabled={!selectedBoat || operatorOptions.length === 0}
                        className={cn(
                          "h-12 w-full justify-between rounded-2xl border text-left transition-colors disabled:opacity-60",
                          "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                          "dark:border-white/15 dark:bg-slate-950/50 dark:text-white dark:hover:bg-white/10",
                          selectedOperator && "border-violet-500/50 bg-violet-50 dark:bg-violet-500/10",
                          form.showErrors && scheduleFieldErrors.operatorId && "border-red-500 focus-visible:ring-red-500"
                        )}
                      >
                        <span className="truncate flex items-center gap-2">
                          {selectedOperator && <CheckCircle2 className="h-4 w-4 text-violet-400" />}
                          {!selectedBoat
                            ? 'Select boat first'
                            : selectedOperator?.name ?? 'Select assigned operator'}
                        </span>
                        <span className="ml-2 text-xs text-slate-400 dark:text-slate-300">Pick</span>
                      </Button>
                      {selectedBoat && operatorOptions.length === 0 && (
                        <p className="text-xs text-amber-300">This boat has no assigned operators yet.</p>
                      )}
                      {form.showErrors && scheduleFieldErrors.operatorId && (
                        <p className="text-xs text-rose-400">{scheduleFieldErrors.operatorId}</p>
                      )}
                    </div>
                  </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 dark:border-white/10 dark:bg-white/5 dark:shadow-[0_18px_50px_rgba(15,23,42,0.32)] dark:backdrop-blur">
                  <div className="mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Route Assignment</p>
                  </div>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="routeFareId" className="text-slate-600 dark:text-slate-200">Route <span className="text-red-500">*</span></Label>
                      <Button
                        type="button"
                        title={form.showErrors && scheduleFieldErrors.routeFareId ? scheduleFieldErrors.routeFareId : undefined}
                        variant="outline"
                        onClick={() => selectedBoat && setRoutePickerOpen(true)}
                        disabled={!selectedBoat || routeOptions.length === 0}
                        className={cn(
                          "h-12 w-full justify-between rounded-2xl border text-left transition-colors disabled:opacity-60",
                          "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                          "dark:border-white/15 dark:bg-slate-950/50 dark:text-white dark:hover:bg-white/10",
                          selectedFare && "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10",
                          form.showErrors && scheduleFieldErrors.routeFareId && "border-red-500 focus-visible:ring-red-500"
                        )}
                      >
                        <span className="truncate flex items-center gap-2">
                          {selectedFare && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                          {!selectedBoat ? 'Select boat first' : selectedFare ? `${selectedFare.fareName} | ${selectedFare.route} | ${formatPrice(calculateTotalFare(selectedFare))}` : 'Select route'}
                        </span>
                        <span className="ml-2 text-xs text-slate-400 dark:text-slate-300">Pick</span>
                      </Button>
                      {selectedBoat && routeOptions.length === 0 && (
                        <p className="text-xs text-amber-300">This boat has no routes assigned yet in Boat Management.</p>
                      )}
                      {form.showErrors && scheduleFieldErrors.routeFareId && (
                        <p className="text-xs text-rose-400">{scheduleFieldErrors.routeFareId}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950/40">
                    <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 dark:bg-white/5">
                      <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {selectedBoat?.type === 'cargo' ? 'Weight Limit' : 'Capacity'}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedBoat?.capacity ?? '-'}
                        {selectedBoat?.capacity ? (selectedBoat.type === 'cargo' ? ' kg' : ' pax') : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 dark:bg-white/5">
                      <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</span>
                      <span className="font-semibold capitalize text-slate-900 dark:text-white">{selectedBoat?.type ?? '-'}</span>
                    </div>
                  </div>
                  </div>
                </>
              )}

              {form.formStep === 2 && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 dark:border-white/10 dark:bg-white/5 dark:shadow-[0_18px_50px_rgba(15,23,42,0.32)] dark:backdrop-blur">
                  <div className="mb-4 flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Trip Timing</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950/40">
                      <Label htmlFor="departureTime" className={cn("text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400", form.showErrors && scheduleFieldErrors.departureTime && "text-red-500")}>
                        Departure Time
                      </Label>
                      {(() => {
                        const { hour, minute, period } = get12HourParts(form.formData.departureTime);
                        return (
                      <div className="mt-2 flex gap-2">
                        <Select
                          value={hour}
                          onValueChange={(v) => handleTimeChange('departure', 'hour', v)}
                        >
                          <SelectTrigger className={cn("h-10 border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950/50 dark:text-white", form.showErrors && scheduleFieldErrors.departureTime && "border-red-500 focus:ring-red-500")}><SelectValue /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <span className="self-center text-slate-400 dark:text-slate-500">:</span>
                        <Select
                          value={minute}
                          onValueChange={(v) => handleTimeChange('departure', 'minute', v)}
                        >
                          <SelectTrigger className={cn("h-10 border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950/50 dark:text-white", form.showErrors && scheduleFieldErrors.departureTime && "border-red-500 focus:ring-red-500")}><SelectValue /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            {MINUTES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select
                          value={period}
                          onValueChange={(v) => handleTimeChange('departure', 'period', v)}
                        >
                          <SelectTrigger className={cn("h-10 w-[70px] border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950/50 dark:text-white", form.showErrors && scheduleFieldErrors.departureTime && "border-red-500 focus:ring-red-500")}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PERIODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                        );
                      })()}
                      {form.showErrors && scheduleFieldErrors.departureTime && (
                        <p className="mt-2 text-xs text-rose-400">{scheduleFieldErrors.departureTime}</p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950/40">
                      <Label htmlFor="arrivalTime" className={cn("text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400", form.showErrors && scheduleFieldErrors.arrivalTime && "text-red-500")}>
                        Arrival Time
                      </Label>
                      {(() => {
                        const { hour, minute, period } = get12HourParts(form.formData.arrivalTime);
                        return (
                      <div className="mt-2 flex gap-2">
                        <Select
                          value={hour}
                          onValueChange={(v) => handleTimeChange('arrival', 'hour', v)}
                        >
                          <SelectTrigger className={cn("h-10 border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950/50 dark:text-white", form.showErrors && scheduleFieldErrors.arrivalTime && "border-red-500 focus:ring-red-500")}><SelectValue /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <span className="self-center text-slate-400 dark:text-slate-500">:</span>
                        <Select
                          value={minute}
                          onValueChange={(v) => handleTimeChange('arrival', 'minute', v)}
                        >
                          <SelectTrigger className={cn("h-10 border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950/50 dark:text-white", form.showErrors && scheduleFieldErrors.arrivalTime && "border-red-500 focus:ring-red-500")}><SelectValue /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            {MINUTES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select
                          value={period}
                          onValueChange={(v) => handleTimeChange('arrival', 'period', v)}
                        >
                          <SelectTrigger className={cn("h-10 w-[70px] border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950/50 dark:text-white", form.showErrors && scheduleFieldErrors.arrivalTime && "border-red-500 focus:ring-red-500")}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PERIODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                        );
                      })()}
                      {form.showErrors && scheduleFieldErrors.arrivalTime && (
                        <p className="mt-2 text-xs text-rose-400">{scheduleFieldErrors.arrivalTime}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Select Days
                      </Label>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={handleSelectAllDays} className="text-[10px] font-bold uppercase tracking-wider text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300">Select All</button>
                        <button type="button" onClick={handleClearDays} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300">Clear</button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                        {DAYS_OF_WEEK_VALUES.map((dayValue, index) => {
                          const isSelected = form.formData.selectedDays.includes(dayValue);
                          const dayLabel = DAYS_OF_WEEK_LABELS[index];
                          return (
                        <button
                          key={dayValue}
                          type="button"
                          onClick={() => toggleDay(dayValue)}
                          className={cn(
                            'flex h-12 min-w-[100px] items-center justify-center rounded-xl border px-3 text-sm font-bold transition-all shadow-sm hover:shadow-md',
                            isSelected
                              ? 'border-sky-500 bg-sky-500 text-white shadow-sky-500/20 scale-105 dark:text-slate-950 dark:shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                          )}
                          title={`Repeat every ${dayLabel}`}
                        >
                          {dayLabel}
                        </button>
                          );
                        })}
                    </div>
                    <p className="mt-3 text-right text-[11px] font-medium text-sky-600 dark:text-sky-400">
                      {getDetectedPattern(form.formData.selectedDays)}
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/40">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarDays className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                      <Label htmlFor="validUntil" className={cn("text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400", form.showErrors && scheduleFieldErrors.validUntil && "text-red-500")}>
                        {form.formData.selectedDays.length === 0 ? 'Select Trip Date' : 'Repeat Until Date'}
                      </Label>
                    </div>
                    <div className="relative mt-3">
                      <Input
                        id="validUntil"
                        type="date"
                        title={form.showErrors && scheduleFieldErrors.validUntil ? scheduleFieldErrors.validUntil : undefined}
                        value={form.formData.validUntil}
                        onChange={(e) => form.setFormData((prev) => ({ ...prev, validUntil: e.target.value }))}
                        className="absolute inset-0 z-10 h-12 w-full opacity-0 cursor-pointer"
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker();
                          } catch { /* no-op */ }
                        }}
                      />
                      <div className={cn(
                        "flex h-12 w-full items-center rounded-2xl border border-slate-200 bg-white px-3 text-base text-slate-900 transition-colors dark:border-white/15 dark:bg-slate-950/50 dark:text-white",
                        !form.formData.validUntil && "text-slate-500 dark:text-slate-400",
                        form.showErrors && scheduleFieldErrors.validUntil && "border-red-500"
                      )}>
                        {form.formData.validUntil ? formatDate(form.formData.validUntil) : 'Pick a date'}
                      </div>
                    </div>
                    {form.showErrors && scheduleFieldErrors.validUntil && (
                      <p className="mt-2 text-xs text-rose-400">{scheduleFieldErrors.validUntil}</p>
                    )}
                  </div>

                </div>
              )}

              {form.formStep === 3 && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5 dark:border-white/10 dark:bg-white/5 dark:shadow-[0_18px_50px_rgba(15,23,42,0.32)] dark:backdrop-blur">
                  <div className="mb-4 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Review & Notes</p>
                  </div>

                  {/* Live Summary Box */}
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-sky-100 p-1.5 dark:bg-sky-500/20">
                        <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Schedule Summary</p>
                        <p className="mt-1 text-sm text-slate-700 dark:text-sky-100">
                          {getScheduleSummary()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor="notes" className="text-slate-600 dark:text-slate-200">Notes (Optional)</Label>
                    <textarea
                      id="notes"
                      value={form.formData.notes}
                      onChange={(e) => form.setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      className="min-h-[80px] w-full rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:border-white/15 dark:bg-slate-950/50 dark:text-white"
                      placeholder="Add notes for this schedule..."
                    />
                  </div>
                </div>
              )}
            </div>

            {form.formError && <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{form.formError}</p>}
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-slate-100 bg-white/80 px-6 py-4 backdrop-blur sm:justify-between dark:border-white/10 dark:bg-slate-950/80">
            <div className="flex items-center">
              {form.formStep > 1 && (
                <Button
                  variant="outline"
                  onClick={() => { form.setFormError(null); form.setFormStep((prev) => (prev - 1) as 1 | 2); }}
                  disabled={form.isSubmitting}
                  className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => void requestCloseModal()}
                disabled={form.isSubmitting}
                className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                Cancel
              </Button>
              {form.formStep < 3 ? (
                <Button
                  onClick={handleNextStep}
                  disabled={form.isSubmitting}
                  className="min-w-[190px] bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                >
                  {form.formStep === 1 ? 'Next: Timing' : 'Next: Review'}
                </Button>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  {!editingSchedule && form.estimatedTripCount > 1 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      This will generate {form.estimatedTripCount} schedule entries.
                    </p>
                  )}
                  <Button
                    onClick={handleFormSave}
                    disabled={form.isSubmitting}
                    className="min-w-[190px] bg-sky-600 text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-80 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                  >
                    {form.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingSchedule
                          ? 'Updating...'
                          : form.batchProgress.isRunning && form.batchProgress.totalCount > 1
                            ? `Creating ${form.batchProgress.processedCount} / ${form.batchProgress.totalCount} trips...`
                            : form.estimatedTripCount > 1
                              ? `Creating ${form.estimatedTripCount} trips...`
                              : 'Creating...'}
                      </>
                    ) : (
                      editingSchedule ? 'Update Schedule' : 'Create Schedule'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BatchProgressDialog
        open={form.batchProgress.isOpen}
        isRunning={form.batchProgress.isRunning}
        processedCount={form.batchProgress.processedCount}
        totalCount={form.batchProgress.totalCount}
        successCount={form.batchProgress.successCount}
        failureCount={form.batchProgress.failureCount}
        progressPercent={form.batchProgress.progressPercent}
        title="Creating scheduled trips"
        description={
          form.batchProgress.isRunning
            ? `Creating ${form.batchProgress.processedCount} of ${form.batchProgress.totalCount} trips.`
            : form.batchProgress.failureCount > 0
              ? `${form.batchProgress.successCount} of ${form.batchProgress.totalCount} trips were created.`
              : `${form.batchProgress.totalCount} trips were created successfully.`
        }
        itemLabel="trips"
        failures={form.batchProgress.failures.map((failure) => ({
          index: failure.index,
          message: failure.message,
        }))}
        onClose={form.dismissBatchProgress}
      />

      <AvailabilityCalendarDialog
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        title="Schedule Calendar"
        description="Review how many scheduled trips are available on each date."
        countLabel="trips"
        selectedDate={selectedDate}
        availabilityMap={calendarAvailabilityMap}
        onSelectDate={handleSelectCalendarDate}
        onVisibleRangeChange={handleCalendarRangeChange}
      />

      <BoatPickerDialog
        open={boatPickerOpen}
        onOpenChange={setBoatPickerOpen}
        boats={boatOptions}
        onSelect={(boat) => {
          const defaultOperatorId = (boat.operatorIds && boat.operatorIds.length > 0) ? boat.operatorIds[0] : '';
          form.setFormData((prev) => ({
            ...prev,
            boatId: boat.id,
            operatorId: defaultOperatorId,
            routeFareId: '',
          }));
          setBoatPickerOpen(false);
        }}
      />

      <OperatorPickerDialog
        open={operatorPickerOpen}
        onOpenChange={setOperatorPickerOpen}
        operators={operatorOptions}
        boatName={selectedBoat?.name}
        onSelect={(operator) => {
          form.setFormData((prev) => ({ ...prev, operatorId: operator.id }));
          setOperatorPickerOpen(false);
        }}
      />

      <RoutePickerDialog
        open={routePickerOpen}
        onOpenChange={setRoutePickerOpen}
        routes={routeOptions}
        boatName={selectedBoat?.name}
        onSelect={(fare) => {
          form.setFormData((prev) => ({ ...prev, routeFareId: fare.id }));
          setRoutePickerOpen(false);
        }}
      />

      {discardDialog}

      <Dialog open={Boolean(selectedScheduleDetails)} onOpenChange={(open) => !open && setSelectedScheduleDetails(null)}>
        <DialogContent className="gap-2 border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 p-0 text-slate-100 sm:left-auto sm:right-4 sm:top-4 sm:h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-2rem)] sm:w-[min(92vw,820px)] sm:max-w-[820px] sm:translate-x-0 sm:translate-y-0 sm:rounded-[28px]">
          <DialogHeader className="space-y-0 border-b border-slate-800 px-6 pb-2 pt-3">
            <DialogTitle>Schedule Details</DialogTitle>
            <DialogDescription className="text-slate-300">
              {selectedScheduleDetails ? selectedScheduleDetails.schedule.route : 'Scheduled trip details'}
            </DialogDescription>
          </DialogHeader>

          {selectedScheduleDetails && (
            <div className="space-y-4 overflow-y-auto px-6 pb-5 pt-0">
              <div className="rounded-[26px] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl border border-sky-500/30 bg-sky-500/12 text-sky-200">
                      <Ship className="h-6 w-6" />
                    </span>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/80">
                          {selectedScheduleDetails.schedule.boatType === 'cargo' ? 'Cargo Dispatch' : 'Banca Dispatch'}
                        </p>
                        <h3 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                          {simplifyLocationName(selectedScheduleDetails.schedule.origin)} {'->'} {simplifyLocationName(selectedScheduleDetails.schedule.destination)}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                          {selectedScheduleDetails.schedule.boatName ?? 'Unassigned vessel'}
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] font-medium text-slate-300">
                          {selectedScheduleDetails.schedule.operatorName ?? 'No operator'}
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] font-medium text-slate-300">
                          {selectedScheduleDetails.schedule.boatType ?? 'Boat'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Dispatch State</p>
                    <div className="mt-2 flex justify-end">{renderScheduleStatusBadge(selectedScheduleDetails.displayStatus)}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Vessel</p>
                      <p className="mt-2 text-xl font-semibold text-slate-50">{selectedScheduleDetails.schedule.boatName ?? '-'}</p>
                      <p className="mt-1 text-xs text-slate-400">{selectedScheduleDetails.schedule.boatType ?? 'Boat assignment'}</p>
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-200">
                      <Ship className="h-4 w-4" />
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Operator</p>
                      <p className="mt-2 text-xl font-semibold text-slate-50">{selectedScheduleDetails.schedule.operatorName ?? '-'}</p>
                      <p className="mt-1 text-xs text-slate-400">Assigned dispatcher</p>
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-200">
                      <ClipboardList className="h-4 w-4" />
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Departure</p>
                      <p className="mt-2 text-xl font-semibold text-slate-50">{formatDateTime(selectedScheduleDetails.schedule.departureDatetime)}</p>
                      <p className="mt-1 text-xs text-slate-400">Boarding start</p>
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-200">
                      <Calendar className="h-4 w-4" />
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Arrival</p>
                      <p className="mt-2 text-xl font-semibold text-slate-50">{formatDateTime(selectedScheduleDetails.schedule.arrivalDatetime)}</p>
                      <p className="mt-1 text-xs text-slate-400">Expected completion</p>
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
                      <Clock3 className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.12fr,0.88fr]">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Route & Window</p>
                  <p className="mt-3 text-xl font-semibold text-slate-50">
                    {simplifyLocationName(selectedScheduleDetails.schedule.origin)} {'->'} {simplifyLocationName(selectedScheduleDetails.schedule.destination)}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{selectedScheduleDetails.schedule.route}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Departure</p>
                      <p className="mt-2 text-sm font-semibold text-slate-100">{formatDateTime(selectedScheduleDetails.schedule.departureDatetime)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Arrival</p>
                      <p className="mt-2 text-sm font-semibold text-slate-100">{formatDateTime(selectedScheduleDetails.schedule.arrivalDatetime)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                  <div className="grid gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Runtime State</p>
                      <p className="mt-2 font-semibold capitalize text-slate-100">{selectedScheduleDetails.runtimeStatus.replaceAll('_', ' ')}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Schedule ID</p>
                      <p className="mt-2 break-all font-semibold text-slate-100">{selectedScheduleDetails.schedule.id}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Dispatch View</p>
                      <p className="mt-2 text-sm text-slate-300">
                        {selectedScheduleDetails.displayStatus === 'delayed'
                          ? 'Needs attention'
                          : selectedScheduleDetails.runtimeStatus === 'in_progress'
                            ? 'Trip is active'
                            : selectedScheduleDetails.runtimeStatus === 'completed'
                              ? 'Trip window closed'
                              : 'Waiting for dispatch'}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedScheduleDetails.schedule.notes && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 lg:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Notes</p>
                    <p className="mt-2 text-sm text-slate-300">{selectedScheduleDetails.schedule.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
            setDeleteScope('single');
            setDeleteUntilDate('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
            <DialogDescription>
              This will remove the schedule for <strong>{deleteTarget?.route || 'this route'}</strong>. Bookings tied to this
              schedule may be affected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm text-slate-600">
            <p><strong>Boat:</strong> {deleteTarget?.boatName || '-'}</p>
            <p><strong>Departure:</strong> {formatDateTime(deleteTarget?.departureDatetime)}</p>
            {deleteTarget?.recurrenceGroupId && (
              <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                <div className="space-y-1">
                  <Label htmlFor="deleteScope">Delete Scope</Label>
                  <Select value={deleteScope} onValueChange={(value: 'single' | 'future' | 'until') => setDeleteScope(value)}>
                    <SelectTrigger id="deleteScope">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">This trip only</SelectItem>
                      <SelectItem value="future">This and following trips</SelectItem>
                      <SelectItem value="until">This trip until date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {deleteScope === 'until' && (
                  <div className="space-y-1">
                    <Label htmlFor="deleteUntilDate">Delete Until Date</Label>
                    <Input
                      id="deleteUntilDate"
                      type="date"
                      value={deleteUntilDate}
                      onChange={(event) => setDeleteUntilDate(event.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
            {deleteTarget?.notes && <p><strong>Notes:</strong> {deleteTarget.notes}</p>}
            {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
                setDeleteScope('single');
                setDeleteUntilDate('');
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>
              Delete Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
});

export default SchedulesPage;
