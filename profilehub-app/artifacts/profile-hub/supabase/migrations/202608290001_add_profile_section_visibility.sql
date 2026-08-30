-- Per-section visibility for the public profile.
--
-- Stored as a single jsonb object rather than one column per section so adding
-- a section later needs no migration. Unknown or missing keys fall back to
-- visible in application code, so existing profiles keep rendering exactly as
-- they do today.

alter table public.profiles
  add column if not exists section_visibility jsonb not null default '{}'::jsonb;

comment on column public.profiles.section_visibility is
  'Per-section public profile visibility. Missing keys default to visible.';

-- Guard against a non-object value reaching the renderer.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_section_visibility_is_object'
  ) then
    alter table public.profiles
      add constraint profiles_section_visibility_is_object
      check (jsonb_typeof(section_visibility) = 'object');
  end if;
end $$;
