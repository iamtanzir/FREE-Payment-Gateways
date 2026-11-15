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
> | 📱 **bKash / Nagad / Rocket / Upay / Bank — manual verify** | **Free** (your own wallet) | Customer sends money → you approve in dashboard → webhook fires |
> | 🩷 **bKash Tokenized Checkout** | Free to open, per-transaction fee | Auto-verified against bKash servers (needs merchant account) |
> | 💳 **Stripe** | Free signup, per-transaction fee | No BDT support — use USD/EUR |
> | 🧪 **Demo** | Free | Full test flow for development, no money moves |

বাংলা সারাংশ নিচে → (নীচে দেখুন)

---

## What you get in this repo

```
├── src/                              # Self-hosted gateway core (Node.js, Express, embedded SQLite)
│   ├── providers/                    #   demo · manual MFS/bank · Stripe · bKash Tokenized
│   ├── routes/                       #   REST API · hosted checkout page · admin dashboard
│   └── …
├── wordpress/
│   ├── free-payment-gateways/        # MIT — connector plugin: WooCommerce gateway + [fpg_pay] shortcode
│   └── bangladeshi-payment-gateways/ # GPLv2+ — vendored fork of ultraDevs' plugin (bKash/Nagad/Rocket/Upay/BanglaQR, QR checkout)
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

## WordPress / WooCommerce

You have **two** options in this repo:

### Option A — `wordpress/free-payment-gateways` (MIT, our connector)

Lightweight connector to your **self-hosted gateway**:

1. Copy `wordpress/free-payment-gateways/` to `wp-content/plugins/` → activate.
2. **Settings → FPG Gateway**: enter your gateway Base URL + API key.
3. WooCommerce: a payment method **“FPG Self-Hosted Gateway”** appears under
   *WooCommerce → Settings → Payments* — customers pay on your hosted checkout;
   order is auto-marked paid on return.
4. Any page: `[fpg_pay amount="500" description="Donation" currency="BDT" button="Donate ৳500"]`

### Option B — `wordpress/bangladeshi-payment-gateways` (GPLv2+, vendored fork)

The popular **“Bangladeshi Payment Gateways – Make Payment Using QR Code”** plugin
by ultraDevs, included at your request: WooCommerce QR-code checkout for
**bKash, Nagad, Rocket, Upay and Bangla QR**, with per-gateway fees, statistics,
PDF/CSV export and checkout-block support.

```bash
cd wordpress/bangladeshi-payment-gateways
composer install --no-dev --optimize-autoloader   # restores vendored deps (mPDF)
cd .. && cp -r bangladeshi-payment-gateways /path/to/wp-content/plugins/
```

Then in WordPress: *Plugins → activate “Bangladeshi Payment Gateways”*.

- It is **GPLv2+** — this directory must remain GPL. See its `UPSTREAM-NOTICE.md`.
- It bundles Appsero telemetry that only activates **after you opt in** via the admin notice.
- Upstream docs/support: https://ultradevs.com/docs/bangladeshi-payment-gateways

> Note: UrbdPay (urbdpay.com, self-hosted BD-MFS platform with Android SMS auto-verification)
> could not be vendored — its public repo 404s as of Nov 2026. See `NOTICE.md`.

## বাংলা সারাংশ

এই রিপোতে পাবেন: (১) নিজে হোস্ট করা যায় এমন payment gateway — bKash/Nagad/Rocket/ব্যাংক থেকে **ম্যানুয়াল ভেরিফিকেশন** (বিনা পয়সায়), Stripe, এবং টেস্টের জন্য Demo। (২) WordPress-এর জন্য কানেক্টর প্লাগইন + ultraDevs-এর জনপ্রিয় BD MFS QR প্লাগইন (GPL)। localhost-এ `npm start` দিয়েই চলে; যেকোনো cloud/VPS-এ Docker দিয়ে ডিপ্লয় হয়; WordPress-এ প্লাগইন হিসেবে ব্যবহার হয়।

**মনে রাখবেন:** কার্ড/MFS কোম্পানির নিজের ফি সম্পূর্ণ মাফ নেই — সবসময় per-transaction fee থাকে। কিন্তু মাসিক/সেটআপ ফি শূন্য, এবং ম্যানুয়াল MFS ভেরিফিকেশন দিয়ে একদম বিনা খরচে পেমেন্ট নেওয়া যায় — শুধু bKash/Nagad/ব্যাংক অ্যাকাউন্ট আপনার নিজের হতে হবে।

## Security

- API keys are stored SHA-256-hashed; webhook secrets are per-key random values.
- Admin password: scrypt hash; session cookie is HMAC-signed, HttpOnly.
- Admin login is rate-limited (10 attempts / 10 min / IP).
- Inbound Stripe webhooks are signature-verified; outbound webhooks are HMAC-signed.
- Never commit `.env` or `data/` (both git-ignored).
- Put the gateway behind HTTPS in production (`BASE_URL=https://…`, `TRUST_PROXY=true`).

## License & credits

MIT — see `LICENSE` (this repo's original code). The vendored plugin
`wordpress/bangladeshi-payment-gateways/` is **GPLv2+**; see `NOTICE.md` and
`wordpress/bangladeshi-payment-gateways/UPSTREAM-NOTICE.md`.
Credits: ultraDevs · Stripe · bKash · WordPress & WooCommerce communities.
