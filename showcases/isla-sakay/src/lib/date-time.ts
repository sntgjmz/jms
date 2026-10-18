export const toEpochMs = (value?: string | null): number => {
  if (!value) return 0;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) ? epoch : 0;
};

const PH_TIMEZONE = 'Asia/Manila';

export const formatDateTimeOrFallback = (value?: string | null, fallback = 'N/A'): string => {
  const epoch = toEpochMs(value);
  if (epoch <= 0) return fallback;
  return new Date(epoch).toLocaleString('en-PH', { timeZone: PH_TIMEZONE });
};

export const formatDateOrFallback = (value?: string | null, fallback = 'N/A'): string => {
  const epoch = toEpochMs(value);
  if (epoch <= 0) return fallback;
  return new Date(epoch).toLocaleDateString('en-PH', { timeZone: PH_TIMEZONE });
};

export const formatRelativeTimeOrFallback = (value?: string | null, fallback = 'N/A'): string => {
  const epoch = toEpochMs(value);
  if (epoch <= 0) return fallback;

  const diffMs = Date.now() - epoch;
  if (diffMs < 0) {
    return 'Just now';
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 10) {
    return 'Just now';
  }
  if (diffSeconds < 60) {
    return `${diffSeconds} seconds ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes === 1) {
    return '1 minute ago';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) {
    return '1 hour ago';
  }
  if (diffHours < 24) {
    return `${diffHours} hours ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return '1 day ago';
  }
  if (diffDays < 30) {
    return `${diffDays} days ago`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) {
    return '1 month ago';
  }
  if (diffMonths < 12) {
    return `${diffMonths} months ago`;
  }

  const diffYears = Math.floor(diffDays / 365);
  if (diffYears === 1) {
    return '1 year ago';
  }
  return `${diffYears} years ago`;
};
