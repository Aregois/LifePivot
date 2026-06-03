import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { AuthenticatedLayoutClient } from '@/components/authenticated-layout-client'

export default async function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    // Protect all routes inside (authenticated)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    return (
        <AuthenticatedLayoutClient>
            {children}
        </AuthenticatedLayoutClient>
    )
}

