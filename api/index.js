'use strict';
// ── Vercel serverless entry ───────────────────────────────────────────
// The Express app runs as a single serverless function; all routes are
// rewritten to it (see vercel.json).
//
// IMPORTANT: the filesystem is ephemeral on serverless — the embedded SQLite
// file will NOT persist between invocations. Set either:
//   • TURSO_DATABASE_URL + TURSO_AUTH_TOKEN   (Turso/libSQL over HTTP — recommended)
//   • DATABASE_URL                            (Postgres: Supabase pooler / Neon / Aiven)
// With either one set, node:sqlite is never loaded.
//
// Local check:
//   node -e "const h=require('./api/index.js');require('http').createServer(h).listen(3100)"
//   → open http://localhost:3100/health

// Serverless filesystem is ephemeral — the gateway requires an external database.
// This entry must not require ../src/server at module load time: the require chain
// (db.js → node:sqlite) can crash on runtimes without node:sqlite, and the crash
// must surface as a clear 503 instead of a bare FUNCTION_INVOCATION_FAILED.
// Lazy-require the app only after the database guard passes.
let ready = null;

// Without an external database there is NOTHING sensible to persist to; fail with
// a clear message instead of a bare 500.
const MISSING_DB_MESSAGE =
  'FREE Payment Gateways on serverless needs an external database. Set ONE of: ' +
  '(1) TURSO_DATABASE_URL + TURSO_AUTH_TOKEN — recommended, serverless SQLite over HTTP; ' +
  '(2) DATABASE_URL — PostgreSQL, e.g. the Supabase connection pooler ' +
  '(aws-0-<region>.pooler.supabase.com:6543), Neon, Aiven or CockroachDB. ' +
  'Add it in Vercel → Project → Settings → Environment Variables, then redeploy. ' +
  'Guide: docs/VERCEL-TURSO.md.';

function hasExternalDatabase(env) {
  return Boolean(
    env.TURSO_DATABASE_URL ||
    env.TURSO_URL ||
    env.LIBSQL_URL ||
    env.DATABASE_URL ||
    env.POSTGRES_URL ||           // Neon / Vercel Postgres injection
    env.POSTGRES_PRISMA_URL ||
    env.DATABASE_URL_UNPOOLED ||
    env.POSTGRES_URL_NON_POOLING
  );
}

module.exports = (req, res) => {
  if (!hasExternalDatabase(process.env)) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: MISSING_DB_MESSAGE }));
    return;
  }
  if (!ready) {
    const { createApp } = require('../src/server');
    ready = createApp();
    ready.catch((err) => {
      console.error('Failed to initialize app:', err);
      ready = null; // allow retry on next invocation
    });
  }
  ready.then((app) => app(req, res)).catch((err) => {
    console.error(err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  });
};
