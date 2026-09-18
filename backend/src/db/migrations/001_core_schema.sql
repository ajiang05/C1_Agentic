-- Core schema for Adaptive AI Study Journey (Supabase / Postgres)
-- Apply in Supabase SQL editor or via CLI: supabase db push
-- Person 7 owns refinements; Person 1 coordinates contract alignment.

-- Profiles linked to Supabase Auth (auth.users). For anonymous MVP demos,
-- backend may still mint student_id without auth; auth_user_id stays null.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  display_name text not null,
  learning_preferences jsonb not null default '{
    "example_first": true,
    "prefers_visuals": false,
    "explanation_length": "moderate",
    "preferred_session_length": 10,
    "hint_before_solution": true
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_name text not null,
  current_concept_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  kind text not null check (kind in ('syllabus', 'notes')),
  name text not null,
  storage_path text,
  extracted_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  name text not null,
  description text not null default '',
  prerequisite_ids uuid[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.courses
  drop constraint if exists courses_current_concept_id_fkey;

alter table public.courses
  add constraint courses_current_concept_id_fkey
  foreign key (current_concept_id) references public.concepts (id) on delete set null;

create table if not exists public.student_concept_mastery (
  student_id uuid not null references public.profiles (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  mastery_score real not null default 0 check (mastery_score >= 0 and mastery_score <= 1),
  attempts int not null default 0,
  correct_attempts int not null default 0,
  last_reviewed timestamptz,
  primary key (student_id, concept_id)
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  question_id text not null,
  question_prompt text not null,
  student_answer text not null,
  correct boolean not null,
  identified_misconception text,
  evaluation jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_courses_student on public.courses (student_id);
create index if not exists idx_concepts_course on public.concepts (course_id, sort_order);
create index if not exists idx_attempts_student on public.attempts (student_id, created_at desc);
create index if not exists idx_mastery_student on public.student_concept_mastery (student_id);

-- Storage bucket for uploads (also create in Dashboard → Storage if needed)
insert into storage.buckets (id, name, public)
values ('course-materials', 'course-materials', false)
on conflict (id) do nothing;

-- RLS sketches (tighten before production). Service role bypasses RLS.
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.materials enable row level security;
alter table public.concepts enable row level security;
alter table public.student_concept_mastery enable row level security;
alter table public.attempts enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = auth_user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = auth_user_id);
