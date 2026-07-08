-- ============================================================
-- LifePivot: Onboarding Questionnaire Columns
-- Run this in the Supabase SQL Editor
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_goal        TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_level       TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_daily_time  TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_style       TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed   BOOLEAN DEFAULT FALSE;

-- Verify the columns were added:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'profiles'
--   AND column_name LIKE 'onboarding%';
