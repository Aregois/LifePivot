-- LifePivot (Student Edition) Database Schema

-- 1. Profiles Table
-- Automatically mirrors auth.users
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  lives integer default 3 not null,
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
  insert into public.profiles (id, lives, gems)
  values (new.id, 3, 3);
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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.learning_goals enable row level security;

create policy "Users can view own learning_goals."
  on learning_goals for select
  using ( auth.uid() = user_id );

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

