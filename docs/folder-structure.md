# Folder Structure

The repo is two independent npm packages plus a shared database schema. This page is a map, not an exhaustive listing — it covers the files you'll actually touch.

```
twinlab/
├── src/                       # The Next.js web app
│   ├── app/                   # App Router: routes, layouts, pages
│   │   ├── layout.tsx         # Root layout (fonts, global styles)
│   │   ├── page.tsx           # `/` → redirects to /dashboard
│   │   ├── globals.css        # Design system tokens + component classes
│   │   ├── auth/
│   │   │   └── login/         # Login page
│   │   ├── api/auth/login/    # Only API route: sign-in proxy
│   │   └── dashboard/
│   │       ├── layout.tsx     # Sidebar + header shell, auth gate
│   │       ├── page.tsx       # Dashboard home
│   │       ├── twin/          # Digital twin spatial grid
│   │       ├── analytics/     # Health + trend charts
│   │       ├── maintenance/   # Tickets
│   │       ├── admin/         # Sim control, users, labs
│   │       └── labs/          # Inventory + search
│   ├── components/
│   │   ├── ui/                # Shared primitives: Card, Toast, SearchInput,
│   │   │                      #   EmptyState, LiveConnection, CommandPalette,
│   │   │                      #   CountUp, NotificationCenter lives here too
│   │   ├── twin/              # ComputerNode, ComputerDetailDrawer
│   │   └── maintenance/       # CreateTicketModal, TicketDetailDrawer
│   ├── hooks/                 # useAuth, useRealtime, useTheme, useDialog,
│   │                          #   useThrottledCallback
│   ├── lib/                   # supabase client, metrics bucketing, search
│   │                          #   utils, motion variants, misc utils
│   ├── middleware/            # Empty by design (route guards live in layout)
│   ├── config/                # Reserved, currently unused
│   └── types/                 # Shared TS types + enums mirroring the schema
├── simulation-service/        # The metrics-generating Express service
│   ├── src/
│   │   ├── index.ts           # Express app, routes, auth middleware
│   │   ├── config/            # Default simulation config + env wiring
│   │   ├── services/
│   │   │   ├── SimulationEngine.ts        # Tick loop + persistence
│   │   │   └── MetricGenerationService.ts # Drift math + health scoring
│   │   └── types/             # Simulation types
│   ├── Dockerfile             # Production image (Node 22)
│   └── package.json           # Express, @supabase/supabase-js
├── scripts/                   # One-off / maintenance scripts
│   ├── seed.ts                # Demo data seeding
│   ├── reset-admin.js         # Recreate the admin account
│   ├── add_ticket_history_policies.sql   # RLS migration for ticket history
│   ├── fix-rls-recursion.sql            # Helper to fix a known RLS recursion
│   └── .env.example           # Env template for scripts
├── __tests__/                 # Vitest unit tests
│   ├── utils.test.ts          # Misc utils
│   ├── search.test.ts         # Search matching helpers
│   ├── SearchInput.test.tsx   # SearchInput component
│   ├── debounce.test.ts       # useThrottledCallback/debounce
│   └── metrics.test.ts        # Trend bucketing
├── schema.sql                 # The entire database, RLS + realtime included
├── truncate_tables.sql        # Manual cleanup for DB owners (no grants)
├── Dockerfile                 # Frontend production image (standalone)
├── docker-compose.yml         # Full stack: web + simulation
├── next.config.ts             # Next config (standalone output)
├── .env.example               # Frontend env template
├── package.json               # Frontend dependencies + scripts
├── tsconfig.json              # TypeScript strict
└── vitest.config.mts          # Test runner config
```

## What's where: quick answers

- **Want to change what a page shows?** → `src/app/dashboard/<page>/page.tsx`
- **Reusable button/card/input?** → `src/components/ui/`
- **How data gets fetched** → pages import `@/lib/supabase` and `@/hooks/useRealtime`
- **Shared types** → `src/types/index.ts` (these mirror `schema.sql` column names, so keep them in sync when you change the DB)
- **Metrics math for charts** → `src/lib/metrics.ts` (used by both dashboard and analytics)
- **How the sim generates numbers** → `simulation-service/src/services/MetricGenerationService.ts`
- **Where simulation control lives** → `simulation-service/src/index.ts`

## A few notes on layout choices

- `middleware/` and `config/` exist but are empty. Route protection happens in the dashboard layout via `useAuth`, not in Next middleware, so adding middleware would change how auth is enforced — read `src/hooks/useAuth.tsx` and `src/app/dashboard/layout.tsx` first.
- Env templates live next to the package that uses them (`.env.example` at root, `simulation-service/.env.example`, `scripts/.env.example`) so each part of the repo is self-describing.
- The `.next/`, `node_modules/`, `dist/`, `.env*`, and `supabase/.temp/` directories are git-ignored. Only the `.env.example` files are tracked.
