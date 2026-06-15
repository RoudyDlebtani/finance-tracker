# FinTrack — Personal Finance Tracker

[![CI](https://github.com/RoudyDlebtani/finance-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/RoudyDlebtani/finance-tracker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A full-stack personal finance dashboard built as a portfolio demo. Track income
and expenses, set budgets and savings goals, and explore your money through an
interactive, filterable dashboard with charts.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Auth) · Recharts ·
Tailwind CSS · TypeScript · Zod · Vitest. **Hosting:** Vercel + Supabase — both
free tier.

**Live demo:** _add your Vercel URL here_

> _Screenshots: drop dashboard / transactions / budgets images in `docs/` and
> link them here, e.g._ `![Dashboard](docs/dashboard.png)`

## Features

- 🔐 **Auth** — email/password + Google login, protected routes, row-level
  security so users only see their own data.
- 💸 **Transactions** — full CRUD with search, filters (type/category), sorting,
  and CSV export.
- 🏷️ **Categories** — color-coded, customizable; defaults created on signup.
- 📊 **Dashboard** — income vs. expenses (area), spending by category (donut),
  monthly comparison (bar), summary cards, and a global date-range filter that
  recalculates everything.
- 🎯 **Budgets** — monthly limits per category (and overall) with progress bars
  and over-budget warnings.
- 🐖 **Savings goals** — track progress and add contributions.
- 🔁 **Recurring** — mark transactions recurring; upcoming entries are computed
  on read (no background jobs — free-tier friendly).
- 🌙 **Dark mode**, responsive layout, empty states.

## Engineering highlights

The parts worth a closer look in a code review:

- **Defense-in-depth authorization.** Every table enforces
  `auth.uid() = user_id` via Postgres Row-Level Security ([`supabase/schema.sql`](supabase/schema.sql)),
  *and* every Server Action re-checks the user. The `proxy.ts` middleware gates
  routes on top.
- **Validated, fail-loud mutations.** Server Actions parse `FormData` through
  [Zod schemas](src/lib/validation.ts) and return a typed
  `{ ok: true } | { ok: false; error }` result, so forms surface real error
  messages instead of silently coercing bad input.
- **Atomic money operations.** Goal contributions and budget upserts run as
  Postgres functions (`increment_goal`, `set_budget`) — no read-modify-write
  races, and the client can't set an arbitrary balance. Budget uniqueness is
  backed by partial indexes that handle the "overall budget" (`NULL` category)
  correctly.
- **Pure, tested domain layer.** All aggregation lives in pure functions in
  [`src/lib/finance.ts`](src/lib/finance.ts) and is covered by
  [Vitest](src/lib/finance.test.ts) — no database or mocking required. Recurring
  transactions are expanded *on read*, so there's no cron/background job.
- **Server/client split.** Pages are thin Server Components that fetch and pass
  data down; filtering, sorting, and the date-range view recalculate client-side
  over the full dataset (no per-filter refetch).

## Getting started

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project** (free tier).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
   tables, row-level-security policies, and a trigger that seeds default
   categories for each new user.

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in from **Supabase → Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `anon` public key
- `SUPABASE_SERVICE_ROLE_KEY` — `service_role` key (only used by the seed
  script; keep it secret)
- `SEED_USER_EMAIL` — the email you'll sign up with, for the seed script

### 3. (Optional) Enable Google login

In Supabase → **Authentication → Providers → Google**, add your Google OAuth
client ID/secret and set the redirect URL to
`https://<your-project-ref>.supabase.co/auth/v1/callback`. Email/password works
out of the box without this step.

### 4. Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and you're in.

### 5. (Optional) Seed demo data

After signing up with `SEED_USER_EMAIL`, populate ~6 months of realistic data:

```bash
npm run seed
```

## Deploying to Vercel (free)

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Add the same env vars (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy. Add your Vercel URL to Supabase → **Authentication → URL
   Configuration** as a redirect URL so OAuth/email links work in production.

## Project structure

```
src/
  app/
    page.tsx                 # Landing page
    login, signup            # Auth pages
    auth/callback, signout   # OAuth callback + signout route handlers
    dashboard/
      layout.tsx             # Sidebar shell (protected)
      page.tsx               # Overview (charts + summary)
      transactions, budgets, goals, categories
      actions.ts             # Server Actions (all mutations)
  components/                # UI primitives + feature views + charts
  lib/
    supabase/                # Browser, server & proxy clients
    data.ts                  # Server-side reads
    finance.ts               # Aggregation + recurring expansion (pure fns)
    finance.test.ts          # Vitest unit tests for the domain logic
    validation.ts            # Zod schemas + FormData parsing for Server Actions
    csv.ts, utils.ts, types.ts
  proxy.ts                   # Auth/session middleware (Next 16 "Proxy")
supabase/schema.sql          # Tables + RLS + signup trigger
scripts/seed.ts              # Faker demo-data seeder
```

## Notes

- Built on **Next.js 16**, where Middleware is now called **Proxy** (`proxy.ts`)
  and request APIs (`cookies`, `searchParams`) are async.
- No live/external data and no background jobs — fully compatible with free
  hosting tiers.
- Run `npm run test` for the domain-logic unit tests; `npm run build`
  type-checks the whole project and is the primary correctness gate.
