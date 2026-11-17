# ⚡ FREE Payment Gateways

**Self-hosted, zero-monthly-fee payment gateway for Bangladesh & everywhere.**
Localhost, any cloud/VPS/shared hosting via Docker & Node, and WordPress/WooCommerce.

> **Honest truth about "free" first:** no gateway can move other people's money
> (cards, bank transfers, MFS) with literally zero cost — the networks charge
> something. What this project gives you: **zero monthly/setup fees forever**, and
> payment rails that are genuinely free to run:
>
> | Rail | Cost to run | Notes |
> |---|---|---|
> | 🇧🇩 **Bangla QR** | **Free** | Customer scans *your own bank-issued* Bangla QR with any bank/MFS app → pays → enters TrxID → you approve. No SSLCommerz enrollment, no API fees |
| 💵 **bKash / Nagad / Rocket / Upay / mCash / Cellfin / OK Wallet / iPay / Tap / Telecash / Pathao Pay / Bank — manual verify** | **Free** (your own wallet) | Customer sends money → you approve in dashboard → webhook fires. Provider auto-detected (EN + BN SMS) |
> | 🧪 **Demo** | Free | Full test flow for development, no money moves |
> | 📲 **SMS auto-verify** | Free | Customer টাকা পাঠালে SMS থেকে **নিজেই** detect → invoice auto-paid (Android forwarder, self-hosted) — see [`docs/AUTO-VERIFY.md`](docs/AUTO-VERIFY.md) |
>
> ❌ **ইচ্ছাকৃতভাবে বাদ:** bKash Tokenized Checkout আর Stripe — দুটোই per-transaction fee লাগে। এই project-এ MFS-এ কোনো charge নেওয়া হয় না — শুধু ফ্রি rails।
>
> Note: **SSLCommerz Bangla QR** (the hosted/API product) is *not* free — it has low settlement fees and needs an SSLCommerz merchant account. The Bangla QR provider here instead uses **your own bank QR** — completely free, forever.

## 🎯 TL;DR — ৫ ধাপে পুরো system লাইভ

1. `git clone https://github.com/iamtanzir/FREE-Payment-Gateways.git && cd FREE-Payment-Gateways`
2. `npm install`
3. `npm start` → browser-এ `http://localhost:3000` → পাবলিক landing page → **Merchant login** → default password **`12345678`** দিয়ে `/admin`-এ login করুন — পুরো ড্যাশবোর্ড সাথে সাথেই ব্যবহারযোগ্য (কোনো লক নেই); উপরের ব্যানার মনে করিয়ে দেবে `/admin → Settings`-এ password বদলাতে (কমপক্ষে ৮ অক্ষর, স্থায়ী, সব session invalidate)
4. `/admin → API Keys → Create` → key কপি → curl দিয়ে checkout বানান (নিচে ১ মিনিটের টেস্ট দেখুন)
5. WordPress? `wordpress/free-payment-gateways/` → `wp-content/plugins/` → Activate → **Settings → FPG Gateway**-এ URL + key দিয়ে Save → WooCommerce-এ ২টা free gateway ready

Deploy live — pick any host (all supported, most are $0): **Render** Blueprint → done · full matrix of **every free/host option (Cloud Run, Vercel, Oracle, AWS EC2, Raspberry Pi/Orange Pi, Docker, home PC + tunnel)** → [`docs/DEPLOY-ANYWHERE.md`](docs/DEPLOY-ANYWHERE.md) (বাংলা, A to Z) — full guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) (বাংলা, A to Z)
Render suspend করেছে "Free usage limit reached"? → [`docs/MIGRATE-FREE-HOST.md`](docs/MIGRATE-FREE-HOST.md) — $0 সবসময়-চালু বিকল্প (Oracle Cloud Always Free / Google Cloud Run) + keep-alive সমস্যার সমাধান

বাংলা সারাংশ → [নীচে](#বাংলা-সারাংশ)

---

## What you get in this repo

```
├── src/                              # Self-hosted gateway core (Node.js, Express, embedded SQLite)
│   ├── landing.js                    #   public landing page at / (merchant login → /admin/login)
│   ├── providers/                    #   demo · manual MFS/bank · Bangla QR — free rails only
│   ├── routes/                       #   REST API · hosted checkout page · admin dashboard
│   └── …
├── wordpress/
│   └── free-payment-gateways/        # AGPL-3.0 — your own plugin: TWO WooCommerce gateways + [fpg_pay] shortcode
│       ├── FPG Self-Hosted Gateway   #   customers redirect to your hosted checkout (any site can use the API)
│       └── FPG Bangla QR & MFS       #   customers pay via Bangla QR / bKash / Nagad / Rocket / Upay at checkout, enter TrxID, you approve on the order screen
├── test/smoke.js                     # end-to-end smoke test (npm test)
├── docs/USE-CASES.md                 # recipes: website · ISP billing · POS · donation · WhatsApp · SaaS
├── docs/AUTO-VERIFY.md               # SMS→gateway auto-verify setup (MacroDroid/Tasker/SMS Gate, self-hosted)
├── Dockerfile · docker-compose.yml   # deploy anywhere
├── render.yaml                       # one-click Render blueprint (see docs/DEPLOYMENT.md)
├── docs/DEPLOYMENT.md                # technical guide: Render · Cloudflare · Docker · checklist
├── docs/DEPLOY-ANYWHERE.md           # EVERY supported host: localhost · PC · Raspberry Pi/Orange Pi · Docker · Oracle · AWS EC2 · Cloud Run · Render · Vercel · Railway (+ free Postgres & free HTTPS)
├── docs/MERCHANT-SETUP.md            # merchant-first Bangla guide: how to deploy your own instance
├── docs/VERCEL-AIVEN.md             # Vercel + Aiven Free Postgres — lifetime-free step-by-step (Bangla)
└── NOTICE.md                         # licensing & ownership
```

## দুইটি ইন্টারফেস — আপনার কোনটা লাগবে?

এই repo-তে **দুটি ড্যাশবোর্ড** আছে, একই সার্ভার থেকে সার্ভ করা:

| | **`/admin` — Merchant Admin (মূল)** | **`/app` — Merchant SPA (ঐচ্ছিক)** |
|---|---|---|
| কাদের জন্য | **একক মার্চেন্ট** — শুধু নিজের দোকান/ব্যবসা | টিম/মাল্টি-মার্চেন্ট, SaaS-স্টাইল use |
| Login | **Password-only** — default `12345678`, লগইন করে Settings-এ বদলান | Email + Password (Supabase Auth) |
| Setup | `npm install && npm start` — শেষ, কোনো signup নেই | `SPA_ENABLED=1 npm start` + `npm run setup` |
| ডেটাবেস | embedded SQLite (কোনো external লাগে না), **Turso/libSQL** বা `DATABASE_URL` | Supabase (Auth + Postgres + RLS + Edge Functions) |
| Feature | invoices, manual MFS approve, Bangla QR, API keys, webhooks, SMS bridge | Full SaaS: org/brands, team members, multi-org, checkout API, licenses |
| কখন ব্যবহার করবেন | **সবসময় — বেশিরভাগ একক মার্চেন্টের দরকার এটাই** | শুধু যদি মাল্টি-ইউজার/মাল্টি-org লাগে |

**সিদ্ধান্ত:** single merchant → `/admin` (এটাই default dashboard)। **`/`-এ পাবলিক landing page**, সেখান থেকে "Merchant login" বাটনে `/admin/login`; `LANDING_PAGE=0` দিলে আগের মতো `/` সরাসরি `/admin`-এ redirect করবে। SPA (`/app`) প্রয়োজন হলে শুধু তখন — বেশিরভাগ দোকানের লাগে না।

## `/app` — ঐচ্ছিক Merchant SPA (opt-in, multi-merchant)

**Default: `/app` → redirects to `/admin` (password-only, no email).**
SPA is opt-in via `SPA_ENABLED=1` — only for teams/SaaS-style deployments that
need Supabase Auth, org/team/brands, and the full multi-merchant feature set.

The gateway hosts the FREE Payment Gateways SPA inside the Node process:

```bash
npm run build:app   # builds src/dashboard/ with base=/app/ → installs into public/app/
npm start
# gateway dashboard : http://localhost:3000/admin
# Merchant SPA     : http://localhost:3000/app
```

- Same process, same domain, same deploy — no separate Vercel project needed.
- **ঐচ্ছিক (optional / opt-in):** single merchant হলে এটা লাগবে না — `/app` নিজেই `/admin`-এ redirect করে। `SPA_ENABLED=1` set করে SPA enable করুন।
- Hashed assets are cached for a year; the shell always revalidates; missing assets 404 (not HTML).
- The Dockerfile builds stage 1 (`node:26-alpine`, `npm run build`) and copies `public/app` — including when built with no Supabase env (the SPA renders a clear "backend not configured" shell).
- `/app/` validates in `test/smoke.js`: 200 when built, **503 with instructions** when not.
- `/health` now reports `"app": "/app" | "not-built"`.
- For a standalone SPA deploy (Vercel Root Directory), use `src/dashboard` — same settings as embedded. See [`docs/DEPLOY-VERCEL.md`](docs/DEPLOY-VERCEL.md).

## Databases — Turso · Supabase · Aiven · Neon · CockroachDB — all supported

- **Three backends, one API** (`src/db.js`): embedded **SQLite** (default, zero setup),
  **Turso/libSQL** over HTTPS (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`) — the recommended
  choice for Vercel because serverless has no persistent disk and no TCP pooling — and any
  **PostgreSQL** via `DATABASE_URL` (Supabase pooler, Neon, Aiven, CockroachDB, self-hosted).
- **Node gateway** runs on Postgres via `DATABASE_URL` with **TLS by default**:
  `DATABASE_CA_CERT` / `DATABASE_CA_CERT_FILE` verify the server (Neon/CockroachDB use
  public CAs and verify automatically; Aiven and **Supabase** ship a self-signed chain, so
  the connection is encrypted but chain verification needs their downloaded CA). TLS
  parameters in the URL (`sslmode=…`) are stripped and replaced by that policy, so a
  pasted URL can never silently downgrade verification.
- **TLS policy engine:** `src/pg-config.js` (5 policies, unit-tested in `test/pg-config.js`, 28 assertions — run `npm run test:db`).
- **`npm run db:doctor`** — provider detection (Aiven / Neon / Supabase / CockroachDB / self-hosted), TLS-policy report, live connectivity check, targeted hints for every common failure (`self-signed certificate`, `password authentication failed`, `ECONNREFUSED`, …).
- **`docs/DATABASE.md`** — Bangla guide: Turso, Aiven Free step-by-step, Neon, Supabase pooler, CockroachDB, TLS policies, ব্যাকআপ, decision table.
- **`docs/VERCEL-TURSO.md`** — Vercel + Turso (সুপারিশকৃত) বা Supabase pooler: env vars, deploy, যাচাই, troubleshooting।
- `.env.example` documents `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `DATABASE_CA_CERT_FILE`/`DATABASE_CA_CERT`; FREE Payment Gateways mirror now works with **Neon too** (`DATABASE_URL` is provider-neutral).

## Merchant SPA — in this repo, not a separate project

This repository is **one integrated project**: the Node gateway and the React merchant SPA
build, test and deploy together.

```
src/dashboard/                    Vite + React + TypeScript SPA — merchant dashboard + Capacitor shells
src/dashboard/src/pages/          Checkout, Gateways, Devices (MFS/SMS), API Keys, Reports, Team, Webhooks…
src/dashboard/index.html          SPA shell (served by the gateway at /app/)
supabase/migrations/              44 SQL migrations (33 tables, RLS on every table)
supabase/functions/               16 Edge Functions (payments, refunds, webhooks, SMS OTP, email, licenses)
scripts/setup-supabase.mjs        connect a free Supabase project — no CLI, no `supabase login`
scripts/aiven-mirror.mjs          optional: mirror the Supabase data into any Postgres (off-site backup)
docs/DEPLOY-VERCEL.md             Vercel + Supabase + PipraPay, step by step (Bangla)
docs/VERCEL-TURSO.md              Vercel + Turso/libSQL or Supabase pooler, step by step (Bangla)
```

**What it is:**

| | Gateway (`src/`) | Merchant SPA (`src/dashboard/`) |
|---|---|---|
| What | Self-hosted Node gateway + `/admin` dashboard, embedded SQLite (or `DATABASE_URL`) | Full payment SaaS: dashboard + hosted checkout + API |
| Stack | Node 22.5+, Express, no external service required | Vite + React SPA, Supabase (Auth + Postgres + RLS + Edge Functions) |
| Cost | $0, works offline | $0 (Supabase Free + Vercel Hobby / self-hosted) |
| Setup | `npm install && npm start` | `npm run setup` (asks for 3 values) |

Deployed together on Vercel: `vercel.json` already runs `npm run build:app` and bundles
`public/app` inside the serverless function — set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
(recommended) or `DATABASE_URL`, plus `ADMIN_PASSWORD` and the three `VITE_SUPABASE_*` vars,
then redeploy. Deployed separately (Docker/Node): same single repo — the Docker multi-stage
build produces both halves.

Both are **AGPL-3.0-only** and cost **$0** to run. The merchant SPA needs a free
Supabase project (card not required) — see [`docs/DEPLOY-VERCEL.md`](docs/DEPLOY-VERCEL.md).

**Copyright & ownership:** this repo is claimed in full by iamtanzir / contributors.
No third-party artwork or branded assets are shipped — gateway tiles are monograms,
provider names appear only to identify supported rails (nominative use), and all
components used are permissively licensed. See [`NOTICE.md`](NOTICE.md).

## কী কী করা সম্ভব?

| Area | What you can do |
|---|---|
| **Payment acceptance** | bKash / Nagad / Rocket / Upay / mCash / Cellfin / OK Wallet / iPay / Tap / Telecash / Pathao Pay / Bank — manual verification, **zero per-transaction fee**, only your own account |
| **Bangla QR** | নিজের bank-issued QR image দিয়ে — customer scan করে pay করে, TrxID submit করে, আপনি approve করেন |
| **SMS auto-verify** | MFS SMS auto-parse → invoice auto-paid (works on Android forwarder; see `docs/AUTO-VERIFY.md`) |
| **WordPress / WooCommerce** | `wordpress/free-payment-gateways/` plugin — WooCommerce checkout-এ সরাসরি বিকাশ/নগদ/Bangla QR পেমেন্ট |
| **REST API + webhooks** | `POST /api/v1/checkout` → hosted checkout URL; `payment.paid` webhook HMAC-signed, auto-retry on failure |
| **Payment links** | `/l/:id` reusable pay links — SMS/WhatsApp/ISP billing-এ |
| **Host anywhere** | Localhost, VPS, Raspberry Pi, Oracle Always Free, Cloud Run, Render, Vercel, Docker — সবই $0 (see `docs/DEPLOY-ANYWHERE.md`) |
| **Zero signup** | `npm install && npm start` — কোনো account/card/email লাগবে না। `12345678` দিয়ে login |

**যা নেই (honest):** card processing (PCI + per-transaction fee — যে জন্যই দূরে থাকে), PHP-only shared hosting-এ core gateway run হবে না (কিন্তু plugin run হয় — same বা অন্য hostের gateway-তে point করলেই হবে)।

**Quick demo:**
```bash
npm install && npm start
# → http://localhost:3000 → login: 12345678 → Settings-এ পাসওয়ার্ড বদলান → then paid flow test
```



## Quick start (localhost)

Requirements: **Node.js ≥ 22.5** (built-in `node:sqlite`) — Node 24/26 recommended. (`DATABASE_URL` → Postgres থাকলে Node ≥ 22-ও চলে।)

```bash
npm install
cp .env.example .env   # optional
npm start              # → http://localhost:3000 (landing page)
```

**Routes:** `/` = পাবলিক landing page (mfs.tanzir-ahmed.workers.dev-এর মতো ডিজাইন — MFS rails, admin dashboard preview, বাংলা MFS গাইড, deploy matrix) → **"Merchant login"** বাটন `/admin/login`-এ নিয়ে যায়।
**প্রথম interface = `/admin`** — password-only merchant dashboard (default `12345678`)।
SPA optional: `http://localhost:3000/app` — শুধু multi-merchant/team লাগে হলে।
No signup, no Supabase project, no email — সব server-এ।

> Landing page চাই না? `LANDING_PAGE=0` set করুন — তখন `/` আগের মতো সরাসরি `/admin`-এ redirect করবে।

**Live preview (Vercel):** https://mfs-pink.vercel.app — serverless preview; requires an external database — **Turso** (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`, recommended) or Postgres via `DATABASE_URL`. Guide: [`docs/VERCEL-TURSO.md`](docs/VERCEL-TURSO.md); other providers: [`docs/DATABASE.md`](docs/DATABASE.md) and [`docs/VERCEL-AIVEN.md`](docs/VERCEL-AIVEN.md). For localhost, `npm start` works out of the box.

First login uses the default password **`12345678`** — the whole dashboard works right away (Invoices, API Keys, Webhooks, SMS Bridge, Pay Links, Settings…). A persistent banner reminds you to set your own password (min 8 chars) under `Settings → Change admin password` — it is hashed, and all sessions are invalidated on change. To skip the default entirely, set `ADMIN_PASSWORD` before first boot (see `.env.example`).

### 1-minute test checkout

1. `/admin → API Keys → Create API key` and copy it.
2. Create a checkout:

   ```bash
   curl -X POST http://localhost:3000/api/v1/checkout \
     -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" \
     -d '{"amount": 150.50, "currency": "BDT", "description": "Order #1001",
          "success_url": "http://localhost:3000/", "webhook_url": "http://localhost:4000/hook"}'
   ```
3. Open the returned `checkout_url` → click **Pay now (simulated)** → you'll be
   redirected with `fpg_status=paid` and your webhook receives
   `payment.paid` signed with your key's webhook secret.

Run the full end-to-end test anytime:

```bash
npm test                        # Node gateway end-to-end (checkout → webhook → approval)
npm run test:turso             # same suite on the Turso/libSQL backend (local file, no network)
DATABASE_URL=postgresql://... npm test   # same suite against external Postgres
php test/plugin-smoke.php       # WordPress plugin smoke test (stubs WP/WooCommerce, full order flow)
```

## REST API (v1)

All endpoints need `Authorization: Bearer <api_key>`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/checkout` | Create checkout session → `{ id, checkout_url, status, … }` |
| GET | `/api/v1/invoices` | List your invoices (`?status=paid&limit=50`) |
| GET | `/api/v1/invoices/:id` | Invoice details |
| POST | `/api/v1/invoices/:id/cancel` | Cancel a pending invoice |
| GET | `/pay/:id` | Hosted, branded checkout page (customer-facing, no auth) |
| GET | `/pay/:id/status` | Checkout-page polling endpoint |
| GET | `/health` | Health check |

**Checkout payload** — `amount` (string/number, major units), `currency` (ISO, e.g. `BDT`),
`description`, `customer_name/email/phone`, `success_url`, `cancel_url`,
`webhook_url`, `metadata` (any JSON).

**Webhooks** — on every paid invoice we POST to your `webhook_url`:

```
POST your-url
Content-Type: application/json
X-FPG-Event: payment.paid
X-FPG-Signature: sha256=<HMAC-SHA256 of the raw body>

{"type":"payment.paid","data":{"id":"inv_…","amount":150.5,"currency":"BDT","status":"paid",…}}
```

Verify with the **webhook secret** shown when you create an API key
(fallback: `global_webhook_secret` setting). Express example:

```js
const ok = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
if (req.headers['x-fpg-signature'] !== ok) return res.sendStatus(401);
```

## Deploying

**Full step-by-step guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)** — Render (blueprint + manual), Cloudflare (proxy / free Tunnel), Docker, after-deploy checklist, backups, troubleshooting.

**Free persistent database (Vercel/serverless-এর জন্য আবশ্যক):**
- **Turso/libSQL (সুপারিশকৃত):** `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` — HTTP SQLite, persistent disk বা TCP pool লাগে না → [`docs/VERCEL-TURSO.md`](docs/VERCEL-TURSO.md)।
- **Postgres:** `DATABASE_URL` দিয়ে Aiven Free (1 GB, no expiry), Neon, **Supabase pooler**, CockroachDB Serverless (10 GB) — data survives restarts। [`docs/DEPLOYMENT.md` §4G](docs/DEPLOYMENT.md#4g--স্থায়ী-database--ফ্রি-persistent-postgres-database_url)।

**Vercel + Turso / Supabase pooler:** [`docs/VERCEL-TURSO.md`](docs/VERCEL-TURSO.md) — env vars → deploy → verify → troubleshooting (বাংলা)।

**Vercel + Aiven (লাইফটাইম ফ্রি, card ছাড়া):** [`docs/VERCEL-AIVEN.md`](docs/VERCEL-AIVEN.md) — Aiven Free Postgres (no expiry) + Vercel Hobby, ধাপে ধাপে (env vars → deploy → verify → troubleshooting)।

**New merchant?** → [`docs/MERCHANT-SETUP.md`](docs/MERCHANT-SETUP.md) — বাংলায় ধাপে ধাপে কীভাবে নিজে ফ্রি instance deploy করবেন (deploy → settings → first payment)।

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/iamtanzir/FREE-Payment-Gateways)

### Docker (any VPS / cloud VM)

```bash
docker compose up -d --build
# set BASE_URL=https://pay.yourdomain.com in .env or the shell
```

Put nginx/Caddy/Cloudflare in front for HTTPS (or use `TRUST_PROXY=true` behind a
reverse proxy / Render / Railway). Data persists in the `fpg-data` volume
(`/app/data/fpg.db`, embedded SQLite — no DB server needed).

### No Docker? Any Node host works

Render, Railway, Fly.io, PythonAnywhere-ish PaaS, cPanel Node apps, a $5 VPS —
install Node ≥ 22.5, `npm install && npm start`, set `PORT`/`BASE_URL`.

### Shared hosting (PHP-only) via WordPress

Use the WordPress plugin (below) — it only needs outbound HTTP from WordPress to
your gateway URL, or point it at a gateway hosted elsewhere.

## Ecosystem — everything integrates for free

| Where | How | Cost |
|---|---|---|
| Localhost / dev machine | `npm install && npm start` — embedded SQLite, zero setup | Free |
| Any cloud VPS / PaaS (Render, Railway, Fly.io, Hostinger, EC2…) | Docker (`docker compose up -d`) or plain Node — `BASE_URL` + HTTPS in front | Your host only |
| Shared hosting (PHP-only) | Use the WordPress plugin (below) pointed at your gateway, or host the gateway elsewhere and only the plugin on the host | Free |
| WordPress / WooCommerce | Two built-in gateways + `[fpg_pay]` shortcode — no external calls needed for QR mode | Free |
| Custom apps (Node, PHP, Python, mobile…) | REST API v1 (`Authorization: Bearer`) + HMAC-signed `payment.paid` webhooks — verify with your key's webhook secret | Free |
| Bank/MFS rails | Bangla QR, bKash/Nagad/Rocket/Upay/mCash/Cellfin/OK Wallet/iPay/Tap/Telecash/Pathao Pay/Bank manual verification — your own accounts | Free |

Your whole payment ecosystem — site, checkout, server, webhooks — runs on this one repo with **zero third-party services and zero monthly cost**.

## WordPress / WooCommerce

One plugin, two gateways — copy `wordpress/free-payment-gateways/` to `wp-content/plugins/` and activate.

### Gateway 1 — FPG Bangla QR & MFS (Manual Verify) · 100% free, no server needed

Customers pay **inside WooCommerce checkout**: they pick bKash / Nagad / Rocket / Upay / Bangla QR, scan your QR (or get your number), pay, and type their TrxID right on the checkout page. The order lands as **on-hold**; you open the order, cross-check the TrxID in your MFS app, and hit **✅ Approve & complete order**.

1. WooCommerce → Settings → Payments → **FPG Bangla QR & MFS (Manual Verify)** → enable, set your numbers / QR image URLs per method.
2. Orders get an “📱 FPG MFS payment — verification needed” box with Approve / Reject buttons.
3. Nothing else to install — uses your own wallets. Zero fees forever.

Setup: drop your Bangla QR image(s) anywhere public (e.g. into your site via Media Library) and paste its URL — or reuse any hosted image URL.

### Gateway 2 — FPG Self-Hosted Gateway · redirect to your server's hosted checkout

1. **Settings → FPG Gateway**: enter your gateway Base URL + API key.
2. A payment method **“FPG Self-Hosted Gateway”** appears under *WooCommerce → Settings → Payments* — customers pay on your hosted checkout; order is auto-marked paid on return.
3. Any page: `[fpg_pay amount="500" description="Donation" currency="BDT" button="Donate ৳500"]`

## বাংলা সারাংশ

এই রিপোতে পাবেন: (১) নিজে হোস্ট করা যায় এমন payment gateway — **Bangla QR** (নিজের ব্যাংকের QR দিয়ে, সম্পূর্ণ ফ্রি), bKash/Nagad/Rocket/ব্যাংক থেকে **ম্যানুয়াল ভেরিফিকেশন** (বিনা পয়সায়), এবং টেস্টের জন্য Demo — কোনো per-transaction fee-ওয়ালা provider নেই। (২) WordPress-এর জন্য নিজস্ব দুটি gateway সহ প্লাগইন — **FPG Bangla QR & MFS** (চেকআউটেই pay + TrxID, order থেকে Approve) এবং **FPG Self-Hosted Gateway** (your hosted checkout-এ redirect)। সবকিছু একদম ফ্রি integrate হয় — localhost-এ `npm start`, cloud-এ Docker, WordPress-এ প্লাগইন, custom app-এ REST API + webhook। Bangla QR setup: আপনার ব্যাংক/ব্যাংক অ্যাপ থেকে নেওয়া Bangla QR ছবি admin/WooCommerce settings-এ URL দিন — কাস্টমার স্ক্যান করে পে করবে আর TrxID দিয়ে আপনি verify করবেন।

**মনে রাখবেন:** কার্ড/MFS কোম্পানির নিজের ফি সম্পূর্ণ মাফ নেই — সবসময় per-transaction fee থাকে (SSLCommerz Bangla QR-ও ফ্রি না — কম settlement fee আছে)। কিন্তু মাসিক/সেটআপ ফি শূন্য, এবং নিজের সার্ভারে ডেটা আপনার।

## Security

- API keys are stored SHA-256-hashed; webhook secrets are per-key random values.
- Admin password: scrypt hash; session cookie is HMAC-signed, HttpOnly.
- Admin login is rate-limited (10 attempts / 10 min / IP).
- Outbound webhooks are HMAC-signed (per-key or per-link secrets).
- Never commit `.env` or `data/` (both git-ignored).
- Put the gateway behind HTTPS in production (`BASE_URL=https://…`, `TRUST_PROXY=true`).

## License & ownership

**AGPL-3.0-only** — copyright © 2026 **A.K.M. Tanzir Ahmed (iamtanzir)** and contributors to this repository. See `LICENSE` and `NOTICE.md`.
This repository contains no third-party code: the earlier vendored plugin was removed and replaced with original, AGPL-licensed code written for this project.
If you run a modified version as a network service, **section 13 of the AGPL requires you to make your source available to users of that service**.
Commercial support, or a different license for proprietary use, contact the owner.
