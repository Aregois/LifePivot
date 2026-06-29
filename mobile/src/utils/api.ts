import { Platform } from 'react-native'
import { supabase } from './supabase'

// Resolve API URL dynamically based on Platform for local development
const getApiUrl = () => {
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL
    }
    if (Platform.OS === 'web') {
        return 'http://localhost:3000'
    }
    // Default to the host computer's local IP so physical devices on the same Wi-Fi can connect
    return 'http://192.168.11.57:3000'
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
