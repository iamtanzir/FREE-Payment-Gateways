'use strict';
// ── Turso / libSQL configuration ─────────────────────────────────────
// Turso (https://turso.tech) is serverless SQLite over HTTP. It is the
// recommended database for Vercel: no TCP socket, no persistent filesystem,
// no connection-pool limits — every serverless invocation just does a fetch().
//
// Accepted env vars (first match wins):
//   TURSO_DATABASE_URL=libsql://my-db-org.turso.io
//   TURSO_URL=libsql://…
//   LIBSQL_URL=libsql://…
//   DATABASE_URL=libsql://…            (also accepted)
//   TURSO_AUTH_TOKEN=<token>           (or TURSO_TOKEN)
//
// `turso://` is normalised to `libsql://` (the client only knows libsql/http/
// https/ws/wss/file). `file:` URLs are supported too, which is how the unit
// test runs the exact same code path locally without any network.
//
// Pure module (no I/O) so it can be unit-tested — see test/turso-config.js.

const URL_KEYS = ['TURSO_DATABASE_URL', 'TURSO_URL', 'LIBSQL_URL'];
const TOKEN_KEYS = ['TURSO_AUTH_TOKEN', 'TURSO_TOKEN', 'LIBSQL_AUTH_TOKEN'];

/** True for a string the libSQL client can use as a database URL. */
function isLibsqlUrl(value) {
  return /^(?:(?:libsql|turso|https?|wss?):\/\/|file:)/i.test(String(value || '').trim());
}

/** Normalise a Turso/libSQL URL for the client. */
function normalizeUrl(value) {
  let url = String(value || '').trim();
  if (!url) return '';
  // Turso's dashboard shows turso://…; the client only understands libsql://.
  url = url.replace(/^turso:\/\//i, 'libsql://');
  // A trailing slash makes libSQL request "/v2/pipeline/" — harmless, but keep it
  // tidy. Local file: paths are left untouched.
  if (!/^file:/i.test(url)) url = url.replace(/\/+$/, '');
  return url;
}

/**
 * Read Turso settings from env. Returns null when this backend is not selected.
 * Throws a readable error for a URL the client cannot use.
 */
function resolveTurso(env = process.env) {
  let source = '';
  let raw = '';
  for (const key of URL_KEYS) {
    const v = String(env[key] || '').trim();
    if (v) { raw = v; source = key; break; }
  }
  if (!raw) {
    const dbUrl = String(env.DATABASE_URL || '').trim();
    if (/^(libsql|turso):\/\//i.test(dbUrl) || /\.turso\.io(\/|$)/i.test(dbUrl)) {
      raw = dbUrl;
      source = 'DATABASE_URL';
    }
  }
  if (!raw) return null;
  if (!isLibsqlUrl(raw)) {
    throw new Error(
      `${source} must be a libsql://, turso://, https:// or file: URL — got "${raw.slice(0, 40)}". ` +
      'Copy the database URL from the Turso dashboard (turso db show <db> --url).'
    );
  }
  let authToken = '';
  for (const key of TOKEN_KEYS) {
    const v = String(env[key] || '').trim();
    if (v) { authToken = v; break; }
  }
  const url = normalizeUrl(raw);
  const remote = !/^file:/i.test(url);
  if (remote && !authToken) {
    throw new Error(
      'Turso auth token is missing — set TURSO_AUTH_TOKEN (turso db tokens create <db>). ' +
      'Remote libSQL databases reject unauthenticated requests.'
    );
  }
  return { url, authToken, remote, source };
}

/**
 * Convert JS values to libSQL-safe parameters. libSQL rejects `undefined`
 * (SQLite has only NULL) and has no boolean type.
 */
function toLibsqlArgs(params) {
  return (params || []).map((v) => {
    if (v === undefined) return null;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v instanceof Date) return v.toISOString();
    return v;
  });
}

/**
 * Split a multi-statement SQL script into individual statements.
 * libSQL has no "exec many" for arbitrary scripts (and no PRAGMA file mode),
 * so the schema is sent as one batch. Line comments and blank statements are
 * dropped; PRAGMA statements are skipped because Turso manages the file/WAL.
 */
function splitStatements(sqlText) {
  const withoutComments = String(sqlText || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
  return withoutComments
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^pragma\b/i.test(s));
}

/** Coerce driver values that may arrive as bigint into plain numbers. */
function normalizeValue(v) {
  return typeof v === 'bigint' ? Number(v) : v;
}

function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[k] = normalizeValue(v);
  return out;
}

module.exports = {
  URL_KEYS,
  TOKEN_KEYS,
  isLibsqlUrl,
  normalizeUrl,
  resolveTurso,
  toLibsqlArgs,
  splitStatements,
  normalizeRow,
};
