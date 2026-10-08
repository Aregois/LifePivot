import { NextResponse } from 'next/server'
import { verifyUserSession } from '@/utils/auth'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import Stripe from 'stripe'

function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
        throw new Error('Supabase admin credentials missing from environment')
    }
    return createSupabaseAdmin(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}

/**
 * POST /api/profile/delete-account
 * Permanently deletes the requesting user's account and all associated data.
 * Complies with Apple App Store Review Guideline 5.1.1(v) (Account Deletion).
 */
export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabaseAdmin = getAdminClient()

        // 1. Check for active Stripe subscription and cancel it if present
        try {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('stripe_subscription_id, stripe_customer_id')
                .eq('id', user.id)
                .single()

            if (profile?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
                const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
                    apiVersion: '2026-06-24.dahlia',
                })
                await stripe.subscriptions.cancel(profile.stripe_subscription_id)
            }
        } catch (stripeErr: any) {
            console.warn('[delete-account] Stripe subscription cancellation warning:', stripeErr?.message)
        }

        // 2. Cascade delete database records associated with the user
        await Promise.allSettled([
            supabaseAdmin.from('tasks').delete().eq('user_id', user.id),
            supabaseAdmin.from('learning_goals').delete().eq('user_id', user.id),
            supabaseAdmin.from('cohort_members').delete().eq('user_id', user.id),
            supabaseAdmin.from('workspaces').delete().eq('owner_id', user.id),
            supabaseAdmin.from('profiles').delete().eq('id', user.id),
        ])

        // 3. Delete the authentication record permanently
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
        if (authDeleteError) {
            console.error('[delete-account] Failed to delete auth user:', authDeleteError.message)
            return NextResponse.json(
                { error: 'Failed to completely delete authentication record: ' + authDeleteError.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'User account and all associated data have been permanently erased.',
        })
    } catch (err: any) {
        console.error('[delete-account] Unexpected error:', err)
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
