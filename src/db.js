'use strict';
// ── Three storage backends (same tiny async API) ─────────────────────
// 1. Default: embedded SQLite via node:sqlite (zero setup, works everywhere, free)
// 2. Turso / libSQL over HTTP (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN) — the
//    serverless-friendly choice for Vercel: no TCP sockets, no local disk.
// 3. PostgreSQL / CockroachDB / Neon / Supabase / Aiven (DATABASE_URL).
//
// All exported calls are async and expose: prepare(sql) → { run, get, all },
// plus exec(schemaSql) and close().

const path = require('path');
const fs = require('fs');
const { resolveTurso, toLibsqlArgs, splitStatements, normalizeRow } = require('./turso-config');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||           // Neon / Vercel Postgres injection
  process.env.POSTGRES_PRISMA_URL ||    // Prisma-compatible injection
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  '';

// Turso is only used when DATABASE_URL is not a Postgres URL.
const IS_POSTGRES = /^postgres(ql)?:\/\//i.test(DATABASE_URL);
const TURSO = IS_POSTGRES ? null : resolveTurso(process.env);
if (DATABASE_URL && !IS_POSTGRES && !TURSO) {
  console.warn(`[db] DATABASE_URL is neither postgres:// nor libsql:// — ignoring it and using embedded SQLite. Got "${DATABASE_URL.slice(0, 24)}…"`);
}
const SCHEMA_SQLITE = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS invoices (
  id            TEXT PRIMARY KEY,
  api_key_id    TEXT,
  amount_minor  INTEGER NOT NULL,
  currency      TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  customer_name  TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending',
  provider      TEXT,
  provider_ref  TEXT,
  metadata      TEXT NOT NULL DEFAULT '{}',
  success_url   TEXT NOT NULL DEFAULT '',
  cancel_url    TEXT NOT NULL DEFAULT '',
  webhook_url   TEXT NOT NULL DEFAULT '',
  trx_id        TEXT NOT NULL DEFAULT '',
  trx_sender    TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  paid_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);

CREATE TABLE IF NOT EXISTS api_keys (
  id             TEXT PRIMARY KEY,
  label          TEXT NOT NULL DEFAULT '',
  prefix         TEXT NOT NULL,
  key_hash       TEXT NOT NULL UNIQUE,
  webhook_secret TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  revoked_at     TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS webhook_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id  TEXT,
  url         TEXT,
  status_code INTEGER,
  ok          INTEGER NOT NULL DEFAULT 0,
  response    TEXT,
  created_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id            TEXT PRIMARY KEY,
  invoice_id    TEXT NOT NULL,
  url           TEXT NOT NULL,
  event         TEXT NOT NULL DEFAULT 'payment.paid',
  payload       TEXT NOT NULL,
  signature     TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | delivered | failed
  attempts      INTEGER NOT NULL DEFAULT 0,
  max_attempts  INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TEXT NOT NULL,
  last_status_code INTEGER,
  last_response TEXT,
  created_at    TEXT NOT NULL,
  delivered_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_due ON webhook_deliveries(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_invoice ON webhook_deliveries(invoice_id);

CREATE TABLE IF NOT EXISTS payment_links (
  id             TEXT PRIMARY KEY,
  label          TEXT NOT NULL DEFAULT '',
  amount_minor   INTEGER NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'BDT',
  description    TEXT NOT NULL DEFAULT '',
  webhook_url    TEXT NOT NULL DEFAULT '',
  success_url    TEXT NOT NULL DEFAULT '',
  cancel_url     TEXT NOT NULL DEFAULT '',
  webhook_secret TEXT NOT NULL DEFAULT '',
  max_uses       INTEGER NOT NULL DEFAULT 0,
  uses           INTEGER NOT NULL DEFAULT 0,
  enabled        INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL,
  revoked_at     TEXT
);
CREATE TABLE IF NOT EXISTS devices (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL DEFAULT '',
  webhook_key_hash   TEXT NOT NULL UNIQUE,
  webhook_key_prefix TEXT NOT NULL DEFAULT '',
  is_active          INTEGER NOT NULL DEFAULT 1,
  last_seen_at       TEXT,
  last_sms_at        TEXT,
  created_at         TEXT NOT NULL,
  revoked_at         TEXT
);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(is_active);
CREATE TABLE IF NOT EXISTS sms_events (
  id             TEXT PRIMARY KEY,
  provider       TEXT,
  sender         TEXT,
  amount_minor   INTEGER NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'BDT',
  trx_id         TEXT,
  raw_text       TEXT NOT NULL,
  status         TEXT NOT NULL,
  invoice_id     TEXT,
  device_id      TEXT,
  note           TEXT,
  received_at    TEXT NOT NULL,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sms_events_trx ON sms_events(trx_id);
CREATE INDEX IF NOT EXISTS idx_sms_events_created ON sms_events(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_events_device ON sms_events(device_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_enabled ON payment_links(enabled);
`;

const SCHEMA_PG = `
CREATE TABLE IF NOT EXISTS invoices (
  id            TEXT PRIMARY KEY,
  api_key_id    TEXT,
  amount_minor  BIGINT NOT NULL,
  currency      TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  customer_name  TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending',
  provider      TEXT,
  provider_ref  TEXT,
  metadata      TEXT NOT NULL DEFAULT '{}',
  success_url   TEXT NOT NULL DEFAULT '',
  cancel_url    TEXT NOT NULL DEFAULT '',
  webhook_url   TEXT NOT NULL DEFAULT '',
  trx_id        TEXT NOT NULL DEFAULT '',
  trx_sender    TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  paid_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);

CREATE TABLE IF NOT EXISTS api_keys (
  id             TEXT PRIMARY KEY,
  label          TEXT NOT NULL DEFAULT '',
  prefix         TEXT NOT NULL,
  key_hash       TEXT NOT NULL UNIQUE,
  webhook_secret TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  revoked_at     TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS webhook_log (
  invoice_id  TEXT,
  url         TEXT,
  status_code INTEGER,
  ok          INTEGER NOT NULL DEFAULT 0,
  response    TEXT,
  created_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id            TEXT PRIMARY KEY,
  invoice_id    TEXT NOT NULL,
  url           TEXT NOT NULL,
  event         TEXT NOT NULL DEFAULT 'payment.paid',
  payload       TEXT NOT NULL,
  signature     TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending',
  attempts      INTEGER NOT NULL DEFAULT 0,
  max_attempts  INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TEXT NOT NULL,
  last_status_code INTEGER,
  last_response TEXT,
  created_at    TEXT NOT NULL,
  delivered_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_due ON webhook_deliveries(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_invoice ON webhook_deliveries(invoice_id);

CREATE TABLE IF NOT EXISTS payment_links (
  id             TEXT PRIMARY KEY,
  label          TEXT NOT NULL DEFAULT '',
  amount_minor   BIGINT NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'BDT',
  description    TEXT NOT NULL DEFAULT '',
  webhook_url    TEXT NOT NULL DEFAULT '',
  success_url    TEXT NOT NULL DEFAULT '',
  cancel_url     TEXT NOT NULL DEFAULT '',
  webhook_secret TEXT NOT NULL DEFAULT '',
  max_uses       BIGINT NOT NULL DEFAULT 0,
  uses           BIGINT NOT NULL DEFAULT 0,
  enabled        INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL,
  revoked_at     TEXT
);
CREATE TABLE IF NOT EXISTS devices (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL DEFAULT '',
  webhook_key_hash   TEXT NOT NULL UNIQUE,
  webhook_key_prefix TEXT NOT NULL DEFAULT '',
  is_active          INTEGER NOT NULL DEFAULT 1,
  last_seen_at       TEXT,
  last_sms_at        TEXT,
  created_at         TEXT NOT NULL,
  revoked_at         TEXT
);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(is_active);
CREATE TABLE IF NOT EXISTS sms_events (
  id             TEXT PRIMARY KEY,
  provider       TEXT,
  sender         TEXT,
  amount_minor   BIGINT NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'BDT',
  trx_id         TEXT,
  raw_text       TEXT NOT NULL,
  status         TEXT NOT NULL,
  invoice_id     TEXT,
  device_id      TEXT,
  note           TEXT,
  received_at    TEXT NOT NULL,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sms_events_trx ON sms_events(trx_id);
CREATE INDEX IF NOT EXISTS idx_sms_events_created ON sms_events(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_events_device ON sms_events(device_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_enabled ON payment_links(enabled);
`;

function toPgParams(sql) {
  let n = 0;
  return String(sql).replace(/\?/g, () => '$' + (++n));
}

let sqlite = null;
let pgPool = null;
let tursoClient = null;
let mode = 'sqlite';

if (IS_POSTGRES) {
  mode = 'postgres';
  const { Pool, types } = require('pg');
  // BIGINT (int8) is returned as a string by pg to avoid precision loss, but our
  // money columns are well below 2^53, so numbers are both safe and expected by
  // the JSON API (amount_minor must stay a number).
  types.setTypeParser(20, (v) => (v === null ? null : Number(v)));
  // max: Aiven Free allows 20 connections total; serverless can spawn several
  // instances, so keep each pool small (`PG_POOL_MAX` overrides the default).
  // TLS policy (strict CA → system CAs → encryption-only → driver default):
  // see src/pg-config.js.
  const { buildPgConfig } = require('./pg-config');
  const pgOptions = buildPgConfig(DATABASE_URL);
  if (pgOptions.mode === 'tls-no-verify') {
    console.warn('[db] postgres TLS chain verification OFF (Aiven/Supabase use a self-signed chain). Set DATABASE_CA_CERT (or DATABASE_CA_CERT_FILE) to the provider CA for full verification.');
  }
  delete pgOptions.mode; // informational only
  pgPool = new Pool(pgOptions);
} else if (TURSO) {
  mode = 'turso';
  // `@libsql/client/web` talks HTTP only (no native binding, tiny on Vercel).
  // `file:` URLs (local tests) need the Node entry, which embeds libSQL.
  const entry = TURSO.remote ? '@libsql/client/web' : '@libsql/client';
  let libsql;
  try {
    libsql = require(entry);
  } catch (err) {
    throw new Error(
      'Turso/libSQL backend needs the "@libsql/client" package. Run `npm install` ' +
      `(it is a normal dependency). Underlying error: ${err.message}`
    );
  }
  tursoClient = libsql.createClient({
    url: TURSO.url,
    authToken: TURSO.authToken || undefined,
    intMode: 'number',
  });
  if (TURSO.remote) console.log(`[db] Turso/libSQL: ${TURSO.url} (via ${TURSO.source})`);
} else {
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'fpg.db');
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const { DatabaseSync } = require('node:sqlite');
  sqlite = new DatabaseSync(DB_PATH);
}

async function exec(sql) {
  if (mode === 'sqlite') {
    sqlite.exec(sql);
    return;
  }
  if (mode === 'turso') {
    const statements = splitStatements(sql);
    if (statements.length) await tursoClient.batch(statements, 'write');
    return;
  }
  await pgPool.query(sql);
}

// Idempotent migrations for existing databases (fresh installs get everything from schema)
async function migrate() {
  try {
    if (mode === 'sqlite') {
      const cols = sqlite.prepare("PRAGMA table_info(sms_events)").all().map((r) => r.name);
      if (!cols.includes('device_id')) sqlite.exec('ALTER TABLE sms_events ADD COLUMN device_id TEXT');
      return;
    }
    if (mode === 'turso') {
      // libSQL has no information_schema — probe the column instead.
      try {
        await tursoClient.execute('SELECT device_id FROM sms_events LIMIT 1');
      } catch {
        await tursoClient.execute('ALTER TABLE sms_events ADD COLUMN device_id TEXT');
      }
      return;
    }
    const r = await pgPool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='sms_events' AND column_name='device_id'"
    );
    if (r.rows.length === 0) await pgPool.query('ALTER TABLE sms_events ADD COLUMN device_id TEXT');
    // Money columns used to be 32-bit INTEGER (max ৳21,474,836). Widen them once;
    // ALTER … TYPE BIGINT is idempotent and instant on modern Postgres.
    for (const [table, column] of [
      ['invoices', 'amount_minor'],
      ['payment_links', 'amount_minor'],
      ['sms_events', 'amount_minor'],
      ['payment_links', 'max_uses'],
      ['payment_links', 'uses'],
    ]) {
      try {
        await pgPool.query(`ALTER TABLE ${table} ALTER COLUMN ${column} TYPE BIGINT`);
      } catch (err) {
        console.warn(`[db] widen ${table}.${column} skipped:`, err.message);
      }
    }
  } catch (err) {
    console.warn('[db] migration skipped:', err.message);
  }
}

// Schema is created eagerly for sqlite; lazily for postgres/turso (via `ready`).
let ready;
async function init() {
  if (mode === 'sqlite') {
    sqlite.exec(SCHEMA_SQLITE);
    return;
  }
  if (mode === 'turso') {
    const statements = splitStatements(SCHEMA_SQLITE);
    if (statements.length) await tursoClient.batch(statements, 'write');
    return;
  }
  // Run each statement separately and never abort boot on a failing
  // statement (e.g. CREATE INDEX requires table ownership — indexes are
  // optional at small scale). Tables themselves already exist.
  const statements = SCHEMA_PG.split(';').map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    try {
      await pgPool.query(stmt);
    } catch (err) {
      console.warn('[db] schema statement skipped:', err.message);
    }
  }
}
ready = init().then(migrate).catch((err) => {
  console.error('[db] schema init failed:', err.message);
  throw err;
});

function prepare(sql) {
  return {
    async run(...params) {
      await ready;
      if (mode === 'sqlite') {
        const r = sqlite.prepare(sql).run(...params);
        return { changes: r.changes ?? 0 };
      }
      if (mode === 'turso') {
        const r = await tursoClient.execute({ sql, args: toLibsqlArgs(params) });
        return { changes: Number(r.rowsAffected || 0) };
      }
      const r = await pgPool.query(toPgParams(sql), params);
      return { changes: r.rowCount ?? 0 };
    },
    async get(...params) {
      await ready;
      if (mode === 'sqlite') {
        const row = sqlite.prepare(sql).get(...params);
        return row === undefined ? undefined : row;
      }
      if (mode === 'turso') {
        const r = await tursoClient.execute({ sql, args: toLibsqlArgs(params) });
        return r.rows[0] ? normalizeRow(r.rows[0]) : undefined;
      }
      const r = await pgPool.query(toPgParams(sql), params);
      return r.rows[0];
    },
    async all(...params) {
      await ready;
      if (mode === 'sqlite') {
        return sqlite.prepare(sql).all(...params);
      }
      if (mode === 'turso') {
        const r = await tursoClient.execute({ sql, args: toLibsqlArgs(params) });
        return r.rows.map(normalizeRow);
      }
      const r = await pgPool.query(toPgParams(sql), params);
      return r.rows;
    },
  };
}

async function close() {
  await ready.catch(() => {});
  if (mode === 'sqlite') {
    sqlite.close();
  } else if (mode === 'turso') {
    tursoClient.close();
  } else {
    await pgPool.end();
  }
}

module.exports = { prepare, exec, close, mode };
