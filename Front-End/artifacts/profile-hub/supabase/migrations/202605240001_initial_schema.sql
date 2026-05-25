-- ============================================================================
-- ProfileHub — Complete Database Schema
-- Modular Monolith · Supabase PostgreSQL
-- ============================================================================

create extension if not exists pgcrypto;

-- ────────────────────────────────────────────────────────────────────────────
-- Helper: auto-update updated_at timestamp
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- profiles
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  title text,
  bio text,
  avatar_url text,
  cover_url text,
  location text,
  website text,
  theme_id uuid,
  is_published boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_user_unique unique (user_id),
  constraint profiles_username_slug check (username ~ '^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])$'),
  constraint profiles_website_url check (website is null or website = '' or website ~* '^https?://')
);

-- links
create table public.links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  url text not null,
  description text,
  icon text,
  type text,
  position integer not null default 0,
  is_active boolean not null default true,
  click_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint links_url_valid check (url ~* '^https?://')
);

-- projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  project_url text,
  repo_url text,
  tags text[] not null default '{}',
  position integer not null default 0,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_image_url_valid check (image_url is null or image_url = '' or image_url ~* '^https?://'),
  constraint projects_project_url_valid check (project_url is null or project_url = '' or project_url ~* '^https?://'),
  constraint projects_repo_url_valid check (repo_url is null or repo_url = '' or repo_url ~* '^https?://')
);

-- services
create table public.services (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  price_label text,
  cta_label text,
  cta_url text,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_cta_url_valid check (cta_url is null or cta_url = '' or cta_url ~* '^(https?://|mailto:)')
);

-- media (gallery)
create table public.media (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  alt text,
  type text not null default 'image',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint media_url_valid check (url ~* '^https?://')
);

-- themes
create table public.themes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  tokens jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FK: profiles.theme_id -> themes.id  (deferred because themes references profiles)
alter table public.profiles
  add constraint profiles_theme_id_fkey foreign key (theme_id) references public.themes(id) on delete set null;

-- page_views (analytics)
create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  visitor_id_hash text,
  referrer text,
  user_agent_hash text,
  country text,
  device text,
  created_at timestamptz not null default now()
);

-- link_clicks (analytics)
create table public.link_clicks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  link_id uuid not null references public.links(id) on delete cascade,
  visitor_id_hash text,
  referrer text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

-- audit_logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

-- ai_usage_logs
create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  feature text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  status text not null default 'success',
  error_message text,
  created_at timestamptz not null default now()
);

-- system_logs
create table public.system_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null,
  scope text not null,
  message text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

create index profiles_user_id_idx on public.profiles(user_id);
create index profiles_username_idx on public.profiles(username);
create index links_profile_position_idx on public.links(profile_id, position);
create index projects_profile_position_idx on public.projects(profile_id, position);
create index services_profile_position_idx on public.services(profile_id, position);
create index media_profile_position_idx on public.media(profile_id, position);
create index page_views_profile_created_idx on public.page_views(profile_id, created_at);
create index link_clicks_profile_created_idx on public.link_clicks(profile_id, created_at);
create index link_clicks_link_created_idx on public.link_clicks(link_id, created_at);
create index ai_usage_user_created_idx on public.ai_usage_logs(user_id, created_at);
create index audit_logs_user_created_idx on public.audit_logs(user_id, created_at);
create index system_logs_level_created_idx on public.system_logs(level, created_at);

-- ============================================================================
-- 3. TRIGGERS (auto updated_at)
-- ============================================================================

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger links_updated_at before update on public.links
  for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();
create trigger themes_updated_at before update on public.themes
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. HELPER FUNCTIONS (used in RLS policies)
-- ============================================================================

create or replace function public.is_profile_owner(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = target_profile_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_profile_published(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = target_profile_id and is_published = true
  );
$$;

create or replace function public.increment_link_click_count(target_link_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.links
  set click_count = click_count + 1
  where id = target_link_id;
$$;

-- ============================================================================
-- 5. ROW LEVEL SECURITY — Enable on ALL tables
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.links enable row level security;
alter table public.projects enable row level security;
alter table public.services enable row level security;
alter table public.media enable row level security;
alter table public.themes enable row level security;
alter table public.page_views enable row level security;
alter table public.link_clicks enable row level security;
alter table public.audit_logs enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.system_logs enable row level security;

-- ────────────────────────────────────────────────────────────────────────────
-- 5a. profiles
-- ────────────────────────────────────────────────────────────────────────────
create policy "profiles: public read published"
  on public.profiles for select
  using (is_published = true);

create policy "profiles: owner read own"
  on public.profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy "profiles: owner insert"
  on public.profiles for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "profiles: owner update"
  on public.profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "profiles: owner delete"
  on public.profiles for delete
  to authenticated
  using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- 5b. links
-- ────────────────────────────────────────────────────────────────────────────
create policy "links: public read active+published"
  on public.links for select
  using (is_active = true and public.is_profile_published(profile_id));

create policy "links: owner all"
  on public.links for all
  to authenticated
  using (public.is_profile_owner(profile_id))
  with check (public.is_profile_owner(profile_id));

-- ────────────────────────────────────────────────────────────────────────────
-- 5c. projects
-- ────────────────────────────────────────────────────────────────────────────
create policy "projects: public read active+published"
  on public.projects for select
  using (is_active = true and public.is_profile_published(profile_id));

create policy "projects: owner all"
  on public.projects for all
  to authenticated
  using (public.is_profile_owner(profile_id))
  with check (public.is_profile_owner(profile_id));

-- ────────────────────────────────────────────────────────────────────────────
-- 5d. services
-- ────────────────────────────────────────────────────────────────────────────
create policy "services: public read active+published"
  on public.services for select
  using (is_active = true and public.is_profile_published(profile_id));

create policy "services: owner all"
  on public.services for all
  to authenticated
  using (public.is_profile_owner(profile_id))
  with check (public.is_profile_owner(profile_id));

-- ────────────────────────────────────────────────────────────────────────────
-- 5e. media
-- ────────────────────────────────────────────────────────────────────────────
create policy "media: public read published"
  on public.media for select
  using (public.is_profile_published(profile_id));

create policy "media: owner all"
  on public.media for all
  to authenticated
  using (public.is_profile_owner(profile_id))
  with check (public.is_profile_owner(profile_id));

-- ────────────────────────────────────────────────────────────────────────────
-- 5f. themes
-- ────────────────────────────────────────────────────────────────────────────
create policy "themes: public read published"
  on public.themes for select
  using (public.is_profile_published(profile_id));

create policy "themes: owner all"
  on public.themes for all
  to authenticated
  using (public.is_profile_owner(profile_id))
  with check (public.is_profile_owner(profile_id));

-- ────────────────────────────────────────────────────────────────────────────
-- 5g. page_views  (owner reads, service_role inserts)
-- ────────────────────────────────────────────────────────────────────────────
create policy "page_views: owner read"
  on public.page_views for select
  to authenticated
  using (public.is_profile_owner(profile_id));

-- Inserts go through service_role (admin client) — no anon INSERT policy needed.

-- ────────────────────────────────────────────────────────────────────────────
-- 5h. link_clicks  (owner reads, service_role inserts)
-- ────────────────────────────────────────────────────────────────────────────
create policy "link_clicks: owner read"
  on public.link_clicks for select
  to authenticated
  using (public.is_profile_owner(profile_id));

-- Inserts go through service_role (admin client) — no anon INSERT policy needed.

-- ────────────────────────────────────────────────────────────────────────────
-- 5i. audit_logs  (owner reads own, service_role inserts)
-- ────────────────────────────────────────────────────────────────────────────
create policy "audit_logs: owner read own"
  on public.audit_logs for select
  to authenticated
  using (user_id = auth.uid());

-- Inserts go through service_role (admin client).

-- ────────────────────────────────────────────────────────────────────────────
-- 5j. ai_usage_logs  (owner reads own, service_role inserts)
-- ────────────────────────────────────────────────────────────────────────────
create policy "ai_usage_logs: owner read own"
  on public.ai_usage_logs for select
  to authenticated
  using (user_id = auth.uid());

-- Inserts go through service_role (admin client).

-- ────────────────────────────────────────────────────────────────────────────
-- 5k. system_logs  (NO public/anon access — service_role only)
-- ────────────────────────────────────────────────────────────────────────────
-- No policies for anon or authenticated — only service_role can read/write.

-- ============================================================================
-- 6. STORAGE BUCKETS
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('covers', 'covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('project-media', 'project-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('gallery-media', 'gallery-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ────────────────────────────────────────────────────────────────────────────
-- 6a. Storage RLS — anyone can read public buckets
-- ────────────────────────────────────────────────────────────────────────────
create policy "storage: public read"
  on storage.objects for select
  using (bucket_id in ('avatars', 'covers', 'project-media', 'gallery-media'));

-- ────────────────────────────────────────────────────────────────────────────
-- 6b. Storage RLS — authenticated users upload to own folder (userId/)
-- ────────────────────────────────────────────────────────────────────────────
create policy "storage: user upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('avatars', 'covers', 'project-media', 'gallery-media')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage: user update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('avatars', 'covers', 'project-media', 'gallery-media')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('avatars', 'covers', 'project-media', 'gallery-media')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage: user delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('avatars', 'covers', 'project-media', 'gallery-media')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
