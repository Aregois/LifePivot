-- ============================================================
-- LifePivot Stage 3: Context Ingestion & Monetization Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Document Metadata Table
-- Stores uploaded files linked to learning goals or workspaces
CREATE TABLE IF NOT EXISTS public.document_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.learning_goals(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  text_content TEXT,     -- extracted plain text for AI Tutor grounding
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.document_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON public.document_metadata FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Workspace members can view workspace documents"
  ON public.document_metadata FOR SELECT
  USING (
    workspace_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = document_metadata.workspace_id
          AND user_id = auth.uid()
      ) OR EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE id = document_metadata.workspace_id
          AND creator_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert own documents"
  ON public.document_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON public.document_metadata FOR DELETE
  USING (auth.uid() = user_id);

-- Full-text search index on extracted document content
CREATE INDEX IF NOT EXISTS idx_doc_meta_plan
  ON public.document_metadata(plan_id);

CREATE INDEX IF NOT EXISTS idx_doc_meta_workspace
  ON public.document_metadata(workspace_id);

CREATE INDEX IF NOT EXISTS idx_doc_meta_fts
  ON public.document_metadata
  USING gin(to_tsvector('english', COALESCE(text_content, '')));


-- 2. Ad Reward Cooldown Column on Profiles
-- Tracks when a user last earned tokens from an ad to enforce 60-min cooldown
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_ad_reward_at TIMESTAMPTZ;


-- 3. Supabase Storage Bucket (run separately in Storage panel OR via this helper note)
-- Go to Supabase Dashboard → Storage → Create bucket:
--   Name:          lifepivot-documents
--   Public access: OFF (private)
--   File size limit: 10485760  (10 MB)
--   Allowed MIME types: application/pdf, application/msword,
--     application/vnd.openxmlformats-officedocument.wordprocessingml.document,
--     application/vnd.ms-powerpoint,
--     application/vnd.openxmlformats-officedocument.presentationml.presentation,
--     text/plain
--
-- Then add an RLS policy on the storage.objects table:
-- CREATE POLICY "Auth users can upload their own documents"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'lifepivot-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can read their own documents"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'lifepivot-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can delete their own documents"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'lifepivot-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
