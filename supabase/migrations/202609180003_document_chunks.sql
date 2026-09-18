-- Agent-facing retrieval chunks. Apply after the existing schema migrations.
begin;

create schema if not exists extensions;
create extension if not exists vector with schema extensions;
-- Supabase projects may already have vector installed in public or extensions.
set local search_path = public, extensions, pg_catalog;

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.documents(id) on delete cascade,
  chapter text,
  content text not null check (length(trim(content)) > 0),
  -- Agree on the embedding model and dimension before adding a vector index.
  -- NULL supports inserting extracted text before the embedding job finishes.
  embedding vector
);

create index document_chunks_material_idx on public.document_chunks(material_id);

alter table public.document_chunks enable row level security;
revoke all on public.document_chunks from public, anon, authenticated;
grant select on public.document_chunks to authenticated;
grant all on public.document_chunks to service_role;

create policy own_document_chunks on public.document_chunks
  for select to authenticated
  using (exists (
    select 1 from public.documents d
    where d.id = material_id and d.user_id = (select auth.uid())
  ));

commit;
