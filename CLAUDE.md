# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **Read AGENTS.md first.** This project runs **Next.js 16**, which has breaking
> changes vs. earlier versions. The authoritative docs are bundled at
> `node_modules/next/dist/docs/` — consult them before using any Next.js API.

## Commands

```bash
npm run dev      # Dev server (Turbopack) at localhost:3000
npm run build    # Production build — also runs full TypeScript type-check
npm run lint     # ESLint (eslint-config-next, flat config)
npm run test     # Vitest (watch); `npm run test:run` for a single CI-style pass
npm run seed     # Seed demo data via scripts/seed.ts (needs service-role key)

npm run db:start   # Local Supabase stack (Postgres+Auth+API) in Docker
npm run db:stop    # Stop the local stack
npm run db:status  # Show local URL + keys + Studio link
npm run db:reset   # Rebuild local DB from supabase/migrations/
```

Local dev uses the **Supabase CLI** (a devDependency, run via `npx supabase`)
which runs the full stack in Docker. `supabase/config.toml` disables analytics
(the logflare image is flaky to pull) and email confirmation, and points auth at
`http://localhost:3000`. The schema lives in both `supabase/schema.sql` (manual
hosted setup) and `supabase/migrations/` (CLI/local); keep them in sync. Note:
`NEXT_PUBLIC_*` env vars are read at dev-server startup — restart `npm run dev`
after changing `.env.local`.

Tests cover the pure domain logic in `src/lib/finance.ts`
(`src/lib/finance.test.ts`) — no Supabase mocking needed. `npm run build` is
still the primary correctness gate: it type-checks the whole project (the build
fails on any TS error).

## Next.js 16 conventions that bite

- **Middleware is renamed to "Proxy".** Auth/session logic lives in
  `src/proxy.ts` exporting a `proxy` function — not `middleware.ts`.
- **Request APIs are async.** `cookies()`, `headers()`, `params`, and
  `searchParams` must be awaited (see `src/lib/supabase/server.ts`).
- Turbopack is the default for both dev and build.

## Architecture

A personal finance tracker. **Next.js App Router + Supabase (Postgres, Auth,
RLS) + Recharts.** Tailwind v4 with class-based dark mode.

### Data flow (the big picture)

- **Reads** happen in Server Components via helpers in `src/lib/data.ts`, which
  use the cookie-aware server client (`src/lib/supabase/server.ts`). Every
  dashboard `page.tsx` is `export const dynamic = "force-dynamic"`.
- **Writes** go through Server Actions in `src/app/dashboard/actions.ts`
  (`"use server"`). Every action calls `requireUser()` first, then mutates and
  calls `revalidatePath("/dashboard", "layout")`. Client forms call these
  actions directly with a `FormData` and then `router.refresh()`.
- **Authorization is enforced in two places**: Row-Level Security in Postgres
  (every table is scoped to `auth.uid() = user_id` — see `supabase/schema.sql`)
  AND `requireUser()` in each Server Action. Always set `user_id` on insert.
- **Auth gating**: `src/proxy.ts` redirects unauthenticated users away from
  `/dashboard` and authenticated users away from `/login`/`/signup`. The
  dashboard layout re-checks `getUser()` as a defense-in-depth redirect.

### Server vs. client split

- Feature pages (`src/app/dashboard/*/page.tsx`) are thin Server Components:
  fetch data, pass to a client `*-view.tsx` component.
- The interactive logic lives in client components (`src/components/*-view.tsx`,
  `dashboard-overview.tsx`, `charts.tsx`). **The dashboard date-range filter and
  all transaction filtering/sorting happen client-side** over the full dataset
  passed from the server — there is no per-filter refetch.

### Dashboard pages (`src/app/dashboard/*`)

Each route is a thin `page.tsx` fetching from `src/lib/data.ts` and rendering a
client `*-view.tsx`. What each one is for:

- **`/dashboard` — Overview** (`dashboard-overview.tsx`): summary cards + the
  three charts, recent transactions, and upcoming recurring. A global date-range
  selector recalculates everything client-side.
- **`/dashboard/transactions`** (`transactions-view.tsx`): the only full CRUD
  surface for transactions — search, type/category filters, sorting, CSV export.
  This is where a transaction is marked recurring (`is_recurring` +
  `recurrence_interval`).
- **`/dashboard/accounts`** (`accounts-view.tsx`): manually-tracked wallet
  balances (checking/savings/cash/credit/investment) + a total card. Standalone —
  **not** linked to transactions. Backed by the `accounts` table.
- **`/dashboard/budgets`** (`budgets-view.tsx`): monthly limits per category and
  overall, with progress bars and over-budget warnings; current spend is summed
  client-side from transactions.
- **`/dashboard/goals`** (`goals-view.tsx`): savings goals with progress and
  contributions (atomic `increment_goal` RPC).
- **`/dashboard/categories`** (`categories-view.tsx`): color-coded category CRUD.
- **`/dashboard/recurring`** (`recurring-view.tsx`): **read-only.** Expands the
  recurring transactions via `upcomingRecurring()` over a 3/6/12-month horizon —
  e.g. an Electricity bill marked monthly shows one upcoming occurrence per month
  at the start of each month. Shows projected income/expense/net + a timeline.
- **`/dashboard/insights`** (`insights-view.tsx`): **read-only.** Plain-language
  "takeaways" (savings rate, spend vs. last month, top category, over-budget
  warnings, biggest recurring bill) rendered as tone-colored cards. The logic is
  the pure `buildInsights(transactions, budgets)` in `finance.ts` — unit-tested,
  no DB access.
- **`/dashboard/settings`** (`settings-view.tsx`): edit display name + preferred
  currency (`profiles` table); account email is read-only.

### Pure domain logic

`src/lib/finance.ts` holds all aggregation as pure functions (`summarize`,
`monthlySeries`, `expensesByCategory`, `withinRange`) plus `upcomingRecurring`,
which **expands recurring transactions on read** — there is no cron/background
job (a deliberate free-tier constraint). Recurring entries are stored as a
single row with `is_recurring` + `recurrence_interval`.

### Database

`supabase/schema.sql` is the canonical schema — tables (`categories`,
`transactions`, `budgets`, `goals`, `accounts`, `profiles`), RLS policies (every
table is scoped to `auth.uid() = user_id` via one `do $$` loop over a table-name
array — add new tables there), atomic RPCs (`increment_goal`, `set_budget`), and
an `on_auth_user_created` trigger that seeds default categories **and a
`profiles` row** for each new user. The same schema is mirrored in
`supabase/migrations/` (applied locally by `npm run db:reset`); **keep both in
sync** when changing the schema — additive changes go in a new migration file.
For hosted setup, run `schema.sql` manually in the SQL Editor.

Conventions: budgets use `category_id = null` for an overall budget (enforced by
partial unique indexes); `saveBudget` and `contributeToGoal` call the atomic RPCs
rather than read-modify-write; `accounts.balance` has **no** non-negative check
(credit cards go negative); `profiles` is one row per user keyed by `user_id`.

### Environment

`.env.local` holds Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`). The repo ships placeholder values so the app
builds without a real project. `SUPABASE_SERVICE_ROLE_KEY` and `SEED_USER_EMAIL`
are only used by `scripts/seed.ts`, which finds an existing user by email and
backfills ~6 months of Faker data. See `README.md` for full Supabase/Vercel
setup.
