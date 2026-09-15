import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEYS = {
  ACCESS_TOKEN:  'hl_access_token',
  REFRESH_TOKEN: 'hl_refresh_token',
  USER:          'hl_user',
} as const;

const isWeb = Platform.OS === 'web';
const nativeFallback = new Map<string, string>();

function getWebItem(key: string) {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
}

function setWebItem(key: string, value: string) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

function removeWebItem(key: string) {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
}

async function setItem(key: string, value: string) {
  if (isWeb) {
    setWebItem(key, value);
    return;
  }
  if (typeof SecureStore.setItemAsync !== 'function') {
    nativeFallback.set(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Keep the session usable when the installed Expo Go has an older SecureStore native module.
    nativeFallback.set(key, value);
  }
}

async function getItem(key: string) {
  if (isWeb) return getWebItem(key);
  if (typeof SecureStore.getItemAsync !== 'function') return nativeFallback.get(key) || null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return nativeFallback.get(key) || null;
  }
}

async function removeItem(key: string) {
  if (isWeb) {
    removeWebItem(key);
    return;
  }
  if (typeof SecureStore.deleteItemAsync !== 'function') {
    nativeFallback.delete(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    nativeFallback.delete(key);
  }
}

export const storageService = {
  async saveTokens(accessToken: string, refreshToken: string) {
    await Promise.all([
      setItem(KEYS.ACCESS_TOKEN, accessToken),
      setItem(KEYS.REFRESH_TOKEN, refreshToken),
    ]);
  },
  async getAccessToken(): Promise<string | null> {
    return getItem(KEYS.ACCESS_TOKEN);
  },
  async getRefreshToken(): Promise<string | null> {
    return getItem(KEYS.REFRESH_TOKEN);
  },
  async saveUser(user: object) {
    await setItem(KEYS.USER, JSON.stringify(user));
  },
  async getUser(): Promise<object | null> {
    const raw = await getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },
  async clearAll() {
    await Promise.all(Object.values(KEYS).map(removeItem));
  },
};
