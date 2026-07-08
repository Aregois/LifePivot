import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

// IMPORTANT: Stripe signature verification requires the raw, unparsed request body.
// Disabling Next.js body parsing here is mandatory — do NOT remove this export.
export const config = {
    api: { bodyParser: false },
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-06-24.dahlia',
})

// Service-role client — bypasses RLS, safe only on the server
function adminSupabase() {
    return createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// Token amounts granted per price ID
const TOKEN_PACK_AMOUNTS: Record<string, number> = {
    [process.env.STRIPE_TOKENS_100_PRICE_ID!]: 100,
    [process.env.STRIPE_TOKENS_500_PRICE_ID!]: 500,
    [process.env.STRIPE_TOKENS_1500_PRICE_ID!]: 1500,
}

export async function POST(request: NextRequest) {
    const rawBody = await request.text()
    const sig = request.headers.get('stripe-signature')

    if (!sig) {
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err: any) {
        console.error('[webhook] Signature verification failed:', err.message)
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    const supabase = adminSupabase()

    // ── Idempotency guard ─────────────────────────────────────────────────────
    // Key on event.id — present on ALL Stripe event types (unlike session_id
    // which only exists on checkout.session.* events). This protects against
    // double-processing on retries for cancellation events too.
    const { error: insertError } = await supabase
        .from('processed_stripe_events')
        .insert({ event_id: event.id })

    if (insertError) {
        // Duplicate key → already processed. Return 200 to stop Stripe retrying.
        if (insertError.code === '23505') {
            console.log(`[webhook] Duplicate event ${event.id} — skipping`)
            return NextResponse.json({ received: true })
        }
        console.error('[webhook] Idempotency insert error:', insertError)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    // ── Resolve user ─────────────────────────────────────────────────────────
    async function resolveUser(stripeCustomerId: string | null): Promise<string | null> {
        if (!stripeCustomerId) return null
        const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', stripeCustomerId)
            .single()
        return data?.id ?? null
    }

    // ── Event handlers ────────────────────────────────────────────────────────
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                const userId = session.metadata?.supabase_user_id
                    ?? await resolveUser(session.customer as string | null)

                if (!userId) {
                    console.warn(`[webhook] checkout.session.completed: user not found for customer ${session.customer}`)
                    return NextResponse.json({ received: true })
                }

                if (session.mode === 'subscription') {
                    // Activate Pro subscription
                    await supabase.from('profiles').update({
                        is_subscribed: true,
                        subscription_status: 'active',
                        stripe_customer_id: session.customer,
                    }).eq('id', userId)

                } else if (session.mode === 'payment') {
                    // Credit token pack
                    const priceId = session.metadata?.price_id
                        ?? (session.line_items as any)?.[0]?.price?.id
                    const tokenAmount = priceId ? TOKEN_PACK_AMOUNTS[priceId] : null

                    if (tokenAmount) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('tokens_balance')
                            .eq('id', userId)
                            .single()

                        await supabase.from('profiles').update({
                            tokens_balance: (profile?.tokens_balance ?? 0) + tokenAmount,
                        }).eq('id', userId)
                    } else {
                        console.warn(`[webhook] Unknown price_id for payment session: ${priceId}`)
                    }
                }
                break
            }

            case 'customer.subscription.deleted': {
                const sub = event.data.object as Stripe.Subscription
                const userId = sub.metadata?.supabase_user_id
                    ?? await resolveUser(sub.customer as string | null)

                if (!userId) {
                    console.warn(`[webhook] subscription.deleted: user not found for customer ${sub.customer}`)
                    return NextResponse.json({ received: true })
                }

                await supabase.from('profiles').update({
                    is_subscribed: false,
                    subscription_status: 'canceled',
                }).eq('id', userId)

                console.log(`[webhook] Subscription canceled for user ${userId}`)
                break
            }

            case 'customer.subscription.updated': {
                const sub = event.data.object as Stripe.Subscription
                const userId = sub.metadata?.supabase_user_id
                    ?? await resolveUser(sub.customer as string | null)

                if (!userId) {
                    console.warn(`[webhook] subscription.updated: user not found for customer ${sub.customer}`)
                    return NextResponse.json({ received: true })
                }

                const status = sub.status // 'active' | 'past_due' | 'canceled' | 'unpaid' etc.
                const isActive = status === 'active'
                await supabase.from('profiles').update({
                    is_subscribed: isActive,
                    subscription_status: ['active', 'past_due', 'canceled', 'inactive'].includes(status)
                        ? status
                        : 'inactive',
                }).eq('id', userId)

                console.log(`[webhook] Subscription updated to ${status} for user ${userId}`)
                break
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice
                const userId = await resolveUser(invoice.customer as string | null)

                if (!userId) {
                    console.warn(`[webhook] invoice.payment_failed: user not found for customer ${invoice.customer}`)
                    return NextResponse.json({ received: true })
                }

                await supabase.from('profiles').update({
                    subscription_status: 'past_due',
                }).eq('id', userId)

                console.log(`[webhook] Invoice payment failed for user ${userId}`)
                break
            }

            default:
                // Unhandled event — acknowledge and move on
                console.log(`[webhook] Unhandled event type: ${event.type}`)
        }
    } catch (err: any) {
        console.error(`[webhook] Handler error for ${event.type}:`, err)
        // Return 200 regardless — we've already logged the idempotency record
        // so Stripe won't retry. Better to log and move on than get into retry loops.
    }

    return NextResponse.json({ received: true })
}
