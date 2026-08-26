-- ============================================================
-- LifePivot Cleanup Script for Supabase
-- Removes archived / unused tables and obsolete columns.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Drop archived tables if they exist
DROP TABLE IF EXISTS public.blitz_scores CASCADE;
DROP TABLE IF EXISTS public.blitz_match CASCADE;
DROP TABLE IF EXISTS public.checkpoint_battles CASCADE;
DROP TABLE IF EXISTS public.circadian_chests CASCADE;
DROP TABLE IF EXISTS public.streak_wagers CASCADE;
DROP TABLE IF EXISTS public.wagers CASCADE;
DROP TABLE IF EXISTS public.synth_soundscapes CASCADE;
DROP TABLE IF EXISTS public.soundscapes CASCADE;
DROP TABLE IF EXISTS public.flashcards CASCADE;
DROP TABLE IF EXISTS public.decks CASCADE;

-- 2. Drop obsolete columns from profiles table if present
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS dusk_keys,
  DROP COLUMN IF EXISTS dawn_keys,
  DROP COLUMN IF EXISTS active_wager,
  DROP COLUMN IF EXISTS soundscape_preference;

-- 3. Re-index remaining core tables for peak performance
REINDEX TABLE public.profiles;
REINDEX TABLE public.learning_goals;
REINDEX TABLE public.tasks;
REINDEX TABLE public.workspaces;

SELECT 'LifePivot Supabase cleanup completed successfully!' AS result;
