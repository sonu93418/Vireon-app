import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';

export const getCandidateApiUrls = (): string[] => {
  const candidates: string[] = [];
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (envUrl && !(Platform.OS === 'android' && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')))) {
    candidates.push(envUrl);
  }

  // 1. Dynamic Metro host IP
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).experienceUrl ?? (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      candidates.push(`http://${hostIp}:5000/api/v1`);
    }
  }

  // 2. Android Emulator virtual host IP & Wi-Fi local subnet IP
  if (Platform.OS === 'android') {
    candidates.push('http://10.0.2.2:5000/api/v1');
    candidates.push('http://10.78.118.148:5000/api/v1');
    candidates.push('http://10.64.3.148:5000/api/v1');
  }

  // 3. Localhost fallbacks
  candidates.push('http://localhost:5000/api/v1');
  candidates.push('http://127.0.0.1:5000/api/v1');

  // De-duplicate candidates while preserving order
  return Array.from(new Set(candidates));
};

export let API_BASE_URL = getCandidateApiUrls()[0] || 'http://localhost:5000/api/v1';

export const updateActiveApiBaseUrl = (newUrl: string): void => {
  API_BASE_URL = newUrl;
  if (apiClient) {
    apiClient.defaults.baseURL = newUrl;
  }
};

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
  try {
    if (mmkvInstance) {
      mmkvInstance.delete('accessToken');
      mmkvInstance.delete('refreshToken');
      mmkvInstance.delete('userProfile');
    }
  } catch {}
  memoryStorage.delete('accessToken');
  memoryStorage.delete('refreshToken');
  memoryStorage.delete('userProfile');
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
  headers: {
    Accept: 'application/json',
  },
});

// ─── Local fallback IDs that should never hit the server ─────────────────────
export const LOCAL_FALLBACK_PREFIXES = ['cls-', 'b-', 'dflt-'];
export const isLocalFallbackId = (id: string): boolean =>
  LOCAL_FALLBACK_PREFIXES.some((prefix) => id.startsWith(prefix));

// ─── Request Interceptor ───────────────────────────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  // Handle FormData in React Native — remove default Content-Type header so boundary is auto-generated
  if (config.data && typeof config.data === 'object' && (config.data._parts || config.data instanceof FormData)) {
    delete config.headers['Content-Type'];
  } else if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }

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
    const reqUrl = original?.url ?? '';
    const isAuthRoute = reqUrl.includes('/auth/login') || reqUrl.includes('/auth/register') || reqUrl.includes('/auth/verify-otp');

    if (error.response?.status === 401 && !original?._retry && !isAuthRoute) {
      // If no refresh token at all — clear state and silently reject
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject })).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        }).catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post<{ data: { accessToken: string; refreshToken: string } }>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { timeout: 8000 }
        );
        const { accessToken, refreshToken: newRefreshToken } = res.data.data;
        setAccessToken(accessToken);
        setRefreshToken(newRefreshToken);
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch (refreshErr) {
        // Refresh failed — clear all auth state so we don't spam anymore
        clearTokens();
        processQueue(refreshErr, null);
        // Remove Authorization from this failed request so it won't resend
        delete original.headers.Authorization;
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // ─── Network Error Multi-IP Fast Retry ───────────────────────────────────
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';
    if (isNetworkError && original && !(original as any)._ipRetry) {
      (original as any)._ipRetry = true;
      const currentBase = original.baseURL || API_BASE_URL;
      const candidates = getCandidateApiUrls();
      const retryCandidates = candidates.filter((c) => c !== currentBase);

      for (const targetUrl of retryCandidates) {
        try {
          const testRes = await axios({
            ...original,
            baseURL: targetUrl,
            timeout: 6000,
          });
          if (API_BASE_URL !== targetUrl) {
            updateActiveApiBaseUrl(targetUrl);
            console.log(`[API][NETWORK_FAILOVER] Successfully connected backend at: ${targetUrl}`);
          }
          return testRes;
        } catch {
          // Candidate unreachable — try next candidate
        }
      }
    }

    if (isNetworkError && (!error.message || error.message.includes('Network Error'))) {
      error.message = 'Unable to connect to Vireon backend server. Please verify the backend is running on port 5000 and your device is connected.';
    }

    return Promise.reject(error);
  }
);

export default apiClient;
