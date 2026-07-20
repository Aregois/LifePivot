import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? null
    const origin = requestUrl.origin

    if (code) {
        // Build a mutable response that cookies can be written into
        let response = NextResponse.redirect(`${origin}/onboarding`)

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            request.cookies.set(name, value)
                            response.cookies.set(name, value, options)
                        })
                    },
                },
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // If an explicit ?next= was provided (e.g. password reset), honour it
            if (next) {
                return NextResponse.redirect(`${origin}${next}`, {
                    headers: response.headers,
                })
            }

            // Determine whether this user has completed onboarding
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (user) {
                // Retry up to 3 times with a small delay to handle the race condition
                // where the handle_new_user trigger hasn't inserted the profile row yet.
                let profile: { onboarding_completed: boolean | null } | null = null
                for (let attempt = 0; attempt < 3; attempt++) {
                    const { data } = await supabase
                        .from('profiles')
                        .select('onboarding_completed')
                        .eq('id', user.id)
                        .single()
                    profile = data
                    if (profile) break
                    // Wait 400ms before retrying
                    await new Promise(r => setTimeout(r, 400))
                }

                // New user (no profile row yet) or onboarding not completed → onboarding
                const needsOnboarding =
                    !profile || profile.onboarding_completed === null || profile.onboarding_completed === false

                const destination = needsOnboarding ? '/onboarding' : '/'
                response = NextResponse.redirect(`${origin}${destination}`, {
                    headers: response.headers,
                })
                return response
            }
        }
    }

    // Auth code exchange failed — redirect to login with error message
    return NextResponse.redirect(
        `${origin}/login?message=${encodeURIComponent('Could not complete sign in. Please try again.')}`
    )
}
