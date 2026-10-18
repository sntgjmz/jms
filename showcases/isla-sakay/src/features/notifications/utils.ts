import type { AlertSeverity } from './types';
import { formatDateTimeOrFallback } from '@/lib/date-time';

export const toPriority = (severity: AlertSeverity) => {
  if (severity === 'high') return 'high' as const;
  if (severity === 'medium') return 'medium' as const;
  return 'low' as const;
};

export const toTimestamp = (dateIso: string) => formatDateTimeOrFallback(dateIso);

export const toSeverity = (priority: string): AlertSeverity => {
  if (priority === 'high' || priority === 'critical') return 'high';
  if (priority === 'medium') return 'medium';
  return 'low';
};
