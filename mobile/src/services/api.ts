import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';

const getDynamicApiUrl = (): string => {
  let envUrl = process.env.EXPO_PUBLIC_API_URL;

  // On Android devices/emulators, "localhost" points to the device itself.
  // We rewrite localhost on Android to 10.0.2.2 or Metro host IP for reliable API connectivity.
  if (envUrl && Platform.OS === 'android' && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
    envUrl = undefined;
  }

  if (envUrl) {
    return envUrl;
  }

  // 1. Android Emulator (Virtual Device)
  if (Platform.OS === 'android' && !Device.isDevice) {
    return 'http://10.0.2.2:5000/api/v1';
  }

  // 2. Physical Mobile Device via Metro host IP
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).experienceUrl ?? (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:5000/api/v1`;
    }
  }

  // 3. Local Wi-Fi Network IP fallback
  if (Platform.OS === 'android') {
    return 'http://10.105.200.148:5000/api/v1';
  }

  return 'http://localhost:5000/api/v1';
};

export const API_BASE_URL = getDynamicApiUrl();

// In-memory fallback map for Expo Go & Web
const memoryStorage = new Map<string, string>();

let mmkvInstance: any = null;
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const isWeb = Platform.OS === 'web';

// Only instantiate MMKV if in a custom Development Build (not in Expo Go or Web)
if (!isWeb && !isExpoGo) {
  try {
    const { MMKV } = require('react-native-mmkv');
    mmkvInstance = new MMKV({ id: 'vireon-auth' });
  } catch {
    console.warn('⚠️ MMKV native module unavailable, using secure in-memory storage fallback');
  }
}

export const getAccessToken = (): string | undefined => {
  if (mmkvInstance) return mmkvInstance.getString('accessToken');
  return memoryStorage.get('accessToken');
};

export const getRefreshToken = (): string | undefined => {
  if (mmkvInstance) return mmkvInstance.getString('refreshToken');
  return memoryStorage.get('refreshToken');
};

export const setAccessToken = (token: string): void => {
  if (mmkvInstance) mmkvInstance.set('accessToken', token);
  else memoryStorage.set('accessToken', token);
};

export const setRefreshToken = (token: string): void => {
  if (mmkvInstance) mmkvInstance.set('refreshToken', token);
  else memoryStorage.set('refreshToken', token);
};

export const setUserProfileStorage = (user: any): void => {
  try {
    const jsonStr = JSON.stringify(user);
    if (mmkvInstance) mmkvInstance.set('userProfile', jsonStr);
    else memoryStorage.set('userProfile', jsonStr);
  } catch {
    // Ignore JSON serialize errors
  }
};

export const getUserProfileStorage = (): any | null => {
  try {
    const str = mmkvInstance ? mmkvInstance.getString('userProfile') : memoryStorage.get('userProfile');
    if (!str) return null;
    return JSON.parse(str);
  } catch {
    return null;
  }
};

export const clearTokens = (): void => {
  if (mmkvInstance) {
    mmkvInstance.delete('accessToken');
    mmkvInstance.delete('refreshToken');
    mmkvInstance.delete('userProfile');
  } else {
    memoryStorage.delete('accessToken');
    memoryStorage.delete('refreshToken');
    memoryStorage.delete('userProfile');
  }
};

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

    // Handle 401 Unauthorized Token Refresh
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
        processQueue(error, null);
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
      } catch (refreshErr) {
        clearTokens();
        processQueue(refreshErr, null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Automatic Network Error Multi-IP Retry Strategy
    if ((!error.response || error.code === 'ERR_NETWORK') && original && !(original as any)._ipRetry) {
      (original as any)._ipRetry = true;
      const currentUrl = original.baseURL ?? API_BASE_URL;

      let fallbackUrl = 'http://10.0.2.2:5000/api/v1';
      if (currentUrl.includes('10.0.2.2')) {
        fallbackUrl = 'http://10.105.200.148:5000/api/v1';
      } else if (currentUrl.includes('10.105.200.148')) {
        fallbackUrl = 'http://10.0.2.2:5000/api/v1';
      }

      original.baseURL = fallbackUrl;
      try {
        return await axios(original);
      } catch {
        // Return original error if fallback also fails
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
