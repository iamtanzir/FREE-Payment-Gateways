'use strict';
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'fpg.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
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
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | paid | failed | cancelled
  provider      TEXT,                              -- demo | manual | stripe | bkash
  provider_ref  TEXT,                              -- provider-side id (stripe session id, bkash paymentID)
  metadata      TEXT NOT NULL DEFAULT '{}',
  success_url   TEXT NOT NULL DEFAULT '',
  cancel_url    TEXT NOT NULL DEFAULT '',
  webhook_url   TEXT NOT NULL DEFAULT '',
  trx_id        TEXT NOT NULL DEFAULT '',          -- manual provider: customer transaction id
  trx_sender    TEXT NOT NULL DEFAULT '',          -- manual provider: sender wallet/bank number
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  paid_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);

CREATE TABLE IF NOT EXISTS api_keys (
  id             TEXT PRIMARY KEY,
  label          TEXT NOT NULL DEFAULT '',
  prefix         TEXT NOT NULL,          -- first chars of the key, for display (fpg_ab12…)
  key_hash       TEXT NOT NULL UNIQUE,   -- sha256 of the full key
  webhook_secret TEXT NOT NULL,          -- used as HMAC secret for outbound webhooks
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
`);

module.exports = db;
