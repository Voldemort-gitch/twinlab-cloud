# TwinLab

A digital twin platform for monitoring computer labs in schools and universities. Every machine in a lab is a live node on a spatial grid — CPU, RAM, disk, temperature, health score — and that same data feeds a fleet-wide dashboard, analytics, and a maintenance ticketing system.

It's built so you can stand up a convincing, working lab-monitoring platform without owning any real hardware. A separate simulation service generates realistic metrics (with drift and the occasional outage), which makes it a good starting point for demos, capstone projects, or as a template for a production build.

## What's inside

- **Digital twin view** — labs laid out as a spatial grid of machines, each with live status, health ring, and a detail drawer
- **Fleet dashboard** — summary cards, CPU/RAM/disk trends, status distribution, alert breakdown
- **Analytics** — lab health, fleet trends, fault distribution, ticket status charts
- **Maintenance module** — full ticket lifecycle (create → assign → progress → resolve → close) with history
- **Admin panel** — simulation control, user management with roles, lab management
- **Notifications** — realtime alert feed with severity coding and unread badge
- **Role-based access** — admin / technician / viewer
- **Live updates** — Supabase Realtime pushes new metrics and alerts to the browser

## Tech at a glance

Next.js (App Router) + React + TypeScript on the front, Supabase (PostgreSQL, Auth, Realtime) for the backend, and a small Express service that simulates fleet telemetry. Tests run on Vitest. Everything ships in Docker.

## Quick start

You need a Supabase project and Node.js installed. The full walkthrough is in [docs/installation.md](docs/installation.md).

```bash
# 1. Copy env templates and fill in your Supabase credentials
cp .env.example .env.local
cp simulation-service/.env.example simulation-service/.env
cp scripts/.env.example scripts/.env.local

# 2. Install dependencies
npm install
cd simulation-service && npm install && cd ..

# 3. Create the database schema (in Supabase SQL Editor, run schema.sql)

# 4. Seed demo data (labs, computers, metrics, admin user)
npm run seed

# 5. Start the frontend and the simulation service
npm run dev                 # → http://localhost:3000
cd simulation-service && npm run dev   # → http://localhost:3001
```

Sign in at http://localhost:3000 with the admin account the seed script creates (`admin@twinlab.local`). See [docs/installation.md](docs/installation.md) for details on the password and resetting it.

## Documentation

| Doc | Covers |
|-----|--------|
| [Installation Guide](docs/installation.md) | Prerequisites, Supabase setup, schema, seeding, first login |
| [Architecture Overview](docs/architecture.md) | How the pieces fit together: web app, sim service, database, realtime |
| [Folder Structure](docs/folder-structure.md) | Where everything lives in the repo |
| [Technology Stack](docs/technology-stack.md) | Frameworks, libraries, versions, and why they were chosen |
| [Environment Variables](docs/environment-variables.md) | Every env var, what it does, and which ones are secret |
| [Development Guide](docs/development.md) | Daily workflows: scripts, testing, linting, adding features |
| [Deployment Guide](docs/deployment.md) | Docker, docker-compose, and managed hosting |
| [Future Improvements](docs/future-improvements.md) | Roadmap ideas and known limitations |

## Project status

All core features are implemented and passing: TypeScript strict (0 errors), lint clean, 34 unit tests, production build green. See [docs/future-improvements.md](docs/future-improvements.md) for what hasn't been done yet (real hardware integration, CI, e2e tests, and so on).

## Contributing

Open an issue or a pull request. If you're changing anything non-trivial, run the checks first:

```bash
npm run lint
npm run test
npm run build
```

## License

MIT — see [LICENSE](LICENSE) for details.
