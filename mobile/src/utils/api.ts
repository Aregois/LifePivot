import { Platform } from 'react-native'
import { supabase } from './supabase'

// Resolve API URL dynamically based on Platform and Environment
const getApiUrl = () => {
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')
    }
    if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.location?.origin) {
            return window.location.origin
        }
        return 'http://localhost:3000'
    }
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
        // Local computer IP for physical test devices during development
        return 'http://192.168.11.57:3000'
    }
    // Production cloud fallback
    return 'https://lifepivot.app'
}

export const API_BASE_URL = getApiUrl()

/**
 * Perform an authenticated HTTP API request to the Next.js backend.
 * Automatically injects the Supabase user JWT bearer token into the headers.
 */
export async function apiRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token

        const headers = new Headers(options.headers)
        if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
            headers.set('Content-Type', 'application/json')
        }
        if (token) {
            headers.set('Authorization', `Bearer ${token}`)
        }

        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
            throw new Error(data.error || `Request failed with status ${response.status}`)
        }

        return data
    } catch (err: any) {
        console.error(`API Request Error [${path}]:`, err.message)
        throw err
    }
}
