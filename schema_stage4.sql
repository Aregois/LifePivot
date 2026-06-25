-- ============================================================
-- LifePivot Stage 4: Automated Extraction & Secured Ad Bridging Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ad_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: no direct client access since it is service_role/API-only
ALTER TABLE public.ad_sessions ENABLE ROW LEVEL SECURITY;
