# Environment Variables

TwinLab reads env vars from three different files, because it's really three deployables sharing one database. None of the `.env`/`.env.local` files are committed — the templates (`.env.example`) are, and the real files are git-ignored.

The rules to remember:

- Anything starting with `NEXT_PUBLIC_` is **inlined into the browser bundle** at build time. Only ever put the publishable anon key here.
- The **service-role key bypasses RLS**, so it's server/script-only, never `NEXT_PUBLIC_`.
- The simulation service's file only has server-side vars.

## Root `.env.local` (frontend app)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Publishable key; safe in the browser |
| `NEXT_PUBLIC_SIMULATION_SERVICE_URL` | No | Where the sim service lives, e.g. `http://localhost:3001`. Blank → the app falls back to `localhost:3001` |
| `NEXT_PUBLIC_SIMULATION_SERVICE_TOKEN` | No | Bearer token the frontend sends to `/simulation/*`. Must match the sim service's `SIM_API_TOKEN`. Leave blank for local dev |
| `SUPABASE_SERVICE_ROLE_KEY` | Scripts only | Not read by the Next app itself — the browser never sees it. Used by seed/reset scripts |
| `ADMIN_PASSWORD` | No | Password used by `scripts/reset-admin.js` when recreating the demo admin |

The `NEXT_PUBLIC_SIMULATION_SERVICE_TOKEN` one deserves a callout: the sim service routes are the only place where a logged-in browser user could tell the fleet to change behavior. On a public deployment, set this token on both sides so random visitors can't start/stop your simulation. It's a shared-secret approach, not per-user auth — fine for this app's threat model.

## `simulation-service/.env`

| Variable | Required | Notes |
|----------|----------|-------|
| `SUPABASE_URL` | Yes | Same URL as the frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Secret; used to write metrics and update statuses. Never expose it |
| `PORT` | No | Default `3001` |
| `NODE_ENV` | No | `development` / `production` |
| `SIM_API_TOKEN` | No | When set, `/simulation/*` requires `Authorization: Bearer <token>`. Match the frontend's `NEXT_PUBLIC_SIMULATION_SERVICE_TOKEN` |

## `scripts/.env.local` (seed & maintenance scripts)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Same URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Needed because the seed script bypasses RLS to clear and repopulate tables |
| `ADMIN_PASSWORD` | No | Defaults to `password` if unset — set it before seeding or using `reset-admin.js` |

## Docker

For the frontend image, `NEXT_PUBLIC_*` vars are build-time inlining, so they're passed as **build args** to `docker build` (see the `Dockerfile` and `docker-compose.yml`). Runtime-only vars (`SUPABASE_SERVICE_ROLE_KEY`, `SIM_API_TOKEN`) are passed to the sim service container as environment variables. Get the split wrong and the app builds fine but connects to nothing — `docker compose` gets them from a root `.env` file.

## Where to find the values

All of these come from Supabase → **Project Settings → API**:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
- **`anon` public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **`service_role` key** → `SUPABASE_SERVICE_ROLE_KEY`

`SIM_API_TOKEN` / `NEXT_PUBLIC_SIMULATION_SERVICE_TOKEN` are ones you invent yourself, ideally via `openssl rand -hex 32` or similar.

## Checking you got it right

```bash
# Frontend: should print your project ref, not "undefined"
grep NEXT_PUBLIC_SUPABASE_URL .env.local

# Sim service: startup logs the env name and port, then "Simulation engine initialized"
cd simulation-service && npm run dev

# Seed: exits cleanly and prints the summary table
npm run seed
```

A common mistake: the seed script failing with a 401/403 usually means `SUPABASE_SERVICE_ROLE_KEY` is missing or wrong in `scripts/.env.local` (it reads that file, not the root one).
