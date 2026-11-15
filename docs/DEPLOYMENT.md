# Full Deployment Guide — FREE-Payment-Gateways
# সম্পূর্ণ ডেপ্লয় গাইড — Render, Cloudflare, Docker, VPS

This is the same style of step-by-step self-hosting guide you saw from other
gateway projects — written for **this** system, honestly, with every cost and
limitation disclosed.

**যা deploy হবে:** একটা Node.js (≥ 23.4) অ্যাপ + embedded SQLite — কোনো আলাদা
database server লাগে না। একটাই process পুরো payment system (hosted checkout,
API, admin dashboard, webhooks)।

---

## 1. Before you start (আগে জানুন)

| Item | Free? | Notes |
|---|---|---|
| Render **Free** web service | ✅ Free | Prototype/demo. ⚠️ Filesystem ephemeral — restart/redeploy-এ SQLite data মুছে যায় |
| Render **Starter** + persistent disk | Paid (~$7/mo + $0.25/GB) | Production-ready, data থাকে |
| Cloudflare **Tunnel** (cloudflared) | ✅ Free forever | Home/office machine বা যেকোনো পিসি থেকে ফ্রি HTTPS, port forward লাগে না |
| Cloudflare **proxy** in front of any host | ✅ Free | DDoS protection + CDN + "Full (strict)" SSL |
| Cloudflare **Workers / Pages** | ❌ Not supported | এই অ্যাপ Node.js + filesystem + SQLite ব্যবহার করে — Workers-এ চলে না। Pages শুধু static sites |
| Any VPS (Hostinger/Contabo/…) | From ~$4/mo | Docker দিয়ে সবচেয়ে reliable |
| Docker anywhere | ✅ Free software | `docker compose up -d` — যেকোনো provider |

**Requirement everywhere:** Node.js ≥ 23.4 **or** Docker. To serve real
traffic you also need a domain (or use the free `*.onrender.com` /
`*.trycloudflare.com` hostnames) and HTTPS (all options below give you HTTPS).

---

## 2. Environment variables

| Var | Example | Why |
|---|---|---|
| `PORT` | `3000` | Listening port |
| `BASE_URL` | `https://pay.yourdomain.com` | **Must** be your public URL — used in checkout links & webhook payloads |
| `ADMIN_PASSWORD` | long random string | Admin dashboard login at `/admin` |
| `TRUST_PROXY` | `true` | Only behind a reverse proxy / Render / Cloudflare (for correct client IPs + secure cookies) |
| `DB_PATH` | `/app/data/fpg.db` (Docker) or default `./data/fpg.db` | SQLite location |

`.env` is git-ignored — never commit it.

---

## 3. Option A — Render (step by step)

### A1. One-click with render.yaml (recommended)

1. Push this repo to your GitHub (done: `iamtanzir/FREE-Payment-Gateways`).
2. Go to https://render.com → **New → Blueprint** → select the repo.
3. Render reads `render.yaml` in the repo root and creates the service with a
   persistent disk mounted at `/app/data`.
4. When prompted, set:
   - `BASE_URL` = your service URL (or custom domain, e.g. `https://pay.yourdomain.com`)
   - `ADMIN_PASSWORD` = any long random string
5. Wait for build (`npm install --omit=dev` → `node src/server.js`) → open
   `https://<your-service>.onrender.com/health` → `{ "ok": true }` ✅
6. Sign in at `/admin`.

> The committed `render.yaml` uses **plan: starter** because **persistent disks
> require a paid plan**. On the free plan, delete/comment the `disk:` section
> and `DB_PATH`, and accept that data resets on every redeploy.

### A2. Manual web service (no blueprint)

1. Render → **New → Web Service** → connect GitHub → pick this repo.
2. Settings:
   - **Runtime:** Node — **Node version:** 24 or 26 (Render → Environment → `NODE_VERSION=26` if it defaults to older)
   - **Build Command:** `npm install --omit=dev`
   - **Start Command:** `node src/server.js`
   - **Health Check Path:** `/health`
   - **Region:** Singapore (closest to Bangladesh)
3. **Environment:** add `BASE_URL`, `ADMIN_PASSWORD`, `TRUST_PROXY=true`,
   `DB_PATH=/app/data/fpg.db`
4. **Disks** (paid): mount `/app/data`, size 1 GB.
5. Deploy → verify `/health` → open `/admin`.

### A3. Custom domain on Render

1. Render → service → **Settings → Custom Domains** → add `pay.yourdomain.com`.
2. At your DNS (or Cloudflare DNS — stay in "DNS only" ☁️-grey for Render, or
   use Cloudflare Tunnel instead; see below) point a `CNAME` to the
   `*.onrender.com` host Render shows you.
3. Render auto-provisions TLS. Set `BASE_URL` to the custom domain and
   redeploy.

---

## 4. Option B — Cloudflare

Cloudflare can't run Node.js apps natively, but it gives you **free HTTPS,
DDoS protection and a CDN** around this app, or a **free tunnel** without any
public IP.

### B1. Cloudflare proxy in front of Render / a VPS (recommended)

1. In Cloudflare DNS (your domain): `pay.yourdomain.com` → `CNAME` →
   `<your-service>.onrender.com` (or your VPS IP with an `A` record, proxied ☁️)
2. Cloudflare → **SSL/TLS → Overview**: choose **Full (strict)** (Render/most
   hosts serve valid certs) — or **Full** if that ever complains.
3. **Always Use HTTPS** ✅, **Minimum TLS 1.2** ✅, **HTTP/2+QUIC** ✅,
   **Bot Fight Mode** ✅ (Settings → Security).
4. **Security → WAF**: add a rate-limit rule for `/admin/login*` (e.g. 10 req /
   10 min per IP) — the app also rate-limits internally, this is belt and braces.
5. Set `BASE_URL=https://pay.yourdomain.com`, `TRUST_PROXY=true`, redeploy.

### B2. Cloudflare Tunnel — free HTTPS from a home/office PC, no public IP, no port forward

Great for zero-cost setups. `cloudflared` makes an outbound-only connection to
Cloudflare's edge, so your IP never appears in DNS and nothing to forward.

```bash
# 1. Install cloudflared (Windows: winget install --id Cloudflare.cloudflared)
winget install --id Cloudflare.cloudflared -e

# 2. Log in (opens browser to authorize your domain on Cloudflare)
cloudflared tunnel login

# 3. Create a named tunnel
cloudflared tunnel create fpg
#    → note the TUNNEL_ID and the credentials file it writes

# 4. Point DNS at the tunnel (Cloudflare manages the record)
cloudflared tunnel route dns fpg pay.yourdomain.com

# 5. Config file  (Linux/macOS: ~/.cloudflared/config.yml — Windows: %USERPROFILE%\.cloudflared\config.yml)
#    tunnel: <TUNNEL_ID>
#    credentials-file: <path-to>.json
#    ingress:
#      - hostname: pay.yourdomain.com
#        service: http://localhost:3000
#      - service: http_status:404

# 6. Run it (keeps running as a service)
cloudflared tunnel run fpg
```

Then `https://pay.yourdomain.com` works worldwide, DDoS-protected, with zero
hosting cost — the only "server" is the machine running `npm start`.
Add `TRUST_PROXY=true` (Cloudflare sets forwarding headers) and restart.

> Windows service: `cloudflared service install` installs it as a service so it
> survives reboots.

### B3. Why not Cloudflare Workers / Pages directly?

- **Pages** hosts static files only — this app is a Node server (API + admin + checkout).
- **Workers** needs V8-isolate-compatible JS: no `node:sqlite`, no filesystem,
  no `better-*` native modules. Running this app there means a full rewrite on
  D1 (SQLite-at-edge) + KV — possible future project, not this build.
- Not recommended. Use **B1** or **B2** — both free.

### B4. Cloudflare + cPanel subdomain (pointer)

If you also host a WordPress site on cPanel, you can point the plugin at a
gateway hosted on Render/tunnel; no inbound rules needed (the plugin only makes
outbound HTTPS calls). MFS approvals happen inside WooCommerce — nothing
inbound required there either.

---

## 5. Docker (any VPS / home server / Hostinger KVM)

```bash
git clone https://github.com/iamtanzir/FREE-Payment-Gateways.git
cd FREE-Payment-Gateways
cp .env.example .env   # set BASE_URL, ADMIN_PASSWORD
docker compose up -d --build
curl localhost:3000/health
```

Put Cloudflare Tunnel (B2) or Caddy/nginx in front for HTTPS. Data persists in
the `fpg-data` volume.

**Update flow:**

```bash
git pull
docker compose up -d --build      # downtime ≈ seconds
```

---

## 6. After first deploy — 10-minute checklist

1. `/health` → `{ "ok": true }`
2. `/admin` → log in with your `ADMIN_PASSWORD` → **change it** (Settings)
3. **API Keys → Create API key** → label "production" → copy the key
4. **Settings**: brand name, `BASE_URL` (exactly the public URL),
   enable **Bangla QR** + paste your QR image URL, enable **Manual** MFS numbers
   → **Save**
5. WooCommerce: `Settings → FPG Gateway` → Base URL + API key → save → test a
   ৳1–10 order via **bKash/Nagad (on-hold)** → confirm TrxID box on the order
   → Approve → order completes
6. Non-Woo sites: create checkout via API, pay, check webhook signature
   (`README.md → Webhooks`)

---

## 7. Backups

The whole database is one file: `data/fpg.db` (or `/app/data/fpg.db`).

```bash
# stop the app (or it's fine with WAL), then copy
cp data/fpg.db backups/fpg-$(date +%F).db
```

Restore = stop app → copy back → start. Docker: `docker cp` from the
`fpg-data` volume.

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `/health` OK but payments stuck | `BASE_URL` wrong/missing — fix & redeploy (checkout links break otherwise) |
| Admin login loop | Set `TRUST_PROXY=true` behind any proxy/Render/Cloudflare |
| 502/504 from Cloudflare | origin down or wrong port; tunnel not running; check `cloudflared tunnel list` and `… logs` |
| Webhooks never arrive | `webhook_url` unreachable from the server, or wrong signature — verify server time (NTP) |
| Render deploys but data "disappears" | Free plan = ephemeral FS; add a persistent disk or use Tunnel/Docker |
| bKash sandbox works, live does not | `bkash_sandbox` must be `0` in Settings + correct live credentials |
| Admin shows many 401s | Normal during internet scans — internal login rate-limit + optional WAF rule handles it |

## 9. Security checklist

- [ ] HTTPS everywhere (Render auto / Cloudflare / Tunnel / Caddy)
- [ ] Strong, unique `ADMIN_PASSWORD` + new API keys (not the sandbox key)
- [ ] `TRUST_PROXY=true` only when behind a real proxy
- [ ] Cloudflare WAF rate-limit on `/admin/login*`
- [ ] Rotate webhook secrets quarterly (`Settings → new API key`)
- [ ] Back up `fpg.db` on a schedule
- [ ] Keep the repo private if you fork it with your config inside; `.env` is git-ignored
