# Prowider — Mini Lead Distribution System

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/KINGSTABLE/lead-distribution-system&env=DATABASE_URL&envDescription=PostgreSQL%20connection%20string%20from%20Neon%20(free%20at%20neon.tech)&envLink=https://neon.tech&project-name=lead-distribution&repository-name=lead-distribution-system)

> Full-stack Lead Distribution Web Application — Book My Packers Full Stack Internship Assessment

---

## 🚀 Live Demo — Deploy in 5 Minutes

### Step 1 — Get a Free PostgreSQL Database (2 min)
1. Go to **[neon.tech](https://neon.tech)** → Sign up free with GitHub
2. Create a new project (any region)
3. Copy the **Connection String** (looks like `postgresql://user:pass@host/db?sslmode=require`)

### Step 2 — Deploy to Vercel (2 min)
1. Click the **Deploy with Vercel** button above
2. When prompted for `DATABASE_URL`, paste your Neon connection string
3. Click **Deploy** — Vercel builds and runs `prisma db push` automatically

### Step 3 — Seed the Database (10 sec)
After your first deploy, visit: `https://YOUR-VERCEL-URL/api/setup`

That's it! Your live URL is ready to submit.

---

## Features

| Feature | Route | Status |
|---------|-------|--------|
| Customer Request Form | `/request-service` | ✅ |
| Provider Dashboard (live) | `/dashboard` | ✅ |
| Test Tools Panel | `/test-tools` | ✅ |
| Lead Distribution Engine | API | ✅ |
| Webhook Idempotency | `/api/webhooks` | ✅ |
| Concurrency Safety | Transactions | ✅ |
| Real-time Updates | SSE | ✅ |
| Duplicate Prevention | DB Constraint | ✅ |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL (Neon serverless) |
| ORM | Prisma 5 with serializable transactions |
| Real-time | Server-Sent Events (SSE) |
| Deployment | Vercel |

---

## Allocation Algorithm

### Business Rules

| Service | Mandatory Providers | Fair Pool | Fair Slots |
|---------|--------------------|-----------|-----------| 
| Service 1 — Home Shifting | Provider 1 | [2, 3, 4] | 2 |
| Service 2 — Office Relocation | Provider 5 | [6, 7, 8] | 2 |
| Service 3 — Vehicle Transport | Providers 1 & 4 | [2, 3, 5, 6, 7, 8] | 1 |

Every lead gets assigned to **exactly 3 providers**.

### Round-Robin Implementation

```
pool_index (per service) stored in allocation_state table.

On each new lead:
  1. SELECT ... FOR UPDATE on allocation_state row   ← serialises races
  2. Pick mandatory providers (skip if quota exhausted)
  3. Walk the fair pool from pool_index, skip quota-exhausted providers
  4. pool_index += slots_taken (persisted, survives restarts)
  5. UPDATE provider.leads_this_month++ atomically
  6. COMMIT with SERIALIZABLE isolation
```

The `pool_index` lives in PostgreSQL — zero in-memory state, correct after restarts.

---

## Concurrency Handling

- Every lead creation is wrapped in a **`SERIALIZABLE`** isolation transaction
- `SELECT FOR UPDATE` on the `allocation_state` row serialises concurrent requests per service
- PostgreSQL's row-level locking ensures no two concurrent leads assign the same provider slot or exceed quota
- Tested via `/test-tools` → "Fire 10 Concurrent Leads" (`Promise.allSettled`)

---

## Webhook Idempotency

```
POST /api/webhooks
Body: { event_id: "evt_abc123", event_type: "lead.created", payload: {...} }
```

- First call: `INSERT INTO webhook_events(id=evt_abc123)` → processes event
- Duplicate call: Prisma throws `P2002` (UNIQUE constraint on `event_id`)
- Handler catches `P2002` → returns `{ status: "already_processed" }` with HTTP 200
- Exactly-once semantics, no re-processing on retries

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/leads` | Create lead + auto-allocate providers |
| `GET` | `/api/leads` | List all leads |
| `GET` | `/api/providers` | Provider stats + all assignments |
| `GET` | `/api/events` | SSE stream for real-time dashboard |
| `POST` | `/api/webhooks` | Idempotent webhook receiver |
| `GET` | `/api/webhooks` | List processed webhook events |
| `POST` | `/api/test/reset-quotas` | Reset all provider quotas |
| `POST` | `/api/test/bulk-leads` | Fire N concurrent leads |
| `GET` | `/api/setup` | First-time database seed (idempotent) |

---

## Local Development

```bash
git clone https://github.com/KINGSTABLE/lead-distribution-system.git
cd lead-distribution-system
npm install

# Add your PostgreSQL connection string to .env.local
echo 'DATABASE_URL="postgresql://..."' > .env.local

npx prisma db push      # Create tables
curl http://localhost:3000/api/setup   # Seed after starting

npm run dev             # http://localhost:3000
```

---

## Database Schema

```
providers           — 8 providers, quota tracking
leads               — UNIQUE(phone, service_type) for duplicate prevention
lead_assignments    — junction: lead ↔ provider
allocation_state    — persisted round-robin pool_index per service
webhook_events      — UNIQUE(id) for webhook idempotency
```

---

Built by **Vraj** · [GitHub @KINGSTABLE](https://github.com/KINGSTABLE)
