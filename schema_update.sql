-- Migration Script: Hearts System to Token & Tutor Marketplace

-- 1. Modify profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS lives;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tokens_balance integer DEFAULT 0 NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'student' NOT NULL CHECK (role IN ('student', 'tutor'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url text;

-- 2. Update the handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger as $$
BEGIN
  INSERT INTO public.profiles (id, tokens_balance, gems)
  VALUES (new.id, 0, 3);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_premium boolean DEFAULT false NOT NULL,
  token_cost integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Create policies for workspaces
DROP POLICY IF EXISTS "Workspaces are viewable by everyone." ON public.workspaces;
CREATE POLICY "Workspaces are viewable by everyone."
  ON public.workspaces FOR SELECT
  USING ( true );

DROP POLICY IF EXISTS "Users can insert workspaces." ON public.workspaces;
CREATE POLICY "Users can insert workspaces."
  ON public.workspaces FOR INSERT
  WITH CHECK ( auth.uid() = creator_id );

DROP POLICY IF EXISTS "Creators can update workspaces." ON public.workspaces;
CREATE POLICY "Creators can update workspaces."
  ON public.workspaces FOR UPDATE
  USING ( auth.uid() = creator_id );

DROP POLICY IF EXISTS "Creators can delete workspaces." ON public.workspaces;
CREATE POLICY "Creators can delete workspaces."
  ON public.workspaces FOR DELETE
  USING ( auth.uid() = creator_id );

-- 4. Create workspace_members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);

-- Enable RLS for workspace_members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Create policies for workspace_members
DROP POLICY IF EXISTS "Workspace members are viewable by everyone." ON public.workspace_members;
CREATE POLICY "Workspace members are viewable by everyone."
  ON public.workspace_members FOR SELECT
  USING ( true );

DROP POLICY IF EXISTS "Users can enroll themselves in workspaces." ON public.workspace_members;
CREATE POLICY "Users can enroll themselves in workspaces."
  ON public.workspace_members FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can leave workspaces." ON public.workspace_members;
CREATE POLICY "Users can leave workspaces."
  ON public.workspace_members FOR DELETE
  USING ( auth.uid() = user_id );

-- 5. Create join_workspace_transaction database function
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
  -- 1. Check if user is already a member
  select exists(
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = p_user_id
  ) into v_already_member;

  if v_already_member then
    return jsonb_build_object('success', false, 'error', 'Already a member of this workspace');
  end if;

  -- 2. Get workspace details
  select is_premium, token_cost, creator_id
  into v_is_premium, v_token_cost, v_creator_id
  from public.workspaces
  where id = p_workspace_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Workspace not found');
  end if;

  -- 3. Handle token transfer if premium
  if v_is_premium then
    select tokens_balance into v_user_tokens
    from public.profiles
    where id = p_user_id;

    if v_user_tokens is null then
      return jsonb_build_object('success', false, 'error', 'User profile not found');
    end if;

    if v_user_tokens < v_token_cost then
      return jsonb_build_object('success', false, 'error', 'Insufficient tokens');
    end if;

    -- Deduct from student
    update public.profiles
    set tokens_balance = tokens_balance - v_token_cost
    where id = p_user_id;

    -- Credit to creator
    if v_creator_id <> p_user_id then
      update public.profiles
      set tokens_balance = tokens_balance + v_token_cost
      where id = v_creator_id;
    end if;
  end if;

  -- 4. Add to workspace_members
  insert into public.workspace_members (workspace_id, user_id)
  values (p_workspace_id, p_user_id);

  return jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Reward User Tokens Stored Procedure
CREATE OR REPLACE FUNCTION public.reward_user_tokens_transaction(
  p_user_id uuid,
  p_amount integer
) RETURNS jsonb AS $$
DECLARE
  v_new_balance integer;
BEGIN
  update public.profiles
  set tokens_balance = tokens_balance + p_amount
  where id = p_user_id
  returning tokens_balance into v_new_balance;

  if not found then
    return jsonb_build_object('success', false, 'error', 'User profile not found');
  end if;

  return jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. Tutor Push Task Stored Procedure
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
  -- 1. Verify tutor role
  select role into v_tutor_role from public.profiles where id = p_tutor_id;
  if v_tutor_role <> 'tutor' then
    return jsonb_build_object('success', false, 'error', 'Caller is not a verified tutor');
  end if;

  -- 2. Verify tutor's relationship to workspace (must be creator or member)
  select exists(
    select 1 from public.workspaces where id = p_workspace_id and creator_id = p_tutor_id
  ) or exists(
    select 1 from public.workspace_members where workspace_id = p_workspace_id and user_id = p_tutor_id
  ) into v_is_tutor_assoc;

  if not v_is_tutor_assoc then
    return jsonb_build_object('success', false, 'error', 'Tutor is not associated with this workspace');
  end if;

  -- 3. Verify student is in the workspace
  select exists(
    select 1 from public.workspace_members where workspace_id = p_workspace_id and user_id = p_student_id
  ) into v_is_student_member;

  if not v_is_student_member then
    return jsonb_build_object('success', false, 'error', 'Student is not a member of this workspace');
  end if;

  -- 4. Find student's active learning goal (latest)
  select id into v_student_goal_id
  from public.learning_goals
  where user_id = p_student_id
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Student has no active learning plan');
  end if;

  -- 5. Extract task parameters from JSON
  v_due_date := coalesce((p_task_data->>'due_date')::date, current_date);
  v_priority := coalesce((p_task_data->>'priority')::integer, 3);
  v_task_type := coalesce(p_task_data->>'task_type', 'task');
  v_subtasks := coalesce(p_task_data->'subtasks', '[]'::jsonb);
  v_resources := coalesce(p_task_data->'resources', '[]'::jsonb);

  -- 6. Insert task (bypasses RLS due to security definer)
  insert into public.tasks (
    goal_id,
    user_id,
    title,
    subject,
    duration_mins,
    due_date,
    priority,
    task_type,
    status,
    subtasks,
    notes,
    resources
  ) values (
    v_student_goal_id,
    p_student_id,
    p_task_data->>'title',
    p_task_data->>'subject',
    (p_task_data->>'duration_mins')::integer,
    v_due_date,
    v_priority,
    v_task_type,
    'pending',
    v_subtasks,
    p_task_data->>'notes',
    v_resources
  )
  returning id into v_new_task_id;

  return jsonb_build_object('success', true, 'taskId', v_new_task_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. Subscription & Share Plan Amendments
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_subscribed boolean DEFAULT false NOT NULL;
ALTER TABLE public.learning_goals ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false NOT NULL;
ALTER TABLE public.learning_goals ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 5.0;

-- Update SELECT policy for learning_goals to allow viewing public plans
DROP POLICY IF EXISTS "Users can view own learning_goals." ON public.learning_goals;
CREATE POLICY "Users can view own learning_goals."
  ON public.learning_goals FOR SELECT
  USING ( auth.uid() = user_id OR is_public = true );



