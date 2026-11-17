#!/usr/bin/env node
/**
 * setup-supabase.mjs — connect this project to a **free** Supabase project and
 * apply every migration, using only a database connection string.
 *
 * No Supabase CLI, no `supabase login`, no paid plan, no card. What you need:
 *   1. A free project at https://supabase.com  (Region: Singapore)
 *   2. Project Settings → API:            Project URL + anon/publishable key
 *   3. Project Settings → Database:       Connection string (URI) + DB password
 *
 * Usage
 *   npm run setup                # interactive: asks for the three values, writes .env
 *   npm run setup -- --check     # only test the connection, change nothing
 *   npm run setup -- --env-only  # write .env, do not touch the database
 *
 * Env vars (skip the prompts): SUPABASE_URL, SUPABASE_ANON_KEY, DATABASE_URL
 *
 * Re-running is safe: applied files are recorded in `_applied_migrations`, so a
 * second run only applies what is new.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "supabase", "migrations");
const envPath = path.join(root, ".env");
const envExamplePath = path.join(root, ".env.example");

const argv = process.argv.slice(2);
const checkOnly = argv.includes("--check");
const envOnly = argv.includes("--env-only");
// SUPABASE_DB_URL is the dedicated name for this script. DATABASE_URL is also
// accepted (same value), but the gateway itself reads DATABASE_URL too — keep
// that one for the gateway's own store.
const explicitDbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "";

const log = (...p) => console.log("[setup]", ...p);

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

async function ask(question, fallback = "") {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim() || fallback;
  } finally {
    rl.close();
  }
}

const existing = readEnvFile(envPath);
let supabaseUrl = (process.env.SUPABASE_URL || existing.VITE_SUPABASE_URL || "").trim();
let anonKey = (process.env.SUPABASE_ANON_KEY || existing.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();
let databaseUrl = explicitDbUrl.trim();

function fail(message) {
  log(`ERROR: ${message}`);
  process.exit(1);
}

if (!checkOnly && !envOnly && (!supabaseUrl || !anonKey || !databaseUrl)) {
  log("তিনটা মান দরকার (Supabase → Settings → API / Database):");
  if (!supabaseUrl) supabaseUrl = await ask("  Project URL (https://xxxx.supabase.co): ");
  if (!anonKey) anonKey = await ask("  anon / publishable key: ");
  if (!databaseUrl) databaseUrl = await ask("  Database connection string (postgresql://...): ");
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(supabaseUrl)) {
  fail(`Project URL must look like https://abcdefgh.supabase.co (got "${supabaseUrl || "empty"}")`);
}
if (anonKey.length < 40) fail("that does not look like an anon/publishable key (too short)");
if (/^(sb_secret_|service_role)/i.test(anonKey) || /service_role/.test(anonKey)) {
  fail("never put the service_role key in the SPA env — use the anon/publishable key");
}
if (!envOnly && !/^postgres(ql)?:\/\//.test(databaseUrl)) {
  fail("connection string must start with postgresql:// (Settings → Database → URI)");
}
if (databaseUrl && !/[?&]sslmode=/.test(databaseUrl)) {
  databaseUrl += (databaseUrl.includes("?") ? "&" : "?") + "sslmode=require";
  log("added ?sslmode=require to the connection string");
}

// pg ≥8.13 treats sslmode=require in the URI as verify-full (self-signed chain
// fails). The explicit `ssl` below handles encryption — so drop sslmode from the URI.
try {
  const u = new URL(databaseUrl);
  u.searchParams.delete("sslmode");
  databaseUrl = u.toString();
} catch { /* keep as-is */ }

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
log(`project: ${projectRef}`);

// --- write .env -------------------------------------------------------------

function writeEnv() {
  const template = fs.existsSync(envExamplePath)
    ? fs.readFileSync(envExamplePath, "utf8")
    : 'VITE_SUPABASE_URL=""\nVITE_SUPABASE_PUBLISHABLE_KEY=""\nVITE_SUPABASE_PROJECT_ID=""\n';
  let next = template
    .replace(/^#\s*VITE_SUPABASE_URL=.*$/m, `VITE_SUPABASE_URL="${supabaseUrl}"`)
    .replace(/^#\s*VITE_SUPABASE_PUBLISHABLE_KEY=.*$/m, `VITE_SUPABASE_PUBLISHABLE_KEY="${anonKey}"`)
    .replace(/^#\s*VITE_SUPABASE_PROJECT_ID=.*$/m, `VITE_SUPABASE_PROJECT_ID="${projectRef}"`);

  // Never clobber values that already exist in .env (ADMIN_PASSWORD, DATABASE_URL, …)
  const keep = Object.entries(readEnvFile(envPath)).filter(([k]) => !/^VITE_SUPABASE_/.test(k));
  if (keep.length) {
    next += '\n# preserved from previous .env\n' + keep.map(([k, v]) => `${k}="${v}"`).join('\n') + '\n';
  }

  fs.writeFileSync(envPath, next);
  log(`wrote ${path.relative(root, envPath)} — git-ignored, never commit it`);
}

// --- 1. is the project alive? ----------------------------------------------

try {
  const res = await fetch(`${supabaseUrl}/auth/v1/health`, { headers: { apikey: anonKey } });
  log(`auth endpoint: HTTP ${res.status}${res.ok ? " (reachable)" : ""}`);
  if (!res.ok) fail("project answered with an error — is it paused? (Dashboard → Restore project)");
} catch (error) {
  fail(`cannot reach ${supabaseUrl} — ${error.message}. Wrong URL, deleted/paused project, or offline.`);
}

if (envOnly) {
  writeEnv();
  process.exit(0);
}

// --- 2. database ------------------------------------------------------------

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

log(`${files.length} migration file(s) found`);

const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
let exitCode = 0;

try {
  await client.connect();
  const { rows: info } = await client.query("select current_database() as db, version() as v");
  log(`database: ${info[0].db} — ${info[0].v.split(",")[0]}`);

  if (checkOnly) {
    log("check only — nothing was written");
  } else {
    await client.query(`
      create table if not exists public._applied_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )`);

    const { rows: done } = await client.query("select name from public._applied_migrations");
    const applied = new Set(done.map((r) => r.name));

    let wrote = 0;
    let skipped = 0;
    for (const file of files) {
      if (applied.has(file)) {
        skipped += 1;
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      try {
        await client.query(sql);
        await client.query(
          "insert into public._applied_migrations (name) values ($1) on conflict do nothing",
          [file],
        );
        wrote += 1;
        console.log(`  ok   ${file}`);
      } catch (error) {
        console.log(`  FAIL ${file}`);
        console.log(`       ${error.message}`);
        log("stopped — fix the error above, then run `npm run setup` again (applied files are skipped)");
        exitCode = 1;
        break;
      }
    }
    if (exitCode === 0) {
      log(`applied ${wrote} migration(s), skipped ${skipped} already-applied file(s)`);
      writeEnv();
      log("next: npm run dev   →  http://localhost:8080");
      log("optional (payments): deploy the edge functions with the Supabase CLI");
    }
  }
} catch (error) {
  log(`database: connection failed — ${error.message}`);
  log("  → copy the URI from Supabase → Settings → Database (try the Session pooler if direct fails)");
  exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

process.exitCode = exitCode;
