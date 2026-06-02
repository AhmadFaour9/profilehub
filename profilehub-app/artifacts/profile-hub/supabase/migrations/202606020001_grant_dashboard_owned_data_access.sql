-- Allow anon/authenticated roles to reach RLS policies.
-- RLS remains enabled; these grants only provide the table privileges needed
-- for the existing owner/public policies to evaluate.

grant usage on schema public to anon, authenticated;

grant select on table
  public.profiles,
  public.links,
  public.projects,
  public.services,
  public.media,
  public.themes
to anon, authenticated;

grant insert, update, delete on table
  public.profiles,
  public.links,
  public.projects,
  public.services,
  public.media,
  public.themes
to authenticated;

grant select on table
  public.page_views,
  public.link_clicks,
  public.audit_logs,
  public.ai_usage_logs,
  public.system_logs
to authenticated;

grant execute on function public.is_profile_owner(uuid) to authenticated;
grant execute on function public.is_profile_published(uuid) to anon, authenticated;
