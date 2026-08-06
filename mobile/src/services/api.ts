// ============================================================
// VIREON MOBILE — AXIOS API CLIENT + MMKV TOKEN STORAGE
// ============================================================
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { MMKV } from 'react-native-mmkv';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

// MMKV secure storage for tokens (faster than AsyncStorage)
export const storage = new MMKV({ id: 'vireon-auth' });

export const getAccessToken = (): string | undefined => storage.getString('accessToken');
export const getRefreshToken = (): string | undefined => storage.getString('refreshToken');
export const setAccessToken = (token: string): void => storage.set('accessToken', token);
export const setRefreshToken = (token: string): void => storage.set('refreshToken', token);
export const clearTokens = (): void => { storage.delete('accessToken'); storage.delete('refreshToken'); };

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// ─── Request Interceptor ───────────────────────────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response Interceptor with Token Refresh ──────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token as string)));
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject })).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        return Promise.reject(error);
      }
      try {
        const res = await axios.post<{ data: { accessToken: string; refreshToken: string } }>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken }
        );
        const { accessToken, refreshToken: newRefreshToken } = res.data.data;
        setAccessToken(accessToken);
        setRefreshToken(newRefreshToken);
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
