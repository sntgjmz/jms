import apiClient, { clearAccessToken, handleApiCall, setAccessToken } from './core';

export { apiClient, setAccessToken, clearAccessToken, handleApiCall };
export { authAPI } from './auth';
export { userAPI } from './users';
export { bookingAPI } from './bookings';
export { boatAPI } from './boats';
export { notificationAPI } from './notifications';
export { paymentAPI } from './payments';
export { settingsAPI } from './settings';
export { reportsAPI } from './reports';
export { preferencesAPI } from './preferences';

export default apiClient;
