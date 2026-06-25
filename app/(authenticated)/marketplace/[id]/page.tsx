import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { MarketplaceClient } from '@/components/marketplace-client'

export default async function MarketplaceDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id: planId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Verify public plan exists
    const { data: plan } = await supabase
        .from('learning_goals')
        .select('id')
        .eq('id', planId)
        .eq('is_public', true)
        .single()

    if (!plan) {
        redirect('/marketplace')
    }

    // Fetch initial profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Standalone detail page redirects to /marketplace for uniform drawer layout,
    // which gives a better user browsing flow.
    redirect('/marketplace')
}
