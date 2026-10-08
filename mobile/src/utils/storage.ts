/**
 * LifePivot · Platform-Safe Storage Utility (Mobile & Web)
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a universal key-value storage layer that safely uses:
 *   - Expo SecureStore on Native iOS & Android
 *   - window.localStorage with memory fallback on Web (Expo Web / SSR / dev)
 *
 * Prevents "ExpoSecureStore.default.getValueWithKeyAsync is not a function"
 * crashes when running on Web or in environments without native SecureStore.
 */

import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const isWeb = Platform.OS === 'web'

// In-memory fallback if both SecureStore and localStorage are unavailable
const memoryStore: Record<string, string> = {}

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (isWeb) {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key)
        }
        return memoryStore[key] ?? null
      }
      return await SecureStore.getItemAsync(key)
    } catch (err) {
      // Fallback to localStorage/memory if SecureStore throws native missing error
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          return window.localStorage.getItem(key)
        } catch {
          /* ignore */
        }
      }
      return memoryStore[key] ?? null
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (isWeb) {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value)
          return
        }
        memoryStore[key] = value
        return
      }
      await SecureStore.setItemAsync(key, value)
    } catch (err) {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(key, value)
          return
        } catch {
          /* ignore */
        }
      }
      memoryStore[key] = value
    }
  },

  deleteItem: async (key: string): Promise<void> => {
    try {
      if (isWeb) {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key)
          return
        }
        delete memoryStore[key]
        return
      }
      await SecureStore.deleteItemAsync(key)
    } catch (err) {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem(key)
          return
        } catch {
          /* ignore */
        }
      }
      delete memoryStore[key]
    }
  },

  // Drop-in aliases for SecureStore methods
  getItemAsync: async (key: string): Promise<string | null> => {
    return storage.getItem(key)
  },

  setItemAsync: async (key: string, value: string): Promise<void> => {
    return storage.setItem(key, value)
  },

  deleteItemAsync: async (key: string): Promise<void> => {
    return storage.deleteItem(key)
  },
}

export default storage
