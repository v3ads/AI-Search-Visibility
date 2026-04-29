# PlumBoost — AI Search Visibility & Brand Intelligence Platform

A multi-tenant SaaS platform that monitors, analyzes, and improves how brands appear in AI-generated responses across ChatGPT, Perplexity, Gemini, and Claude.

## Live App

**[plumboost.com](https://plumboost.com)**

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Wouter, TanStack Query, Recharts, Tailwind CSS, Shadcn UI |
| Backend | Node.js + Express.js |
| Database | PostgreSQL with Drizzle ORM |
| Sessions | express-session + connect-pg-simple |
| AI Analysis | RouteLLM (Abacus.ai) — GPT-4o, Claude, Gemini, Grok |
| Hosting | Railway |

## Features

- **AI Visibility Tracking** — Monitor how often your brand appears in AI responses across 4 major models
- **Share of Voice** — Compare your brand against competitors in AI-generated content
- **Sentiment Analysis** — Track sentiment trends over time per model
- **Citation Tracking** — Monitor which URLs are cited in AI responses (owned + external)
- **Boost Actions** — AI-generated recommendations to improve brand visibility
- **Multi-tenant** — Full org/team support with role-based access control
- **Scan Scheduling** — Automated periodic AI scans

## Project Structure

```
client/src/
  pages/          - Dashboard, Visibility, Share of Voice, Rankings, Citations, etc.
  components/     - Reusable UI components
  lib/            - Auth context, query client, project context
  hooks/          - Data fetching hooks

server/
  routes.ts       - All API routes
  storage.ts      - Database access layer
  migrate.ts      - Database migrations (runs on deploy)
  seed.ts         - Initial data seeding
  ai-analysis.ts  - AI scan engine (RouteLLM integration)

shared/
  schema.ts       - Drizzle schema (shared between client and server)
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+

### Local Development

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, SESSION_SECRET, ADMIN_PASSWORD, ROUTELLM_API_KEY

# Run migrations
npm run db:migrate

# Start dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for session signing |
| `ADMIN_PASSWORD` | Password for the admin account |
| `ROUTELLM_API_KEY` | Abacus.ai RouteLLM API key for AI scans |

### Production Build

```bash
npm run build
npm start
```

## Deployment

The app is deployed on [Railway](https://railway.app). Migrations and seeding run automatically on every deploy via the `db:migrate` pre-start script.
