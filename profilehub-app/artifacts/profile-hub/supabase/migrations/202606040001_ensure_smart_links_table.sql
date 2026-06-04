-- Ensure the Smart Links table exists in production.
-- This migration is intentionally idempotent so it can repair environments
-- where the earlier smart/social links migration was not applied.

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
  updated_at timestamptz not null default now()
);

alter table public.smart_links
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists title text,
  add column if not exists url text,
  add column if not exists description text,
  add column if not exists icon text,
  add column if not exists image_url text,
  add column if not exists category text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0,
  add column if not exists click_count integer not null default 0,
  add column if not exists last_clicked_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.smart_links
  alter column id set default gen_random_uuid(),
  alter column is_featured set default false,
  alter column is_active set default true,
  alter column sort_order set default 0,
  alter column click_count set default 0,
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'smart_links_url_valid'
      and conrelid = 'public.smart_links'::regclass
  ) then
    alter table public.smart_links
      add constraint smart_links_url_valid
      check (url ~* '^https?://');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'smart_links_image_url_valid'
      and conrelid = 'public.smart_links'::regclass
  ) then
    alter table public.smart_links
      add constraint smart_links_image_url_valid
      check (image_url is null or image_url = '' or image_url ~* '^https?://');
  end if;
end;
$$;

create index if not exists smart_links_profile_id_idx
  on public.smart_links(profile_id);

create index if not exists smart_links_profile_sort_idx
  on public.smart_links(profile_id, sort_order);

create index if not exists smart_links_profile_active_idx
  on public.smart_links(profile_id, is_active);

create index if not exists smart_links_profile_featured_idx
  on public.smart_links(profile_id, is_featured);

alter table public.smart_links enable row level security;

drop policy if exists "smart_links: public read active+published" on public.smart_links;
create policy "smart_links: public read active+published"
  on public.smart_links for select
  to anon, authenticated
  using (is_active = true and public.is_profile_published(profile_id));

drop policy if exists "smart_links: owner all" on public.smart_links;
create policy "smart_links: owner all"
  on public.smart_links for all
  to authenticated
  using (public.is_profile_owner(profile_id))
  with check (public.is_profile_owner(profile_id));

drop policy if exists "smart_links: service role all" on public.smart_links;
create policy "smart_links: service role all"
  on public.smart_links for all
  to service_role
  using (true)
  with check (true);

drop trigger if exists smart_links_updated_at on public.smart_links;

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'create trigger smart_links_updated_at before update on public.smart_links for each row execute function public.set_updated_at()';
  end if;
end;
$$;

grant select on table public.smart_links to anon, authenticated;
grant insert, update, delete on table public.smart_links to authenticated;
grant all on table public.smart_links to service_role;
