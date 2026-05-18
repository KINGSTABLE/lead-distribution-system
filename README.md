# Prowider — Mini Lead Distribution System

> Full-stack Lead Distribution Web Application — Book My Packers Full Stack Internship Assessment  
> **Hosted on Cloudflare Pages + Cloudflare D1**

---

## 🚀 Live Demo

**URL:** _added after Cloudflare Pages deployment_

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router, Edge Runtime), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (Cloudflare Edge Runtime) |
| Database | **Cloudflare D1** (managed SQLite, single-writer linearizable writes) |
| ORM | Drizzle ORM (D1/SQLite adapter, fully edge-compatible) |
| Realtime | Server-Sent Events (SSE) |
| Hosting | **Cloudflare Pages** |

---

## Features

| Feature | Route | Notes |
|---------|-------|-------|
| Customer Request Form | `/request-service` | Duplicate prevention via D1 UNIQUE constraint |
| Provider Dashboard | `/dashboard` | Real-time via SSE, auto-refreshes every 3 s |
| Test Tools | `/test-tools` | Quota reset, 10 concurrent leads, webhook replay |
| Lead Distribution Engine | `POST /api/leads` | Drizzle transaction, round-robin fair allocation |
| Webhook Idempotency | `POST /api/webhooks` | PRIMARY KEY constraint on `event_id` |
| DB Auto-seed | `GET /api/setup` | Idempotent — safe to call multiple times |

---

## Allocation Algorithm

### Business Rules

| Service | Mandatory Providers | Fair Pool | Fair Slots |
|---------|--------------------|-----------|-----------| 
| 1 — Home Shifting | Provider 1 | [2, 3, 4] | 2 |
| 2 — Office Relocation | Provider 5 | [6, 7, 8] | 2 |
| 3 — Vehicle Transport | Providers 1 & 4 | [2, 3, 5, 6, 7, 8] | 1 |

Every lead → **exactly 3 providers**.

### Round-Robin Implementation

```
pool_index stored per service in allocation_state (D1 table).

On each new lead:
  1. Read pool_index from allocation_state  (inside transaction)
  2. Pick mandatory providers (skip if quota = 0)
  3. Walk fair pool from pool_index; skip quota-exhausted providers
  4. pool_index += slots_taken  → persisted atomically before COMMIT
  5. INSERT lead + assignments + UPDATE provider counts — all one transaction
```

### Concurrency Safety

Cloudflare D1 is **single-writer** — all writes are linearized at the D1 coordinator.  
This gives the same correctness guarantees as `SELECT FOR UPDATE` + `SERIALIZABLE`
in PostgreSQL, with no explicit locks needed.  
Stress-tested via `/test-tools` → "Fire 10 Concurrent Leads" (`Promise.allSettled`).

### Webhook Idempotency

```
POST /api/webhooks  { event_id: "evt_abc", event_type: "...", payload: {...} }

First call  → INSERT INTO webhook_events(id="evt_abc") → processes event
Duplicate   → SQLite UNIQUE violation caught → { status: "already_processed" }
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/leads` | Create lead + auto-allocate |
| `GET`  | `/api/leads` | List all leads |
| `GET`  | `/api/providers` | Provider stats + all assignments |
| `GET`  | `/api/events` | SSE stream (real-time) |
| `POST` | `/api/webhooks` | Idempotent webhook receiver |
| `GET`  | `/api/webhooks` | List processed webhook events |
| `POST` | `/api/test/reset-quotas` | Reset all provider quotas |
| `POST` | `/api/test/bulk-leads` | Fire N concurrent leads |
| `GET`  | `/api/setup` | First-deploy DB seed (idempotent) |

---

## Database Schema (D1 / SQLite)

```sql
providers        — 8 providers, quota tracking
leads            — UNIQUE(phone, service_type) duplicate prevention
lead_assignments — junction: lead ↔ provider
allocation_state — persisted round-robin pool_index per service
webhook_events   — PRIMARY KEY(id) for webhook idempotency
```

See [`migrations/0001_init.sql`](migrations/0001_init.sql) for full DDL + seed.

---

## Local Development

```bash
git clone https://github.com/KINGSTABLE/lead-distribution-system.git
cd lead-distribution-system
npm install

# Create a local D1 database (requires wrangler)
npx wrangler d1 create lead-distribution-db
# Copy the database_id into wrangler.toml

# Apply schema + seed locally
npx wrangler d1 execute lead-distribution-db --local --file=migrations/0001_init.sql

# Start local dev (D1 via wrangler dev platform)
npm run dev
```

---

Built by **Vraj** · [GitHub @KINGSTABLE](https://github.com/KINGSTABLE)
