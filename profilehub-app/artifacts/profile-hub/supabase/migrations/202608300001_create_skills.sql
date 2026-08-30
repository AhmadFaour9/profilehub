-- Skills for the public profile.
--
-- Stored one row per skill with a free-text category rather than a fixed
-- taxonomy, because the useful grouping differs by field: an engineer groups by
-- "Languages" and "Frameworks", a designer by "Tools" and "Disciplines".
-- Grouping happens at render time from this column.
--
-- Deliberately no proficiency percentage. A self-reported "Python 90%" carries
-- no information a reader can check, and inventing one is worse than omitting
-- it. `level` is optional free text so an owner can write something concrete
-- ("5 years", "production") only when they actually mean it.

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  name text not null,
  level text,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skills_name_not_blank check (length(trim(name)) > 0),
  constraint skills_category_not_blank check (length(trim(category)) > 0),
  constraint skills_unique_per_profile unique (profile_id, category, name)
);

create index if not exists skills_profile_position_idx
  on public.skills (profile_id, position);

alter table public.skills enable row level security;

drop policy if exists "skills: public read active+published" on public.skills;
create policy "skills: public read active+published"
  on public.skills for select
  using (is_active = true and public.is_profile_published(profile_id));

drop policy if exists "skills: owner all" on public.skills;
create policy "skills: owner all"
  on public.skills for all
  to authenticated
  using (public.is_profile_owner(profile_id))
  with check (public.is_profile_owner(profile_id));

grant select on table public.skills to anon, authenticated;
grant insert, update, delete on table public.skills to authenticated;
grant all on table public.skills to service_role;

drop trigger if exists skills_set_updated_at on public.skills;
create trigger skills_set_updated_at
  before update on public.skills
  for each row execute function public.set_updated_at();
