# ডাটাবেস গাইড — SQLite · Turso · Supabase Postgres · Neon · Aiven · CockroachDB

এই রিপোতে **দুটো আলাদা সিস্টেম** আছে, আর তাদের ডাটাবেস-সাপোর্ট আলাদা। সঠিক তথ্যটাই নিচে:

| সিস্টেম | Turso/libSQL | Supabase Postgres | Neon | Aiven Free | CockroachDB | SQLite |
|---|---|---|---|---|---|---|
| Node gateway (`/admin`, `/api`, hosted checkout) | ✅ `TURSO_DATABASE_URL` | ✅ `DATABASE_URL` | ✅ `DATABASE_URL` | ✅ `DATABASE_URL` | ✅ `DATABASE_URL` | ✅ ডিফল্ট |
| Merchant SPA dashboard (`src/dashboard/`) | ❌ | ✅ **প্রাইমারি** | ❌ ব্যাকআপ মিরর | ❌ ব্যাকআপ মিরর | ❌ | ❌ |

কারণ: FREE Payment Gateways শুধু Postgres নয় — Supabase-এর Auth, PostgREST, RLS আর 16টা Edge Function-এর ওপর দাঁড়ানো। তাই `DATABASE_URL` Neon/Aiven-এ দিলে লগইনসহ সব ভাঙবে। কিন্তু Node গেটওয়ে বিশুদ্ধ `pg` + libSQL দিয়ে লেখা — সে যেকোনো Postgres-এ বা Turso-তে চলে।

> ⚠️ একই Supabase প্রজেক্টের `public` schema-তে গেটওয়ে চালাবেন না: SPA-র `invoices`, `api_keys`, `settings`, `payment_links`, `devices` টেবিলের সাথে নাম-সংঘর্ষ হবে। গেটওয়ের জন্য আলাদা প্রজেক্ট বা Turso।

---

## ১. Node gateway — পাঁচটা অপশন, কোনো কোড বদলানো লাগে না

শুধু `.env`-এ `TURSO_DATABASE_URL` (Turso) বা `DATABASE_URL` (Postgres) সেট করলেই SQLite → সেই ডেটাবেস হয়ে যায়। নিচের কোনোটাই কার্ড লাগে না।
দুটোই দিলে `DATABASE_URL` জেতে।

### ১ক. SQLite (ডিফল্ট, $0, এক সেকেন্ড)
কিছুই সেট করার দরকার নেই। `npm install && npm start` — শেষ। ডেটা `./data/fpg.db`-এ থাকে।
(serverless/Vercel-এ এটি ব্যবহার করবেন না — ফাইল পরের request-এ থাকে না।)

### ১ক-২. Turso / libSQL (**সুপারিশকৃত** — Vercel/serverless, $0)
HTTP-এর ওপর SQLite — persistent disk, TCP socket বা connection pool লাগে না, আর লোকাল
SQLite-এর সাথে হুবহু এক schema।
1. https://turso.tech → GitHub দিয়ে sign in → **Create database** (region: Singapore)
2. URL কপি করুন (`libsql://fpg-xxxx.turso.io`) এবং **Create token**
3. `.env` (বা Vercel → Environment Variables):
   ```
   TURSO_DATABASE_URL=libsql://fpg-xxxx.turso.io
   TURSO_AUTH_TOKEN=eyJhbGciOi...
   ```
4. `npm start` → `/health`-এ `"db":"turso"` দেখুন।
5. পুরোনো ডেটা নিতে: `sqlite3 data/fpg.db .dump > dump.sql` → `turso db shell fpg < dump.sql`

বিস্তারিত (Vercel deploy, যাচাই, troubleshooting): [`VERCEL-TURSO.md`](VERCEL-TURSO.md)।

### ১খ. Aiven Free (1 GB, **চিরকাল ফ্রি**, কোনো কার্ড নেই)
1. https://console.aiven.io → GitHub দিয়ে sign up → **Create service → PostgreSQL → Free** → Region: Singapore (বাংলাদেশের কাছাকাছি)
2. Service → **Overview → Connection information → Service URI** কপি করুন (`postgresql://avnadmin:PASSWORD@pg-xxxx.aivencloud.com:PORT/defaultdb`)
3. **Aiven-এ TLS বাধ্যতামূলক, এবং সার্টিফিকেট-চেইন self-signed** — এনক্রিপশন সবসময়ের জন্য ঠিক, কিন্তু যাচাইয়ের জন্য CA লাগবে:
   - Service → Overview → **"CA Certificate"** → কপি → `aiven-ca.pem` ফাইল হিসেবে সেভ করুন
4. `.env`:
   ```
   DATABASE_URL=postgresql://avnadmin:PASSWORD@pg-xxxx.aivencloud.com:PORT/defaultdb?sslmode=require
   DATABASE_CA_CERT_FILE=./aiven-ca.pem
   PG_POOL_MAX=3
   ```
5. `npm run db:doctor` — কানেকশন টেস্ট হবে
6. ⚠️ **Aiven Free-এ কোনো স্বয়ংক্রিয় ব্যাকআপ নেই** — `pg_dump` দিয়ে নিয়মিত ডাম্প রাখুন (নিচে §৫)।

### ১গ. Neon (0.5 GB, ফ্রি tier; ৫ মিনিট নিষ্ক্রিয় থাকলে suspend, প্রথম রিকোয়েস্টে ~১ সেকেন্ড cold start)
1. https://neon.tech → GitHub sign up → **Create project** → Region: AWS Singapore
2. Dashboard → **Connection string** → **Pooled connection** (serverless/edge-এর জন্য) বা **Direct connection** (Node server-এর জন্য)
3. `.env`:
   ```
   DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   PG_POOL_MAX=3
   ```
   Neon-এর সার্টিফিকেট system CA দিয়ে যাচাই হয় — আলাদা CA লাগবে না।

### ১ঘ. Supabase Postgres (0.5 GB — Vercel/serverless-এ **pooler** ব্যবহার করুন)
1. Supabase project → **Settings → Database → Connection string → URI** → **Transaction pooler** (port 6543)
2. `.env`:
   ```
   DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
   (Direct connection `db.PROJECT_REF.supabase.co:5432` IPv6-only এবং নিজের CA লাগে — Vercel-এ চলে না।)

### ১ঙ. CockroachDB Serverless (10 GB)
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full&options=-csearch_path%3Dpublic
```

---

## ২. TLS কীভাবে কাজ করে (src/pg-config.js)

| অবস্থা | যা হবে | নিরাপত্তা |
|---|---|---|
| `DATABASE_CA_CERT` / `DATABASE_CA_CERT_FILE` সেট | আপনার CA দিয়ে সার্ভার যাচাই | ✅ সম্পূর্ণ |
| `sslmode=verify-ca`/`verify-full` | system CA দিয়ে যাচাই | ✅ সম্পূর্ণ |
| host `neon.tech` / `cockroachdb.com` | system CA দিয়ে যাচাই | ✅ সম্পূর্ণ |
| host `*.supabase.co` / `*.pooler.supabase.com` | এনক্রিপ্ট, chain যাচাই নয় (**self-signed chain**) | ⚠️ `DATABASE_CA_CERT_FILE` সেট করলে সম্পূর্ণ |
| `sslmode=require` / host `*.aivencloud.com` | এনক্রিপ্ট, যাচাই নয় | ⚠️ মাঝারি — `DATABASE_CA_CERT_FILE` সেট করুন |
| কিছুই নয় | plain TCP | শুধু localhost-এর জন্য |

Cloud deploy-এ **সবসময়** TLS লাগে — Aiven/Neon/Supabase কোনোটাই PLAIN connection নেয় না।
`npm run db:doctor` আপনার কানেকশনের policy দেখিয়ে দেয়।

---

## ৩. `npm run db:doctor` — কানেকশন টেস্ট

```
[db-doctor] provider : Aiven Free
[db-doctor] host     : pg-12345.aivencloud.com
[db-doctor] note     : 1 GB, always free, 20 connections; self-signed CA → set DATABASE_CA_CERT
[db-doctor] tls      : strict — server verified against YOUR CA (best)
[db-doctor] pool     : max=3 idle=10000ms (Aiven/Neon free: PG_POOL_MAX=3 recommended)
[db-doctor] connect  : OK in 212 ms — db=defaultdb role=avnadmin
[db-doctor] RESULT   : this DATABASE_URL works for FREE Payment Gateways ✓
```

| সমস্যা | কারণ | সমাধান |
|---|---|---|
| `self-signed certificate in certificate chain` | Aiven-এর CA যাচাই হয়নি | `DATABASE_CA_CERT_FILE=./aiven-ca.pem` |
| `password authentication failed` | ভুল পাসওয়ার্ড | console থেকে নতুন URI কপি করুন |
| `ECONNREFUSED` | ভুল host/port বা service paused | host/port ঠিক আছে কিনা দেখুন |
| `database "x" does not exist` | ভুল DB নাম | Aiven-এ `defaultdb` ব্যবহার করুন |
| `SSL connection required` | TLS ছাড়া কানেক্ট করার চেষ্টা | `?sslmode=require` যোগ করুন |
| ২০ connection পূর্ণ | `PG_POOL_MAX` বেশি | `PG_POOL_MAX=3` |

---

## ৪. Aiven Free-এ Vercel deploy (step-by-step)
[`docs/VERCEL-AIVEN.md`](VERCEL-AIVEN.md) — Vercel + Aiven হাতে-কলমে (Bangla)।

---

## ৫. ব্যাকআপ (সব provider-এ)

Aiven Free-তে ব্যাকআপ নেই, Neon-এ ~৬ ঘণ্টা history, Supabase Free-তে ৭ দিনে pause। যে providerই হোক:

```bash
# Aiven (CA সহ)
pg_dump "postgresql://avnadmin:PASS@pg-xxxx.aivencloud.com:PORT/defaultdb?sslmode=require" \
  --no-owner --format=c -f backup-$(date +%F).dump

# Neon / Supabase
pg_dump "postgresql://USER:PASSWORD@ep-xxxx.neon.tech/neondb?sslmode=require" \
  --no-owner --format=c -f backup-$(date +%F).dump

# restore
pg_restore --no-owner -d "NEW_DATABASE_URL" backup-2026-11-17.dump
```

Windows-এ `pg_dump` না থাকলে PostgreSQL ইনস্টল করলে client tools-ই থাকে (অথবা Docker: `docker run --rm -v $PWD:/b postgres:17 pg_dump ...`)।

---

## ৬. FREE Payment Gateways ড্যাশবোর্ডের জন্য কী আছে

- **প্রাইমারি ডাটাবেস = শুধু Supabase** (Auth + PostgREST + RLS + ১৬টি Edge Function + মিররড সিকিওরিটি)। `docs/DEPLOY-VERCEL.md` দেখুন।
- Neon/Aiven-কে **অফসাইট ব্যাকআপ মিরর** হিসেবে ব্যবহার করা যায় (schema যাই হোক, JSONB কপি, সবসময় সচল):
  ```bash
  export SUPABASE_URL="https://PROJECT_REF.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="...service role..."
  export DATABASE_URL="postgresql://...?sslmode=require"   # Aiven বা Neon — দুটোই চলে
  npm run mirror:dry
  npm run mirror
  ```
- `supabase db push`-স্টাইল migration শুধু Supabase-এ কাজ করে (`auth` schema প্রয়োজন)।

---

## ৭. টেস্ট

```bash
npm run test:db       # pg-config unit tests (20টি) — TLS পলিসি
npm run test:all      # pg-config + smoke + plugin smoke
```
