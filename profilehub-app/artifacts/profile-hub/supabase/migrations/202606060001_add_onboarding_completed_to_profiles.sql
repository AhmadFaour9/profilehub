alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

update public.profiles
set onboarding_completed = true
where onboarding_completed = false
  and nullif(trim(username), '') is not null
  and nullif(trim(display_name), '') is not null
  and nullif(trim(title), '') is not null
  and nullif(trim(bio), '') is not null;
