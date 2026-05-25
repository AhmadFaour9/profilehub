# ProfileHub — Full-Stack Microservices Architecture

Enterprise-grade personal branding platform built with **Microservices Architecture** and **Clean Architecture** principles.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ProfileHub                               │
├──────────────────────────┬──────────────────────────────────────┤
│    Frontend Service      │         Backend Services              │
│                          │                                       │
│  ┌──────────────────┐   │   ┌─────────────────────────────┐   │
│  │  Next.js Web App  │───┼──▶│     API Gateway (:4000)      │   │
│  │     (:3000)       │   │   └─────┬─────┬──────┬──────────┘   │
│  └──────────────────┘   │         │     │      │              │
│                          │   ┌─────▼─┐ ┌─▼────┐ ┌▼──────┐    │
│                          │   │Profile │ │Analyt│ │  AI   │    │
│                          │   │Service │ │ics   │ │Service│    │
│                          │   │(:4001) │ │(:4002│ │(:4003)│    │
│                          │   └────┬───┘ └──┬───┘ └───┬───┘    │
│                          │        │        │         │         │
│                          │   ┌────▼────────▼─────────▼───┐    │
│                          │   │   Supabase PostgreSQL +    │    │
│                          │   │   Row Level Security       │    │
│                          │   └───────────────────────────┘    │
└──────────────────────────┴──────────────────────────────────────┘
```

## Project Structure

```
ProfileHub/
├── profilehub-app/                 # ProfileHub application workspace
│   └── artifacts/
│       └── profile-hub/            # 🌐 Next.js Web App Service (:3000)
│           ├── src/
│           │   ├── app/            # Next.js App Router pages
│           │   ├── components/     # React UI components
│           │   ├── lib/
│           │   │   ├── api-client.ts   # ⭐ Gateway API client (no direct DB access)
│           │   │   ├── profile-data.ts # Calls backend via api-client
│           │   │   ├── analytics-data.ts
│           │   │   └── supabase/       # Auth-only (cookies/sessions)
│           │   └── types/
│           └── next.config.mjs
│
├── backend/                        # Backend workspace
│   ├── services/
│   │   ├── gateway/                # 🚪 API Gateway (:4000)
│   │   │   └── src/app.ts         #    JWT validation, CORS, proxy routing
│   │   │
│   │   ├── profile-service/       # 👤 Profile Service (:4001)
│   │   │   └── src/
│   │   │       ├── domain/        #    Pure entities & interfaces
│   │   │       ├── use-cases/     #    Business logic
│   │   │       └── infrastructure/#    Supabase repos + Express
│   │   │
│   │   ├── analytics-service/     # 📊 Analytics Service (:4002)
│   │   │   └── src/
│   │   │       ├── domain/
│   │   │       ├── use-cases/
│   │   │       └── infrastructure/
│   │   │
│   │   └── ai-service/            # 🤖 AI Service (:4003)
│   │       └── src/
│   │           ├── domain/
│   │           ├── use-cases/
│   │           └── infrastructure/
│   │
│   └── shared/                     # 📦 @profilehub/shared
│       └── src/
│           ├── types.ts            # Shared TypeScript types
│           ├── validation.ts       # Zod schemas
│           ├── security.ts         # IP hashing, redaction
│           └── logger.ts           # Structured logging + audit
│
└── package.json                    # Root orchestration scripts
```

## Data Flow

```
User → Next.js (UI only) → API Gateway → Microservice → Supabase
                ↕ Auth cookies                ↕ JWT validation
            Supabase Auth              Service Role / User Token
```

**Key principle:** The frontend NEVER talks to the database directly. All data operations flow through the Gateway → Service → Repository chain.

## Quick Start

```bash
# 1. Install backend dependencies
cd backend && npx pnpm install && cd ..

# 2. Configure environment
cp backend/.env.example backend/.env
# Fill in Supabase credentials

# 3. Start all services (each in a separate terminal)
npm run dev:gateway      # API Gateway    → http://localhost:4000
npm run dev:profile      # Profile        → http://localhost:4001
npm run dev:analytics    # Analytics      → http://localhost:4002
npm run dev:ai           # AI             → http://localhost:4003
npm run dev:web          # Next.js Web    → http://localhost:3000
```

## Services

| Service | Port | Tech | Responsibility |
|---------|------|------|----------------|
| **Web App** | 3000 | Next.js | UI rendering, auth cookies, SSR |
| **Gateway** | 4000 | Express | JWT validation, CORS, routing |
| **Profile** | 4001 | Express | Profiles, links, projects, services, themes, media |
| **Analytics** | 4002 | Express | Page views, link clicks, dashboard stats |
| **AI** | 4003 | Express + Gemini | Bio generation, brand scoring, mock fallback |

## Clean Architecture Per Service

```
Domain (Core)           → Pure types, interfaces, zero dependencies
    ↑
Use Cases (Application) → Business rules, validation
    ↑
Infrastructure          → Express routes, Supabase repositories
```

## Migration Path

The architecture is designed for easy migration:
- **To NestJS:** Copy Domain + Use Cases as-is, wrap with NestJS decorators
- **To different DB:** Implement new repository classes, keep use cases unchanged
- **To Kubernetes:** Each service has its own `package.json` and health endpoint
