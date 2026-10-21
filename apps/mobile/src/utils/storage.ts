/**
 * Safe client storage abstraction for React Native / Web / Test environments
 */

let memoryStore: Record<string, string> = {};

let asyncStorageModule: any = null;
try {
  asyncStorageModule = require('@react-native-async-storage/async-storage').default;
} catch {
  // Graceful fallback to memoryStore if AsyncStorage not resolved in test/node
}

export const Storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (asyncStorageModule) {
        return await asyncStorageModule.getItem(key);
      }
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      return memoryStore[key] || null;
    } catch {
      return memoryStore[key] || null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (asyncStorageModule) {
        await asyncStorageModule.setItem(key, value);
        return;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
      memoryStore[key] = value;
    } catch {
      memoryStore[key] = value;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (asyncStorageModule) {
        await asyncStorageModule.removeItem(key);
        return;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return;
      }
      delete memoryStore[key];
    } catch {
      delete memoryStore[key];
    }
  }
};
