#!/usr/bin/env node
/**
 * Full end-to-end smoke test on the Turso/libSQL backend.
 *
 * It runs test/smoke.js in a child process with TURSO_DATABASE_URL pointing at a
 * local libSQL file, which exercises the exact same db.js code path used against
 * a remote Turso database (only the transport differs). Run: npm run test:turso
 */
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const file = path.join(os.tmpdir(), `fpg-turso-smoke-${process.pid}-${Date.now()}.db`);

function cleanup() {
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    try { fs.rmSync(file + suffix, { force: true, recursive: true }); } catch { /* ignore */ }
  }
}

cleanup();
console.log(`Turso backend smoke test → ${file}\n`);

const env = {
  ...process.env,
  TURSO_DATABASE_URL: `file:${file}`,
  TURSO_AUTH_TOKEN: '',
  DATABASE_URL: '',
  POSTGRES_URL: '',
  POSTGRES_PRISMA_URL: '',
  DATABASE_URL_UNPOOLED: '',
  POSTGRES_URL_NON_POOLING: '',
};

const res = spawnSync(process.execPath, [path.join(__dirname, 'smoke.js')], {
  env,
  stdio: 'inherit',
  timeout: 180_000,
});

cleanup();

if (res.error) {
  console.error('Turso smoke test failed to run:', res.error.message);
  process.exit(1);
}
if (res.status !== 0) console.error(`\n❌ Turso smoke test failed (exit ${res.status})`);
else console.log('\n✅ Turso/libSQL backend passed the full smoke test.');
process.exit(res.status === 0 ? 0 : 1);
