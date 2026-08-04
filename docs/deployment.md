# Deployment Guide

TwinLab ships with Docker support out of the box. You can run it locally with `docker compose`, or split it across managed hosting platforms.

## Local Docker (docker-compose)

The simplest path: everything runs on one machine.

1. **Fill in the env file:**
   ```bash
   cp .env.example .env
   cp simulation-service/.env.example simulation-service/.env
   ```
   Edit `.env` to add your Supabase credentials (same as for local dev).

2. **Build and run:**
   ```bash
   docker compose up -d --build
   ```
   This builds both images and starts the web and simulation containers. The frontend is on `:3000`, the sim service on `:3001`.

3. **Seed the database:**
   From your host machine (or inside the web container):
   ```bash
   npm run seed
   ```
   The compose setup doesn't auto-seed, so you need to do this once.

4. **Verify:**
   ```bash
   curl http://localhost:3000/auth/login    # should return HTML
   curl http://localhost:3001/health        # should return { "status": "ok", ... }
   ```

If you need to bring it down:
   ```bash
   docker compose down
   ```

To update after a code change:
   ```bash
   docker compose up -d --build
   ```

## Managed hosting (split deployment)

You can also deploy the frontend and sim service to different platforms.

### Frontend (Vercel, Railway, etc.)

The `Dockerfile` builds a **standalone** Next.js app (`output: 'standalone'` in `next.config.ts`), which means it doesn't depend on node_modules at runtime — just the `dist` and `public` directories.

**On Vercel:**
1. Push your code to GitHub.
2. Import the repo in Vercel.
3. Set environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SIMULATION_SERVICE_URL` (point it at your deployed sim service).
4. Deploy — it runs `npm run build` and serves the output.

**On Railway/Render/Fly.io:**
1. Connect your repo.
2. Set the same env vars.
3. Point the build command to `npm run build` and the start command to `npm start`.

The app is stateless after session setup, so you can scale it horizontally without sticky sessions.

### Simulation service (Railway, Render, Fly.io, etc.)

Deploy just the `simulation-service/` directory using its `Dockerfile`.

1. Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT` (defaults to 3001).
2. Optionally set `SIM_API_TOKEN` (if you want the frontend to authenticate). Make sure the frontend's `NEXT_PUBLIC_SIMULATION_SERVICE_TOKEN` matches.
3. The service starts with `npm start` (runs the compiled `dist/index.js`).

The service doesn't need scaling — it's a single background worker. If you don't want it running all the time, you can stop it and the dashboard will just show the seeded (static) data.

## Security checklist for production

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set only on the backend / sim service, never `NEXT_PUBLIC_`
- [ ] `NEXT_PUBLIC_SIMULATION_SERVICE_TOKEN` is set to a strong random token (both frontend and sim service)
- [ ] The simulation service's CORS middleware allows your frontend's origin (currently it allows all origins; tighten it if needed)
- [ ] Database backups are enabled in Supabase (it's on by default for paid plans)
- [ ] The demo admin account (`admin@twinlab.local`) is deleted or its password is changed from the default

## Environment variables for production

See [environment-variables.md](environment-variables.md) for the full reference. Key differences from local dev:

- `NEXT_PUBLIC_SIMULATION_SERVICE_URL` must point to the deployed sim service URL, not `localhost:3001`
- `SIM_API_TOKEN` should be a real secret (use `openssl rand -hex 32`)
- `NODE_ENV=production` on the sim service (optional but recommended for logging)

## Monitoring

The sim service has a `GET /health` endpoint that always responds with `{ "status": "ok" }`. Use it for liveness checks in your orchestration platform. The frontend is Next.js, so health checks usually just hit the root `/`.

The sim service logs to stdout in the format `[Simulation] ...` or `[Server] ...`. On a platform like Railway or Render, these appear in the service logs.

## Scaling notes

- **Frontend:** Stateless and fast; scales horizontally easily.
- **Simulation:** Single process, background worker. If it gets slow (high tick latency), increase the tick interval in the config, not the replica count. The service isn't CPU-bound; it's waiting on Supabase writes most of the time.
- **Database:** Supabase has connection pooling. At 100+ concurrent users on the frontend, consider enabling PgBouncer in the project settings.

## Rollback

Since each deployment is independent:
- Frontend: redeploy an older commit
- Sim service: roll back the image tag or redeploy an older version
- Database: Supabase snapshots (paid plans) let you restore to a point in time

The database schema has no migrations framework, so schema changes are manual — write a `.sql` file, apply it, and ship the code that expects the new schema together.
