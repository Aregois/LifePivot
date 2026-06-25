import { createClient } from '@/utils/supabase/server'
import { verifyUserSession } from '@/utils/auth'
import { NextResponse } from 'next/server'

// POST /api/profile/role - Update profile role & LinkedIn verification link
export async function POST(request: Request) {
    try {
        const user = await verifyUserSession(request)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { role, linkedinUrl } = body

        if (!role || (role !== 'student' && role !== 'tutor')) {
            return NextResponse.json({ error: 'Invalid role. Must be student or tutor' }, { status: 400 })
        }

        const supabase = await createClient()

        const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .update({
                role,
                linkedin_url: linkedinUrl || null
            })
            .eq('id', user.id)
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, profile: updatedProfile })
    } catch (err: any) {
        console.error('Error in POST /api/profile/role:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
