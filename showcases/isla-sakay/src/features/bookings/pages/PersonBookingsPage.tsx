import { useCallback, useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useBoatStore, useBookingStore, useSettingsStore } from '@/stores';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableSkeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, ClipboardCheck, Download, Filter, Loader2, Plus, Search, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/helpers';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { formatDateTime, formatDate } from '@/lib/date-utils';
import { EmptyStateRow } from '@/components/ui/empty-state-row';
import { cn } from '@/lib/utils';
import { getAppUsers, type AppUserAccount } from '@/api/appUserService';
import '@/styles/animations.css';

const verificationStatuses = ['pending_payment', 'for_verification', 'for_cash_collection'];
const sanitizePhoneInput = (value: string) => value.replace(/\D+/g, '').slice(0, 15);
const sanitizeDiscountIdInput = (value: string) => value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 40);

const createEmptyPersonBookingForm = () => ({
  appUserId: '',
  passengerName: '',
  passengerPhone: '',
  scheduleId: '',
  numberOfPassengers: '1',
  seniorCitizenCount: '0',
  pwdCount: '0',
  seniorCitizenIds: [] as string[],
  pwdIds: [] as string[],
  paymentMethod: 'cash' as 'cash' | 'gcash',
  paymentReference: '',
  paymentProofImageUrl: '',
  paymentProofFileName: '',
});

const splitRoute = (route: string) => {
  const [origin = '', destination = ''] = route.split('->').map((value) => value.trim());
  return { origin, destination };
};

type PersonBookingStep = 1 | 2 | 3;

const PersonBookingsPage = observer(() => {
  const bookingStore = useBookingStore();
  const boatStore = useBoatStore();
  const settingsStore = useSettingsStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(false);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<string>('');
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
  const [calendarCompactMode, setCalendarCompactMode] = useState<'single' | 'double'>('double');
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [scheduleDatePage, setScheduleDatePage] = useState(0);
  const [appUsers, setAppUsers] = useState<AppUserAccount[]>([]);
  const [appUsersLoading, setAppUsersLoading] = useState(false);
  const [formStep, setFormStep] = useState<PersonBookingStep>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState(createEmptyPersonBookingForm);
  const isDirty = Boolean(
    formData.appUserId ||
    formData.passengerName.trim() ||
    formData.passengerPhone.trim() ||
    formData.scheduleId ||
    formData.numberOfPassengers !== '1' ||
    formData.seniorCitizenCount !== '0' ||
    formData.pwdCount !== '0' ||
    formData.seniorCitizenIds.some((value) => value.trim().length > 0) ||
    formData.pwdIds.some((value) => value.trim().length > 0) ||
    formData.paymentMethod !== 'cash' ||
    formData.paymentReference.trim() ||
    formData.paymentProofImageUrl.trim() ||
    formData.paymentProofFileName.trim(),
  );
  const { confirmDiscard, discardDialog } = useUnsavedChangesGuard(isAddModalOpen && isDirty);

  const loadBookings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    const toDate = new Date(today);
    toDate.setDate(toDate.getDate() + 30);
    const to = toDate.toISOString().slice(0, 10);
    await Promise.all([
      bookingStore.fetchPagedPersonBookings({
        q: searchQuery.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        from,
        to,
        page: page - 1,
        size: pageSize,
      }),
      boatStore.fetchBoats(),
      settingsStore.fetchFares(),
      settingsStore.fetchSchedules({ from, to }),
    ]);
    if (!silent) setLoading(false);
  }, [boatStore, bookingStore, page, pageSize, searchQuery, settingsStore, statusFilter]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  useAutoRefresh(() => loadBookings(true), [loadBookings], { intervalMs: 5000 });

  const availableBoats = useMemo(
    () =>
      boatStore.boats.filter(
        (boat) =>
          (boat.type === 'banca' || boat.type === 'passenger') &&
          boat.status === 'registered' &&
          (boat.availableSeats ?? boat.capacity) > 0,
      ),
    [boatStore.boats],
  );

  const availableSchedules = useMemo(
    () =>
      settingsStore.schedules.filter((schedule) => {
        if (!schedule.boatId) return false;
        const boat = availableBoats.find((item) => item.id === schedule.boatId);
        if (!boat) return false;
        const fare = settingsStore.fares.find((item) => item.id === schedule.routeFareId);
        return fare?.type === 'commuter' && fare.isActive;
      }),
    [availableBoats, settingsStore.fares, settingsStore.schedules],
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

  const selectedScheduleFare = useMemo(
    () => settingsStore.fares.find((fare) => fare.id === selectedSchedule?.routeFareId && fare.type === 'commuter'),
    [selectedSchedule?.routeFareId, settingsStore.fares],
  );

  const selectedScheduleBoat = useMemo(
    () => availableBoats.find((boat) => boat.id === selectedSchedule?.boatId),
    [availableBoats, selectedSchedule?.boatId],
  );
  const selectableAppUsers = useMemo(
    () => appUsers.filter((appUser) => appUser.status === 'active' && Boolean(appUser.phone?.trim())),
    [appUsers],
  );
  const selectedAppUser = useMemo(
    () => selectableAppUsers.find((appUser) => appUser.id === formData.appUserId),
    [formData.appUserId, selectableAppUsers],
  );

  const passengerCount = Number(formData.numberOfPassengers);
  const seniorCitizenCount = Number(formData.seniorCitizenCount);
  const pwdCount = Number(formData.pwdCount);
  const discountedPassengerCount = Math.max(seniorCitizenCount, 0) + Math.max(pwdCount, 0);
  const regularPassengerCount = Math.max(passengerCount - discountedPassengerCount, 0);
  const farePerPassenger = useMemo(() => {
    if (!selectedScheduleFare || selectedScheduleFare.type !== 'commuter') return 0;
    const baseFare = selectedScheduleFare.baseFare ?? 0;
    const percentage = selectedScheduleFare.percentagePerKilometer ?? 0;
    const extraDistance = Math.max(selectedScheduleFare.distanceKm - 1, 0);
    return baseFare + baseFare * (percentage / 100) * extraDistance;
  }, [selectedScheduleFare]);

  const computedDiscountAmount =
    Number.isFinite(passengerCount) && passengerCount > 0 && discountedPassengerCount > 0
      ? farePerPassenger * discountedPassengerCount * 0.2
      : 0;
  const computedBaseAmount = Number.isFinite(passengerCount) && passengerCount > 0 ? farePerPassenger * passengerCount : 0;
  const computedTotalAmount = Math.max(computedBaseAmount - computedDiscountAmount, 0);

  const filteredBookings = bookingStore.personBookings;
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
  }, [pageSize, searchQuery, statusFilter]);

  useEffect(() => {
    if (page > bookingStore.personBookingsTotalPages) {
      setPage(bookingStore.personBookingsTotalPages);
    }
  }, [bookingStore.personBookingsTotalPages, page]);

  useEffect(() => {
    if (!isAddModalOpen || appUsers.length > 0 || appUsersLoading) {
      return;
    }
    setAppUsersLoading(true);
    void getAppUsers()
      .then((users) => setAppUsers(users))
      .catch(() => setFormError('Unable to load app users right now. You can still encode a manual walk-in booking.'))
      .finally(() => setAppUsersLoading(false));
  }, [appUsers.length, appUsersLoading, isAddModalOpen]);

  const handleExport = () => {
    const csvContent = [
      ['Booking ID', 'Passenger', 'Origin', 'Destination', 'Date', 'Fare', 'Status', 'Payment Method'].join(','),
      ...filteredBookings.map((b) =>
        [b.id, b.passengerName, b.origin, b.destination, b.date, b.totalAmount, b.status, b.paymentMethod ?? '']
          .join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `person-bookings-${new Date().toISOString()}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }
    > = {
      confirmed: { variant: 'default', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      pending: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
      pending_payment: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
      for_verification: { variant: 'secondary', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
      for_cash_collection: { variant: 'outline', className: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100' },
      payment_rejected: { variant: 'destructive', className: 'bg-rose-100 text-rose-800 hover:bg-rose-100' },
      affected_by_cancellation: { variant: 'destructive', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
      cancelled: { variant: 'destructive', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
      completed: { variant: 'outline', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
    };

    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replaceAll('_', ' ')}
      </Badge>
    );
  };

  const handleVerify = async (bookingId: string, approved: boolean) => {
    setActionLoadingId(bookingId);
    const success = await bookingStore.verifyBookingPayment(bookingId, 'person', approved, user?.username ?? 'admin');
    if (success) {
      await boatStore.fetchBoats();
      showSuccessToast(approved ? 'Payment approved' : 'Payment rejected', 'Person booking payment status was updated.');
    } else {
      showErrorToast('Action failed', bookingStore.error || 'Failed to update payment status.');
    }
    setActionLoadingId(null);
  };

  const handleMarkCompleted = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    try {
      await bookingStore.updateBookingStatus(bookingId, 'completed', 'person', user?.username ?? 'admin');
      await boatStore.fetchBoats();
      showSuccessToast('Booking completed', 'Person booking marked as completed.');
    } catch {
      showErrorToast('Action failed', bookingStore.error || 'Failed to complete booking.');
    }
    setActionLoadingId(null);
  };

  const handleCancel = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    try {
      await bookingStore.cancelBooking(bookingId, 'person', user?.username ?? 'admin');
      await boatStore.fetchBoats();
      showSuccessToast('Booking cancelled', 'Person booking was cancelled successfully.');
    } catch {
      showErrorToast('Action failed', bookingStore.error || 'Failed to cancel booking.');
    }
    setActionLoadingId(null);
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  const syncIdListLength = (values: string[], nextLength: number) => {
    if (nextLength <= 0) return [];
    return Array.from({ length: nextLength }, (_, index) => values[index] ?? '');
  };

  const updateSeniorCitizenCount = (value: string) => {
    const sanitizedValue = value.replace(/\D+/g, '').slice(0, 2);
    const nextCount = sanitizedValue ? Number(sanitizedValue) : 0;
    setFormData((prev) => ({
      ...prev,
      seniorCitizenCount: sanitizedValue || '0',
      seniorCitizenIds: syncIdListLength(prev.seniorCitizenIds, nextCount),
    }));
  };

  const updatePwdCount = (value: string) => {
    const sanitizedValue = value.replace(/\D+/g, '').slice(0, 2);
    const nextCount = sanitizedValue ? Number(sanitizedValue) : 0;
    setFormData((prev) => ({
      ...prev,
      pwdCount: sanitizedValue || '0',
      pwdIds: syncIdListLength(prev.pwdIds, nextCount),
    }));
  };

  const updateDiscountIdAt = (type: 'seniorCitizenIds' | 'pwdIds', index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [type]: prev[type].map((item, itemIndex) => (itemIndex === index ? sanitizeDiscountIdInput(value) : item)),
    }));
  };

  const validateDiscountSection = () => {
    if (!Number.isFinite(seniorCitizenCount) || seniorCitizenCount < 0) {
      setFormError('Senior passenger count is invalid.');
      return false;
    }
    if (!Number.isFinite(pwdCount) || pwdCount < 0) {
      setFormError('PWD passenger count is invalid.');
      return false;
    }
    if (discountedPassengerCount > passengerCount) {
      setFormError('Senior and PWD counts cannot exceed the total number of passengers.');
      return false;
    }
    const hasMissingSeniorId = formData.seniorCitizenIds.some((value) => !value.trim());
    const hasMissingPwdId = formData.pwdIds.some((value) => !value.trim());
    if (hasMissingSeniorId) {
      setFormError('Each senior passenger needs one senior ID number.');
      return false;
    }
    if (hasMissingPwdId) {
      setFormError('Each PWD passenger needs one PWD ID number.');
      return false;
    }
    return true;
  };

  const handleCreateWalkIn = async () => {
    if (isSubmitting) return;
    setShowErrors(true);
    setFormError(null);
    const numberOfPassengers = Number(formData.numberOfPassengers);
    if (
      !formData.passengerName.trim() ||
      !formData.passengerPhone.trim() ||
      !formData.scheduleId
    ) {
      triggerShake();
      return;
    }
    if (!Number.isFinite(numberOfPassengers) || numberOfPassengers <= 0) {
      triggerShake();
      return;
    }
    if (!validateDiscountSection()) {
      triggerShake();
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

    if (!selectedSchedule || !selectedScheduleFare) {
      triggerShake();
      return;
    }

    const route = splitRoute(selectedSchedule.route);
    setIsSubmitting(true);
    try {
      const result = await bookingStore.createPersonBooking({
        passengerName: formData.passengerName.trim(),
        numberOfPassengers,
        seniorCitizenCount,
        pwdCount,
        seniorCitizenIds: formData.seniorCitizenIds.map((value) => value.trim()),
        pwdIds: formData.pwdIds.map((value) => value.trim()),
        farePerPassenger,
        discountAmount: computedDiscountAmount,
        phone: formData.passengerPhone.trim(),
        origin: route.origin || 'Unknown Origin',
        destination: route.destination || 'Unknown Destination',
        date: selectedSchedule.departureDatetime?.slice(0, 10) || selectedSchedule.departure || '',
        time: selectedSchedule.departureDatetime?.slice(11, 16) || selectedSchedule.departure || '',
        scheduleId: formData.scheduleId,
        totalAmount: computedTotalAmount,
        paymentMethod: formData.paymentMethod,
        paymentReference: formData.paymentReference.trim() || undefined,
        paymentProofImageUrl: formData.paymentProofImageUrl.trim() || undefined,
        boatId: selectedSchedule.boatId,
      }, user?.username ?? 'admin');

      if (result.success) {
        await boatStore.fetchBoats();
        setIsAddModalOpen(false);
        setFormData(createEmptyPersonBookingForm());
        return;
      }
      setFormError(result.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateStep1 = () => {
    setShowErrors(true);
    const numberOfPassengers = Number(formData.numberOfPassengers);
    if (!formData.passengerName.trim() || !formData.passengerPhone.trim()) {
      triggerShake();
      return false;
    }
    if (!Number.isFinite(numberOfPassengers) || numberOfPassengers <= 0) {
      triggerShake();
      return false;
    }
    if (!validateDiscountSection()) {
      triggerShake();
      return false;
    }
    setFormError(null);
    return true;
  };

  const validateStep2 = () => {
    setShowErrors(true);
    if (!formData.scheduleId || !selectedSchedule || !selectedScheduleFare) {
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
    setFormData(createEmptyPersonBookingForm());
  };

  return (
    <Layout className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <div className="mb-4 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/78">
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.5fr),360px] lg:px-5">
          <div className="space-y-2.5">
            <Badge className="w-fit border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              Passenger Desk
            </Badge>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Person Bookings</h1>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                Passenger booking operations
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">Total</p>
              <p className="mt-1 text-xl font-semibold text-sky-900 dark:text-sky-50">{bookingStore.personBookingsTotal}</p>
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
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by passenger name, origin, or destination..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white pl-10 dark:border-slate-700 dark:bg-slate-900"
              />
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-full rounded-xl sm:w-[220px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="for_verification">For Verification</SelectItem>
                <SelectItem value="for_cash_collection">For Cash Collection</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="payment_rejected">Payment Rejected</SelectItem>
                <SelectItem value="affected_by_cancellation">Affected by Cancellation</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleExport} className="h-10 gap-2 rounded-xl">
              <Download className="h-4 w-4" />
              Export
            </Button>
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

      {loading ? (
        <Card className="border-slate-200/70 bg-white/92 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
          <TableSkeleton rows={10} />
        </Card>
      ) : (
        <Card className="overflow-hidden border-slate-200/70 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/78">
          <div className="border-b border-slate-200/70 px-5 py-2.5 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Showing {bookingStore.personBookingsTotal} booking{bookingStore.personBookingsTotal === 1 ? '' : 's'}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200/70 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Booking ID
                  </th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Passenger
                  </th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Route
                  </th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Date
                  </th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Fare
                  </th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Status
                  </th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredBookings.length === 0 ? (
                  <EmptyStateRow colSpan={7} message="No bookings found." />
                ) : (
                  filteredBookings.map((booking) => (
                    <tr key={booking.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="whitespace-nowrap px-5 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100">#{booking.id}</td>
                      <td className="px-5 py-2.5 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{booking.passengerName}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">{booking.passengerPhone}</div>
                        </div>
                      </td>
                      <td className="px-5 py-2.5 whitespace-nowrap">
                        <div className="text-sm text-slate-900 dark:text-slate-100">
                          {booking.origin} to {booking.destination}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-sm text-slate-500 dark:text-slate-400">{formatDate(booking.date)}</td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(booking.totalAmount || 0)}
                      </td>
                      <td className="px-5 py-2.5 whitespace-nowrap">{getStatusBadge(booking.status)}</td>
                      <td className="px-5 py-2.5 whitespace-nowrap text-right text-sm font-medium">
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-5 py-2.5 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Page {page} of {bookingStore.personBookingsTotalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setPage((prev) => Math.min(bookingStore.personBookingsTotalPages, prev + 1))}
                disabled={page >= bookingStore.personBookingsTotalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

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
            <DialogTitle>Add Walk-in Person Booking</DialogTitle>
            <DialogDescription>For commuters without app account (admin/operator encoded).</DialogDescription>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <Badge className={formStep === 1 ? 'bg-sky-500 text-slate-950' : 'bg-white/10 text-slate-200'}>Step 1: Passenger</Badge>
              <Badge className={formStep === 2 ? 'bg-sky-500 text-slate-950' : 'bg-white/10 text-slate-200'}>Step 2: Schedule</Badge>
              <Badge className={formStep === 3 ? 'bg-sky-500 text-slate-950' : 'bg-white/10 text-slate-200'}>Step 3: Payment</Badge>
            </div>
          </DialogHeader>
          <div className="max-h-[calc(90vh-170px)] space-y-4 overflow-y-auto px-6 py-5" style={{ scrollbarGutter: 'stable' }}>
            {formStep === 1 && (
              <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">
                  Enter passenger info first.
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
                          passengerName: '',
                          passengerPhone: '',
                        }));
                        return;
                      }
                      const matchedUser = selectableAppUsers.find((appUser) => appUser.id === value);
                      if (!matchedUser?.phone) {
                        return;
                      }
                      setFormData((prev) => ({
                        ...prev,
                        appUserId: matchedUser.id,
                        passengerName: matchedUser.fullName,
                        passengerPhone: matchedUser.phone ?? '',
                      }));
                    }}
                    disabled={appUsersLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={appUsersLoading ? 'Loading app users...' : 'Choose app user or manual walk-in'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual walk-in entry</SelectItem>
                      {selectableAppUsers.map((appUser) => (
                        <SelectItem key={appUser.id} value={appUser.id}>
                          {appUser.fullName} | {appUser.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">
                    Select an existing app user to auto-fill passenger name and phone. Only app users with saved phone numbers are listed.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Passenger Name <span className="text-red-500">*</span></Label>
                    <Input
                      value={formData.passengerName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, passengerName: e.target.value }))}
                      readOnly={Boolean(selectedAppUser)}
                      title={showErrors && !formData.passengerName.trim() ? "Passenger name is required" : undefined}
                      className={cn(showErrors && !formData.passengerName.trim() && "border-red-500 focus-visible:ring-red-500")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone <span className="text-red-500">*</span></Label>
                    <Input
                      value={formData.passengerPhone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, passengerPhone: sanitizePhoneInput(e.target.value) }))}
                      readOnly={Boolean(selectedAppUser)}
                      title={showErrors && !formData.passengerPhone.trim() ? "Phone number is required" : undefined}
                      className={cn(showErrors && !formData.passengerPhone.trim() && "border-red-500 focus-visible:ring-red-500")}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>No. of Passenger <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.numberOfPassengers}
                    onChange={(e) => setFormData((prev) => ({ ...prev, numberOfPassengers: e.target.value }))}
                    title={showErrors && Number(formData.numberOfPassengers) <= 0 ? "Must be at least 1 passenger" : undefined}
                    className={cn(showErrors && Number(formData.numberOfPassengers) <= 0 && "border-red-500 focus-visible:ring-red-500")}
                  />
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">Discount Breakdown</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Senior citizens and PWD passengers get a 20% fare discount each. Every discounted passenger must provide one valid ID number.
                      </p>
                    </div>
                    <Badge className="border border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
                      20% off
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Senior Count</Label>
                      <Input
                        type="number"
                        min={0}
                        max={Number(formData.numberOfPassengers) || undefined}
                        value={formData.seniorCitizenCount}
                        onChange={(e) => updateSeniorCitizenCount(e.target.value)}
                        title={showErrors && discountedPassengerCount > passengerCount ? 'Discount counts cannot exceed total passengers' : undefined}
                        className={cn(showErrors && discountedPassengerCount > passengerCount && 'border-red-500 focus-visible:ring-red-500')}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>PWD Count</Label>
                      <Input
                        type="number"
                        min={0}
                        max={Number(formData.numberOfPassengers) || undefined}
                        value={formData.pwdCount}
                        onChange={(e) => updatePwdCount(e.target.value)}
                        title={showErrors && discountedPassengerCount > passengerCount ? 'Discount counts cannot exceed total passengers' : undefined}
                        className={cn(showErrors && discountedPassengerCount > passengerCount && 'border-red-500 focus-visible:ring-red-500')}
                      />
                    </div>
                  </div>
                  {discountedPassengerCount > 0 && (
                    <div className="mt-3 rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
                      Regular passengers: {regularPassengerCount} | Discounted passengers: {discountedPassengerCount}
                    </div>
                  )}
                  {formData.seniorCitizenIds.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Senior ID Numbers</p>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {formData.seniorCitizenIds.map((value, index) => (
                          <div key={`senior-${index}`} className="space-y-1">
                            <Label>Senior #{index + 1} ID</Label>
                            <Input
                              value={value}
                              onChange={(e) => updateDiscountIdAt('seniorCitizenIds', index, e.target.value)}
                              placeholder="Enter senior ID number"
                              title={showErrors && !value.trim() ? 'Senior ID number is required' : undefined}
                              className={cn(showErrors && !value.trim() && 'border-red-500 focus-visible:ring-red-500')}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {formData.pwdIds.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">PWD ID Numbers</p>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {formData.pwdIds.map((value, index) => (
                          <div key={`pwd-${index}`} className="space-y-1">
                            <Label>PWD #{index + 1} ID</Label>
                            <Input
                              value={value}
                              onChange={(e) => updateDiscountIdAt('pwdIds', index, e.target.value)}
                              placeholder="Enter PWD ID number"
                              title={showErrors && !value.trim() ? 'PWD ID number is required' : undefined}
                              className={cn(showErrors && !value.trim() && 'border-red-500 focus-visible:ring-red-500')}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {formStep === 2 && (
              <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">
                  Select scheduled trip. Boat, route, and timing are auto-filled.
                </div>
                <div className="space-y-1">
                  <Label>Scheduled Trip <span className="text-red-500">*</span></Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSchedulePickerOpen(true)}
                    className={cn("w-full justify-start border-white/15 bg-white/5 text-left text-white hover:bg-white/10", showErrors && !formData.scheduleId && "border-red-500")}
                  >
                    {selectedSchedule
                      ? `${selectedSchedule.boatName ?? 'Boat'} | ${selectedSchedule.route} | ${formatDateTime(selectedSchedule.departureDatetime)}`
                      : 'Choose scheduled passenger trip'}
                  </Button>
                  {availableSchedules.length === 0 && (
                    <p className="text-xs text-slate-400">No passenger schedules available right now.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Boat</Label>
                    <Input value={selectedScheduleBoat?.name ?? ''} readOnly placeholder="Auto from selected schedule" />
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

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Route</Label>
                    <Input value={selectedSchedule?.route ?? ''} readOnly placeholder="Auto from Fare Management" />
                  </div>
                  <div className="space-y-1">
                    <Label>Capacity / Seats Left</Label>
                    <Input
                      value={
                        selectedScheduleBoat
                          ? `${selectedScheduleBoat.capacity} total / ${selectedScheduleBoat.availableSeats ?? selectedScheduleBoat.capacity} left`
                          : ''
                      }
                      readOnly
                      placeholder="Auto from boat"
                    />
                  </div>
                </div>
              </div>
            )}

            {formStep === 3 && (
              <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                  <div className="space-y-1">
                    <Label>Total Amount</Label>
                    <Input value={formatCurrency(computedTotalAmount)} readOnly />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
                  <p className="font-semibold text-slate-100">Fare Quote</p>
                  <p className="mt-2">Passengers: {Number.isFinite(passengerCount) && passengerCount > 0 ? passengerCount : 0}</p>
                  <p className="mt-1">Regular fare passengers: {regularPassengerCount}</p>
                  <p className="mt-1">Discounted passengers: {discountedPassengerCount}</p>
                  <p className="mt-1">Per passenger fare: {formatCurrency(farePerPassenger)}</p>
                  <p className="mt-1">Base subtotal: {formatCurrency(computedBaseAmount)}</p>
                  <p className="mt-1 text-emerald-300">Senior/PWD discount: -{formatCurrency(computedDiscountAmount)}</p>
                  <p className="mt-1 font-semibold text-slate-100">Quoted total: {formatCurrency(computedTotalAmount)}</p>
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

                {selectedScheduleFare && (
                  <p className="text-xs text-gray-500">
                    Fare basis: {selectedScheduleFare.fareName} ({selectedScheduleFare.route})
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
                {formStep === 1 ? 'Next: Schedule' : 'Next: Payment'}
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
            <DialogTitle>Select Scheduled Passenger Trip</DialogTitle>
            <DialogDescription className="text-slate-300">
              Review the trip table, then choose the passenger schedule for this booking.
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
                    <th className="px-3 py-2 text-left">Seats Left</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-400">No passenger schedules available.</td>
                    </tr>
                  ) : (
                    filteredSchedules.map((schedule) => {
                      const boat = availableBoats.find((item) => item.id === schedule.boatId);
                      return (
                        <tr key={schedule.id} className="border-t border-white/10">
                          <td className="px-3 py-2.5">{schedule.boatName ?? 'Boat'}</td>
                          <td className="px-3 py-2.5">{schedule.route}</td>
                          <td className="px-3 py-2.5">{formatDateTime(schedule.departureDatetime)}</td>
                          <td className="px-3 py-2.5">{formatDateTime(schedule.arrivalDatetime)}</td>
                          <td className="px-3 py-2.5">{boat?.availableSeats ?? boat?.capacity ?? '-'}</td>
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

export default PersonBookingsPage;


