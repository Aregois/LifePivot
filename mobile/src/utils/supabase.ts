import { createClient } from '@supabase/supabase-js'
import { storage } from './storage'

// Custom storage adapter for React Native using universal storage with Web/SSR LocalStorage fallback
const ExpoSecureStoreAdapter = {
    getItem: (key: string) => storage.getItem(key),
    setItem: (key: string, value: string) => storage.setItem(key, value),
    removeItem: (key: string) => storage.deleteItem(key)
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
