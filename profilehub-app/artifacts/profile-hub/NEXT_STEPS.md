# ProfileHub — Next Steps

Last verified: 2026-08-29

## Current State

| Area | State |
|---|---|
| Build | `next build` passes, 36 routes |
| Types | `tsc --noEmit` clean |
| Unit tests | 47/47 passing (vitest) |
| Frontend | **Live** on Vercel — https://profilehub-two.vercel.app |
| Backend | **Live** — Supabase `kjwdeufxrhcckwvsekcd` is `ACTIVE_HEALTHY` |
| Backend health | 25/25 checks pass (`npm run check:supabase`) |
| Migrations | All 8 applied to remote |
| E2E tests | None |

Features are code-complete: auth (email + Google OAuth + recovery), onboarding, 9 dashboard
routes, Smart Links, social links, projects with GitHub import, services, gallery, theme,
analytics, public profile with SEO and OG images, QR sharing, and AI writing help with
OpenRouter multi-model fallback.

---

## Completed 2026-08-29

The project had stalled because the free-tier Supabase project had auto-paused, not because
of missing features. Restored and verified end to end:

- Supabase restored to `ACTIVE_HEALTHY`.
- `.env.local` generated from `supabase projects api-keys`.
- Migration `202606060002_ensure_projects_owner_access` was missing on the remote and has
  been applied. All 7 migrations now match.
- `npm run check:supabase` → 25/25 (REST, Auth, 14 tables, 4 buckets).
- Local smoke test on `http://localhost:24359`: published profiles render with correct SEO
  and OG images, unpublished profiles and unknown usernames 404, `/dashboard` and
  `/onboarding` redirect to login with a `next` param, `/go/[linkId]` redirects to the real
  destination and an unknown id falls back home, and the page-view beacon persists
  (`page_views` 29 → 30, a fresh `smart_link_clicks` row). No RLS or 5xx errors in the log.
- Production smoke test on Vercel: identical behaviour on every route, `sitemap.xml` and
  `og:url` both use the production domain.

### Gotcha found — the sb_secret_ key does not work on this project

`supabase projects api-keys` returns four keys. The new-style `sb_secret_` key is **rejected
with "Invalid API key"**, while the matching `sb_publishable_` key works fine. The legacy
`service_role` JWT works.

This matters because `src/lib/supabase-admin-env.ts` reads
`["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]` and takes the **first present** value,
validating only the key's *prefix* — not whether Supabase accepts it. Setting the unusable
`sb_secret_` key therefore passes every startup check and then fails at request time, taking
down `/go/[linkId]`, `sitemap.xml`, analytics writes, and the AI usage log.

`.env.local` leaves `SUPABASE_SECRET_KEY` unset for this reason. Vercel's production
environment is already correct — verified indirectly, since a broken admin key would empty
`sitemap.xml` and make `/go/[linkId]` fall back to the home page, and neither happens.

**Worth hardening:** make `getSupabaseAdminConfig()` fall through to the next candidate key
on an auth failure instead of trusting the prefix, so a bad key degrades rather than shadows.

---

## Added 2026-08-29 — i18n, section visibility, resume analysis

### Internationalization

The previous setup was a 34-key Zustand store that only worked in Client
Components and lost the language on every reload. Replaced with a cookie-backed
system under `src/lib/i18n/`:

- `config.ts` — locales, direction, Accept-Language negotiation
- `messages.ts` — ~200 keys, English typed as the source of truth so a missing
  Arabic key is a compile error
- `server.ts` — `getTranslations()` for Server Components
- `client.tsx` — `LocaleProvider` / `useLocale()`, seeded from the server

Resolution order is cookie → `Accept-Language` → English. The root layout sets
`lang` and `dir` server-side, so RTL is correct on first paint with no flash, and
switching calls `router.refresh()` so Server Components re-render too.
`useTranslation()` is kept as a thin adapter, so the four original call sites were
not touched.

Covered: navigation, auth pages, dashboard headings, the public profile, and all
new UI. Not yet covered: the long-tail strings inside the manager components
(dialog bodies, toasts, column labels in `LinksManager`, `ProjectsManager`,
`ServicesManager`, `GalleryManager`). The keys exist; the call sites do not.

### Public profile section visibility

`profiles.section_visibility` (jsonb, migration `202608290001`) controls which
sections render. Missing keys default to visible, so existing profiles were
unaffected. Managed at `/dashboard/profile` below the editor.

`PublicProfile` empties the collection for a hidden section rather than skipping
the JSX, so JSON-LD, the primary CTA, and the empty state all follow from one
source of truth automatically.

### Resume analysis

`/dashboard/resume` accepts a PDF or DOCX upload (5 MB cap) or pasted text,
extracts the text server-side (`unpdf` / `mammoth`), and runs `analyze_resume`
through the existing provider chain.

- Files are parsed in memory. The resume is never written to storage, never
  logged, and never persisted — only sizes, scores, and the model name are.
- Model output is untrusted: `parseResumeAnalysis` recovers JSON from prose or
  markdown fences, clamps every score to 0-100, and coerces malformed lists.
- **Offline fallback is real, not a placeholder.** `src/lib/resume/heuristic.ts`
  extracts contact details by regex, reads labelled sections, and scores from
  measurable signals such as the share of experience bullets containing numbers.
  It never invents a summary. So the page works with no AI key configured.
- Applying to the profile follows the rule: an empty profile field is filled
  automatically, a populated one is only ever a suggestion the user opts into.
  Values are re-validated server-side with the same schema the profile form uses.

Reachable two ways:

- **Sidebar** — `/dashboard/resume`, the full report with scores and advice.
- **Onboarding** — `ResumeImportCard` appears above the profile form for a blank
  profile only. It applies every readable field in one step and calls
  `router.refresh()` so the server-rendered form picks the values up. Once the
  user has written a headline, bio, or location the card stops appearing, and the
  full page takes over — that one asks before replacing anything.

To enable live AI rather than the offline fallback, set `OPENROUTER_API_KEY` in
`.env.local` and in Vercel.

### Dashboard deep links now survive login

`src/app/dashboard/layout.tsx` hardcoded `redirect("/login?next=/dashboard")`, so
opening `/dashboard/resume` while logged out sent the user to `/dashboard` after
logging in. Layouts do not receive the pathname in the App Router, so
`src/middleware.ts` now forwards it as `x-profilehub-pathname` and the layout
reads it. Only `/dashboard` paths are honoured, so it cannot become an open
redirect.

---

## Remaining Work

### Add E2E coverage

The only real gap in engineering quality. Playwright, covering:

- login → dashboard, with no session-refresh loop after 60s
- direct navigation and refresh on every `/dashboard/*` route
- Smart Link CRUD, then click-through on the public profile
- **cross-user authorization**: user A cannot read or mutate user B's rows

That last one is the highest-value test — it is the assertion that RLS actually holds, and
nothing currently proves it automatically.

---

## Known Limitations

- **Free OpenRouter model IDs go stale.** Verified 2026-08-29: all three models the project
  had configured were dead — `meta-llama/llama-3.1-8b-instruct:free` and
  `mistralai/mistral-7b-instruct:free` returned 404 (retired / no longer free) and
  `google/gemma-4-26b-a4b-it:free` returned 429. The API key was fine; the chain was not.
  Because every model failed, the AI features silently used the local fallback and looked
  broken. The chain is now:

  ```
  minimax/minimax-m3:free
  nvidia/nemotron-3-super-120b-a12b:free
  google/gemma-4-31b-it:free
  google/gemma-4-26b-a4b-it:free
  ```

  Re-check with `curl https://openrouter.ai/api/v1/models -H "Authorization: Bearer $OPENROUTER_API_KEY"`
  and filter for ids ending in `:free`. Free tiers still 429 under load, so the fallback
  chain and the offline reader both remain necessary.
- GitHub image extraction is best-effort.
- Supabase email templates in `supabase/templates/` must be pasted into the hosted dashboard
  by hand — the CLI does not push them.
- Public profile caching (300s) delays externally edited data until revalidation.
- `src/middleware.ts` uses the `middleware` convention, which Next.js 16 reports as deprecated
  in favour of `proxy`. It builds and runs; migrating is cosmetic for now.

## Deferred Polish

- Drag-and-drop ordering for Smart Links, projects, services, and gallery.
- Inline previews for Smart Link thumbnails and service images.
- Profile completion indicator.
- Theme preview before saving.
- Contrast, focus-state, and keyboard-navigation review.

## Security Invariants

Verified in the current code — keep them true:

- The browser never receives a service-role key; the admin client is `server-only`.
- Server Actions resolve the user from SSR cookies, then scope every mutation by `profile.id`.
- Public reads return only published and active rows.
- `/go/[linkId]` validates the destination URL before redirecting.
- Password changes go through Supabase Auth, never a direct table write.
- Logs carry IDs and status codes only — no tokens, cookies, passwords, or prompt bodies.
- Debug routes under `/api/debug/*` are gated behind `ENABLE_DEBUG_AUTH_TESTS` plus a secret.
