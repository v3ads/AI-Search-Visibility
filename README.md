# PlumBoost — AI Search Visibility & Brand Intelligence Platform

> Monitor, analyze, and improve how your brand appears in AI-generated responses across ChatGPT, Claude, Gemini, and Grok.

**Live App → [plumboost.com](https://plumboost.com)**

---

## What It Does

As AI search replaces traditional Google queries, brands are losing visibility without knowing it. PlumBoost solves this by scanning the four major AI models with real, site-specific prompts and tracking exactly where your brand stands — and what to do about it.

---

## Features

| Feature | Description |
|---|---|
| **AI Visibility Tracking** | % of prompts where your brand is mentioned across ChatGPT, Claude, Gemini, and Grok |
| **Share of Voice** | How much AI "mind share" you own vs. tracked competitors |
| **Sentiment Analysis** | Positive/neutral/negative tone trends per model over time |
| **Citation Tracking** | Which URLs AI models cite — yours vs. competitors' |
| **Boost Actions** | AI-generated action plan (content, PR, technical, competitor gaps) to improve ranking |
| **Scan Scheduler** | Automated recurring scans on Growth+ plans (daily / weekly / monthly) |
| **Multi-tenant** | Full org/team support with owner, admin, and member roles |
| **Public REST API** | API key auth for Growth+ plans — access metrics and scans programmatically |
| **Email Reports** | Scan complete notifications via Brevo transactional email |
| **Live Demo Scan** | Real unauthenticated scan on landing page — Firecrawl-powered site-specific prompts, rate-limited by IP |
| **Site Intelligence** | Firecrawl crawls domain + subpages to generate brand-specific prompts and competitor suggestions |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript, Wouter, TanStack Query, Recharts, Tailwind CSS, Shadcn UI |
| **Backend** | Node.js + Express 5 |
| **Database** | PostgreSQL 16 via Drizzle ORM |
| **Sessions** | express-session + connect-pg-simple (Postgres-backed) |
| **AI Models** | OpenRouter — GPT-4o, Claude Sonnet, Gemini 2.5 Pro, Grok 3 |
| **AI Extraction** | GPT-4o-mini (brand mention extraction + prompt generation) |
| **Site Crawling** | Firecrawl (homepage + subpages for site intelligence) |
| **Billing** | Stripe (Checkout, Customer Portal, Webhooks) |
| **Email** | Brevo transactional API |
| **Hosting** | Railway (app + Postgres) |
| **Domain** | plumboost.com via Cloudflare |

---

## Pricing Plans

| Plan | Price | Projects | Competitors | Prompts | Scans/month | Models |
|---|---|---|---|---|---|---|
| **Free** | $0 | 1 | 1 | 3 | 1 (lifetime) | ChatGPT + Claude only |
| **Starter** | $49/mo | 1 | 5 | 50 | 4 | All 4 |
| **Growth** | $149/mo | 5 | 15 | 200 | 20 + scheduled | All 4 |
| **Agency** | $399/mo | 25 | Unlimited | Unlimited | Unlimited + white-label | All 4 |

Annual billing available at ~20% discount.

Free plan intentionally limited to drive upgrades: no Boost Actions, no Citation detail, no Sentiment breakdown, ChatGPT + Claude only.

---

## Project Structure

```
client/src/
  pages/
    landing.tsx         Public landing page with real demo scan
    legal/              Privacy Policy, Terms of Service, Cookie Policy
    auth/               Login, Signup, Forgot/Reset Password, Accept Invite
    dashboard.tsx       Main dashboard with metrics and scan trigger
    visibility.tsx      AI visibility trend charts per model
    share-of-voice.tsx  Share of voice vs competitors
    ranking.tsx         Average AI ranking over time
    brand-strength.tsx  Composite brand strength score
    sentiment.tsx       Sentiment analysis per model
    citations.tsx       URL citation tracking
    prompts.tsx         Prompt management
    boost-actions.tsx   AI-generated action plan
    scan.tsx            Scan trigger + live SSE progress
    settings.tsx        Project settings
    billing.tsx         Plan management + Stripe checkout
    team.tsx            Team member management
    account.tsx         User profile
    admin.tsx           Super-admin panel
  components/
    logo.tsx            Shared LogoMark + LogoLockup SVG components
    create-project-wizard.tsx  3-step wizard (brand → competitors → prompts)
    app-sidebar.tsx     Navigation sidebar
    metric-card.tsx     Reusable metric display
  hooks/               useProjectData, useAnalytics
  lib/                 Auth context, project context, query client

server/
  index.ts             Express app entry point, session config, scheduler boot
  routes.ts            All API routes — see API Routes section below
  storage.ts           Database access layer (all queries)
  ai-analysis.ts       Scan engine — queries AI models via OpenRouter, aggregates metrics
  demo-scan.ts         Unauthenticated demo scan engine (landing page)
  site-intelligence.ts Firecrawl-powered site crawl → context extraction → prompt/competitor generation
  boost-generator.ts   Generates AI-powered boost action plans from scan data
  openrouter.ts        Unified OpenRouter HTTP client (shared across all AI calls)
  scheduler.ts         Cron-based scan scheduler for Growth+ plans (every 5 min)
  stripe-config.ts     Single source of truth for Stripe price IDs and plan pricing
  billing.ts           Stripe helper functions (checkout, portal, webhooks)
  email.ts             Brevo email templates (welcome, password reset, invite, scan complete)
  migrate.ts           Idempotent DB migration (runs on every deploy)
  seed.ts              Initial data seeding (admin user, demo org)

shared/
  schema.ts            Drizzle schema + Zod insert schemas + PLAN_LIMITS + FREE_MODELS config
```

---

## Site Intelligence (Firecrawl)

`server/site-intelligence.ts` powers three features:

**1. Demo scan prompts** — Crawls the homepage + up to 3 subpages (`/about`, `/amenities`, `/services`, `/features`, `/apartments`, `/units`) in parallel. Extracts structured business context (category, subcategory, location, neighborhood, target customer, unique attributes, search triggers) then generates 3 short, natural queries (4-10 words) matching how real customers search, plus a brand awareness probe as prompt #1.

**2. Project wizard prompt suggestions** — After project creation, crawls the domain and generates up to 5 plan-limited prompts across multiple intent angles. Includes a brand awareness probe (`"What do you know about [Brand] in [Location]?"`) as the first prompt.

**3. Competitor suggestions** — Uses full site context (category, subcategory, neighborhood) to suggest specific local/niche competitors rather than generic national brands.

All three share the same crawl + context extraction pipeline. Firecrawl is gated by `FIRECRAWL_API_KEY` — all features fall back gracefully if the key is missing or crawl times out.

---

## API Routes

### Public (no auth)
| Method | Route | Description |
|---|---|---|
| GET | `/health` | Health check — `{ status: "ok", ts: epoch }` |
| POST | `/api/demo/scan` | Start a demo scan (rate-limited: 2/IP/hour) |
| GET | `/api/demo/scan/:id` | Poll demo scan status + results |

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account + org |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user + org |
| POST | `/api/auth/forgot-password` | Send reset email |
| POST | `/api/auth/reset-password` | Reset with token |
| POST | `/api/auth/accept-invite` | Accept team invitation |
| POST | `/api/auth/switch-org` | Switch active organization |

### AI Suggestions (auth required)
| Method | Route | Description |
|---|---|---|
| POST | `/api/suggest-competitors` | Firecrawl-powered competitor suggestions |
| POST | `/api/projects/:id/prompts/suggest` | Firecrawl-powered prompt suggestions |

### Projects & Scans
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/projects` | List / create projects |
| GET/PATCH/DELETE | `/api/projects/:id` | Get / update / delete project |
| POST | `/api/projects/:id/scan` | Trigger a new scan |
| GET | `/api/projects/:id/scans` | Scan history |
| GET | `/api/scans/:id` | Scan run status |
| GET | `/api/scans/:id/progress` | SSE stream of live scan progress |
| GET | `/api/projects/:id/metrics` | Daily metrics (days query param) |
| GET | `/api/projects/:id/citations` | Citation data |
| GET/POST | `/api/projects/:id/boost-actions` | Boost actions |
| POST | `/api/projects/:id/boost-actions/generate` | AI-generate new boost plan |
| GET/PUT | `/api/projects/:id/schedule` | Scan schedule (Growth+) |
| GET/POST | `/api/projects/:id/prompts` | Prompts |
| POST | `/api/projects/:id/prompts/bulk` | Bulk prompt import |
| POST | `/api/projects/:id/prompts/suggest` | AI-suggested prompts via Firecrawl |
| GET/POST | `/api/projects/:id/competitors` | Competitors |
| GET/POST | `/api/projects/:id/tags` | Tags |

### Org & Billing
| Method | Route | Description |
|---|---|---|
| GET/PATCH | `/api/org` | Org details |
| GET/POST/DELETE | `/api/org/members` | Team members |
| GET/POST/DELETE | `/api/org/invitations` | Invitations |
| GET/POST/DELETE | `/api/org/api-keys` | API keys (Growth+) |
| POST | `/api/billing/checkout` | Stripe checkout session |
| POST | `/api/billing/portal` | Stripe customer portal |
| POST | `/api/webhooks/stripe` | Stripe webhook handler |

### Public REST API (API key auth — Growth+)
| Method | Route | Description |
|---|---|---|
| GET | `/v1/projects` | List projects |
| GET | `/v1/projects/:id/scans` | Scan history |
| GET | `/v1/projects/:id/metrics` | Metrics (days param) |

---

## User Flow

### New user from landing page demo
1. User enters brand + domain on landing page → real scan fires (ChatGPT + Claude via Firecrawl-generated prompts)
2. Partial results shown — full report locked behind signup
3. User clicks "Unlock Full Report — Free" → brand/domain/industry saved to `sessionStorage`
4. After signup, app detects demo context → opens project wizard pre-filled at step 2 (competitors)
5. Competitors auto-suggested via Firecrawl → user selects
6. Project created → Firecrawl generates prompt suggestions → user selects
7. User lands on dashboard ready to run full 4-model scan

### Returning user scan flow
1. User opens project → clicks "Run Scan"
2. Backend checks plan scan quota + model access (`hasAllModels`)
3. Free plan: ChatGPT + Claude only. Paid plans: all 4 models
4. SSE stream provides real-time per-model progress
5. Results aggregated into daily metrics (upsert — no duplicates)
6. Scan complete email sent via Brevo

---

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 16+

### Setup

```bash
git clone https://github.com/v3ads/AI-Search-Visibility.git
cd AI-Search-Visibility
npm install
cp .env.example .env
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Secret for session signing — fails fast if missing in production |
| `OPENROUTER_API_KEY` | ✅ | OpenRouter API key for all AI model queries |
| `ADMIN_EMAILS` | ✅ | Comma-separated super-admin emails |
| `ADMIN_PASSWORD` | ✅ | Initial password for seeded admin account |
| `FIRECRAWL_API_KEY` | ⚡ | Firecrawl API key — enables site intelligence features |
| `STRIPE_SECRET_KEY` | ⚡ | Stripe secret key (billing) |
| `STRIPE_PUBLISHABLE_KEY` | ⚡ | Stripe publishable key (frontend) |
| `STRIPE_WEBHOOK_SECRET` | ⚡ | Stripe webhook signing secret |
| `BREVO_API_KEY` | ⚡ | Brevo transactional email API key |
| `APP_URL` | ⚡ | Full app URL e.g. `https://plumboost.com` |
| `NODE_ENV` | — | Set to `production` for prod builds |

> ⚡ = optional for local dev, required for full functionality in production

### Run

```bash
npm run db:migrate   # run migrations
npm run dev          # start dev server with hot reload
```

App runs at `http://localhost:5000`

### Production Build

```bash
npm run build
npm start
```

---

## Deployment (Railway)

Hosted on [Railway](https://railway.app) with managed Postgres.

**On every deploy Railway automatically:**
1. Runs `npm run build` (Vite client + esbuild server bundle)
2. Runs `npm run db:migrate` (idempotent)
3. Seeds admin user and demo org
4. Starts Express server
5. Boots scan scheduler cron (Growth+ plans)

**Health check:** `GET /health` → `{ status: "ok", ts: <epoch> }`

> **Note:** `deploymentRedeploy` via Railway API reuses the cached Docker image without rebuilding. Always push a new commit to trigger a genuine Nixpacks rebuild from source.

---

## Security

- **Rate limiting** — auth endpoints (20 req/15 min), scan triggers (5 req/min), demo scans (2 req/IP/hour)
- **Session auth** — httpOnly, secure, sameSite cookies; Postgres-backed sessions
- **Org isolation** — ownership verified on every project sub-route; no cross-tenant data access
- **API keys** — stored as SHA-256 hashes; raw key shown only once at creation
- **Stripe webhooks** — signature verified before processing
- **Prompt injection protection** — brand names and prompt text sanitized before AI interpolation
- **SESSION_SECRET** — fails fast at boot if missing in production
- **Demo scan rate limit** — 2 per IP per hour in production; free accounts can't abuse OpenRouter costs

---

## Architecture Notes

- **`server/site-intelligence.ts`** — Crawls homepage + up to 3 subpages in parallel, extracts rich business context, generates short natural prompts across multiple intent angles. Shared by demo scan, project wizard, and competitor suggestions. Falls back gracefully if Firecrawl is unavailable.
- **`server/demo-scan.ts`** — Self-contained in-memory scan engine for the landing page. No auth, no DB writes. Uses GPT-4o-mini + Claude Haiku for speed. Results expire after 10 minutes. Always includes a brand awareness probe as prompt #1.
- **`server/openrouter.ts`** — Unified OpenRouter HTTP client. Single place for auth headers, timeouts, and JSON parsing. Used by all AI calls across the codebase.
- **`server/scheduler.ts`** — Cron runs every 5 minutes, checks `scan_schedules` for due runs, respects plan limits and monthly quotas.
- **`server/stripe-config.ts`** — Single source of truth for Stripe price IDs. Never hardcoded in routes.
- **`storage.upsertDailyMetric`** — Prevents duplicate metric rows when multiple scans run on the same day.
- **`storage.deleteProject`** — Wrapped in a DB transaction for atomic cleanup of all child records.
- **`PLAN_LIMITS.free.hasAllModels = false`** — Free plan scans ChatGPT + Claude only, enforced server-side via the `hasAllModels` org flag. Not a UI trick.
- **Migrations** — Fully idempotent via `addColumnIfMissing` / `renameColumnIfExists`. Safe to re-run on every deploy.
