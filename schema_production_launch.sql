-- ============================================================================
-- LifePivot — Production Launch Consolidated Schema & Security Migration
-- ============================================================================
-- Run this idempotent script in your Supabase SQL Editor before launching.
-- It safely adds all missing columns, locks down SECURITY DEFINER RPCs,
-- protects sensitive profile columns from client-side tampering, and configures
-- storage bucket RLS policies.
-- ============================================================================

-- 1. Add missing columns to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS theme_accent TEXT DEFAULT 'cyan',
  ADD COLUMN IF NOT EXISTS persona_preference TEXT DEFAULT 'feynman',
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS claimed_achievements JSONB DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS unlocked_cosmetics JSONB DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS ai_requests_today INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS ai_requests_date DATE DEFAULT CURRENT_DATE NOT NULL,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_goal TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_level TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_daily_mins INTEGER,
  ADD COLUMN IF NOT EXISTS onboarding_style TEXT,
  ADD COLUMN IF NOT EXISTS last_ad_reward_at TIMESTAMPTZ;

-- 2. Protect billing & privilege columns from direct client-side manipulation
-- Only service_role or Postgres superuser/SECURITY DEFINER functions can alter
-- subscription flags and Stripe customer IDs.
CREATE OR REPLACE FUNCTION public.protect_profile_billing_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', '');

  -- If request comes from a standard 'authenticated' or 'anon' JWT directly
  -- (not service_role and not inside a trusted SECURITY DEFINER function):
  IF v_role IN ('authenticated', 'anon') AND current_user = 'authenticated' THEN
    NEW.is_subscribed := OLD.is_subscribed;
    NEW.subscription_status := OLD.subscription_status;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
  END IF;

  -- Prevent negative balances or invalid values in all cases
  IF NEW.tokens_balance < 0 THEN
    NEW.tokens_balance := 0;
  END IF;
  IF NEW.xp < 0 THEN
    NEW.xp := 0;
  END IF;
  IF NEW.level < 1 THEN
    NEW.level := 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_profile_billing ON public.profiles;
CREATE TRIGGER trg_protect_profile_billing
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_billing_columns();

-- 3. Secure SECURITY DEFINER Stored Procedures
CREATE OR REPLACE FUNCTION public.join_workspace_transaction(
  p_workspace_id uuid,
  p_user_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_is_premium boolean;
  v_token_cost integer;
  v_creator_id uuid;
  v_user_tokens integer;
  v_already_member boolean;
BEGIN
  -- Verify caller identity when invoked by an authenticated user
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized user mismatch');
  END IF;

  SELECT exists(
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  ) INTO v_already_member;

  IF v_already_member THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already a member of this workspace');
  END IF;

  SELECT is_premium, GREATEST(0, COALESCE(token_cost, 0)), creator_id
  INTO v_is_premium, v_token_cost, v_creator_id
  FROM public.workspaces
  WHERE id = p_workspace_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workspace not found');
  END IF;

  IF v_is_premium AND v_token_cost > 0 THEN
    SELECT tokens_balance INTO v_user_tokens
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_user_tokens IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
    END IF;

    IF v_user_tokens < v_token_cost THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient tokens');
    END IF;

    UPDATE public.profiles
    SET tokens_balance = tokens_balance - v_token_cost
    WHERE id = p_user_id;

    IF v_creator_id <> p_user_id THEN
      UPDATE public.profiles
      SET tokens_balance = tokens_balance + v_token_cost
      WHERE id = v_creator_id;
    END IF;
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id)
  VALUES (p_workspace_id, p_user_id);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict reward_user_tokens_transaction to service_role only
REVOKE EXECUTE ON FUNCTION public.reward_user_tokens_transaction(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reward_user_tokens_transaction(uuid, integer) TO service_role;

-- Secure tutor_push_task with auth.uid() verification
CREATE OR REPLACE FUNCTION public.tutor_push_task(
  p_tutor_id uuid,
  p_student_id uuid,
  p_workspace_id uuid,
  p_task_data jsonb
) RETURNS jsonb AS $$
DECLARE
  v_tutor_role text;
  v_is_tutor_assoc boolean;
  v_is_student_member boolean;
  v_student_goal_id uuid;
  v_new_task_id uuid;
  v_due_date date;
  v_priority integer;
  v_task_type text;
  v_subtasks jsonb;
  v_resources jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND p_tutor_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized tutor ID mismatch');
  END IF;

  SELECT role INTO v_tutor_role FROM public.profiles WHERE id = p_tutor_id;
  IF v_tutor_role <> 'tutor' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Caller is not a verified tutor');
  END IF;

  SELECT exists(
    SELECT 1 FROM public.workspaces WHERE id = p_workspace_id AND creator_id = p_tutor_id
  ) OR exists(
    SELECT 1 FROM public.workspace_members WHERE workspace_id = p_workspace_id AND user_id = p_tutor_id
  ) INTO v_is_tutor_assoc;

  IF NOT v_is_tutor_assoc THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tutor is not associated with this workspace');
  END IF;

  SELECT exists(
    SELECT 1 FROM public.workspace_members WHERE workspace_id = p_workspace_id AND user_id = p_student_id
  ) INTO v_is_student_member;

  IF NOT v_is_student_member THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student is not a member of this workspace');
  END IF;

  SELECT id INTO v_student_goal_id
  FROM public.learning_goals
  WHERE user_id = p_student_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student has no active learning plan');
  END IF;

  v_due_date := COALESCE((p_task_data->>'due_date')::date, current_date);
  v_priority := COALESCE((p_task_data->>'priority')::integer, 3);
  v_task_type := COALESCE(p_task_data->>'task_type', 'task');
  v_subtasks := COALESCE(p_task_data->'subtasks', '[]'::jsonb);
  v_resources := COALESCE(p_task_data->'resources', '[]'::jsonb);

  INSERT INTO public.tasks (
    goal_id, user_id, title, subject, duration_mins, due_date, priority, task_type, status, subtasks, notes, resources
  ) VALUES (
    v_student_goal_id, p_student_id, p_task_data->>'title', p_task_data->>'subject',
    (p_task_data->>'duration_mins')::integer, v_due_date, v_priority, v_task_type, 'pending', v_subtasks, p_task_data->>'notes', v_resources
  )
  RETURNING id INTO v_new_task_id;

  RETURN jsonb_build_object('success', true, 'taskId', v_new_task_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure processed_stripe_events table exists for webhook idempotency
CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;

-- 5. Configure lifepivot-documents Storage Bucket & RLS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lifepivot-documents',
  'lifepivot-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Auth users can upload their own documents" ON storage.objects;
CREATE POLICY "Auth users can upload their own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lifepivot-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can read their own documents" ON storage.objects;
CREATE POLICY "Users can read their own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lifepivot-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lifepivot-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
