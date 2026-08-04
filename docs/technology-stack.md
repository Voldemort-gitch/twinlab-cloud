# Technology Stack

TwinLab is deliberately boring where it counts. Everything here is mainstream, well-documented, and easy to hire for — the interesting parts are the domain logic (digital twin, simulation), not the plumbing.

## Frontend

| Piece | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) | File-based routing, RSC-ready, straightforward deployment story (standalone output) |
| UI library | React 19 | Standard; Next 16 ships it by default |
| Language | TypeScript strict | All shared types in `src/types/` mirror the DB schema, so schema drift shows up at compile time |
| Styling | Tailwind CSS v4 (`@theme` tokens) | Design tokens live in `src/app/globals.css`; no config file needed |
| Charts | Recharts 3 | Composable React chart components; covered most of the fleet/health charts without fuss |
| Animation | framer-motion 12 | Spring transitions, page transitions, `AnimatePresence` drawer/modal motion |
| Icons | lucide-react | Consistent icon set, tree-shakeable |
| Toasts | @radix-ui/react-toast | Accessible toast primitives (used via `src/components/ui/Toast.tsx`) |
| Data access | @supabase/supabase-js 2 | Single client in `src/lib/supabase.ts`; auth, queries, and realtime from one package |
| Testing | Vitest 4 + React Testing Library | Fast unit tests in `__tests__/`; vitest config at `vitest.config.mts` |

### Frontend dev tools

- ESLint 9 + `eslint-config-next`
- `ts-node` + `dotenv` for the seed script
- `vite-tsconfig-paths`, `@vitejs/plugin-react`, `jsdom` for the test harness

## Simulation service

| Piece | Choice | Why |
|-------|--------|-----|
| Runtime | Node.js 22 (Docker), TS executed via `tsx` in dev | Same language as the frontend, one mental model |
| Server | Express 4 | Bare-bones; the service only exposes a handful of routes |
| Supabase client | @supabase/supabase-js 2 | Writes metrics using the service-role key |
| Config | `dotenv` | Reads `simulation-service/.env` |

The service is intentionally small: `src/index.ts` (Express app + routes), `SimulationEngine.ts` (tick loop + persistence), `MetricGenerationService.ts` (per-machine drift and health math).

## Backend / database (Supabase)

Supabase provides three things at once:

- **PostgreSQL** — 10 tables defined in `schema.sql`, with row-level security enabled everywhere and RLS policies per role.
- **Auth** — email/password sign-in. The app's own `user_profiles` table maps `auth.users` IDs to roles (admin / technician / viewer).
- **Realtime** — Postgres change subscriptions. The `supabase_realtime` publication includes `computer_metrics`, `computers`, `alerts`, `maintenance_tickets`, and `health_scores`.

There is no hand-rolled backend API for CRUD; the browser talks to Postgres through Supabase's REST/PostgREST layer, protected by RLS. The only custom endpoint is the Next.js `POST /api/auth/login` proxy.

## Why not...

- **A separate REST backend for everything?** The data layer is simple reads/writes against one schema. Supabase's RLS means the browser can query safely without a middle tier; adding one would double the code for little benefit at this scale.
- **Server-side rendering all pages?** The live data makes the pages effectively client-driven anyway; pages are client components that fetch on mount and subscribe to Realtime. Keeps the mental model simple.
- **WebSockets for the sim control?** The simulation is a background worker with simple start/pause/stop semantics; HTTP calls from the admin panel are enough.

## Versions

Pinned in `package.json` (frontend) and `simulation-service/package.json`. Highlights: Next 16.3.0, React 19.2.4, Tailwind 4, Recharts 3, framer-motion 12, supabase-js 2.111, Express 4.18, TypeScript 5. Upgrades are routine `npm` bumps; there's no lockstep version coupling between the two packages.
