# AI Search Visibility & Brand Intelligence Platform

## Overview
A SaaS platform that monitors, analyzes, and helps improve how brands appear in AI-generated responses (ChatGPT, Perplexity, Gemini, Claude). Built as a full-stack application with Express backend and React frontend.

## Tech Stack
- **Frontend**: React 18 + TypeScript, Wouter routing, TanStack Query, Recharts, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, PostgreSQL with Drizzle ORM
- **Styling**: Dark-first theme with green (#22c55e) accent, Inter font

## Project Structure
```
client/src/
  App.tsx              - Main app with sidebar + routing
  components/
    app-sidebar.tsx    - Navigation sidebar
    theme-provider.tsx - Dark/light theme toggle
    theme-toggle.tsx   - Theme toggle button
    metric-card.tsx    - Reusable metric cards + score gauge
  hooks/
    use-project-data.ts - Data fetching hooks for all entities
  lib/
    constants.ts       - Project constants, model colors, intents
  pages/
    dashboard.tsx      - Overview with KPIs, leaderboard, charts
    visibility.tsx     - AI Visibility per-model tracking
    share-of-voice.tsx - SoV horizontal bar chart + breakdown
    ranking.tsx        - Brand ranking leaderboard
    brand-strength.tsx - Composite score with multi-brand comparison
    sentiment.tsx      - Sentiment radar chart + trend
    citations.tsx      - Owned citations + external source tracker
    prompts.tsx        - Prompt CRUD management
    boost-actions.tsx  - AI action cards with status management
    settings.tsx       - Project configuration display

server/
  db.ts              - PostgreSQL connection via Drizzle
  storage.ts         - Database storage interface + implementation
  seed.ts            - Seed data for demo project
  routes.ts          - API routes for all entities

shared/
  schema.ts          - Drizzle schema: users, projects, tags, prompts,
                       competitors, dailyMetrics, boostActions, citations
```

## Database Schema
- **users** - Basic user accounts
- **projects** - Monitored domains with brand/industry info
- **tags** - Color-coded topic categories per project
- **prompts** - Tracked questions sent to AI models
- **competitors** - Detected competitor brands
- **daily_metrics** - Per-brand, per-model, per-day metric snapshots
- **boost_actions** - AI-generated action items with status tracking
- **citations** - Cited URLs (owned + external) with citation counts

## API Routes
All routes prefixed with `/api`:
- `GET /api/projects/:id` - Get project details
- `GET/POST /api/projects/:id/tags` - Tag management
- `GET/POST /api/projects/:id/prompts` - Prompt management
- `PATCH/DELETE /api/prompts/:id` - Update/delete prompts
- `GET /api/projects/:id/competitors` - Competitor list
- `GET /api/projects/:id/metrics` - Daily metrics data
- `GET/POST /api/projects/:id/boost-actions` - Boost actions
- `PATCH /api/boost-actions/:id` - Update action status
- `GET /api/projects/:id/citations` - Citation data

## Authentication
- Session-based auth using express-session with connect-pg-simple (PostgreSQL-backed sessions)
- Single-user hardcoded credentials (username: "virta", password hash stored in routes.ts)
- Auth endpoints: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
- All /api/* routes (except auth) require authentication via requireAuth middleware
- Frontend shows login page when unauthenticated, redirects to dashboard on login
- Session cookie lasts 30 days

## Demo Project
Seeded with "AcmeCloud" (cloud hosting brand) as demo, tracking across 5 AI models with 30 days of metric data, 20 prompts, 8 competitors, 7 boost actions, and 12 citation sources.
