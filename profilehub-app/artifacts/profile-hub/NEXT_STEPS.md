# ProfileHub Next Steps

This file captures the recommended next phase after the current auth, dashboard, Smart Links, Services, GitHub import, QR, email, and AI fixes.

## Immediate Next Steps

1. Deploy the latest `main` branch through Vercel.
2. Apply pending Supabase migrations if production is behind:

```bash
npx supabase db push
```

3. Confirm Vercel environment variables:

```text
APP_URL=https://profilehub-two.vercel.app
NEXT_PUBLIC_APP_URL=https://profilehub-two.vercel.app
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=<set in Vercel>
OPENROUTER_MODELS=google/gemma-4-26b-a4b-it:free,meta-llama/llama-3.1-8b-instruct:free,mistralai/mistral-7b-instruct:free
```

4. Confirm Supabase Auth URLs:

```text
Site URL: https://profilehub-two.vercel.app
Redirect URL: https://profilehub-two.vercel.app/auth/callback
```

5. Paste or verify Supabase hosted email templates:
   - Confirm signup
   - Change email address
   - Reset password
6. Complete manual Project creation UI in `/dashboard/projects`.
7. Run a production smoke test from an incognito browser.

## Production Smoke Test

Run this after every deploy that touches auth, RLS, dashboard data, AI, or public profile rendering.

- Open `/login`.
- Login with email/password.
- Confirm redirect to `/dashboard` or expected `next` path.
- Wait 60 seconds and confirm no session refresh loop.
- Navigate every dashboard sidebar route:
  - `/dashboard`
  - `/dashboard/profile`
  - `/dashboard/links`
  - `/dashboard/projects`
  - `/dashboard/services`
  - `/dashboard/gallery`
  - `/dashboard/theme`
  - `/dashboard/analytics`
  - `/dashboard/settings`
- Refresh each dashboard route.
- Open `/dashboard/projects` directly in a new tab.
- Update profile information.
- Save social links.
- Create, edit, feature, disable, reorder, and delete a Smart Link.
- Click a Smart Link on the public profile and confirm `/go/[linkId]` redirects.
- Create, edit, disable, reorder, and delete a Service.
- Import a GitHub repository.
- Edit/delete imported project.
- Use AI Improve Description on a selected project.
- Open public profile at `/{username}`.
- Confirm QR URL points to `https://profilehub-two.vercel.app/{username}`.
- Logout.
- Confirm dashboard redirects to login only after logout.

## Performance Optimization Plan

- Profile data loading:
  - Keep `getDashboardProfile()` cached per request.
  - Avoid duplicate `getUser()` calls in nested dashboard pages.
  - Continue loading dashboard relations in parallel with `Promise.all`.
  - Avoid repeated `getOrCreateProfile()` calls when profile is already available.
- Public profile:
  - Keep public profile cache and revalidation tags.
  - Add more granular revalidation tags if public pages grow.
- Dashboard UI:
  - Use route loading skeletons for slower pages.
  - Avoid fetching expensive relation data in sidebar render paths.
  - Keep private dashboard data uncached publicly.
- Database:
  - Review indexes for `smart_links`, `projects`, `services`, `media`, `page_views`, and click tables.
  - Add query timing logs only behind debug logging.
- Logging:
  - Keep production logs to warn/error unless `LOG_LEVEL=debug`.
  - Do not log token, cookie, password, or prompt bodies.

## AI Improvement Plan

- Monitor OpenRouter logs:
  - attempted model
  - selected model
  - fallback reason
  - rate limit/quota frequency
- Add per-feature prompt evaluation:
  - Generate Bio
  - Improve Bio
  - Suggest Smart Links
  - Improve Project Description
- Improve project context:
  - Use README content when available.
  - Extract technologies more accurately.
  - Include repo topics if fetched from GitHub.
  - Avoid guessing when selected project context is missing.
- Add UI affordances:
  - Show selected provider/model.
  - Allow accepting AI output into the relevant form.
  - Show clear local fallback message.
- Add tests:
  - Provider fallback chain.
  - JSON parsing of project description variants.
  - Missing project context returns "No project selected".
- Consider paid/stable OpenRouter models for production reliability after launch.

## UI/UX Polish Plan

- Finish manual Project creation modal/form.
- Add inline previews for Smart Link thumbnails and service images.
- Improve empty states with one clear primary action each.
- Add drag-and-drop ordering for:
  - Smart Links
  - Projects
  - Services
  - Gallery
- Improve mobile dashboard ergonomics.
- Add clearer save states and disabled states for slow server actions.
- Add profile completion indicators.
- Add public profile theme previews before saving.
- Improve analytics dashboard density and top-link summaries.
- Review contrast, focus states, and keyboard navigation.

## Production Hardening Checklist

- Vercel:
  - Production branch is correct.
  - Project root is `artifacts/profile-hub`.
  - `APP_URL` and `NEXT_PUBLIC_APP_URL` use the production domain.
  - No old preview domains in env.
  - Build succeeds.
- Supabase:
  - All migrations applied.
  - RLS enabled.
  - Grants match migrations.
  - Storage buckets exist.
  - Auth redirect URLs correct.
  - Google provider configured.
  - Hosted email templates updated.
- Observability:
  - `LOG_LEVEL=info` or `warn` in production.
  - Debug logs can be enabled temporarily.
  - OpenRouter fallback events are searchable.
  - Auth callback/session events do not leak secrets.
- Data:
  - Empty dashboard states render cleanly.
  - Public profile not found returns 404.
  - Owner CRUD cannot mutate other users' rows.

## Security Checklist

- Never expose:
  - `SUPABASE_SECRET_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENROUTER_API_KEY`
  - OAuth client secrets
  - Supabase access/refresh tokens
  - Auth cookies
  - Passwords
- Confirm:
  - Admin client is server-only.
  - Browser client never uses service role key.
  - Server actions use current session user from cookies.
  - Mutations scope by current user's `profile.id`.
  - Public reads only show published/active content.
  - Link redirect validates destination URL.
  - Password updates use Supabase Auth, not direct DB writes.
  - Logs include IDs and status only, not full payloads.
- Add:
  - E2E authorization checks for cross-user CRUD denial.
  - Rate limits for public tracking routes if abuse appears.
  - CSP/security headers review before launch.

## Launch Checklist

- Apply migrations to production.
- Verify Vercel env and Supabase Auth URL settings.
- Verify Google OAuth end-to-end.
- Verify email confirmation and password recovery end-to-end.
- Run production smoke test.
- Create at least one polished real profile.
- Test public profile SEO metadata.
- Test QR code from mobile camera.
- Test Smart Link tracking from public profile.
- Test OpenRouter live AI and fallback UI.
- Confirm no demo content in authenticated dashboard.
- Confirm no secrets in logs.
- Confirm `npm run typecheck` and `npm run build` pass locally before release.
- Tag a release or record the deploy commit.
