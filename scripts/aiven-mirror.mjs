#!/usr/bin/env node
/**
 * aiven-mirror.mjs — optional off-site mirror of the FREE Payment Gateways Supabase data into
 * any PostgreSQL instance (Aiven Free, Neon, or any other).
 *
 * Why: FREE Payment Gateways's dashboard cannot *run* on Aiven (Supabase Auth + PostgREST +
 * RLS + Edge Functions live with Supabase — see docs/DEPLOY-VERCEL.md §8).
 * Neon and Aiven are both useful as a free, independent copy of the data: if the
 * Supabase project is ever paused, deleted or lost, you keep a readable copy
 * of every row outside Supabase.
 *
 * Each table is mirrored as raw JSONB, so upstream schema changes never break
 * the sync:
 *
 *   mirror.transactions(id text primary key, data jsonb not null, synced_at timestamptz)
 *   -- restore: select data from mirror.transactions;
 *
 * Usage:
 *   export SUPABASE_URL="https://PROJECT_REF.supabase.co"
 *   export SUPABASE_SERVICE_ROLE_KEY="service_role key (never commit)"
 *   export DATABASE_URL="postgres://avnadmin:...@...aivencloud.com:PORT/defaultdb?sslmode=require"
 *
 *   node scripts/aiven-mirror.mjs --dry-run   # print the plan, touch nothing
 *   node scripts/aiven-mirror.mjs             # actually sync
 *   node scripts/aiven-mirror.mjs --tables=transactions,devices
 *
 * Security: the service-role key bypasses RLS, so this script must only run in
 * a trusted place (your machine, or a private GitHub Actions job with secrets).
 */

import { createHash } from "node:crypto";
import pg from "pg";

const BATCH = 500;

const DEFAULT_TABLES = [
  "organizations",
  "user_roles",
  "merchants",
  "brands",
  "api_keys",
  "gateways",
  "transactions",
  "payment_links",
  "checkouts",
  "devices",
  "mfs_transactions",
  "webhooks",
  "webhook_deliveries",
  "licenses",
  "email_logs",
];

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const tablesArg = argv.find((a) => a.startsWith("--tables="));
const tables = tablesArg
  ? tablesArg.slice("--tables=".length).split(",").map((t) => t.trim()).filter(Boolean)
  : DEFAULT_TABLES;

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const DATABASE_URL = process.env.DATABASE_URL || "";

const log = (...parts) => console.log("[mirror]", ...parts);

function fail(message) {
  console.error("[mirror] ERROR:", message);
  process.exit(1);
}

/** Table names come from the CLI, so never interpolate them unchecked. */
function quoteIdent(name) {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`unsafe table name: ${name}`);
  return `"${name}"`;
}

if (dryRun) {
  log("dry run — no network calls, no writes");
  log("source:", SUPABASE_URL || "(SUPABASE_URL not set)");
  log("target:", DATABASE_URL ? "postgres (DATABASE_URL set)" : "(DATABASE_URL not set)");
  log("tables:", tables.join(", "));
  log(`plan: create schema mirror; upsert ${BATCH} rows per request as JSONB`);
  process.exit(0);
}

if (!SUPABASE_URL || !SERVICE_KEY) fail("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
if (!DATABASE_URL) fail("DATABASE_URL (Aiven PostgreSQL URI) is required");
if (!/sslmode=require/.test(DATABASE_URL)) log("hint: Aiven needs TLS — append ?sslmode=require");

function restHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    Accept: "application/json",
    ...extra,
  };
}

/** One page of rows from PostgREST. */
async function fetchPage(table, offset, order) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set("select", "*");
  url.searchParams.set("limit", String(BATCH));
  url.searchParams.set("offset", String(offset));
  if (order) url.searchParams.set("order", `${order}.asc`);

  const res = await fetch(url, { headers: restHeaders() });
  if (res.status === 404) return { missing: true, rows: [] };
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const rows = await res.json();
  return { missing: false, rows: Array.isArray(rows) ? rows : [] };
}

/** Pick a stable ordering column so offset pagination does not skip rows. */
async function detectOrder(table) {
  for (const column of ["created_at", "id"]) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    url.searchParams.set("select", column);
    url.searchParams.set("limit", "1");
    const res = await fetch(url, { headers: restHeaders() });
    if (res.ok) return column;
  }
  return null;
}

function rowKey(row) {
  if (row.id != null) return String(row.id);
  if (row.key != null) return String(row.key);
  // Stable fallback so re-runs are idempotent even without a primary key.
  const canonical = JSON.stringify(row, Object.keys(row).sort());
  return "h:" + createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}

async function mirrorTable(client, table) {
  const ident = quoteIdent(table);
  const order = await detectOrder(table);

  await client.query(
    `create table if not exists mirror.${ident} (
       id text primary key,
       data jsonb not null,
       synced_at timestamptz not null default now()
     )`,
  );

  let offset = 0;
  let written = 0;
  for (;;) {
    const { missing, rows } = await fetchPage(table, offset, order);
    if (missing) {
      log(`${table}: not exposed via PostgREST — skipped`);
      return 0;
    }
    if (rows.length === 0) break;

    const ids = rows.map(rowKey);
    const docs = rows.map((row) => JSON.stringify(row));
    await client.query(
      `insert into mirror.${ident} (id, data, synced_at)
       select t.id, t.data, now() from unnest($1::text[], $2::jsonb[]) as t(id, data)
       on conflict (id) do update set data = excluded.data, synced_at = now()`,
      [ids, docs],
    );

    written += rows.length;
    offset += rows.length;
    if (rows.length < BATCH) break;
  }
  log(`${table}: ${written} row(s) mirrored`);
  return written;
}

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: true } });
let total = 0;
let failed = 0;

try {
  await client.connect();
  await client.query("create schema if not exists mirror");
  for (const table of tables) {
    try {
      total += await mirrorTable(client, table);
    } catch (error) {
      failed += 1;
      log(`${table}: FAILED — ${error.message}`);
    }
  }
  log(`done — ${total} row(s) in mirror schema, ${failed} table(s) failed`);
  if (failed > 0) process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
