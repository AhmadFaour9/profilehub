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
AI_PROVIDER=openrouter
GEMINI_API_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODELS=google/gemma-4-26b-a4b-it:free,meta-llama/llama-3.1-8b-instruct:free,mistralai/mistral-7b-instruct:free
OPENROUTER_MODEL=
AI_EXPOSE_PROVIDER_ERRORS=false
APP_URL=http://localhost:24359
NEXT_PUBLIC_APP_URL=http://localhost:24359
LOG_LEVEL=info
```

Public/client Supabase keys are selected in this order:

1. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Admin/server-only Supabase keys are selected in this order:

1. `SUPABASE_SECRET_KEY`
2. `SUPABASE_SERVICE_ROLE_KEY`

Admin keys must stay server-side only. Do not expose them with a `NEXT_PUBLIC_` prefix. The app rejects admin keys that are publishable keys, anon JWTs, malformed JWTs, or JWTs without `role: "service_role"`. `sb_secret_` keys are accepted as server-only admin keys.

Admin database operations try validated admin keys in order. If `SUPABASE_SECRET_KEY` receives a Supabase permission/RLS error, the same operation is retried with `SUPABASE_SERVICE_ROLE_KEY`; public keys are never used as admin fallbacks.

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

## Supabase Auth Email Templates

Custom confirmation templates are stored in:

```text
supabase/templates/confirmation.html
supabase/templates/email_change.html
supabase/templates/recovery.html
```

Local Supabase uses these through `supabase/config.toml`.

For the hosted production project, copy each HTML file into Supabase Dashboard:

1. Authentication > Email Templates > Confirm signup
2. Set subject to `Confirm your ProfileHub email`
3. Paste `supabase/templates/confirmation.html`
4. Authentication > Email Templates > Change email address
5. Set subject to `Confirm your new ProfileHub email`
6. Paste `supabase/templates/email_change.html`
7. Authentication > Email Templates > Reset password
8. Set subject to `Reset your ProfileHub password`
9. Paste `supabase/templates/recovery.html`

Required production URL settings:

```text
Site URL: https://profilehub-two.vercel.app
Redirect URL: https://profilehub-two.vercel.app/auth/callback
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
3. Set `APP_URL` and `NEXT_PUBLIC_APP_URL` to the production URL.
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
NEXT_PUBLIC_APP_URL=https://profilehub-two.vercel.app
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=
OPENROUTER_MODELS=google/gemma-4-26b-a4b-it:free,meta-llama/llama-3.1-8b-instruct:free,mistralai/mistral-7b-instruct:free
OPENROUTER_MODEL=
LOG_LEVEL=info
```

## AI

AI is accessed only through `/lib/ai/provider.ts`.

Providers:

- `/lib/ai/providers/gemini.ts`
- `/lib/ai/providers/openrouter.ts`
- `/lib/ai/providers/mock.ts`

Set `AI_PROVIDER=openrouter` with `OPENROUTER_API_KEY` and `OPENROUTER_MODELS` to use OpenRouter chat completions. `OPENROUTER_MODELS` is a comma-separated priority list; ProfileHub tries each model in order and stops at the first successful response. If `OPENROUTER_MODELS` is missing, the legacy `OPENROUTER_MODEL` value is still supported as the first attempted model.

Set `AI_EXPOSE_PROVIDER_ERRORS=true` in preview/staging to return provider debug codes instead of masking all live provider failures behind mock fallback.

If the selected live provider is missing, unavailable, quota-limited, rate-limited, or returns a model error, the app falls back to the mock provider with a friendly message. AI prompts are minimized and redact sensitive keys before sending.

Supported features through `POST /api/ai`:

- `generate_bio`
- `improve_bio`
- `analyze_brand`
- `order_links`
- `suggest_smart_links`
- `project_names`
- `improve_project_description`
- `suggest_cta`
- `brand_score`

AI usage is rate-limited to 20 requests per user per day using `ai_usage_logs`.
