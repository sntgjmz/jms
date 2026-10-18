import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  Download,
  Loader2,
  Search,
  Ship,
  Waves,
  XCircle,
} from 'lucide-react';
import { useSettingsStore } from '@/stores';
import type { Fare, Schedule } from '@/stores/SettingsStore';
import Navbar from '@/components/Navbar';
import PortfolioDemoBanner from '@/components/PortfolioDemoBanner';
import { MOBILE_APP_CONFIG } from '@/config/constants';
import { preferencesAPI } from '@/api/preferences';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AvailabilityCalendarDialog from '@/components/AvailabilityCalendarDialog';
import '@/styles/pages/HomePage.css';

const formatScheduleDateTime = (value?: string, fallback?: string) => {
  if (!value) return fallback || 'Not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback || value;
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(parsed);
};

const formatScheduleTime = (value?: string) => {
  if (!value) return 'Time not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  }).format(parsed);
};

const simplifyLocationName = (value?: string) => {
  if (!value) return '-';
  return value
    .replace(/\bbarangay\b/gi, '')
    .replace(/\bcluster\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const formatCountdown = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const DEPARTED_GRACE_SECONDS = 15 * 60;
const MANUAL_OVERRIDE_STATUSES = new Set([
  'delayed',
  'arrived',
  'completed',
  'maintenance',
  'cancelled',
]);

const tripStatusMeta = (
  departure?: string,
  arrival?: string,
  nowMs: number = Date.now(),
  manualStatus?: string,
  manualReason?: string,
  manualEta?: string,
) => {
  const normalizedManualStatus = manualStatus?.trim().toLowerCase();
  if (normalizedManualStatus && MANUAL_OVERRIDE_STATUSES.has(normalizedManualStatus)) {
    const status = normalizedManualStatus;
    if (status === 'completed') {
      return {
        label: 'Completed',
        tone: 'closed' as const,
        diffSeconds: null as number | null,
        hideFromActive: true,
        detail: 'Trip already finished.',
      };
    }
    if (status === 'arrived') {
      return {
        label: 'Arrived',
        tone: 'closed' as const,
        diffSeconds: null as number | null,
        hideFromActive: true,
        detail: 'Vessel already reached the destination.',
      };
    }
    if (status === 'cancelled') {
      return {
        label: 'Cancelled',
        tone: 'closed' as const,
        diffSeconds: null as number | null,
        hideFromActive: false,
        detail: manualReason?.trim() ? `This trip will not operate. Reason: ${manualReason.trim()}` : 'This trip will not operate.',
      };
    }
    if (status === 'maintenance') {
      return {
        label: 'Unavailable',
        tone: 'closed' as const,
        diffSeconds: null as number | null,
        hideFromActive: false,
        detail: manualReason?.trim() ? `Unavailable due to maintenance. Reason: ${manualReason.trim()}` : 'Vessel is unavailable due to maintenance.',
      };
    }
    if (status === 'delayed') {
      const etaLabel = manualEta ? formatScheduleTime(manualEta) : null;
      return {
        label: 'Delayed',
        tone: 'soon' as const,
        diffSeconds: null as number | null,
        hideFromActive: false,
        detail: [
          etaLabel ? `Estimated departure: ${etaLabel}.` : null,
          manualReason?.trim() ? `Reason: ${manualReason.trim()}` : 'Trip departure has been delayed.',
        ].filter(Boolean).join(' '),
      };
    }
    if (status === 'in_transit') {
      return {
        label: 'In transit',
        tone: 'departed' as const,
        diffSeconds: null as number | null,
        hideFromActive: false,
        detail: 'Vessel is currently on the way.',
      };
    }
    if (status === 'out_for_delivery' || status === 'departure') {
      return {
        label: 'Departed',
        tone: 'departed' as const,
        diffSeconds: null as number | null,
        hideFromActive: false,
        detail: 'Vessel already departed from the port.',
      };
    }
    if (status === 'final_call') {
      return {
        label: 'Final call',
        tone: 'soon' as const,
        diffSeconds: null as number | null,
        hideFromActive: false,
        detail: 'Last 5 minutes before departure.',
      };
    }
    if (status === 'boarding') {
      return {
        label: 'Boarding',
        tone: 'boarding' as const,
        diffSeconds: null as number | null,
        hideFromActive: false,
        detail: 'Boarding window is open up to 30 minutes before departure.',
      };
    }
  }

  const departureTime = departure ? new Date(departure).getTime() : NaN;
  const arrivalTime = arrival ? new Date(arrival).getTime() : NaN;

  if (Number.isNaN(departureTime)) {
    return {
      label: 'Scheduled',
      tone: 'scheduled' as const,
      diffSeconds: null as number | null,
      hideFromActive: false,
      detail: 'Waiting for the scheduled departure window.',
    };
  }

  const diffSeconds = Math.floor((departureTime - nowMs) / 1000);
  if (!Number.isNaN(arrivalTime) && nowMs >= arrivalTime) {
    return {
      label: 'Completed',
      tone: 'closed' as const,
      diffSeconds,
      hideFromActive: true,
      detail: 'Trip already finished.',
    };
  }
  if (diffSeconds > 1800) {
    return {
      label: 'Scheduled',
      tone: 'scheduled' as const,
      diffSeconds,
      hideFromActive: false,
      detail: 'Boarding starts 30 minutes before departure.',
    };
  }
  if (diffSeconds > 300) {
    return {
      label: 'Boarding',
      tone: 'boarding' as const,
      diffSeconds,
      hideFromActive: false,
      detail: 'Passengers should proceed to the boat now.',
    };
  }
  if (diffSeconds > 0) {
    return {
      label: 'Final call',
      tone: 'soon' as const,
      diffSeconds,
      hideFromActive: false,
      detail: 'Less than 5 minutes before departure.',
    };
  }
  if (diffSeconds >= -DEPARTED_GRACE_SECONDS) {
    return {
      label: 'Departed',
      tone: 'departed' as const,
      diffSeconds,
      hideFromActive: false,
      detail: 'Vessel already left the port.',
    };
  }
  return {
    label: 'Completed',
    tone: 'closed' as const,
    diffSeconds,
    hideFromActive: true,
    detail: 'Trip already finished.',
  };
};

const addDays = (base: Date, days: number) => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

const toManilaIsoDate = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(date);

const resolveSlotTone = (available?: number, capacity?: number) => {
  const total = Number(capacity ?? 0);
  const left = Number(available ?? capacity ?? 0);
  if (!Number.isFinite(total) || total <= 0) {
    return {
      pill: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    };
  }
  if (left <= 0) {
    return {
      pill: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
    };
  }
  const ratio = left / total;
  if (ratio <= 0.2) {
    return {
      pill: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    };
  }
  if (ratio <= 0.5) {
    return {
      pill: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
    };
  }
  return {
    pill: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  };
};

const isCargoSchedule = (schedule?: Schedule | null) =>
  (schedule?.boatType ?? '').toLowerCase() === 'cargo';

const isCargoBooked = (schedule?: Schedule | null) => Boolean(schedule?.cargoBooked);

const normalizeCargoBookingStatus = (value?: string | null) => (value ?? '').trim().toLowerCase();

const resolveScheduleFareAmount = (schedule: Schedule, fares: Fare[]) => {
  const fare =
    fares.find((item) => item.id === schedule.routeFareId)
    ?? fares.find((item) => item.route.trim().toLowerCase() === (schedule.route || '').trim().toLowerCase());
  if (!fare) return null;
  if (fare.type === 'cargo') {
    return fare.rentalFare ?? null;
  }
  const baseFare = fare.baseFare ?? 0;
  const percent = fare.percentagePerKilometer ?? 0;
  const distance = Math.max((fare.distanceKm ?? 1) - 1, 0);
  return baseFare + baseFare * (percent / 100) * distance;
};

const resolveScheduleFareLabel = (schedule: Schedule, fares: Fare[]) => {
  const fare =
    fares.find((item) => item.id === schedule.routeFareId)
    ?? fares.find((item) => item.route.trim().toLowerCase() === (schedule.route || '').trim().toLowerCase());
  if (!fare) return 'Not set';
  if (fare.type === 'cargo') {
    const rentalFare = fare.rentalFare ?? 0;
    const weightLimitKg = fare.weightLimitKg ?? 0;
    return `P ${rentalFare.toFixed(2)} base up to ${weightLimitKg}kg, +10%/kg excess`;
  }
  const amount = resolveScheduleFareAmount(schedule, fares);
  return amount != null ? `P ${amount.toFixed(2)} per passenger` : 'Not set';
};

const HomePage = observer(() => {
  const settingsStore = useSettingsStore();
  const apkVersion = (import.meta.env.VITE_APP_APK_VERSION || 'v1.0').trim();
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return false;

    const hasSeenIntro = sessionStorage.getItem('portfolio_isla_demo_home_intro_seen') === '1';
    const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return !hasSeenIntro && !isSmallScreen && !prefersReducedMotion;
  });
  const [introClosing, setIntroClosing] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [departureBarangay, setDepartureBarangay] = useState('');
  const [destinationBarangay, setDestinationBarangay] = useState('');
  const [departureQuery, setDepartureQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [departureOpen, setDepartureOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [departureDate, setDepartureDate] = useState(() => toManilaIsoDate(new Date()));
  const [dateWindowOffset, setDateWindowOffset] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [appliedScheduleFilter, setAppliedScheduleFilter] = useState<{
    from: string;
    to: string;
    date: string;
  }>(() => ({
    from: '',
    to: '',
    date: toManilaIsoDate(new Date()),
  }));
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [showPastTrips, setShowPastTrips] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [clockTick, setClockTick] = useState(() => Date.now());
  const manilaTodayIso = toManilaIsoDate(new Date());
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  const barangayOptions = useMemo(() => {
    const names = settingsStore.barangays
      .map((item) => item.barangayName?.trim())
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'en'));
  }, [settingsStore.barangays]);

  const filteredDepartureOptions = useMemo(() => {
    const q = departureQuery.trim().toLowerCase();
    const pool = barangayOptions.filter(
      (name) => !destinationBarangay || name.toLowerCase() !== destinationBarangay.toLowerCase(),
    );
    if (!q) return pool;
    return pool.filter((name) => name.toLowerCase().includes(q));
  }, [barangayOptions, departureQuery, destinationBarangay]);

  const filteredDestinationOptions = useMemo(() => {
    const q = destinationQuery.trim().toLowerCase();
    const pool = barangayOptions.filter(
      (name) => !departureBarangay || name.toLowerCase() !== departureBarangay.toLowerCase(),
    );
    if (!q) return pool;
    return pool.filter((name) => name.toLowerCase().includes(q));
  }, [barangayOptions, destinationQuery, departureBarangay]);

  const visibleOneWayDates = useMemo(() => {
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

  const publicSchedulePreview = useMemo(() => {
    return [...settingsStore.schedules].sort((a, b) => {
      const aTime = new Date(a.departureDatetime || a.departure || '').getTime();
      const bTime = new Date(b.departureDatetime || b.departure || '').getTime();
      const safeA = Number.isNaN(aTime) ? Number.MAX_SAFE_INTEGER : aTime;
      const safeB = Number.isNaN(bTime) ? Number.MAX_SAFE_INTEGER : bTime;
      return safeA - safeB;
    });
  }, [settingsStore.schedules]);

  const getScheduleStatus = (schedule?: Schedule | null) =>
    tripStatusMeta(
      schedule?.departureDatetime,
      schedule?.arrivalDatetime,
      clockTick,
      schedule?.tripStatus,
      schedule?.tripStatusReason,
      schedule?.tripStatusEta,
    );

  const activeSchedulePreview = useMemo(
    () =>
      publicSchedulePreview.filter((schedule) => {
        const status = getScheduleStatus(schedule);
        return !status.hideFromActive;
      }),
    [clockTick, publicSchedulePreview],
  );

  const scheduleSource = useMemo(
    () => (showPastTrips ? publicSchedulePreview : activeSchedulePreview),
    [activeSchedulePreview, publicSchedulePreview, showPastTrips],
  );

  const filteredSchedulePreview = useMemo(() => {
    return scheduleSource.filter((schedule) => {
      const matchFrom = !appliedScheduleFilter.from
        || (schedule.origin || '').toLowerCase() === appliedScheduleFilter.from.toLowerCase();
      const matchTo = !appliedScheduleFilter.to
        || (schedule.destination || '').toLowerCase() === appliedScheduleFilter.to.toLowerCase();
      const matchDate = !appliedScheduleFilter.date
        || (schedule.departureDatetime || '').startsWith(appliedScheduleFilter.date);
      return matchFrom && matchTo && matchDate;
    });
  }, [appliedScheduleFilter, scheduleSource]);

  const fareByScheduleId = useMemo(() => {
    const map = new Map<string, number | null>();
    filteredSchedulePreview.forEach((schedule) => {
      map.set(schedule.id, resolveScheduleFareAmount(schedule, settingsStore.fares));
    });
    return map;
  }, [filteredSchedulePreview, settingsStore.fares]);

  const fareTypeByScheduleId = useMemo(() => {
    const map = new Map<string, Fare['type']>();
    filteredSchedulePreview.forEach((schedule) => {
      const fare =
        settingsStore.fares.find((item) => item.id === schedule.routeFareId)
        ?? settingsStore.fares.find((item) => item.route.trim().toLowerCase() === (schedule.route || '').trim().toLowerCase());
      if (fare?.type) {
        map.set(schedule.id, fare.type);
      }
    });
    return map;
  }, [filteredSchedulePreview, settingsStore.fares]);

  const resolveScheduleIsCargo = (schedule?: Schedule | null) =>
    isCargoSchedule(schedule) || fareTypeByScheduleId.get(schedule?.id ?? '') === 'cargo';

  const resolveCargoCapacityLabel = (schedule?: Schedule | null) => {
    if (!schedule) return '-';
    const bookingStatus = normalizeCargoBookingStatus(schedule.cargoBookingStatus);
    if (bookingStatus === 'for_verification' || bookingStatus === 'pending_payment') {
      return 'Payment review';
    }
    if (isCargoBooked(schedule)) {
      return 'Already booked';
    }
    return `${schedule.capacity ?? '-'} kg max`;
  };

  const hasPassengerSchedules = useMemo(
    () => filteredSchedulePreview.some((schedule) => !resolveScheduleIsCargo(schedule)),
    [filteredSchedulePreview],
  );

  const hasCargoSchedules = useMemo(
    () => filteredSchedulePreview.some((schedule) => resolveScheduleIsCargo(schedule)),
    [filteredSchedulePreview],
  );

  const selectedScheduleStatus = useMemo(
    () => getScheduleStatus(selectedSchedule),
    [clockTick, selectedSchedule],
  );

  const dateAvailabilityMap = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (const item of visibleOneWayDates) byDate[item.iso] = 0;

    for (const schedule of scheduleSource) {
      const scheduleDate = (schedule.departureDatetime || '').slice(0, 10);
      if (!scheduleDate || !(scheduleDate in byDate)) continue;

      const matchFrom = !departureBarangay || (schedule.origin || '').toLowerCase() === departureBarangay.toLowerCase();
      const matchTo = !destinationBarangay || (schedule.destination || '').toLowerCase() === destinationBarangay.toLowerCase();
      if (matchFrom && matchTo) {
        byDate[scheduleDate] += 1;
      }
    }

    return byDate;
  }, [departureBarangay, destinationBarangay, scheduleSource, visibleOneWayDates]);

  const calendarAvailabilityMap = useMemo(() => {
    const byDate: Record<string, number> = {};

    for (const schedule of scheduleSource) {
      const scheduleDate = (schedule.departureDatetime || '').slice(0, 10);
      if (!scheduleDate) continue;

      const matchFrom = !departureBarangay || (schedule.origin || '').toLowerCase() === departureBarangay.toLowerCase();
      const matchTo = !destinationBarangay || (schedule.destination || '').toLowerCase() === destinationBarangay.toLowerCase();
      if (matchFrom && matchTo) {
        byDate[scheduleDate] = (byDate[scheduleDate] ?? 0) + 1;
      }
    }

    return byDate;
  }, [departureBarangay, destinationBarangay, scheduleSource]);

  const hasActiveFilters = Boolean(appliedScheduleFilter.from || appliedScheduleFilter.to || appliedScheduleFilter.date);

  const clearFilters = () => {
    setDepartureBarangay('');
    setDestinationBarangay('');
    setDepartureQuery('');
    setDestinationQuery('');
    setDepartureOpen(false);
    setDestinationOpen(false);
    setDepartureDate(manilaTodayIso);
    setDateWindowOffset(0);
    setAppliedScheduleFilter({
      from: '',
      to: '',
      date: manilaTodayIso,
    });
  };

  const applyScheduleFilter = (nextDate: string) => {
    if (nextDate < manilaTodayIso) return;
    setDepartureDate(nextDate);
    setAppliedScheduleFilter({
      from: departureBarangay,
      to: destinationBarangay,
      date: nextDate,
    });
  };

  const handleCalendarSelectDate = (date: string) => {
    if (date < manilaTodayIso) return;
    applyScheduleFilter(date);
    const today = new Date();
    const selected = new Date(date);
    const diffMs = selected.getTime() - new Date(toManilaIsoDate(today)).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    setDateWindowOffset(Math.max(0, Math.floor(diffDays / 7)));
  };

  useEffect(() => {
    const loadClientTheme = async () => {
      try {
        const pref = await preferencesAPI.getClientPreferences();
        const nextTheme = pref.theme === 'light' ? 'light' : 'dark';
        setTheme(nextTheme);
        document.documentElement.classList.toggle('dark', nextTheme === 'dark');
      } catch {
        // keep default theme
      }
    };
    void loadClientTheme();
  }, []);

  useAutoRefresh(
    async () => {
      await settingsStore.fetchPublicHomeContent();
    },
    [settingsStore],
    { intervalMs: 10000 },
  );

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!showIntro) return;

    const beginClose = setTimeout(() => setIntroClosing(true), 900);
    const endIntro = setTimeout(() => {
      setShowIntro(false);
      sessionStorage.setItem('portfolio_isla_demo_home_intro_seen', '1');
    }, 1300);
    const hardStop = setTimeout(() => {
      setIntroClosing(true);
      setShowIntro(false);
      sessionStorage.setItem('portfolio_isla_demo_home_intro_seen', '1');
    }, 2200);

    return () => {
      clearTimeout(beginClose);
      clearTimeout(endIntro);
      clearTimeout(hardStop);
    };
  }, [showIntro]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 280);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    void preferencesAPI.updateClientPreferences({ theme: nextTheme });
  };
  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const applyScheduleSearch = () => {
    setAppliedScheduleFilter({
      from: departureBarangay,
      to: destinationBarangay,
      date: departureDate,
    });
    scrollToSection('schedules');
  };

  const SectionDivider = () => (
    <div className="section-divider" aria-hidden="true">
      <span className="section-divider-line" />
      <span className="section-divider-badge">
        <Anchor className="h-4 w-4" />
      </span>
      <span className="section-divider-line" />
    </div>
  );

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-gradient-to-b from-cyan-50 via-slate-50 to-white text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 dark:text-slate-100 focus:outline-none">
      {showIntro && (
        <div className={`intro-overlay ${introClosing ? 'intro-overlay-hide' : ''}`} aria-hidden="true">
          <div className="intro-glow intro-glow-a" />
          <div className="intro-glow intro-glow-b" />
          <div className="intro-content">
            <div className="intro-logo">
              <Ship className="h-10 w-10 text-white" />
            </div>
            <p className="intro-title">Isla Sakay</p>
            <p className="intro-subtitle">Navigating your island journey</p>
          </div>
        </div>
      )}
      <Navbar publicTheme={theme} onTogglePublicTheme={toggleTheme} />
      <div className="pt-16"><PortfolioDemoBanner /></div>

      <section id="schedules" className="relative overflow-hidden bg-gradient-to-b from-cyan-100 via-sky-100 to-slate-100 pb-14 pt-8 text-slate-900 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:text-slate-100">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-20 left-10 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 reveal-block" data-reveal>
            <div>
              <div className="flex items-center gap-2">
                <Anchor className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                <h2 className="text-2xl font-bold sm:text-3xl">Boat Schedules</h2>
              </div>
            </div>
            <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200">
              Sorted by One-way
            </span>
          </div>

          <div className="mb-5 rounded-2xl border border-blue-200 bg-white/90 p-4 shadow-sm dark:border-blue-900/60 dark:bg-slate-900/80">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">First time here? Booking is done in the mobile app.</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Tap <span className="font-semibold">Download APK</span>, then create/login account in the app and complete booking there.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => scrollToSection('download-app')}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Download className="h-4 w-4" />
                  Download App
                </button>
              </div>
            </div>
          </div>

          <div className="sticky top-16 z-30 mb-5 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-2xl backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/75">
            <button
              type="button"
              className="mb-3 inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 lg:hidden"
              onClick={() => setShowMobileFilters((prev) => !prev)}
              aria-expanded={showMobileFilters}
              aria-controls="schedule-filters-panel"
            >
              <span>
                {departureBarangay || 'Any departure'} {'->'} {destinationBarangay || 'Any destination'} | {departureDate}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
            </button>

            <div id="schedule-filters-panel" className={`${showMobileFilters ? 'block' : 'hidden'} lg:block`}>
              <div className="grid gap-3 lg:grid-cols-[1.2fr_1.2fr_auto]">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">From Barangay</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                  <input
                    value={departureOpen ? departureQuery : simplifyLocationName(departureBarangay)}
                    onChange={(event) => {
                      setDepartureQuery(event.target.value);
                      setDepartureOpen(true);
                    }}
                    onFocus={() => {
                      setDepartureQuery(departureBarangay);
                      setDepartureOpen(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setDepartureOpen(false);
                        setDepartureQuery('');
                      }, 120);
                    }}
                    placeholder="Departure"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-slate-900 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none dark:border-slate-600 dark:bg-slate-950/90 dark:text-slate-100 dark:placeholder:text-slate-400"
                  />
                  {departureOpen && (
                    <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                      <button
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setDepartureBarangay('');
                          setDepartureQuery('');
                          setDepartureOpen(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm ${!departureBarangay ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                      >
                        All departures
                      </button>
                      {filteredDepartureOptions.map((barangay) => (
                        <button
                          key={`from-${barangay}`}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setDepartureBarangay(barangay);
                            setDepartureQuery(barangay);
                            if (destinationBarangay.toLowerCase() === barangay.toLowerCase()) {
                              setDestinationBarangay('');
                              setDestinationQuery('');
                            }
                            setDepartureOpen(false);
                          }}
                          className={`mt-1 w-full rounded-lg px-3 py-2 text-left text-sm ${departureBarangay === barangay ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                        >
                          {simplifyLocationName(barangay)}
                        </button>
                      ))}
                      {filteredDepartureOptions.length === 0 && (
                        <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No match found.</p>
                      )}
                    </div>
                  )}
                </div>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">To Barangay</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                  <input
                    value={destinationOpen ? destinationQuery : simplifyLocationName(destinationBarangay)}
                    onChange={(event) => {
                      setDestinationQuery(event.target.value);
                      setDestinationOpen(true);
                    }}
                    onFocus={() => {
                      setDestinationQuery(destinationBarangay);
                      setDestinationOpen(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setDestinationOpen(false);
                        setDestinationQuery('');
                      }, 120);
                    }}
                    placeholder="Destination"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-slate-900 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none dark:border-slate-600 dark:bg-slate-950/90 dark:text-slate-100 dark:placeholder:text-slate-400"
                  />
                  {destinationOpen && (
                    <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                      <button
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setDestinationBarangay('');
                          setDestinationQuery('');
                          setDestinationOpen(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm ${!destinationBarangay ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                      >
                        All destinations
                      </button>
                      {filteredDestinationOptions.map((barangay) => (
                        <button
                          key={`to-${barangay}`}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setDestinationBarangay(barangay);
                            setDestinationQuery(barangay);
                            if (departureBarangay.toLowerCase() === barangay.toLowerCase()) {
                              setDepartureBarangay('');
                              setDepartureQuery('');
                            }
                            setDestinationOpen(false);
                          }}
                          className={`mt-1 w-full rounded-lg px-3 py-2 text-left text-sm ${destinationBarangay === barangay ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                        >
                          {simplifyLocationName(barangay)}
                        </button>
                      ))}
                      {filteredDestinationOptions.length === 0 && (
                        <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No match found.</p>
                      )}
                    </div>
                  )}
                </div>
              </label>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={applyScheduleSearch}
                  disabled={settingsStore.isLoading}
                  className="h-11 w-full rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto"
                >
                  {settingsStore.isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </span>
                  ) : 'Search schedules'}
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Clear
                </button>
              </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">One-way date</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCalendarOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    Calendar
                  </button>
                  <button
                    type="button"
                    onClick={() => applyScheduleFilter(manilaTodayIso)}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => applyScheduleFilter(toManilaIsoDate(addDays(new Date(), 1)))}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDateWindowOffset((prev) => Math.max(0, prev - 1))}
                  disabled={dateWindowOffset === 0}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label="Previous dates"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {visibleOneWayDates.map((item) => {
                    const active = departureDate === item.iso;
                    const isPastDate = item.iso < manilaTodayIso;
                    const availability = dateAvailabilityMap[item.iso] || 0;
                    const availabilityTone = availability === 0
                      ? (active ? 'text-rose-100' : 'text-rose-600 dark:text-rose-300')
                      : availability <= 2
                        ? (active ? 'text-amber-100' : 'text-amber-600 dark:text-amber-300')
                        : (active ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-300');
                    return (
                      <button
                        key={item.iso}
                        type="button"
                        onClick={() => applyScheduleFilter(item.iso)}
                        disabled={isPastDate}
                        className={`rounded-xl border px-2 py-2 text-left text-xs transition ${
                          active
                            ? 'border-blue-500 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
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
                <button
                  type="button"
                  onClick={() => setDateWindowOffset((prev) => prev + 1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label="Next dates"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex flex-wrap items-center gap-3">
              <p>
                {filteredSchedulePreview.length} {showPastTrips ? `past trip${filteredSchedulePreview.length === 1 ? '' : 's'} shown` : `schedule${filteredSchedulePreview.length === 1 ? '' : 's'} available`}
              </p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {hasPassengerSchedules && (
                <>
                  <span className="text-slate-500 dark:text-slate-400">Passenger slots guide:</span>
                  <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">High</span>
                  <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300">Medium</span>
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Low</span>
                  <span className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">Full</span>
                </>
              )}
              {hasCargoSchedules && (
                <span className="text-slate-500 dark:text-slate-400">Cargo trips show max weight and whether the trip is already booked.</span>
              )}
            </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPastTrips((prev) => !prev)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                showPastTrips
                  ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              {showPastTrips ? 'Hide past trips' : 'Show past trips'}
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
              {filteredSchedulePreview.map((schedule, index) => {
                const status = getScheduleStatus(schedule);
                const secs = status.diffSeconds;
                const scheduleIsCargo = resolveScheduleIsCargo(schedule);
                const slotsTone = scheduleIsCargo
                  ? { pill: 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300' }
                  : resolveSlotTone(schedule.availableSeats, schedule.capacity);
                const fare = fareByScheduleId.get(schedule.id);
                return (
                  <button
                    key={`mobile-${schedule.id}`}
                    type="button"
                    onClick={() => setSelectedSchedule(schedule)}
                    className="w-full p-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-950/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">#{index + 1}</p>
                        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{schedule.boatName || 'Boat'}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {scheduleIsCargo ? 'Cargo' : 'Boat'}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {simplifyLocationName(schedule.origin)} {'->'} {simplifyLocationName(schedule.destination)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          status.tone === 'closed'
                            ? 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : status.tone === 'boarding'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : status.tone === 'departed'
                                ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                : status.tone === 'soon'
                                  ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300'
                        }`}
                      >
                        {status.label}
                      </span>
                    </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Time</p>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-100">{formatScheduleTime(schedule.departureDatetime)}</p>
                            <p className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <Ship className="h-3 w-3" />
                              Depart
                            </p>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-100">{formatScheduleTime(schedule.arrivalDatetime)}</p>
                            <p className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <Anchor className="h-3 w-3" />
                              Arrive
                            </p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Capacity</p>
                        <div className="mt-1">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${showPastTrips || scheduleIsCargo ? 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300' : slotsTone.pill}`}>
                            {scheduleIsCargo
                              ? resolveCargoCapacityLabel(schedule)
                              : showPastTrips
                                ? `Final slots: ${schedule.availableSeats ?? schedule.capacity ?? '-'}`
                                : `${schedule.availableSeats ?? schedule.capacity ?? '-'} slots`}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Departs in</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">
                          {showPastTrips
                            ? 'Ended'
                            : secs === null
                            ? '--:--:--'
                            : secs > 0
                              ? formatCountdown(secs)
                              : status.tone === 'departed'
                                ? `${formatCountdown(Math.abs(secs))} ago`
                                : 'Ended'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Fare</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">
                          {scheduleIsCargo
                            ? fare != null ? `P ${fare.toFixed(2)}` : 'Not set'
                            : fare != null ? `P ${fare.toFixed(2)}` : 'Not set'}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {scheduleIsCargo ? 'Cargo uses rental fare plus overweight surcharge.' : 'Passenger fare is based on route distance.'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            scrollToSection('download-app');
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Book in App
                        </button>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="hidden max-h-[420px] overflow-y-auto md:block">
              <table className="w-full table-fixed text-center">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="sticky top-0 z-10 bg-slate-50 px-3 py-3 dark:bg-slate-950">Boat / Route</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-3 py-3 dark:bg-slate-950">Type</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-3 py-3 dark:bg-slate-950">Time</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-3 py-3 dark:bg-slate-950">Capacity</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-3 py-3 dark:bg-slate-950">Fare</th>
                    <th className="sticky top-0 z-10 w-44 bg-slate-50 px-3 py-3 dark:bg-slate-950">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredSchedulePreview.map((schedule) => {
                    const status = getScheduleStatus(schedule);
                    const secs = status.diffSeconds;
                    const scheduleIsCargo = resolveScheduleIsCargo(schedule);
                    const slotsTone = scheduleIsCargo
                      ? { pill: 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300' }
                      : resolveSlotTone(schedule.availableSeats, schedule.capacity);
                    const fare = fareByScheduleId.get(schedule.id);
                    return (
                      <tr
                        key={`desktop-${schedule.id}`}
                        onClick={() => setSelectedSchedule(schedule)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedSchedule(schedule);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        className="cursor-pointer transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-950/60"
                        aria-label={`View schedule for ${schedule.boatName || 'Boat'} from ${simplifyLocationName(schedule.origin)} to ${simplifyLocationName(schedule.destination)}`}
                      >
                        <td className="px-3 py-4">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{schedule.boatName || 'Boat'}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {simplifyLocationName(schedule.origin)} {'->'} {simplifyLocationName(schedule.destination)}
                          </p>
                        </td>
                        <td className="px-3 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {scheduleIsCargo ? 'Cargo' : 'Boat'}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center justify-center gap-3">
                            <div className="text-left">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatScheduleTime(schedule.departureDatetime)}</p>
                              <p className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                <Ship className="h-3 w-3" />
                                Depart
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                            <div className="text-left">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatScheduleTime(schedule.arrivalDatetime)}</p>
                              <p className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                <Anchor className="h-3 w-3" />
                                Arrive
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                          <div className="flex items-center justify-center">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${showPastTrips || scheduleIsCargo ? 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300' : slotsTone.pill}`}>
                              {scheduleIsCargo
                                ? resolveCargoCapacityLabel(schedule)
                                : showPastTrips
                                  ? `Final slots: ${schedule.availableSeats ?? schedule.capacity ?? '-'}`
                                  : `${schedule.availableSeats ?? schedule.capacity ?? '-'} slots`}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {scheduleIsCargo
                            ? fare != null ? `P ${fare.toFixed(2)}` : 'Not set'
                            : fare != null ? `P ${fare.toFixed(2)}` : 'Not set'}
                        </td>
                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                              status.tone === 'closed'
                                ? 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                : status.tone === 'boarding'
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : status.tone === 'departed'
                                    ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                    : status.tone === 'soon'
                                      ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                      : 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300'
                            }`}
                          >
                            {status.label}
                          </span>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {showPastTrips
                              ? 'Ended'
                              : secs === null
                              ? '--:--:--'
                              : secs > 0
                                ? formatCountdown(secs)
                                : status.tone === 'departed'
                                  ? `${formatCountdown(Math.abs(secs))} ago`
                                  : 'Ended'}
                          </p>
                          <p className="mt-1 max-w-[180px] text-[11px] text-slate-500 dark:text-slate-400">
                            {status.detail}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {filteredSchedulePreview.length === 0 && (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
              <p>{hasActiveFilters ? 'No schedules found for this filter. Try another route or date.' : 'No schedules are published yet.'}</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Clear filters
                </button>
                <button
                  type="button"
                  onClick={() => applyScheduleFilter(toManilaIsoDate(addDays(new Date(), 1)))}
                  className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                >
                  Try tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('download-app')}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Download App
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <Dialog open={Boolean(selectedSchedule)} onOpenChange={(open) => !open && setSelectedSchedule(null)}>
        <DialogContent className="max-h-[92vh] w-[95vw] overflow-y-auto border border-blue-900/60 bg-gradient-to-b from-slate-950 via-[#04102a] to-slate-950 p-0 text-slate-100 sm:max-w-[720px]">
          {(() => {
            const scheduleIsCargo = resolveScheduleIsCargo(selectedSchedule);
            const modalSlotsTone = scheduleIsCargo
              ? { pill: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200' }
              : resolveSlotTone(selectedSchedule?.availableSeats, selectedSchedule?.capacity);
            return (
              <>
                <DialogHeader className="relative overflow-hidden border-b border-slate-800/80 p-6 pb-5">
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-cyan-500/20 blur-3xl" />
                    <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-blue-600/20 blur-3xl" />
                  </div>
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <p className="mb-1 text-[11px] uppercase tracking-[0.24em] text-blue-200/80">Trip Details</p>
                      <DialogTitle className="text-3xl font-extrabold tracking-tight">
                        {selectedSchedule?.boatName || 'Boat'}
                      </DialogTitle>
                      <DialogDescription className="mt-1 text-base text-slate-300">
                        {simplifyLocationName(selectedSchedule?.origin)} {'->'} {simplifyLocationName(selectedSchedule?.destination)}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 p-6">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-inner shadow-slate-950/40">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Gate State</p>
                      <span
                        className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                          selectedScheduleStatus.tone === 'closed'
                            ? 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : selectedScheduleStatus.tone === 'boarding'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : selectedScheduleStatus.tone === 'departed'
                                ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                : selectedScheduleStatus.tone === 'soon'
                                  ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300'
                        }`}
                      >
                        {selectedScheduleStatus.label}
                      </span>
                      <p className="mt-2 text-sm text-slate-300">
                        {selectedScheduleStatus.detail}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-inner shadow-slate-950/40">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Departs In</p>
                      <p className="mt-3 text-xl font-bold text-cyan-200">
                        {selectedScheduleStatus.diffSeconds == null
                          ? '--:--:--'
                          : selectedScheduleStatus.diffSeconds > 0
                            ? formatCountdown(selectedScheduleStatus.diffSeconds)
                            : selectedScheduleStatus.tone === 'departed'
                              ? `${formatCountdown(Math.abs(selectedScheduleStatus.diffSeconds))} ago`
                              : '00:00:00'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-inner shadow-slate-950/40">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Capacity</p>
                      <div className="mt-3">
                        <span className={`inline-flex rounded-full border px-3 py-1.5 text-base font-bold ${modalSlotsTone.pill}`}>
                          {scheduleIsCargo
                            ? resolveCargoCapacityLabel(selectedSchedule)
                            : `${selectedSchedule?.availableSeats ?? selectedSchedule?.capacity ?? '-'} slots`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Operator (private)</p>
                    <p className="mt-2 text-base font-semibold blur-sm select-none">
                      {selectedSchedule?.operatorName || 'Operator not set'}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4">
                      <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
                        <Ship className="h-3.5 w-3.5" />
                        Departure
                      </p>
                      <p className="mt-2 text-base font-semibold">{formatScheduleDateTime(selectedSchedule?.departureDatetime, selectedSchedule?.departure)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4">
                      <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
                        <Anchor className="h-3.5 w-3.5" />
                        Arrival
                      </p>
                      <p className="mt-2 text-base font-semibold">{formatScheduleDateTime(selectedSchedule?.arrivalDatetime, selectedSchedule?.arrival)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Fare Rule</p>
                    <p className="mt-2 text-base font-semibold text-slate-100">
                      {selectedSchedule && resolveScheduleIsCargo(selectedSchedule)
                        ? resolveScheduleFareLabel(selectedSchedule, settingsStore.fares)
                        : selectedSchedule
                          ? resolveScheduleFareLabel(selectedSchedule, settingsStore.fares)
                          : 'Not set'}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {scheduleIsCargo
                        ? 'Cargo starts at the rental fare up to the fare weight limit. Every 1kg above that adds 10% of the rental fare, and booking cannot exceed the vessel max weight.'
                        : 'Passenger banca fare is computed per passenger using the route distance rule from Fare Management.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-blue-800/60 bg-blue-950/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-blue-200/90">Book this trip</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {scheduleIsCargo && isCargoBooked(selectedSchedule)
                        ? normalizeCargoBookingStatus(selectedSchedule?.cargoBookingStatus) === 'for_verification' || normalizeCargoBookingStatus(selectedSchedule?.cargoBookingStatus) === 'pending_payment'
                          ? 'This cargo trip is waiting for payment verification.'
                          : 'This cargo trip already has an active booking.'
                        : 'Booking is completed in the Isla Sakay mobile app.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSchedule(null);
                        scrollToSection('download-app');
                      }}
                      disabled={scheduleIsCargo && isCargoBooked(selectedSchedule)}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                    >
                      <Download className="h-4 w-4" />
                      {scheduleIsCargo && isCargoBooked(selectedSchedule) ? 'Already booked' : 'Book in App'}
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AvailabilityCalendarDialog
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        title="Boat Schedule Calendar"
        description="Review how many public trips are available on each date."
        countLabel="trips"
        selectedDate={departureDate}
        availabilityMap={calendarAvailabilityMap}
        onSelectDate={handleCalendarSelectDate}
      />

      <SectionDivider />

      <section id="download-app" className="bg-gradient-to-b from-blue-50 to-white py-16 dark:from-slate-900 dark:to-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="reveal-block rounded-3xl border border-blue-200/80 bg-white p-6 shadow-2xl sm:p-8 dark:border-slate-700 dark:bg-slate-950" data-reveal>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-2xl font-bold sm:text-3xl">Get the Isla Sakay App</h3>
                <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">Android APK {apkVersion}.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200">
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Android Supported
                  </span>
                  <span className="inline-flex items-center rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-700 dark:bg-rose-900/25 dark:text-rose-200">
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    iOS Not Supported
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-700 dark:bg-rose-900/25 dark:text-rose-200">
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    Not available in Play Store
                  </span>
                  <span className="inline-flex items-center rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:border-rose-700 dark:bg-rose-900/25 dark:text-rose-200">
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    Not available in App Store
                  </span>
                </div>
              </div>
              <a
                href={MOBILE_APP_CONFIG.APK_URL}
                className="premium-primary-btn inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white max-sm:w-full"
                download
              >
                <Download className="h-4 w-4" />
                Download APK
              </a>
            </div>
          </div>
        </div>
      </section>
      <SectionDivider />

      <section id="contact" className="bg-white py-16 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold sm:text-3xl reveal-block" data-reveal>Contact</h3>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <article className="reveal-block rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60" data-reveal>
              <Anchor className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              <h4 className="mt-3 font-semibold">Port Hotline</h4>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{settingsStore.contactInfo.phone}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{settingsStore.contactInfo.officeHours}</p>
            </article>
            <article className="reveal-block rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60" data-reveal>
              <Ship className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              <h4 className="mt-3 font-semibold">Harbor Helpdesk</h4>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{settingsStore.contactInfo.email}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Response within 24 hours</p>
            </article>
            <article className="reveal-block rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60" data-reveal>
              <Waves className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              <h4 className="mt-3 font-semibold">Dock Office</h4>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{settingsStore.contactInfo.officeAddress}</p>
            </article>
          </div>
        </div>
      </section>
      <SectionDivider />

      <footer className="bg-slate-900 py-10 text-slate-300">
        <div className="mx-auto max-w-7xl px-4 text-sm sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h5 className="text-lg font-semibold text-white">Isla Sakay</h5>
              <p className="mt-2 max-w-md text-slate-400">Trusted island transport information and mobile access portal.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <button type="button" onClick={() => scrollToSection('features')} className="hover:text-white">Features</button>
              <button type="button" onClick={() => scrollToSection('download-app')} className="hover:text-white">Download App</button>
              <button type="button" onClick={() => scrollToSection('schedules')} className="hover:text-white">Schedules</button>
              <button type="button" onClick={() => scrollToSection('contact')} className="hover:text-white">Contact</button>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-800 pt-6 text-center text-slate-500">
            <p>&copy; 2026 Isla Sakay. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </main>
  );
});

export default HomePage;
