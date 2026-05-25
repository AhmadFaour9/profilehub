# ProfileHub

A premium digital identity platform — like Linktree but more powerful. Creators, freelancers, and professionals build a beautiful public profile combining smart links, projects, services, gallery, bio, social links, QR sharing, and analytics.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000 → mapped to /api)
- `pnpm --filter @workspace/profile-hub run dev` — run the frontend (port 24359 → mapped to /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, shadcn/ui, wouter, framer-motion, next-themes, zustand, recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas (used by server)
- `lib/db/src/schema/` — Drizzle ORM table definitions (profiles, links, projects, services, gallery, analytics)
- `artifacts/api-server/src/routes/` — Express route handlers (profiles, links, projects, services, gallery, analytics)
- `artifacts/profile-hub/src/` — React frontend
  - `pages/` — all page components (LandingPage, PublicProfilePage, Login, Register, ForgotPassword, dashboard/*)
  - `components/` — AppShell, DashboardSidebar, Topbar, profile/*, dashboard/*
  - `lib/mock-data.ts` — structured mock data (demo user: username "sara")
  - `lib/i18n.ts` — EN/AR translation strings
  - `types/index.ts` — TypeScript types
  - `hooks/use-translation.ts` — i18n hook (zustand-based)

## Architecture decisions

- API is contract-first: OpenAPI spec → Orval codegen → typed hooks + Zod schemas
- Frontend uses mock data directly (`/lib/mock-data.ts`) — switching to real API is a one-line change per page
- Demo user ID is hardcoded as `"demo-user"` in all routes (no auth yet — ready for Supabase/Clerk)
- Social icons: react-icons/si for X, Instagram, Dribbble, GitHub, YouTube; lucide-react for LinkedIn, Facebook
- RTL/LTR: `dir` attribute toggled on `<html>` via i18n hook; lang-aware Tailwind classes used throughout

## Product

- **Landing page** — hero, how-it-works, comparison vs Linktree, features, template previews, FAQ, CTA
- **Public profile** (`/:username`) — avatar/cover, bio, smart links, projects, services, gallery, social icons, QR share
- **Auth pages** — login, register, forgot-password (UI complete; backend auth not yet connected)
- **Dashboard** (`/dashboard/*`) — overview stats, profile editor, links manager, projects, services, gallery, theme picker, analytics, settings
- **Demo profile** — visit `/sara` to see Sara Al-Hassan's public profile

## User preferences

- Premium, quiet, clean design — no default blue/purple, no generic gradients
- Mobile-first (most traffic from phones)
- RTL/Arabic + LTR/English support
- Custom design tokens in `index.css` (Outfit + Instrument Serif fonts)
- No emojis in UI

## Gotchas

- `SiTwitter` renamed to `SiX` in react-icons/si v5; `SiLinkedin` removed — use `lucide-react` Linkedin instead
- Always run codegen after changing `openapi.yaml`: `pnpm --filter @workspace/api-spec run codegen`
- Public profile route (`/:username`) must come AFTER all specific routes in App.tsx's Switch
- Mock user username is `"sara"` — matches the DB seed; visit `/sara` in the browser

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Backend ready to connect to Supabase Auth — add auth middleware to routes, replace `DEMO_PROFILE_ID` with `req.user.id`
