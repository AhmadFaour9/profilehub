# ProfileHub

A professional public profile builder. Each user gets a public page at `/{username}` with
profile information, social identity links, Smart Links, projects, services, a gallery,
QR sharing, analytics, GitHub import, and AI-assisted writing.

| | |
|---|---|
| **Production** | https://profilehub-two.vercel.app |
| **Frontend host** | Vercel (project root `profilehub-app/artifacts/profile-hub`) |
| **Backend host** | Supabase (`profilehub-staging`, region `eu-central-1`) |

## Architecture

ProfileHub is a **single Next.js application**. There is no separate backend service to
run or deploy — the server half of Next.js *is* the backend. Server Components read data,
Server Actions and Route Handlers write it, and both talk to Supabase over `@supabase/ssr`
with Row Level Security enforcing per-user access.

```
                        Browser
                           │
          ┌────────────────▼─────────────────┐
          │   Next.js 16 App Router (Vercel) │
          │                                  │
          │  Client Components ── UI only    │
          │                                  │
          │  ── server boundary ──────────   │
          │                                  │
          │  Server Components  → reads      │
          │  Server Actions     → writes     │
          │  Route Handlers     → /api/*     │
          └────────────────┬─────────────────┘
                           │ @supabase/ssr (RLS)
          ┌────────────────▼─────────────────┐
          │            Supabase              │
          │   Auth  ·  Postgres  ·  Storage  │
          └──────────────────────────────────┘
                           ▲
                           │ server-side only
                   OpenRouter  ·  GitHub API
```

**Key principle:** the browser never holds a service-role key. Privileged database work
goes through the admin client, which is `server-only`.

### Supabase client split

Three clients, deliberately separated — using the wrong one was the source of the
long-running session bug fixed earlier in this project:

| Client | Where it is used | File |
|---|---|---|
| Read-only SSR | Server Components, layouts | `src/modules/auth/server.ts` |
| Writable SSR | Server Actions, Route Handlers | `src/modules/auth/server.ts` |
| Browser | Client Components | `src/modules/auth/client.ts` |
| Admin (service role) | Privileged writes, fallback reads | `src/modules/auth/admin.ts` |

## Project Structure

```
ProfileHub/
├── package.json                        # root convenience scripts
├── supabase/                           # CLI link state for the remote project
└── profilehub-app/
    └── artifacts/
        └── profile-hub/                # ← the application (Vercel root)
            ├── src/
            │   ├── app/                # App Router: routes, layouts, API, actions
            │   │   ├── [username]/     #   public profile + OG image
            │   │   ├── auth/           #   callback, google, logout, status
            │   │   ├── dashboard/      #   9 authenticated routes + actions.ts
            │   │   ├── go/[linkId]/    #   Smart Link click tracking + redirect
            │   │   └── api/            #   ai, analytics, integrations, links
            │   ├── components/         # UI components (shadcn/ui + custom)
            │   ├── views/              # page-level view components
            │   ├── modules/            # domain / repositories / services
            │   │   ├── auth/
            │   │   ├── profile/
            │   │   ├── analytics/
            │   │   ├── ai/
            │   │   └── shared/
            │   ├── lib/                # profile-data, analytics-data, ai, env, seo
            │   │   ├── i18n/           #   cookie-backed EN/AR with RTL
            │   │   └── resume/         #   PDF/DOCX extraction, analysis, offline reader
            │   └── middleware.ts       # cache headers for auth-sensitive paths
            ├── supabase/
            │   ├── migrations/         # 8 SQL migrations
            │   ├── templates/          # branded auth emails
            │   ├── config.toml
            │   └── seed.sql
            └── tests/                  # vitest unit tests
```

### Module layering

Each domain module follows the same three layers, so business logic stays portable:

```
domain/         → pure types and interfaces, zero dependencies
services/       → business rules and validation
repositories/   → Supabase queries
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/login`, `/register`, `/forgot-password` | Email auth |
| `/auth/google`, `/auth/callback`, `/auth/status` | OAuth, email confirm, recovery |
| `/auth/update-password` | Set a new password after recovery |
| `/onboarding` | Collect `username`, `display_name`, `title`, `bio` |
| `/dashboard` | Overview |
| `/dashboard/{profile,links,projects,services,gallery,theme,analytics,settings}` | Management |
| `/dashboard/resume` | Resume analysis — upload a CV, get fields, scores, and advice |
| `/{username}` | Public profile (cached, 300s revalidate) |
| `/go/[linkId]` | Smart Link tracking redirect |
| `/sitemap.xml` | Published profiles |


## Internationalization

English and Arabic, with full RTL. The chosen locale lives in a cookie, so the
server reads it too and `lang`/`dir` are correct on first paint — the public
profile is translated as well as the dashboard.

```
cookie  →  Accept-Language  →  English
```

- Server Components: `const { t } = await getTranslations()` from `@/lib/i18n/server`
- Client Components: `const { t } = useLocale()` from `@/lib/i18n/client`

English in `src/lib/i18n/messages.ts` is the typed source of truth, so a missing
Arabic key fails the build rather than silently rendering a key name.

## Resume Analysis

`/dashboard/resume` reads a CV and reports what it could extract, a strength
score per section, and ranked advice.

The uploaded file is parsed in memory and never stored, never logged, and never
persisted. When no AI provider is configured, an offline reader still returns a
real analysis rather than placeholder text.

Applying results to a profile follows one rule: **an empty field is filled
automatically; a field that already has content only ever gets a suggestion the
user approves.**

## Local Development

```bash
cd profilehub-app/artifacts/profile-hub
npm install
cp .env.example .env.local     # then fill in real values
npm run dev                    # http://localhost:24359
```

Other scripts, all run from that same directory:

```bash
npm run typecheck    # tsc --noEmit
npm run test         # vitest
npm run lint         # eslint
npm run build        # next build
npm run check:supabase  # verify the backend end to end
```

## Environment Variables

See `.env.example` for the annotated list. The required minimum:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=<service_role JWT>
APP_URL=http://localhost:24359
NEXT_PUBLIC_APP_URL=http://localhost:24359
LOG_HASH_SALT=<random string>
```

Set `OPENROUTER_API_KEY` as well to use live AI; without it the AI features fall back to
local generation.

**Admin key — read this before changing it.** `src/lib/supabase-admin-env.ts` reads
`SUPABASE_SECRET_KEY` then `SUPABASE_SERVICE_ROLE_KEY` and uses the **first one present**,
validating only the key's prefix, not whether Supabase accepts it. The new-style
`sb_secret_` key is *not* enabled on every project — on `kjwdeufxrhcckwvsekcd` it is
rejected with "Invalid API key" even though the matching `sb_publishable_` key works. Set
exactly one, and verify with `npm run check:supabase`. Never prefix a secret with
`NEXT_PUBLIC_`.

## Database

Migrations live in `profilehub-app/artifacts/profile-hub/supabase/migrations` and are
applied to the remote project with:

```bash
cd profilehub-app/artifacts/profile-hub
npx supabase db push
```

RLS is enabled on all user-owned tables. Owner policies scope every dashboard mutation to
the current user's `profile.id`; public reads return only published and active rows.

## Deployment

**Frontend — Vercel.** Root directory is `profilehub-app/artifacts/profile-hub`. Pushing to
`main` triggers a deploy. Production env vars must use the production domain for `APP_URL`
and `NEXT_PUBLIC_APP_URL`.

**Backend — Supabase.** Managed. Apply migrations with `npx supabase db push`, and keep the
Auth redirect URLs pointed at the production domain:

```text
Site URL:     https://profilehub-two.vercel.app
Redirect URL: https://profilehub-two.vercel.app/auth/callback
```

> **Note:** a free-tier Supabase project pauses after a week of inactivity, which takes the
> entire backend offline while Vercel keeps serving the frontend. If pages hang or data
> fails to load, check the project status in the Supabase dashboard first.
