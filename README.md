# Prowider — Mini Lead Distribution System

A full-stack lead distribution platform built for the **Book My Packers Full Stack Internship Assessment**.

## Live Demo
> Deploy link goes here after Vercel deployment

## Features

| Feature | Implementation |
|---------|----------------|
| Customer Request Form | `/request-service` — name, phone, city, service, description |
| Lead Distribution Engine | Serializable DB transactions + `SELECT FOR UPDATE` |
| Provider Dashboard | `/dashboard` — real-time via SSE + polling |
| Test Tools Panel | `/test-tools` — quota reset, bulk concurrency, webhook idempotency |
| Duplicate Prevention | DB `UNIQUE(phone, service_type)` constraint |
| Quota Enforcement | Atomic quota decrement inside transaction |
| Webhook Idempotency | `UNIQUE(event_id)` on `webhook_events` table |

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Node.js)
- **Database**: PostgreSQL (via [Neon](https://neon.tech) free tier)
- **ORM**: Prisma 5
- **Realtime**: Server-Sent Events (SSE)
- **Deployment**: Vercel + Neon

---

## Setup Instructions

### 1. Clone & Install

```bash
git clone https://github.com/KINGSTABLE/lead-distribution-system.git
cd lead-distribution-system
npm install
```

### 2. Configure Database

Create a free PostgreSQL database at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com).

Copy `.env.example` to `.env.local` and fill in your connection string:

```bash
cp .env.example .env.local
```

```env
DATABASE_URL="postgresql://user:password@host:5432/mydb?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Apply Schema & Seed

```bash
npx prisma db push          # Creates all tables
npx prisma db seed          # Inserts 8 providers + initial state
```

Or use the Prisma Studio to inspect data:
```bash
npx prisma studio
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment (Vercel + Neon)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add environment variable `DATABASE_URL` in Vercel project settings
4. Deploy — Vercel auto-runs `prisma generate` via `postinstall`
5. After first deploy, run seed: `npx prisma db seed` (with prod `DATABASE_URL`)

---

## Allocation Algorithm

### Business Rules

| Service | Mandatory Providers | Fair Pool | Fair Slots |
|---------|--------------------|-----------| -----------|
| Service 1 (Home Shifting) | Provider 1 | [2, 3, 4] | 2 |
| Service 2 (Office Relocation) | Provider 5 | [6, 7, 8] | 2 |
| Service 3 (Vehicle Transport) | Providers 1 & 4 | [2, 3, 5, 6, 7, 8] | 1 |

Total = **3 providers per lead** always.

### Round-Robin Implementation

```
pool_index (per service) stored in allocation_state table.

On each new lead:
  1. SELECT ... FOR UPDATE on allocation_state row  ← prevents races
  2. Pick mandatory providers (skip if quota = 0)
  3. Walk the fair pool starting at pool_index, skip quota-exhausted
  4. pool_index += slots_taken, persisted atomically
  5. UPDATE provider.leads_this_month++ in same transaction
  6. COMMIT
```

The `pool_index` survives server restarts because it lives in PostgreSQL, not memory.

### Concurrency Handling

- All lead creation runs inside a `SERIALIZABLE` isolation transaction
- `SELECT FOR UPDATE` on `allocation_state` serialises concurrent requests to the same service type
- No two concurrent requests can pick the same provider slot or exceed monthly quota

### Webhook Idempotency

- Callers supply a unique `event_id` string
- First call: `INSERT INTO webhook_events(id, ...)` — succeeds, event is processed
- Duplicate call: Prisma throws `P2002` (unique constraint violation)
- Handler catches `P2002` and returns `{ status: "already_processed" }` with HTTP 200
- Result: replay-safe, exactly-once semantics

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/leads` | Create lead + auto-allocate |
| `GET` | `/api/leads` | List all leads |
| `GET` | `/api/providers` | Provider stats + assignments |
| `GET` | `/api/events` | SSE stream (real-time updates) |
| `POST` | `/api/webhooks` | Idempotent webhook receiver |
| `GET` | `/api/webhooks` | List processed webhook events |
| `POST` | `/api/test/reset-quotas` | Reset all provider quotas |
| `POST` | `/api/test/bulk-leads` | Fire N concurrent leads |

---

## Database Schema

```
providers           — 8 providers, quota tracking
leads               — UNIQUE(phone, service_type)
lead_assignments    — junction: lead ↔ provider
allocation_state    — persisted round-robin index per service
webhook_events      — UNIQUE(id) for idempotency
```

---

Built by **Vraj** · [GitHub](https://github.com/KINGSTABLE)
