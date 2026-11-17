> সব Postgres provider (Neon, Supabase, CockroachDB, Aiven) এক জায়গায়: [DATABASE.md](DATABASE.md) — TLS policy, `npm run db:doctor`, ব্যাকআপ গাইড।

# Vercel + Aiven — লাইফটাইম ফ্রি ডিপ্লয় (ধাপে ধাপে)

> **এই ডক কেন:** Vercel (Hobby) আর Aiven (Free PostgreSQL) — দুটোই **$0, card ছাড়া, মাসিক/সেটআপ ফি ছাড়া**। Vercel ফ্রি HTTPS + serverless hosting দেয়, Aiven ফ্রি 1 GB Postgres দেয় যার **expiry নেই** (Neon-এর মতো 0.5 GB quota বা Render-এর মতো 30-দিনের মেয়াদ নেই)। এই দুটো জোড়া দিয়ে gateway টা সারা বছর চালানো যায় — সার্ভার maintenance, cron, keep-alive কিছুই লাগে না।

**কী লাগবে:** একটা GitHub account, একটা Vercel account, একটা Aiven account। **কোনো কার্ড লাগে না।**

**কত সময়:** ~10 মিনিট (DB তৈরি 3–5 মিনিট, deploy 2–3 মিনিট)।

---

## ০. এক নজরে — খরচ ও সীমা

| জিনিস | প্ল্যান | খরচ | মূল সীমা |
|---|---|---|---|
| Hosting | Vercel **Hobby** | **$0 / মাস** | fair-use; function ~10s; cold start ~1s |
| Database | Aiven **Free PostgreSQL** | **$0 / মাস, no expiry** | 1 GB storage · 1 GB RAM · **20 connections** · 1 service |
| HTTPS + domain | `*.vercel.app` | **$0** | custom domain optional (ফ্রি) |
| SMS auto-verify bridge | নিজের Android + এই gateway | **$0** | আলাদা কিছু লাগে না |

> ⚠️ **সৎ কথা:** Vercel Hobby plan-এর শর্ত অনুযায়ী এটা **ব্যক্তিগত / non-commercial** ব্যবহারের জন্য। বাণিজ্যিক দোকান চালালে Vercel Pro ($20/মাস) নয়তো [`MIGRATE-FREE-HOST.md`](MIGRATE-FREE-HOST.md)-এর Oracle Cloud Always Free / Cloud Run ব্যবহার করুন। Aiven Free-এ এমন শর্ত নেই।

---

## ১. Aiven-এ ফ্রি PostgreSQL তৈরি (৩–৫ মিনিট)

1. https://aiven.io/free-tier → **Get building** → Google/GitHub দিয়ে sign up (card লাগবে না)।
2. Console → **Create service** → **PostgreSQL**।
3. **Plan:** `Free` সিলেক্ট করুন (1 GB storage, 1 GB RAM, no expiry)।
4. **Region:** বাংলাদেশের জন্য **Singapore** (`ap-southeast-1`) সবচেয়ে কাছের; না পেলে **Mumbai** (`ap-south-1`)। Vercel-এর function region-ও পরে একই দিকে রাখবেন (ধাপ ৩)।
5. **Create service** → status **Running** হওয়া পর্যন্ত অপেক্ষা করুন (২–৫ মিনিট)।
6. সার্ভিসের **Overview → Connection information** → **Service URI** কপি করুন। দেখতে এমন:

   ```
   postgres://avnadmin:PASSWORD@pg-1a2b3c4d-myproject.aivencloud.com:12345/defaultdb?sslmode=require
   ```

   👉 এই পুরো string-টাই `DATABASE_URL`। হাতে বানাতে হবে না — কপি করলেই হবে।
   - Password-এ `@ : / # ?` থাকলে Aiven-এর দেওয়া URI-টাই ব্যবহার করুন (ওরা already encoded দেয়)। নিজে edit করলে URL-encode করতে হবে।
   - `?sslmode=require` শেষে থাকাটা জরুরি — না থাকলে যোগ করুন।

> **Connection limit:** Aiven Free-এ মোট **20 connections**। তাই Vercel-এ `PG_POOL_MAX=3` সেট করবেন (ধাপ ৩) — নাহলে একাধিক serverless instance একসাথে অনেক connection খুলে `too many connections` আসতে পারে।

---

## ২. (ঐচ্ছিক) DB টা আগে টেস্ট করে নিন

Aiven URI টা ঠিক আছে কি না, লোকাল থেকে এক লাইনে দেখে নিন (একই repo folder-এ):

```bash
# Linux/macOS
DATABASE_URL="postgres://avnadmin:...@....aivencloud.com:PORT/defaultdb?sslmode=require" \
  node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});c.connect().then(()=>c.query('select version()')).then(r=>{console.log(r.rows[0].version);return c.end()}).catch(e=>{console.error('FAIL:',e.message);process.exit(1)})"
```

```powershell
# Windows PowerShell
$env:DATABASE_URL = "postgres://avnadmin:...@....aivencloud.com:PORT/defaultdb?sslmode=require"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});c.connect().then(()=>c.query('select version()')).then(r=>{console.log(r.rows[0].version);return c.end()}).catch(e=>{console.error('FAIL:',e.message);process.exit(1)})"
```

`PostgreSQL ...` ভার্সন প্রিন্ট হলে DB ready। (Aiven-এর self-signed TLS chain এই app নিজেই handle করে — `aivencloud.com` host detect করে `rejectUnauthorized:false` করে, TLS তবুও চালু থাকে।)

চাইলে পুরো smoke suite-ও এই DB-তে চালাতে পারেন ( **fresh DB-তে করুন** — test invoice তৈরি হয়):

```bash
DATABASE_URL="postgres://..." PG_POOL_MAX=2 npm test
```

---

## ৩. Vercel-এ deploy (২–৩ মিনিট)

### ৩ক. Dashboard দিয়ে

1. https://vercel.com → **Continue with GitHub** → **Add New… → Project** → `FREE Payment Gateways` → **Import**।
2. **Framework Preset:** `Other` (repo-তে `vercel.json` + `api/index.js` আগেই আছে — build command লাগবে না)।
3. **Environment Variables** — নিচের টেবিলটা হুবহু বসান (Production + Preview দুটোতেই):

| Name | Value | কেন |
|---|---|---|
| `DATABASE_URL` | Aiven-এর **Service URI** (ধাপ ১.৬) | এটাই data persist করে; না দিলে app 503 দেবে (serverless-এ SQLite টেকে না) |
| `ADMIN_PASSWORD` | লম্বা random password (মিনিমাম ৮ অক্ষর) | প্রথম থেকেই default `12345678` বন্ধ থাকবে |
| `BASE_URL` | `https://PROJECTNAME.vercel.app` | checkout redirect, webhook, QR link — সব এই URL থেকে |
| `TRUST_PROXY` | `true` | Vercel reverse proxy-র পেছনে সঠিক client IP / HTTPS |
| `PG_POOL_MAX` | `3` | Aiven Free-এর ২০ connection সীমা respect করতে |

   - `PROJECTNAME` না জানলে প্রথমে placeholder দিন → deploy শেষে আসল URL দেখে env ঠিক করুন → **Redeploy** (env change নিজে থেকে পুরোনো deployment-এ যায় না)।
   - Environment scope: Production ✓, Preview ✓ (Development লাগবে না)।
4. **Deploy** চাপুন → ~১–২ মিনিট।
5. (ঐচ্ছিক, latency কমাতে) **Project → Settings → Functions → Function Region** → **Singapore (sin1)** — Aiven DB যেই region-এ, তার কাছাকাছি। বদলালে **Redeploy**।

### ৩খ. Vercel CLI দিয়ে (ঐচ্ছিক)

```bash
npm i -g vercel
vercel login
vercel link                       # repo folder-এ চালান
vercel env add DATABASE_URL production
vercel env add ADMIN_PASSWORD production
vercel env add BASE_URL production
vercel env add TRUST_PROXY production       # true
vercel env add PG_POOL_MAX production       # 3
vercel --prod
```

---

## ৪. যাচাই (deploy-এর পর ২ মিনিট)

1. **Health:** `https://PROJECTNAME.vercel.app/health`
   ```json
   {"ok":true,"name":"free-payment-gateways","version":"1.7.2"}
   ```
   `ok:true` না এলে → নিচের Troubleshooting দেখুন (সবচেয়ে সাধারণ কারণ: `DATABASE_URL` নেই বা redeploy করা হয়নি)।

2. **Admin login:** `https://PROJECTNAME.vercel.app/admin` → `ADMIN_PASSWORD` দিয়ে login → **Settings → Change admin password** (env-এ দেওয়া password-ই ব্যবহার করুন; DB-তে save করা password env-কে override করে)।

3. **API key:** `/admin → API Keys → Create API key` → key কপি করুন।

4. **নিজের checkout টেস্ট:**
   ```bash
   curl -X POST https://PROJECTNAME.vercel.app/api/v1/checkout \
     -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" \
     -d '{"amount": 10, "currency": "BDT", "description": "Vercel test",
          "success_url": "https://PROJECTNAME.vercel.app/"}'
   ```
   → `checkout_url` খুলুন → **Demo** দিয়ে pay → paid হলে DB write ঠিক আছে ✅

5. **Data persist চেক:** Vercel-এ **Redeploy** করুন → invoice টা `/admin → Invoices`-এ এখনো আছে কি না দেখুন। থাকলে Aiven ঠিকভাবে connect।

6. **Deployment Protection বন্ধ রাখুন** (Production domain-এ): Settings → Deployment Protection → Vercel Authentication **off**। নাহলে আপনার site-এ webhook POST (`/api/...`) 401 পাবে।

---

## ৫. WordPress / WooCommerce-এ বসানো (ঐচ্ছিক)

1. `wordpress/free-payment-gateways/` ফোল্ডারটা `wp-content/plugins/`-এ আপলোড → **Activate**।
2. **Settings → FPG Gateway** → **Gateway Base URL** = `https://PROJECTNAME.vercel.app`, **API Key** = ধাপ ৪.৩-এর key → **Save**।
3. **WooCommerce → Settings → Payments** → `FPG Bangla QR & MFS (Manual Verify)` enable → নিজের bKash/Nagad নম্বর, QR image URL বসান → Save।
4. চেকআউটে অর্ডার → customer TrxID দিয়ে submit → order **on-hold** → WP admin-এ order খুলে **Approve** → gateway-তে paid + webhook fire।

---

## ৬. আপডেট নেওয়া

- **Code update:** `git push origin main` → Vercel নিজেই নতুন deployment বানাবে (GitHub integration)।
- **Env update:** Vercel → **Deployments → latest → ⋯ → Redeploy** (env পুরোনো build-এ inject হয় না)।
- **Version check:** deploy শেষে `/health`-এ নতুন version দেখুন।

---

## ৭. লাইফটাইম ফ্রি — কী কী মনে রাখবেন

| বিষয় | বিস্তারিত |
|---|---|
| **DB সাইজ** | 1 GB — ছোট/মাঝারি দোকানের invoice, API key, settings-এর জন্য অনেক বছর চলে। বড় হলে [`MIGRATE-FREE-HOST.md`](MIGRATE-FREE-HOST.md)-এ CockroachDB (10 GB) option দেখুন। |
| **Connection** | 20 total → `PG_POOL_MAX=3` রাখুন; একসাথে অনেক Vercel instance হলে 2-ও দিতে পারেন। |
| **Backup** | Aiven console-এ service-এর **Backups** ট্যাব দেখে নিন — free plan-এ backup সীমিত/না-ও থাকতে পারে। নিয়মিত নিজে `pg_dump` নিন (নিচে)। |
| **Cold start** | Vercel function ~১ সেকেন্ডে warm হয়; প্রথম request একটু ধীর। Payment webhook-এ app নিজে retry করে, তাই miss হয় না। |
| **Hobby শর্ত** | ব্যক্তিগত/non-commercial। বাণিজ্যিক হলে Vercel Pro অথবা Oracle Always Free / Cloud Run। |
| **Sleep/power-off** | Vercel-এ server "sleep" নেই (serverless)। Aiven Free service সাধারণত always-on; console-এ "Powered off" দেখলে **Power on** করুন। |
| **Custom domain** | ঐচ্ছিক ও ফ্রি — Vercel → Settings → Domains → আপনার ডোমেইন যোগ করে DNS point করুন, তারপর `BASE_URL` বদলে **Redeploy**। |

**নিজে backup নেওয়া:**

```bash
# Linux/macOS (PostgreSQL client installed)
pg_dump "$DATABASE_URL" -Fc -f "fpg-backup-$(date +%F).dump"
```

```powershell
# Windows PowerShell
& pg_dump $env:DATABASE_URL -Fc -f "fpg-backup-$(Get-Date -Format yyyy-MM-dd).dump"
```

Restore: `pg_restore --clean --no-owner -d "$DATABASE_URL" fpg-backup-YYYY-MM-DD.dump`

---

## ৮. Troubleshooting

| উপসর্গ | কারণ | সমাধান |
|---|---|---|
| `503` + "needs a DATABASE_URL" | env সেট হয়নি বা deployment-এ inject হয়নি | Vercel → Settings → Environment Variables-এ `DATABASE_URL` (Production) → **Redeploy** |
| `FUNCTION_INVOCATION_FAILED` | env ভুল/DB unreachable, অথবা `DATABASE_URL` নেই | Vercel → Deployments → Functions logs দেখুন; `/health` টেস্ট করুন |
| `self-signed certificate in certificate chain` | TLS chain verify fail | host `*.aivencloud.com` হলে app নিজেই fix করে; নাহলে URI-তে `?sslmode=require` যোগ করুন |
| `password authentication failed` | password ভুল / URL-encode হয়নি | Aiven console থেকে **Service URI** আবার কপি করুন (হাতে edit করবেন না); দরকারে **Reset password** |
| `too many connections for role` | একাধিক function instance + বড় pool | `PG_POOL_MAX=2` বা `3` → **Redeploy**; Aiven console থেকে service **Restart** |
| `ENOTFOUND` / timeout | Aiven service powered off / region ভুল / IP allowlist | Console-এ **Power on**; **Allowed IP addresses** খালি বা `0.0.0.0/0` (Vercel-এর IP fixed নয়) |
| Payment-এর পর `localhost`-এ redirect | `BASE_URL` ভুল | `BASE_URL=https://PROJECTNAME.vercel.app` → **Redeploy** |
| `/admin`-এ default password কাজ করছে | `ADMIN_PASSWORD` সেট হয়নি | env সেট → Redeploy; অথবা login করে Settings থেকে বদলান |
| Redeploy-এর পর data নেই | `DATABASE_URL` কোনো এক environment scope-এ নেই | Production + Preview দুটোতেই দিন → Redeploy |
| Webhook 401 / HTML login page | Deployment Protection চালু | Production-এ Vercel Authentication **off** করুন |
| Function timeout (504) | ১০s Hobby limit; DB প্রথম connect ধীর | আবার চেষ্টা করুন; Aiven service `Running` কিনা দেখুন; region কাছাকাছি রাখুন |

---

## ৯. এক নজরে চেকলিস্ট

- [ ] Aiven Free PostgreSQL তৈরি, region Singapore/Mumbai, status **Running**
- [ ] Service URI কপি (`...?sslmode=require`)
- [ ] Vercel project import
- [ ] env: `DATABASE_URL`, `ADMIN_PASSWORD`, `BASE_URL`, `TRUST_PROXY=true`, `PG_POOL_MAX=3`
- [ ] Deploy → `/health` = `{"ok":true,...}`
- [ ] `/admin` login → password বদল
- [ ] API key তৈরি → demo checkout paid
- [ ] Redeploy করে data persist যাচাই
- [ ] Deployment Protection off (webhook-এর জন্য)
- [ ] (ঐচ্ছিক) WordPress plugin-এ Base URL + API key
- [ ] backup routine (pg_dump) ঠিক করা
