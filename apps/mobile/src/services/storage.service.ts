import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

// In-memory fallback cache so that any native module failure never crashes the application
const memCache = new Map<string, string>();
let isNativeStorageUsable: boolean | null = null;

const checkNativeAvailable = (): boolean => {
  if (isNativeStorageUsable !== null) {
    return isNativeStorageUsable;
  }
  if (Platform.OS === 'web') {
    isNativeStorageUsable = false;
    return false;
  }
  const hasModule = Boolean(
    NativeModules &&
    (NativeModules.RNCAsyncStorage ||
     NativeModules.PlatformLocalStorage ||
     NativeModules.RNC_AsyncSQLiteDBStorage ||
     NativeModules.AsyncStorage)
  );
  if (!hasModule) {
    isNativeStorageUsable = false;
    return false;
  }
  return true;
};

export const SafeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    // 1. Check in-memory fast cache first
    if (memCache.has(key)) {
      return memCache.get(key) || null;
    }

    // 2. Try Web / Polyfilled LocalStorage
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        const localVal = (globalThis as any).localStorage.getItem(key);
        if (localVal !== null && localVal !== undefined) {
          memCache.set(key, localVal);
          return localVal;
        }
      }
    } catch {
      // Ignore web storage errors
    }

    // 3. Try Native AsyncStorage if available
    if (checkNativeAvailable()) {
      try {
        if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
          const val = await AsyncStorage.getItem(key);
          if (val !== null && val !== undefined) {
            isNativeStorageUsable = true;
            memCache.set(key, val);
            return val;
          }
        }
      } catch {
        // Native module unavailable or failed; disable native calls to prevent warning popups
        isNativeStorageUsable = false;
      }
    }

    return memCache.get(key) || null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    memCache.set(key, value);

    // Persist to web localStorage if available
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(key, value);
      }
    } catch {
      // Ignore web storage errors
    }

    // Persist to Native AsyncStorage if available
    if (checkNativeAvailable()) {
      try {
        if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
          await AsyncStorage.setItem(key, value);
          isNativeStorageUsable = true;
        }
      } catch {
        isNativeStorageUsable = false;
      }
    }
  },

  removeItem: async (key: string): Promise<void> => {
    memCache.delete(key);

    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.removeItem(key);
      }
    } catch {
      // Ignore web storage errors
    }

    if (checkNativeAvailable()) {
      try {
        if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
          await AsyncStorage.removeItem(key);
        }
      } catch {
        isNativeStorageUsable = false;
      }
    }
  }
};

class StorageService {
  public async setItem(key: string, value: string): Promise<void> {
    await SafeStorage.setItem(key, value);
  }

  public async getItem(key: string): Promise<string | null> {
    return await SafeStorage.getItem(key);
  }

  public async removeItem(key: string): Promise<void> {
    await SafeStorage.removeItem(key);
  }

  public async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await this.setItem('letstrackit_access_token', accessToken);
    await this.setItem('letstrackit_refresh_token', refreshToken);
  }

  public async getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const accessToken = await this.getItem('letstrackit_access_token');
    const refreshToken = await this.getItem('letstrackit_refresh_token');
    return { accessToken, refreshToken };
  }

  public async setUser(user: any): Promise<void> {
    await this.setItem('letstrackit_user', JSON.stringify(user));
  }

  public async getUser(): Promise<any | null> {
    const raw = await this.getItem('letstrackit_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public async clearSession(): Promise<void> {
    await this.removeItem('letstrackit_access_token');
    await this.removeItem('letstrackit_refresh_token');
    await this.removeItem('letstrackit_user');
  }
}

export const storage = new StorageService();
