# ServerXHeartBeat — Key Infrastructure & Project Reference

This document contains the critical operational data, endpoints, configuration keys, and architecture settings for the **ServerXHeartBeat** platform.

---

## 1. Cloudflare Edge Deployment & Runtime

| Property | Value |
| :--- | :--- |
| **Production URL** | `https://heartbeat-engine.leadspree24x7.workers.dev` |
| **Worker Script Name** | `heartbeat-engine` |
| **Cloudflare Account ID** | `cf7e5f7d3d0906f6cb1c5c16ea306627` |
| **Cloudflare Account Name** | `Leadspree24x7@gmail.com's Account` |
| **Cloudflare KV Namespace** | `HEARTBEAT_KV` |
| **KV Namespace ID** | `4d892112d67d49049f35d63a9b7836d3` |
| **GitHub Repository** | `https://github.com/Leadspree-Dev-Official/serverxheartbeat` |
| **GitHub Default Branch** | `main` |
| **Runtime Environment** | Cloudflare Workers (V8 Edge Isolates) |
| **Scheduling Engine** | **Project-Driven Dynamic Cron Mapping** (Edge triggers sync automatically from active projects) |
| **Active Edge Triggers** | `30 3 * * SUN,WED` (Synchronized automatically from enabled projects via Cloudflare API) |
| **Free Tier Usage** | ~8 requests / month (out of 100,000 requests/day free quota; 99.99% free buffer) |

---

## 2. Supabase Integration Reference

| Property | Details |
| :--- | :--- |
| **Target Project URL** | `https://xyaabldfxxhemcqeqzuk.supabase.co` |
| **Inactivity Pause Rule** | Pauses free databases after **7 consecutive days (168 hours)** of inactivity. |
| **Recommended Health Endpoint** | `/rest/v1/` |
| **Required Key Type for `/rest/v1/`** | `service_role` (secret) key *(starts with `eyJ...`)* |
| **Alternative Health Endpoint** | `/auth/v1/health` *(accepts `anon` public key)* |
| **Key Location in Supabase** | **Supabase Dashboard → Project Settings → API → Project API keys** |
| **Authentication Headers Sent** | `apikey: <key>`, `Authorization: Bearer <key>`, and URL query param `?apikey=<key>` |
| **Expected HTTP Status Codes** | `200, 204` |
| **Keep-Alive Verification** | Returns `content-type: application/openapi+json`, touches PostgreSQL catalogs, resets the 7-day pause timer. |

---

## 3. Appwrite Cloud Integration Reference

| Property | Details |
| :--- | :--- |
| **Appwrite Region** | Singapore (`sgp`) |
| **Base API URL** | `https://sgp.cloud.appwrite.io` |
| **Target Project ID** | `6a576aeb003d10b7e816` |
| **Inactivity Pause Rule** | Pauses free databases after **14 days** of inactivity. |
| **Recommended Health Endpoint** | `/v1/health` |
| **Alternative Public Endpoint** | `/v1/health/version` *(no secret key required)* |
| **Required API Key Scope** | `health.read` |
| **Key Location in Appwrite** | **Appwrite Console → Settings → API Keys → Create API Key** (check `health.read`) |
| **Authentication Headers Sent** | `X-Appwrite-Project: 6a576aeb003d10b7e816`, `X-Appwrite-Key: <secret_api_key>` |
| **Expected HTTP Status Codes** | `200` |
| **Keep-Alive Verification** | Returns `{"name":"http","ping":0,"status":"pass"}`, resets the 14-day pause timer. |

---

## 4. Active Cron Triggers & Schedules

| Cadence | Cron (UTC) | Local Time (IST) | Purpose |
| :--- | :--- | :--- | :--- |
| **Default Weekly** | `30 3 * * SUN` | Sunday 09:00 AM IST | Optimal 7-day keep-alive maintenance |
| **Bi-Weekly (2x / week)** | `30 3 * * WED,SUN` | Wed & Sun 09:00 AM IST | 2x safety margin against Supabase pause |
| **Daily Ping** | `30 3 * * *` | Every day 09:00 AM IST | Continuous high-frequency monitoring |

---

## 5. Maintenance & Deployment Quick Commands

```bash
# 1. Typecheck the entire monorepo
pnpm typecheck

# 2. Run unit and connector tests
pnpm test

# 3. Build Web UI and embed into Worker bundle
pnpm --filter @heartbeat/web build && node scripts/embed-frontend.mjs

# 4. Deploy directly to Cloudflare Workers Edge
cd apps/worker && npx wrangler deploy

# 5. Inspect Cloudflare KV Persistent Storage
npx wrangler kv key list --namespace-id 4d892112d67d49049f35d63a9b7836d3
```
