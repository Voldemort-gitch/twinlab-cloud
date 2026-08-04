# Architecture Overview

TwinLab is three moving parts: a Next.js web app, a simulation service, and Supabase doing the heavy lifting in between. There's no custom backend API in the web app itself — the frontend talks to Supabase directly for data, and only talks to the simulation service to control it.

```
+---------------------+          +---------------------+
|  Next.js web app    |          |  Simulation service |
|  (port 3000)        |          |  (Express, :3001)   |
|                     |          |                     |
|  - pages/components |          |  - tick loop (5s)   |
|  - Supabase client  |          |  - metric drift     |
|  - Realtime subs    |          |  - status mutation  |
+----------+----------+          +----------+----------+
           |                               |
           | reads/writes                 | writes (service role key,
           | (anon key + RLS)             |  bypasses RLS)
           v                               v
+-------------------------------------------------------------------+
|                         Supabase                                   |
|   PostgreSQL (10 tables, RLS policies)                            |
|   Auth (email/password, roles via user_profiles)                  |
|   Realtime (pushes computer_metrics, alerts, ...)                 |
+-------------------------------------------------------------------+
```

## The web app

The frontend is a Next.js App Router app. It has no server-side data layer to speak of — pages are client components that query Supabase directly through `src/lib/supabase.ts` (a single shared client configured with the publishable anon key). The only API route is `POST /api/auth/login`, a thin proxy around Supabase's password sign-in used by the login page.

Data flows in two ways:

- **On load / on interval.** Pages fetch what they need (e.g. dashboard pulls labs, computers, latest health score, recent metrics) and re-poll periodically. The dashboard and analytics pages also re-run their queries when Supabase Realtime tells them something changed.
- **Realtime.** `src/hooks/useRealtime.ts` subscribes to Postgres changes on a table and fires the handlers you give it. This is what makes the twin view and the notification bell update live as the simulation writes new metrics.

Auth state lives in a React context (`src/hooks/useAuth.tsx`). It loads the session, fetches the matching `user_profiles` row, and exposes `role` to the rest of the app. The dashboard layout gates everything behind a logged-in user, and the admin page additionally redirects non-admins away.

### Routes

| Route | Purpose |
|-------|---------|
| `/` | Redirects to `/dashboard` |
| `/auth/login` | Sign-in page |
| `/dashboard` | Fleet overview: stats, trends, status distribution, alerts |
| `/dashboard/twin` | Spatial grid of computers with detail drawers |
| `/dashboard/analytics` | Lab health, fleet trends, fault distribution, ticket charts |
| `/dashboard/maintenance` | Ticket list, creation, detail + history |
| `/dashboard/admin` | Simulation control, users, labs (admin only) |
| `/dashboard/labs` | Lab + computer inventory with search/filter |

## The simulation service

A small Express server (`simulation-service/`) that stands in for real lab telemetry. On a timer (default 5 seconds), it generates metrics for every computer it knows about and inserts them into `computer_metrics`. Metrics aren't random noise — each computer gets a persistent state that drifts over time, so CPU hovers around a level instead of jumping everywhere. The generated health score is a weighted blend of CPU, RAM, disk, and temperature.

It also mutates computer status occasionally: an online machine has a small chance per tick to go offline or into maintenance, and offline/maintenance machines recover to online at a configured rate. That gives you something to look at on the twin view and keeps the alert feed populated.

Endpoints (all under `/simulation`, protected by `SIM_API_TOKEN` when set):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check, always open |
| GET | `/simulation/status` | Current state + config |
| POST | `/simulation/start` | Begin the tick loop |
| POST | `/simulation/pause` | Halt ticks, resumable |
| POST | `/simulation/resume` | Continue after pause |
| POST | `/simulation/stop` | Halt and mark stopped |
| PATCH | `/simulation/config` | Change interval/drift rates |

It writes using the **service-role key**, so it isn't subject to RLS — the simulation is trusted infrastructure, not a user.

## The database

Ten tables, documented in `schema.sql`. The important design decisions:

- **Row-level security is on for every table.** Anonymous users see nothing; authenticated users can read labs, computers, metrics, alerts, and tickets; admins get write access; technicians can update only tickets assigned to them, and can't reassign them (a `WITH CHECK` clause locks the `assigned_technician_id`). The `is_admin()` helper is a `SECURITY DEFINER` function that avoids RLS recursion when checking roles.
- **Realtime is enabled** on `computer_metrics`, `computers`, `alerts`, `maintenance_tickets`, and `health_scores` via the `supabase_realtime` publication.
- **Indexes** exist on the hot query paths: metrics by computer + timestamp, alerts by severity/created_at, tickets by status/priority, and so on. `computer_metrics` has a composite index on `(computer_id, timestamp DESC)` for the chart queries.

## Security model at a glance

The browser only ever holds the anon key. Anything sensitive (admin actions, ticket history writes, user creation) is gated by RLS policies rather than hidden API code. The simulation service and the seed/maintenance scripts are the only things that use the service-role key, and that key never appears in the browser bundle.

`truncate_tables.sql` is a manual cleanup script for DB owners; it intentionally does **not** grant execution to any Supabase role, so no logged-in user can wipe tables through the API.
