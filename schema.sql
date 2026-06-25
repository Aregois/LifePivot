-- LifePivot (Student Edition) Database Schema

-- 1. Profiles Table
-- Automatically mirrors auth.users
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  tokens_balance integer default 0 not null,
  role text default 'student' not null check (role in ('student', 'tutor')),
  linkedin_url text,
  is_subscribed boolean default false not null,
  gems integer default 3 not null,
  xp integer default 0 not null,
  level integer default 1 not null,
  multiplier_active boolean default false not null,
  streak_shields_count integer default 0 not null,
  current_streak integer default 0 not null,
  high_streak integer default 0 not null,
  last_pivot_check timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create trigger to automatically create profile on sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, tokens_balance, gems)
  values (new.id, 0, 3);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Learning Goals Table
create table public.learning_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  duration_days integer default 30 not null,
  level text default 'Beginner',
  goal_intent text default 'Level Up' check (goal_intent in ('Exam', 'Level Up', 'Intro')),
  sprint_walls jsonb default '[]'::jsonb,
  plan_metadata jsonb default '{}'::jsonb,
  commitment_hours_per_week integer default 10,
  is_public boolean default false not null,
  rating numeric default 5.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.learning_goals enable row level security;

create policy "Users can view own learning_goals."
  on learning_goals for select
  using ( auth.uid() = user_id or is_public = true );

create policy "Users can insert own learning_goals."
  on learning_goals for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own learning_goals."
  on learning_goals for update
  using ( auth.uid() = user_id );

create policy "Users can delete own learning_goals."
  on learning_goals for delete
  using ( auth.uid() = user_id );


-- 3. Tasks Table
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references public.learning_goals(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  subject text,
  duration_mins integer,
  due_date date not null,
  priority integer default 3 check (priority >= 0 and priority <= 5),
  task_type text default 'task' check (task_type in ('task', 'void')),
  status text check (status in ('pending', 'completed')) default 'pending' not null,
  pivoted_count integer default 0 not null,
  ai_hint text,
  subtasks jsonb default '[]'::jsonb,
  notes text,
  resources jsonb default '[]'::jsonb,
  reflection text,
  drill_data jsonb default null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tasks enable row level security;

create policy "Users can view own tasks."
  on tasks for select
  using ( auth.uid() = user_id );

create policy "Users can insert own tasks."
  on tasks for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own tasks."
  on tasks for update
  using ( auth.uid() = user_id );

create policy "Users can delete own tasks."
  on tasks for delete
  using ( auth.uid() = user_id );


-- 4. Flashcards Table
create table public.flashcards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete cascade,
  question text not null,
  answer text not null,
  leitner_box integer default 1 not null,
  next_review timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.flashcards enable row level security;

create policy "Users can view own flashcards."
  on flashcards for select
  using ( auth.uid() = user_id );

create policy "Users can insert own flashcards."
  on flashcards for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own flashcards."
  on flashcards for update
  using ( auth.uid() = user_id );

create policy "Users can delete own flashcards."
  on flashcards for delete
  using ( auth.uid() = user_id );


-- 5. Workspaces Table
create table public.workspaces (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  is_premium boolean default false not null,
  token_cost integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.workspaces enable row level security;

create policy "Workspaces are viewable by everyone."
  on workspaces for select
  using ( true );

create policy "Users can insert workspaces."
  on workspaces for insert
  with check ( auth.uid() = creator_id );

create policy "Creators can update workspaces."
  on workspaces for update
  using ( auth.uid() = creator_id );

create policy "Creators can delete workspaces."
  on workspaces for delete
  using ( auth.uid() = creator_id );


-- 6. Workspace Members Table
create table public.workspace_members (
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

create policy "Workspace members are viewable by everyone."
  on workspace_members for select
  using ( true );

create policy "Users can enroll themselves in workspaces."
  on workspace_members for insert
  with check ( auth.uid() = user_id );

create policy "Users can leave workspaces."
  on workspace_members for delete
  using ( auth.uid() = user_id );


-- 7. Join Workspace Stored Procedure (Transaction)
create or replace function public.join_workspace_transaction(
  p_workspace_id uuid,
  p_user_id uuid
) returns jsonb as $$
declare
  v_is_premium boolean;
  v_token_cost integer;
  v_creator_id uuid;
  v_user_tokens integer;
  v_already_member boolean;
begin
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
end;
$$ language plpgsql security definer;


-- 8. Reward User Tokens Stored Procedure
create or replace function public.reward_user_tokens_transaction(
  p_user_id uuid,
  p_amount integer
) returns jsonb as $$
declare
  v_new_balance integer;
begin
  update public.profiles
  set tokens_balance = tokens_balance + p_amount
  where id = p_user_id
  returning tokens_balance into v_new_balance;

  if not found then
    return jsonb_build_object('success', false, 'error', 'User profile not found');
  end if;

  return jsonb_build_object('success', true, 'new_balance', v_new_balance);
end;
$$ language plpgsql security definer;


-- 9. Tutor Push Task Stored Procedure
create or replace function public.tutor_push_task(
  p_tutor_id uuid,
  p_student_id uuid,
  p_workspace_id uuid,
  p_task_data jsonb
) returns jsonb as $$
declare
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
begin
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
end;
$$ language plpgsql security definer;




