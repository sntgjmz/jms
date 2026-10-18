import { useEffect, useMemo, useState } from 'react';
import { useSettingsStore } from '@/stores';
import type { Fare, Schedule } from '@/stores/SettingsStore';
import { useBatchSubmitter } from '@/hooks/useBatchSubmitter';
import { pushBellNotification } from '@/lib/notification-helpers';

interface ScheduleFormState {
  boatId: string;
  operatorId: string;
  routeFareId: string;
  departureDatetime: string;
  arrivalDatetime: string;
  frequency: string;
  selectedDays: string[];
  departureTime: string;
  arrivalTime: string;
  notes: string;
  validUntil: string;
}

type ScheduleStep = 1 | 2 | 3;
type ScheduleFieldErrors = {
  boatId: string | null;
  operatorId: string | null;
  routeFareId: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  validUntil: string | null;
};

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const createEmptyForm = (): ScheduleFormState => ({
  boatId: '',
  operatorId: '',
  routeFareId: '',
  departureDatetime: '',
  arrivalDatetime: '',
  frequency: '',
  selectedDays: [],
  departureTime: '',
  arrivalTime: '',
  notes: '',
  validUntil: '',
});

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDateKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(date);

const createRecurrenceGroupId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `recurrence-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const countGeneratedTrips = (validUntil: string, selectedDays: string[], startDate: Date): number => {
  if (!validUntil) return 0;
  const endDate = parseLocalDate(validUntil);
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const last = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  if (selectedDays.length === 0) {
    return current <= last ? 1 : 0;
  }

  const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let count = 0;
  for (let cursor = new Date(current); cursor <= last; cursor.setDate(cursor.getDate() + 1)) {
    if (selectedDays.includes(dayMap[cursor.getDay()])) {
      count += 1;
    }
  }
  return count;
};

const getRecurringDates = (validUntil: string, selectedDays: string[], startDate: Date): Date[] => {
  if (!validUntil) return [];
  const endDate = parseLocalDate(validUntil);
  const firstDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const finalDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  if (selectedDays.length === 0) {
    return firstDate <= finalDate ? [finalDate] : [];
  }

  const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dates: Date[] = [];
  for (let cursor = new Date(firstDate); cursor <= finalDate; cursor.setDate(cursor.getDate() + 1)) {
    if (selectedDays.includes(dayMap[cursor.getDay()])) {
      dates.push(new Date(cursor));
    }
  }
  return dates;
};

const buildFrequencyString = (selectedDays: string[], validUntil: string, departureDate: Date) => {
  if (selectedDays.length > 0) {
    let pattern = selectedDays.join(', ');
    if (selectedDays.length === 7) pattern = 'Daily';
    else if (selectedDays.length === 5 && selectedDays.every((day) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(day))) pattern = 'Weekdays';
    else if (selectedDays.length === 2 && selectedDays.every((day) => ['Sat', 'Sun'].includes(day))) pattern = 'Weekends';
    else if (selectedDays.length === 1 && selectedDays[0] === 'Sat') pattern = 'Saturday';
    else if (selectedDays.length === 1 && selectedDays[0] === 'Sun') pattern = 'Sunday';

    const untilStr = validUntil
      ? parseLocalDate(validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';
    return `Every ${pattern}${untilStr ? ` until ${untilStr}` : ''}`;
  }

  const dateStr = departureDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `One-time Trip on ${dateStr}`;
};

const buildOccurrenceDateTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
};

interface UseScheduleFormParams {
  isOpen: boolean;
  editingSchedule: Schedule | null;
  onSuccess: () => void;
}

export const useScheduleForm = ({
  isOpen,
  editingSchedule,
  onSuccess,
}: UseScheduleFormParams) => {
  const settingsStore = useSettingsStore();
  const [formData, setFormData] = useState<ScheduleFormState>(createEmptyForm());
  const [formStep, setFormStep] = useState<ScheduleStep>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSnapshot, setFormSnapshot] = useState(JSON.stringify(createEmptyForm()));
  const batchSubmitter = useBatchSubmitter<Omit<Schedule, 'id'>, Schedule>({
    submitItem: (payload) => settingsStore.createScheduleRecord(payload),
  });

  const isDirty = useMemo(
    () => JSON.stringify(formData) !== formSnapshot || formStep !== 1,
    [formData, formSnapshot, formStep],
  );

  const estimatedTripCount = useMemo(() => {
    const today = new Date();
    return countGeneratedTrips(formData.validUntil, formData.selectedDays, today);
  }, [formData.validUntil, formData.selectedDays]);

  useEffect(() => {
    if (!isOpen) return;

    let initialSelectedDays: string[] = [];
    let initialValidUntil = '';

    if (editingSchedule?.frequency) {
      const freq = editingSchedule.frequency.toLowerCase();
      if (freq.includes('daily')) initialSelectedDays = [...DAYS_OF_WEEK];
      else if (freq.includes('weekdays')) initialSelectedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      else if (freq.includes('weekends')) initialSelectedDays = ['Sat', 'Sun'];
      else {
        DAYS_OF_WEEK.forEach((day) => {
          if (editingSchedule.frequency?.includes(day)) initialSelectedDays.push(day);
        });

        if (editingSchedule.frequency.includes('until ')) {
          const parts = editingSchedule.frequency.split('until ');
          if (parts[1]) {
            const parsedDate = new Date(parts[1]);
            if (!Number.isNaN(parsedDate.getTime())) {
              const offset = parsedDate.getTimezoneOffset() * 60000;
              initialValidUntil = new Date(parsedDate.getTime() - offset).toISOString().split('T')[0];
            }
          }
        }
      }
    }

    if (initialSelectedDays.length === 0 && editingSchedule?.departureDatetime) {
      initialValidUntil = editingSchedule.departureDatetime.split('T')[0];
    }

    const initialData = editingSchedule
      ? {
          boatId: editingSchedule.boatId ?? '',
          operatorId: editingSchedule.operatorId ?? '',
          routeFareId: editingSchedule.routeFareId ?? '',
          departureDatetime: editingSchedule.departureDatetime ?? '',
          arrivalDatetime: editingSchedule.arrivalDatetime ?? '',
          frequency: editingSchedule.frequency ?? '',
          selectedDays: initialSelectedDays,
          departureTime: editingSchedule.departureDatetime
            ? new Date(editingSchedule.departureDatetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })
            : '',
          arrivalTime: editingSchedule.arrivalDatetime
            ? new Date(editingSchedule.arrivalDatetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })
            : '',
          notes: editingSchedule.notes ?? '',
          validUntil: initialValidUntil,
        }
      : createEmptyForm();

    setFormData(initialData);
    setFormSnapshot(JSON.stringify(initialData));
    setFormStep(1);
    setShowErrors(false);
    setFormError(null);
  }, [isOpen, editingSchedule]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  const getFieldErrors = (
    selectedBoat: { id: string } | undefined,
    selectedOperator: { id: string } | undefined,
    selectedFare: { id: string } | undefined,
  ): ScheduleFieldErrors => {
    const errors: ScheduleFieldErrors = {
      boatId: null,
      operatorId: null,
      routeFareId: null,
      departureTime: null,
      arrivalTime: null,
      validUntil: null,
    };

    if (!formData.boatId) {
      errors.boatId = 'Boat is required.';
    } else if (!selectedBoat) {
      errors.boatId = 'Selected boat is no longer available.';
    }

    if (!formData.operatorId) {
      errors.operatorId = 'Assigned operator is required.';
    } else if (!selectedOperator) {
      errors.operatorId = 'Selected operator is not assigned to the chosen boat.';
    }

    if (!formData.routeFareId) {
      errors.routeFareId = 'Route is required.';
    } else if (!selectedFare) {
      errors.routeFareId = 'Selected route is not assigned to the chosen boat.';
    }

    if (!formData.departureTime) {
      errors.departureTime = 'Departure time is required.';
    }
    if (!formData.arrivalTime) {
      errors.arrivalTime = 'Arrival time is required.';
    }
    if (!formData.validUntil) {
      errors.validUntil = formData.selectedDays.length === 0 ? 'Trip date is required.' : 'Repeat until date is required.';
    }

    if (!errors.validUntil && formData.validUntil) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const [year, month, day] = formData.validUntil.split('-').map(Number);
      const validUntilDate = new Date(year, month - 1, day);

      if (validUntilDate < today) {
        errors.validUntil = 'The selected date cannot be in the past.';
      } else if (formData.selectedDays.length === 0 && formData.departureTime && validUntilDate.getTime() === today.getTime()) {
        const [hours, minutes] = formData.departureTime.split(':').map(Number);
        const tripTime = new Date(year, month - 1, day, hours, minutes);
        if (tripTime < now) {
          errors.departureTime = 'Departure time has already passed for today.';
        }
      }
    }

    return errors;
  };

  const validateStep1 = (
    selectedBoat: { id: string } | undefined,
    selectedOperator: { id: string } | undefined,
    selectedFare: { id: string } | undefined,
  ): boolean => {
    setShowErrors(true);
    const fieldErrors = getFieldErrors(selectedBoat, selectedOperator, selectedFare);
    if (fieldErrors.boatId || fieldErrors.operatorId || fieldErrors.routeFareId) {
      setFormError(fieldErrors.boatId ?? fieldErrors.operatorId ?? fieldErrors.routeFareId);
      triggerShake();
      return false;
    }
    setFormError(null);
    return true;
  };

  const validateStep2 = (
    selectedBoat?: { id: string },
    selectedOperator?: { id: string },
    selectedFare?: { id: string },
  ): boolean => {
    setShowErrors(true);
    const fieldErrors = getFieldErrors(selectedBoat, selectedOperator, selectedFare);
    if (fieldErrors.departureTime || fieldErrors.arrivalTime || fieldErrors.validUntil) {
      setFormError(fieldErrors.departureTime ?? fieldErrors.arrivalTime ?? fieldErrors.validUntil);
      triggerShake();
      return false;
    }

    setFormError(null);
    return true;
  };

  const buildSchedulePayloads = (
    selectedBoat: { id: string; capacity: number | null | undefined; name: string; type: string },
    selectedOperator: { id: string; name: string },
    selectedFare: Fare,
    routeParts: { origin: string; destination: string },
  ): Omit<Schedule, 'id'>[] => {
    const occurrenceDates = getRecurringDates(formData.validUntil, formData.selectedDays, new Date());
    const recurrenceGroupId = formData.selectedDays.length > 0 ? createRecurrenceGroupId() : undefined;

    return occurrenceDates.map((occurrenceDate) => {
      const departureDate = buildOccurrenceDateTime(occurrenceDate, formData.departureTime);
      const arrivalDate = buildOccurrenceDateTime(occurrenceDate, formData.arrivalTime);
      if (arrivalDate <= departureDate) {
        arrivalDate.setDate(arrivalDate.getDate() + 1);
      }

      return {
        boatId: formData.boatId,
        operatorId: formData.operatorId,
        routeFareId: formData.routeFareId,
        notes: formData.notes,
        operatorName: selectedOperator.name,
        route: selectedFare.route ?? '',
        capacity: selectedBoat.capacity ?? 0,
        boatName: selectedBoat.name,
        boatType: selectedBoat.type,
        origin: routeParts.origin,
        destination: routeParts.destination,
        departure: routeParts.origin,
        arrival: routeParts.destination,
        frequency: buildFrequencyString(formData.selectedDays, formData.validUntil, departureDate),
        recurrenceGroupId,
        selectedDays: [],
        validUntil: formData.selectedDays.length > 0 ? formatDateKey(occurrenceDate) : formData.validUntil || null,
        departureDatetime: departureDate.toISOString(),
        arrivalDatetime: arrivalDate.toISOString(),
      };
    });
  };

  const handleSave = async (
    selectedBoat: { id: string; capacity: number | null | undefined; name: string; type: string } | undefined,
    selectedOperator: { id: string; name: string } | undefined,
    selectedFare: Fare | undefined,
    routeParts: { origin: string; destination: string },
  ) => {
    if (isSubmitting) return;

    setShowErrors(true);
    setFormError(null);
    if (!validateStep1(selectedBoat, selectedOperator, selectedFare) || !validateStep2(selectedBoat, selectedOperator, selectedFare) || !selectedOperator || !selectedFare || !selectedBoat) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSchedule) {
        const occurrenceDate = formData.validUntil ? parseLocalDate(formData.validUntil) : new Date();
        const departureDate = buildOccurrenceDateTime(occurrenceDate, formData.departureTime);
        const arrivalDate = buildOccurrenceDateTime(occurrenceDate, formData.arrivalTime);
        if (arrivalDate <= departureDate) {
          arrivalDate.setDate(arrivalDate.getDate() + 1);
        }

        const payload = {
          boatId: formData.boatId,
          operatorId: formData.operatorId,
          routeFareId: formData.routeFareId,
          notes: formData.notes,
          operatorName: selectedOperator.name,
          route: selectedFare.route ?? '',
          capacity: selectedBoat.capacity ?? 0,
          boatName: selectedBoat.name,
          boatType: selectedBoat.type,
          origin: routeParts.origin,
          destination: routeParts.destination,
          departure: routeParts.origin,
          arrival: routeParts.destination,
          frequency: buildFrequencyString(formData.selectedDays, formData.validUntil, departureDate),
          selectedDays: formData.selectedDays,
          validUntil: formData.validUntil || null,
          departureDatetime: departureDate.toISOString(),
          arrivalDatetime: arrivalDate.toISOString(),
        };

        await settingsStore.updateSchedule(
          editingSchedule.id,
          payload,
          editingSchedule.recurrenceGroupId ? { scope: 'future' } : undefined,
        );
        pushBellNotification({
          title: 'Schedule updated',
          message: 'Boat schedule has been updated successfully.',
          type: 'system',
          priority: 'low',
        });
        onSuccess();
        return;
      }

      const payloads = buildSchedulePayloads(selectedBoat, selectedOperator, selectedFare, routeParts);
      if (payloads.length === 0) {
        setFormError('No future schedule dates matched the selected recurrence before the chosen end date.');
        triggerShake();
        return;
      }

      const summary = await batchSubmitter.runBatch(payloads);
      if (summary.failureCount > 0) {
        setFormError(
          summary.successCount > 0
            ? `${summary.successCount} trips were created, but ${summary.failureCount} failed. Review the queue summary for details.`
            : 'No trips were created. Review the queue summary for the failure details.',
        );
        pushBellNotification({
          title: 'Schedule batch completed with issues',
          message:
            summary.successCount > 0
              ? `${summary.successCount} of ${summary.totalCount} schedule entries were created.`
              : 'The schedule batch did not create any entries.',
          type: 'system',
          priority: 'medium',
        });
        return;
      }

      pushBellNotification({
        title: 'Schedule added',
        message:
          summary.totalCount > 1
            ? `${summary.totalCount} schedule entries were created successfully.`
            : 'New boat schedule has been added successfully.',
        type: 'system',
        priority: 'low',
      });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    setFormData,
    formStep,
    setFormStep,
    formError,
    setFormError,
    showErrors,
    setShowErrors,
    isShaking,
    isDirty,
    isSubmitting,
    estimatedTripCount,
    batchProgress: batchSubmitter.progress,
    dismissBatchProgress: batchSubmitter.dismiss,
    validateStep1,
    validateStep2,
    getFieldErrors,
    handleSave,
  };
};
