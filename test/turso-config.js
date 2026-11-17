#!/usr/bin/env node
/**
 * turso-config.js tests — no network required. Run: npm run test:turso-config
 */
'use strict';

const assert = require('node:assert/strict');
const {
  isLibsqlUrl,
  normalizeUrl,
  resolveTurso,
  toLibsqlArgs,
  splitStatements,
  normalizeRow,
} = require('../src/turso-config');

let n = 0;
const ok = (cond, msg) => {
  if (!cond) { console.error('✗ FAIL:', msg); process.exit(1); }
  n++;
  console.log('✓', msg);
};

// 1) URL detection
ok(isLibsqlUrl('libsql://db-org.turso.io'), 'libsql:// URL detected');
ok(isLibsqlUrl('turso://db-org.turso.io'), 'turso:// URL detected (normalised later)');
ok(isLibsqlUrl('https://db-org.turso.io'), 'https:// URL detected');
ok(isLibsqlUrl('file:./local.db'), 'file: URL detected (local tests)');
ok(!isLibsqlUrl('postgresql://u:p@h/db'), 'postgres URL is not a libSQL URL');
ok(!isLibsqlUrl(''), 'empty string is not a libSQL URL');

// 2) normalisation
ok(normalizeUrl('turso://x.turso.io/') === 'libsql://x.turso.io', 'turso:// → libsql://, trailing slash removed');
ok(normalizeUrl('  libsql://x.turso.io  ') === 'libsql://x.turso.io', 'whitespace trimmed');
ok(normalizeUrl('file:C:\\data\\x.db') === 'file:C:\\data\\x.db', 'file: paths are not mangled');

// 3) env resolution — none configured
ok(resolveTurso({}) === null, 'no env → Turso backend off');

// 4) TURSO_DATABASE_URL + token
{
  const t = resolveTurso({ TURSO_DATABASE_URL: 'turso://db.turso.io', TURSO_AUTH_TOKEN: 'tok' });
  ok(t.url === 'libsql://db.turso.io', 'turso:// normalised in resolveTurso');
  ok(t.authToken === 'tok' && t.remote === true, 'token + remote flag set');
  ok(t.source === 'TURSO_DATABASE_URL', 'source key reported for diagnostics');
}

// 5) DATABASE_URL may carry a libSQL URL too
{
  const t = resolveTurso({ DATABASE_URL: 'libsql://db.turso.io', TURSO_AUTH_TOKEN: 'tok' });
  ok(t && t.source === 'DATABASE_URL', 'DATABASE_URL=libsql:// is accepted');
}

// 6) missing token for a remote DB → hard error (not a confusing 401 later)
{
  let threw = false;
  try { resolveTurso({ TURSO_DATABASE_URL: 'libsql://db.turso.io' }); } catch (err) { threw = /auth token is missing/i.test(err.message); }
  ok(threw, 'remote Turso without TURSO_AUTH_TOKEN fails with a readable error');
}

// 7) local file needs no token
{
  const t = resolveTurso({ TURSO_DATABASE_URL: 'file:./x.db' });
  ok(t && t.remote === false, 'file: URL works without a token');
}

// 8) invalid scheme
{
  let threw = false;
  try { resolveTurso({ TURSO_DATABASE_URL: 'mysql://x' }); } catch (err) { threw = /must be a libsql/.test(err.message); }
  ok(threw, 'unsupported scheme rejected with guidance');
}

// 9) parameter conversion
ok(JSON.stringify(toLibsqlArgs([undefined, true, false, 5, 'x'])) === '[null,1,0,5,"x"]',
  'undefined → null, booleans → 0/1');
ok(toLibsqlArgs([]).length === 0, 'empty args array stays empty');

// 10) schema splitting drops PRAGMA + comments
{
  const stmts = splitStatements(`
    PRAGMA journal_mode = WAL;
    -- a comment; with a semicolon
    CREATE TABLE a (id TEXT);
    CREATE INDEX i ON a(id);
  `);
  ok(stmts.length === 2, 'PRAGMA and comments are dropped, two statements kept');
  ok(stmts.every((s) => !/;$/.test(s)), 'trailing semicolons removed');
}

// 11) bigint normalisation (libSQL can return integers as bigint)
ok(normalizeRow({ a: 1n, b: 'x' }).a === 1, 'bigint column coerced to number');
ok(normalizeRow({ a: 1n }).a === 1 && typeof normalizeRow({ a: 1n }).a === 'number', 'coerced value is a number');

console.log(`\n✅ turso-config tests passed (${n} assertions)`);
