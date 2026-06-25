import { verifyUserSession } from '@/utils/auth'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify user session
    const user = await verifyUserSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Extract document id from route params
    const { id } = await params

    const supabase = await createClient()

    // 3. Fetch the document row — ensures ownership before deletion
    const { data: row, error: fetchError } = await supabase
      .from('document_metadata')
      .select('id, storage_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !row) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // 4. Delete file from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('lifepivot-documents')
      .remove([row.storage_path])

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 })
    }

    // 5. Delete the metadata row
    const { error: deleteError } = await supabase
      .from('document_metadata')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error deleting document:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
