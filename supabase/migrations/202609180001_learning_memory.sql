-- Initial schema. Apply once with Supabase migrations or the SQL editor.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  learning_preferences jsonb not null default '{"example_first":true,"prefers_visuals":false,"explanation_length":"short","preferred_session_length":10,"hint_before_solution":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(learning_preferences) = 'object')
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null,
  user_id uuid not null,
  title text not null,
  kind text not null check (kind in ('syllabus', 'notes')),
  storage_path text,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  foreign key (course_id, user_id) references public.courses(id, user_id) on delete cascade,
  unique (id, course_id, user_id)
);

create table public.source_passages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null,
  course_id uuid not null,
  user_id uuid not null,
  content text not null check (length(trim(content)) > 0),
  page_number integer check (page_number > 0),
  section text,
  position integer not null default 0 check (position >= 0),
  foreign key (document_id, course_id, user_id) references public.documents(id, course_id, user_id) on delete cascade,
  unique (id, course_id, user_id)
);

create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null,
  user_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  position integer not null check (position >= 0),
  foreign key (course_id, user_id) references public.courses(id, user_id) on delete cascade,
  unique (id, course_id, user_id),
  unique (course_id, position)
);

create table public.concept_prerequisites (
  concept_id uuid not null,
  prerequisite_id uuid not null,
  course_id uuid not null,
  user_id uuid not null,
  primary key (concept_id, prerequisite_id),
  check (concept_id <> prerequisite_id),
  foreign key (concept_id, course_id, user_id) references public.concepts(id, course_id, user_id) on delete cascade,
  foreign key (prerequisite_id, course_id, user_id) references public.concepts(id, course_id, user_id) on delete cascade
);

create table public.concept_sources (
  concept_id uuid not null,
  passage_id uuid not null,
  course_id uuid not null,
  user_id uuid not null,
  primary key (concept_id, passage_id),
  foreign key (concept_id, course_id, user_id) references public.concepts(id, course_id, user_id) on delete cascade,
  foreign key (passage_id, course_id, user_id) references public.source_passages(id, course_id, user_id) on delete cascade
);

-- Content rows are immutable versions: regeneration creates a new ID.
create table public.learning_content (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null,
  course_id uuid not null,
  user_id uuid not null,
  explanation text not null,
  question jsonb not null check (jsonb_typeof(question) = 'object'),
  teaching_strategy text not null default 'worked_example',
  difficulty integer not null default 1 check (difficulty between 1 and 5),
  created_at timestamptz not null default now(),
  foreign key (concept_id, course_id, user_id) references public.concepts(id, course_id, user_id) on delete cascade,
  unique (id, course_id, user_id)
);

-- Never grant browser roles SELECT on grading context.
create table public.question_grading (
  content_id uuid primary key,
  course_id uuid not null,
  user_id uuid not null,
  answer_key jsonb not null,
  rubric text not null default '',
  foreign key (content_id, course_id, user_id) references public.learning_content(id, course_id, user_id) on delete cascade
);

create table public.content_sources (
  content_id uuid not null,
  passage_id uuid not null,
  course_id uuid not null,
  user_id uuid not null,
  primary key (content_id, passage_id),
  foreign key (content_id, course_id, user_id) references public.learning_content(id, course_id, user_id) on delete cascade,
  foreign key (passage_id, course_id, user_id) references public.source_passages(id, course_id, user_id) on delete cascade
);

create table public.student_concept_mastery (
  user_id uuid not null,
  concept_id uuid not null,
  course_id uuid not null,
  mastery_score numeric(6,5) not null check (mastery_score between 0 and 1),
  attempts integer not null check (attempts > 0),
  correct_attempts integer not null check (correct_attempts between 0 and attempts),
  last_reviewed timestamptz not null,
  next_review_at timestamptz not null,
  primary key (user_id, concept_id),
  foreign key (concept_id, course_id, user_id) references public.concepts(id, course_id, user_id) on delete cascade
);

create table public.attempts (
  id uuid primary key,
  user_id uuid not null,
  course_id uuid not null,
  content_id uuid not null,
  concept_id uuid not null,
  student_answer jsonb not null,
  correct boolean not null,
  feedback text not null default '',
  identified_misconception text,
  related_concept_id uuid,
  confidence numeric check (confidence between 0 and 1),
  is_review boolean not null default false,
  mastery_after numeric(6,5) not null check (mastery_after between 0 and 1),
  created_at timestamptz not null default now(),
  foreign key (content_id, course_id, user_id) references public.learning_content(id, course_id, user_id) on delete cascade,
  foreign key (concept_id, course_id, user_id) references public.concepts(id, course_id, user_id) on delete cascade,
  foreign key (related_concept_id, course_id, user_id) references public.concepts(id, course_id, user_id)
);

create table public.content_flags (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null,
  course_id uuid not null,
  user_id uuid not null,
  reason text not null check (length(trim(reason)) > 0),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  foreign key (content_id, course_id, user_id) references public.learning_content(id, course_id, user_id) on delete cascade
);

create index courses_user_idx on public.courses(user_id);
create index documents_course_idx on public.documents(user_id, course_id);
create index passages_document_idx on public.source_passages(document_id);
create index concepts_course_idx on public.concepts(user_id, course_id);
create index prerequisites_reverse_idx on public.concept_prerequisites(prerequisite_id);
create index concept_sources_passage_idx on public.concept_sources(passage_id);
create index content_course_idx on public.learning_content(user_id, course_id);
create index content_sources_passage_idx on public.content_sources(passage_id);
create index attempts_history_idx on public.attempts(user_id, course_id, created_at desc);
create index attempts_content_idx on public.attempts(content_id);
create index attempts_related_idx on public.attempts(related_concept_id);
create index mastery_review_idx on public.student_concept_mastery(user_id, course_id, next_review_at);
create index flags_content_idx on public.content_flags(content_id);

-- Default Supabase grants vary; explicitly close writes and grading access.
do $$
declare t text;
begin
  foreach t in array array['profiles','courses','documents','source_passages','concepts',
    'concept_prerequisites','concept_sources','learning_content','question_grading',
    'content_sources','student_concept_mastery','attempts','content_flags'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    if t <> 'question_grading' then
      execute format('grant select on public.%I to authenticated', t);
      execute format('create policy own_rows on public.%I for select to authenticated using ((select auth.uid()) = %I)',
        t, case when t = 'profiles' then 'id' else 'user_id' end);
    end if;
  end loop;
end $$;

-- Keep citations, question snapshots, and recorded evidence stable.
create function public.reject_memory_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Learning content and attempts are immutable; create a new version';
end $$;
create trigger immutable_content before update on public.learning_content
  for each row execute function public.reject_memory_mutation();
create trigger immutable_attempt before update on public.attempts
  for each row execute function public.reject_memory_mutation();
revoke all on function public.reject_memory_mutation() from public, anon, authenticated;

commit;
