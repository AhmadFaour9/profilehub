-- Split profile identity links from public Smart Links.
-- Existing public.links rows are migrated but kept in place for rollback safety.

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null,
  title text not null,
  url text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_links_platform_unique unique (profile_id, platform),
  constraint social_links_url_valid check (url ~* '^(https?://|mailto:)')
);

create table if not exists public.smart_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  url text not null,
  description text,
  icon text,
  image_url text,
  category text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  click_count integer not null default 0,
  last_clicked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint smart_links_url_valid check (url ~* '^https?://'),
  constraint smart_links_image_url_valid check (image_url is null or image_url = '' or image_url ~* '^https?://')
);

create table if not exists public.smart_link_clicks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  smart_link_id uuid not null references public.smart_links(id) on delete cascade,
  visitor_id_hash text,
  referrer text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create index if not exists social_links_profile_sort_idx on public.social_links(profile_id, sort_order);
create index if not exists smart_links_profile_sort_idx on public.smart_links(profile_id, sort_order);
create index if not exists smart_links_profile_clicks_idx on public.smart_links(profile_id, click_count desc);
create index if not exists smart_link_clicks_profile_created_idx on public.smart_link_clicks(profile_id, created_at);
create index if not exists smart_link_clicks_link_created_idx on public.smart_link_clicks(smart_link_id, created_at);

drop trigger if exists social_links_updated_at on public.social_links;
create trigger social_links_updated_at before update on public.social_links
  for each row execute function public.set_updated_at();

drop trigger if exists smart_links_updated_at on public.smart_links;
create trigger smart_links_updated_at before update on public.smart_links
  for each row execute function public.set_updated_at();

insert into public.social_links (id, profile_id, platform, title, url, is_active, sort_order, created_at, updated_at)
select
  id,
  profile_id,
  lower(regexp_replace(coalesce(nullif(icon, ''), title), '[^a-z0-9_-]', '', 'g')) as platform,
  title,
  url,
  is_active,
  position,
  created_at,
  updated_at
from public.links
where type = 'social'
  and lower(regexp_replace(coalesce(nullif(icon, ''), title), '[^a-z0-9_-]', '', 'g')) <> ''
on conflict (profile_id, platform) do update
set title = excluded.title,
    url = excluded.url,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order,
    updated_at = now();

insert into public.smart_links (
  id,
  profile_id,
  title,
  url,
  description,
  icon,
  image_url,
  category,
  is_featured,
  is_active,
  sort_order,
  click_count,
  created_at,
  updated_at
)
select
  id,
  profile_id,
  title,
  url,
  description,
  icon,
  null::text,
  nullif(type, ''),
  false,
  is_active,
  position,
  click_count,
  created_at,
  updated_at
from public.links
where coalesce(type, '') <> 'social'
on conflict (id) do nothing;

create or replace function public.increment_smart_link_click_count(target_link_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.smart_links
  set click_count = click_count + 1,
      last_clicked_at = now()
  where id = target_link_id;
$$;

alter table public.social_links enable row level security;
alter table public.smart_links enable row level security;
alter table public.smart_link_clicks enable row level security;

drop policy if exists "social_links: public read active+published" on public.social_links;
create policy "social_links: public read active+published"
  on public.social_links for select
  using (is_active = true and public.is_profile_published(profile_id));

drop policy if exists "social_links: owner all" on public.social_links;
create policy "social_links: owner all"
  on public.social_links for all
  to authenticated
  using (public.is_profile_owner(profile_id))
  with check (public.is_profile_owner(profile_id));

drop policy if exists "smart_links: public read active+published" on public.smart_links;
create policy "smart_links: public read active+published"
  on public.smart_links for select
  using (is_active = true and public.is_profile_published(profile_id));

drop policy if exists "smart_links: owner all" on public.smart_links;
create policy "smart_links: owner all"
  on public.smart_links for all
  to authenticated
  using (public.is_profile_owner(profile_id))
  with check (public.is_profile_owner(profile_id));

drop policy if exists "smart_link_clicks: owner read" on public.smart_link_clicks;
create policy "smart_link_clicks: owner read"
  on public.smart_link_clicks for select
  to authenticated
  using (public.is_profile_owner(profile_id));

grant select on table public.social_links, public.smart_links to anon, authenticated;
grant insert, update, delete on table public.social_links, public.smart_links to authenticated;
grant select on table public.smart_link_clicks to authenticated;
grant execute on function public.increment_smart_link_click_count(uuid) to anon, authenticated;
