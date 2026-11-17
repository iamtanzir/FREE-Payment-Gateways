# 🚀 Self-Hosting — A to Z · ফ্রি Payment Gateway

## ⚡ TL;DR — ৫ ধাপে লাইভ

1. `git clone https://github.com/iamtanzir/FREE-Payment-Gateways.git`
2. `cd FREE-Payment-Gateways` → `.env.example` `.env`-এ কপি করে `BASE_URL` ও `ADMIN_PASSWORD` বসান
3. **Render:** Blueprint → repo select → done · **Docker:** `docker compose up -d --build` · **VPS:** নিচে §4D-তে ১০ লাইন
4. `https://আপনার-domain/health` → `{"ok":true}` দেখুন
5. `/admin` → login → API key → providers enable → WordPress plugin Settings-এ URL + key → Save — শেষ!

বিস্তারিত নিচে ↓

> 📥 সোর্স কোড: `git clone https://github.com/iamtanzir/FREE-Payment-Gateways.git`
> এই একটা service-ই পুরো payment system — checkout, API, admin, webhooks। কোনো Supabase/MySQL/Postgres **লাগে না** — SQLite ফাইলেই সব ডেটা।

**Quick links:**
- Render: §4A | cPanel/Shared: §4B | Hostinger: §4C | VPS+Nginx: §4D | Docker: §4E | Cloudflare: §4F | Update: §5 | FAQ: §6

---

## 1. ✨ সুবিধাসমূহ

- 🏠 নিজের সার্ভারে — **ডেটা আপনার**, কোনো third-party service লাগে না
- 💸 **মাসিক ফি শূন্য** — host + HTTPS ছাড়া খরচ নেই
- 🇧🇩 Bangla QR, bKash/Nagad/Rocket/Upay/Bank (manual verify, **ফ্রি**) — per-transaction fee provider নেই
- 🔌 REST API + HMAC webhook — যেকোনো app/site সংযুক্ত হয়
- 🛒 WordPress/WooCommerce plugin একই repo-তে
- 🗄️ কোনো database server লাগে না (SQLite auto-create: `data/fpg.db`)

## 2. 📥 সোর্স কোড ডাউনলোড

```bash
git clone https://github.com/iamtanzir/FREE-Payment-Gateways.git
cd FREE-Payment-Gateways
```

WordPress-এ প্লাগইন হিসেবে লাগলে `wordpress/free-payment-gateways/` কপি করুন (নিচের §4 ডিপ্লয় শেষ হলে §7 দেখুন)।

## 3. 🗄️ ডাটাবেজ সেটআপ — কিছুই করতে হবে না

এই app-এ Supabase লাগে না। প্রথমবার `npm start` করলে `data/fpg.db` নিজেই তৈরি হয় (tables/index সহ)। Backup = এই এক ফাইল কপি করা — §8 দেখুন।

## 4. 📋 প্রয়োজনীয়তা

- **Node.js ≥ 22.5** (npm দিয়ে) — অথবা **Docker**
- একটা domain (বা ফ্রি `*.onrender.com` / `*.trycloudflare.com`)
- HTTPS — সব বিকল্প HTTPS দেয়
- (ঐচ্ছিক) WooCommerce 7+ ও PHP 7.4+ যদি WordPress-এ ব্যবহার করেন

## 5. 🔑 Environment Variables (.env)

```bash
cp .env.example .env   # তারপর edit করুন
```

| Variable | উদাহরণ | কেন লাগে |
|---|---|---|
| `PORT` | `3000` | অ্যাপ যেখানে listen করবে |
| `BASE_URL` | `https://pay.yourdomain.com` | **অবশ্যই আপনার public URL** — checkout লিংক ও webhook-এ ব্যবহৃত |
| `ADMIN_PASSWORD` | দীর্ঘ random string | `/admin` ড্যাশবোর্ডের পাসওয়ার্ড |
| `TRUST_PROXY` | `true` | Reverse proxy/Render/Cloudflare-এর পেছনে থাকলে |
| `DB_PATH` | `/app/data/fpg.db` (Docker) | SQLite ফাইলের পথ |

`.env` git-ignored — **কখনো commit করবেন না**।

## 4A. ⚡ Render (সবচেয়ে সহজ)

### A. One-click (Blueprint) — recommended

Project name on Render: **FREE MFS BD** → auto-generated URL `https://free-mfs-bd.onrender.com`

1. GitHub-এ repo আছে: `iamtanzir/FREE-Payment-Gateways`
2. https://render.com → **New → Blueprint** → repo সিলেক্ট করুন
3. repo-র `render.yaml` Render নিজেই পড়ে নেবে (**free plan** — 100% ফ্রি)
4. জিজ্ঞেস করলে দিন:
   - `BASE_URL` = `https://free-mfs-bd.onrender.com` (অথবা নিজের domain)
   - `ADMIN_PASSWORD` = দীর্ঘ random string
5. Build (`npm install --omit=dev`) → start (`node src/server.js`) →
   `https://free-mfs-bd.onrender.com/health` → `{"ok":true}` দেখলে ✅
6. `/admin`-এ লগইন → API Keys → key বানান → Settings-এ providers enable

> ⚠️ **Free plan-এর বাস্তবতা:** Render free = filesystem ephemeral → restart/redeploy-এ SQLite data মুছে যায়, আর ~15 min idle-এ ঘুমায় (সমাধান: নিচের A4 auto-ping)। আসল production-এর জন্য `render.yaml`-এ `plan: starter` + disk uncomment করুন (~$7/mo)।

### B. Manual Web Service

1. Render → **New → Web Service** → repo connect
2. **Build:** `npm install --omit=dev` · **Start:** `node src/server.js` · **Health Check:** `/health` · **Region:** Singapore (বাংলাদেশের কাছে)
3. **Environment:** `BASE_URL`, `ADMIN_PASSWORD`, `TRUST_PROXY=true`, `DB_PATH=/app/data/fpg.db`
4. **Disks** (paid): mount `/app/data`, 1 GB
5. Deploy → `/health` verify → `/admin`

### Custom domain

Render → service → **Settings → Custom Domains** → `pay.yourdomain.com` add →
DNS-এ দেখানো `CNAME` বসান → Render নিজেই TLS দেয় → `BASE_URL` আপডেট করে redeploy।

### A4. Render free — sleep mode না হয় (⚠️ আগে পড়ুন)

> **⚠️ সত সতর্কতা (২০২৬-১১):** ৫–১০ মিনিট interval-এ ২৪/৭ ping করলে service কখনো ঘুমায় না —
> ফলে Render-এর **750 free instance-hours/মাসে** এক মাসের আগেই শেষ হয়ে যায়। সীমা ছাড়ালে
> Render workspace-এর সব free service **পরবর্তী billing period পর্যন্ত suspend** করে দেয়
> (free-mfs-bd-এ এটাই হয়েছে: "Free usage limit reached")। তাই `keep-alive.yml` এখন
> **manual-only** করা হয়েছে। নির্ভরযোগ্য $0 uptime চাইলে দেখুন
> [`MIGRATE-FREE-HOST.md`](MIGRATE-FREE-HOST.md) — Oracle Always Free VPS (always-on) বা Cloud Run।

Render free service ~15 min idle-এ ঘুমায়; প্রথম request-এ আবার জাগে (cold start ~50s)। একদম ফ্রি auto-ping:

**Option 1 — GitHub Actions (built-in, no signup):** এই repo-তে `.github/workflows/keep-alive.yml` আছে —
এখন **manual-only** (schedule সরানো হয়েছে)। Actions → "Keep Render awake" → Run workflow দিয়ে
`/health` একবার check করা যায়; কিন্তু ২৪/৭ চালু রাখলে free quota পুড়ে যাবে — স্থায়ী সমাধানের জন্য
Option 2/3-এর বদলে `MIGRATE-FREE-HOST.md` দেখুন।

**Option 2 — UptimeRobot (ফ্রি, 5 min):** uptimerobot.com → free account → Add New Monitor → HTTP(s) → `https://free-mfs-bd.onrender.com/health` → interval 5 minutes। টাকার খেলা নেই, SSL-ও valid।

**Option 3 — cron-job.org (ফ্রি, 1 min):** cron-job.org → account → create cronjob → URL `https://free-mfs-bd.onrender.com/health` → every 10 minutes।

> Render-এর official নিয়ম: free web service spins down after 15 min idle; এভাবে ping করলে সাধারণত warm থাকে। পুরোপুরি নিশ্চিত ঘুমহীন uptime চাইলে Cloudflare Tunnel (নিচে 4F-B) — তবে সেটা pc/server on থাকতে হবে; অথবা সবচেয়ে নিশ্চিত = Render paid ($7/mo) বা VPS।

## 4B. 🖥️ cPanel / Shared Hosting — সৎ উত্তর

সাধারণ cPanel-এ **Node.js চলে না** — এই gateway PHP না, Node। দুটো পথ:

1. **সবকিছু cPanel-এর বাইরে** — gateway Render/Tunnel/Docker-এ রাখুন, cPanel-এ শুধু WordPress site → plugin শুধু outbound HTTPS call করে, কোনো inbound rule লাগে না। ✅ সবচেয়ে সাধারণ সমাধান
2. **cPanel-এ Node setup** — কিছু cPanel/DirectAdmin-এ "Setup Node.js App" থাকে ("Software → Node.js Selector")। থাকলে: app বানান, `node src/server.js`, env vars (`BASE_URL=https://your-domain/nodeapp` বা subdomain), reverse proxy করে domain-এর সাথে যুক্ত করুন। যদি না থাকে — বিকল্প 1 অথবা নিচে Hostinger/VPS

## 4C. 🌐 Hostinger

hPanel-এ সাধারণত **"Node.js App"** menu থাকে (Hosting → Advanced → Node.js):

1. Node.js app বানান → Node version **24+** (না পেলে "npm run" দিয়ে CLI mode)
2. Project files upload (File Manager/`git clone` via SSH যদি থাকে) → `npm install --omit=dev`
3. **Startup file:** `src/server.js` · **Mode:** production · **Port:** hPanel যেটা দেয়
4. Env vars: `BASE_URL=https://yourdomain.com`, `ADMIN_PASSWORD=...`, `TRUST_PROXY=true`, `PORT=<hPanel-এর পোর্ট>`
5. Subdomain (যেমন `pay.yourdomain.com`) app-এর সাথে যুক্ত করুন
6. Node app না থাকলে → Gateway টি Render/Docker-এ চালিয়ে Hostinger-সাইটে plugin দিয়ে সংযুক্ত করুন (উপরে 4B-1)

## 4D. 🐧 VPS (Ubuntu + Nginx) — production standard

```bash
# 1. Node 26 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_26.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx

# 2. App
sudo mkdir -p /opt/fpg && sudo chown $USER /opt/fpg
git clone https://github.com/iamtanzir/FREE-Payment-Gateways.git /opt/fpg && cd /opt/fpg
npm install --omit=dev
cp .env.example .env   # BASE_URL=https://pay.yourdomain.com, ADMIN_PASSWORD=..., TRUST_PROXY=true, PORT=3000

# 3. systemd service
sudo tee /etc/systemd/system/fpg.service >/dev/null <<'EOF'
[Unit]
Description=FREE Payment Gateways
After=network.target
[Service]
WorkingDirectory=/opt/fpg
ExecStart=/usr/bin/node src/server.js
Restart=always
Environment=NODE_ENV=production
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now fpg

# 4. nginx reverse proxy + free TLS
sudo tee /etc/nginx/sites-available/fpg >/dev/null <<'EOF'
server {
  listen 80;
  server_name pay.yourdomain.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
EOF
sudo ln -sf /etc/nginx/sites-available/fpg /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d pay.yourdomain.com
```

`pay.yourdomain.com`-এর A record সার্ভারের IP-তে থাকতে হবে। HTTPS auto-renew (certbot timer) — কিছু করতে হবে না।

## 4E. 🐳 Docker

```bash
git clone https://github.com/iamtanzir/FREE-Payment-Gateways.git && cd FREE-Payment-Gateways
cp .env.example .env     # BASE_URL, ADMIN_PASSWORD সেট করুন
docker compose up -d --build
curl localhost:3000/health   # {"ok":true}
```

Data থাকে `fpg-data` volume-এ। HTTPS-এর জন্য সামনে Cloudflare Tunnel (নিচে 4F-B) বা Caddy দিন।

## 4F. ☁️ Cloudflare

### A. Cloudflare proxy যেকোনো host-এর সামনে (recommended)

1. DNS: `pay.yourdomain.com` → CNAME `free-mfs-bd.onrender.com` (বা VPS-এ `A` record) → **Proxied** ☁️
2. **SSL/TLS → Overview:** **Full (strict)** (Render/Certbot-এর বৈধ cert থাকলে)
3. **Always Use HTTPS** ✅ · **Minimum TLS 1.2** ✅ · **Bot Fight Mode** ✅
4. **WAF**-এ `/admin/login*`-এ rate limit (10 req / 10 min / IP) — app-এও built-in limit আছে
5. `BASE_URL=https://pay.yourdomain.com` + `TRUST_PROXY=true` → redeploy করুন

### B. Cloudflare Tunnel — সম্পূর্ণ ফ্রি, public IP/port forward লাগে না (home/office PC-তেও)

```powershell
# Windows (PowerShell):
winget install --id Cloudflare.cloudflared -e
cloudflared tunnel login          # browser খুলে domain authorize করুন
cloudflared tunnel create fpg     # TUNNEL_ID দেখিয়ে দেবে + credentials file লিখবে
cloudflared tunnel route dns fpg pay.yourdomain.com
# config (%USERPROFILE%\.cloudflared\config.yml):
#   tunnel: <TUNNEL_ID>
#   credentials-file: <path-to>.json
#   ingress:
#     - hostname: pay.yourdomain.com
#       service: http://localhost:3000
#     - service: http_status:404
cloudflared tunnel run fpg
# স্থায়ী service হিসেবে: cloudflared service install
```

সব traffic Cloudflare edge থেকে যায় — আপনার IP কখনও দেখা যায় না, DDoS protection ফ্রি, HTTPS ফ্রি।

### C. কেন Workers/Pages নয় (কিন্তু deploy-টা এখন আর fail করে না)

**Pages** = শুধু static file। **Workers** = V8 isolate — `node:sqlite`, filesystem, native module চলে না; পুরোটা D1 (SQLite-at-edge) দিয়ে নতুন করে লিখতে হতো। ✅ ফ্রি HTTPS চান → **A বা B** ব্যবহার করুন।

> **Cloudflare Workers Builds (GitHub connected) ব্যবহার করছেন?** এখন repo-তে `wrangler.jsonc` + `public/index.html` আছে — `npx wrangler deploy` শুধু **project landing page** (project intro + deploy guide links) publish করবে। Gateway-এর কোনো API/admin/checkout সেখানে চলে না; সেটা চলবে Node host-এ (Render/Docker/VPS)। Build fail-ও আর হবে না — কিন্তু *সচল gateway* চাইলে অবশ্যই A/B + কোনো Node host লাগে।

## 4G. 🗄️ স্থায়ী database — ফ্রি persistent Postgres (DATABASE_URL)

Render free-র SQLite restart-এ মুছে যায় — সমাধান: **app-এ built-in Postgres support**। `.env` বা Render Environment-এ একটাই লাইন:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

এটা দিলেই embedded SQLite বাদ দিয়ে বাইরের Postgres ব্যবহার হয় (schema auto-create হয়; redeploy-এ data থাকে)।

### ফ্রি Postgres providers (সব টেস্ট-সম্ভব, app সাথে inbuild)

| Provider | ফ্রি storage | নোট |
|---|---|---|
| **CockroachDB Serverless** | **10 GB** ← সবচেয়ে বড় | Postgres-compatible, "forever free", AWS/GCP |
| **Neon** | 0.5 GB | serverless, scale-to-zero, 0.5 GB, কোনো pause নেই |
| **Supabase** | 500 MB | idle-এ pause হতে পারে, আবার চালু করা যায় |
| **Render free Postgres** | Hobby tier | একই Render account-এ — dashboard একসাথে |

### CockroachDB (10 GB) — ৩ মিনিটে (recommended)

1. https://cloud.cockroachlabs.com → **Sign up** (free) → **Create Cluster** → **Serverless** → free tier select → cluster তৈরির পর **Connect**
2. **SQL User + password** বানান → **Connection string** কপি: `postgresql://user:password@serverless-host.aws-region.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full`
3. Render → service → **Environment** → `DATABASE_URL` = ওই string যোগ করুন → Save (auto redeploy)
4. Verify: `/health` ok → test invoice তৈরি → redeploy করে দেখুন data আছে → শেষ ✅

### Neon (0.5 GB)

1. https://neon.tech → sign up → **New project** → region → **Connection string** কপি
2. Render Environment-এ `DATABASE_URL` = ওই string
3. Redeploy → data স্থায়ী

> গুণমান যাচাই: local PG-তে `DATABASE_URL` দিয়ে পুরো test suite চালিয়ে দেখা হয়েছে; product-v1.1.0।

## 5. 🔄 Update & Upgrade

```bash
cd /opt/fpg                     # অথবা repo folder
git pull
npm install --omit=dev          # deps পরিবর্তন হলে
sudo systemctl restart fpg      # VPS
# Docker: docker compose up -d --build   (downtime ≈ সেকেন্ড)
# Render:  git push → auto redeploy (একই repo), বা Manual Deploy বাটনে click
```

আপগ্রেডের আগে `data/fpg.db` backup নিন (নিচের §8)।

## 6. ❓ Troubleshooting / FAQ

| উপসর্গ | সমাধান |
|---|---|
| `/health` OK কিন্তু checkout লিংক ভাঙে | `BASE_URL` ভুল/নেই — ঠিক করে redeploy করুন |
| Admin-এ login loop | reverse proxy-র পেছনে থাকলে `TRUST_PROXY=true` সেট করুন |
| Render-এ data "মুছে গেল" | Free plan = ephemeral filesystem → Starter + disk নিন, অথবা Tunnel/Docker |
| Cloudflare 502/504 | origin down/port ভুল; tunnel চলছে কিনা `cloudflared tunnel list`; `… logs` দেখুন |
| Webhook আসে না | `webhook_url` server থেকে reachable কিনা, signature ঠিক কিনা; server-এর ঘড়ি (NTP) ঠিক আছে কিনা |
| cPanel-এ Node নেই | উপরে 4B/4C বা 4F-B (Tunnel) — কোনো inbound rule লাগে না |

| প্রথম run-এ admin password | Default **`12345678`** — `/admin` → Settings থেকে সঙ্গে সঙ্গে বদলে নিন (বা `.env`-এ `ADMIN_PASSWORD` সেট করুন) |
| **Password/Settings পরিবর্তন স্থায়ী হচ্ছে না (Render Free)** | **Render → service → Environment → `ADMIN_PASSWORD` বদলে Manual Deploy** — প্রতিটি fresh boot-এ env-এ দেওয়া password থেকে hash তৈরি হয় (SQLite reset হওয়ার পরও ঠিক থাকে)। Docker/VPS-এ চললে disk-এ password স্থায়ী থাকে — একবারই বদলে যথেষ্ট |
| Render Free-এ data কেন হারায়? | Ephemeral filesystem — প্রতিটি restart/redeploy-এ `data/fpg.db` (orders, settings, API keys) মুছে যায়। স্থায়ী data চাইলে Starter+disk ($7) বা VPS/Docker নিন |

**FAQ**
- **কত খরচ?** Render/Tunnel-এ host ছাড়া 0 টাকা; VPS/Docker-এ শুধু VPS ভাড়া।
- **WordPress-এ data কোথায়?** Order-এর meta-তেই TrxID — অতিরিক্ত table লাগে না। Gateway-চালিত mode-এ সব gateway-র SQLite-এ।
- **কয়টা store/site?** যতগুলো ইচ্ছা — সব একই API key বা আলাদা key দিয়ে, সব একই `/admin` থেকে দেখবেন।
- **Vercel/Netlify?** চলবে — কিন্তু বাইরের ডেটাবেস লাগবে (**Turso** `TURSO_DATABASE_URL`+`TURSO_AUTH_TOKEN`, বা Postgres `DATABASE_URL`) কারণ filesystem ephemeral। [`VERCEL-TURSO.md`](VERCEL-TURSO.md) দেখুন।

## 7. 🛒 WordPress/WooCommerce সংযুক্ত করা

1. `wordpress/free-payment-gateways/` → `wp-content/plugins/`-এ কপি → **Activate**
2. **Settings → FPG Gateway**: Gateway Base URL (`https://pay.yourdomain.com`) + API key (`/admin → API Keys`) দিয়ে Save
3. WooCommerce: **Payments** ট্যাবে দুটো নতুন gateway —
   - **FPG Bangla QR & MFS (Manual Verify)** — checkout-এ QR/number, TrxID field; order থেকে Approve/Reject
   - **FPG Self-Hosted Gateway** — customer-কে hosted checkout-এ redirect; order return-এ auto-complete
4. সাধারণ page-এ `[fpg_pay amount="500" button="Pay ৳500"]`

## 8. 🔒 Backup / Restore

```bash
# Backup (সব ডেটা এক ফাইলে):
cp data/fpg.db backups/fpg-$(date +%F).db        # বা Docker volume থেকে docker cp
# Restore: app থামাতে → ফাইল ফেরত কপি → app চালু
```

## 9. ✅ Go-live checklist

- [ ] HTTPS (Render auto / certbot / Cloudflare) + `TRUST_PROXY=true`
- [ ] শক্তিশালী unique `ADMIN_PASSWORD` + প্রথম API key rotate
- [ ] `BASE_URL` ঠিক public URL
- [ ] Cloudflare WAF rate-limit `/admin/login*` (ঐচ্ছিক, কিন্তু সুপারিশকৃত)
- [ ] `fpg.db`-র নিয়মিত backup
- [ ] একটা ৳1 test order পুরোপুরি যাচাই (TrxID → Approve → thank-you page)

