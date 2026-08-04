# Development Guide

How to actually work on TwinLab day-to-day. For setup, see [installation.md](installation.md); for the layout, see [folder-structure.md](folder-structure.md).

## Common commands

All from the repo root unless noted.

```bash
# Frontend
npm run dev        # dev server on :3000
npm run build      # production build (standalone output)
npm run start      # serve the built app
npm run lint       # ESLint
npm run test       # run the test suite once
npm run test:watch # re-run on change
npm run seed       # reset + seed the database

# Simulation service
cd simulation-service
npm run dev        # dev server on :3001
npm run build      # tsc → dist/
npm run start      # run the compiled output
```

## The dev loop

Two processes, two terminals:

```bash
# terminal 1
npm run dev

# terminal 2
cd simulation-service && npm run dev
```

The frontend hot-reloads as you edit. The sim service uses `tsx`, so it restarts on save too. If the dashboard looks static, start the simulation from the Admin panel or with `curl -X POST http://localhost:3001/simulation/start`.

## Testing

Vitest + React Testing Library. Tests live in `__tests__/`:

- `utils.test.ts` — formatting, navigation, misc helpers
- `search.test.ts` — search matching logic
- `SearchInput.test.tsx` — the search input component
- `debounce.test.ts` — throttling/debounce hook
- `metrics.test.ts` — trend bucketing (`bucketTrendMetrics`)

Current state: 34 tests, all green.

Write tests for new pure logic. The UI is client-heavy and talks to Supabase directly, so full component tests would need mocks — a smoke test on a rendered component (like `SearchInput`) is usually enough.

## Linting and type checks

```bash
npm run lint   # ESLint
npx tsc --noEmit   # TypeScript, strict mode
npm run build  # catches more, but slower
```

The sim service is type-checked separately: `cd simulation-service && npx tsc --noEmit`.

Aim to leave all of these clean. The build is the final gate before anything lands.

## Working with the database

`schema.sql` is the source of truth. When you change it:

1. Update `schema.sql`.
2. Apply the change to your Supabase project (SQL Editor or the migration SQL files in `scripts/`).
3. Keep `src/types/index.ts` in sync — the interfaces mirror table columns, and TS strictness is what stops you from shipping a typo'd column name.

Two RLS gotchas you'll hit eventually:

- **Recursion.** An RLS policy that queries `user_profiles` while `user_profiles` has RLS can recurse. The `is_admin()` helper is `SECURITY DEFINER` to dodge this. `scripts/fix-rls-recursion.sql` documents the pattern.
- **Technician scope.** Technicians can only update tickets assigned to them, and a `WITH CHECK` clause stops them reassigning a ticket to someone else. If you loosen this, make sure the check still closes that hole.

## Adding a new page

1. Create `src/app/dashboard/<name>/page.tsx` (client component, starts with `'use client'`).
2. Add a nav item in `src/app/dashboard/layout.tsx` (admin-gated items go behind the `profile.role === 'admin'` check).
3. Use the existing primitives — `Card`, `EmptyState`, `Toast`, `CountUp`, motion variants from `@/lib/motion` — so the new page matches the design system.
4. If the page needs live data, wire it with `useRealtime` and keep an interval fallback for the dashboard-y pages.

## Adding a feature to the simulation

The knobs live in `simulation-service/src/config/index.ts` (tick interval, drift rates, mutation probabilities). If you add a metric or a new state, the chain is: `MetricGenerationService` generates it → `SimulationEngine` persists it → `schema.sql` gets the column → `src/types/` gets the field → the page/component renders it. The realtime publication picks the new rows up automatically.

## Git hygiene

The repo ships with `.gitignore`s at root, `simulation-service/`, and `scripts/`. Before your first commit:

- Make sure no real `.env` / `.env.local` file is staged (`git status` should only show `.env.example` files).
- The seeded `supabase/.temp/` directory is ignored.
- `.next/`, `dist/`, and `node_modules/` are ignored.

## Performance notes (read before you optimize)

- Dashboard and analytics re-query on every realtime event, throttled (3s / 30s respectively) and on a 30s interval. If you add subscriptions, reuse `useThrottledCallback` — an unthrottled subscription to `computer_metrics` will hammer Supabase.
- Trend charts go through `bucketTrendMetrics()` in `src/lib/metrics.ts`, which caps the dataset at `maxBuckets` points. Don't bypass it by rendering raw metric rows for charts.
- List queries are bounded with `.limit(...)` on the dashboard/analytics pages. Unbounded selects on `computer_metrics` are how you end up with a slow page and a big bill.

## What to check before opening a PR

```bash
npm run lint
npm run test
npx tsc --noEmit
npm run build
cd simulation-service && npx tsc --noEmit
```

Then a manual pass: seed is current, the sim runs, and the changed pages render without console errors.
