-- Catalogue fields for projects.
--
-- A profile with five projects reads fine as a flat list. One with thirty needs
-- to say what kind of work each project is, how finished it is, and what it
-- actually did, without the reader opening every card.
--
-- `category` and `status` are free text for the same reason skills.category is:
-- the useful grouping differs by field, and a fixed taxonomy would be wrong for
-- most owners. Grouping happens at render time from this column.
--
-- `features` and `metrics` are arrays rather than prose inside `description`,
-- so a card can keep a short summary and disclose the detail on demand.
-- `metrics` holds results the owner can document; nothing here is computed.
--
-- Existing RLS policies remain in force. They are row-level, so the public
-- still reads only active projects on published profiles, new columns included.

alter table public.projects
  add column if not exists category text,
  add column if not exists status text,
  add column if not exists features text[] not null default '{}',
  add column if not exists metrics text[] not null default '{}';

comment on column public.projects.category is
  'Free-text grouping shown on the public profile, e.g. "Computer Vision & OCR".';
comment on column public.projects.status is
  'Free-text maturity label, e.g. "Production-ready" or "Prototype".';
comment on column public.projects.features is
  'Key features, one per element, disclosed on demand in the project card.';
comment on column public.projects.metrics is
  'Documented results, one per element. Owner-supplied, never computed.';
