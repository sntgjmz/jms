export const APP_CONFIG = {
  NAME: 'Isla Sakay',
  VERSION: '1.0.0',
  DESCRIPTION: 'Boat Management System',
} as const;

export const API_CONFIG = {
  BASE_URL: '/portfolio-isla-demo-api',
  TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
} as const;

export const MOBILE_APP_CONFIG = {
  APK_URL: '',
} as const;

export const SESSION_CONFIG = {
  IDLE_TIMEOUT_MINUTES: Number(import.meta.env.VITE_SESSION_IDLE_TIMEOUT_MINUTES) || 15,
  WARNING_BEFORE_SECONDS: Number(import.meta.env.VITE_SESSION_WARNING_BEFORE_SECONDS) || 60,
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER: 'user',
  THEME: 'theme',
  NOTIFICATION_SOUND_ENABLED: 'notification_sound_enabled',
  NOTIFICATION_SOUND_VOLUME: 'notification_sound_volume',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  API: 'yyyy-MM-dd',
  DATETIME: 'MMM dd, yyyy HH:mm',
} as const;
