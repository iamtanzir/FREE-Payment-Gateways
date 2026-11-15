# ⚡ FREE-Payment-Gateways

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
> | 📱 **bKash / Nagad / Rocket / Upay / Bank — manual verify** | **Free** (your own wallet) | Customer sends money → you approve in dashboard → webhook fires |
> | 🩷 **bKash Tokenized Checkout** | Free to open, per-transaction fee | Auto-verified against bKash servers (needs merchant account) |
> | 💳 **Stripe** | Free signup, per-transaction fee | No BDT support — use USD/EUR |
> | 🧪 **Demo** | Free | Full test flow for development, no money moves |
>
> Note: **SSLCommerz Bangla QR** (the hosted/API product) is *not* free — it has low settlement fees and needs an SSLCommerz merchant account. The Bangla QR provider here instead uses **your own bank QR** — completely free, forever.

বাংলা সারাংশ নিচে → (নীচে দেখুন)

---

## What you get in this repo

```
├── src/                              # Self-hosted gateway core (Node.js, Express, embedded SQLite)
│   ├── providers/                    #   demo · manual MFS/bank · Bangla QR · Stripe · bKash Tokenized
│   ├── routes/                       #   REST API · hosted checkout page · admin dashboard
│   └── …
├── wordpress/
│   └── free-payment-gateways/        # MIT — your own plugin: TWO WooCommerce gateways + [fpg_pay] shortcode
│       ├── FPG Self-Hosted Gateway   #   customers redirect to your hosted checkout (any site can use the API)
│       └── FPG Bangla QR & MFS       #   customers pay via Bangla QR / bKash / Nagad / Rocket / Upay at checkout, enter TrxID, you approve on the order screen
├── test/smoke.js                     # end-to-end smoke test (npm test)
├── Dockerfile · docker-compose.yml   # deploy anywhere
└── NOTICE.md                         # licensing & credits
```

## Quick start (localhost)

Requirements: **Node.js ≥ 23.4** (built-in `node:sqlite`) — Node 24/26 recommended.

```bash
npm install
cp .env.example .env   # optional
npm start              # → http://localhost:3000
```

On first run an admin password is generated and printed **once** to the console
(or set `ADMIN_PASSWORD` in `.env` first). Sign in at `/admin`.

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
npm test
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
install Node ≥ 23.4, `npm install && npm start`, set `PORT`/`BASE_URL`.

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
| Bank/MFS rails | Bangla QR, bKash/Nagad/Rocket/Upay manual verification — your own accounts | Free |

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

এই রিপোতে পাবেন: (১) নিজে হোস্ট করা যায় এমন payment gateway — **Bangla QR** (নিজের ব্যাংকের QR দিয়ে, সম্পূর্ণ ফ্রি), bKash/Nagad/Rocket/ব্যাংক থেকে **ম্যানুয়াল ভেরিফিকেশন** (বিনা পয়সায়), Stripe, এবং টেস্টের জন্য Demo। (২) WordPress-এর জন্য নিজস্ব দুটি gateway সহ প্লাগইন — **FPG Bangla QR & MFS** (চেকআউটেই pay + TrxID, order থেকে Approve) এবং **FPG Self-Hosted Gateway** (your hosted checkout-এ redirect)। সবকিছু একদম ফ্রি integrate হয় — localhost-এ `npm start`, cloud-এ Docker, WordPress-এ প্লাগইন, custom app-এ REST API + webhook। Bangla QR setup: আপনার ব্যাংক/ব্যাংক অ্যাপ থেকে নেওয়া Bangla QR ছবি admin/WooCommerce settings-এ URL দিন — কাস্টমার স্ক্যান করে পে করবে আর TrxID দিয়ে আপনি verify করবেন।

**মনে রাখবেন:** কার্ড/MFS কোম্পানির নিজের ফি সম্পূর্ণ মাফ নেই — সবসময় per-transaction fee থাকে (SSLCommerz Bangla QR-ও ফ্রি না — কম settlement fee আছে)। কিন্তু মাসিক/সেটআপ ফি শূন্য, এবং নিজের সার্ভারে ডেটা আপনার।

## Security

- API keys are stored SHA-256-hashed; webhook secrets are per-key random values.
- Admin password: scrypt hash; session cookie is HMAC-signed, HttpOnly.
- Admin login is rate-limited (10 attempts / 10 min / IP).
- Inbound Stripe webhooks are signature-verified; outbound webhooks are HMAC-signed.
- Never commit `.env` or `data/` (both git-ignored).
- Put the gateway behind HTTPS in production (`BASE_URL=https://…`, `TRUST_PROXY=true`).

## License & ownership

MIT — copyright © 2026 **A.K.M. Tanzir Ahmed (iamtanzir)** and contributors to this repository. See `LICENSE` and `NOTICE.md`.
This repository contains no third-party code: the earlier vendored plugin was removed and replaced with original, MIT-licensed code written for this project.
