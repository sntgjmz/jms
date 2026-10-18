import { useCallback, useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useBoatStore, useBookingStore, useSettingsStore } from '@/stores';
import { useAuth } from '@/contexts/AuthContext';
import type { CargoFare } from '@/stores/SettingsStore';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, ClipboardCheck, Loader2, Plus, Search, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/helpers';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { formatDateTime } from '@/lib/date-utils';
import { EmptyStateRow } from '@/components/ui/empty-state-row';
import { cn } from '@/lib/utils';
import { getAppUsers, type AppUserAccount } from '@/api/appUserService';
import '@/styles/animations.css';

const verificationStatuses = ['pending_payment', 'for_verification', 'for_cash_collection'];
const sanitizePhoneInput = (value: string) => value.replace(/\D+/g, '').slice(0, 15);
const sanitizeNameInput = (value: string) => value.replace(/[^A-Za-z\s.'-]/g, '');

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-500/15 dark:text-green-300 dark:hover:bg-green-500/15';
    case 'for_cash_collection':
      return 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/15';
    case 'for_verification':
      return 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/15';
    case 'pending_payment':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-500/15 dark:text-yellow-300 dark:hover:bg-yellow-500/15';
    case 'affected_by_cancellation':
      return 'bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:hover:bg-orange-500/15';
    case 'cancelled':
      return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/15';
    case 'completed':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/15';
    case 'payment_rejected':
      return 'bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/15';
    default:
      return 'bg-slate-100 text-slate-800 hover:bg-slate-100 dark:bg-slate-500/15 dark:text-slate-200 dark:hover:bg-slate-500/15';
  }
};

const splitRoute = (route: string) => {
  const [origin = '', destination = ''] = route.split('->').map((value) => value.trim());
  return { origin, destination };
};

type CargoBookingStep = 1 | 2 | 3;

const CargoBookingsPage = observer(() => {
  const bookingStore = useBookingStore();
  const boatStore = useBoatStore();
  const settingsStore = useSettingsStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(false);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<string>('');
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
  const [calendarCompactMode, setCalendarCompactMode] = useState<'single' | 'double'>('double');
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [scheduleDatePage, setScheduleDatePage] = useState(0);
  const [appUsers, setAppUsers] = useState<AppUserAccount[]>([]);
  const [appUsersLoading, setAppUsersLoading] = useState(false);
  const [formStep, setFormStep] = useState<CargoBookingStep>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    appUserId: '',
    senderName: '',
    senderPhone: '',
    receiverName: '',
    receiverPhone: '',
    cargoDescription: '',
    weight: '',
    scheduleId: '',
    paymentMethod: 'cash' as 'cash' | 'gcash',
    paymentReference: '',
    paymentProofImageUrl: '',
    paymentProofFileName: '',
  });
  const isDirty = Boolean(
    formData.appUserId ||
    formData.senderName.trim() ||
    formData.senderPhone.trim() ||
    formData.receiverName.trim() ||
    formData.receiverPhone.trim() ||
    formData.cargoDescription.trim() ||
    formData.weight.trim() ||
    formData.scheduleId ||
    formData.paymentMethod !== 'cash' ||
    formData.paymentReference.trim() ||
    formData.paymentProofImageUrl.trim() ||
    formData.paymentProofFileName.trim(),
  );
  const { confirmDiscard, discardDialog } = useUnsavedChangesGuard(isAddModalOpen && isDirty);

  const loadBookings = useCallback(async () => {
    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    const toDate = new Date(today);
    toDate.setDate(toDate.getDate() + 30);
    const to = toDate.toISOString().slice(0, 10);
    await Promise.all([
      bookingStore.fetchPagedCargoBookings({
        q: searchTerm.trim() || undefined,
        from,
        to,
        page: page - 1,
        size: pageSize,
      }),
      boatStore.fetchBoats(),
      settingsStore.fetchFares(),
      settingsStore.fetchSchedules({ from, to }),
    ]);
  }, [boatStore, bookingStore, page, pageSize, searchTerm, settingsStore]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  useAutoRefresh(() => loadBookings(), [loadBookings], { intervalMs: 5000 });

  const availableCargoBoats = useMemo(
    () =>
      boatStore.boats.filter(
        (boat) =>
          boat.type === 'cargo' &&
          boat.status === 'registered' &&
          boat.cargoTripStatus !== 'maintenance' &&
          boat.cargoTripStatus !== 'cancelled',
      ),
    [boatStore.boats],
  );

  const activeCargoFares = useMemo(
    () =>
      settingsStore.fares.filter(
        (fare): fare is CargoFare => fare.type === 'cargo' && fare.isActive,
      ),
    [settingsStore.fares],
  );

  const availableSchedules = useMemo(
    () => {
      const blockedScheduleIds = new Set(
        bookingStore.cargoBookings
          .filter((booking) => !['cancelled', 'payment_rejected', 'affected_by_cancellation'].includes(booking.status))
          .map((booking) => booking.scheduleId)
          .filter((id): id is string => Boolean(id)),
      );

      return settingsStore.schedules.filter((schedule) => {
        if (!schedule.boatId) return false;
        const boat = availableCargoBoats.find((item) => item.id === schedule.boatId);
        if (!boat) return false;
        if (schedule.cargoBooked) return false;
        if (blockedScheduleIds.has(schedule.id)) return false;
        const fare = settingsStore.fares.find((item) => item.id === schedule.routeFareId);
        return fare?.type === 'cargo' && fare.isActive;
      });
    },
    [availableCargoBoats, bookingStore.cargoBookings, settingsStore.fares, settingsStore.schedules],
  );

  const selectedSchedule = useMemo(
    () => availableSchedules.find((schedule) => schedule.id === formData.scheduleId),
    [availableSchedules, formData.scheduleId],
  );

  const getScheduleDateKey = (value?: string) => {
    if (!value) return '';
    return value.slice(0, 10);
  };

  const scheduleDateOptions = useMemo(() => {
    const counts = new Map<string, number>();
    availableSchedules.forEach((schedule) => {
      const key = getScheduleDateKey(schedule.departureDatetime || schedule.departure);
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [availableSchedules]);

  const scheduleDatePageSize = 5;
  const scheduleDatePages = Math.max(1, Math.ceil(scheduleDateOptions.length / scheduleDatePageSize));
  const visibleScheduleDates = scheduleDateOptions.slice(
    scheduleDatePage * scheduleDatePageSize,
    scheduleDatePage * scheduleDatePageSize + scheduleDatePageSize,
  );

  const syncScheduleDatePage = (date: string) => {
    if (!date) return;
    const index = scheduleDateOptions.findIndex((item) => item.date === date);
    if (index < 0) return;
    setScheduleDatePage(Math.floor(index / scheduleDatePageSize));
  };

  const scheduleCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    scheduleDateOptions.forEach((item) => {
      map.set(item.date, item.count);
    });
    return map;
  }, [scheduleDateOptions]);

  const buildMonthGrid = (base: Date, offset: number) => {
    const target = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    const year = target.getFullYear();
    const month = target.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: Array<{ date: string; day: number; count: number; inMonth: boolean }> = [];
    const totalSlots = Math.ceil((startDay + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalSlots; i += 1) {
      const dayNumber = i - startDay + 1;
      if (dayNumber <= 0 || dayNumber > daysInMonth) {
        grid.push({ date: '', day: 0, count: 0, inMonth: false });
      } else {
        const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(
          new Date(year, month, dayNumber),
        );
        const count = scheduleCountByDate.get(dateKey) ?? 0;
        grid.push({ date: dateKey, day: dayNumber, count, inMonth: true });
      }
    }

    return {
      label: new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric', timeZone: 'Asia/Manila' }).format(firstDay),
      grid,
    };
  };

  const getDensityTone = (count: number) => {
    if (count >= 6) return 'bg-sky-500/30 border-sky-400/60 text-sky-100';
    if (count >= 3) return 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100';
    if (count >= 1) return 'bg-amber-500/20 border-amber-400/50 text-amber-100';
    return 'bg-white/5 border-white/10 text-slate-400';
  };

  const filteredSchedules = useMemo(() => {
    if (!selectedScheduleDate) return availableSchedules;
    return availableSchedules.filter(
      (schedule) => getScheduleDateKey(schedule.departureDatetime || schedule.departure) === selectedScheduleDate,
    );
  }, [availableSchedules, selectedScheduleDate]);

  useEffect(() => {
    const updateCalendarMode = () => {
      const isCompact = window.innerWidth < 980;
      setCalendarCompactMode(isCompact ? 'single' : 'double');
    };
    updateCalendarMode();
    window.addEventListener('resize', updateCalendarMode);
    return () => window.removeEventListener('resize', updateCalendarMode);
  }, []);

  useEffect(() => {
    if (selectedScheduleDate || scheduleDateOptions.length === 0) return;
    const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    const match = scheduleDateOptions.find((item) => item.date === todayKey);
    const fallback = scheduleDateOptions[0]?.date;
    const target = match?.date || fallback;
    if (!target) return;
    setSelectedScheduleDate(target);
    syncScheduleDatePage(target);
  }, [scheduleDateOptions, selectedScheduleDate]);

  const formatScheduleDateChip = (value: string) => {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('en-PH', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Manila',
    }).format(parsed);
  };

  const selectedCargoFare = useMemo(
    () => activeCargoFares.find((fare) => fare.id === selectedSchedule?.routeFareId),
    [activeCargoFares, selectedSchedule?.routeFareId],
  );

  const selectedCargoBoat = useMemo(
    () => availableCargoBoats.find((boat) => boat.id === selectedSchedule?.boatId),
    [availableCargoBoats, selectedSchedule?.boatId],
  );
  const selectableAppUsers = useMemo(
    () => appUsers.filter((appUser) => appUser.status === 'active' && Boolean(appUser.phone?.trim())),
    [appUsers],
  );
  const selectedAppUser = useMemo(
    () => selectableAppUsers.find((appUser) => appUser.id === formData.appUserId),
    [formData.appUserId, selectableAppUsers],
  );

  const weightValue = Number(formData.weight);
  const computedTotalAmount = useMemo(() => {
    if (!selectedCargoFare || selectedCargoFare.type !== 'cargo') return 0;
    if (!Number.isFinite(selectedCargoFare.weightLimitKg) || selectedCargoFare.weightLimitKg <= 0) return 0;
    if (!Number.isFinite(selectedCargoFare.rentalFare) || selectedCargoFare.rentalFare <= 0) return 0;
    if (!Number.isFinite(weightValue) || weightValue <= 0) return selectedCargoFare.rentalFare;
    const excessWeight = Math.max(weightValue - selectedCargoFare.weightLimitKg, 0);
    const surcharge = excessWeight * (selectedCargoFare.rentalFare * 0.10);
    return selectedCargoFare.rentalFare + surcharge;
  }, [selectedCargoFare, weightValue]);

  const filteredBookings = bookingStore.cargoBookings;
  const visiblePendingCount = useMemo(
    () => filteredBookings.filter((booking) => verificationStatuses.includes(booking.status)).length,
    [filteredBookings],
  );
  const visibleCompletedCount = useMemo(
    () => filteredBookings.filter((booking) => booking.status === 'completed').length,
    [filteredBookings],
  );

  useEffect(() => {
    setPage(1);
  }, [pageSize, searchTerm]);

  useEffect(() => {
    if (page > bookingStore.cargoBookingsTotalPages) {
      setPage(bookingStore.cargoBookingsTotalPages);
    }
  }, [bookingStore.cargoBookingsTotalPages, page]);

  useEffect(() => {
    if (!isAddModalOpen || appUsers.length > 0 || appUsersLoading) {
      return;
    }
    setAppUsersLoading(true);
    void getAppUsers()
      .then((users) => setAppUsers(users))
      .catch(() => setFormError('Unable to load app users right now. You can still encode a manual cargo booking.'))
      .finally(() => setAppUsersLoading(false));
  }, [appUsers.length, appUsersLoading, isAddModalOpen]);

  const handleVerify = async (bookingId: string, approved: boolean) => {
    setActionLoadingId(bookingId);
    const success = await bookingStore.verifyBookingPayment(bookingId, 'cargo', approved, user?.username ?? 'admin');
    if (success) {
      showSuccessToast(approved ? 'Payment approved' : 'Payment rejected', 'Cargo booking payment status was updated.');
    } else {
      showErrorToast('Action failed', bookingStore.error || 'Failed to update payment status.');
    }
    setActionLoadingId(null);
  };

  const handleMarkCompleted = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    try {
      await bookingStore.updateBookingStatus(bookingId, 'completed', 'cargo', user?.username ?? 'admin');
      showSuccessToast('Booking completed', 'Cargo booking marked as completed.');
    } catch {
      showErrorToast('Action failed', bookingStore.error || 'Failed to complete booking.');
    }
    setActionLoadingId(null);
  };

  const handleCancel = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    try {
      await bookingStore.cancelBooking(bookingId, 'cargo', user?.username ?? 'admin');
      showSuccessToast('Booking cancelled', 'Cargo booking was cancelled successfully.');
    } catch {
      showErrorToast('Action failed', bookingStore.error || 'Failed to cancel booking.');
    }
    setActionLoadingId(null);
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  const handleCreateWalkIn = async () => {
    if (isSubmitting) return;
    setShowErrors(true);
    setFormError(null);
    const weight = Number(formData.weight);
    if (
      !formData.senderName.trim() ||
      !formData.senderPhone.trim() ||
      !formData.receiverName.trim() ||
      !formData.receiverPhone.trim() ||
      !formData.cargoDescription.trim() ||
      !formData.scheduleId
    ) {
      triggerShake();
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      triggerShake();
      return;
    }
    if (!selectedCargoFare) {
      triggerShake();
      return;
    }
    if (!Number.isFinite(computedTotalAmount) || computedTotalAmount <= 0) {
      setFormError('Cargo fare configuration is invalid. Please check rental fare and weight limit in Fare Management.');
      return;
    }
    if (formData.paymentMethod === 'gcash' && !formData.paymentReference.trim()) {
      triggerShake();
      return;
    }
    if (formData.paymentMethod === 'gcash' && !formData.paymentProofImageUrl.trim()) {
      triggerShake();
      return;
    }

    if (!selectedSchedule) {
      triggerShake();
      return;
    }
    if (selectedCargoBoat?.capacity && Number.isFinite(weight) && weight > Number(selectedCargoBoat.capacity)) {
      setFormError(`Weight exceeds the selected cargo vessel limit (${selectedCargoBoat.capacity} kg).`);
      triggerShake();
      return;
    }

    const route = splitRoute(selectedSchedule.route);
    setIsSubmitting(true);
    try {
      const result = await bookingStore.createCargoBooking({
        senderName: formData.senderName.trim(),
        senderPhone: formData.senderPhone.trim(),
        receiverName: formData.receiverName.trim(),
        receiverPhone: formData.receiverPhone.trim(),
        cargoDescription: formData.cargoDescription.trim(),
        weight,
        scheduleId: formData.scheduleId,
        origin: route.origin || 'Unknown Origin',
        destination: route.destination || 'Unknown Destination',
        date: selectedSchedule.departureDatetime?.slice(0, 10) || selectedSchedule.departure || '',
        boatId: selectedSchedule.boatId,
        phone: formData.senderPhone.trim(),
        totalAmount: computedTotalAmount,
        paymentMethod: formData.paymentMethod,
        paymentReference: formData.paymentReference.trim() || undefined,
        paymentProofImageUrl: formData.paymentProofImageUrl.trim() || undefined,
      }, user?.username ?? 'admin');

      if (result.success) {
        setIsAddModalOpen(false);
        setFormData({
          appUserId: '',
          senderName: '',
          senderPhone: '',
          receiverName: '',
          receiverPhone: '',
          cargoDescription: '',
          weight: '',
          scheduleId: '',
          paymentMethod: 'cash',
          paymentReference: '',
          paymentProofImageUrl: '',
          paymentProofFileName: '',
        });
        return;
      }
      setFormError(result.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateStep1 = () => {
    setShowErrors(true);
    if (!formData.scheduleId || !selectedSchedule || !selectedCargoFare || !selectedCargoBoat) {
      triggerShake();
      return false;
    }
    setFormError(null);
    return true;
  };

  const validateStep2 = () => {
    setShowErrors(true);
    const weight = Number(formData.weight);
    if (
      !formData.senderName.trim() ||
      !formData.senderPhone.trim() ||
      !formData.receiverName.trim() ||
      !formData.receiverPhone.trim() ||
      !formData.cargoDescription.trim()
    ) {
      triggerShake();
      return false;
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      triggerShake();
      return false;
    }
    if (selectedCargoBoat?.capacity && Number.isFinite(weight) && weight > Number(selectedCargoBoat.capacity)) {
      setFormError(`Weight exceeds the selected cargo vessel limit (${selectedCargoBoat.capacity} kg).`);
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

  const handleProofFileChange = (file: File | null) => {
    if (!file) {
      setFormData((prev) => ({ ...prev, paymentProofImageUrl: '', paymentProofFileName: '' }));
      return;
    }
    if (!file.type.startsWith('image/')) {
      setFormError('Please select an image file for payment proof.');
      return;
    }
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      setFormError('Payment screenshot must be 2MB or below.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setFormError('Unable to read selected image file.');
        return;
      }
      setFormError(null);
      setFormData((prev) => ({
        ...prev,
        paymentProofImageUrl: reader.result as string,
        paymentProofFileName: file.name,
      }));
    };
    reader.onerror = () => setFormError('Unable to read selected image file.');
    reader.readAsDataURL(file);
  };

  const requestCloseModal = async () => {
    if (!(await confirmDiscard())) return;
    setIsAddModalOpen(false);
    setFormStep(1);
    setShowErrors(false);
    setFormError(null);
    setFormData({
      appUserId: '',
      senderName: '',
      senderPhone: '',
      receiverName: '',
      receiverPhone: '',
      cargoDescription: '',
      weight: '',
      scheduleId: '',
      paymentMethod: 'cash',
      paymentReference: '',
      paymentProofImageUrl: '',
      paymentProofFileName: '',
    });
  };

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
          <div className="space-y-2.5">
            <Badge className="w-fit border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              Cargo Desk
            </Badge>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Cargo Bookings</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                Cargo booking operations
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">Total</p>
              <p className="mt-1 text-xl font-semibold text-sky-900 dark:text-sky-50">{bookingStore.cargoBookingsTotal}</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-amber-200/70 bg-amber-50/90 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">Visible Pending</p>
              <p className="mt-1 text-xl font-semibold text-amber-900 dark:text-amber-50">{visiblePendingCount}</p>
            </div>
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-emerald-200/70 bg-emerald-50/90 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">Visible Completed</p>
              <p className="mt-1 text-xl font-semibold text-emerald-900 dark:text-emerald-50">{visibleCompletedCount}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="mb-4 border-slate-200/70 bg-white/92 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <CardTitle className="text-lg text-slate-900 dark:text-slate-100">All Cargo Shipments</CardTitle>
            <CardDescription>{filteredBookings.length} bookings</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="h-10 gap-2 rounded-xl" variant="outline" onClick={() => navigate('/payment-verification')}>
              <ClipboardCheck className="h-4 w-4" />
              Go To Verification
            </Button>
            <Button className="h-10 gap-2 rounded-xl" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Booking
            </Button>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white pl-10 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="h-10 w-full rounded-xl sm:w-[120px]">
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
          <div className="border-b border-slate-200/70 px-5 py-2.5 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Showing {bookingStore.cargoBookingsTotal} booking{bookingStore.cargoBookingsTotal === 1 ? '' : 's'}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">ID</TableHead>
                <TableHead className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Sender</TableHead>
                <TableHead className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Description</TableHead>
                <TableHead className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Weight</TableHead>
                <TableHead className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Destination</TableHead>
                <TableHead className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Amount</TableHead>
                <TableHead className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Status</TableHead>
                <TableHead className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <TableCell className="px-5 py-2.5 font-medium text-slate-900 dark:text-slate-100">{booking.id}</TableCell>
                  <TableCell className="px-5 py-2.5 text-slate-900 dark:text-slate-100">{booking.senderName}</TableCell>
                  <TableCell className="px-5 py-2.5 text-slate-900 dark:text-slate-100">{booking.cargoDescription}</TableCell>
                  <TableCell className="px-5 py-2.5 text-slate-500 dark:text-slate-400">{booking.weight} kg</TableCell>
                  <TableCell className="px-5 py-2.5 text-slate-900 dark:text-slate-100">{booking.destination}</TableCell>
                  <TableCell className="px-5 py-2.5 font-medium text-slate-900 dark:text-slate-100">{formatCurrency(booking.totalAmount)}</TableCell>
                  <TableCell className="px-5 py-2.5">
                    <Badge
                      variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                      className={getStatusBadgeClass(booking.status)}
                    >
                      {booking.status.replaceAll('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-2.5">
                    <div className="flex justify-end gap-2">
                      {verificationStatuses.includes(booking.status) && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            disabled={actionLoadingId === booking.id}
                            onClick={() => void handleVerify(booking.id, true)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            disabled={actionLoadingId === booking.id}
                            onClick={() => void handleVerify(booking.id, false)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoadingId === booking.id}
                          onClick={() => void handleMarkCompleted(booking.id)}
                        >
                          Mark Trip Completed
                        </Button>
                      )}
                      {['pending_payment', 'for_verification', 'for_cash_collection', 'confirmed'].includes(
                        booking.status,
                      ) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={actionLoadingId === booking.id}
                          onClick={() => void handleCancel(booking.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBookings.length === 0 && (
                <EmptyStateRow colSpan={8} message="No cargo bookings found." />
              )}
            </TableBody>
          </Table>
          <div className="mt-0 flex items-center justify-between px-5 py-2.5 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Page {page} of {bookingStore.cargoBookingsTotalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setPage((prev) => Math.min(bookingStore.cargoBookingsTotalPages, prev + 1))}
                disabled={page >= bookingStore.cargoBookingsTotalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isAddModalOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsAddModalOpen(true);
            setShowErrors(false);
            return;
          }
          void requestCloseModal();
        }}
      >
        <DialogContent className={cn("max-h-[90vh] overflow-hidden border-slate-800/70 bg-[linear-gradient(180deg,rgba(8,15,34,0.98),rgba(7,16,39,0.96))] p-0 text-slate-100 sm:max-w-[760px]", isShaking && "animate-shake")}>
          <DialogHeader className="border-b border-white/10 px-6 pb-5 pt-6">
            <DialogTitle>Add Walk-in Cargo Booking</DialogTitle>
            <DialogDescription>Encode cargo booking for users without mobile app.</DialogDescription>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <Badge className={formStep === 1 ? 'bg-sky-500 text-slate-950' : 'bg-white/10 text-slate-200'}>Step 1: Schedule</Badge>
              <Badge className={formStep === 2 ? 'bg-sky-500 text-slate-950' : 'bg-white/10 text-slate-200'}>Step 2: Cargo</Badge>
              <Badge className={formStep === 3 ? 'bg-sky-500 text-slate-950' : 'bg-white/10 text-slate-200'}>Step 3: Payment</Badge>
            </div>
          </DialogHeader>
          <div className="max-h-[calc(90vh-170px)] space-y-4 overflow-y-auto px-6 py-5" style={{ scrollbarGutter: 'stable' }}>
            {formStep === 1 && (
              <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">
                  Select scheduled cargo trip first. Boat, route, timing, and fare are auto-filled.
                </div>
                <div className="space-y-1">
                  <Label>Scheduled Cargo Trip <span className="text-red-500">*</span></Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSchedulePickerOpen(true)}
                    className={cn("w-full justify-start border-white/15 bg-white/5 text-left text-white hover:bg-white/10", showErrors && !formData.scheduleId && "border-red-500")}
                  >
                    {selectedSchedule
                      ? `${selectedSchedule.boatName ?? 'Boat'} | ${selectedSchedule.route} | ${formatDateTime(selectedSchedule.departureDatetime)}`
                      : 'Choose scheduled cargo trip'}
                  </Button>
                  {availableSchedules.length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">Booked cargo schedules are hidden from this picker.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Boat</Label>
                    <Input value={selectedCargoBoat?.name ?? ''} readOnly placeholder="Auto from selected schedule" />
                  </div>
                  <div className="space-y-1">
                    <Label>Departure</Label>
                    <Input value={formatDateTime(selectedSchedule?.departureDatetime)} readOnly placeholder="Auto from selected schedule" />
                  </div>
                  <div className="space-y-1">
                    <Label>Arrival</Label>
                    <Input value={formatDateTime(selectedSchedule?.arrivalDatetime)} readOnly placeholder="Auto from selected schedule" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Route</Label>
                    <Input value={selectedSchedule?.route ?? ''} readOnly placeholder="Auto from fare management" />
                  </div>
                  <div className="space-y-1">
                    <Label>Weight Limit Per Trip</Label>
                    <Input value={selectedCargoFare?.weightLimitKg ? `${selectedCargoFare.weightLimitKg} kg` : ''} readOnly placeholder="Auto from cargo fare" />
                  </div>
                  <div className="space-y-1">
                    <Label>Max Weight Limit (kg)</Label>
                    <Input value={selectedCargoBoat?.capacity ?? ''} readOnly placeholder="Auto from cargo vessel" />
                  </div>
                </div>
              </div>
            )}

            {formStep === 2 && (
              <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">
                  Enter shipment details after selecting the cargo vessel and route.
                </div>

                <div className="space-y-1">
                  <Label>Existing App User</Label>
                  <Select
                    value={formData.appUserId || 'manual'}
                    onValueChange={(value) => {
                      if (value === 'manual') {
                        setFormData((prev) => ({
                          ...prev,
                          appUserId: '',
                          senderName: '',
                          senderPhone: '',
                        }));
                        return;
                      }
                      const appUser = selectableAppUsers.find((candidate) => candidate.id === value);
                      if (!appUser) {
                        return;
                      }
                      setFormData((prev) => ({
                        ...prev,
                        appUserId: appUser.id,
                        senderName: appUser.fullName,
                        senderPhone: appUser.phone ?? '',
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={appUsersLoading ? 'Loading app users...' : 'Select existing app user'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual walk-in sender</SelectItem>
                      {selectableAppUsers.map((appUser) => (
                        <SelectItem key={appUser.id} value={appUser.id}>
                          {appUser.fullName} | {appUser.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Sender Name <span className="text-red-500">*</span></Label>
                    <Input
                      title={showErrors && !formData.senderName.trim() ? "Sender name is required" : undefined}
                      value={formData.senderName}
                      readOnly={Boolean(selectedAppUser)}
                      onChange={(e) => setFormData((prev) => ({ ...prev, senderName: sanitizeNameInput(e.target.value) }))}
                      className={cn(showErrors && !formData.senderName.trim() && "border-red-500 focus-visible:ring-red-500")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Sender Phone <span className="text-red-500">*</span></Label>
                    <Input
                      title={showErrors && !formData.senderPhone.trim() ? "Sender phone is required" : undefined}
                      value={formData.senderPhone}
                      readOnly={Boolean(selectedAppUser)}
                      onChange={(e) => setFormData((prev) => ({ ...prev, senderPhone: sanitizePhoneInput(e.target.value) }))}
                      className={cn(showErrors && !formData.senderPhone.trim() && "border-red-500 focus-visible:ring-red-500")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Receiver Name <span className="text-red-500">*</span></Label>
                    <Input
                      value={formData.receiverName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, receiverName: sanitizeNameInput(e.target.value) }))}
                      title={showErrors && !formData.receiverName.trim() ? "Receiver name is required" : undefined}
                      className={cn(showErrors && !formData.receiverName.trim() && "border-red-500 focus-visible:ring-red-500")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Receiver Phone <span className="text-red-500">*</span></Label>
                    <Input
                      value={formData.receiverPhone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, receiverPhone: sanitizePhoneInput(e.target.value) }))}
                      title={showErrors && !formData.receiverPhone.trim() ? "Receiver phone is required" : undefined}
                      className={cn(showErrors && !formData.receiverPhone.trim() && "border-red-500 focus-visible:ring-red-500")}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Cargo Description <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.cargoDescription}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cargoDescription: e.target.value }))}
                    title={showErrors && !formData.cargoDescription.trim() ? "Description is required" : undefined}
                    className={cn(showErrors && !formData.cargoDescription.trim() && "border-red-500 focus-visible:ring-red-500")}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Weight (kg) <span className="text-red-500">*</span></Label>
                  <Input
                    title={showErrors && Number(formData.weight) <= 0 ? "Weight must be greater than 0" : undefined}
                    type="number"
                    min={1}
                    max={selectedCargoBoat?.capacity ? Number(selectedCargoBoat.capacity) : undefined}
                    value={formData.weight}
                    onChange={(e) => setFormData((prev) => ({ ...prev, weight: e.target.value }))}
                    className={cn(showErrors && Number(formData.weight) <= 0 && "border-red-500 focus-visible:ring-red-500")}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedCargoBoat?.capacity
                      ? `Selected vessel max: ${selectedCargoBoat.capacity} kg`
                      : 'Select a schedule to reveal the vessel max weight.'}
                  </p>
                  {selectedCargoBoat?.capacity && Number.isFinite(weightValue) && weightValue > Number(selectedCargoBoat.capacity) && (
                    <p className="text-xs text-rose-300">
                      Weight exceeds the selected cargo vessel limit ({selectedCargoBoat.capacity} kg).
                    </p>
                  )}
                </div>
              </div>
            )}

            {formStep === 3 && (
              <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="space-y-1">
                  <Label>Total Amount</Label>
                  <Input value={formatCurrency(computedTotalAmount)} readOnly />
                </div>

                <div className="space-y-1">
                  <Label>Payment Method</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentMethod: value as 'cash' | 'gcash' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="gcash">GCash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.paymentMethod === 'gcash' && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>GCash Reference <span className="text-red-500">*</span></Label>
                      <Input
                        value={formData.paymentReference}
                        onChange={(e) => setFormData((prev) => ({ ...prev, paymentReference: e.target.value }))}
                        title={showErrors && !formData.paymentReference.trim() ? "Reference number is required" : undefined}
                        className={cn(showErrors && !formData.paymentReference.trim() && "border-red-500 focus-visible:ring-red-500")}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Payment Screenshot <span className="text-red-500">*</span></Label>
                      <Input title={showErrors && !formData.paymentProofImageUrl ? "Screenshot is required" : undefined} type="file" accept="image/*" onChange={(e) => handleProofFileChange(e.target.files?.[0] ?? null)} className={cn(showErrors && !formData.paymentProofImageUrl && "border-red-500 focus-visible:ring-red-500")} />
                      {formData.paymentProofFileName && (
                        <p className="text-xs text-gray-500">Selected: {formData.paymentProofFileName}</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedCargoFare && selectedCargoFare.type === 'cargo' && (
                  <p className="text-xs text-gray-500">
                    Fare basis: {selectedCargoFare.fareName} ({selectedCargoFare.route}) | Rental {formatCurrency(selectedCargoFare.rentalFare)} | Weight limit {selectedCargoFare.weightLimitKg}kg | Excess rate 10% of rental fare per kg
                  </p>
                )}
              </div>
            )}
            {formError && <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{formError}</p>}
          </div>
          <DialogFooter className="sticky bottom-0 border-t border-white/10 bg-slate-950/80 px-6 py-4 backdrop-blur">
            <Button variant="outline" onClick={() => void requestCloseModal()} className="border-white/15 bg-white/5 text-white hover:bg-white/10">
              Cancel
            </Button>
            {formStep > 1 && (
              <Button variant="outline" onClick={() => { setFormError(null); setFormStep((prev) => (prev === 3 ? 2 : 1)); }} className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                Back
              </Button>
            )}
            {formStep < 3 ? (
              <Button onClick={handleNextStep} className="bg-sky-500 text-slate-950 hover:bg-sky-400">
                {formStep === 1 ? 'Next: Cargo' : 'Next: Payment'}
              </Button>
            ) : (
              <Button onClick={() => void handleCreateWalkIn()} disabled={isSubmitting} className="bg-sky-500 text-slate-950 hover:bg-sky-400">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Booking'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={schedulePickerOpen} onOpenChange={setSchedulePickerOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden border-slate-800/70 bg-slate-950 text-slate-100 sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle>Select Scheduled Cargo Trip</DialogTitle>
            <DialogDescription className="text-slate-300">
              Review the trip table, then choose the cargo schedule for this booking.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Schedule Dates</p>
                  <p className="text-xs text-slate-400">Browse the dates, or open the calendar for more.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10"
                    onClick={() => setCalendarDialogOpen(true)}
                  >
                    Calendar
                  </button>
                  <button
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      selectedScheduleDate ? 'border-white/15 text-slate-200 hover:bg-white/10' : 'border-sky-400/50 bg-sky-500/20 text-sky-100'
                    }`}
                  onClick={() => {
                    setSelectedScheduleDate('');
                    setScheduleDatePage(0);
                  }}
                  >
                    All dates
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                  onClick={() => setScheduleDatePage((prev) => Math.max(0, prev - 1))}
                  disabled={scheduleDatePage === 0}
                >
                  ←
                </button>
                <div className="flex flex-1 flex-nowrap gap-2 overflow-hidden">
                  {visibleScheduleDates.length === 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                      No scheduled dates available.
                    </div>
                  )}
                    {visibleScheduleDates.map((item) => (
                      <button
                        key={item.date}
                        type="button"
                        onClick={() => {
                          setSelectedScheduleDate(item.date);
                          syncScheduleDatePage(item.date);
                        }}
                        className={`min-w-[150px] rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                          selectedScheduleDate === item.date
                            ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                            : 'border-white/10 text-slate-200 hover:bg-white/10'
                        }`}
                      >
                      <div className="flex items-center justify-between text-sm">
                        <span>{formatScheduleDateChip(item.date)}</span>
                        {item.date === new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date()) && (
                          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] text-emerald-100">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-300">{item.count} available</div>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                  onClick={() => setScheduleDatePage((prev) => Math.min(scheduleDatePages - 1, prev + 1))}
                  disabled={scheduleDatePage >= scheduleDatePages - 1}
                >
                  →
                </button>
              </div>
            </div>

            <div className="max-h-[320px] overflow-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left">Boat</th>
                    <th className="px-3 py-2 text-left">Route</th>
                    <th className="px-3 py-2 text-left">Departure</th>
                    <th className="px-3 py-2 text-left">Arrival</th>
                    <th className="px-3 py-2 text-left">Max Weight</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-400">No cargo schedules available.</td>
                    </tr>
                  ) : (
                    filteredSchedules.map((schedule) => {
                      const boat = availableCargoBoats.find((item) => item.id === schedule.boatId);
                      return (
                        <tr key={schedule.id} className="border-t border-white/10">
                          <td className="px-3 py-2.5">{schedule.boatName ?? 'Boat'}</td>
                          <td className="px-3 py-2.5">{schedule.route}</td>
                          <td className="px-3 py-2.5">{formatDateTime(schedule.departureDatetime)}</td>
                          <td className="px-3 py-2.5">{formatDateTime(schedule.arrivalDatetime)}</td>
                          <td className="px-3 py-2.5">{boat?.capacity ? `${boat.capacity} kg` : '-'}</td>
                          <td className="px-3 py-2.5 text-right">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, scheduleId: schedule.id }));
                                setSchedulePickerOpen(false);
                              }}
                            >
                              Select
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={calendarDialogOpen} onOpenChange={setCalendarDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden border-slate-800/70 bg-slate-950 text-slate-100 sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle>Schedule Calendar</DialogTitle>
            <DialogDescription className="text-slate-300">
              Review how many scheduled trips are available on each date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
                onClick={() => setCalendarMonthOffset((prev) => prev - 1)}
              >
                Prev
              </button>
              <span className="text-sm text-slate-300">Select a date to filter by daily availability.</span>
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
                onClick={() => setCalendarMonthOffset((prev) => prev + 1)}
              >
                Next
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-white/40" /> No data
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 px-3 py-1 text-amber-100">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Low
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 px-3 py-1 text-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Medium
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 px-3 py-1 text-sky-100">
                <span className="h-2 w-2 rounded-full bg-sky-400" /> High
              </span>
            </div>
            <div className={`grid gap-3 ${calendarCompactMode === 'single' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
              {(calendarCompactMode === 'single'
                ? [buildMonthGrid(new Date(), calendarMonthOffset)]
                : [buildMonthGrid(new Date(), calendarMonthOffset), buildMonthGrid(new Date(), calendarMonthOffset + 1)]
              ).map((month) => (
                <div key={month.label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-100">{month.label}</p>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-500">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                      <div key={label} className="text-center">{label}</div>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-7 gap-1.5">
                    {month.grid.map((cell, index) => (
                      <button
                        key={`${month.label}-${index}`}
                        type="button"
                        disabled={!cell.inMonth}
                        onClick={() => {
                          if (!cell.inMonth) return;
                          setSelectedScheduleDate(cell.date);
                          syncScheduleDatePage(cell.date);
                          setCalendarDialogOpen(false);
                        }}
                        className={`flex h-12 flex-col items-center justify-center rounded-lg border text-[11px] font-semibold transition ${
                          cell.inMonth
                            ? `${getDensityTone(cell.count)} ${selectedScheduleDate === cell.date ? 'ring-2 ring-sky-400/70' : 'hover:bg-white/10'}`
                            : 'border-transparent text-transparent'
                        }`}
                      >
                        <span>{cell.day || ''}</span>
                        <span className="text-[9px] font-normal">{cell.count ? `${cell.count} trips` : 'No data'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {discardDialog}
    </Layout>
  );
});

export default CargoBookingsPage;


