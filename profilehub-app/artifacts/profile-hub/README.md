# ProfileHub

ProfileHub is a Next.js App Router application for building a public professional profile with Smart Links, projects, services, gallery media, QR sharing, GitHub project import, analytics, and AI-assisted content generation.

Production domain:

```text
https://profilehub-two.vercel.app
```

Supabase project ref currently used in production documentation:

```text
kjwdeufxrhcckwvsekcd
```

Do not commit real API keys, Supabase secrets, service role keys, OAuth secrets, or OpenRouter keys.

## Main Features

- Email/password login and registration with Supabase Auth.
- Google OAuth login through Supabase.
- Email confirmation, email change confirmation, password recovery, and branded auth status pages.
- Protected dashboard routes under `/dashboard`.
- Public profile route at `/[username]`.
- Profile editor for display name, username, profession/title, bio, location, website, avatar, cover, SEO title, and SEO description.
- Dedicated Social Links storage through `social_links`.
- Smart Links as the main public action link system through `smart_links`.
- Smart Link click tracking through `/go/[linkId]`.
- Project showcase with GitHub import, README/social-preview image fallback, edit, delete, and AI description improvement.
- Services CRUD with price, duration, CTA, image/icon, active state, and sort order.
- Gallery/media support.
- QR code generation for `${APP_URL}/${username}` with PNG download.
- Public profile rendering order: profile header, social links row, featured/active Smart Links, projects, services, gallery.
- Analytics tables for page views, link clicks, and AI usage.
- OpenRouter AI provider with multi-model fallback and local mock fallback.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase Auth, Postgres, RLS, Storage
- `@supabase/ssr` and `@supabase/supabase-js`
- Tailwind CSS 4
- Radix UI primitives
- Lucide icons
- Zod validation
- Vitest tests
- OpenRouter chat completions API
- Optional Gemini provider
- Vercel deployment

## Architecture Overview

The app is organized around a server-first dashboard and public profile.

- Server Components and layouts use a read-only Supabase SSR client for session reads.
- Server Actions and Route Handlers use a writable Supabase SSR client so auth cookies can be written.
- Dashboard route protection lives in `src/app/dashboard/layout.tsx`.
- Dashboard data is loaded through `src/lib/profile-data.ts`.
- Dashboard mutations live mainly in `src/app/dashboard/actions.ts`.
- Auth server helpers live in `src/modules/auth/server.ts`.
- Admin database fallback helpers live in `src/lib/supabase-admin-resolver.ts` and `src/modules/auth/admin.ts`.
- AI provider selection starts in `src/lib/ai/provider.ts` and module service logic lives in `src/modules/ai/services/AIService.ts`.
- Public profile reads are cached with `unstable_cache` and revalidated by profile/dashboard actions.

The admin/service role client is used only for privileged backend operations and public/profile fallback reads. It must not represent a logged-in user session.

## Folder Structure

```text
artifacts/profile-hub/
  src/
    app/
      [username]/                    Public profile route
      auth/                          Auth callback, Google OAuth, logout, status, update-password
      dashboard/                     Protected dashboard routes and server actions
      api/                           AI, analytics, GitHub import, debug APIs
      go/[linkId]/                   Smart Link click tracking redirect
    components/
      dashboard/                     Dashboard shared UI and AI helper
      profile/                       Public profile cards, QR, header, beacon
      ui/                            UI primitives
    lib/
      ai/                            AI provider abstraction and prompts
      profile-data.ts                Dashboard/public profile data loading
      env.ts                         Env helpers
      profile-url.ts                 APP_URL/profile URL helpers
      github-extractor.ts            GitHub README/image extraction
      supabase-admin-*               Admin key validation and DB fallback
    modules/
      auth/                          Supabase browser/server/admin clients
      profile/                       Profile repositories/services
      analytics/                     Analytics service/repository
      ai/                            AI domain/service/repositories/providers
      logging/                       App logging
      shared/                        Shared types, validation, security
      storage/                       Storage upload helpers
    views/
      dashboard/                     Dashboard feature managers
  supabase/
    migrations/                      Database schema, RLS, grants, storage
    templates/                       Auth email templates
    config.toml                      Local Supabase config
  tests/                             Vitest tests
  public/                            Static assets
```

## Auth System

Auth is Supabase Auth with App Router SSR cookies.

Important files:

- `src/modules/auth/server.ts`
- `src/modules/auth/client.ts`
- `src/modules/auth/admin.ts`
- `src/app/auth/actions.ts`
- `src/app/auth/callback/route.ts`
- `src/app/auth/google/route.ts`
- `src/app/auth/logout/route.ts`
- `src/app/dashboard/layout.tsx`

Current auth pattern:

1. Login server action calls `supabase.auth.signInWithPassword`.
2. Login uses `createSupabaseServerActionClient("login")` so Supabase cookies are written in a writable context.
3. Auth callback uses `exchangeCodeForSession` or `verifyOtp` through the writable server action client.
4. Dashboard layout uses `getDashboardProfile()`, which uses `getDashboardAuthenticatedUser()` and a read-only Supabase SSR client.
5. Dashboard layout redirects to `/login?next=/dashboard` only when no authenticated user exists.
6. Server actions call `getAuthenticatedUser("server_action")`, load the current user from cookies, then resolve the current user's profile.
7. Child dashboard pages should not implement competing client auth guards.

Safe auth diagnostics exist behind the logging helpers. They log cookie names and user ids only, not token values.

## Supabase Setup

Required Supabase services:

- Auth
- PostgreSQL
- Row Level Security
- Storage
- Google OAuth provider if Google login is enabled

Apply migrations from `supabase/migrations` in order. For remote Supabase:

```bash
npx supabase db push
```

Required production Auth URL settings:

```text
Site URL: https://profilehub-two.vercel.app
Redirect URL: https://profilehub-two.vercel.app/auth/callback
```

For local development:

```text
Site URL: http://localhost:24359
Redirect URL: http://localhost:24359/auth/callback
```

## Vercel Deployment

Vercel project root should be:

```text
artifacts/profile-hub
```

Set production environment variables in Vercel. Important:

```text
APP_URL=https://profilehub-two.vercel.app
NEXT_PUBLIC_APP_URL=https://profilehub-two.vercel.app
```

Do not use old Vercel preview domains in `APP_URL`.

Build command:

```bash
npm run build
```

Useful verification:

```bash
npm run typecheck
npm run build
```

## Environment Variables

Use placeholders only in committed files.

```bash
# Supabase public browser/server-session config
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_or_anon_fallback

# Supabase server-only privileged config
SUPABASE_SECRET_KEY=<supabase-secret-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>

# Application URL
APP_URL=https://profilehub-two.vercel.app
NEXT_PUBLIC_APP_URL=https://profilehub-two.vercel.app

# AI
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=<openrouter-key>
OPENROUTER_MODELS=google/gemma-4-26b-a4b-it:free,meta-llama/llama-3.1-8b-instruct:free,mistralai/mistral-7b-instruct:free
OPENROUTER_MODEL=
AI_EXPOSE_PROVIDER_ERRORS=false
GEMINI_API_KEY=

# Optional GitHub API token for higher GitHub API limits
GITHUB_TOKEN=

# Logging/security
LOG_LEVEL=info
LOG_HASH_SALT=<random-secret>
```

Public key selection order:

1. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Admin key selection order:

1. `SUPABASE_SECRET_KEY`
2. `SUPABASE_SERVICE_ROLE_KEY`

Admin keys are validated and must remain server-only.

## Database Migrations

Migration files:

- `202605240001_initial_schema.sql`
  - Core tables: `profiles`, `links`, `projects`, `services`, `media`, `themes`, `page_views`, `link_clicks`, `audit_logs`, `ai_usage_logs`, `system_logs`.
  - Initial RLS, helper functions, storage buckets, storage policies, and triggers.
- `202606020001_grant_dashboard_owned_data_access.sql`
  - Grants required table privileges while keeping RLS enabled.
- `202606030001_create_smart_and_social_links.sql`
  - Creates `social_links`, `smart_links`, `smart_link_clicks`, click increment function, RLS, grants, and migration from legacy links/social data.
- `202606030002_extend_services_fields.sql`
  - Extends services with sort order, duration, CTA, icon/image fields.
- `202606040001_ensure_smart_links_table.sql`
  - Ensures `smart_links` exists with expected fields, indexes, policies, service role access, and updated-at trigger.
- `202606060001_add_onboarding_completed_to_profiles.sql`
  - Adds `profiles.onboarding_completed` and backfills complete profiles.
- `202606060002_ensure_projects_owner_access.sql`
  - Ensures owner CRUD grants and policies for projects.
- `create_storage_buckets.sql`
  - Helper for creating required buckets when needed.

RLS remains enabled. Policies are ownership-based for dashboard data and public-read-only for active content on published profiles.

## Storage Buckets

Required public buckets:

- `avatars`
- `covers`
- `project-media`
- `gallery-media`

Files are stored under:

```text
{user_id}/{uuid}.{extension}
```

Upload policies restrict writes to the owning user folder. Public read is enabled for these public media buckets.

## Google OAuth Setup

In Supabase Dashboard:

1. Go to Authentication > Providers.
2. Enable Google.
3. Add Google OAuth client ID and secret.
4. Add redirect URL:

```text
https://profilehub-two.vercel.app/auth/callback
```

Google OAuth entry route:

```text
/auth/google
```

Callback behavior:

- Exchanges OAuth code for session.
- Loads current auth user.
- Checks profile completeness using required fields: `username`, `display_name`, `title`, `bio`.
- Creates a profile from Google metadata when missing.
- Redirects new or incomplete users to `/onboarding`.
- Redirects complete users to `/dashboard`.

## AI Provider Setup

AI is called through:

- `POST /api/ai`
- `POST /api/ai/project-description`

Provider selection:

- `AI_PROVIDER=openrouter` uses OpenRouter.
- `AI_PROVIDER=mock` forces local mock suggestions.
- Gemini exists as an alternate provider if configured.

AI usage is rate-limited to 20 requests per user per day with `ai_usage_logs`.

Supported features:

- Generate Bio
- Improve Bio
- Suggest Smart Links
- Improve Project Description
- Additional prompt actions in `src/lib/ai/prompts.ts`

## OpenRouter Setup

Set:

```bash
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=<openrouter-key>
OPENROUTER_MODELS=google/gemma-4-26b-a4b-it:free,meta-llama/llama-3.1-8b-instruct:free,mistralai/mistral-7b-instruct:free
```

`OPENROUTER_MODELS` is a comma-separated priority list. ProfileHub tries models in order and stops at the first successful response.

Fallback behavior:

- Tries next model on `400`, `402`, `404`, `408`, `429`, `500`, `502`, `503`, `504`, model unavailable, quota exceeded, rate limit, bad request, and timeout.
- Does not retry model list for auth failures.
- Falls back to mock provider after all live models fail.
- UI displays either `Live AI used: <model>` or `Live AI unavailable, local fallback used.`

OpenRouter request headers:

```text
Authorization: Bearer <OPENROUTER_API_KEY>
Content-Type: application/json
HTTP-Referer: https://profilehub-two.vercel.app
X-Title: ProfileHub
```

## GitHub Import Feature

Routes:

- `POST /api/integrations/github/import`
- `POST /api/integrations/github/save`

Flow:

1. User enters a GitHub username or repository URL.
2. API fetches public repository metadata.
3. README images are parsed when possible.
4. Badge-like images are ignored.
5. Image fallback uses GitHub social preview:

```text
https://opengraph.githubassets.com/1/{owner}/{repo}
```

6. Selected repos are saved to `projects` for the current user's `profile_id`.

The API always returns JSON for success and failure. Unauthenticated requests return `401` JSON instead of redirect HTML.

## Smart Links System

Smart Links are stored in `public.smart_links`.

Fields include:

- `id`
- `profile_id`
- `title`
- `url`
- `description`
- `icon`
- `image_url`
- `category`
- `is_featured`
- `is_active`
- `sort_order`
- `click_count`
- `last_clicked_at`
- timestamps

Dashboard supports:

- Create
- Edit
- Delete
- Enable/disable
- Feature/unfeature
- Reorder
- Thumbnail/image URL
- Click count display

Public clicks should use:

```text
/go/[linkId]
```

The redirect route inserts into `smart_link_clicks`, increments `smart_links.click_count`, updates `last_clicked_at`, and redirects to the destination URL.

## Social Links System

Social identity links are stored separately in `public.social_links`, not in `profiles`.

Supported dashboard fields:

- LinkedIn
- GitHub
- X/Twitter
- Instagram
- YouTube
- Behance
- Dribbble
- Facebook
- TikTok
- WhatsApp
- Email

Cleared social fields are deactivated. Existing social links are loaded back into the form.

## Projects System

Projects are stored in `public.projects` and belong to the current user's `profile_id`.

Dashboard supports:

- GitHub import
- Edit
- Delete
- Image URL rendering with fallback handling
- AI Improve Description for the selected project

Public profile displays active projects only.

Project AI workflow:

1. Selected project sends `projectId`, title, current description, repo URL, project URL, tags, and README context when available.
2. AI returns improved, shorter, marketing, and technical versions.
3. User accepts one version.
4. The selected project is updated through the owner-scoped server action.

Known project limitation:

- The manual `Add Project` button is present, but the current visible create flow is not fully wired in `ProjectsManager`. GitHub import and edit/delete are implemented.

## Services System

Services are stored in `public.services` and belong to the current user's `profile_id`.

Dashboard supports:

- Create
- Edit
- Delete
- Reorder
- Enable/disable
- Title
- Description
- Price label
- Duration
- CTA label
- CTA URL or mail link
- Icon
- Image URL

Public profile displays active services only.

## Public Profile Route

Public profiles render at:

```text
/{username}
```

Example:

```text
https://profilehub-two.vercel.app/AhmadFaour1
```

Implementation:

- Route: `src/app/[username]/page.tsx`
- Component: `src/components/profile/PublicProfile.tsx`
- Data: `getPublicProfileCached(username)` with 300-second revalidation.

Public profile rendering order:

1. Profile header
2. Social links row
3. Active/featured Smart Links
4. Projects
5. Services
6. Gallery

## QR Code Feature

QR generation uses the `qrcode` package in `src/components/profile/QRButton.tsx`.

QR target:

```text
${APP_URL}/${username}
```

Client-side base URL selection:

1. `NEXT_PUBLIC_APP_URL`
2. `window.location.origin`
3. `https://profilehub-two.vercel.app`

If username is missing, the UI shows `Set username to generate QR`.

## Email Templates and Password Reset Flow

Templates live in:

```text
supabase/templates/confirmation.html
supabase/templates/email_change.html
supabase/templates/recovery.html
```

Copy them into Supabase Dashboard:

1. Authentication > Email Templates > Confirm signup
2. Authentication > Email Templates > Change email address
3. Authentication > Email Templates > Reset password

Password recovery flow:

1. User requests password change/reset.
2. Supabase sends recovery email.
3. Email link lands on `/auth/callback?type=password_recovery`.
4. Callback exchanges/verifies session.
5. User is redirected to `/auth/update-password`.
6. User enters new password.
7. `supabase.auth.updateUser({ password })` updates password.
8. User sees `/auth/status` success/failure screen as appropriate.

Email change flow:

1. Settings calls `supabase.auth.updateUser({ email })`.
2. Supabase sends confirmation email.
3. Callback handles `type=email_change`.
4. User sees branded status page.

## Common Troubleshooting

### Dashboard redirects to login after login

Check:

- Login uses `createSupabaseServerActionClient("login")`.
- Dashboard layout uses read-only SSR client.
- `APP_URL` matches the real production domain.
- Supabase redirect URL includes `/auth/callback`.
- Browser has Supabase auth cookies for the same domain.

### `permission denied for table ...`

Run migrations and confirm grants/policies:

- `202606020001_grant_dashboard_owned_data_access.sql`
- `202606040001_ensure_smart_links_table.sql`
- `202606060002_ensure_projects_owner_access.sql`

RLS should stay enabled.

### `Could not find table smart_links`

Apply:

```text
supabase/migrations/202606040001_ensure_smart_links_table.sql
```

Then restart/redeploy if Supabase schema cache needs refresh.

### Social links save fails with invalid URL

Social link URLs must satisfy validation. Use `https://...` or `mailto:...` depending on the platform.

### OpenRouter falls back to local mock

Check:

- `AI_PROVIDER=openrouter`
- `OPENROUTER_API_KEY` exists in Vercel
- `OPENROUTER_MODELS` contains valid model ids
- Vercel logs for `openrouter_http_error`, `fallbackReason`, and attempted model
- Free OpenRouter models can be rate-limited or temporarily unavailable

### GitHub import returns JSON parse error

The current API routes always return JSON. If this reappears, verify the deployed commit is current and the request is not hitting a Vercel/auth redirect HTML response.

### Build warning about middleware

Next.js currently warns:

```text
The "middleware" file convention is deprecated. Please use "proxy" instead.
```

This is a known framework migration item, not a current runtime blocker.

## Useful Commands

From `artifacts/profile-hub`:

```bash
npm run dev
npm run typecheck
npm run build
npm run lint
npm run test
```

From workspace root with Corepack:

```bash
corepack pnpm --filter @workspace/profile-hub dev
corepack pnpm --filter @workspace/profile-hub run typecheck
corepack pnpm --filter @workspace/profile-hub run build
corepack pnpm --filter @workspace/profile-hub run test
```

Apply Supabase migrations:

```bash
npx supabase db push
```

Inspect production deployment:

```bash
npx vercel inspect https://profilehub-two.vercel.app
npx vercel logs https://profilehub-two.vercel.app --limit 50 --expand
```

## Current Known Limitations

- Manual Project create button is present but the create modal/action is not fully wired in the visible projects UI. GitHub import, edit, delete, and AI improve are implemented.
- Free OpenRouter models can be unavailable, quota-limited, or rate-limited; the app now tries multiple models and then falls back locally.
- Public profile caching revalidates every 300 seconds; dashboard mutations call revalidation, but manual external DB changes may not appear immediately.
- GitHub import image extraction is best-effort; README images and social preview fallbacks are used where possible.
- The root workspace has a Windows-incompatible preinstall path; use the documented Corepack commands.
- Next.js warns that `middleware` should migrate to `proxy`.
- Production email templates must be pasted into the Supabase Dashboard manually; committed template files do not automatically update hosted Supabase.

## Future Roadmap

- Fully wire manual Project creation UI.
- Add richer analytics views for Smart Links and profile visitors.
- Add drag-and-drop ordering for Smart Links, Projects, Services, and Gallery.
- Add better media upload and cropping flows for project/service images.
- Add stronger public SEO metadata and Open Graph previews per profile.
- Add team/workspace support if needed.
- Add AI-assisted onboarding and profile quality scoring.
- Add automated Playwright end-to-end tests for auth, dashboard CRUD, and public profile.
- Migrate deprecated middleware convention to Next.js proxy.
