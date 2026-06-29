import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()
    
    // Fallback to Authorization header if present (for mobile requests)
    let globalHeaders: Record<string, string> = {}
    try {
        const headerStore = await headers()
        const authHeader = headerStore.get('Authorization')
        if (authHeader && authHeader.startsWith('Bearer ')) {
            globalHeaders['Authorization'] = authHeader
        }
    } catch (_) {
        // Safe to ignore if called in a context where headers() is unavailable
    }

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
            global: {
                headers: globalHeaders,
            },
        }
    )
}
