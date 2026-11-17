'use strict';
// Build the pg.Pool config from a DATABASE_URL with correct TLS handling.
//
// Priority (stricter wins):
//   1. DATABASE_CA_CERT / DATABASE_CA_CERT_FILE  → verify the server against YOUR CA
//      (Aiven: download the CA from the console → Service → Overview → "CA Certificate")
//   2. sslmode=verify-ca / verify-full           → strict verification with system CAs
//   3. Neon / CockroachDB Serverless (public CA) → strict verification with system CAs
//   4. sslmode=require / *.aivencloud.com        → TLS, but skip chain verification
//      — Aiven's default cert chain is self-signed; set DATABASE_CA_CERT for real verification
//   5. No TLS hints                              → driver default (plain TCP)
//
// All of the above encrypt; only (1)–(3) also authenticate the server.
const fs = require('fs');

const POOL_DEFAULTS = {
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: true, // serverless: don't hold the invocation open for idle sockets
};

function readCaCert(env) {
  const fromEnv = (env.DATABASE_CA_CERT || '').trim();
  if (fromEnv) return fromEnv;
  const file = env.DATABASE_CA_CERT_FILE;
  if (file) {
    try {
      return fs.readFileSync(file, 'utf8').trim();
    } catch (err) {
      throw new Error(`DATABASE_CA_CERT_FILE is set but unreadable (${file}): ${err.message}`);
    }
  }
  return '';
}

function tryParseUrl(databaseUrl) {
  try {
    return new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL (expected postgresql://user:pass@host:port/db)');
  }
}

// TLS parameters in the URL are parsed by pg-connection-string *after* our
// explicit config and would silently override it (e.g. a pooled Supabase URL
// pasted with ?sslmode=require would downgrade us to "encrypt, verify nothing").
// Strip them so the policy below is the only source of truth.
const TLS_QUERY_KEYS = ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat'];

function sanitizeConnectionString(databaseUrl, parsed) {
  const u = new URL(parsed.toString());
  for (const key of TLS_QUERY_KEYS) u.searchParams.delete(key);
  return u.toString();
}

function buildPgConfig(databaseUrl, env = process.env) {
  if (!databaseUrl) throw new Error('buildPgConfig: databaseUrl is empty');

  const u = tryParseUrl(databaseUrl);
  const hostname = (u.hostname || '').toLowerCase();
  const sslmode = (u.searchParams.get('sslmode') || '').toLowerCase();
  const ca = readCaCert(env);

  const pgPoolMax = Number.parseInt(env.PG_POOL_MAX, 10);
  const config = {
    connectionString: sanitizeConnectionString(databaseUrl, u),
    max: Number.isFinite(pgPoolMax) && pgPoolMax > 0 ? pgPoolMax : 5,
    ...POOL_DEFAULTS,
  };

  const isPublicCa =
    /neon\.(tech|build)$/i.test(hostname) ||
    /cockroachdb\.com$/i.test(hostname);

  if (ca) {
    config.ssl = { rejectUnauthorized: true, ca };
    config.mode = 'ca-verified';
  } else if (sslmode === 'verify-ca' || sslmode === 'verify-full' || isPublicCa) {
    config.ssl = { rejectUnauthorized: true };
    config.mode = 'strict-public-ca';
  } else if (
    /sslmode=(require|prefer)/i.test(databaseUrl) ||
    /aivencloud\.com$/i.test(hostname) ||
    // Supabase ships a self-signed chain for BOTH the direct host and the
    // pooler — `rejectUnauthorized: true` fails with SELF_SIGNED_CERT_IN_CHAIN.
    // Encrypt by default; verify by supplying the dashboard CA.
    /(^|\.)supabase\.(co|com)$/i.test(hostname)
  ) {
    config.ssl = { rejectUnauthorized: false };
    config.mode = 'tls-no-verify';
  } else {
    config.mode = 'driver-default';
  }

  return config;
}

module.exports = { buildPgConfig, sanitizeConnectionString, TLS_QUERY_KEYS };
