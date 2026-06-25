import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const isWeb = Platform.OS === 'web'

// Custom storage adapter for React Native using Expo SecureStore with Web/SSR LocalStorage fallback
const ExpoSecureStoreAdapter = {
    getItem: async (key: string) => {
        try {
            if (isWeb) {
                if (typeof window !== 'undefined' && window.localStorage) {
                    return window.localStorage.getItem(key)
                }
                return null
            }
            return await SecureStore.getItemAsync(key)
        } catch (err) {
            console.error('Error reading secure token:', err)
            return null
        }
    },
    setItem: async (key: string, value: string) => {
        try {
            if (isWeb) {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem(key, value)
                }
                return
            }
            await SecureStore.setItemAsync(key, value)
        } catch (err) {
            console.error('Error writing secure token:', err)
        }
    },
    removeItem: async (key: string) => {
        try {
            if (isWeb) {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.removeItem(key)
                }
                return
            }
            await SecureStore.deleteItemAsync(key)
        } catch (err) {
            console.error('Error deleting secure token:', err)
        }
    }
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cxvyxbopdzfpkxsybpjr.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dnl4Ym9wZHpmcGt4c3licGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NTA1ODgsImV4cCI6MjA4NzMyNjU4OH0.kX4GuboXCeNa9LLDRxKdhpNLxIy7AQ_euWHop-OuprU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
    }
})
