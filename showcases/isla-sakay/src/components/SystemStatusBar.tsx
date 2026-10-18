import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showErrorToast, showWarningToast } from '@/lib/toast-helpers';
import { API_ERROR_EVENT, API_RECOVERED_EVENT } from '@/api/core';

interface ApiErrorDetail {
  message?: string;
  status?: number;
  url?: string;
  method?: string;
}

export default function SystemStatusBar() {
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [apiError, setApiError] = useState<ApiErrorDetail | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleApiError = (event: Event) => {
      const customEvent = event as CustomEvent<ApiErrorDetail>;
      setApiError(customEvent.detail || { message: 'API request failed.' });
    };
    const handleApiRecovered = () => {
      setApiError(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(API_ERROR_EVENT, handleApiError as EventListener);
    window.addEventListener(API_RECOVERED_EVENT, handleApiRecovered);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(API_ERROR_EVENT, handleApiError as EventListener);
      window.removeEventListener(API_RECOVERED_EVENT, handleApiRecovered);
    };
  }, []);

  const resolveStatusConflictMessage = () => {
    const raw = apiError?.message?.trim() ?? '';
    if (!raw) return '';
    if (!apiError?.url || !apiError.url.includes('/boats') || !apiError.url.includes('/status')) {
      return raw;
    }

    const scheduleMatch = raw.match(/(\d+)\s+schedule/);
    const bookingMatch = raw.match(/(\d+)\s+active booking/);
    const scheduleCount = scheduleMatch ? Number(scheduleMatch[1]) : 0;
    const bookingCount = bookingMatch ? Number(bookingMatch[1]) : 0;

    if (scheduleCount > 0 && bookingCount > 0) {
      return `Status change blocked: ${scheduleCount} schedule(s) and ${bookingCount} active booking(s) still linked.`;
    }
    if (scheduleCount > 0) {
      return `Status change blocked: ${scheduleCount} schedule(s) still linked.`;
    }
    if (bookingCount > 0) {
      return `Status change blocked: ${bookingCount} active booking(s) still linked.`;
    }
    return raw;
  };

  const resolveDuplicateMessage = () => {
    const raw = apiError?.message?.trim() ?? '';
    if (!raw) return '';
    const lowered = raw.toLowerCase();
    if (!lowered.includes('already exists') && !lowered.includes('duplicate')) return '';
    const url = apiError?.url ?? '';
    if (url.includes('/barangays')) return 'Duplicate barangay name. Please use a unique name.';
    if (url.includes('/operators')) return 'Duplicate operator record. Email, username, or license already exists.';
    if (url.includes('/admins')) return 'Duplicate admin account. Username or email already exists.';
    if (url.includes('/boats')) return 'Duplicate vessel record. Name or registration already exists.';
    if (url.includes('/fares')) return 'Duplicate fare entry. Please use a unique fare name.';
    if (url.includes('/bookings')) return 'Duplicate booking detected for this schedule.';
    return 'Duplicate record detected.';
  };

  const resolveValidationMessage = () => {
    const raw = apiError?.message?.trim() ?? '';
    if (!raw) return '';
    const lowered = raw.toLowerCase();
    if (lowered.includes('license') && lowered.includes('exists')) {
      return 'License number already exists. Please use a unique license number.';
    }
    if (lowered.includes('username') && (lowered.includes('space') || lowered.includes('spacing'))) {
      return 'Username cannot contain spaces.';
    }
    if (lowered.includes('username') && lowered.includes('10')) {
      return 'Username must be 10 letters with up to 2 numbers.';
    }
    if (lowered.includes('password') && lowered.includes('weak')) {
      return 'Password is too weak. Please use a stronger password.';
    }
    if (lowered.includes('email') && lowered.includes('invalid')) {
      return 'Email address is invalid.';
    }
    return '';
  };

  const resolveScheduleConflictMessage = () => {
    const raw = apiError?.message?.trim() ?? '';
    if (!raw) return '';
    if (!apiError?.url || !apiError.url.includes('/schedules')) {
      return raw;
    }
    if (raw.toLowerCase().includes('registered vessels')) {
      return 'Schedule blocked: only registered vessels can be assigned.';
    }
    if (raw.toLowerCase().includes('trip time')) {
      return 'Schedule blocked: please check the trip time.';
    }
    return raw;
  };

  const resolveBookingConflictMessage = () => {
    const raw = apiError?.message?.trim() ?? '';
    if (!raw) return '';
    if (!apiError?.url || !apiError.url.includes('/bookings')) {
      return raw;
    }
    if (raw.toLowerCase().includes('weight') && raw.toLowerCase().includes('max')) {
      return 'Booking blocked: cargo weight exceeds the vessel limit.';
    }
    if (raw.toLowerCase().includes('gcash')) {
      return 'Booking blocked: GCash proof or reference is required.';
    }
    if (raw.toLowerCase().includes('schedule')) {
      return 'Booking blocked: schedule is not available for booking.';
    }
    return raw;
  };

  const resolveApiMessage = () => {
    const raw = apiError?.message?.trim() ?? '';
    const isGeneric = raw.toLowerCase().startsWith('request failed with status code');
    const duplicateMessage = resolveDuplicateMessage();
    if (duplicateMessage) {
      return duplicateMessage;
    }
    const validationMessage = resolveValidationMessage();
    if (validationMessage) {
      return validationMessage;
    }
    if (apiError?.status === 409) {
      if (isGeneric || !raw) {
        return 'This action is blocked because there are active schedules or bookings linked to this vessel.';
      }
      return resolveStatusConflictMessage();
    }
    if (apiError?.status && apiError.status >= 400 && apiError.status < 500) {
      return isGeneric || !raw ? 'Please check the inputs and try again.' : raw;
    }
    return raw || 'Please try again.';
  };

  const resolveContextTitle = () => {
    const url = apiError?.url ?? '';
    if (url.includes('/boats') && url.includes('/status')) return 'Vessel status blocked';
    if (url.includes('/boats') && apiError?.method === 'delete') return 'Boat deletion blocked';
    if (url.includes('/bookings/cargo')) return 'Cargo booking blocked';
    if (url.includes('/bookings/person')) return 'Passenger booking blocked';
    if (url.includes('/schedules')) return 'Schedule update blocked';
    if (url.includes('/fares')) return 'Fare update blocked';
    if (url.includes('/barangays')) return 'Barangay update blocked';
    if (url.includes('/operators')) return 'Operator update blocked';
    if (url.includes('/admins')) return 'Admin update blocked';
    return '';
  };

  const statusLabel = apiError?.status === 409
    ? 'Action blocked.'
    : apiError?.status
      ? `Request blocked (${apiError.status}).`
      : 'Request failed.';

  useEffect(() => {
    if (apiError?.status && apiError.status >= 400 && apiError.status < 500) {
      const message = resolveApiMessage();
      const status = apiError.status;
      const contextTitle = resolveContextTitle();
      if (status === 401) {
        showWarningToast(contextTitle || 'Session expired', message || 'Please sign in again.');
      } else if (status === 403) {
        showWarningToast(contextTitle || 'Access denied', message || 'You do not have permission to do that.');
      } else if (status === 404) {
        showErrorToast(contextTitle || 'Not found', message || 'The requested item was not found.');
      } else if (status === 409) {
        const refinedMessage = apiError.url?.includes('/schedules')
          ? resolveScheduleConflictMessage()
          : apiError.url?.includes('/bookings')
            ? resolveBookingConflictMessage()
            : resolveStatusConflictMessage();
        showWarningToast(contextTitle || 'Action blocked', refinedMessage || message);
      } else if (status === 422) {
        showWarningToast(contextTitle || 'Validation issue', message || 'Please review the highlighted fields.');
      } else {
        showErrorToast(contextTitle || 'Request blocked', message);
      }
      setApiError(null);
    }
  }, [apiError]);

  if (!isOffline && !apiError) {
    return null;
  }

  if (apiError?.status && apiError.status >= 400 && apiError.status < 500) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-4 py-6" aria-live="polite">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.25)] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-rose-200 bg-rose-50 p-2 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            {isOffline ? <WifiOff className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isOffline ? 'You are offline.' : statusLabel}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {isOffline
                ? 'Some actions may fail until your connection is restored.'
                : resolveApiMessage()}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Retry
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => setApiError(null)}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
