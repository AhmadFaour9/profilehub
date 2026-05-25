-- ============================================================================
-- ProfileHub — Seed Data for Local Development
-- Run: psql $DATABASE_URL -f supabase/seed.sql
-- ============================================================================
-- NOTE: This seed assumes a test user already exists in auth.users.
-- When using Supabase locally, create a user via the Auth UI or Dashboard first,
-- then replace the user_id below with the actual UUID.
-- ============================================================================

-- You can use any UUID here for testing. Replace with a real auth.users.id
-- after creating a user via the Supabase Dashboard.
-- Example: INSERT INTO auth.users (id, email) VALUES ('...', 'test@example.com');

do $$
declare
  v_user_id uuid := '00000000-0000-0000-0000-000000000001';
  v_profile_id uuid;
  v_link1_id uuid;
  v_link2_id uuid;
  v_link3_id uuid;
  v_project1_id uuid;
  v_project2_id uuid;
begin
  -- ── 1. Create test user in auth.users (if local/dev) ─────────────────────
  -- Supabase local dev: this inserts a fake auth user for seeding.
  -- In production, users come through the auth flow.
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    confirmation_token
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test@profilehub.dev',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"display_name": "Sara Al-Hassan", "username": "sara-dev"}'::jsonb,
    ''
  ) on conflict (id) do nothing;

  -- ── 2. Profile ───────────────────────────────────────────────────────────
  insert into public.profiles (id, user_id, username, display_name, title, bio, location, website, is_published)
  values (
    gen_random_uuid(),
    v_user_id,
    'sara-dev',
    'Sara Al-Hassan',
    'Full-Stack Developer & UI Designer',
    'Building beautiful, accessible web experiences. Passionate about design systems, React, and open source.',
    'Dubai, UAE',
    'https://sara.dev',
    true
  )
  returning id into v_profile_id;

  -- ── 3. Links ─────────────────────────────────────────────────────────────
  insert into public.links (id, profile_id, title, url, description, icon, type, position, is_active, click_count)
  values
    (gen_random_uuid(), v_profile_id, 'Portfolio', 'https://sara.dev', 'My personal portfolio', 'globe', 'website', 0, true, 142)
  returning id into v_link1_id;

  insert into public.links (id, profile_id, title, url, description, icon, type, position, is_active, click_count)
  values
    (gen_random_uuid(), v_profile_id, 'GitHub', 'https://github.com/sara-dev', 'Open source projects', 'github', 'social', 1, true, 89)
  returning id into v_link2_id;

  insert into public.links (id, profile_id, title, url, description, icon, type, position, is_active, click_count)
  values
    (gen_random_uuid(), v_profile_id, 'LinkedIn', 'https://linkedin.com/in/sara-dev', 'Professional network', 'linkedin', 'social', 2, true, 67)
  returning id into v_link3_id;

  -- ── 4. Projects ──────────────────────────────────────────────────────────
  insert into public.projects (id, profile_id, title, description, project_url, tags, position, is_featured, is_active)
  values
    (gen_random_uuid(), v_profile_id, 'Design System', 'A comprehensive React component library with 50+ accessible components.', 'https://github.com/sara-dev/design-system', array['React', 'TypeScript', 'Storybook'], 0, true, true)
  returning id into v_project1_id;

  insert into public.projects (id, profile_id, title, description, project_url, tags, position, is_featured, is_active)
  values
    (gen_random_uuid(), v_profile_id, 'CLI Dashboard', 'Beautiful terminal dashboards for monitoring microservices.', 'https://github.com/sara-dev/cli-dash', array['Go', 'TUI', 'DevOps'], 1, false, true)
  returning id into v_project2_id;

  -- ── 5. Services ──────────────────────────────────────────────────────────
  insert into public.services (profile_id, title, description, price_label, cta_label, cta_url, position, is_active)
  values
    (v_profile_id, 'UI/UX Consultation', 'One-hour design review session for your product.', '$120/hr', 'Book Now', 'https://cal.com/sara-dev', 0, true),
    (v_profile_id, 'Full-Stack Development', 'End-to-end web application development using Next.js and Supabase.', 'From $2,000', 'Get a Quote', 'mailto:hello@sara.dev', 1, true);

  -- ── 6. Sample Analytics ──────────────────────────────────────────────────
  insert into public.page_views (profile_id, visitor_id_hash, device, created_at)
  select
    v_profile_id,
    md5(random()::text),
    (array['desktop', 'mobile', 'tablet'])[floor(random() * 3 + 1)],
    now() - (random() * interval '14 days')
  from generate_series(1, 50);

  insert into public.link_clicks (profile_id, link_id, visitor_id_hash, created_at)
  select
    v_profile_id,
    (array[v_link1_id, v_link2_id, v_link3_id])[floor(random() * 3 + 1)],
    md5(random()::text),
    now() - (random() * interval '14 days')
  from generate_series(1, 25);

  raise notice 'Seed complete. Profile ID: %', v_profile_id;
end;
$$;
