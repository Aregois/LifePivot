import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? null
    const origin = requestUrl.origin

    if (code) {
        const response = NextResponse.redirect(`${origin}/`)

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
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('onboarding_completed')
                    .eq('id', user.id)
                    .single()

                // New user (no profile row yet) or onboarding not completed → onboarding
                const needsOnboarding =
                    !profile || profile.onboarding_completed === null || profile.onboarding_completed === false

                const destination = needsOnboarding ? '/onboarding' : '/'
                return NextResponse.redirect(`${origin}${destination}`, {
                    headers: response.headers,
                })
            }
        }
    }

    // Auth code exchange failed — redirect to login with error message
    return NextResponse.redirect(
        `${origin}/login?message=${encodeURIComponent('Could not complete sign in. Please try again.')}`
    )
}
