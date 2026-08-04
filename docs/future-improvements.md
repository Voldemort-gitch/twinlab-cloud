# Future Improvements

TwinLab is feature-complete for a lab-monitoring demo and teaching tool. The list below covers what's *not* done — either because it's out of scope, or because it's the kind of thing you add when you're running real hardware.

## Real hardware integration

**Connect to actual machines.** Right now, the simulation service is the only data source. To monitor real labs:

- Write agents (Windows Service / systemd) that post CPU/RAM/disk/temperature to an intake API.
- Replace or augment `MetricGenerationService` with actual collection.
- Add a bulk ingestion endpoint to the sim service (or build a separate metrics collector).

This is straightforward — the schema and the frontend don't care where the data comes from.

## Infrastructure & DevOps

| Item | Notes |
|------|-------|
| **CI/CD pipeline** | GitHub Actions (or GitLab CI, etc.) to lint/test/build on every commit. Deploy on merge to main |
| **E2E tests** | Playwright or Cypress for full-flow testing (login → dashboard → create ticket, etc.) |
| **Database migrations** | A migration framework (e.g., Flyway, Liquibase) instead of hand-rolled SQL |
| **Observability** | Logs, metrics, traces to a platform like Datadog or New Relic |
| **Alert thresholds** | Configurable rules (e.g., "alert if CPU > 85%") instead of hardcoded thresholds |
| **Multi-region Supabase** | Deploy to different regions; pin requests to the nearest one |

## Product features

| Item | Notes |
|------|-------|
| **Ticket attachments** | The schema has an `attachments` table; wire it up to store files in Supabase Storage or S3 |
| **Email notifications** | Send ticket/alert emails via SendGrid or similar |
| **Slack integration** | Post alerts and ticket status to a Slack channel |
| **Bulk user import** | CSV → user creation (currently you add users one-at-a-time through the admin panel) |
| **Lab scheduling** | "This lab is closed 9–5 weekdays" — suppress alerts outside those windows |
| **Software license tracking** | Inventory already records software; add license counts and expiry dates |
| **Predictive maintenance** | ML model to flag machines likely to fail in the next week (based on trend data) |
| **Custom dashboards** | Let users pin/arrange widgets instead of a fixed layout |
| **API rate limiting** | Throttle the `/simulation/*` endpoints to prevent abuse |

## Data & scale

| Item | Notes |
|------|-------|
| **Data retention policy** | Delete metrics older than N days (keeps the DB size bounded and queries fast) |
| **Metrics aggregation** | Pre-compute hourly/daily summaries so 1-year queries don't timeout |
| **Pagination on lists** | Current pages load all results; add cursor-based or offset pagination for large fleets |
| **Full-text search** | Elasticsearch or Postgres `tsvector` for faster computer/lab search |
| **Time-series DB** | InfluxDB or TimescaleDB for metrics (better compression + queries than raw Postgres) |

## Quality

| Item | Notes |
|------|-------|
| **Accessibility audit** | Manual testing with a screen reader + keyboard-only navigation |
| **Internationalization** | i18n library + translations for non-English markets |
| **Dark/light mode toggle** | Currently dark-only; add theme switching |
| **Mobile responsiveness** | The design is responsive, but mobile UX could be tighter (e.g., swipe between tabs) |
| **Error boundaries** | Catch component crashes and show a fallback instead of a blank page |

## Operations

| Item | Notes |
|------|-------|
| **License file** | Add a LICENSE (MIT, Apache, etc.) to the repo root |
| **Contributing guide** | CONTRIBUTING.md with coding standards, PR process, etc. |
| **Security policy** | SECURITY.md documenting how to report vulnerabilities (instead of filing public issues) |
| **Changelog** | Keep a CHANGELOG.md so users know what changed between releases |
| **Release process** | Semantic versioning (major.minor.patch), GitHub Releases, tag bumps |
| **Code ownership** | CODEOWNERS file for automated PR reviews |

## Known limitations

Things that work but aren't perfect:

- **Simulation timing:** The tick loop runs on wall-clock time, not simulated time. If the machine is slow or Supabase is sluggish, ticks can bunch up.
- **Metrics growth:** `computer_metrics` gets ~1 row per machine per tick. At 100 machines and 5-second ticks, that's 17k rows per day. Over a year, it's 6 million rows. No built-in cleanup; add a retention policy or move old data to cold storage.
- **Realtime scalability:** Supabase Realtime can handle 100+ concurrent users, but at 1000+ you'll want a custom WebSocket broker or message queue.
- **RLS complexity:** RLS policies are powerful but can be hard to reason about and slow to debug. A complex RBAC model might be better in a dedicated auth service.
- **No audit trail:** Who changed a ticket and when? The `ticket_history` table records it, but there's no system-wide audit log. For compliance, add one.
- **Demo credentials:** The login page hints at demo creds; a real system should remove that or gate it behind an environment flag.

## Where to start

If you're going to contribute, these are good first targets:

1. **Add a LICENSE file** — choose MIT, Apache 2.0, or something else and drop it in the repo root.
2. **Write a CONTRIBUTING guide** — document the git workflow, how to format commits, testing expectations.
3. **Add E2E tests** — pick Playwright, write tests for the main flows (login, create ticket, start sim).
4. **Tighten the RLS policies** — review `schema.sql` for any policies that are too permissive.
5. **Add database retention** — write a cron job (or a Supabase edge function) that deletes metrics older than 30 days.

The roadmap isn't prioritized — pick whatever aligns with your goals. The codebase is deliberately simple so that adding features doesn't mean fighting frameworks or abstractions.
