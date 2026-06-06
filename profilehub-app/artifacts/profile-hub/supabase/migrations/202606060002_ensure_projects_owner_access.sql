-- Ensure dashboard projects remain readable/writeable by the owning
-- authenticated user. RLS stays enabled; these grants only let policies run.

grant usage on schema public to anon, authenticated;

grant select on table public.projects to anon, authenticated;
grant insert, update, delete on table public.projects to authenticated;
grant all on table public.projects to service_role;

drop policy if exists "projects: public read active+published" on public.projects;
create policy "projects: public read active+published"
  on public.projects for select
  using (is_active = true and public.is_profile_published(profile_id));

drop policy if exists "projects: owner all" on public.projects;
create policy "projects: owner all"
  on public.projects for all
  to authenticated
  using (public.is_profile_owner(profile_id))
  with check (public.is_profile_owner(profile_id));

grant execute on function public.is_profile_owner(uuid) to authenticated;
grant execute on function public.is_profile_published(uuid) to anon, authenticated;
