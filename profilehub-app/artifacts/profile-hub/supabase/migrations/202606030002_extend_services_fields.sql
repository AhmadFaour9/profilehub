-- Add the fields required by the dashboard Services CRUD.
-- Existing RLS policies remain in force: public reads active services on
-- published profiles, and authenticated owners can manage their own services.

alter table public.services
  add column if not exists duration text,
  add column if not exists icon text,
  add column if not exists image_url text,
  add column if not exists sort_order integer not null default 0;

update public.services
set sort_order = position
where sort_order = 0
  and position <> 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'services_image_url_valid'
      and conrelid = 'public.services'::regclass
  ) then
    alter table public.services
      add constraint services_image_url_valid
      check (image_url is null or image_url = '' or image_url ~* '^https?://');
  end if;
end;
$$;

create index if not exists services_profile_sort_order_idx
  on public.services(profile_id, sort_order);
