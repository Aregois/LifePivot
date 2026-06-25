import { createClient } from '@/utils/supabase/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Verifies the user session by checking either the Authorization Bearer token (for mobile)
 * or cookies (for standard Next.js web client).
 * @param request The incoming HTTP Request
 * @returns The user object if verified, otherwise null
 */
export async function verifyUserSession(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization')
        
        // If there's no Bearer token, fallback to standard web session (cookies)
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const supabase = await createClient()
            const { data: { user }, error } = await supabase.auth.getUser()
            if (error || !user) return null
            return user
        }

        const token = authHeader.split(' ')[1]
        if (!token) return null

        // Initialize Supabase Client with the client's Bearer JWT for mobile
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return []
                    },
                    setAll() {}
                },
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            }
        )

        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
            console.error('Bearer JWT Verification failed:', error?.message)
            return null
        }

        return user
    } catch (err) {
        console.error('Error verifying user session:', err)
        return null
    }
}
