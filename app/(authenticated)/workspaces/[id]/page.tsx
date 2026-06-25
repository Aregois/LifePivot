import { createClient } from '@/utils/supabase/server'
import { WorkspaceDetailClient } from '@/components/workspace-detail-client'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export default async function WorkspaceDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id: workspaceId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Verify workspace exists
    const { data: workspace } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single()

    if (!workspace) {
        redirect('/workspaces')
    }

    // Fetch initial profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-[#00FFFF] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,255,255,0.2)]" />
            </div>
        }>
            <WorkspaceDetailClient user={user} workspace={workspace} initialProfile={profile} />
        </Suspense>
    )
}
