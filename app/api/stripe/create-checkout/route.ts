import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
    apiVersion: '2026-06-24.dahlia',
})

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { priceId, mode } = body as {
            priceId: string
            mode: 'subscription' | 'payment'
        }

        if (!priceId || !mode) {
            return NextResponse.json({ error: 'Missing priceId or mode' }, { status: 400 })
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        // Fetch or create a Stripe customer tied to this user
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single()

        let customerId = profile?.stripe_customer_id

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { supabase_user_id: user.id },
            })
            customerId = customer.id

            await supabase
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id)
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/profile`,
            metadata: {
                supabase_user_id: user.id,
                price_id: priceId,
            },
            subscription_data: mode === 'subscription' ? {
                metadata: { supabase_user_id: user.id },
            } : undefined,
        })

        return NextResponse.json({ url: session.url })
    } catch (err: any) {
        console.error('[create-checkout] Error:', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
