# PlumBoost — AI Search Visibility & Brand Intelligence Platform

> Monitor, analyze, and improve how your brand appears in AI-generated responses across ChatGPT, Claude, Gemini, and Grok.

**Live App → [plumboost.com](https://plumboost.com)**

---

## What It Does

As AI search replaces traditional Google queries, brands are losing visibility without knowing it. PlumBoost solves this by scanning the four major AI models with real prompts and tracking exactly where your brand stands — and what to do about it.

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

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript, Wouter, TanStack Query, Recharts, Tailwind CSS, Shadcn UI |
| **Backend** | Node.js + Express 5 |
| **Database** | PostgreSQL 16 via Drizzle ORM |
| **Sessions** | express-session + connect-pg-simple (Postgres-backed) |
| **AI Models** | OpenRouter — GPT-4o, Claude Sonnet, Gemini 2.5 Pro, Grok 3 |
| **AI Extraction** | GPT-4o-mini (fast JSON extraction of brand mentions) |
| **Billing** | Stripe (Checkout, Customer Portal, Webhooks) |
| **Email** | Brevo transactional API |
| **Hosting** | Railway (app + Postgres) |
| **Domain** | plumboost.com via Cloudflare |

---

## Pricing Plans

| Plan | Price | Projects | Competitors | Prompts | Scans/month |
|---|---|---|---|---|---|
| **Free** | $0 | 1 | 3 | 10 | 1 (lifetime) |
| **Starter** | $49/mo | 1 | 5 | 50 | 4 |
| **Growth** | $149/mo | 5 | 15 | 200 | 20 + scheduled |
| **Agency** | $399/mo | 25 | Unlimited | Unlimited | Unlimited + white-label |

Annual billing available at ~20% discount.

---

## Project Structure

```
client/src/
  pages/              Dashboard, Visibility, Share of Voice, Rankings,
                      Citations, Boost Actions, Scan, Settings, Billing, Team
  components/         App sidebar, metric cards, project wizard, UI primitives
  hooks/              Data fetching (useProjectData, useAnalytics)
  lib/                Auth context, project context, query client

server/
  index.ts            Express app entry point, session config, scheduler boot
  routes.ts           All API routes (auth, org, projects, scans, billing, admin, /v1 public API)
  storage.ts          Database access layer (all queries)
  ai-analysis.ts      Scan engine — queries 4 AI models via OpenRouter, aggregates metrics
  boost-generator.ts  Generates AI-powered boost action plans from scan data
  openrouter.ts       Unified OpenRouter HTTP client (shared by ai-analysis + boost-generator)
  scheduler.ts        Cron-based scan scheduler for Growth+ plans (runs every 5 min)
  stripe-config.ts    Single source of truth for Stripe price IDs and plan pricing
  billing.ts          Stripe helper functions (checkout, portal, webhooks)
  email.ts            Brevo email templates (welcome, password reset, invite, scan complete)
  migrate.ts          Idempotent DB migration (runs on every deploy)
  seed.ts             Initial data seeding (admin user, demo org)

shared/
  schema.ts           Drizzle schema + Zod insert schemas + PLAN_LIMITS config
```

---

## API Routes

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

### System
| Method | Route | Description |
|---|---|---|
| GET | `/health` | Health check for Railway |

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 16+

### Setup

```bash
# Clone
git clone https://github.com/v3ads/AI-Search-Visibility.git
cd AI-Search-Visibility

# Install dependencies
npm install

# Copy and fill environment variables
cp .env.example .env
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Secret for session signing — must be set in production |
| `OPENROUTER_API_KEY` | ✅ | OpenRouter API key for AI model queries |
| `ADMIN_EMAILS` | ✅ | Comma-separated list of super-admin emails |
| `ADMIN_PASSWORD` | ✅ | Initial password for the seeded admin account |
| `STRIPE_SECRET_KEY` | ⚡ | Stripe secret key (billing features) |
| `STRIPE_PUBLISHABLE_KEY` | ⚡ | Stripe publishable key (frontend) |
| `STRIPE_WEBHOOK_SECRET` | ⚡ | Stripe webhook signing secret |
| `BREVO_API_KEY` | ⚡ | Brevo transactional email API key |
| `APP_URL` | ⚡ | Full app URL e.g. `https://plumboost.com` |
| `NODE_ENV` | — | Set to `production` for prod builds |

> ⚡ = optional for local dev, required for full functionality in production

### Run

```bash
# Run migrations
npm run db:migrate

# Start dev server (hot reload via Vite)
npm run dev
```

App runs at `http://localhost:5000`

### Production Build

```bash
npm run build
npm start
```

---

## Deployment (Railway)

The app is hosted on [Railway](https://railway.app) with a managed Postgres instance.

**On every deploy, Railway automatically:**
1. Runs `npm run db:migrate` (idempotent — safe to run repeatedly)
2. Seeds the admin user and demo project
3. Starts the Express server
4. Boots the scan scheduler (Growth+ cron)

**Health check:** `GET /health` → `{ status: "ok", ts: <epoch> }`

---

## Security

- **Rate limiting** on all auth endpoints (20 req / 15 min) and scan triggers (5 req / min)
- **Session-backed auth** with httpOnly, secure, sameSite cookies
- **Org ownership** verified on every project sub-route — no cross-tenant data access
- **API keys** stored as SHA-256 hashes — raw key shown only once at creation
- **Stripe webhooks** verified via signature before processing
- **Prompt injection protection** — brand names sanitized before interpolation into AI prompts
- **SESSION_SECRET** fails fast at boot if missing in production

---

## Architecture Notes

- **`server/openrouter.ts`** — Unified OpenRouter client used by both the scan engine and boost generator. Single place for auth headers, timeouts, and JSON parsing.
- **`server/scheduler.ts`** — Cron runs every 5 minutes, checks `scan_schedules` for due runs, respects plan limits and monthly scan quotas.
- **`server/stripe-config.ts`** — Single source of truth for all Stripe price IDs and plan pricing. Never hardcoded elsewhere.
- **`storage.upsertDailyMetric`** — Prevents duplicate metric rows when multiple scans run on the same day.
- **`storage.deleteProject`** — Wrapped in a DB transaction to ensure atomic cleanup of all child records.
- **Migrations** — Fully idempotent via `addColumnIfMissing` / `renameColumnIfExists` helpers. Safe to re-run on every deploy.
