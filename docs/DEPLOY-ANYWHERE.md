# 🌍 DEPLOY ANYWHERE — 100% FREE hosting, প্রতিটি path-এর full step-by-step

> শুধু **ফ্রি** অপশনগুলোই এখানে আছে। Railway ($5/মাস-এর পরে) আর Fly.io (permanent free নেই) — **বাদ**।
> AWS EC2-ও ফ্রি, কিন্তু শুধু **১২ মাস** — ১২ মাসের পরে আবার ফ্রি যেটা চাইলে Oracle-এ migrate করুন (নিচে §6)।
> বাকি সবই **চিরকাল ফ্রি** (তোমার hardware / Oracle Always Free / free tier)।
>
> **⚠️ Serverless platform-এ (Cloud Run / Render / Vercel / Koyeb) `DATABASE_URL` বাধ্যতামূলক — ফ্রি Postgres বসান
> (Neon / CockroachDB / Supabase — নিচে §13)। নইলে SQLite data প্রতি deploy-এ মুছে যাবে।**

---

## 📊 এক নজরে — কোনটা বেছে নেব

| # | Platform | খরচ | ২৪/৭? | Cold start | SQLite-ই চলবে? | Dashboard URL |
|---|---|---|---|---|---|---|
| 1 | Localhost | $0 | — | নেই | ✅ | `http://localhost:3000/admin` |
| 2 | নিজের PC (২৪/৭ অন) | $0 | PC অন থাকলে | নেই | ✅ | DuckDNS + Caddy → free HTTPS |
| 3 | Raspberry Pi / Orange Pi | $0 | Pi অন থাকলে | নেই | ✅ | DuckDNS + Caddy → free HTTPS |
| 4 | Docker — যেকোনো VPS | VPS-এর দাম | ✅ | নেই | ✅ (volume) | তোমার domain |
| 5 | Oracle Cloud Always Free | **$0 forever** | ✅ | নেই | ✅ | DuckDNS/Caddy বা Tunnel |
| 6 | AWS EC2 free tier | **$0 ১২ মাস** | ✅ | নেই | ✅ | DuckDNS/Caddy |
| 7 | Google Cloud Run | $0 forever (~2M req/মাস) | scale-to-zero | ~২–৫ সে. | ❌ — free Postgres লাগে | `https://xxx.a.run.app/admin` |
| 8 | Render | $0 forever | sleeps (15 min) | ~১ মি. | ❌ — free Postgres লাগে | `https://xxx.onrender.com/admin` |
| 9 | Vercel | $0 forever (Hobby) | serverless | ~১ সে. | ❌ — free Postgres লাগে | `https://xxx.vercel.app/admin` |
| 10 | **Koyeb** | ❌ (আগে free nano ছিল; এখন paid — ECO ~$0.0002/sec, scale-to-zero) | scale-to-zero | ~১–২ সে. | ❌ — free Postgres লাগে | `https://xxx.koyeb.app/admin` |

**সবচেয়ে কম ঝামেলা + domain-free free HTTPS:** §7 Cloud Run বা §9 Vercel (`*.run.app` / `*.vercel.app` URL — HTTPS free, ডোমেইন কেনারই দরকার নেই)।
(Koyeb এখন paid, তাই primary recommendation থেকে বাদ দেওয়া হয়েছে।)
**স্থায়ী 24/7 + কোনো cold start নেই:** §5 Oracle বা §3 নিজের Pi।

---

## 1️⃣ Localhost (২ মিনিট — আগে এটা দিয়ে দেখুন)

Requirements: **Node.js ≥ 22.5** (built-in `node:sqlite`) — Node 24/26 recommended। (`DATABASE_URL`-এ Postgres দিলে Node ≥ 22-ও চলবে।)

```bash
git clone https://github.com/iamtanzir/FREE-Payment-Gateways.git
cd FREE-Payment-Gateways
npm install
npm start
```
প্রথমবার console-এ admin password ছাপা হবে (একবারই) → `http://localhost:3000/admin` → login → `Settings`-এ তোমার bKash/Nagad/Rocket/Bangla QR বসাও।

স্থায়ীভাবে চালিয়ে যেতে চাইলে পরে নিচের অপশনগুলো দেখো। প্রথম দেখা যাক checkout ঠিকঠাক কাজ করে কিনা — `/admin → API Keys` → key বানাও, তারপর:

```bash
curl -X POST http://localhost:3000/api/v1/checkout \
  -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" \
  -d '{"amount": 150.50, "currency": "BDT", "description": "Order #1001", "success_url": "http://localhost:3000/"}'
```
→ `checkout_url`-এ গিয়ে "Pay now (simulated)" চাপুন।

---

## 2️⃣ নিজের PC (Windows/Linux, ২৪/৭ অন) + free HTTPS — ডোমেইন কেনা ছাড়া

### Windows — persistent service

App টা সবসময় চলতে হলে **Task Scheduler**-এ logon-এ `C:\Program Files\nodejs\node.exe` দিয়ে `C:\path\FREE-Payment-Gateways\src\server.js` চালান (trigger: At startup / At log on)। Linux-এ `pm2` বা `systemd` (নিচে Pi-র §3-এ unit উদাহরণ আছে — একই রকম)।

### Step A — DuckDNS ফ্রি subdomain নিন (২ মিনিট)

1. https://www.duckdns.org → GitHub/Google দিয়ে sign in
2. "sub domain" ঘরে একটা নাম দিন যেমন `myshop` → **add domain** → `myshop.duckdns.org` তৈরি
3. IP আপডেট রাখা (PC বুট হলেই যেন নতুন IP বসে — home IP ডায়নামিক):
   PowerShell (admin) → Scheduled Task: action = `powershell -Command "irm 'https://www.duckdns.org/update?domains=myshop&token=YOUR_TOKEN&ip='"`, trigger = at startup + প্রতি ৫ মি. repeat; token DuckDNS page-এই পাবেন।

### Step B — Caddy দিয়ে free HTTPS reverse proxy

Download: https://caddyserver.com/download (Windows amd64) → যেকোনো folder-এ। `Caddyfile` (তে রাখুন exe-এর পাশে):

```
myshop.duckdns.org {
    reverse_proxy localhost:3000
}
```

```bash
caddy run        # প্রথমবার Admin API + cert auto-install; http→https redirect অটোম্যাটিক
```
(permanent service: `caddy run` কে Task Scheduler / Linux `systemd` service বানান।)

### Step C — App-এ env

`.env`-এ:
```
BASE_URL=https://myshop.duckdns.org
TRUST_PROXY=true
ADMIN_PASSWORD=<long-random>
```
restart → `https://myshop.duckdns.org/admin` ✅

**Port forward করতে পারলে router-এ** 80/443 → PC-এর IP-তে forward দিন (Caddy-র জন্য লাগে)। না পারলে/জানা না থাকলে **Cloudflare Tunnel** (below §14B) — port forward ছাড়াই কাজ হয়।

---

## 3️⃣ Raspberry Pi / Orange Pi — পুরোপুরি $0, ARM64

**Requirements:** 64-bit OS (Raspberry Pi OS 64-bit / Ubuntu Server 24.04 ARM64 / Armbian) — **32-bit armv7-এ নতুন Node/`node:sqlite` official build নেই, চলবে না ঠিকঠাক।** ভয় নেই: Node installer + Docker দুটোই arm64 support করে।

### Option A — Docker (recommended)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

git clone https://github.com/iamtanzir/FREE-Payment-Gateways.git
cd FREE-Payment-Gateways
docker compose up -d --build
curl http://localhost:3000/health    # {"ok":true}
```
SQLite data `fpg-data` volume-এ persist থাকে; redeploy-এ মুছে যায় না। Update: `git pull && docker compose up -d --build`।

### Option B — সরাসরি Node (Pi-এ Docker ছাড়াই)

```bash
curl -fsSLO https://nodejs.org/dist/v24.11.1/node-v24.11.1-linux-arm64.tar.xz
sudo tar -xJf node-v24.11.1-linux-arm64.tar.xz -C /usr/local --strip-components=1
node -v          # v24.x
git clone https://github.com/iamtanzir/FREE-Payment-Gateways.git
cd FREE-Payment-Gateways && npm install --omit=dev
sudo cp .env.example .env   # edit: ADMIN_PASSWORD, BASE_URL
npm start
```
স্থায়ী service — `/etc/systemd/system/fpg.service`:

```ini
[Unit]
Description=FREE Payment Gateways
After=network.target

[Service]
WorkingDirectory=/home/pi/FREE-Payment-Gateways
ExecStart=/usr/local/bin/node src/server.js
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable --now fpg
```

### Pi-এ free HTTPS

Pi-র IP static করা (router-এ DHCP reservation) → Router-এ port 80/443 forward → §2-এর DuckDNS + Caddy হুবহু একইভাবে। না পারলে §14B-এর Cloudflare Tunnel।

---

## 4️⃣ Docker — যেকোনো VPS (Oracle/AWS/নিজের VPS — সবার common base)

Repo-তে ready `Dockerfile` + `docker-compose.yml` আছে:

```bash
docker compose up -d --build
docker compose logs -f          # admin password এখানেই প্রথমবার দেখা যাবে (ADMIN_PASSWORD না দিলে)
```
`.env` (অথবা compose-এ environment): `BASE_URL`, `ADMIN_PASSWORD`, `TRUST_PROXY=true`, `DATABASE_URL` (optional; VPS-এ SQLite volume-েই যথেষ্ট)।

> **Tip:** Windows/Mac থেকে build করলেও `.dockerignore` আছে — host-এর `node_modules`, `.env`, `data/` image-এ ঢোকে না (image সবসময় Linux + fail-safe)।

---

## 5️⃣ Oracle Cloud Always Free — $0 forever, ২৪/৭, no sleep (সবচেয়ে শক্তিশালী)

**Signup (একবার):** cloud.oracle.com → Sign up (card লাগে verification-এ, চার্জ $0) → **Create free account**। Home region একটা বেছে নিন (যেমন Mumbai)।

### Step A — VM বানান (ARM, forever-free)

1. Console → **Compute → Instances → Create instance**
2. Image: **Ubuntu 24.04** (aarch64) — "Select image" থেকে Ubuntu 24.04 minimal/aarch64 pick
3. Shape: change → **Ampere → VM.Standard.A1.Flex** → 1 OCPU + 6 GB (free allowance: 4 OCPU / 24 GB পর্যন্ত একসাথে)
4. Networking: default VCN; **Assign public IPv4**: ON
5. SSH key: generate new key pair → **private key download** (হারালে ঢুকতে পারবেন না)
6. Create

### Step B — Port খুলুন (২ জায়গায় লাগে)

1. **Security List** (VCN → Subnets → public subnet → Security List → Add Ingress):
   TCP `80` source `0.0.0.0/0`; TCP `443` source `0.0.0.0/0`
2. **Ubuntu iptables** (Oracle images-এ সব block থাকে):
   ```bash
   ssh -i key.pem ubuntu@VM_IP
   sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```

### Step C — App চালু (ARM64 Docker)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
git clone https://github.com/iamtanzir/FREE-Payment-Gateways.git
cd FREE-Payment-Gateways
docker compose up -d --build
curl http://localhost:3000/health
```

### Step D — free HTTPS (DuckDNS + Caddy)

§2-এর Step A/B একইভাবে VM-এ করুন (DuckDNS subdomain + Caddyfile `myshop.duckdns.org { reverse_proxy localhost:3000 }`) → iplist আপডেট cron-এ VM-এর public IP বসিয়ে দিন।
শেষ: `.env`-এ `BASE_URL=https://myshop.duckdns.org`, `TRUST_PROXY=true` → `docker compose restart`।
→ `https://myshop.duckdns.org/admin` ✅

> **Note:** "Out of capacity" দেখালে — region/AD (Availability Domain) বদলে চেষ্টা করুন; এটা Oracle-এর সাধারণ সমস্যা, অল্প সময়েই সমাধান হয়।

---

## 6️⃣ AWS EC2 free tier — $0 × ১২ মাস (t3.micro)

**Free tier:** 750 ঘন্টা/মাস t3.micro × ১২ মাস + 30 GB EBS। EBS persistent → SQLite-ই যথেষ্ট।
**⚠️ ১২ মাসের পর চার্জ হতে পারে** (~$7.50/মাস) — শেষে Oracle (§5)-এ `docker compose` data copy করে migrate করুন।
**⚠️ Elastic IP free শুধু তখনই যখন running instance-এর সাথে attached।** Instance stopped থাকলে IP charge হয় — DuckDNS ব্যবহার করলে কোনো IP লাগেই না (home-IP-style cron update কাজ করে না। stop করলে VM-এর IP বদলায় না EC2-তে — তাই Elastic IP attach + free রাখুন, অথবা প্রতিবার start-এ DuckDNS আপডেট)।

### Steps

1. EC2 Console → **Launch instance** → Name `fpg`
2. AMI: **Ubuntu Server 24.04 LTS** → Instance type: **t3.micro** (Free tier eligible ✅)
3. Key pair: নতুন বানান → download `.pem`
4. Security group: SSH `22` → **My IP**; HTTP `80` → Anywhere; HTTPS `443` → Anywhere
5. Storage: 8 GB gp3 (30 GB পর্যন্ত ফ্রি)
6. Launch → Instance → public IPv4 address
7. SSH:
   ```bash
   ssh -i key.pem ubuntu@EC2_PUBLIC_IP
   ```
8. App (§4/§5C-এর মতো):
   ```bash
   curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker ubuntu && newgrp docker
   git clone ... && cd FREE-Payment-Gateways
   docker compose up -d --build
   ```
9. HTTPS: §2-এর DuckDNS + Caddy (EC2-তে হুবহু একই)।
10. **Cost guard:** Billing console → **Budgets** → zero-spend budget alert email — ১২ মাসের আগেই ভুলেও বিল ধরলে email পাবেন।

---

## 7️⃣ Google Cloud Run — 100% free (কার্ড লাগে verification-এ, $0 charge)

≈ **২ মিলিয়ন request/মাস** free; scale-to-zero। **কিন্তু filesystem ephemeral → `DATABASE_URL`-এ free Postgres বাধ্যতামূলক** (§13)।

### Step A — gcloud CLI (Windows)

```powershell
winget install Google.CloudSDK
gcloud init          # browser খুলে login; নতুন project বানান বা pick করুন (global name, e.g. myshop-fpg)
# Billing link করতে বলবে — link করুন (card দেখান লাগে, চার্জ $0 as long as free tier)
```

### Step B — Free Postgres বানান (Neon — card লাগে না)

1. https://neon.tech → GitHub দিয়ে sign in → **Create project** → Region: `aws-ap-southeast-1` (Singapore — BD-র জন্য কাছের) → project name কিছু
2. Dashboard → **Connection string** → "Pooled connection" copy করুন:
   `postgresql://user:pass@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/dbname?sslmode=require`

### Step C — Deploy (repo-এর Dockerfile auto-build)

`env.yaml` (কমা-সমস্যা এড়াতে connection string-এ কমা থাকলেও চলবে):
```yaml
BASE_URL: "https://PLACEHOLDER.a.run.app"   # প্রথম deploy-এর পর real URL দিয়ে আবার deploy
TRUST_PROXY: "true"
ADMIN_PASSWORD: "<long-random-string>"
DATABASE_URL: "postgresql://user:pass@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/dbname?sslmode=require"
```
```powershell
gcloud run deploy free-mfs-bd --source . --region asia-southeast1 --allow-unauthenticated --min-instances 0 --env-vars-file env.yaml
```
প্রথমবার APIs enable করতে বললে `y` দিন (Cloud Run + Cloud Build + Artifact Registry — সব free tier-এর ভেতর)।
Output-এ URL পাবেন: `https://free-mfs-bd-xxxxx.a.run.app`

### Step D — BASE_URL ঠিক করুন

`env.yaml`-এ `BASE_URL` real URL বসান → আগের deploy command **আবার run** (env change-এ নতুন revision লাগে)। তারপর:
```bash
curl https://free-mfs-bd-xxxxx.a.run.app/health    # {"ok":true}
```
→ `https://free-mfs-bd-xxxxx.a.run.app/admin` → login (password = তোমার `ADMIN_PASSWORD`) ✅

> Webhook গুলোও চলে — cold start-এর পর প্রথম webhook পৌঁছাতে একটু দেরি হতে পারে, কোনো টাকা হারায় না। Admin password console-এ দেখা যায় না (serverless) — তাই `ADMIN_PASSWORD` env দিতে হবে।

---

## 8️⃣ Render — এক ক্লিক Blueprint, চিরকাল free (sleep করে)

1. https://render.com → GitHub দিয়ে sign in → **New → Blueprint**
2. Repo `FREE-Payment-Gateways` সিলেক্ট → Render `render.yaml` নিজে পড়বে
3. Prompt হলে দিন: `BASE_URL=https://free-mfs-bd.onrender.com` (নাম ভিন্ন হলে নিজেরটা) আর `ADMIN_PASSWORD` (লং র‍্যান্ডম)
4. **Advanced → Add environment variable:** `DATABASE_URL = <§13-এর Neon string>` (এটা না দিলে SQLite প্রতি restart-এ মুছে যাবে)
5. Create → ২–৩ মি. পরে `https://free-mfs-bd.onrender.com/admin`

**Caveats:** free instance ১৫ মিনিট idle-এ sleep → প্রথম request-এ ~১ মিনিট cold start (webhook আসলেও ঠিকঠাক — Render request wake করে দেয়, কোনো ক্ষতি নেই, একটু দেরি)। ২৪/৭ চাইলে §5।

---

## 9️⃣ Vercel — serverless, domain-free free HTTPS (repo-তে আগেই ready ✅)

> কোডের `api/index.js` + `vercel.json` আগেই যোগ করা — Express app টাই serverless function হয়। বাইরের ডেটাবেস দিলে `node:sqlite` load-ই হয় না।
>
> 📘 **Vercel + Turso (সুপারিশকৃত, $0) / Supabase pooler / Aiven — সম্পূর্ণ ধাপে ধাপে: [`VERCEL-TURSO.md`](VERCEL-TURSO.md)** · Aiven-কেন্দ্রিক গাইড: [`VERCEL-AIVEN.md`](VERCEL-AIVEN.md)

### Steps

1. https://vercel.com → **Continue with GitHub** → **Add New → Project** → `FREE-Payment-Gateways` import
2. **Environment Variables** (Deploy button-এর আগেই):
   - `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` — **সবচেয়ে সহজ, সুপারিশকৃত** (serverless SQLite over HTTP, persistent disk লাগে না)
   - অথবা `DATABASE_URL` = §13-এর Aiven/Neon/Supabase-pooler string — **বাধ্যতামূলক** (একটা অবশ্যই লাগবে; filesystem ephemeral)
   - অথবা সরাসরি Neon মার্কেটপ্লেস্ট ইন্টিগ্রেশন বসাও — তখন Vercel নিজেই `POSTGRES_URL` inject করে দেবে; app (এই repo) সেটাও সাপোর্ট করে
   - `PG_POOL_MAX` = `3` (শুধু Postgres-এ; Aiven Free-এ মোট ২০ connection — serverless instance বেশি হলে pool ছোট রাখো)
   - `ADMIN_PASSWORD` = লং র‍্যান্ডম
   - `BASE_URL` = `https://PROJECTNAME.vercel.app` (না জানলে আগে একটা placeholder দিয়ে deploy → পরে ঠিক করে **Redeploy**)
   - `TRUST_PROXY` = `true`
3. **Deploy** → শেষ হলে `https://PROJECTNAME.vercel.app/admin` → login ✅
4. Env পরিবর্তন করলে: **Deployments → সবচেয়ে latest → ⋯ → Redeploy**

**Caveats:** ~১ সেকেন্ড cold start। Hobby plan-এ non-commercial/ব্যক্তিগত ব্যবহার free — রেডার্ন করার প্রয়োজন নেই small merchant-দের জন্য।

---

## 🔟 Koyeb — এখন paid (পূর্বে free nano ছিল)

⚠️ Koyeb-এর free nano বন্ধ হয়ে গেছে; এখন ECO compute per-second বিল হয় (scale-to-zero, $0.0002/sec এর আশেপাশে)। শূন্য খরচ বাধ্য হলে **Cloud Run বা Vercel** বেছে নিন। Koyeb চাইলে:
1. https://www.koyeb.com → GitHub দিয়ে sign in → **Create Service → GitHub** → repo সিলেক্ট
2. Builder: **Dockerfile** · Port: `3000` · Health check: `/health`
3. Env vars: `DATABASE_URL` (§13 — বাধ্যতামূলক), `ADMIN_PASSWORD`, `BASE_URL=https://APP.koyeb.app`, `TRUST_PROXY=true`
4. Instance type: **ECO** (scale-to-zero — idle-এ প্রায় শূন্য খরচ, কিন্তু ছোট খরচ আছে)
5. `https://APP.koyeb.app/admin` ✅

---

## 🟢 1️⃣1️⃣ Free Postgres (`DATABASE_URL`) — কোথায় পাবেন (card লাগে না)

| Provider | Free quota | Card? | Notes |
|---|---|---|---|
| **Aiven Free Tier** | 1 GB storage · 1 GB RAM · always free · no expiry | ❌ না | Managed Kafka/PG/OpenSearch/Valkey — পুরো free, no upgrade needed; same infra as paid |
| **Neon** | 0.5 GB + 100 CU-hour | ❌ না | Serverless, scale-to-zero; Vercel marketplace-এর সাথে auto-inject |
| **CockroachDB Serverless** | 10 GB (biggest quota) | ❌ না | PostgreSQL wire-compatible; multi-region |
| **Supabase** | 0.5 GB | ❌ না | Postgres + auth/storage |
| Render free Postgres | expiring (30-day) | — | সাময়িক; permanent না |

### Neon (সবচেয়ে সহজ integration — Vercel-এ অটো-push)

1. neon.tech → GitHub/Google sign in → **New project**
2. Region: **Singapore** (ap-southeast-1) → Create
3. **Connection string** → "Pooled connection" toggle ON → copy
4. এটাই তোমার `DATABASE_URL` — `?sslmode=require` suffix সহ কপি হবে, হুবহু env-এ বসাও

### Aiven Free Tier (আমার current suggestion — সবচেয়ে neutral)

> 📘 Vercel-এর সাথে Aiven-এর সম্পূর্ণ সেটআপ + troubleshooting: [`VERCEL-AIVEN.md`](VERCEL-AIVEN.md)

1. https://aiven.io/free-tier → **Get building** → sign up (Google OAuth বা email; no card)
2. **Create service → PostgreSQL** → Plan: **Free** (1 GB storage, 1 GB RAM, free forever)
3. Region হিসেবে **closest region** বাছুন (টাকের কাছে: Singapore বা Mumbai — BD-র জন্য)
4. **Connection information** → "PostgreSQL Connection URI" → copy → এটাই তোমার `DATABASE_URL` (`sslmode=require` থাকাই থাকবে)
5. **সুবিধা:** same platform as paid plans, proper monitoring + automated backups — কোনো expiry নেই
6. **Limits:** 1 service per service type; `max_connections=20`; no connection pooling setting; no VPC — ছোট shop/ISP-এর জন্য যথেষ্ট

### CockroachDB Serverless (১০ GB ফ্রি, সবচেয়ে বড় quota)

1. cockroachlabs.com → sign in (GitHub/Google) → **Serverless Cluster → Create** → free plan
2. **Connect → Connection string** → password set → copy → `sslmode=verify-full` সহ বসাও

### Supabase

1. supabase.com → GitHub sign in → **New project** → database password set → create
2. **Settings → Database → Connection string** → URI mode → copy → `sslmode=require` যোগ করে বসাও

যেকোনো একটার string → env `DATABASE_URL` → deploy। App schema নিজেই বানায় (`src/db.js`) — migration লাগে না।

---

## 🔒 1️⃣2️⃣ Free HTTPS — ৩টা পথ (সব free)

| পথ | কী লাগে | কোথায় |
|---|---|---|
| **A. Platform URL** | কিছুই না | Render/Vercel/Cloud Run — `*.onrender.com` / `*.vercel.app` / `*.run.app` — HTTPS অটোম্যাটিক |
| **B. DuckDNS + Caddy** | ডোমেইন কেনার দরকার নেই | Pi/PC/VPS-এ: §2 Step A+B — ৫ মিনিট সেটআপ, auto Let's Encrypt |
| **C. Cloudflare Tunnel** | ডোমেইন একবার Cloudflare-এ add (free) — port forward লাগে না, home IP লুকানো | §13 |

### §13 Cloudflare Tunnel — A to Z

1. cloudflare.com → Add a site (তোমার ডোমেইন) — free plan
2. Zero Trust dashboard (one.dash.cloudflare.com) → **Networks → Tunnels → Create a tunnel** → নাম `fpg` → Docker/cloudflared
3. Server-এ (Pi/PC/VPS):
   ```bash
   # Linux:
   curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
   echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
   sudo apt update && sudo apt install cloudflared
   sudo cloudflared service install <TOKEN_FROM_DASHBOARD>   # service install = boot-এ অটো-চালু
   ```
   ```powershell
   # Windows: winget install --id Cloudflare.cloudflared -e ; তারপর admin PowerShell-এ:
   cloudflared.exe service install <TOKEN>
   ```
4. Dashboard-এ tunnel-এর **Public Hostname**: `pay.yourdomain.com` → `http://localhost:3000` → Save → DNS অটো-লেখে দেয়
5. `.env`: `BASE_URL=https://pay.yourdomain.com`, `TRUST_PROXY=true` → restart → `https://pay.yourdomain.com/admin` ✅

---

## ✅ 1️⃣3️⃣ Deploy হওয়ার পর — সবাইকে যেটা করতে হবে (একই)

1. **`/admin` → login** (`ADMIN_PASSWORD` দিয়ে)
2. **API Keys → Create** → key + webhook secret copy
3. Test checkout (localhost না হলে নিজের URL দাও):
   ```bash
   curl -X POST https://YOUR-DOMAIN/api/v1/checkout \
     -H "Authorization: Bearer KEY" -H "Content-Type: application/json" \
     -d '{"amount": 10, "currency": "BDT", "description": "Test", "success_url": "https://YOUR-DOMAIN/"}'
   ```
4. Settings: bKash/Nagad/Rocket নম্বর, Bangla QR image URL (`public/banglaqr.png`-এ upload করে `/banglaqr.png`), Manual ON, Demo OFF (prod)
5. **Backup (serverless ছাড়া আর সব):** `sqlite3 data/fpg.db .dump > backup-$(date +%F).sql` cron-এ; অথবা Postgres হলে Neon dashboard-এ built-in backup/branch আছে
6. **Update:** `git pull && npm install && npm start` (Pi/PC) অথবা `git pull && docker compose up -d --build`

---

## 🧯 সাধারণ সমস্যা

| সমস্যা | কারণ / সমাধান |
|---|---|
| Cloudflare/500 | এত push-এর পরেও সাদা screen? → `/health` check; `docker compose logs` দেখুন |
| `/admin` 404 | Cloudflare Workers-এ গেছো — সেখানে শুধু landing page; gateway Node host-এ চালাও |
| Login loop | `TRUST_PROXY=true` বসাও (proxy-র পেছনে থাকলে) |
| SQLite মুছে যায় | Serverless-এ `DATABASE_URL` দাও (§13) |
| Bangla QR image দেখা যায় না | Settings-এ URL ঠিক আছে? `public/banglaqr.png` push করেছ? আগে `https://DOMAIN/banglaqr.png` check করো |
| Render sleep-এ webhook miss | Webhook আসলে Render wake হয় (~১ মি.) — ঠিক আছে; 24/7 চাইলে §5 |
| Pi-এ build fail | 64-bit OS চেক: `uname -m` → `aarch64` হওয়া চাই |
| DuckDNS HTTPS renew fail | token ঠিক আছে? cron/task চলছে? `curl "https://www.duckdns.org/update?domains=NAME&token=TOKEN&ip="` output `OK` |
| Vercel-এ 500 | `DATABASE_URL` ভুল/SSL missing? Neon string হুবহু বসাও |

---

## ❌ যেসব ইচ্ছাকৃতভাবে বাদ (free না)

- **Railway** — $5 trial credit শেষে $5/মাস (Hobby)
- **Fly.io** — নতুন account-এ permanent free tier নেই
- **AWS beyond 12 months** — EC2 t3.micro ১২ মাস ফ্রি; **Billing → Budgets → zero-spend alert** সবসময় চালু রাখুন
- **Custom domain** — কখনও free নয়; কিন্তু `*.vercel.app` / `*.run.app` / `*.onrender.com` / `*.koyeb.app` / `*.duckdns.org` — সবই ফ্রি
