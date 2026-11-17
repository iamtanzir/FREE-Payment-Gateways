#!/usr/bin/env node
/**
 * pg-config.js tests — no network required. Run: npm run test:db
 */
'use strict';

const assert = require('node:assert/strict');
const { buildPgConfig } = require('../src/pg-config');

const url = (q) => `postgresql://user:pass@host.example.com:5432/db${q || ''}`;

let n = 0;
const ok = (cond, msg) => {
  if (!cond) { console.error('✗ FAIL:', msg); process.exit(1); }
  n++;
  console.log('✓', msg);
};

// 1) Plain URL, no TLS hints → driver default
{
  const c = buildPgConfig(url() + '?PG_POOL_MAX=x', {});
  ok(c.mode === 'driver-default', 'no TLS hints → driver default');
  ok(!c.ssl, 'driver default carries no explicit ssl object');
  ok(c.max === 5, 'default pool size is 5');
}

// 2) sslmode=require → TLS, no chain verification (Aiven default behaviour)
{
  const c = buildPgConfig(url() + '?sslmode=require', {});
  ok(c.mode === 'tls-no-verify', 'sslmode=require → tls-no-verify');
  ok(c.ssl && c.ssl.rejectUnauthorized === false, 'sslmode=require does not verify the chain');
}

// 3) Aiven hostname → encryption, no chain verification
{
  const c = buildPgConfig('postgresql://u:p@pg-1234.aivencloud.com:12345/defaultdb', {});
  ok(c.mode === 'tls-no-verify', 'aivencloud.com host detected');
  ok(c.ssl.rejectUnauthorized === false, 'Aiven fallback skips chain verification (self-signed CA)');
}

// 4) Neon hostname → strict system CA
{
  const c = buildPgConfig('postgresql://u:p@ep-cool-name.ap-southeast-1.aws.neon.tech/db?sslmode=require', {});
  ok(c.mode === 'strict-public-ca', 'neon.tech host → strict system CA');
  ok(c.ssl.rejectUnauthorized === true, 'Neon uses public CAs — verification ON');
}

// 5) verify-ca / verify-full without CA env → strict system CA
{
  const c = buildPgConfig(url() + '?sslmode=verify-full', {});
  ok(c.mode === 'strict-public-ca', 'sslmode=verify-full → strict system CA');
}

// 6) DATABASE_CA_CERT wins over everything
{
  const c = buildPgConfig(url() + '?sslmode=verify-ca', { DATABASE_CA_CERT: '-----BEGIN CERTIFICATE-----\nCA\n-----END CERTIFICATE-----' });
  ok(c.mode === 'ca-verified', 'DATABASE_CA_CERT → ca-verified');
  ok(c.ssl.ca && c.ssl.ca.includes('BEGIN CERTIFICATE'), 'CA is passed to the driver');
  ok(c.ssl.rejectUnauthorized === true, 'CA verification is ON');
}

// 7) Aiven + proper CA → verified (this is the recommended setup)
{
  const c = buildPgConfig('postgresql://u:p@pg-9.aivencloud.com:12345/defaultdb?sslmode=require', { DATABASE_CA_CERT: 'CA-PEM' });
  ok(c.mode === 'ca-verified', 'Aiven + CA → ca-verified (fully verified connection)');
  ok(c.ssl.ca === 'CA-PEM', 'Aiven CA reaches the driver');
}

// 8) DATABASE_CA_CERT_FILE reads from disk
{
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const file = path.join(os.tmpdir(), `ca-${process.pid}.pem`);
  fs.writeFileSync(file, 'FILE-CA-PEM');
  try {
    const c = buildPgConfig(url(), { DATABASE_CA_CERT_FILE: file });
    ok(c.mode === 'ca-verified' && c.ssl.ca === 'FILE-CA-PEM', 'DATABASE_CA_CERT_FILE loads the CA');
  } finally {
    fs.rmSync(file, { force: true });
  }
}

// 9) DATABASE_CA_CERT_FILE missing → clear error, not silent fallback
{
  let threw = false;
  try { buildPgConfig(url(), { DATABASE_CA_CERT_FILE: '/no/such/file.pem' }); } catch (err) { threw = /unreadable/.test(err.message); }
  ok(threw, 'unreadable CA file is a hard error');
}

// 10) PG_POOL_MAX respected
{
  const c = buildPgConfig(url(), { PG_POOL_MAX: '3' });
  ok(c.max === 3, 'PG_POOL_MAX=3 is honoured');
  const bad = buildPgConfig(url(), { PG_POOL_MAX: 'abc' });
  ok(bad.max === 5, 'invalid PG_POOL_MAX falls back to 5');
}

// 11) invalid URL → clear error
{
  let threw = false;
  try { buildPgConfig('not-a-url'); } catch (err) { threw = /not a valid URL/.test(err.message); }
  ok(threw, 'invalid DATABASE_URL rejected with a readable message');
}

// 12) TLS query params are stripped so they cannot override the policy above
//     (pg-connection-string is parsed *after* our config and would win).
{
  const c = buildPgConfig('postgresql://u:p@ep-x.aws.neon.tech/db?sslmode=require&application_name=fpg', {});
  ok(!/[?&]sslmode=/.test(c.connectionString), 'sslmode removed from the connection string');
  ok(/application_name=fpg/.test(c.connectionString), 'non-TLS query params are preserved');
  ok(c.mode === 'strict-public-ca', 'Neon still resolves to strict public CA');
}
{
  const c = buildPgConfig('postgresql://u:p@h:6543/db?sslmode=require', { DATABASE_CA_CERT: 'CA-PEM' });
  ok(!/[?&]sslmode=/.test(c.connectionString), 'sslmode stripped even when a CA is supplied');
  ok(c.ssl.ca === 'CA-PEM' && c.ssl.rejectUnauthorized === true, 'explicit CA policy survives the URL');
}
// 13) Supabase (direct + pooler) uses a SELF-SIGNED chain → encrypted by default,
//     strict verification only with the dashboard CA (verified against a real project).
{
  const c = buildPgConfig('postgresql://u:p@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true', {});
  ok(c.mode === 'tls-no-verify', 'Supabase pooler host → encrypted, chain not verified');
  ok(c.ssl.rejectUnauthorized === false, 'pooler does not pretend to verify the self-signed chain');
  ok(!/[?&]sslmode=/.test(c.connectionString), 'pooled URL keeps pgbouncer but loses sslmode');
  ok(/pgbouncer=true/.test(c.connectionString), 'pgbouncer flag preserved');
}
{
  const c = buildPgConfig('postgresql://postgres.ref:p@db.ref.supabase.co:5432/postgres', {});
  ok(c.mode === 'tls-no-verify', 'Supabase direct host → encrypted by default (no sslmode needed)');
}
{
  const c = buildPgConfig('postgresql://u:p@db.ref.supabase.co:5432/postgres', { DATABASE_CA_CERT: 'SUPABASE-CA' });
  ok(c.mode === 'ca-verified' && c.ssl.rejectUnauthorized === true, 'Supabase + downloaded CA → full verification');
}

console.log(`\n✅ pg-config tests passed (${n} assertions)`);
