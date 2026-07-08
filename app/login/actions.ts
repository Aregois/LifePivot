'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        const message =
            error.message.toLowerCase().includes('rate') ||
            error.message.toLowerCase().includes('too many')
                ? 'Too many attempts. Please wait a moment.'
                : 'Invalid email or password. Please try again.'
        redirect(`/login?message=${encodeURIComponent(message)}`)
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('full_name') as string

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName },
            // No emailRedirectTo — we send them directly to onboarding
            // Supabase will send a confirmation email silently in the background
        },
    })

    if (error) {
        redirect(`/register?message=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/', 'layout')
    redirect('/onboarding')
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

export async function forgotPassword(email: string) {
    const supabase = await createClient()
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/profile`,
    })
    // Always succeed silently — don't leak whether the email exists
}
