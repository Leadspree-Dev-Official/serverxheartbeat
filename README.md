# Heartbeat Manager

> **Centralized Cloud Infrastructure Monitoring & Scheduled Health-Check Platform on Cloudflare Workers**

[![Platform](https://img.shields.io/badge/Platform-Cloudflare%20Workers-orange)](https://workers.cloudflare.com)
[![Engine](https://img.shields.io/badge/Engine-Sunday%20Cron%20Trigger-blue)](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-emerald)](https://supabase.com)
[![PRD](https://img.shields.io/badge/PRD-v1.0%20Compliant-success)](./PRD.md)

---

## 1. Overview & Purpose

**Heartbeat Manager** is a centralized operations platform that enables developers and small engineering teams to register, monitor, and manage cloud infrastructure health across **Supabase**, **Appwrite**, and generic HTTPS APIs from a unified dashboard.

- **Automated Sunday Schedule:** Executes scheduled heartbeat checks every Sunday at **9:00 AM IST (03:30 AM UTC)** using Cloudflare Workers Cron Triggers (`30 3 * * SUN`).
- **Least-Privilege Health Probes:** Uses documented, read-only health endpoints (e.g. `/rest/v1/` for Supabase, `/v1/health` for Appwrite) without writing junk rows to production databases or executing arbitrary SQL.
- **SSRF & Security Hardened:** Rejects private IP ranges (RFC1918), loopback, link-local, and cloud metadata targets (`169.254.169.254`). Secrets are encrypted and masked (`sk-****...`).
- **Cloudflare Worker Management from UI:** View live worker deployment status, configure schedules, and update deployed Cron Triggers directly via the Cloudflare REST API.
- **Provider Compliance Notice:** Distinguishes endpoint reachability from provider inactivity/lifecycle policies.

---

## 2. Monorepo Architecture

```text
ServerXHeartBeat/
├── apps/
│   ├── web/                    # React 18 + Vite + Tailwind CSS Admin Dashboard
│   │   ├── src/
│   │   │   ├── components/     # Shell, Dashboard, Projects, Jobs, Activity, Worker, Settings
│   │   │   ├── lib/            # Typed API client
│   │   │   └── App.tsx         # Tab-based operations deck
│   │
│   └── worker/                 # Cloudflare Worker Edge Engine
│       ├── src/
│       │   ├── api/            # Hono REST API (/api/projects, /api/jobs, /api/worker, ...)
│       │   ├── engine/         # Batch runner, SSRF guard, Bounded retries, Connectors
│       │   ├── services/       # Cloudflare API client, Supabase client & in-memory fallback
│       │   └── index.ts        # export default { fetch, scheduled }
│       ├── tests/              # Vitest test suites (SSRF guard, runner)
│       └── wrangler.jsonc      # Worker configuration & Cron Triggers
│
├── packages/
│   └── shared/                 # Shared TypeScript interfaces, Zod schemas, & constants
│
└── supabase/
    └── migrations/
        └── 20261020000000_init_schema.sql  # Complete PostgreSQL schema (RLS, indexes, triggers)
```

---

## 3. Database Schema (Supabase PostgreSQL)

The schema implements all 6 core tables defined in PRD Section 7:
1. `schedules`: Configured cron expressions (`30 3 * * SUN`), timezones (`Asia/Kolkata`), and enabled states.
2. `projects`: Registered Supabase, Appwrite, and Generic HTTP services with custom headers, expected status codes, timeouts, and masked secret references.
3. `heartbeat_runs`: Execution batches (scheduled vs. manual) with started/finished timestamps, project counts, and overall status (`success`, `partial`, `failed`).
4. `heartbeat_results`: Granular per-endpoint check records with HTTP response status, measured latency (ms), retry counts, and sanitized error summaries.
5. `activity_logs`: Immutable audit events for project mutations, manual tests, deployments, and cron updates.
6. `worker_deployments`: Tracking of Cloudflare Worker deployments and cron trigger synchronizations.

To apply migrations to your Supabase project:
```bash
# Using Supabase CLI
supabase db push
# Or run supabase/migrations/20261020000000_init_schema.sql directly in the Supabase SQL Editor
```

---

## 4. Getting Started

### Prerequisites
- Node.js `v20+`
- `pnpm` (`npm install -g pnpm`)
- Cloudflare Wrangler CLI (optional for direct deployments)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Variables
Copy `.env.example` to `apps/worker/.dev.vars` or set environment variables:
```ini
ENVIRONMENT=production
WORKER_NAME=heartbeat-engine
DEFAULT_CRON=30 3 * * SUN

# Supabase Control-Plane
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cloudflare Management API
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
```
*(Note: If Supabase or Cloudflare credentials are omitted, the application runs automatically in simulated local mode with pre-seeded data).*

### 3. Run Development Servers
```bash
# Run Cloudflare Worker API on port 8787
pnpm dev:worker

# In a separate terminal, run React Web Dashboard on port 3000
pnpm dev:web
```
Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

### 4. Run Automated Tests & Build
```bash
# Run unit & SSRF tests
pnpm test

# Verify TypeScript compilation & build production artifacts
pnpm build
```

---

## 5. Acceptance Criteria Checklist (PRD Section 14)

- [x] **AC 1-4:** Administrator dashboard with health summaries, response latency, and manual endpoint testing.
- [x] **AC 5:** Disabled projects are excluded from scheduled batch runs.
- [x] **AC 6-7:** Deployed Worker runs every Sunday at configured UTC time (`30 3 * * SUN` / 9:00 AM IST) covering all eligible projects.
- [x] **AC 8-9:** Individual successes and failures recorded in database and visible in Jobs History.
- [x] **AC 10:** Activity logs capture operational and administrative actions.
- [x] **AC 11-12:** Schedule editor converts local time to UTC cron and synchronizes with Cloudflare Worker Cron Trigger.
- [x] **AC 13-14:** UI Worker deployment with clear success and sanitized failure reporting.
- [x] **AC 15:** Secrets are masked (`sk-****...`) and never exposed to the browser or logs.
- [x] **AC 16:** SSRF protection rejects loopback, RFC1918 private IPs, and cloud metadata (`169.254.169.254`).
- [x] **AC 17:** Bounded retries with exponential backoff and idempotency handling.
- [x] **AC 18:** Partial-success status reported when only a subset of endpoints succeed.
- [x] **AC 19:** Historical records persist across worker redeployments.
- [x] **AC 20:** Clear distinction between HTTP endpoint reachability and provider inactivity/dormancy terms.

---

## 6. License
MIT License. Built for resilient cloud infrastructure monitoring.
