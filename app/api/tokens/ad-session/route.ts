import { verifyUserSession } from '@/utils/auth'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // 1. Verify user session (supports browser cookies and mobile JWT header)
    const user = await verifyUserSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // 2. Check cooldown — users can only request an ad session if not in cooldown
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('last_ad_reward_at')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (profile?.last_ad_reward_at) {
      const lastReward = new Date(profile.last_ad_reward_at).getTime()
      const now = Date.now()
      const sixtyMinutes = 60 * 60 * 1000
      const elapsed = now - lastReward
      if (elapsed < sixtyMinutes) {
        const cooldownRemaining = Math.ceil((sixtyMinutes - elapsed) / 1000)
        return NextResponse.json(
          { error: 'Cooldown active', cooldownRemaining },
          { status: 429 }
        )
      }
    }

    // 3. Create a short-lived ad session token (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const { data: session, error: sessionError } = await supabase
      .from('ad_sessions')
      .insert({
        user_id: user.id,
        expires_at: expiresAt,
        redeemed: false,
      })
      .select('id')
      .single()

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 })
    }

    return NextResponse.json({
      sessionToken: session.id,
      expiresAt,
    }, { status: 201 })
  } catch (err: any) {
    console.error('Error creating ad session:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
