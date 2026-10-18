import axios, { type AxiosInstance } from 'axios';
import { demoAdapter } from '@/demo/adapter';

// Both the preserved application instance and direct Axios calls use the local
// adapter. Neither opens a connection or contacts an external service.
axios.defaults.adapter = demoAdapter;
axios.defaults.baseURL = '/portfolio-isla-demo-api';
axios.defaults.withCredentials = false;

export const apiClient: AxiosInstance = axios.create({
  baseURL: '/portfolio-isla-demo-api', adapter: demoAdapter, withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = 'portfolio-demo-token';
export const setAccessToken = (token: string | null) => { accessToken = token; };
export const clearAccessToken = () => { accessToken = null; };
export const API_ERROR_EVENT = 'app:api-error';
export const API_RECOVERED_EVENT = 'app:api-recovered';

apiClient.interceptors.request.use(config => {
  // A service cannot fall back to a network adapter through request options.
  config.adapter = demoAdapter;
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

apiClient.interceptors.response.use(response => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(API_RECOVERED_EVENT));
  return response;
}, error => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(API_ERROR_EVENT, {
    detail: { message: error.response?.data?.message ?? error.message, status: error.response?.status },
  }));
  return Promise.reject(error);
});

export async function handleApiCall<T>(apiCall: () => Promise<{ data: T }>): Promise<T> {
  return (await apiCall()).data;
}

export default apiClient;
