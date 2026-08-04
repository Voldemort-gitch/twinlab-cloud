# Installation Guide

This walks you through running TwinLab from scratch on your own machine. It assumes you're comfortable at a terminal and have a Supabase account. Plan for roughly 15–20 minutes.

## Prerequisites

- **Node.js 20+** (the Docker images use Node 22; anything modern works)
- **npm** (comes with Node)
- A **Supabase project** — the free tier is fine. Create one at https://supabase.com if you don't have it.

You do *not* need a database server running locally. The app talks to hosted Supabase, which gives you Postgres, auth, and realtime in one place.

## 1. Get the code and install dependencies

```bash
git clone <your-fork-or-repo-url> twinlab
cd twinlab

npm install
cd simulation-service && npm install && cd ..
```

Two separate `package.json` files, two `node_modules` trees. The frontend and the simulation service are independent packages.

## 2. Configure environment variables

Copy the template files and fill in real values:

```bash
cp .env.example .env.local
cp simulation-service/.env.example simulation-service/.env
cp scripts/.env.example scripts/.env.local
```

You'll need three things from your Supabase project (Dashboard → Project Settings → API):

| Variable | Where to put it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` + `scripts/.env.local` + `simulation-service/.env` |

The anon key is safe to expose to the browser. The service-role key is **not** — it bypasses row-level security, so it must only ever live in server-side or script files. Full detail in [environment-variables.md](environment-variables.md).

## 3. Create the database schema

Open your Supabase project, go to **SQL Editor**, paste the contents of `schema.sql`, and run it.

This creates 10 tables (`user_profiles`, `labs`, `computers`, `computer_metrics`, `health_scores`, `software_inventory`, `alerts`, `maintenance_tickets`, `ticket_history`, `attachments`), turns on row-level security on all of them, adds the RLS policies, and enables Realtime on the tables the frontend subscribes to.

You should see "Success" with no errors. If it complains about the `supabase_realtime` publication, it usually means Realtime isn't enabled on the project yet — re-run it after toggling Realtime on in the project settings.

## 4. Seed demo data

```bash
npm run seed
```

This clears existing data (in dependency order) and creates:

- 2 labs (Programming Lab, Networking Lab)
- 26 computers with positions on the grid
- 7 days of hourly metrics per computer
- A handful of software inventory records, alerts, and maintenance tickets
- The demo admin account

The script needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, which it reads from `scripts/.env.local` — that's why the `scripts/.env.example` file exists. Create `scripts/.env.local` with the same two values if you skipped step 2.

The admin account is `admin@twinlab.local`. The seed script creates it with a default password; set `ADMIN_PASSWORD` in `scripts/.env.local` before seeding to choose your own. If you want to recreate the account after the fact, run:

```bash
cd scripts
node reset-admin.js
```

## 5. Start the frontend

```bash
npm run dev
```

The app is now at http://localhost:3000. It redirects to the login page.

## 6. Start the simulation service

Open a second terminal:

```bash
cd simulation-service
npm run dev
```

The service listens on http://localhost:3001. This is what generates the live CPU/RAM/disk numbers. Without it, the dashboard still works — it just shows seeded (static) data, and the admin simulation controls won't have anything to talk to.

## 7. Log in

Go to http://localhost:3000 and sign in with `admin@twinlab.local`. If the password wasn't set to something you remember, run `node scripts/reset-admin.js` and use whatever `ADMIN_PASSWORD` (or default) it prints.

To see the sim data flowing, open the **Admin** page and hit **Start**, or start it from the terminal:

```bash
curl -X POST http://localhost:3001/simulation/start
```

## Verify it's working

- Dashboard shows labs, computer counts, and health scores, and the charts populate
- Digital Twin renders machines as colored nodes; details open on click
- Starting the simulation makes the numbers move and occasionally flips a machine to offline/maintenance
- New alerts show up in the bell in the header without a page refresh

## Troubleshooting

**Frontend won't start, missing Supabase env vars**
The client in `src/lib/supabase.ts` throws if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing from `.env.local`. Check the file exists and the values match your project.

**Tables not found**
`schema.sql` wasn't run, or it errored partway. Re-run the whole thing in the SQL Editor — the `CREATE TABLE IF NOT EXISTS` statements make it safe to run twice.

**Simulation service exits at startup**
It can't reach Supabase. Confirm `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `simulation-service/.env` are correct and the project is up.

**Login fails**
The auth user and `user_profiles` row must both exist. Easiest fix: run `node scripts/reset-admin.js`, which deletes and recreates both.

**Port 3000 or 3001 already in use**
Something else is on the port. Find and kill it, or run on another port with `PORT=3001 npm run dev`.
