# Vercel + Turso / Supabase — ফ্রি, permanent ডেটাবেসে গেটওয়ে ডিপ্লয়

> **কেন এই ডক:** Vercel-এর serverless filesystem **ephemeral** — ফাইল লেখা থাকলেও পরের
> request-এ সেটা আর নেই। তাই `/admin` ড্যাশবোর্ড + API + hosted checkout চালাতে হলে
> **বাইরের ডেটাবেস বাধ্যতামূলক**। এখানে দুইটা ফ্রি পথ:
>
> | পথ | কী লাগবে | সুবিধা | সীমা |
> |---|---|---|---|
> | **A. Turso (সুপারিশকৃত)** | `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` | SQLite-ই থাকে → লোকাল `data/fpg.db`-এর সাথে হুবহু এক schema; HTTP-only, TCP/pool সীমা নেই; cold start কম | Free: ৯ GB মোট, ৫০০ DB |
> | **B. Supabase Postgres (pooler)** | `DATABASE_URL` | একই প্রজেক্টে SPA-র Auth/RLS-ও চলে | Free: ০.৫ GB, ৭ দিন নিষ্ক্রিয় থাকলে pause |
>
> দুটোই **$0**, কার্ড ছাড়া। দুইটা একসাথে দিলে **`DATABASE_URL` (Postgres) জেতে** —
> `libsql://` না থাকলে Turso বন্ধ থাকে।

---

## ১. Turso ডেটাবেস তৈরি (৫ মিনিট)

### Dashboard দিয়ে (CLI ছাড়া)

1. https://turso.tech → **Sign in with GitHub** → **Create Database**।
2. নাম দিন (যেমন `fpg`), region: **Singapore / Mumbai** (বাংলাদেশের কাছে)।
3. ডেটাবেস খুলে **URL** কপি করুন — দেখতে এমন:
   `libsql://fpg-yourname.turso.io` (`turso://…` দেখালেও চলবে, অ্যাপ নিজেই normalize করে)।
4. **Create Token** → টোকেন কপি করুন (`eyJhbGciOi…`)। টোকেন একবারই পুরোপুরি দেখা যায়।

### CLI দিয়ে

```bash
# macOS/Linux
curl -sSfL https://get.tur.so/install.sh | bash

turso auth signup                 # বা: turso auth login
turso db create fpg --location sin
turso db show fpg --url           # → libsql://fpg-....turso.io
turso db tokens create fpg        # → token (একবারই দেখাবে)
```

> **টোকেন ছাড়া remote Turso কাজ করে না** — অ্যাপ boot-এই পরিষ্কার error দেয়
> (`Turso auth token is missing — set TURSO_AUTH_TOKEN`), পরে রহস্যময় 401 নয়।

### লোকাল SQLite → Turso (ডেটা নিয়ে যাওয়া)

```bash
sqlite3 data/fpg.db .dump > fpg-dump.sql
turso db shell fpg < fpg-dump.sql
```

`settings` টেবিলেও সব (admin password hash, provider নম্বর, API key hash) চলে যাবে —
তাই dump ফাইলটা কোথাও commit/শেয়ার করবেন না।

---

## ২. Supabase Postgres (বিকল্প B)

1. https://supabase.com → **New project** → region **Singapore**।
2. **Project Settings → Database → Connection string → URI** → **Transaction pooler**
   (port **6543**) কপি করুন — Vercel/serverless-এর জন্য এটাই সঠিক:
   ```
   postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
3. `DATABASE_URL`-এ বসান। `?sslmode=require` যোগ করলেও অ্যাপ নিজেই সেটা strip করে
   নিজের TLS নীতি প্রয়োগ করে — Supabase-এর chain **self-signed**, তাই ডিফল্টে
   **এনক্রিপ্টেড কিন্তু chain-verify করা হয় না**। সম্পূর্ণ verification চাইলে
   Supabase → Settings → Database → **SSL Configuration → Download certificate** থেকে
   CA নামিয়ে `DATABASE_CA_CERT_FILE=./supabase-ca.crt` দিন।
4. ⚠️ **Direct connection** (`db.PROJECT_REF.supabase.co:5432`) Vercel-এ ব্যবহার করবেন না:
   সেটা IPv6-only (Vercel-এ IPv6 নেই) এবং self-signed CA। Pooler ব্যবহার করুন।
5. ⚠️ **SPA-র Supabase প্রজেক্টেই গেটওয়ে চালাবেন না** — ওই `public` schema-তে
   `invoices`, `api_keys`, `settings`, `payment_links`, `devices` টেবিল আগেই আছে
   (ভিন্ন কলাম)। গেটওয়ে তাদের `CREATE TABLE IF NOT EXISTS`-এ ধরে নেবে → দুই দিকই ভাঙবে।
   গেটওয়ের জন্য **আলাদা Supabase প্রজেক্ট** (ফ্রি) অথবা **Turso** ব্যবহার করুন।

> **একই Supabase প্রজেক্টে SPA-ও চালাতে চান?** ওটা আলাদা জিনিস — SPA-র Auth/PostgREST/RLS
> `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` দিয়ে চলে, আর সেটআপ
> [`DEPLOY-VERCEL.md`](DEPLOY-VERCEL.md)-এ আছে। এখানকার `DATABASE_URL` শুধু
> Node গেটওয়ের (`/admin`, `/api/v1`, `/pay/:id`) ডেটা।

---

## ৩. Vercel-এ ডিপ্লয়

1. https://vercel.com → **Add New → Project** → `iamtanzir/FREE-Payment-Gateways` import করুন।
2. Framework preset: যাই থাকুক — `vercel.json` নিজেই সব ঠিক করে: `framework: null`
   (auto-detect বন্ধ), `buildCommand` = `npm run build:app && node scripts/vercel-build.js`,
   `outputDirectory: ".vercel-static"` (বিল্ড শেষে একটা `build.json` ফাইল বানিয়ে দেয় —
   gateway-র কোনো static output নেই, তাই ফাঁকা directory-র চাইতে বাস্তবতা অনুযায়ী),
   `includeFiles: "public/**"`, `api/index.js`-এ catch-all rewrite, daily webhook cron।
   এতে Vite preset-এর "No Output Directory named `dist` found" / "The Output Directory
   `dist` is empty" — কোনোটাই আর হয় না, আর `public/index.html` catch-all rewrite-কে
   shadow করতে পারে না (যা `/`-কে ভুল static পৃষ্ঠা দেখাত)।
   সব request শেষ পর্যন্ত `api/index.js` function-এ যায়, যেটা landing page + login +
   checkout নিজেই serve করে।
3. **Settings → Environment Variables** (Production **এবং** Preview — দুটোতেই):

   | Name | Value | আবশ্যক? |
   |---|---|---|
   | `TURSO_DATABASE_URL` | `libsql://fpg-yourname.turso.io` | হ্যাঁ (পথ A) |
   | `TURSO_AUTH_TOKEN` | Turso token | হ্যাঁ (পথ A) |
   | `DATABASE_URL` | Supabase/Neon pooler URI | হ্যাঁ (পথ B) |
   | `ADMIN_PASSWORD` | শক্ত পাসওয়ার্ড (default `12345678` এড়াতে) | সুপারিশকৃত |
   | `BASE_URL` | `https://your-project.vercel.app` | সুপারিশকৃত |
   | `CRON_SECRET` | random string (`openssl rand -hex 24`) | ঐচ্ছিক |
   | `LANDING_PAGE` | `0` দিলে `/` সরাসরি `/admin`-এ redirect করবে | ঐচ্ছিক |
   | `SPA_ENABLED` | `1` (শুধু SPA চাইলে) | ঐচ্ছিক |
   | `TRUST_PROXY` | `true` | ঐচ্ছিক |

   > `BASE_URL` না দিলেও অ্যাপ Vercel-এর `VERCEL_PROJECT_PRODUCTION_URL` থেকে নিজেই
   > ঠিক URL বের করে — কিন্তু custom domain থাকলে অবশ্যই `BASE_URL` সেট করুন, নাহলে
   > checkout/webhook URL ভুল ডোমেইনে যাবে।

4. **Deploy** → `https://your-project.vercel.app/health` খুলুন। প্রত্যাশিত:
   ```json
   {"ok":true,"name":"free-payment-gateways","version":"1.13.0","app":"admin-only","db":"turso"}
   ```
   `"db":"turso"` (বা `"postgres"`) মানে বাইরের ডেটাবেস ঠিকঠাক লাগছে। `"db":"sqlite"`
   মানে env var গুলো ওই environment-এ নেই — Vercel-এ Production/Preview আলাদা, আবার deploy করুন।

5. `/` → পাবলিক landing page → **"Merchant login"** → `/admin/login` → default `12345678`
   (বা `ADMIN_PASSWORD`) দিয়ে login → **Settings**-এ নিজের নম্বর, Bangla QR, নতুন পাসওয়ার্ড সেট করুন।
   > শুধু মার্চেন্ট প্যানেল চাইলে `LANDING_PAGE=0` দিলে `/` সরাসরি `/admin`-এ redirect করবে।

   > **"Sign in"-এ ব্ল্যাক `{"error":"Not found"}` দেখালে** — Vercel-এর edge non-GET
   > request-এর `302` redirect-কে `307` করে দেয়, তাই ব্রাউজার login form আরেকবার
   > **POST** দিয়ে `/admin`-এ ফেরত যায় → route নেই → 404 JSON। v1.13.0-এ সব POST
   > redirect **`303 See Other`** করা হয়েছে (যাতে follow-up request `GET` হয়)।
   > পুরোনো deploy (307-এ 302) থাকলে hard refresh করুন (`Ctrl/Cmd+Shift+R`) বা আবার
   > deploy করুন — নাহলে login black screen থেকে যাবে।

   > **Browser-এ JSON 404 page (কালো স্ক্রিন) দেখাবেন না** — v1.13.0 থেকে ব্রাউজারদের
   > `Accept: */*` থাকলেও HTML 404 page দেখানো হয়; JSON শুধু
   > `Accept: application/json` হলে (অথবা `/api/v1` থেকে) দেওয়া হয়।

### Schema/migration

প্রথম request-এই `CREATE TABLE IF NOT EXISTS …` চলে (Turso হলে এক batch-এ)।
আলাদা migration কমান্ড লাগে না। পুরোনো `device_id` কলাম, `BIGINT` widening ইত্যাদি
`migrate()` নিজেই idempotent ভাবে করে।

### Webhook retry (Vercel-এ cron)

Vercel Hobby-তে cron **দিনে একবার** চলে — `vercel.json`-এ `/cron/webhook-sweep`
`17 3 * * *` (UTC) সেট করা আছে। তাছাড়া `/admin`-এ ঢুকলেই (মিনিটে সর্বোচ্চ একবার)
pending delivery গুলো sweep হয়, তাই সাধারণ ব্যবহারে webhook আটকে থাকে না।
`CRON_SECRET` সেট করলে cron endpoint শুধু `Authorization: Bearer <secret>` (বা
`?secret=`) নেয়।

---

## ৪. যাচাই (২ মিনিট)

```bash
BASE=https://your-project.vercel.app

curl -s $BASE/health
# → {"ok":true,...,"db":"turso"}

# API key তৈরি করে checkout বানান (dashboard → API Keys)
curl -s -X POST $BASE/api/v1/checkout \
  -H "Authorization: Bearer sk_live_..." -H "Content-Type: application/json" \
  -d '{"amount":10,"currency":"BDT","description":"vercel test"}'
# → {"id":"inv_...","checkout_url":"https://your-project.vercel.app/pay/inv_..."}

curl -s -o /dev/null -w "%{http_code}\n" $BASE/pay/inv_...   # → 200
```

তারপর সার্ভার রিস্টার্ট/redeploy করে invoice-টা আবার দেখুন — **থাকলে ডেটাবেস persistent**।

### GitHub Actions দিয়ে অটো-ডিপ্লয় (ঐচ্ছিক)

CLI/Terminal ছাড়াই ডিপ্লয় করতে `.github/workflows/deploy-vercel.yml` রেডি আছে। শুধু
GitHub → repo → **Settings → Secrets and variables → Actions**-এ ৩টা secret যোগ করুন:

| Secret | কোথায় পাবেন |
|---|---|
| `VERCEL_TOKEN` | https://vercel.com/account/tokens → **Create** |
| `VERCEL_ORG_ID` | লোকালি `vercel link` করার পর `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | একই ফাইলের `projectId` |

এরপর `main`-এ push করলে (অথবা **Actions → Deploy to Vercel → Run workflow**) Production-এ
ডিপ্লয় হবে। Secret না থাকলে workflow চুপচাপ skip করে — কোনো fork/clone-এর CI ভাঙবে না।

> ডেটাবেস credential (`TURSO_AUTH_TOKEN` / `DATABASE_URL`) GitHub-এ রাখবেন না —
> **Vercel-এর Environment Variables**-এ রাখুন; workflow `vercel pull` দিয়ে সেগুলো নিজেই নেয়।

CLI পছন্দ হলে: `npx vercel --prod` (প্রথমবার `npx vercel link` দিয়ে প্রজেক্ট লিংক করুন)।

---

## ৫. Troubleshooting

| উপসর্গ | কারণ | সমাধান |
|---|---|---|
| `503` + "needs an external database" | কোনো DB env var ওই deployment-এ নেই | Vercel → Settings → Environment Variables → Production **ও** Preview দুটোতেই → Redeploy |
| `/health`-এ `"db":"sqlite"` | উপরের মতোই, কিন্তু env var ভুল environment-এ | Preview deployment-এ Production var থাকে না — দুটোতেই যোগ করুন |
| `Turso auth token is missing` | `TURSO_DATABASE_URL` আছে, টোকেন নেই | `turso db tokens create <db>` → `TURSO_AUTH_TOKEN` |
| `401 Unauthorized` (Turso) | টোকেন revoke/expired, বা অন্য DB-র টোকেন | নতুন token তৈরি করে env update + redeploy |
| `LibsqlError: … 404` / `DB_NOT_FOUND` | URL ভুল/ডিলিট হয়েছে | `turso db show <db> --url` আবার কপি করুন |
| `self-signed certificate` (Postgres) | Direct Supabase/Aiven URI, CA ছাড়া | Supabase **pooler** (6543) ব্যবহার করুন; Aiven হলে `DATABASE_CA_CERT_FILE` |
| `too many connections` (Postgres) | serverless instance অনেক | `PG_POOL_MAX=3` (Supabase pooler হলে সাধারণত লাগে না) |
| deploy-এর পরও পুরোনো ডেটা | env var যোগ করার আগের deployment চলছে | **Redeploy** (env build-time নয়, runtime — তবু নতুন instance দরকার) |
| Cron 401 | `CRON_SECRET` সেট, কিন্তু Vercel cron header পাঠায় না | Vercel Cron নিজেই `Authorization: Bearer $CRON_SECRET` পাঠায়; ম্যানুয়াল কলেও ওই header দিন |

---

## ৬. খরচ ও সীমা (সৎ হিসাব)

| সেবা | Free tier | কোথায় আটকাবে |
|---|---|---|
| Vercel Hobby | ১০০ GB bandwidth/মাস, fair-use **non-commercial** | বাণিজ্যিক হলে Pro, নয়তো Cloudflare/Netlify/নিজের VPS |
| Turso Free | ৯ GB storage, ৫০০ DB, ১ বিলিয়ন row read/মাস | বড় হলে paid plan বা Postgres-এ যান |
| Supabase Free | ০.৫ GB DB, ৭ দিন নিষ্ক্রিয় থাকলে pause | pause হলে dashboard থেকে restore; SPA-র জন্য keep-alive workflow আছে |
| Vercel function | ৩০ সেকেন্ড/request, ১ GB RAM | webhook fan-out বড় হলে নিজের VPS ভালো |

> **সব ফ্রি, কিন্তু "কোনো সীমা নেই" নয়।** ট্রাফিক বাড়লে self-host (Oracle Always Free /
> নিজের VPS) সবচেয়ে সস্তা — [`DEPLOY-ANYWHERE.md`](DEPLOY-ANYWHERE.md)।
