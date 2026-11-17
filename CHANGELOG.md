# Changelog

## v1.13.0 — Public landing page at `/`, merchant login at `/admin/login`

- **`/` is now a real front door** (`src/landing.js`) mirroring the static Cloudflare Worker
  page (`public/index.html`): dark navy + yellow design, hero, payment-rails grid, an
  illustrated admin-dashboard mock (sample data), a Bangla MFS setup table, the approve flow,
  a 5-step quick start and a $0 hosting matrix — all inline CSS/JS, zero external
  assets/fonts/trackers. Header has GitHub + "Merchant login →" (`/admin/login`).
- `/admin/login`, `/admin`, `/pay/:id`, `/l/:id`, `/api/v1`, `/health` and the bridge are
  unchanged; `/` only gained a page. `LANDING_PAGE=0` restores the old `/` → `/admin` redirect.
- The landing page is a standalone document (does not reuse the dashboard CSS), so the
  dashboard styling cannot leak into the marketing page or vice versa.
- `test/smoke.js` now asserts the landing page, the login link, and the `LANDING_PAGE=0`
  escape hatch.
- New `.github/workflows/deploy-vercel.yml`: dormant until `VERCEL_TOKEN` + org/project IDs
  are added as repository secrets, then every push to `main` builds and ships to production
  (DB credentials stay in Vercel env vars, pulled with `vercel pull`).
- **Vercel-specific runtime fix (the "black screen `{"error":"Not found"}` after Sign in"
  bug):** Vercel's edge normalises `302` redirects of non-GET requests into `307`, so the
  browser re-POSTed the login form to `/admin` — no such route → 404 JSON. Every POST
  redirect is now `303 See Other` (303 forces the follow-up request to `GET`), matching the
  correct post-form semantics on plain Express too. `test/smoke.js` asserts `303` after
  POSTs and still `302` after GETs; a local Vercel-edge simulation (302→307 rewriting proxy)
  walks the exact Sign-in flow and lands on the dashboard.
- Content negotiation prefers HTML for browser navigation: `Accept: */*` no longer renders
  the raw JSON 404 page — browsers always get the styled HTML page, and `/api/v1` keeps
  returning JSON 404s for every client (terminal JSON 404 inside the API router).
- Docs: README (routes + quick start), `docs/VERCEL-TURSO.md` (what you see after deploy),
  `.env.example` (`LANDING_PAGE`).
- UI fixes: the dashboard/checkout footer now sits on the true viewport bottom line on short
  pages (webhook queue, single-invoice screens) via a `flex` column body + `margin-top:auto`;
  the previous `padding-bottom:64px` on the content wrapper left a visible 64px gap below
  the credit.
- **Mobile layout fixed on the landing page** (`src/landing.js` and the static
  `public/index.html` design reference): the nav no longer squeezes the brand into a
  one-character column, the page no longer scrolls sideways at 320–560px, the hero buttons
  go full-width, the merchant-dashboard illustration scrolls inside its own frame, and the
  5-column MFS table drops the redundant audience/cost columns so the remaining “what /
  where” columns are readable without horizontal scrolling. The long code snippets and
  URLs now wrap instead of widening the page, and the footer credit never splits
  “Tanzir Ahmed” across two lines.
- The landing page no longer shows a duplicate "Merchant login →" button (hero CTA is
  "Up and running in 5 steps →" which scrolls to the quick-start; the persistent nav button
  is the single login affordance). The quick-start no longer repeats a second login link.
- **Footer deduplicated on every page** (landing, dashboard, login, checkout, 404): the old
  landing page stacked three lines that repeated the author, the license and the brand. It is
  now one line — brand · AGPL-3.0 License · Source · Deployment guide · Built with ❤️ using
  Tanzir Ahmed — and the dashboard/login/checkout footers show the exact same line.
- **Merchant login page polish:** once a merchant is signed in, `/admin/login` redirects
  straight to `/admin` instead of showing the form a second time; rate-limited submissions
  render the styled login card with a clear message (plus `Retry-After`) instead of plain
  text; the page is `Cache-Control: no-store`, uses a semantic `h1`, and stays centered with
  the footer pinned to the bottom at every viewport size.
- Mobile dashboard nav now wraps cleanly instead of overflowing horizontally; tables remain
  inside their cards and the footer is pinned on short pages at 320/360/390/414/768px.
- `vercel.json` fix: `functions.api/index.js.includeFiles` must be a **string**, not an
  array — it now is (`public/**`, the only folder read at runtime; `src/` is pulled in
  automatically by Vercel's file tracing), which unblocks Vercel's schema validation
  (the previous deploy failed with "should be string").
- `vercel.json` sets `"framework": null` (disables the Vite preset / auto-detection) and
  points `outputDirectory` at **`.vercel-static/`** — a single-file directory emitted by
  `scripts/vercel-build.js` at the end of the build (`buildCommand` is now
  `npm run build:app && node scripts/vercel-build.js`). Declaring `dist/` previously
  failed with "No Output Directory named `dist` found" and, once created, failed again
  with "The Output Directory `dist` is empty"; declaring `public/` was avoided too
  because it contains `index.html`, which could shadow the catch-all rewrite and serve
  the wrong front page. `.vercel-static/` is non-empty yet shares no request path with
  the gateway, so the build check passes deterministically and every request still
  reaches `api/index.js`.
  (`includeFiles` is `public/**` — the only folder read at runtime; `src/` is pulled in
  automatically by Vercel's file tracing.)

## v1.12.0 — Vercel-ready: Turso/libSQL + Supabase pooler, plus a dashboard bug-fix pass

**New backend: Turso / libSQL (`src/turso-config.js`, `src/db.js`)**
- Third storage backend next to SQLite and Postgres: `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
  (`TURSO_URL`, `LIBSQL_URL`, and `DATABASE_URL=libsql://…` also accepted). `turso://` is
  normalised to `libsql://`; a missing token fails at boot with a readable error.
- Remote DBs use `@libsql/client/web` (HTTP only — no native binding, no TCP pool); local
  `file:` URLs use the Node entry, so `npm run test:turso` runs the full smoke suite offline.
- Schema is created in one batch on first request; `migrate()` probes/alters `device_id`
  idempotently. `/health` now reports `"db":"sqlite" | "turso" | "postgres"`.
- Fully unit-tested (`test/turso-config.js`, 23 assertions) and end-to-end tested
  (`test/turso-smoke.js` → runs `test/smoke.js` on the libSQL backend).

**Vercel**
- `api/index.js` accepts Turso **or** Postgres and returns a clear 503 listing both options;
  `vercel.json` adds a daily `/cron/webhook-sweep` (protected by optional `CRON_SECRET`).
- `BASE_URL` is optional on Vercel: `envBaseUrl()` derives it from
  `VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL` (used by checkout links, API examples, logs).
- New guide `docs/VERCEL-TURSO.md` (Bangla): Turso setup + CLI, SQLite→Turso dump, Supabase
  transaction-pooler URI, env table, verification, troubleshooting, honest free-tier limits.
  `docs/DATABASE.md`, `docs/DEPLOY-ANYWHERE.md` §9 and `docs/DEPLOYMENT.md` updated.

**Dashboard / gateway fixes**
- **Settings form**: all documented fields are now rendered (iPay, Tap, bank details, manual
  note, Bangla QR image + note were saved by the API but impossible to set in the UI). One
  `SETTING_GROUPS` list now drives both the form and the POST handler, so they cannot drift.
- **Password change**: rotates the session secret *and* issues a fresh cookie, so the merchant
  stays signed in, sees the success banner, and every other device is logged out.
- **Paid/cancel redirects** without `success_url`/`cancel_url` stay on `/pay/:id` instead of
  sending the customer to `/` (which is the merchant login).
- **`markPaid()` is atomic** (`UPDATE … WHERE status <> 'paid'`) — concurrent approvals can no
  longer fire duplicate webhooks; `markStatus()` cannot downgrade a paid invoice.
- **TrxID anti-fraud**: one transaction ID can only be claimed by one invoice (409 on reuse),
  and malformed TrxIDs/senders are rejected with a 400.
- **Postgres money columns → BIGINT** (`amount_minor`, `max_uses`, `uses`) with an idempotent
  migration; `int8` is parsed as a number so the JSON API is unchanged.
- **Unique checkout ids**: manual and Bangla QR panels no longer render duplicate
  `trx_sender`/`trx_id` ids (labels focused the wrong form).
- **HTML error pages**: 404/500/4xx now return a styled page for browsers and JSON for API
  clients (content negotiation), instead of raw JSON in the browser.
- **Empty settings stick**: `getSetting()` distinguishes "unset" from an explicit `''`, so a
  cleared field no longer silently reverts to its default.
- **TLS hardening**: `sslmode`/`sslrootcert`/`sslcert`/`sslkey` are stripped from `DATABASE_URL`
  before `pg` parses it, so a pasted `?sslmode=require` cannot downgrade the CA policy.
  Supabase (direct **and** pooler) was verified live to use a **self-signed chain** — it is now
  classified as encrypted-but-unverified by default (`DATABASE_CA_CERT` enables full
  verification) instead of the previous, failing "strict public CA" assumption.
- **Checkout layout**: `safe center` + column flex, so long checkout pages scroll instead of
  being clipped at the top on short screens.
- Payment-link checkout rolls back the used count if invoice creation fails.
- `vercel.json` function memory 1024 MB / 30 s; baseline security headers (`nosniff`,
  `SAMEORIGIN`, `no-referrer`) on every response.
- Removed the duplicate `pg` devDependency, deleted leftover empty legacy directories.
- Tests: smoke suite now covers settings persistence, redirects, TrxID reuse, concurrent
  approval idempotency, HTML/JSON 404 and password rotation; `npm test` runs pg-config +
  turso-config + MFS parser + gateway smoke; `npm run test:all` adds the Turso smoke + plugin.

## v1.11.2 — README: "কী কী করা সম্ভব" added (capability matrix) + version bump
- README now includes a full capability matrix (rails, SMS auto-verify, WooCommerce plugin,
  REST API, hosting options), honest statement of what's missing (cards, PCI, PHP-only), and a quick demo snippet.
- version → 1.11.2.

## v1.11.0 — Universal BD MFS: all free rails, all wallets (unreleased, folds into next squash)

- **Parser extended** (`src/mfs-parser.js`): bKash, Nagad, Rocket, Upay, mCash, Cellfin, OK Wallet,
  iPay, Tap, Telecash, Pathao Pay, AamarPay, PayStation, EPS — EN + Bangla SMS supported, bn digits
  normalized, Android-masked numbers handled. Fixed: TrxID fallback regex no longer misreads a plain
  BD mobile number (11 digits) as a TrxID.
- **Manual provider panel** (`src/providers/manual.js` + `src/routes/admin.js` + `src/settings.js`):
  merchants can now set numbers for **Upay, mCash, Cellfin, OK Wallet, iPay, Tap** alongside
  bKash/Nagad/Rocket/Bank — the checkout "Manual" panel lists every configured rail.
- **Regression suite** `test/mfs-parser.test.js` (55 assertions, EN + Bangla SMS for the 8 major
  rails, provider detection, replay/fallback behavior). Wired into `npm test` / `npm run test:all` /
  separate `test:mfs`.
- Docs: README + `docs/MERCHANT-SETUP.md` updated to list all supported rails (no per-transaction fees).
- Verified end-to-end: `npm run test:all` green (pg-config 20 + MFS parser 55 + gateway smoke + WordPress plugin).

## v1.10.0 — Two interfaces, one repo: `/admin` (default, single merchant) + `/app` (optional, multi-merchant)

- **`src/dashboard/` removed; everything lives in this one repo now.** The merchant SPA moved to
  **`src/dashboard/`** (Vite root, base `/app/`), the backend to **`supabase/`** at the repo root,
  every script merged into **`scripts/`** (setup-supabase, aiven-mirror, db-doctor).
- **One `package.json`** at the root — gateway deps only (`express`, `pg`); the SPA's whole toolchain
  (React, Vite, Tailwind, Radix, Supabase client…) moved to `devDependencies`. Runtime stays tiny.
- **`npm run build:app`** = `vite build` straight from `src/dashboard/vite.config.ts` (base `/app/`,
  `outDir=public/app`); the gateway serves the result at `/app` (see v1.9.0).
- **Dockerfile stage 1 rewritten** for the new layout; **vercel.json** runs `npm run build:app`
  and bundles `public/app` into the serverless function.
- **Email pipeline decoupled from any vendor**: `supabase/functions/_shared/email.ts` sends via
  **Resend** (`RESEND_API_KEY`) or any HTTPS webhook (`EMAIL_WEBHOOK_URL`); `auth-email-hook`
  verifies **Standard Webhooks** signatures (Supabase Auth Hook compatible, `AUTH_HOOK_SECRET`).
  No third-party email/webhook SDKs remain — auth emails work with your own provider.
- **Docs**: every API snippet uses the `YOUR_PROJECT_REF.supabase.co` placeholder; no live
  project URLs are committed.
- **Product rebranded to FREE Payment Gateways** everywhere: UI copy, metadata,
  page titles, footer copyright, email templates, license defaults, Capacitor app id
  (`com.freepaymentgateways.app`), localStorage keys (`fpg_current_org`), postMessage types
  (`fpg_create_payment`/`fpg_payment_created`/`fpg_error`), and the built asset
  `fpg-logo.svg` (new original mark — the old PNG is gone). Docs (`README`, `docs/*`,
  `NOTICE.md`) updated to match. The previous product name no longer appears anywhere in the tree.
- **Graphical redesign — admin-style polish**: the SPA theme is now the same dark-navy
  language as `/admin` (— radial gradients, #131a33 cards, green-teal + sky accents,
  green pills, one radius). `:root` == `.dark`, theme default `dark`. `fpg-logo.svg` is now
  the gradient bolt. Sidebar brand uses the green→sky gradient text.
- **Landing page (`/app/landing`) ported to the public Worker design** — dark navy + yellow
  accent, same sections (rails, merchant dashboard mock, MFS setup table, approve flow,
  quick start, deploy matrix, footer), served with the SPA; CTAs link to `/register` and
  `/api-docs`.
- **Product display name is `FREE Payment Gateways`** (was `FREE-Payment-Gateways`). Only
  user-facing text changed; the repo slug, folder name, URLs and package id stay
  hyphenated. Rebuilt, smoke-checked, and branded in the SPA + email templates.
- Root-level: **SECURITY.md**, `capacitor.config.ts` (webDir `public/app`), Playwright config;
  SPA README/LICENSE folded into root docs (one README, one LICENSE, no duplicates).
- `NOTICE.md` / `docs/DATABASE.md` / `docs/DEPLOY-VERCEL.md` / `docs/VERCEL-AIVEN.md`
  paths updated for the merged layout. (Layout change only — no runtime behavior change.)
- **License unchanged:** AGPL-3.0-only.

## v1.9.0 — Embedded `/app` dashboard + full Postgres parity (Aiven · Neon · Supabase · CockroachDB) + copyright/licensing hygiene

**Two interfaces, documented**
- **`/admin`** (default, password-only, single merchant) is the primary dashboard — `/` redirects here.
- **`/app`** (merchant SPA, multi-merchant/team) is now marked **optional** — only needed if you want org/team/brands and Supabase Auth. README shows a clear comparison table; quick start explicitly routes to `/admin`.
- Decision (single merchant → `/admin`, SPA optional) is documented in `README.md` ("দুইটি ইন্টারফেস"). No code paths removed; SPA still builds and works at `/app`.

**Embedded FREE Payment Gateways in the Node process**
- `npm run build:app` builds the SPA with `base=/app/` and installs it to `public/app/`; `/app` serves it with immutable caching for hashed assets and `no-cache` for the shell. `/app/assets/*` misses return 404 JSON, not SPA HTML.
- `Dockerfile` is now multi-stage: stage 1 builds the SPA (works with no Supabase env — renders a clear "not configured" shell), stage 2 copies it into `public/app`.
- `test/smoke.js` covers `/app/` (200 built, 503 with instructions otherwise).
- `BrowserRouter` uses `import.meta.env.BASE_URL` as its basename; `vercel.json` bundles `public/**`, `src/**`, `views/**` for the serverless function.

**Database parity**
- New `src/pg-config.js` — single TLS policy engine for `pg.Pool`: `DATABASE_CA_CERT` / `DATABASE_CA_CERT_FILE` (strict, YOUR CA) → system CAs (`neon.tech`, `cockroachdb.com`, `supabase.co`, `sslmode=verify-*`) → `sslmode=require` / `*.aivencloud.com` (encryption, no chain verification) → driver default. `test/pg-config.js` (20 assertions), `npm run test:db`.
- New `npm run db:doctor` (`scripts/db-doctor.mjs`) — provider detection, TLS-policy report, live connect + `version()`, and targeted hints for every common failure.
- New `docs/DATABASE.md` (Bangla): Aiven/Neon/Supabase/CockroachDB step-by-step, TLS policies, `pg_dump` backups, troubleshooting table. All docs link it.
- FREE Payment Gateways off-site mirror (`scripts/aiven-mirror.mjs`) now officially supports Neon too (provider-neutral `DATABASE_URL`).
- `.env.example` documents `DATABASE_CA_CERT_FILE`/`DATABASE_CA_CERT`.

**Copyright & licensing hygiene (all third-party artwork removed)**
- **Removed every scraped brand asset**: `public/gateway-logos/*` (bKash, Nagad, Stripe, PayPal, Wise, sslcommerz, …) and `public/placeholder.svg` deleted. Gateway tiles render as **text monograms in brand colors** (a merchant's own logo goes via `image_url`). `getGatewayDefaultLogo()` / `GATEWAY_LOGO_MAP` removed.
- **Removed marketing screenshots** (`dashboard-preview.jpg`, `dashboard-product-shot.png`, `free-payment-gateways-facebook-post.jpg`, `free-payment-gateways-fb-banner-v2.jpg`); a dead third-party social-banner URL and `twitter:site` metadata removed.
- **Scaffold tooling removed**: unused bundler tags and the initial Playwright wrapper standard `@playwright/test` config added. Package renamed `vite_react_shadcn_ts` → `free-payment-gateways`@1.0.0.
- `supabase/config.toml` no longer points at a retired project reference (`project_id = "YOUR_PROJECT_REF"`).
- **Email templates** render a text wordmark (no external image requests): signup, recovery, magic-link, invite, reauthentication, email-change.
- `NOTICE.md` lists every third-party component + its license and asserts no third-party artwork; `README.md` carries the summary; `src/dashboard/README.md` gets a Credits & Licenses section.
- **Licensing unchanged:** AGPL-3.0-only.

## v1.8.0 — FREE Payment Gateways full payment-SaaS dashboard added under `src/dashboard/` (license unchanged: AGPL-3.0-only)

- **New sub-project in this repo:** `src/dashboard/` — Vite + React + TypeScript merchant
  dashboard + Capacitor Android/iOS shells; Supabase backend (44 SQL migrations,
  33 tables with RLS on all of them, 16 edge functions). It is fully independent of
  the Node gateway above: own Supabase project, own Vercel project. Deploy with the
  one-click button in the README (Root Directory `free-payment-gateways`).
- **Same repo, same license:** the code ships under **AGPL-3.0-only**; the sub-project
  carries its own `LICENSE`, `SECURITY.md` and attribution notes. `Dockerfile`/`docker-compose.yml`
  are unchanged — `.dockerignore` now excludes `src/dashboard/`.
- **No-CLI setup:** `npm run setup` inside `src/dashboard/` connects a free Supabase project
  from just Project URL + anon key + DB URI (no `supabase login`), writes `.env` and
  applies all migrations idempotently (`_applied_migrations`).
- **Security fixes included in the import:** API keys are now generated with
  `crypto.getRandomValues` and stored only as `sha256:<hex>` (was `btoa(key)`);
  `api_keys.key_hash` is no longer selectable by any client (explicit column list +
  column-level `REVOKE`/`GRANT` migration); `validate-device-otp` now requires a real
  JWT **and** an org-admin role for the device's organisation (previously any
  `Authorization` header could mint an OTP); `.env` is git-ignored.
- **Workflows:** `keep-supabase-awake.yml` moved here (REST ping every 3 days so the
  free Supabase project does not pause after 7 days).
- **Docs:** `src/dashboard/README.md`, `src/dashboard/docs/DEPLOY-VERCEL.md` (Vercel + Supabase +
  PipraPay, Bangla; plus an honest section on why Aiven cannot replace Supabase and how
  to use Aiven as an optional free off-site backup: `npm run mirror`).
- **License:** stays **AGPL-3.0-only** — no change in this release.

## v1.7.2 — Vercel + Aiven lifetime-free guide (license unchanged: AGPL-3.0-only)

- **New guide:** [`docs/VERCEL-AIVEN.md`](docs/VERCEL-AIVEN.md) — step-by-step Bangla
  walkthrough for **Vercel Hobby + Aiven Free PostgreSQL** (always free, no card, no
  expiry): service creation, `DATABASE_URL`, required env vars, verification, WordPress
  hookup, backups (`pg_dump`), and a troubleshooting table (503, TLS chain, connection
  limits, wrong `BASE_URL`, deployment protection blocking webhooks, …).
- **Postgres pool tuning:** `PG_POOL_MAX` env var (default 5) controls connections per
  app instance; pool now closes idle sockets (`allowExitOnIdle`) and times out connects
  after 10 s — recommended `3` on Aiven Free (20 connections total).
- **Fixed (data):** `package-lock.json` had four dependency entries (`destroy`, `gopd`,
  `postgres-interval`, `setprototypeof`) with a corrupted `version` (`1.7.1` instead of
  `1.2.0`) from an earlier bulk find/replace; restored so lockfile and tarballs agree.
- **Docs:** README + `docs/DEPLOY-ANYWHERE.md` link the new guide; `.env.example` and the
  serverless 503 message mention Aiven and `PG_POOL_MAX`.
- **License:** stays **AGPL-3.0-only** — no change in this release.

## v1.7.1 — Bug-fix pass (all tests green)

- **Fixed (silent failure):** admin **Webhooks → Retry** did nothing for a delivery whose
  status was already `failed` (the attempt function only accepted `pending`). A failed
  delivery is now re-queued with one extra allowed attempt before retrying.
  Smoke suite extended (`failed → re-queued → delivered`).
- **Fixed:** `POST /bridge/heartbeat` referenced an undefined `next` handler, so any error
  inside it crashed the request instead of reaching the error middleware.
- **Fixed:** `/health` reported a hard-coded `1.2.0` while `package.json` said something
  else. The version now comes from `package.json` (single source of truth), and the
  webhook `User-Agent` uses the same value.
- **Fixed (payment integrity, WordPress):** the return handler could mark an order paid
  from an arbitrary `fpg_payment_id` supplied in the URL when the order had no stored
  invoice id. It now requires the gateway to confirm the invoice belongs to that order
  (`metadata.order_id`).
- **Fixed (WordPress):** HPOS compatibility was declared with a class name instead of the
  plugin's main file — now uses `plugin_basename( __FILE__ )`. MFS gateway also guards
  missing `$_POST` fields and no longer relies on a dynamic `$instructions` property.
- **Hardened:** `success_url`/`cancel_url`/`webhook_url` validation now rejects
  protocol-relative (`//evil.com`) URLs; `markPaid` treats an empty provider as "unset".
- **Config:** `docker-compose.yml` and `render.yaml` now pass/prompt for `DATABASE_URL`,
  so a free Postgres works without editing files.
- **Docs:** fixed a broken README table (SMS row rendered as raw text on GitHub), removed a
  duplicated `DEPLOY-ANYWHERE.md` tree entry, and aligned the documented Node requirement
  with `engines` (**≥ 22.5**, built-in `node:sqlite`). Landing page no longer calls the
  WordPress plugin "MIT" or lists Koyeb as free.

## v1.7.0 — License: MIT → AGPL-3.0-only

- **License changed** from MIT to **GNU Affero General Public License v3.0-only** (`LICENSE`).
  The owner can dual-license or relicense; users must now comply with AGPL-3.0
  (including §13: provide source to network users of modified versions).
- `NOTICE.md`, `README`, `wordpress/...` plugin headers, `.env.example`, `package.json`,
  `package-lock.json` updated to AGPL-3.0-only. All content remains original work.
- Repo cleanliness: no third-party code, no secrets, no credentials tracked.
  (`npm audit`: 0 vulnerabilities.)
- **Docs correction:** Koyeb's free Nano tier is discontinued (now per-second billed
  `ECO` compute); Vercel Hobby and Oracle Always Free remain 100% free (verified
  2026-11). `docs/DEPLOY-ANYWHERE.md` recommendations updated — Cloud Run/Vercel are
  the recommended $0 path; Koyeb kept as paid option only.

## v1.6.0 — Webhook delivery retry (reliability)

- **NEW:** `webhook_deliveries` queue — every `payment.paid` webhook is persisted; on failure it
  retries automatically with backoff (1m / 5m / 30m / 2h, up to 5 attempts). In-process retry
  worker runs for single-instance deployments (Pi/PC/VPS/Docker); multi-instance hosts can call
  `/admin → Webhooks → Retry due deliveries now` (or hit the same worker).
- **NEW:** `/admin → Webhooks` — pending/delivered/failed counts, recent deliveries table,
  manual **Retry** button per delivery.
- **Fixed (would have been a silent data path bug):** webhook deliveries were fire-and-forget;
  a merchant endpoint that was down at payment time lost the notification forever. Now queued and retried.
- Smoke suite extended: webhook receiver that 500s first attempt → delivery stays pending →
  manual retry → delivered (attempts=2). All green.

## v1.5.0 — Multi-device SMS forwarders + full free MFS system polish

- **NEW:** **Multi-device SMS bridge** — `whd_…` per-device keys (sha256 stored, one-time reveal).
  `/admin → SMS Bridge → Devices`: add/enable/disable/regen/revoke devices independently; each device
  tracks **last seen / last SMS**; `POST /bridge/heartbeat` for forwarder liveness pings.
  The single global bridge token still works (backwards compatible).
- Architecture parity with hosted personal-MFS automation (SMS-agent approach) while remaining
  100% free, self-hosted and single-merchant.
- SMS events now record which device ingested them (`device_id`), with an idempotent migration
  for existing databases.
- Smoke suite extended: device-key auth, heartbeat, device disable. All green.

## v1.4.0 — SMS auto-verify (self-hosted, free) + payment-link invoices visible to API

- **NEW:** **SMS bridge** (`POST /bridge/sms`) — Android forwarder app এ incoming MFS SMS
  forward করে পাঠায় (MacroDroid/Tasker/SMS Gate; recipe + docs in `docs/AUTO-VERIFY.md`)।
  Gateway parse করে (bKash/Nagad/Rocket/Upay — EN/BN amounts, TrxID, sender) সাথে pending
  invoice match করে — TrxID exact match সর্বাধিক অগ্রাধিকার; না হলে 24h window-এ একমাত্র
  same-amount candidate → **auto-paid**; amount ≤ `sms_auto_max_minor` (default ৳5,000) পর্যন্ত;
  এর বেশি হলে trx_id pre-fill + **manual review**।
- **Security:** bridge token (sha256 stored, timing-safe compare, একবারই দেখাবে); optional
  sender allowlist; **TrxID replay protection** (409); per-IP rate limit; unparsed SMS লগ করা হয়।
- **NEW:** `/admin → SMS Bridge` — token generate/regenerate, auto-verify toggle + max amount +
  allowlist, in-browser **parser test**, recent SMS events log.
- **NEW:** payment-link invoices (`api_key_id IS NULL`) are now readable via API (single-merchant
  deployment) — POS poll flow from README/USE-CASES actually works now.
- **Fixed:** fresh invoices (provider NULL) now match SMS by amount+time; invoices expose
  `trx_id`/`trx_sender` via API (`publicInvoice`) for POS/audit.
- **Removed (v1.3.0 follow-up):** per-transaction-fee providers (Stripe, bKash Tokenized) — free rails only.
- Smoke suite extended: SMS bridge parse → match → paid + replay rejection. All green.

## v1.3.0 — Free rails only + payment links (unreleased on npm)

- **REMOVED (breaking-ish, by explicit request):** the two per-transaction-fee providers —
  **bKash Tokenized Checkout** and **Stripe** providers, their Settings sections, credentials,
  inbound webhooks and all docs references are gone. This project now ships only 100% free rails:
  manual bKash/Nagad/Rocket/Upay/Bank + Bangla QR + Demo. MFS-এ কোনো per-transaction charge নেই।
  (Stripe/Tokenized users: stay on v1.2.0 if you need those rails.)
- **NEW:** **Payment Links** — `/admin → Pay Links`: fixed/reusable pay URLs (label, amount,
  max uses, optional webhook with per-link secret). Public `GET /l/:id` creates an invoice
  atomically and redirects to hosted checkout — for SMS/WhatsApp/POS/website buttons with zero code.
- **NEW:** `docs/USE-CASES.md` (website · ISP billing · POS · donation · WhatsApp · SaaS recipes),
  `docs/DEPLOY-ANYWHERE.md` (step-by-step A-to-Z for every FREE host), Vercel serverless adapter
  (`api/index.js` + `vercel.json`) — Express runs on Vercel with a free Postgres `DATABASE_URL`.
- **NEW:** `.dockerignore`; `engines` relaxed to `>=22.5.0` (Postgres mode); smoke suite extended
  (payment-link flow; still all green).
- **Changed:** first-run admin password is now the documented public default **`12345678`**
  (`ADMIN_PASSWORD` env overrides); `/admin` shows a persistent banner until it is changed via
  Settings → Change admin password (change now rotates the session secret → permanent).
- **Fixed:** Stripe webhook verification now fails CLOSED when `whsec_` is unset (previously
  unsigned events were accepted) + 5-minute timestamp tolerance; cookie parsing tolerates
  malformed values; `/l/:id` rate-limited per IP; settings POST no longer erases fields absent
  from the request; POS polling works against payment-link invoices; Demo provider gets a
  persistent dashboard warning until disabled; outbound provider calls get 12s timeouts.

## v1.2.0 — Free persistent database built-in (Postgres)

- **NEW:** built-in Postgres storage backend — set `DATABASE_URL` and the app
  automatically switches from embedded SQLite to any Postgres-compatible host,
  with schema auto-creation. Verified end-to-end against both backends.
- Recommended free persistent database: **CockroachDB Serverless — 10 GB free**
  (or Neon 0.5 GB, Supabase 500 MB, Render free Postgres) — all free tier,
  all documented in `docs/DEPLOYMENT.md §4G`
- 100% backward compatible: without `DATABASE_URL` behaviour is unchanged (embedded SQLite)
- Full async data layer across all routes/settings/lifecycle; smoke suite passes on both backends
- Admin UI now shows a persistent warning about Render free's ephemeral FS and the permanent `DATABASE_URL` fix
- Health endpoint reports version

## v1.1.0 — 100% tested ("just make it easy and tested")

- **Testing:** full Node end-to-end suite (`npm test`) — 17 checks: checkout, demo pay, webhook HMAC verify, manual submit/approve/reject, cancel flow, input validation, 404 JSON, admin mark-paid + webhook
- **Testing:** PHP/WordPress smoke harness (`test/plugin-smoke.php`) via `php test/plugin-smoke.php` — all plugin files lint clean; gateways, shortcode and order flow verified without WordPress
- **Fixed (critical):** gateways were declared inside nested `plugins_loaded` closures — they never registered in real WordPress. Classes now load at file scope; HPOS compatibility declared from the main plugin file
- **Docs:** `docs/DEPLOYMENT.md` rewritten as Bengali A-to-Z (Render, cPanel, Hostinger, VPS+nginx, Docker, Cloudflare, update, backup, FAQ) with TL;DR; `README.md` TL;DR; `render.yaml` blueprint
- **Security:** admin login-attempt bucket cap (5,000 IPs)
- Repository contains only original MIT code; ownership: `LICENSE` — "Copyright (c) 2026 iamtanzir and contributors"

## v1.0.0 — Initial release

- Self-hosted gateway (Node.js, embedded SQLite): demo / manual bKash-Nagad-Rocket-Bank / Bangla QR / Stripe / bKash Tokenized
- Hosted checkout page, REST API v1, API-key auth, HMAC-signed webhooks, admin dashboard with manual approval
- WordPress plugin (`free-payment-gateways`): hosted checkout redirect gateway + `[fpg_pay]` shortcode + return handler
