#!/usr/bin/env node
/**
 * db-doctor.mjs — check your database before you rely on it.
 *
 * Works with every backend the gateway supports: **Turso/libSQL**,
 * **Aiven Free**, **Neon**, **Supabase Postgres**, **CockroachDB Serverless**,
 * self-hosted Postgres.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/db-doctor.mjs
 *   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." node scripts/db-doctor.mjs
 *   node scripts/db-doctor.mjs --url "postgresql://..."
 *   node scripts/db-doctor.mjs --no-check   # show the TLS policy only, don't connect
 *
 * For Aiven (self-signed CA): download the CA from the console
 *   Service → Overview → CA Certificate → copy →  save as aiven-ca.pem, then:
 *   DATABASE_CA_CERT_FILE=./aiven-ca.pem node scripts/db-doctor.mjs
 */
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';

const require = createRequire(import.meta.url);
const { buildPgConfig } = require('../src/pg-config');
const { resolveTurso } = require('../src/turso-config');

const argv = process.argv.slice(2);
const urlFlagIdx = argv.indexOf('--url');
const urlArg = urlFlagIdx !== -1 ? argv[urlFlagIdx + 1] : undefined;
const noCheck = argv.includes('--no-check');
const DATABASE_URL = urlArg || process.env.DATABASE_URL || '';

const log = (...p) => console.log('[db-doctor]', ...p);
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

function detectProvider(hostname) {
  const h = (hostname || '').toLowerCase();
  if (/aivencloud\.com$/.test(h)) return { name: 'Aiven Free', note: '1 GB, always free, 20 connections; self-signed CA → set DATABASE_CA_CERT' };
  if (/neon\.(tech|build)$/.test(h)) return { name: 'Neon', note: 'free tier; public CA (verification works out of the box); prefer the pooled endpoint for serverless' };
  if (/supabase\.co$/.test(h)) return { name: 'Supabase Postgres', note: 'direct connection (dedicated) or pooler (session mode, port 5432) — free tier' };
  if (/cockroachdb\.com$/.test(h)) return { name: 'CockroachDB Serverless', note: 'free tier; public CA' };
  if (/(127\.0\.0\.1|localhost)/.test(h)) return { name: 'self-hosted Postgres', note: 'local — no TLS required' };
  return { name: 'unknown provider', note: 'any Postgres with pg_hba.conf allowing your role' };
}

// ── Turso / libSQL (used when DATABASE_URL is not Postgres) ─────────
let turso = null;
if (!DATABASE_URL) {
  try {
    turso = resolveTurso(process.env);
  } catch (error) {
    log(`ERROR: ${error.message}`);
    process.exit(1);
  }
}

if (!DATABASE_URL && turso) {
  log(`provider : Turso / libSQL (via ${turso.source})`);
  log(`url      : ${turso.url}`);
  log('note     : serverless SQLite over HTTP — free tier, no persistent disk, no TCP pool');
  log(`auth     : ${turso.remote ? 'token present' : 'local file — no token needed'}`);
  if (noCheck) process.exit(0);

  let client;
  let ok = false;
  try {
    const libsql = require('@libsql/client');
    client = libsql.createClient({ url: turso.url, authToken: turso.authToken || undefined });
    const started = Date.now();
    const result = await client.execute('SELECT 1 AS ok');
    const value = result.rows?.[0]?.ok ?? 'ok';
    log(`check    : ✅ connected in ${Date.now() - started} ms (SELECT 1 → ${value})`);
    ok = true;
  } catch (error) {
    log(`check    : ❌ ${error.message}`);
    log(dim('  • 401/403 → create a fresh token: turso db tokens create <db>'));
    log(dim('  • 404 / DB_NOT_FOUND → wrong URL: turso db show <db> --url'));
    log(dim('  • ENOTFOUND → check the host / network'));
  } finally {
    try { client?.close(); } catch { /* ignore */ }
  }
  process.exit(ok ? 0 : 1);
}

if (!DATABASE_URL) {
  log('No external database configured — embedded SQLite will be used (fine locally, NOT on Vercel).');
  log('Example values (all free):');
  log('  Turso     TURSO_DATABASE_URL=libsql://fpg-xxxx.turso.io  TURSO_AUTH_TOKEN=eyJ...');
  log('  Aiven     postgresql://avnadmin:PASS@pg-xxxx.aivencloud.com:PORT/defaultdb?sslmode=require');
  log('  Neon      postgresql://USER:PASS@ep-xxxx.ap-southeast-1.aws.neon.tech/DB?sslmode=require');
  log('  Supabase  postgresql://postgres.PROJECT_REF:PASS@aws-0-REGION.pooler.supabase.com:6543/postgres');
  log('  Cockroach postgresql://USER:PASS@HOST.cockroachlabs.cloud:PORT/DB?sslmode=verify-full&options=-csearch_path%3Dpublic');
  log('Guide: docs/VERCEL-TURSO.md (Vercel) · docs/DATABASE.md (all providers)');
  process.exit(1);
}

let hostname;
let provider;
try {
  hostname = new URL(DATABASE_URL).hostname;
  provider = detectProvider(hostname);
} catch {
  log('ERROR: DATABASE_URL is not a valid URL');
  process.exit(1);
}

log(`provider : ${provider.name}`);
log(`host     : ${hostname}`);
log(`note     : ${provider.note}`);

let config;
try {
  config = buildPgConfig(DATABASE_URL, process.env);
} catch (error) {
  log(`ERROR: ${error.message}`);
  process.exit(1);
}

const policy = config.mode === 'ca-verified'
  ? 'strict — server verified against YOUR CA (best)'
  : config.mode === 'strict-public-ca'
    ? 'strict — server verified against system CAs (Neon/CockroachDB/Supabase direct)'
    : config.mode === 'tls-no-verify'
      ? 'TLS — encrypted but NOT verified (Aiven default; set DATABASE_CA_CERT to fix)'
      : 'driver default (no TLS — only OK for localhost)';

log(`tls      : ${policy}`);
log(`pool     : max=${config.max} idle=${config.idleTimeoutMillis}ms (Aiven/Neon free: PG_POOL_MAX=3 recommended)`);

if (noCheck) {
  log('--no-check: connectivity not tested');
  process.exit(0);
}

if (config.mode === 'tls-no-verify') {
  log(dim('hint: download the CA from the Aiven console and set DATABASE_CA_CERT_FILE for full verification'));
}

const t0 = Date.now();
const pg = require('pg');
const { mode, ...poolConfig } = config;
const pool = new pg.Pool(poolConfig);

try {
  const { rows } = await pool.query('select version() as v, current_database() as db, current_user as who');
  const ms = Date.now() - t0;
  log(`connect  : OK in ${ms} ms — db=${rows[0].db} role=${rows[0].who}`);
  log(`server   : ${rows[0].v.split(',')[0]}`);
  const { rows: t } = await pool.query('select 1 as one');
  log(`roundtrip: ${t[0].one === 1 ? 'OK' : 'FAILED'}`);
  log('RESULT   : this DATABASE_URL works for FREE Payment Gateways ✓');
} catch (error) {
  const msg = String(error?.message || error);
  log(`connect  : FAILED — ${msg}`);
  if (/self.?signed|certificate/i.test(msg)) log('  → the server presented an untrusted certificate. Set DATABASE_CA_CERT / DATABASE_CA_CERT_FILE to the provider CA (Aiven: Service → Overview → CA Certificate).');
  else if (/password authentication failed/i.test(msg)) log('  → wrong password. Copy the URI again from the console (password is URL-encoded).');
  else if (/ECONNREFUSED/i.test(msg)) log('  → nothing listening there — wrong host/port, or the service is paused/deleted.');
  else if (/does not exist/i.test(msg)) log('  → the database name is missing or wrong (Aiven uses "defaultdb").');
  else if (/timeout/i.test(msg)) log('  → connection timed out — firewall rules, wrong region, or the service is paused.');
  else if (/SSL/i.test(msg)) log('  → TLS problem — try appending ?sslmode=require (Aiven/Neon/Supabase require TLS).');
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}

await delay(0);
