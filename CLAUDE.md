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
```

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

### Pure domain logic

`src/lib/finance.ts` holds all aggregation as pure functions (`summarize`,
`monthlySeries`, `expensesByCategory`, `withinRange`) plus `upcomingRecurring`,
which **expands recurring transactions on read** — there is no cron/background
job (a deliberate free-tier constraint). Recurring entries are stored as a
single row with `is_recurring` + `recurrence_interval`.

### Database

`supabase/schema.sql` is the single source of truth: tables (`categories`,
`transactions`, `budgets`, `goals`), RLS policies, and an `on_auth_user_created`
trigger that seeds default categories for every new user. Run it manually in the
Supabase SQL Editor — there is no migration tooling. Budgets use `category_id =
null` to mean an overall budget; `saveBudget` upserts by delete-then-insert.

### Environment

`.env.local` holds Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`). The repo ships placeholder values so the app
builds without a real project. `SUPABASE_SERVICE_ROLE_KEY` and `SEED_USER_EMAIL`
are only used by `scripts/seed.ts`, which finds an existing user by email and
backfills ~6 months of Faker data. See `README.md` for full Supabase/Vercel
setup.
