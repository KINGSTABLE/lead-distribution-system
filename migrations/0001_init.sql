-- Lead Distribution System — D1 Schema
-- Compatible with Cloudflare D1 (SQLite)

CREATE TABLE IF NOT EXISTS providers (
  id               INTEGER PRIMARY KEY,
  name             TEXT    NOT NULL,
  service_ids      TEXT    NOT NULL,  -- JSON array e.g. "[1,3]"
  monthly_quota    INTEGER NOT NULL DEFAULT 10,
  leads_this_month INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS leads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  phone        TEXT    NOT NULL,
  city         TEXT    NOT NULL,
  service_type INTEGER NOT NULL,
  description  TEXT    NOT NULL,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(phone, service_type)   -- Duplicate prevention at DB level
);

CREATE TABLE IF NOT EXISTS lead_assignments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id     INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  provider_id INTEGER NOT NULL REFERENCES providers(id),
  assigned_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Persists round-robin pointer per service — survives server restarts
CREATE TABLE IF NOT EXISTS allocation_state (
  service_type INTEGER PRIMARY KEY,
  pool_index   INTEGER NOT NULL DEFAULT 0
);

-- Webhook idempotency — UNIQUE on id prevents double-processing
CREATE TABLE IF NOT EXISTS webhook_events (
  id           TEXT    PRIMARY KEY,
  payload      TEXT    NOT NULL,  -- JSON
  status       TEXT    NOT NULL DEFAULT 'processed',
  processed_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ── Seed data ─────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO providers (id, name, service_ids, monthly_quota, leads_this_month) VALUES
  (1, 'Provider 1', '[1,3]',   10, 0),
  (2, 'Provider 2', '[1,3]',   10, 0),
  (3, 'Provider 3', '[1,3]',   10, 0),
  (4, 'Provider 4', '[1,3]',   10, 0),
  (5, 'Provider 5', '[2,3]',   10, 0),
  (6, 'Provider 6', '[2,3]',   10, 0),
  (7, 'Provider 7', '[2,3]',   10, 0),
  (8, 'Provider 8', '[2,3]',   10, 0);

INSERT OR IGNORE INTO allocation_state (service_type, pool_index) VALUES
  (1, 0),
  (2, 0),
  (3, 0);
