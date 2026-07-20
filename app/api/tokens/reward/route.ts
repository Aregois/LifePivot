import { createClient } from '@/utils/supabase/server'
import { verifyUserSession } from '@/utils/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // 1. Verify user session (supports browser cookies and mobile JWT header)
    const user = await verifyUserSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse body parameters
    const body = await request.json()
    const { sessionToken } = body

    if (!sessionToken) {
      return NextResponse.json({ error: 'Missing required field: sessionToken' }, { status: 400 })
    }

    const supabase = await createClient()

    // 3. Retrieve and validate the ad session
    const { data: adSession, error: sessionError } = await supabase
      .from('ad_sessions')
      .select('*')
      .eq('id', sessionToken)
      .single()

    if (sessionError || !adSession) {
      return NextResponse.json({ error: 'Invalid ad session token' }, { status: 400 })
    }

    if (adSession.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: Session token mismatch' }, { status: 403 })
    }

    if (adSession.redeemed) {
      return NextResponse.json({ error: 'Session token already redeemed' }, { status: 400 })
    }

    const expiresAt = new Date(adSession.expires_at).getTime()
    if (expiresAt < Date.now()) {
      return NextResponse.json({ error: 'Session token expired' }, { status: 400 })
    }

    // 4. Mark the token as redeemed
    const { error: updateSessionError } = await supabase
      .from('ad_sessions')
      .update({ redeemed: true })
      .eq('id', sessionToken)

    if (updateSessionError) {
      return NextResponse.json({ error: updateSessionError.message }, { status: 500 })
    }

    // 5. Hardcode the reward amount to 5 tokens (no longer client-controlled)
    const rewardAmount = 5

    // 6. Update user's tokens balance securely bypassing standard user RLS via SECURITY DEFINER RPC
    const { data, error } = await supabase.rpc('reward_user_tokens_transaction', {
      p_user_id: user.id,
      p_amount: rewardAmount,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (data && data.success === false) {
      return NextResponse.json({ error: data.error }, { status: 400 })
    }

    // 7. Record the reward timestamp to enforce the cooldown on subsequent requests
    await supabase
      .from('profiles')
      .update({ last_ad_reward_at: new Date().toISOString() })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      userId: user.id,
      rewardedAmount: rewardAmount,
      newTokensBalance: data.new_balance,
    })
  } catch (err: any) {
    console.error('Error rewarding tokens:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
