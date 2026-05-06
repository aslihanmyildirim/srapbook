create extension if not exists pgcrypto;

create table if not exists public.scrapbooks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Untitled scrapbook',
  current_spread integer not null default 0,
  appearance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scrapbook_pages (
  id uuid primary key default gen_random_uuid(),
  scrapbook_id uuid not null references public.scrapbooks(id) on delete cascade,
  spread_index integer not null,
  page_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(scrapbook_id, spread_index)
);

create table if not exists public.scrapbook_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  scrapbook_id uuid references public.scrapbooks(id) on delete cascade,
  bucket_id text not null default 'scrapbook-media',
  storage_path text not null,
  media_kind text not null check (media_kind in ('image', 'video', 'audio', 'drawing', 'other')),
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  unique(bucket_id, storage_path)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_scrapbooks_updated_at on public.scrapbooks;
create trigger set_scrapbooks_updated_at
before update on public.scrapbooks
for each row execute function public.set_updated_at();

drop trigger if exists set_scrapbook_pages_updated_at on public.scrapbook_pages;
create trigger set_scrapbook_pages_updated_at
before update on public.scrapbook_pages
for each row execute function public.set_updated_at();

alter table public.scrapbooks enable row level security;
alter table public.scrapbook_pages enable row level security;
alter table public.scrapbook_assets enable row level security;

drop policy if exists "Users can read own scrapbooks" on public.scrapbooks;
create policy "Users can read own scrapbooks" on public.scrapbooks
for select to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists "Users can create own scrapbooks" on public.scrapbooks;
create policy "Users can create own scrapbooks" on public.scrapbooks
for insert to authenticated with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can update own scrapbooks" on public.scrapbooks;
create policy "Users can update own scrapbooks" on public.scrapbooks
for update to authenticated using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can delete own scrapbooks" on public.scrapbooks;
create policy "Users can delete own scrapbooks" on public.scrapbooks
for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists "Users can read own pages" on public.scrapbook_pages;
create policy "Users can read own pages" on public.scrapbook_pages
for select to authenticated using (
  exists (select 1 from public.scrapbooks s where s.id = scrapbook_id and s.owner_id = (select auth.uid()))
);

drop policy if exists "Users can create own pages" on public.scrapbook_pages;
create policy "Users can create own pages" on public.scrapbook_pages
for insert to authenticated with check (
  exists (select 1 from public.scrapbooks s where s.id = scrapbook_id and s.owner_id = (select auth.uid()))
);

drop policy if exists "Users can update own pages" on public.scrapbook_pages;
create policy "Users can update own pages" on public.scrapbook_pages
for update to authenticated using (
  exists (select 1 from public.scrapbooks s where s.id = scrapbook_id and s.owner_id = (select auth.uid()))
) with check (
  exists (select 1 from public.scrapbooks s where s.id = scrapbook_id and s.owner_id = (select auth.uid()))
);

drop policy if exists "Users can delete own pages" on public.scrapbook_pages;
create policy "Users can delete own pages" on public.scrapbook_pages
for delete to authenticated using (
  exists (select 1 from public.scrapbooks s where s.id = scrapbook_id and s.owner_id = (select auth.uid()))
);

drop policy if exists "Users can read own assets" on public.scrapbook_assets;
create policy "Users can read own assets" on public.scrapbook_assets
for select to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists "Users can create own assets" on public.scrapbook_assets;
create policy "Users can create own assets" on public.scrapbook_assets
for insert to authenticated with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can delete own assets" on public.scrapbook_assets;
create policy "Users can delete own assets" on public.scrapbook_assets
for delete to authenticated using ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scrapbook-media',
  'scrapbook-media',
  false,
  104857600,
  array[
    'image/png','image/jpeg','image/webp','image/gif',
    'video/mp4','video/webm',
    'audio/mpeg','audio/mp4','audio/wav','audio/webm','audio/ogg'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own scrapbook media" on storage.objects;
create policy "Users can read own scrapbook media" on storage.objects
for select to authenticated using (
  bucket_id = 'scrapbook-media' and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can upload own scrapbook media" on storage.objects;
create policy "Users can upload own scrapbook media" on storage.objects
for insert to authenticated with check (
  bucket_id = 'scrapbook-media' and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update own scrapbook media" on storage.objects;
create policy "Users can update own scrapbook media" on storage.objects
for update to authenticated using (
  bucket_id = 'scrapbook-media' and (storage.foldername(name))[1] = (select auth.uid())::text
) with check (
  bucket_id = 'scrapbook-media' and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete own scrapbook media" on storage.objects;
create policy "Users can delete own scrapbook media" on storage.objects
for delete to authenticated using (
  bucket_id = 'scrapbook-media' and (storage.foldername(name))[1] = (select auth.uid())::text
);

create index if not exists scrapbook_pages_scrapbook_idx on public.scrapbook_pages(scrapbook_id, spread_index);
create index if not exists scrapbook_assets_owner_idx on public.scrapbook_assets(owner_id, created_at desc);
