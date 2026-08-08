// ============================================================
// VIREON MOBILE — MMKV PERSISTENT CACHE FOR INSTANT LOADING
// Enables zero-latency initial UI rendering on app open
// ============================================================
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

const memoryCache = new Map<string, { data: any; timestamp: number }>();

let mmkvInstance: any = null;
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const isWeb = Platform.OS === 'web';

if (!isWeb && !isExpoGo) {
  try {
    const { MMKV } = require('react-native-mmkv');
    mmkvInstance = new MMKV({ id: 'vireon-query-cache' });
  } catch {
    // Memory fallback
  }
}

export const setCacheData = <T>(key: string, data: T): void => {
  try {
    const payload = JSON.stringify({ data, timestamp: Date.now() });
    if (mmkvInstance) {
      mmkvInstance.set(key, payload);
    } else {
      memoryCache.set(key, { data, timestamp: Date.now() });
    }
  } catch {
    // Ignore serialization errors
  }
};

export const getCacheData = <T>(key: string, maxAgeMs = 24 * 60 * 60 * 1000): T | null => {
  try {
    let raw: string | undefined;
    if (mmkvInstance) {
      raw = mmkvInstance.getString(key);
    } else {
      const entry = memoryCache.get(key);
      if (entry && Date.now() - entry.timestamp <= maxAgeMs) {
        return entry.data as T;
      }
      return null;
    }

    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > maxAgeMs) {
      return null;
    }
    return parsed.data as T;
  } catch {
    return null;
  }
};
