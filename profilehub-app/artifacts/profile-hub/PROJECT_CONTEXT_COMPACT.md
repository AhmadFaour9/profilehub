# ProfileHub Project Context Compact

Last updated: 2026-08-29

This file is a compact handoff for continuing ProfileHub without needing the full previous conversation.

## What The Project Is

ProfileHub is a professional public profile builder. It lets a user create a public page at `/{username}` with profile information, social identity links, Smart Links, projects, services, gallery media, QR sharing, analytics, GitHub import, and AI-assisted writing.

Production domain:

```text
https://profilehub-two.vercel.app
```

Supabase project ref:

```text
kjwdeufxrhcckwvsekcd
```

Do not expose real keys or secrets in docs, commits, logs, or UI.

## Current Architecture

- Framework: Next.js 16 App Router with React 19 and TypeScript.
- Backend: Supabase Auth, Postgres, RLS, Storage.
- Deployment: Vercel, project root `artifacts/profile-hub`.
- Dashboard routes: `/dashboard/*`.
- Public route: `/[username]`.
- Public Smart Link redirect/tracking route: `/go/[linkId]`.
- Main data loader: `src/lib/profile-data.ts`.
- Main dashboard actions: `src/app/dashboard/actions.ts`.
- Auth clients: `src/modules/auth/server.ts`, `client.ts`, `admin.ts`.
- AI abstraction: `src/lib/ai/provider.ts`, `src/lib/ai/providers/*`, `src/modules/ai/services/AIService.ts`.

## Important Decisions Made

- Dashboard layout is the single source of dashboard route protection.
- Server Components/layouts use a read-only Supabase SSR client.
- Server Actions and Route Handlers use a writable Supabase SSR client.
- Admin/service role client is allowed only for privileged DB operations and fallback reads, never as the logged-in user session.
- RLS stays enabled.
- Smart Links are now the primary public link system.
- Social identity accounts are stored separately in `social_links`.
- Smart public action links are stored in `smart_links`.
- `profiles.social_links` is not used.
- Public profile uses cached reads and dashboard mutations revalidate profile paths/tags.
- QR codes point to `${APP_URL}/${username}`.
- OpenRouter uses a multi-model fallback chain.

## Problems Fixed So Far

### Auth And Session

Original issue:

- Login appeared successful.
- Dashboard opened briefly.
- Sidebar navigation redirected back to `/login`.
- Server actions sometimes returned "You must be logged in."
- A previous client guard showed "Refreshing your session" and could get stuck.

Final solution:

- `createSupabaseServerClientReadOnly()` is used for Server Components/layouts.
- `createSupabaseServerActionClient()` is used for Server Actions/Route Handlers.
- `loginWithPassword()` uses the writable client and validates that Supabase cookies were attempted and written.
- `auth/callback` exchanges codes/verifies OTP through writable SSR client.
- Dashboard layout checks authenticated user once.
- Duplicate client-side dashboard auth guards were avoided/removed.
- Server actions read current user from SSR cookies and then load `profile.id`.

Key files:

- `src/modules/auth/server.ts`
- `src/app/auth/actions.ts`
- `src/app/auth/callback/route.ts`
- `src/app/dashboard/layout.tsx`
- `src/lib/profile-data.ts`

### RLS, Grants, And Data Loading

Original issue:

- Dashboard data failed with permission errors for `links`, `projects`, `services`, and `media`.
- Missing content was incorrectly treated as login failure in some flows.

Final solution:

- Added grants while keeping RLS enabled.
- Ensured owner policies for dashboard-owned data.
- Dashboard relation loading returns empty arrays when content is missing/fails instead of logging out.
- Public profile loads active data only.

Important migrations:

- `202606020001_grant_dashboard_owned_data_access.sql`
- `202606040001_ensure_smart_links_table.sql`
- `202606060002_ensure_projects_owner_access.sql`

### Unexpected Logout

Issue:

- `/auth/logout` was observed in production logs during debugging.

Current state:

- Logout is explicit through logout action/route.
- Logout diagnostics log `logout_called`.
- Sidebar links should not point to logout.

### Smart Links And Social Links

Original issue:

- Multiple overlapping link systems caused confusion.
- Code attempted to write `profiles.social_links`, but the column did not exist.
- `smart_links` table was missing in production at one point.

Final solution:

- `social_links` table stores social identity accounts.
- `smart_links` table stores public action links.
- `saveSocialLinks()` upserts/updates/deactivates social link rows.
- Dashboard Links page manages Social Links and Smart Links separately.
- Public profile renders social row and active Smart Links.
- `/go/[linkId]` tracks clicks and redirects.

Important files:

- `src/views/dashboard/LinksManager.tsx`
- `src/app/dashboard/actions.ts`
- `src/app/go/[linkId]/route.ts`
- `src/components/profile/SmartLinkCard.tsx`

### Projects And GitHub Import

Original issues:

- GitHub import returned JSON parse errors when API returned non-JSON.
- Project images were weak or missing.
- Edit/Delete buttons did not work.
- Projects existed in Supabase but did not show in dashboard.
- AI Improve Description guessed a project instead of using the selected one.

Final solution:

- GitHub import/save API routes always return JSON.
- Unauthenticated GitHub import returns `401` JSON.
- README image extraction and GitHub social preview fallback were added.
- Imported repos save `image_url`.
- Projects query uses current user's `profile.id`.
- Owner RLS/grants were added/verified.
- Project edit/delete works through owner-scoped server actions.
- AI Improve Description sends selected project context and README context when available.
- UI shows whether live AI model or local fallback was used.

Important files:

- `src/views/dashboard/ProjectsManager.tsx`
- `src/app/api/integrations/github/import/route.ts`
- `src/app/api/integrations/github/save/route.ts`
- `src/lib/github-extractor.ts`
- `src/app/api/ai/project-description/route.ts`

Current state:

- Manual project creation is complete. The "Add Project" dialog collects title, tags, description, project URL, repo URL, and image URL, submits through the `createProject` server action, and updates local state on success. GitHub import, edit, and delete all work alongside it.

### Services

Original issue:

- Dashboard Services did not work.

Current state:

- Services CRUD works with owner-scoped server actions.
- Fields: title, description, price label, duration, CTA label, CTA URL, icon, image URL, active, sort order.
- Public profile displays active services only.

Important files:

- `src/views/dashboard/ServicesManager.tsx`
- `src/app/dashboard/actions.ts`
- `202606030002_extend_services_fields.sql`

### QR Code

Issue:

- QR code did not consistently point to the correct public profile URL.

Current state:

- QR uses `qrcode`.
- Target is built from `NEXT_PUBLIC_APP_URL`, `window.location.origin`, or production fallback.
- Username is encoded.
- Missing username shows "Set username to generate QR".
- QR can be downloaded as PNG.

Important files:

- `src/components/profile/QRButton.tsx`
- `src/lib/profile-url.ts`

### Email Templates And Password Reset

Current state:

- Branded templates exist for confirmation, email change, and recovery.
- `/auth/callback` supports OAuth, signup/email confirmation, email change, and password recovery.
- `/auth/status` shows branded success/error states.
- Password change from settings sends recovery email.
- `/auth/update-password` handles setting the new password after recovery callback.

Important files:

- `supabase/templates/confirmation.html`
- `supabase/templates/email_change.html`
- `supabase/templates/recovery.html`
- `src/app/auth/status/page.tsx`
- `src/app/auth/update-password/*`
- `src/app/dashboard/settings/actions.ts`

### Google OAuth

Current state:

- `/auth/google` starts Google OAuth.
- `/auth/callback` handles the OAuth code.
- New Google users get a profile created from Google metadata.
- Profile completeness is based on required fields: `username`, `display_name`, `title`, `bio`.
- Missing/incomplete profile redirects to `/onboarding`.
- Complete profile redirects to `/dashboard`.
- `profiles.onboarding_completed` migration exists and onboarding sets it when profile is complete.

Important files:

- `src/app/auth/google/route.ts`
- `src/app/auth/callback/route.ts`
- `src/lib/profile-data.ts`
- `202606060001_add_onboarding_completed_to_profiles.sql`

### AI And OpenRouter

Original issue:

- OpenRouter free models often returned 429/quota/provider errors, causing generic fallback.
- AI project description did not receive selected project context.

Current state:

- `AI_PROVIDER=openrouter`
- `OPENROUTER_MODELS` is a comma-separated priority list.
- Current suggested list:

```text
google/gemma-4-26b-a4b-it:free,meta-llama/llama-3.1-8b-instruct:free,mistralai/mistral-7b-instruct:free
```

- Old `OPENROUTER_MODEL` remains supported if `OPENROUTER_MODELS` is missing.
- Provider tries models in order.
- It retries next model on 400, 402, 404, 408, 429, 500, 502, 503, 504, timeout, model unavailable, quota, and rate limit.
- It does not retry model list on auth failures.
- If all models fail, AIService falls back to mock provider unless `AI_EXPOSE_PROVIDER_ERRORS=true`.
- UI shows `Live AI used: <model>` or `Live AI unavailable, local fallback used.`
- Tests cover provider selection, headers, fallback model ordering, quota fallback, timeout fallback, and prompt redaction.

Important files:

- `src/lib/ai/providers/openrouter.ts`
- `src/modules/ai/services/AIService.ts`
- `src/components/dashboard/AIHelperPanel.tsx`
- `src/views/dashboard/ProjectsManager.tsx`
- `tests/ai-provider.test.ts`

## Current Environment Variables

Use placeholders in docs and commits:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_or_anon_fallback
SUPABASE_SECRET_KEY=<supabase-secret-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
APP_URL=https://profilehub-two.vercel.app
NEXT_PUBLIC_APP_URL=https://profilehub-two.vercel.app
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=<openrouter-key>
OPENROUTER_MODELS=google/gemma-4-26b-a4b-it:free,meta-llama/llama-3.1-8b-instruct:free,mistralai/mistral-7b-instruct:free
OPENROUTER_MODEL=
AI_EXPOSE_PROVIDER_ERRORS=false
GEMINI_API_KEY=
GITHUB_TOKEN=
LOG_LEVEL=info
LOG_HASH_SALT=<random-secret>
```

## Dashboard State

- `/dashboard` overview loads profile content.
- `/dashboard/profile` edits profile basics and media.
- `/dashboard/links` manages Social Links and Smart Links.
- `/dashboard/projects` imports GitHub projects, edits/deletes projects, and runs AI description improvement.
- `/dashboard/services` has full Services CRUD.
- `/dashboard/gallery`, `/dashboard/theme`, `/dashboard/analytics`, and `/dashboard/settings` routes exist.
- Dashboard should never show demo content for authenticated users.
- Empty states are expected when no user-owned data exists.

## Public Profile State

- Route: `/[username]`.
- Public profile uses cached data with 300-second revalidate.
- Published profiles show active Smart Links, active services, active projects, social links, and gallery.
- Page view beacon records views.
- QR/share button is available in profile header.

## Current Risks

- The Supabase project pauses on the free tier after about 7 days of inactivity. When paused it serves no API keys and no connections, so Vercel keeps serving the frontend while every data-backed page fails. Check `npx supabase projects list` first when debugging "everything is broken".
- Production Supabase migrations must be applied manually when new migration files are added.
- Free OpenRouter models may remain unreliable; multi-model fallback reduces but does not eliminate fallback use.
- GitHub image extraction is best-effort.
- Supabase email templates must be manually pasted into the hosted Supabase Dashboard.
- Next.js warns that `middleware` convention is deprecated in favor of `proxy`.
- Public caching can delay externally edited data until revalidation.
- Root workspace tooling has Windows friction; use the documented commands.

## Next Recommended Phase

See `NEXT_STEPS.md` for the authoritative, current task list. In short:

1. Restore the paused Supabase project — it is `INACTIVE` and blocks everything.
2. Run a full production smoke test in incognito:
   - login
   - dashboard navigation
   - profile update
   - Smart Links CRUD
   - Services CRUD
   - GitHub import
   - AI project description
   - public profile
   - QR
   - logout
3. Add Playwright E2E coverage for auth and dashboard CRUD.
4. Review production logs after deploy for OpenRouter model fallback rates and Supabase errors.
5. Polish UI/UX and performance.
6. Harden launch configuration and security checklist.
