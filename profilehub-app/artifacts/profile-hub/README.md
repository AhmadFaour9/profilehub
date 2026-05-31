# ProfileHub

Next.js App Router app backed by Supabase Auth, PostgreSQL, RLS, Storage, analytics, audit logs, and an AI adapter layer.

## Setup

```bash
corepack pnpm install --ignore-scripts
corepack pnpm --filter @workspace/profile-hub dev
```

The workspace currently has a Windows-incompatible root `preinstall` script that calls `sh`; use Corepack PNPM from the workspace root.

## Environment

Create `.env.local` in `artifacts/profile-hub`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_PROVIDER=mock
GEMINI_API_KEY=
APP_URL=http://localhost:24359
LOG_LEVEL=info
```

Public/client Supabase keys are selected in this order:

1. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Admin/server-only Supabase keys are selected in this order:

1. `SUPABASE_SECRET_KEY`
2. `SUPABASE_SERVICE_ROLE_KEY`

Admin keys must stay server-side only. Do not expose them with a `NEXT_PUBLIC_` prefix. The app rejects admin keys that are publishable keys, anon JWTs, malformed JWTs, or JWTs without `role: "service_role"`. `sb_secret_` keys are accepted as server-only admin keys.

## Supabase Migrations

Apply the SQL in:

```text
supabase/migrations/202605240001_initial_schema.sql
```

It creates the requested tables, indexes, updated-at triggers, storage buckets, RLS policies, analytics tables, audit logs, AI usage logs, and system logs.

Storage buckets:

- `avatars`
- `covers`
- `project-media`
- `gallery-media`

Files are stored under `{user_id}/{uuid}.{extension}` and policies restrict writes to the owning user folder.

## OAuth Setup

In Supabase Dashboard:

1. Enable Google provider under Authentication > Providers.
2. Add Google OAuth client ID and secret.
3. Add redirect URL:

```text
{APP_URL}/auth/callback
```

For local development use:

```text
http://localhost:24359/auth/callback
```

## Run Locally

```bash
corepack pnpm --filter @workspace/profile-hub dev
```

Build and verification:

```bash
corepack pnpm --filter @workspace/profile-hub run typecheck
corepack pnpm --filter @workspace/profile-hub run lint
corepack pnpm --filter @workspace/profile-hub run build
corepack pnpm --filter @workspace/profile-hub run test
```

## Deploy to Vercel

1. Set project root to `artifacts/profile-hub`.
2. Add the environment variables below.
3. Set `APP_URL` to the production URL.
4. Add the production OAuth callback URL in Supabase.
5. Apply Supabase migration before first production login.

Expected Vercel values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://kjwdeufxrhcckwvsekcd.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_SERVICE_ROLE_KEY=service_role_jwt_or_sb_secret_...
APP_URL=https://profilehub-two.vercel.app
AI_PROVIDER=mock
LOG_LEVEL=info
```

## AI

AI is accessed only through `/lib/ai/provider.ts`.

Providers:

- `/lib/ai/providers/gemini.ts`
- `/lib/ai/providers/mock.ts`

If `GEMINI_API_KEY` is missing or the provider quota fails, the app falls back to the mock provider with a friendly message. AI prompts are minimized and redact sensitive keys before sending.

Supported features through `POST /api/ai`:

- `generate_bio`
- `analyze_brand`
- `order_links`
- `project_names`
- `improve_project_description`
- `suggest_cta`
- `brand_score`

AI usage is rate-limited to 20 requests per user per day using `ai_usage_logs`.
