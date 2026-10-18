import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import Layout from '@/components/Layout';
import { useBoatStore, useBookingStore, useSettingsStore } from '@/stores';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AvailabilityCalendarDialog from '@/components/AvailabilityCalendarDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleGauge,
  Download,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  Package2,
  Phone,
  Route,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
  Weight,
} from 'lucide-react';
import type { BancaTripStatus, Boat, CargoTripStatus } from '@/types';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { showErrorToast, showSuccessToast, showWarningToast } from '@/lib/toast-helpers';
import { cn } from '@/lib/utils';

type MainTab = 'banca' | 'cargo' | 'cluster';
type ClusterTab = 'banca' | 'cargo';
type ReportFormat = 'pdf' | 'excel';
type RowDensity = 'comfortable' | 'compact';
type TrackingQuickFilter = 'all' | 'today' | 'delayed' | 'with_bookings' | 'active_now';
type DisplayTripStatus =
  | 'scheduled'
  | 'delayed'
  | 'boarding'
  | 'final_call'
  | 'departed'
  | 'in_transit'
  | 'arrived'
  | 'completed'
  | 'cancelled'
  | 'maintenance'
  | 'out_for_delivery'
  | 'delivered';

type TrackingBoat = Boat & {
  tripStatus: BancaTripStatus | CargoTripStatus;
  tripStatusReason?: string;
  tripStatusEta?: string;
  displayTripStatus: DisplayTripStatus;
  normalizedType: 'banca' | 'cargo';
};

const BANCA_STATUS_GROUPS: Array<{ label: string; items: BancaTripStatus[] }> = [
  { label: 'Operational', items: ['preparing', 'delayed', 'arrived'] },
  { label: 'Terminal', items: ['completed', 'cancelled'] },
  { label: 'Service', items: ['maintenance'] },
];

const CARGO_STATUS_GROUPS: Array<{ label: string; items: CargoTripStatus[] }> = [
  { label: 'Operational', items: ['preparing', 'delayed'] },
  { label: 'Terminal', items: ['completed', 'cancelled'] },
  { label: 'Service', items: ['maintenance'] },
];

const BANCA_TRANSITIONS: Record<BancaTripStatus, BancaTripStatus[]> = {
  preparing: ['delayed', 'maintenance', 'cancelled'],
  delayed: ['preparing', 'maintenance', 'cancelled'],
  boarding: ['delayed', 'cancelled'],
  final_call: ['delayed', 'cancelled'],
  departure: ['cancelled'],
  in_transit: ['arrived', 'cancelled'],
  arrived: ['completed'],
  completed: [],
  cancelled: [],
  maintenance: ['preparing', 'cancelled'],
};

const CARGO_TRANSITIONS: Record<CargoTripStatus, CargoTripStatus[]> = {
  preparing: ['delayed', 'maintenance', 'cancelled'],
  delayed: ['preparing', 'maintenance', 'cancelled'],
  out_for_delivery: ['cancelled'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  maintenance: ['preparing', 'cancelled'],
};

const normalizeStatus = (value: string) => value.replaceAll('_', ' ');
const formatRoutes = (routes?: string[]) => (routes && routes.length > 0 ? routes.join(', ') : 'No routes assigned');
const formatOperators = (boat: Boat) => (boat.operatorNames && boat.operatorNames.length > 0 ? boat.operatorNames.join(', ') : boat.operatorName || '-');
const formatDisplayBoatId = (boat: Boat) => {
  if (boat.id.startsWith('ISL-')) return boat.id;
  const compact = boat.id.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return `ISL-${compact.slice(0, 6) || '000000'}`;
};

const formatTripTime = (value?: string) => {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  }).format(parsed);
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

const TrackingStatCard = ({
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
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-2 text-xl font-semibold text-slate-50">{value}</p>
          {detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}
        </div>
        <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-2xl border', toneClasses[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
};

const formatRelativeTripWindow = (
  departureDatetime?: string,
  arrivalDatetime?: string,
  tripStatus?: string,
  tripStatusEta?: string,
) => {
  const normalizedStatus = tripStatus?.trim().toLowerCase();
  if (normalizedStatus === 'cancelled') {
    return 'Trip cancelled';
  }
  if (normalizedStatus === 'maintenance') {
    return 'Unavailable';
  }
  if (normalizedStatus === 'completed' || normalizedStatus === 'arrived' || normalizedStatus === 'delivered') {
    return 'Trip ended';
  }
  if (normalizedStatus === 'delayed') {
    if (tripStatusEta) {
      return `Estimated departure ${formatTripTime(tripStatusEta)}`;
    }
    return 'Trip delayed';
  }
  const departureAt = departureDatetime ? new Date(departureDatetime).getTime() : Number.NaN;
  const arrivalAt = arrivalDatetime ? new Date(arrivalDatetime).getTime() : Number.NaN;
  const now = Date.now();
  if (Number.isNaN(departureAt)) {
    return 'No trip time set';
  }

  const minutesUntilDeparture = Math.ceil((departureAt - now) / 60000);
  if (minutesUntilDeparture > 0) {
    return `Departs in ${minutesUntilDeparture} min`;
  }

  if (!Number.isNaN(arrivalAt) && now < arrivalAt) {
    const minutesUntilArrival = Math.ceil((arrivalAt - now) / 60000);
    return `Arrives in ${minutesUntilArrival} min`;
  }

  if (!Number.isNaN(arrivalAt)) {
    return 'Trip window ended';
  }

  return 'Departed';
};

const tripWindowTone = (displayStatus?: string) => {
  switch (displayStatus) {
    case 'scheduled':
    case 'preparing':
      return 'text-sky-500 dark:text-sky-300';
    case 'boarding':
    case 'final_call':
    case 'delayed':
      return 'text-amber-500 dark:text-amber-300';
    case 'departed':
    case 'departure':
    case 'in_transit':
    case 'out_for_delivery':
      return 'text-cyan-500 dark:text-cyan-300';
    case 'arrived':
    case 'completed':
    case 'delivered':
      return 'text-emerald-500 dark:text-emerald-300';
    case 'cancelled':
      return 'text-rose-500 dark:text-rose-300';
    case 'maintenance':
      return 'text-orange-500 dark:text-orange-300';
    default:
      return 'text-slate-500 dark:text-slate-400';
  }
};

const MANUAL_OVERRIDE_STATUSES = new Set([
  'delayed',
  'arrived',
  'completed',
  'cancelled',
  'maintenance',
]);

const TIME_HOURS = Array.from({ length: 12 }, (_, index) => `${index + 1}`.padStart(2, '0'));
const TIME_MINUTES = Array.from({ length: 12 }, (_, index) => `${index * 5}`.padStart(2, '0'));
const TIME_PERIODS = ['AM', 'PM'] as const;

const to12HourParts = (value?: string): { hour: string; minute: string; period: 'AM' | 'PM' } => {
  if (!value || !value.includes(':')) {
    return { hour: '12', minute: '00', period: 'AM' as const };
  }
  const [rawHour, rawMinute] = value.split(':');
  const hour24 = Number(rawHour);
  if (!Number.isFinite(hour24)) {
    return { hour: '12', minute: '00', period: 'AM' as const };
  }
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return {
    hour: `${hour12}`.padStart(2, '0'),
    minute: rawMinute?.padStart(2, '0') ?? '00',
    period,
  };
};

const to24HourTime = (hour12: string, minute: string, period: 'AM' | 'PM') => {
  const hour = Number(hour12);
  if (!Number.isFinite(hour) || hour < 1 || hour > 12) return '00:00';
  const normalizedHour = period === 'PM' ? (hour === 12 ? 12 : hour + 12) : hour === 12 ? 0 : hour;
  return `${String(normalizedHour).padStart(2, '0')}:${minute}`;
};

const resolveDisplayTripStatus = (
  departureDatetime?: string,
  arrivalDatetime?: string,
  manualStatus?: string,
  boatType?: string,
): DisplayTripStatus => {
  const normalizedManual = manualStatus?.trim().toLowerCase();
  if (normalizedManual && MANUAL_OVERRIDE_STATUSES.has(normalizedManual)) {
    if (normalizedManual === 'departure') return 'departed';
    return normalizedManual as DisplayTripStatus;
  }

  const departureAt = departureDatetime ? new Date(departureDatetime).getTime() : Number.NaN;
  const arrivalAt = arrivalDatetime ? new Date(arrivalDatetime).getTime() : Number.NaN;
  const now = Date.now();
  if (Number.isNaN(departureAt)) {
    return 'scheduled';
  }
  if (!Number.isNaN(arrivalAt) && now >= arrivalAt) {
    return 'completed';
  }

  const diffSeconds = Math.floor((departureAt - now) / 1000);
  const normalizedType = boatType?.trim().toLowerCase();
  if (normalizedType === 'cargo') {
    if (diffSeconds > 0) return 'scheduled';
    if (!Number.isNaN(arrivalAt) && now < arrivalAt) return 'out_for_delivery';
    return 'delivered';
  }

  if (diffSeconds > 1800) return 'scheduled';
  if (diffSeconds > 300) return 'boarding';
  if (diffSeconds > 0) return 'final_call';
  if (!Number.isNaN(arrivalAt) && now < arrivalAt) return 'departed';
  return 'completed';
};

const mapDisplayToBancaStatus = (status?: string): BancaTripStatus => {
  switch (status) {
    case 'scheduled':
      return 'preparing';
    case 'departed':
      return 'departure';
    case 'boarding':
    case 'delayed':
    case 'final_call':
    case 'in_transit':
    case 'arrived':
    case 'completed':
    case 'cancelled':
    case 'maintenance':
      return status;
    default:
      return 'preparing';
  }
};

const mapDisplayToCargoStatus = (status?: string): CargoTripStatus => {
  switch (status) {
    case 'scheduled':
      return 'preparing';
    case 'out_for_delivery':
    case 'delayed':
    case 'delivered':
    case 'completed':
    case 'cancelled':
    case 'maintenance':
      return status;
    default:
      return 'preparing';
  }
};

const statusMeta = (status: string) => {
  if (status === 'scheduled' || status === 'preparing') {
    return { label: 'Scheduled', dot: 'bg-sky-400', box: 'border-sky-500/40 bg-sky-500/10 text-sky-200' };
  }
  if (status === 'completed' || status === 'delivered' || status === 'arrived') {
    return { label: normalizeStatus(status).replace(/\b\w/g, (char) => char.toUpperCase()), dot: 'bg-emerald-400', box: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' };
  }
  if (status === 'cancelled') {
    return { label: 'Cancelled', dot: 'bg-rose-400', box: 'border-rose-500/40 bg-rose-500/10 text-rose-200' };
  }
  if (status === 'maintenance') {
    return { label: 'Maintenance', dot: 'bg-amber-400', box: 'border-amber-500/40 bg-amber-500/10 text-amber-200' };
  }
  if (status === 'delayed') {
    return { label: 'Delayed', dot: 'bg-yellow-400', box: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200' };
  }
  if (status === 'final_call') {
    return { label: 'Final Call', dot: 'bg-orange-400', box: 'border-orange-500/40 bg-orange-500/10 text-orange-200' };
  }
  if (status === 'departure') {
    return { label: 'Departed', dot: 'bg-cyan-400', box: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200' };
  }
  if (status === 'in_transit' || status === 'out_for_delivery' || status === 'departure') {
    return { label: normalizeStatus(status).replace(/\b\w/g, (char) => char.toUpperCase()), dot: 'bg-cyan-400', box: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200' };
  }
  return { label: normalizeStatus(status).replace(/\b\w/g, (char) => char.toUpperCase()), dot: 'bg-sky-400', box: 'border-sky-500/40 bg-sky-500/10 text-sky-200' };
};

const summarizeUnavailability = (boat: Boat) => {
  const vesselStatus = boat.status?.trim().toLowerCase();
  const tripStatus = (boat.bancaTripStatus ?? boat.cargoTripStatus ?? '').trim().toLowerCase();

  if (vesselStatus === 'non_registered') {
    return {
      label: 'Registry hold',
      detail: 'This vessel is saved in the system but not activated for schedules or bookings yet.',
      className: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    };
  }
  if (vesselStatus === 'coding') {
    return {
      label: 'Coding hold',
      detail: 'This vessel is temporarily blocked from normal operations and new trip assignments.',
      className: 'border-blue-500/40 bg-blue-500/10 text-blue-200',
    };
  }
  if (tripStatus === 'maintenance') {
    return {
      label: 'Maintenance',
      detail: 'This vessel is unavailable because the current trip status is set to maintenance.',
      className: 'border-orange-500/40 bg-orange-500/10 text-orange-200',
    };
  }
  if (tripStatus === 'cancelled') {
    return {
      label: 'Trip cancelled',
      detail: 'This vessel has a cancelled trip on the selected date, so it is not available for normal boarding flow.',
      className: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
    };
  }
  return null;
};

const StatusValue = ({ status, withAction = false }: { status: string; withAction?: boolean }) => {
  const meta = statusMeta(status);
  return (
    <span className={`inline-flex min-w-[160px] w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${meta.box}`}>
      <span className="inline-flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
        <span>{meta.label}</span>
      </span>
      {withAction ? <MoreHorizontal className="h-3.5 w-3.5 opacity-80" /> : null}
    </span>
  );
};

const StatusActionButtons = ({
  value,
  groups,
  onSelect,
  disabled = false,
  disabledReason,
}: {
  value: string;
  groups: Array<{ label: string; items: string[] }>;
  onSelect: (status: string) => void;
  disabled?: boolean;
  disabledReason?: string;
}) => (
  <div className="flex items-center justify-center">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full rounded-xl p-0 hover:bg-transparent"
          disabled={disabled}
          title={disabled ? disabledReason : 'Change status'}
          aria-label="Change status"
        >
          <StatusValue status={value} withAction />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {groups.map((group, idx) => (
          <div key={group.label}>
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-slate-500">{group.label}</DropdownMenuLabel>
            {group.items.map((status) => {
              const active = value === status;
              return (
                <DropdownMenuItem key={status} onClick={() => onSelect(status)} className="flex items-center justify-between" disabled={disabled}>
                  <span>{statusMeta(status).label}</span>
                  {active ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : null}
                </DropdownMenuItem>
              );
            })}
            {idx < groups.length - 1 && <DropdownMenuSeparator />}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

const escapeCsv = (value: string | number) => {
  const asText = String(value);
  if (asText.includes(',') || asText.includes('"') || asText.includes('\n')) {
    return `"${asText.replaceAll('"', '""')}"`;
  }
  return asText;
};

const createSimplePdf = (lines: string[], filename: string) => {
  const content = [
    'BT',
    '/F1 11 Tf',
    '50 780 Td',
    '14 TL',
    ...lines.map((line) => `(${line.replace(/[()\\]/g, '\\$&')}) Tj T*`),
    'ET',
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const downloadCsv = (filename: string, headers: string[], rows: Array<Array<string | number>>) => {
  const csv = [headers.join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

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

const VesselManagementPage = observer(() => {
  const boatStore = useBoatStore();
  const bookingStore = useBookingStore();
  const settingsStore = useSettingsStore();
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<MainTab>('banca');
  const [clusterTab, setClusterTab] = useState<ClusterTab>('banca');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rowDensity, setRowDensity] = useState<RowDensity>('compact');
  const [quickFilter, setQuickFilter] = useState<TrackingQuickFilter>('all');
  const [showReportModal, setShowReportModal] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<ReportFormat | null>(null);
  const [selectedBoat, setSelectedBoat] = useState<TrackingBoat | null>(null);
  const [statusUpdatingBoatId, setStatusUpdatingBoatId] = useState<string | null>(null);
  const [showPastTrips, setShowPastTrips] = useState(false);
  const [dateWindowOffset, setDateWindowOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => toManilaIsoDate(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarAvailabilityMap, setCalendarAvailabilityMap] = useState<Record<string, number>>({});
  const [calendarRange, setCalendarRange] = useState<{ from: string; to: string } | null>(null);
  const calendarRequestIdRef = useRef(0);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalReason, setStatusModalReason] = useState('');
  const [statusModalEta, setStatusModalEta] = useState('');
  const [statusModalEtaHour, setStatusModalEtaHour] = useState('12');
  const [statusModalEtaMinute, setStatusModalEtaMinute] = useState('00');
  const [statusModalEtaPeriod, setStatusModalEtaPeriod] = useState<'AM' | 'PM'>('AM');
  const [statusModal, setStatusModal] = useState<{
    boat: TrackingBoat;
    status: BancaTripStatus | CargoTripStatus;
    scheduleId: string;
    scheduleDeparture?: string;
  } | null>(null);

  useAutoRefresh(
    async () => {
      await Promise.all([
        boatStore.fetchBoats(),
        bookingStore.fetchPersonBookings(),
        bookingStore.fetchCargoBookings(),
        settingsStore.fetchSchedules(buildScheduleRange(dateWindowOffset)),
      ]);
    },
    [boatStore, bookingStore, settingsStore, dateWindowOffset],
    { intervalMs: 5000 },
  );

  const schedulesByBoatId = useMemo(() => {
    const grouped = new Map<string, typeof settingsStore.schedules>();
    settingsStore.schedules.forEach((schedule) => {
      if (!schedule.boatId) return;
      const bucket = grouped.get(schedule.boatId) ?? [];
      bucket.push(schedule);
      grouped.set(schedule.boatId, bucket);
    });

    grouped.forEach((schedules, boatId) => {
      grouped.set(
        boatId,
        [...schedules].sort((a, b) => {
          const aDeparture = a.departureDatetime ? new Date(a.departureDatetime).getTime() : Number.MAX_SAFE_INTEGER;
          const bDeparture = b.departureDatetime ? new Date(b.departureDatetime).getTime() : Number.MAX_SAFE_INTEGER;
          return aDeparture - bDeparture;
        }),
      );
    });

    return grouped;
  }, [settingsStore.schedules]);

  const scheduleByBoatId = useMemo(() => {
    const now = Date.now();
    const resolved = new Map<string, (typeof settingsStore.schedules)[number]>();

    schedulesByBoatId.forEach((schedules, boatId) => {
      if (selectedDate) {
        const exactDateSchedules = schedules.filter(
          (schedule) => getScheduleDateKey(schedule.departureDatetime) === selectedDate,
        );
        if (exactDateSchedules.length > 0) {
          const activeOnDate = exactDateSchedules.find((schedule) => {
            const departureAt = schedule.departureDatetime ? new Date(schedule.departureDatetime).getTime() : Number.NaN;
            const arrivalAt = schedule.arrivalDatetime ? new Date(schedule.arrivalDatetime).getTime() : Number.NaN;
            if (Number.isNaN(departureAt) || Number.isNaN(arrivalAt)) return false;
            return departureAt <= now && now <= arrivalAt;
          });
          if (activeOnDate) {
            resolved.set(boatId, activeOnDate);
            return;
          }

          const nextOnDate = exactDateSchedules.find((schedule) => {
            const departureAt = schedule.departureDatetime ? new Date(schedule.departureDatetime).getTime() : Number.NaN;
            return !Number.isNaN(departureAt) && departureAt > now;
          });
          if (nextOnDate) {
            resolved.set(boatId, nextOnDate);
            return;
          }

          resolved.set(boatId, exactDateSchedules[exactDateSchedules.length - 1]);
          return;
        }
      }

      const active = schedules.find((schedule) => {
        const departureAt = schedule.departureDatetime ? new Date(schedule.departureDatetime).getTime() : Number.NaN;
        const arrivalAt = schedule.arrivalDatetime ? new Date(schedule.arrivalDatetime).getTime() : Number.NaN;
        if (Number.isNaN(departureAt) || Number.isNaN(arrivalAt)) return false;
        return departureAt <= now && now <= arrivalAt;
      });
      if (active) {
        resolved.set(boatId, active);
        return;
      }

      const next = schedules.find((schedule) => {
        const departureAt = schedule.departureDatetime ? new Date(schedule.departureDatetime).getTime() : Number.NaN;
        return !Number.isNaN(departureAt) && departureAt > now;
      });
      if (next) {
        resolved.set(boatId, next);
        return;
      }

      if (schedules.length > 0) {
        resolved.set(boatId, schedules[schedules.length - 1]);
      }
    });

    return resolved;
  }, [schedulesByBoatId, selectedDate]);

  const getSelectedScheduleForBoat = useCallback((boatId: string) => {
    const schedules = schedulesByBoatId.get(boatId) ?? [];
    if (!selectedDate) return null;
    return schedules.find((schedule) => getScheduleDateKey(schedule.departureDatetime) === selectedDate) ?? null;
  }, [schedulesByBoatId, selectedDate]);

  const resolveTrackingRoute = (boat: Boat) => {
    const matchedSchedule = scheduleByBoatId.get(boat.id);
    if (matchedSchedule?.route?.trim()) {
      return matchedSchedule.route.trim();
    }
    return formatRoutes(boat.routeNames);
  };

  const bancaRows = useMemo(
    () =>
      boatStore.boats
        .filter((boat) => (boat.type === 'banca' || boat.type === 'passenger') && scheduleByBoatId.has(boat.id))
        .map((boat) => {
          const matchedSchedule = scheduleByBoatId.get(boat.id);
          const tripStatus = (matchedSchedule?.tripStatus ?? 'preparing') as BancaTripStatus;
          return {
            ...boat,
            normalizedType: 'banca' as const,
            tripStatus,
            tripStatusReason: matchedSchedule?.tripStatusReason,
            tripStatusEta: matchedSchedule?.tripStatusEta,
            displayTripStatus: resolveDisplayTripStatus(
              matchedSchedule?.departureDatetime,
              matchedSchedule?.arrivalDatetime,
              tripStatus,
              boat.type,
            ),
          };
        }),
    [boatStore.boats, scheduleByBoatId],
  );

  const cargoRows = useMemo(
    () =>
      boatStore.boats
        .filter((boat) => boat.type === 'cargo' && scheduleByBoatId.has(boat.id))
        .map((boat) => {
          const matchedSchedule = scheduleByBoatId.get(boat.id);
          const tripStatus = (matchedSchedule?.tripStatus ?? 'preparing') as CargoTripStatus;
          return {
            ...boat,
            normalizedType: 'cargo' as const,
            tripStatus,
            tripStatusReason: matchedSchedule?.tripStatusReason,
            tripStatusEta: matchedSchedule?.tripStatusEta,
            displayTripStatus: resolveDisplayTripStatus(
              matchedSchedule?.departureDatetime,
              matchedSchedule?.arrivalDatetime,
              tripStatus,
              boat.type,
            ),
          };
        }),
    [boatStore.boats, scheduleByBoatId],
  );

  const activeRows = useMemo(() => {
    if (mainTab === 'cluster') {
      return clusterTab === 'banca' ? bancaRows : cargoRows;
    }
    return mainTab === 'banca' ? bancaRows : cargoRows;
  }, [bancaRows, cargoRows, clusterTab, mainTab]);

  const bancaRowsForSelectedDate = useMemo(
    () =>
      selectedDate
        ? bancaRows.filter((row) => getScheduleDateKey(scheduleByBoatId.get(row.id)?.departureDatetime) === selectedDate)
        : bancaRows,
    [bancaRows, scheduleByBoatId, selectedDate],
  );

  const cargoRowsForSelectedDate = useMemo(
    () =>
      selectedDate
        ? cargoRows.filter((row) => getScheduleDateKey(scheduleByBoatId.get(row.id)?.departureDatetime) === selectedDate)
        : cargoRows,
    [cargoRows, scheduleByBoatId, selectedDate],
  );

  const activeBoatIdsForTab = useMemo(() => new Set(activeRows.map((boat) => boat.id)), [activeRows]);

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

  const dateAvailabilityMap = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (const item of visibleDates) byDate[item.iso] = 0;
    schedulesByBoatId.forEach((schedules, boatId) => {
      if (!activeBoatIdsForTab.has(boatId)) return;
      const seenDates = new Set<string>();
      schedules.forEach((schedule) => {
        const dateKey = getScheduleDateKey(schedule.departureDatetime);
        if (!dateKey || seenDates.has(dateKey) || byDate[dateKey] == null) return;
        seenDates.add(dateKey);
        byDate[dateKey] += 1;
      });
    });
    return byDate;
  }, [activeBoatIdsForTab, schedulesByBoatId, visibleDates]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const boatsWithBookings = new Set<string>();
    bookingStore.personBookings.forEach((booking) => {
      if (booking.scheduleId && scheduleByBoatId.get(booking.boatId ?? "")?.id === booking.scheduleId) {
        boatsWithBookings.add(booking.boatId ?? "");
        return;
      }
      if (!booking.scheduleId && booking.boatId) {
        boatsWithBookings.add(booking.boatId);
      }
    });
    bookingStore.cargoBookings.forEach((booking) => {
      if (booking.scheduleId && scheduleByBoatId.get(booking.boatId ?? "")?.id === booking.scheduleId) {
        boatsWithBookings.add(booking.boatId ?? "");
        return;
      }
      if (!booking.scheduleId && booking.boatId) {
        boatsWithBookings.add(booking.boatId);
      }
    });
    const todayKey = toManilaIsoDate(new Date());
    const rowsByTripWindow = showPastTrips
      ? activeRows
      : activeRows.filter((row) => !['completed', 'arrived', 'delivered', 'cancelled'].includes(row.tripStatus));
    const rowsByDate = selectedDate
      ? rowsByTripWindow.filter((row) => getScheduleDateKey(scheduleByBoatId.get(row.id)?.departureDatetime) === selectedDate)
      : rowsByTripWindow;
    const rowsByQuickFilter = rowsByDate.filter((row) => {
      if (quickFilter === 'today' && getScheduleDateKey(scheduleByBoatId.get(row.id)?.departureDatetime) !== todayKey) return false;
      if (quickFilter === 'delayed' && (row.displayTripStatus ?? row.tripStatus) !== 'delayed') return false;
      if (quickFilter === 'with_bookings' && !boatsWithBookings.has(row.id)) return false;
      if (quickFilter === 'active_now' && !['boarding', 'final_call', 'departed', 'departure', 'in_transit', 'out_for_delivery'].includes(row.displayTripStatus ?? row.tripStatus)) return false;
      return true;
    });
    if (!q) return rowsByQuickFilter;
    return rowsByQuickFilter.filter((row) =>
      [row.name, resolveTrackingRoute(row), formatOperators(row), row.id, formatDisplayBoatId(row)].join(' ').toLowerCase().includes(q),
    );
  }, [activeRows, bookingStore.cargoBookings, bookingStore.personBookings, quickFilter, scheduleByBoatId, search, selectedDate, showPastTrips]);

  useEffect(() => {
    setPage(1);
  }, [mainTab, clusterTab, search, pageSize, selectedDate, showPastTrips, quickFilter]);

  const trackingSummary = useMemo(
    () => ({
      scheduled: filteredRows.filter((row) => ['scheduled', 'preparing', 'boarding', 'final_call'].includes(row.displayTripStatus ?? row.tripStatus)).length,
      delayed: filteredRows.filter((row) => (row.displayTripStatus ?? row.tripStatus) === 'delayed').length,
      departed: filteredRows.filter((row) => ['departed', 'departure', 'in_transit', 'out_for_delivery'].includes(row.displayTripStatus ?? row.tripStatus)).length,
      completed: filteredRows.filter((row) => ['arrived', 'completed', 'delivered'].includes(row.displayTripStatus ?? row.tripStatus)).length,
    }),
    [filteredRows],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const sectionTitle = useMemo(() => {
    if (mainTab === 'cluster') return clusterTab === 'banca' ? 'Cluster View - Banca' : 'Cluster View - Cargo';
    return mainTab === 'banca' ? 'Banca Tracking' : 'Cargo Tracking';
  }, [clusterTab, mainTab]);

  const reportFilename = useMemo(() => {
    const date = new Date().toISOString().slice(0, 10);
    const prefix = mainTab === 'cluster' ? `cluster-${clusterTab}` : mainTab;
    return `vessel-${prefix}-report-${date}`;
  }, [clusterTab, mainTab]);

  const reportLines = useMemo(() => {
    const generatedAt = new Date().toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    return [
      `Isla Sakay ${sectionTitle} Report`,
      `Generated: ${generatedAt} (Asia/Manila)`,
      `Total rows: ${filteredRows.length}`,
      '',
      ...filteredRows.map((boat) => {
        const fields = [
          formatDisplayBoatId(boat),
          boat.name,
          resolveTrackingRoute(boat),
          formatOperators(boat),
        ];
        if (mainTab !== 'cluster') fields.push(normalizeStatus(boat.tripStatus));
        return fields.join(' | ');
      }),
    ];
  }, [filteredRows, mainTab, sectionTitle]);

  const handleExport = async (format: ReportFormat) => {
    setDownloadingFormat(format);
    try {
      if (format === 'excel') {
        const headers = mainTab === 'cluster'
          ? ['Vessel ID', 'Vessel Name', 'Routes', 'Operator']
          : ['Vessel ID', 'Vessel Name', 'Routes', 'Operator', 'Status'];
        const rows = filteredRows.map((boat) => {
          const base: Array<string> = [
            formatDisplayBoatId(boat),
            boat.name,
            resolveTrackingRoute(boat),
            formatOperators(boat),
          ];
          if (mainTab !== 'cluster') base.push(normalizeStatus(boat.tripStatus));
          return base;
        });
        downloadCsv(`${reportFilename}.csv`, headers, rows);
      } else {
        createSimplePdf(reportLines, `${reportFilename}.pdf`);
      }
      setShowReportModal(false);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleBancaStatusChange = async (boat: TrackingBoat, status: BancaTripStatus) => {
    const current = mapDisplayToBancaStatus(boat.displayTripStatus ?? boat.bancaTripStatus ?? 'preparing');
    if (current === status) return;
    if (!(BANCA_TRANSITIONS[current] ?? []).includes(status)) {
      showWarningToast(
        'Invalid status transition',
        `Cannot move from ${normalizeStatus(current)} to ${normalizeStatus(status)}.`,
      );
      return;
    }
    const selectedSchedule = getSelectedScheduleForBoat(boat.id);
    if (!selectedSchedule) {
      showWarningToast(
        'No scheduled trip found',
        'Select a specific scheduled date before changing this trip status.',
      );
      return;
    }
    if (['cancelled', 'maintenance', 'delayed'].includes(status)) {
      setStatusModal({
        boat,
        status,
        scheduleId: selectedSchedule.id,
        scheduleDeparture: selectedSchedule.departureDatetime,
      });
      setStatusModalReason('');
      {
        const timeValue = selectedSchedule.departureDatetime?.slice(11, 16) ?? '08:00';
        const parts = to12HourParts(timeValue);
        setStatusModalEta(timeValue);
        setStatusModalEtaHour(parts.hour);
        setStatusModalEtaMinute(parts.minute);
        setStatusModalEtaPeriod(parts.period);
      }
      setStatusModalOpen(true);
      return;
    }

    setStatusUpdatingBoatId(boat.id);
    const result = await settingsStore.updateScheduleTripStatus(selectedSchedule.id, { status });
    setStatusUpdatingBoatId(null);
    if (!result.success) {
      showErrorToast('Status update failed', result.message);
      return;
    }
    await settingsStore.fetchSchedules(buildScheduleRange(dateWindowOffset));
    showSuccessToast('Status updated', `${boat.name}: ${normalizeStatus(status)}`);
  };

  const handleCargoStatusChange = async (boat: TrackingBoat, status: CargoTripStatus) => {
    const current = mapDisplayToCargoStatus(boat.displayTripStatus ?? boat.cargoTripStatus ?? 'preparing');
    if (current === status) return;
    if (!(CARGO_TRANSITIONS[current] ?? []).includes(status)) {
      showWarningToast(
        'Invalid status transition',
        `Cannot move from ${normalizeStatus(current)} to ${normalizeStatus(status)}.`,
      );
      return;
    }
    const selectedSchedule = getSelectedScheduleForBoat(boat.id);
    if (!selectedSchedule) {
      showWarningToast(
        'No scheduled trip found',
        'Select a specific scheduled date before changing this trip status.',
      );
      return;
    }
    if (['cancelled', 'maintenance', 'delayed'].includes(status)) {
      setStatusModal({
        boat,
        status,
        scheduleId: selectedSchedule.id,
        scheduleDeparture: selectedSchedule.departureDatetime,
      });
      setStatusModalReason('');
      {
        const timeValue = selectedSchedule.departureDatetime?.slice(11, 16) ?? '08:00';
        const parts = to12HourParts(timeValue);
        setStatusModalEta(timeValue);
        setStatusModalEtaHour(parts.hour);
        setStatusModalEtaMinute(parts.minute);
        setStatusModalEtaPeriod(parts.period);
      }
      setStatusModalOpen(true);
      return;
    }

    setStatusUpdatingBoatId(boat.id);
    const result = await settingsStore.updateScheduleTripStatus(selectedSchedule.id, { status });
    setStatusUpdatingBoatId(null);
    if (!result.success) {
      showErrorToast('Status update failed', result.message);
      return;
    }
    await settingsStore.fetchSchedules(buildScheduleRange(dateWindowOffset));
    showSuccessToast('Status updated', `${boat.name}: ${normalizeStatus(status)}`);
  };

  const canEditStatus = mainTab !== 'cluster';
  const todayKey = toManilaIsoDate(new Date());
  const statusEditAllowedForDate = canEditStatus && selectedDate === todayKey;
  const isPrivilegedUser = user?.role === 'admin' || user?.role === 'super_admin';
  const statusEditDisabledReason = !canEditStatus
    ? 'Status editing is not available in cluster view.'
    : !selectedDate
      ? 'Select a schedule date to edit trip status.'
        : selectedDate !== todayKey
          ? `Trip status editing is only available for today's scheduled trips (${todayKey}).`
          : undefined;
  const getAllowedBancaStatuses = useCallback((current: BancaTripStatus) => {
    const transitions = BANCA_TRANSITIONS[current] ?? [];
    if (!isPrivilegedUser) {
      return transitions;
    }
    return transitions.filter(
      (status) => status === 'preparing' || status === 'delayed' || status === 'cancelled' || status === 'maintenance',
    );
  }, [isPrivilegedUser]);

  const getAllowedCargoStatuses = useCallback((current: CargoTripStatus) => {
    const transitions = CARGO_TRANSITIONS[current] ?? [];
    if (!isPrivilegedUser) {
      return transitions;
    }
    return transitions.filter(
      (status) => status === 'preparing' || status === 'delayed' || status === 'cancelled' || status === 'maintenance',
    );
  }, [isPrivilegedUser]);

  const buildStatusGroups = useCallback(
    <T extends string>(groups: Array<{ label: string; items: T[] }>, allowed: T[]) =>
      groups
        .map((group) => ({
          label: group.label,
          items: group.items.filter((item) => allowed.includes(item)),
        }))
        .filter((group) => group.items.length > 0),
    [],
  );
  const selectedBoatIsCargo = selectedBoat?.type === 'cargo';
  const selectedBoatScheduleId = useMemo(() => {
    if (!selectedBoat?.id) return undefined;
    if (selectedDate) {
      return getSelectedScheduleForBoat(selectedBoat.id)?.id;
    }
    return scheduleByBoatId.get(selectedBoat.id)?.id;
  }, [getSelectedScheduleForBoat, scheduleByBoatId, selectedBoat?.id, selectedDate]);

  const matchesSelectedSchedule = useCallback(
    (booking: { boatId?: string; scheduleId?: string | null }) => {
      if (!selectedBoat?.id) return false;
      if (!selectedBoatScheduleId) {
        return booking.boatId === selectedBoat.id;
      }
      if (booking.scheduleId) {
        return booking.scheduleId === selectedBoatScheduleId;
      }
      return false;
    },
    [selectedBoat?.id, selectedBoatScheduleId],
  );

  const selectedBoatPersonBookings = useMemo(
    () =>
      bookingStore.personBookings
        .filter(matchesSelectedSchedule)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [bookingStore.personBookings, matchesSelectedSchedule],
  );
  const selectedBoatCargoBookings = useMemo(
    () =>
      bookingStore.cargoBookings
        .filter(matchesSelectedSchedule)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [bookingStore.cargoBookings, matchesSelectedSchedule],
  );
  const activePersonBookings = useMemo(
    () => selectedBoatPersonBookings.filter((booking) => booking.status !== 'cancelled'),
    [selectedBoatPersonBookings],
  );
  const activeCargoBookings = useMemo(
    () => selectedBoatCargoBookings.filter((booking) => booking.status !== 'cancelled'),
    [selectedBoatCargoBookings],
  );
  const cancelledPersonCount = selectedBoatPersonBookings.length - activePersonBookings.length;
  const cancelledCargoCount = selectedBoatCargoBookings.length - activeCargoBookings.length;
  const totalBookedPassengers = useMemo(
    () => activePersonBookings.reduce((sum, booking) => sum + (booking.numberOfPassengers ?? 0), 0),
    [activePersonBookings],
  );
  const totalBookedCargoWeight = useMemo(
    () => activeCargoBookings.reduce((sum, booking) => sum + (booking.weight ?? 0), 0),
    [activeCargoBookings],
  );
  const selectedBoatAvailabilitySummary = useMemo(
    () => (selectedBoat ? summarizeUnavailability(selectedBoat) : null),
    [selectedBoat],
  );
  const selectedDateLabel = useMemo(() => formatSelectedDateLabel(selectedDate), [selectedDate]);

  const handleSelectCalendarDate = (date: string) => {
    setSelectedDate(date);
    setDateWindowOffset(getDateWindowOffset(date));
  };

  const handleStatusModalClose = (open: boolean) => {
    if (!open) {
      setStatusModalOpen(false);
      setStatusModal(null);
      setStatusModalReason('');
      setStatusModalEta('');
      setStatusModalEtaHour('12');
      setStatusModalEtaMinute('00');
      setStatusModalEtaPeriod('AM');
    }
  };

  const handleConfirmStatusModal = async () => {
    if (!statusModal) return;
    const needsReason = ['cancelled', 'maintenance', 'delayed'].includes(statusModal.status);
    if (needsReason && !statusModalReason.trim()) {
      showWarningToast('Reason required', `Please provide a reason before marking this trip as ${normalizeStatus(statusModal.status)}.`);
      return;
    }
    let estimatedDepartureDatetime = statusModal.status === 'delayed' ? statusModalEta.trim() : undefined;
    if (statusModal.status === 'delayed' && !estimatedDepartureDatetime) {
      showWarningToast('Estimated departure required', 'Please provide the new estimated departure time for this delayed trip.');
      return;
    }
    if (statusModal.status === 'delayed' && estimatedDepartureDatetime && statusModal.scheduleDeparture) {
      const baseDate = statusModal.scheduleDeparture.slice(0, 10);
      estimatedDepartureDatetime = `${baseDate}T${estimatedDepartureDatetime}`;
    }

    setStatusUpdatingBoatId(statusModal.boat.id);
    const result = await settingsStore.updateScheduleTripStatus(statusModal.scheduleId, {
      status: statusModal.status,
      reason: needsReason ? statusModalReason.trim() : undefined,
      estimatedDepartureDatetime,
    });
    setStatusUpdatingBoatId(null);
    if (!result.success) {
      showErrorToast('Status update failed', result.message);
      return;
    }
    await settingsStore.fetchSchedules(buildScheduleRange(dateWindowOffset));
    showSuccessToast('Status updated', `${statusModal.boat.name}: ${normalizeStatus(statusModal.status)}`);
    handleStatusModalClose(false);
  };

  const handleCalendarRangeChange = useCallback((range: { from: string; to: string }) => {
    setCalendarRange(range);
    const boatTypes = mainTab === 'cargo' || (mainTab === 'cluster' && clusterTab === 'cargo')
      ? 'cargo'
      : 'banca,passenger';

    const requestId = ++calendarRequestIdRef.current;
    setCalendarAvailabilityMap({});
    void settingsStore.getScheduleCalendarCounts({
      from: range.from,
      to: range.to,
      mode: 'boats',
      boatTypes,
    }).then((counts) => {
      if (calendarRequestIdRef.current !== requestId) return;
      setCalendarAvailabilityMap(counts);
    }).catch(() => {
      if (calendarRequestIdRef.current !== requestId) return;
      setCalendarAvailabilityMap({});
    });
  }, [clusterTab, mainTab, settingsStore]);

  useEffect(() => {
    if (!calendarOpen || !calendarRange) {
      return;
    }
    handleCalendarRangeChange(calendarRange);
  }, [calendarOpen, calendarRange, handleCalendarRangeChange]);

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
          <div className="space-y-2.5">
            <span className="inline-flex w-fit items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              Tracking Desk
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Vessel Management</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">Live dispatch board for routed banca and cargo trips</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">Banca In View</p>
              <p className="mt-1 text-xl font-semibold text-sky-900 dark:text-sky-50">{bancaRowsForSelectedDate.length}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{selectedDateLabel}</p>
            </div>
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/90 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">Cargo In View</p>
              <p className="mt-1 text-xl font-semibold text-amber-900 dark:text-amber-50">{cargoRowsForSelectedDate.length}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{selectedDateLabel}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/90 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">Visible Rows</p>
              <p className="mt-1 text-xl font-semibold text-emerald-900 dark:text-emerald-50">{filteredRows.length}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Current tab and filters</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr),320px]">
        <div className="space-y-4">
          <Card className="border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
            <CardContent className="p-4">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Schedule Dates</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCalendarOpen(true)} className="h-7 px-2 text-xs">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Calendar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedDate('')} className="h-7 px-2 text-xs">
                  All dates
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDateWindowOffset((prev) => prev - 1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {visibleDates.map((item) => {
                  const availability = dateAvailabilityMap[item.iso] || 0;
                  const active = selectedDate === item.iso;
                  const availabilityTone = availability <= 2
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
                      {availability > 0 && (
                        <span className={`mt-1 block text-[11px] font-semibold ${availabilityTone}`}>
                          {availability} available
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDateWindowOffset((prev) => prev + 1)}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs
            value={mainTab}
            onValueChange={(value) => {
              setMainTab(value as MainTab);
              setPage(1);
            }}
            className="w-full"
          >
          <TabsList className="mb-4 grid h-auto w-full max-w-[420px] grid-cols-3 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
            <TabsTrigger value="banca" className="gap-2">
                Banca
                <Badge variant="secondary" className="min-w-7 justify-center">{bancaRowsForSelectedDate.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="cargo" className="gap-2">
                Cargo
                <Badge variant="secondary" className="min-w-7 justify-center">{cargoRowsForSelectedDate.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="cluster" className="gap-2">
                Cluster
                <Badge variant="secondary" className="min-w-7 justify-center">{bancaRowsForSelectedDate.length + cargoRowsForSelectedDate.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="banca" />
            <TabsContent value="cargo" />
            <TabsContent value="cluster">
              <Tabs
                value={clusterTab}
                onValueChange={(value) => {
                  setClusterTab(value as ClusterTab);
                  setPage(1);
                }}
              >
                <TabsList className="mb-3 grid h-auto w-full max-w-[280px] grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
                  <TabsTrigger value="banca" className="gap-2">
                    Banca
                    <Badge variant="secondary" className="min-w-7 justify-center">{bancaRowsForSelectedDate.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="cargo" className="gap-2">
                    Cargo
                    <Badge variant="secondary" className="min-w-7 justify-center">{cargoRowsForSelectedDate.length}</Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </TabsContent>
          </Tabs>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/50">
            <div className="space-y-1">
              <p className="font-medium text-gray-700 dark:text-slate-200">
              {sectionTitle} {!showPastTrips ? '(Active)' : '(Including past/completed)'}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 font-semibold uppercase tracking-[0.18em] dark:border-slate-700 dark:bg-slate-950">
                {selectedDateLabel}
              </span>
              <span>Counts and rows follow the chosen day.</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPastTrips((prev) => !prev)}
              >
                {showPastTrips ? 'Hide past/completed' : 'Show past/completed'}
              </Button>
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
              <label className="text-gray-500">Rows:</label>
              <select
                value={String(pageSize)}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="h-8 rounded border border-gray-300 bg-white px-2 text-xs"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>

          <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex flex-wrap gap-2">
              {([
                ['all', 'All'],
                ['today', 'Today'],
                ['delayed', 'Delayed'],
                ['with_bookings', 'With bookings'],
                ['active_now', 'Active now'],
              ] as Array<[TrackingQuickFilter, string]>).map(([value, label]) => (
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
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
                {trackingSummary.scheduled} scheduled
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                {trackingSummary.delayed} delayed
              </span>
              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-200">
                {trackingSummary.departed} departed
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                {trackingSummary.completed} completed
              </span>
            </div>
          </div>

          {!statusEditAllowedForDate && canEditStatus && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Trip status editing is locked for non-today dates. Select today&apos;s schedule to enable status updates.
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-900/95">Code</TableHead>
                <TableHead>Vessel</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Trip Window</TableHead>
                <TableHead>{mainTab === 'cargo' ? 'Weight Limit' : 'Capacity'}</TableHead>
                {canEditStatus && <TableHead className="w-[280px]">Status</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
                {pagedRows.map((boat) => (
                (() => {
                  const effectiveBancaStatus = mapDisplayToBancaStatus(boat.displayTripStatus ?? boat.tripStatus);
                  const effectiveCargoStatus = mapDisplayToCargoStatus(boat.displayTripStatus ?? boat.tripStatus);
                  const bancaGroups = buildStatusGroups(BANCA_STATUS_GROUPS, getAllowedBancaStatuses(effectiveBancaStatus));
                  const cargoGroups = buildStatusGroups(CARGO_STATUS_GROUPS, getAllowedCargoStatuses(effectiveCargoStatus));
                  const hasStatusActions = mainTab === 'banca' ? bancaGroups.length > 0 : cargoGroups.length > 0;
                  const lockedReason = statusEditDisabledReason
                    ?? (isPrivilegedUser
                      ? 'Admins can start, cancel, or hold the trip. Operators handle the full live voyage flow.'
                      : 'No status changes are allowed from the current state for this role.');
                  const matchedSchedule = scheduleByBoatId.get(boat.id);
                  return (
                <TableRow
                    key={boat.id}
                  onClick={() => setSelectedBoat(boat)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedBoat(boat);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-sky-50/70 focus-visible:bg-sky-50/70 dark:hover:bg-slate-900/75 dark:focus-visible:bg-slate-900/75',
                    rowDensity === 'compact' ? 'h-14' : 'h-[72px]',
                  )}
                  aria-label={`Open vessel details for ${boat.name}`}
                >
                  <TableCell className={cn('sticky left-0 z-10 bg-white font-semibold dark:bg-slate-950/40', rowDensity === 'compact' ? 'py-2.5' : 'py-4')}>{formatDisplayBoatId(boat)}</TableCell>
                  <TableCell className={rowDensity === 'compact' ? 'py-2.5' : 'py-4'}>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{boat.name}</div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        {boat.normalizedType === 'cargo' ? 'Cargo' : 'Banca'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={rowDensity === 'compact' ? 'py-2.5' : 'py-4'}>
                    <div className="max-w-[220px] truncate font-medium text-slate-700 dark:text-slate-200">{resolveTrackingRoute(boat)}</div>
                  </TableCell>
                  <TableCell className={rowDensity === 'compact' ? 'py-2.5' : 'py-4'}>
                    <div className="max-w-[180px] truncate text-slate-700 dark:text-slate-200">{formatOperators(boat)}</div>
                  </TableCell>
                  <TableCell className={rowDensity === 'compact' ? 'py-2.5' : 'py-4'}>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {formatTripTime(matchedSchedule?.departureDatetime)} - {formatTripTime(matchedSchedule?.arrivalDatetime)}
                    </div>
                    <div className={cn('text-[11px]', tripWindowTone(boat.displayTripStatus ?? boat.tripStatus))}>
                      {formatRelativeTripWindow(
                        matchedSchedule?.departureDatetime,
                        matchedSchedule?.arrivalDatetime,
                        matchedSchedule?.tripStatus,
                        matchedSchedule?.tripStatusEta,
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={rowDensity === 'compact' ? 'py-2.5' : 'py-4'}>
                    {boat.normalizedType === 'cargo'
                      ? `${boat.capacity ?? '-'} kg`
                      : `${boat.availableSeats ?? boat.capacity ?? '-'} / ${boat.capacity ?? '-'}`}
                  </TableCell>
                  {canEditStatus && (
                    <TableCell className={cn('min-w-[300px]', rowDensity === 'compact' ? 'py-2.5' : 'py-4')} onClick={(event) => event.stopPropagation()}>
                      {mainTab === 'banca' ? (
                        <StatusActionButtons
                          value={boat.displayTripStatus ?? boat.tripStatus}
                          groups={bancaGroups}
                          onSelect={(status) => void handleBancaStatusChange(boat, status as BancaTripStatus)}
                          disabled={
                            statusUpdatingBoatId === boat.id
                            || !statusEditAllowedForDate
                            || !hasStatusActions
                          }
                          disabledReason={lockedReason}
                        />
                      ) : (
                        <StatusActionButtons
                          value={boat.displayTripStatus ?? boat.tripStatus}
                          groups={cargoGroups}
                          onSelect={(status) => void handleCargoStatusChange(boat, status as CargoTripStatus)}
                          disabled={
                            statusUpdatingBoatId === boat.id
                            || !statusEditAllowedForDate
                            || !hasStatusActions
                          }
                          disabledReason={lockedReason}
                        />
                      )}
                    </TableCell>
                  )}
                </TableRow>
                  );
                })()
              ))}
              {pagedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canEditStatus ? 8 : 7} className="py-8 text-center text-gray-500">
                    No vessel records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>

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
        </div>

        <div className="space-y-4">
          <Card className="border-slate-200/70 bg-white/92 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
            <div className="space-y-3">
              <div>
                <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Tracking Board</CardTitle>
                <CardDescription>Date-locked filtering, live trip state, and dispatch status actions</CardDescription>
              </div>
              <div className="flex flex-col gap-2">
                <Button className="h-10 gap-2 rounded-xl" variant="outline" onClick={() => setShowReportModal(true)}>
                  <Download className="h-4 w-4" />
                  Generate Report
                </Button>
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search name, id, route, operator..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 rounded-xl pl-9"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-900 dark:text-slate-100">Tracking Snapshot</CardTitle>
              <CardDescription>Selected day, control state, and live focus</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Selected Day</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedDateLabel}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Quick Filter</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{quickFilter.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Status Editing</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {statusEditAllowedForDate ? 'Status controls are live for today.' : (statusEditDisabledReason ?? 'Status editing is currently unavailable.')}
                </p>
              </div>
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Live Summary</p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
                    {filteredRows.length} visible
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    {trackingSummary.delayed} delayed
                  </span>
                  <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-200">
                    {trackingSummary.departed} moving
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={Boolean(selectedBoat)} onOpenChange={(open) => !open && setSelectedBoat(null)}>
        <DialogContent className="border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 p-0 text-slate-100 sm:left-auto sm:right-4 sm:top-4 sm:h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-2rem)] sm:w-[min(92vw,760px)] sm:max-w-[760px] sm:translate-x-0 sm:translate-y-0 sm:rounded-[28px]">
          <DialogHeader className="border-b border-slate-800 px-6 pb-4 pt-6">
            <DialogTitle>Vessel Tracking Details</DialogTitle>
            <DialogDescription className="text-slate-300">
              {selectedBoat ? `${selectedBoat.name} (${formatDisplayBoatId(selectedBoat)})` : 'Vessel details'}
            </DialogDescription>
          </DialogHeader>

          {selectedBoat && (
            <div className="space-y-4 overflow-y-auto px-6 pb-6">
              <div className="rounded-[26px] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl border border-sky-500/30 bg-sky-500/12 text-sky-200">
                      {selectedBoatIsCargo ? <Package2 className="h-6 w-6" /> : <UserRound className="h-6 w-6" />}
                    </span>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/80">
                          {selectedBoatIsCargo ? 'Cargo Vessel' : 'Passenger Vessel'}
                        </p>
                        <h3 className="mt-1 text-2xl font-semibold tracking-tight text-white">{selectedBoat.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                          {formatDisplayBoatId(selectedBoat)}
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] font-medium text-slate-300">
                          {formatOperators(selectedBoat)}
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] font-medium text-slate-300">
                          {(selectedBoat.routeNames ?? []).length || 0} route{(selectedBoat.routeNames ?? []).length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Registry State</p>
                    <p className="mt-1 font-semibold text-slate-100">
                      {selectedBoat.status === 'coding'
                        ? 'Coding Hold'
                        : selectedBoat.status === 'non_registered'
                          ? 'Registry Hold'
                          : 'Active Registry'}
                    </p>
                  </div>
                </div>
              </div>

              {selectedBoatAvailabilitySummary && (
                <div className={`rounded-xl border p-3 ${selectedBoatAvailabilitySummary.className}`}>
                  <p className="text-xs uppercase tracking-wide opacity-80">Why unavailable</p>
                  <p className="mt-1 font-semibold">{selectedBoatAvailabilitySummary.label}</p>
                  <p className="mt-1 text-sm opacity-90">{selectedBoatAvailabilitySummary.detail}</p>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <TrackingStatCard
                  icon={UserRound}
                  label="Operator"
                  value={formatOperators(selectedBoat)}
                  detail="Assigned crew lead"
                  tone="sky"
                />
                {selectedBoatIsCargo ? (
                  <>
                    <TrackingStatCard
                      icon={Weight}
                      label="Max Weight"
                      value={`${selectedBoat.capacity ?? '-'} kg`}
                      detail="Cargo capacity"
                      tone="amber"
                    />
                    <TrackingStatCard
                      icon={CircleGauge}
                      label="Trip Status"
                      value={normalizeStatus(selectedBoat.cargoTripStatus ?? selectedBoat.tripStatus ?? 'preparing')}
                      detail="Current dispatch state"
                      tone="violet"
                    />
                  </>
                ) : (
                  <>
                    <TrackingStatCard
                      icon={Users}
                      label="Capacity"
                      value={selectedBoat.capacity ?? '-'}
                      detail="Passenger seats"
                      tone="amber"
                    />
                    <TrackingStatCard
                      icon={ShieldCheck}
                      label="Confirmed"
                      value={selectedBoat.confirmedSeats ?? 0}
                      detail="Seat assignments"
                      tone="emerald"
                    />
                    <TrackingStatCard
                      icon={CircleGauge}
                      label="Slots Left"
                      value={selectedBoat.availableSeats ?? selectedBoat.capacity ?? '-'}
                      detail="Ready to book"
                      tone="violet"
                    />
                  </>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {selectedBoatIsCargo ? (
                  <>
                    <TrackingStatCard icon={Package2} label="Cargo Bookings" value={activeCargoBookings.length} detail="Active manifests" tone="sky" />
                    <TrackingStatCard icon={Weight} label="Booked Weight" value={`${totalBookedCargoWeight} kg`} detail="Loaded bookings" tone="amber" />
                    <TrackingStatCard icon={Route} label="Cancelled Hidden" value={cancelledCargoCount} detail="Excluded from totals" tone="rose" />
                    <TrackingStatCard
                      icon={Wallet}
                      label="Payment Verified"
                      value={activeCargoBookings.filter((booking) => booking.paymentStatus === 'verified').length}
                      detail="Cleared payments"
                      tone="emerald"
                    />
                  </>
                ) : (
                  <>
                    <TrackingStatCard icon={Users} label="Passenger Bookings" value={activePersonBookings.length} detail="Active manifests" tone="sky" />
                    <TrackingStatCard icon={Users} label="Booked Pax" value={totalBookedPassengers} detail="Confirmed headcount" tone="amber" />
                    <TrackingStatCard icon={Route} label="Cancelled Hidden" value={cancelledPersonCount} detail="Excluded from totals" tone="rose" />
                    <TrackingStatCard
                      icon={Wallet}
                      label="Payment Verified"
                      value={activePersonBookings.filter((booking) => booking.paymentStatus === 'verified').length}
                      detail="Cleared payments"
                      tone="emerald"
                    />
                  </>
                )}
              </div>

              {selectedBoatIsCargo ? (
                <Card className="border-slate-800 bg-slate-900/50 text-slate-100 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Cargo Booking Manifest</CardTitle>
                    <CardDescription>
                      {activeCargoBookings.length} active record(s){cancelledCargoCount > 0 ? ` • ${cancelledCargoCount} cancelled hidden` : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-80 space-y-2 overflow-auto">
                    {activeCargoBookings.length === 0 ? (
                      <p className="text-sm text-slate-400">No active cargo bookings for this vessel.</p>
                    ) : (
                      activeCargoBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] p-4 text-sm"
                        >
                          <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-200">
                                <Package2 className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="font-semibold text-slate-100">{booking.senderName} {'->'} {booking.receiverName}</p>
                                <p className="mt-1 text-xs text-slate-400">{booking.origin} {'->'} {booking.destination}</p>
                              </div>
                            </div>
                            <p className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                              {normalizeStatus(booking.status)}
                            </p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
                              <span className="flex items-center gap-1 text-slate-400">
                                <Weight className="h-3.5 w-3.5" />
                                Weight
                              </span>
                              <p className="mt-1 font-semibold text-slate-100">{booking.weight} kg</p>
                            </div>
                            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
                              <span className="flex items-center gap-1 text-slate-400">
                                <Wallet className="h-3.5 w-3.5" />
                                Payment
                              </span>
                              <p className="mt-1 font-semibold text-slate-100">
                                {normalizeStatus(booking.paymentStatus)} {'•'} {booking.paymentMethod ?? 'cash'}
                              </p>
                            </div>
                          </div>
                          <p className="mt-3 text-xs text-slate-400">{booking.cargoDescription}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-slate-800 bg-slate-900/50 text-slate-100 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Passenger Booking Manifest</CardTitle>
                    <CardDescription>
                      {activePersonBookings.length} active record(s){cancelledPersonCount > 0 ? ` • ${cancelledPersonCount} cancelled hidden` : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-80 space-y-2 overflow-auto">
                    {activePersonBookings.length === 0 ? (
                      <p className="text-sm text-slate-400">No active passenger bookings for this vessel.</p>
                    ) : (
                      activePersonBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] p-4 text-sm"
                        >
                          <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-200">
                                <UserRound className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="font-semibold text-slate-100">{booking.passengerName}</p>
                                <p className="mt-1 text-xs text-slate-400">{booking.origin} {'->'} {booking.destination}</p>
                              </div>
                            </div>
                            <p className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                              {normalizeStatus(booking.status)}
                            </p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
                              <span className="flex items-center gap-1 text-slate-400">
                                <Users className="h-3.5 w-3.5" />
                                Quantity
                              </span>
                              <p className="mt-1 font-semibold text-slate-100">{booking.numberOfPassengers} passenger(s)</p>
                            </div>
                            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
                              <span className="flex items-center gap-1 text-slate-400">
                                <Wallet className="h-3.5 w-3.5" />
                                Payment
                              </span>
                              <p className="mt-1 font-semibold text-slate-100">{normalizeStatus(booking.paymentStatus)}</p>
                            </div>
                            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
                              <span className="flex items-center gap-1 text-slate-400">
                                <Phone className="h-3.5 w-3.5" />
                                Contact
                              </span>
                              <p className="mt-1 font-semibold text-slate-100">{booking.passengerPhone}</p>
                            </div>
                          </div>
                          <p className="mt-3 text-xs text-slate-400">Method: {booking.paymentMethod ?? 'cash'}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AvailabilityCalendarDialog
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        title="Vessel Availability Calendar"
        description="Review how many tracked vessels have schedules on each date."
        countLabel="boats"
        selectedDate={selectedDate}
        availabilityMap={calendarAvailabilityMap}
        onSelectDate={handleSelectCalendarDate}
        onVisibleRangeChange={handleCalendarRangeChange}
      />

      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100 sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Generate Vessel Report</DialogTitle>
            <DialogDescription className="text-slate-300">
              Export current view: <span className="font-semibold text-slate-100">{sectionTitle}</span> ({filteredRows.length} rows).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              className="h-auto justify-start gap-3 border-slate-700 bg-slate-900 py-3 text-left hover:bg-slate-800"
              disabled={downloadingFormat !== null}
              onClick={() => void handleExport('pdf')}
            >
              <FileText className="h-4 w-4 text-rose-300" />
              <span>
                <span className="block font-semibold">PDF Report</span>
                <span className="block text-xs text-slate-400">Printable operator brief</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-start gap-3 border-slate-700 bg-slate-900 py-3 text-left hover:bg-slate-800"
              disabled={downloadingFormat !== null}
              onClick={() => void handleExport('excel')}
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-300" />
              <span>
                <span className="block font-semibold">Excel Report</span>
                <span className="block text-xs text-slate-400">Data sheet for operations</span>
              </span>
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={downloadingFormat !== null} onClick={() => setShowReportModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusModalOpen} onOpenChange={handleStatusModalClose}>
        <DialogContent className="border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100 sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Update Trip Status</DialogTitle>
            <DialogDescription className="text-slate-300">
              {statusModal
                ? `Set ${statusModal.boat.name} to ${normalizeStatus(statusModal.status)}.`
                : 'Set the trip status.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Reason</label>
              <Input
                value={statusModalReason}
                onChange={(event) => setStatusModalReason(event.target.value)}
                placeholder="Enter the reason"
              />
            </div>
            {statusModal?.status === 'delayed' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">New estimated departure</label>
                <div className="grid grid-cols-[96px_96px_96px] items-center gap-3">
                  <Select
                    value={statusModalEtaHour}
                    onValueChange={(value) => {
                      setStatusModalEtaHour(value);
                      setStatusModalEta(to24HourTime(value, statusModalEtaMinute, statusModalEtaPeriod));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hour" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_HOURS.map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {hour}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={statusModalEtaMinute}
                    onValueChange={(value) => {
                      setStatusModalEtaMinute(value);
                      setStatusModalEta(to24HourTime(statusModalEtaHour, value, statusModalEtaPeriod));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Min" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_MINUTES.map((minute) => (
                        <SelectItem key={minute} value={minute}>
                          {minute}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={statusModalEtaPeriod}
                    onValueChange={(value) => {
                      const period = (value === 'PM' ? 'PM' : 'AM') as 'AM' | 'PM';
                      setStatusModalEtaPeriod(period);
                      setStatusModalEta(to24HourTime(statusModalEtaHour, statusModalEtaMinute, period));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="AM/PM" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_PERIODS.map((period) => (
                        <SelectItem key={period} value={period}>
                          {period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-slate-400">
                  Time only. We keep the same date for this trip.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => handleStatusModalClose(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmStatusModal} disabled={statusUpdatingBoatId === statusModal?.boat.id}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
});

export default VesselManagementPage;

