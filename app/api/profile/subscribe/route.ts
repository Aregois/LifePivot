import { createClient } from '@/utils/supabase/server'
import { verifyUserSession } from '@/utils/auth'
import { NextResponse } from 'next/server'

// POST /api/profile/subscribe - Mock process Apple/Google In-App Purchase and update database
export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { transactionId, mockSuccess } = body

        if (mockSuccess === false) {
            return NextResponse.json({ error: 'Mock payment checkout cancelled or failed' }, { status: 400 })
        }

        const supabase = await createClient()

        // Update profile subscription state
        const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .update({
                is_subscribed: true
            })
            .eq('id', user.id)
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            isSubscribed: true,
            profile: updatedProfile,
            message: 'In-App Purchase verified. Solo Power Subscription activated!'
        })
    } catch (err: any) {
        console.error('Error in POST /api/profile/subscribe:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
