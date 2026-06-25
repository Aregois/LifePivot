import { verifyUserSession } from '@/utils/auth'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { extractTextContent } from '@/lib/document-extraction'

export const runtime = 'nodejs'


const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/jpeg',
  'image/png',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES_PER_PLAN = 5

export async function POST(request: Request) {
  try {
    // 1. Verify user session
    const user = await verifyUserSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse multipart/form-data
    const rawFormData = await request.formData()
    const formData = rawFormData as unknown as globalThis.FormData
    const file = formData.get('file') as File | null
    const planId = (formData.get('planId') as string | null) ?? undefined
    const workspaceId = (formData.get('workspaceId') as string | null) ?? undefined

    // 3. Validate file presence
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 4. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    // 5. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type '${file.type}' is not allowed` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 6. Count existing documents for this plan/workspace to enforce the per-plan limit
    let countQuery = supabase
      .from('document_metadata')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (planId) {
      countQuery = countQuery.eq('plan_id', planId)
    } else if (workspaceId) {
      countQuery = countQuery.eq('workspace_id', workspaceId)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    if ((count ?? 0) >= MAX_FILES_PER_PLAN) {
      return NextResponse.json(
        { error: 'Document limit reached (5 max)' },
        { status: 400 }
      )
    }

    // 7. Generate a unique storage path
    const storagePath = `${user.id}/${crypto.randomUUID()}/${file.name}`

    // 8. Convert File to ArrayBuffer and upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: storageError } = await supabase.storage
      .from('lifepivot-documents')
      .upload(storagePath, buffer, { contentType: file.type })

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 })
    }

    // 9. Extract text content from document buffer (non-fatal)
    let extractedText: string | null = null
    try {
      extractedText = await extractTextContent(buffer, file.type, file.name)
    } catch (err) {
      console.error('Text extraction failed:', err)
    }

    // 10. Insert metadata record
    const { data: inserted, error: insertError } = await supabase
      .from('document_metadata')
      .insert({
        user_id: user.id,
        plan_id: planId || null,
        workspace_id: workspaceId || null,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        text_content: extractedText,
      })
      .select('id')
      .single()

    if (insertError) {
      // Attempt to clean up the uploaded file if metadata insert fails
      await supabase.storage.from('lifepivot-documents').remove([storagePath])
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        id: inserted.id,
        storagePath,
        fileName: file.name,
        fileSize: file.size,
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Error uploading document:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
