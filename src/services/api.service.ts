import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { store } from '../store';
import { logout, updateAccessToken } from '../store/slices/authSlice';
import { storageService } from './storage.service';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Helper to set authorization header safely on AxiosHeaders or plain object
const setAuthHeader = (headers: any, token: string) => {
  if (!headers) return;
  if (typeof headers.set === 'function') {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.Authorization = `Bearer ${token}`;
  }
};

// Attach access token
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  let token = store.getState().auth.accessToken;
  if (!token) {
    try {
      token = await storageService.getAccessToken();
    } catch {}
  }
  if (token && config.headers) {
    setAuthHeader(config.headers, token);
  }
  return config;
});

// Token refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!original) return Promise.reject(error);

    const isNonRefreshableAuth =
      original.url?.includes('/auth/login') ||
      original.url?.includes('/auth/register') ||
      original.url?.includes('/auth/refresh-token') ||
      original.url?.includes('/auth/verify-otp') ||
      original.url?.includes('/auth/resend-otp');

    if (error.response?.status === 401 && !original._retry && !isNonRefreshableAuth) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          if (original.headers) setAuthHeader(original.headers, token);
          return apiClient(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = await storageService.getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');
        const res = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken });
        const { accessToken } = res.data.data;
        const newRefreshToken = res.data.data.refreshToken || refreshToken;
        await storageService.saveTokens(accessToken, newRefreshToken);
        store.dispatch(updateAccessToken(accessToken));
        processQueue(null, accessToken);
        if (original.headers) setAuthHeader(original.headers, accessToken);
        return apiClient(original);
      } catch (err) {
        processQueue(err, null);
        store.dispatch(logout());
        await storageService.clearAll();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
