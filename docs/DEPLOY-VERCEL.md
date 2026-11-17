# FREE Payment Gateways — Vercel + ফ্রি ডেটাবেসে ডিপ্লয় (মার্চেন্ট ড্যাশবোর্ড)

> **কী কী ফ্রি:** Vercel Hobby (SPA হোস্টিং + HTTPS) · Supabase Free (Postgres + Auth + RLS + Edge Functions) · PipraPay (self-hosted, AGPL-3.0) — সব মিলিয়ে **$0/মাস**, কার্ড ছাড়া।
>
> ⚠️ **Aiven দিয়ে সরাসরি চালানো যাবে না — কেন, আর কী কী বিকল্প আছে, সেটা §৮-এ বিস্তারিত।** FREE Payment Gateways-এর ডেটা-লেয়ার শুধু Postgres নয়: Supabase Auth + Row-Level Security + 16টা Edge Function + PostgREST — এগুলো Supabase-এর নিজস্ব স্ট্যাক। শুধু `DATABASE_URL` বদলে Aiven বসালে ড্যাশবোর্ড লগইন/ডেটা কিছুই কাজ করবে না। (Aiven-কে **অফসাইট ব্যাকআপ** হিসেবে ব্যবহার করা যায় — §৮, অপশন D।)

---

## ০. আর্কিটেকচার

```
ব্রাউজার → Vercel (Vite SPA, dist/)  →  Supabase (Auth + PostgREST + RLS + Edge Functions)  →  Postgres
                                                    ↑
                              PipraPay Companion App (Android) ── SMS webhook ──┘
```

| অংশ | কোথায় | খরচ |
|---|---|---|
| মার্চেন্ট ড্যাশবোর্ড (React SPA) | Vercel Hobby | $0 |
| DB + Auth + API + Functions | Supabase Free | $0 (৭ দিন নিষ্ক্রিয় থাকলে pause — §৭) |
| MFS SMS অটো-ভেরিফাই | নিজের Android + PipraPay অ্যাপ | $0 |
| পেমেন্ট গেটওয়ে | PiPRA Pay (নিজের অ্যাকাউন্ট) | গেটওয়ে-নির্ভর |

---

## ১. Supabase প্রজেক্ট তৈরি (৫ মিনিট)

1. https://supabase.com → GitHub দিয়ে sign in → **New project**।
2. **Region:** Singapore (`ap-southeast-1`) — বাংলাদেশের জন্য সবচেয়ে কাছের।
3. **Database password:** শক্ত পাসওয়ার্ড (কোনো জায়গায় লিখে রাখুন)।
4. তৈরি হলে **Project Settings → API** থেকে কপি করুন:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon` / **publishable** key → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `Project ref` → `VITE_SUPABASE_PROJECT_ID`

> `service_role` key **কখনো** ফ্রন্টএন্ডে বা Git-এ রাখবেন না — শুধু Edge Function secret হিসেবে যাবে।

---

## ২. ডেটাবেস রেডি — CLI ছাড়াই (সবচেয়ে সহজ, ৩ কমান্ড)

`supabase login`/CLI লাগবে না — শুধু Supabase Dashboard থেকে ৩টা মান কপি করে একটা কমান্ড চালান:

```bash
npm install
npm run setup
```

স্ক্রিপ্ট জিজ্ঞেস করবে:

| প্রশ্ন | কোথায় পাবেন |
|---|---|
| Project URL | **Settings → API** → `https://xxxx.supabase.co` |
| anon / publishable key | **Settings → API** → `anon` `public` |
| Database connection string | **Settings → Database** → *Connection string* → **URI** (পাসওয়ার্ড বসিয়ে দিন) |

তারপর স্ক্রিপ্ট নিজেই `.env` লিখবে, ৪৪টা migration ক্রমে apply করবে (`_applied_migrations` টেবিলে মনে রাখে, তাই আবার চালালে শুধু নতুনগুলোই লাগে), আর শেষে `npm run dev` বলবে।

- শুধু কানেকশন টেস্ট: `npm run setup -- --check`
- শুধু `.env` লিখতে: `npm run setup -- --env-only`
- ⚠️ `service_role` key কখনো `.env`-এ দেবেন না — স্ক্রিপ্ট নিজেই আটকে দেবে।

## ২ক. ডেটাবেস + Edge Functions — Supabase CLI দিয়ে (বিকল্প)

```bash
npm i -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push          # supabase/migrations/ সব apply হবে
supabase functions deploy # সব edge function deploy হবে
```

- `supabase/config.toml`-এ `verify_jwt = false` শুধু ওই ৪টার জন্য যেগুলো বাইরের সিস্টেম (PipraPay companion, email hook, webhook) কল করে — বাকি সব JWT লাগে।
- দরকারি secret:
  ```bash
  supabase secrets set RESEND_API_KEY=re_...   # email helper (Resend free tier)
  supabase secrets set AUTH_HOOK_SECRET=whsec_...   # Supabase Auth Hook secret (auth-email-hook)
  supabase secrets list
  ```
- **API key hardening migration** (`20261117090000_api_key_security.sql`) এখানেই apply হবে — পুরোনো key-গুলো `sha256:`-এ convert হয়, আর `key_hash` কলাম আর কোনো client পড়তে পারে না।

লোকাল টেস্ট:

```bash
supabase start
supabase db reset      # সব migration fresh DB-তে
npm run dev
```

---

## ৩. Vercel-এ ড্যাশবোর্ড ডিপ্লয়

### ৩ক. Dashboard দিয়ে

1. https://vercel.com → **Add New → Project** → এই repo import।
2. **Framework Preset:** `Vite` (repo-তে `vercel.json` আছে — build/output/SPA rewrite/headers সব সেট)।
3. **Environment Variables** (Production + Preview):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://PROJECT_REF.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `VITE_SUPABASE_PROJECT_ID` | `PROJECT_REF` |

4. **Deploy** → `https://PROJECTNAME.vercel.app`।

> Vite-এর env build-time-এ inject হয় — env বদলালে **Redeploy** করতে হবে।

### ৩খ. CLI দিয়ে

```bash
npm i -g vercel
vercel login
vercel link
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
vercel env add VITE_SUPABASE_PROJECT_ID production
vercel --prod
```

---

## ৪. Auth URL ঠিক করা (নাহলে login/redirect fail করবে)

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://PROJECTNAME.vercel.app`
- **Redirect URLs:** যোগ করুন
  - `https://PROJECTNAME.vercel.app/**`
  - `http://localhost:8080/**` (লোকাল ডেভেলপমেন্ট)
  - কাস্টম ডোমেইন থাকলে `https://yourdomain.com/**`

তারপর **Authentication → Providers → Email**-এ confirm email চালু/বন্ধ আপনার পছন্দমতো করুন। MFA (TOTP) ড্যাশবোর্ডের `MfaSetup` কম্পোনেন্ট দিয়েই কাজ করে — Supabase Auth-এ Multi-Factor চালু রাখুন।

---

## ৫. PipraPay সেলফ-হোস্ট + MFS অটো-ভেরিফাই (ফ্রি)

[PipraPay](https://github.com/PipraPay/PipraPay) — AGPL-3.0, Laravel 12, plugin-based payment automation। (রিপো এখন read-only/archived, কিন্তু self-host করার জন্য কোড পুরোটাই পাওয়া যায়।)

1. আরামদায়ক জায়গায় (Oracle Cloud Always Free VPS / নিজের PC / Docker host) PipraPay ডিপ্লয় করুন — README-র *Getting started* লিংক + Docker compose।
2. PipraPay-এর **Companion App** (Android) ফোনে ইনস্টল করুন — MFS SMS পড়ে অটো-ভেরিফাই করে।
3. FREE Payment Gateways ড্যাশবোর্ড → **Devices → Add device** → **Generate OTP** (১০ মিনিট valid)।
4. Companion App-এ OTP বসান → অ্যাপ ডিভাইসে connect হবে, `api_key`/webhook URL পাবে।
5. **Devices → Connection** ট্যাবে webhook URL দেখাবে:
   `https://PROJECT_REF.supabase.co/functions/v1/piprapay-webhook?key=wh_...`
6. একটা টেস্ট SMS পাঠিয়ে দেখুন — `/devices`-এ heartbeat/status আপডেট হবে, `/mfs-transactions`-এ লেনদেন আসবে।

> **নিরাপত্তা:** OTP generate এখন শুধু logged-in **org admin**-এর জন্য এবং ডিভাইসটি তার org-এর হতে হবে (আগে যেকোনো `Authorization` header দিয়েই OTP নেওয়া যেত → ডিভাইস দখল সম্ভব ছিল)।

---

## ৬. চেকআউট ফ্লো যাচাই

1. **Gateways** → PiPRA Pay / MFS গেটওয়ে যোগ করুন, `is_active` করুন।
2. **API Keys** → নতুন key তৈরি করুন (`sk_live_...` — একবারই দেখাবে)।
3. cURL:
   ```bash
   curl -X POST "https://PROJECT_REF.supabase.co/functions/v1/create-payment" \
     -H "x-api-key: sk_live_..." -H "Content-Type: application/json" \
     -d '{"amount":100,"currency":"BDT","customer":{"name":"Test","email":"t@example.com"}}'
   ```
4. রেসপন্সের `checkout_url` খুলুন → pay → `verify-payment` দিয়ে status দেখুন।

---

## ৭. ফ্রি টিয়ারের সীমা ও জাগিয়ে রাখা

| বিষয় | সীমা | করণীয় |
|---|---|---|
| Supabase Free | 500 MB DB, ৭ দিন নিষ্ক্রিয় থাকলে project **pause** | নিচের workflow দিয়ে প্রতি ৩ দিনে ping |
| Supabase Edge Functions | মাসে ৫ লাখ invocation | ছোট ব্যবসার জন্য যথেষ্ট |
| Vercel Hobby | fair-use, non-commercial | বাণিজ্যিক হলে Pro, নয়তো Cloudflare Pages/Netlify |
| PipraPay | নিজের হোস্ট | Oracle Always Free VPS সুপারিশ |

Pause ঠেকাতে repo-তে `.github/workflows/keep-supabase-awake.yml` যোগ করা আছে — GitHub → **Settings → Secrets → Actions**-এ `SUPABASE_URL` আর `SUPABASE_ANON_KEY` দুটো secret বসালেই চলবে (anon key public, তবু secret রাখাই ভালো)।

---

## ৮. "Aiven ডেটাবেস চাই" — সত্যি কী সম্ভব?

**সংক্ষেপে:** Aiven একটি managed **PostgreSQL** দেয়; FREE Payment Gateways-এর ব্যাকএন্ড শুধু Postgres নয় — Supabase-এর Auth, PostgREST, RLS, Storage আর Edge Functions সেই DB-র সাথে অবিচ্ছেদ্য। তাই `DATABASE_URL` শুধু Aiven-এ বদলে দিলে **ড্যাশবোর্ড চলবে না** (login, data API, functions সব ওই স্ট্যাকের ওপর নির্ভরশীল)।

তিনটা বাস্তব রাস্তা:

### অপশন A — Supabase Cloud (সুপারিশকৃত, আজই কাজ করে)
- উপরের §১–§৪ ফলো করুন। ফ্রি, ৫ মিনিট, কোনো কোড বদলাতে হবে না।
- একমাত্র ঝামেলা: ৭ দিন নিষ্ক্রিয় থাকলে pause → §৭-এর keep-alive।

### অপশন B — পুরো Supabase নিজে হোস্ট করুন (ফ্রি VM-এ, Aiven ছাড়া)
- Oracle Cloud **Always Free** (4 ARM core / 24 GB RAM) বা নিজের সার্ভারে Supabase self-hosted (Docker) — এতে নিজের Postgres-ই থাকে, pause নেই, Aiven-এর দরকার নেই।
- এই repo-র কোড অপরিবর্তিত থাকবে; শুধু `VITE_SUPABASE_URL` আপনার self-hosted URL হবে।

### অপশন C — Aiven Postgres + নিজের ব্যাকএন্ড (বড় কাজ)
- Aiven (1 GB, always free, no expiry) ব্যবহার করতে হলে Supabase বাদ দিয়ে **নিজের API** লিখতে হবে: Node/Express + JWT auth + সব টেবিলের CRUD + storage + webhook + ১৬টা function-এর লজিক পোর্ট।
- `src/pages/*`-এর প্রায় প্রতিটি Supabase query বদলাবে — এটি ফিচার-rewrite, কনফিগ পরিবর্তন নয়। আলাদা প্রজেক্ট/টাইমলাইন ধরে করতে হবে।

> **কেন Aiven-এ Supabase-কে point করা যায় না:** self-hosted Supabase-এর DB-তে `supabase_admin`-এর মতো role, superuser-level extension (pg_graphql, pgjwt, pgsodium, vault…) আর replication সেটআপ লাগে; Aiven Free-এর `avnadmin` superuser নয় এবং ওই extension-গুলোও নেই। তাই "Aiven URL বসিয়ে Supabase চালানো" কার্যকরভাবে অসম্ভব।

### অপশন D — Aiven বা Neon-কে অফসাইট ব্যাকআপ মিরর হিসেবে ব্যবহার (হালকা, আজই সম্ভব ✅)

Neon বা Aiven — কোনোটাকেই প্রাইমারি DB করা যায় না, কিন্তু **ফ্রি অফসাইট কপি** হিসেবে ব্যবহার করা যায় — Supabase pause/delete হলেও সব ডেটা Aiven-এ পড়া যাবে। এর জন্য repo-তে স্ক্রিপ্ট দেওয়া আছে:

```bash
# Aiven Console → PostgreSQL (Free plan) → Service URI কপি করুন
export SUPABASE_URL="https://PROJECT_REF.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="service_role key"
export DATABASE_URL="postgres://avnadmin:...@pg-xxxx.aivencloud.com:PORT/defaultdb?sslmode=require"

npm run mirror:dry     # কিছুই লিখবে না, শুধু প্ল্যান দেখাবে
npm run mirror         # প্রতিটি টেবিলের row JSONB হিসেবে mirror.<table>-এ upsert হবে
```

- প্রতিটি টেবিল `mirror."<table>"(id text primary key, data jsonb, synced_at timestamptz)` — upstream schema বদলালেও ভাঙবে না, আর বারবার চালালেও duplicate হবে না।
- ফেরত আনার সময়: `select data from mirror."transactions";`
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` RLS bypass করে — শুধু নিজের মেশিনে বা private CI job-এ চালান, কখনো ব্রাউজারে নয়।
- Aiven Free-র ১ GB-তে ছোট/মাঝারি মার্চেন্টের ডেটা অনায়াসে ধরে; বড় হলে `--tables=transactions,devices` দিয়ে শুধু জরুরি টেবিল নিন।

**সিদ্ধান্ত:** এখনকার ফ্রি + দ্রুত পথ = **অপশন A**; pause-মুক্ত ফ্রি চাইলে **অপশন B**; Aiven বাধ্যতামূলক হলে **অপশন C** (আলাদা স্কোপ), আর Aiven শুধু ব্যাকআপ হিসেবে চাইলে **অপশন D**।

---

## ৯. নিরাপত্তা চেকলিস্ট (এই ভার্সনে যা ফিক্স হয়েছে)

- [x] API key: `crypto.getRandomValues` (আগে `Math.random`) + `sha256:<hex>` hash (আগে `btoa` = reversible)
- [x] `key_hash` কলাম client-এ আর select হয় না (dashboard explicit column list + DB column privileges)
- [x] পুরোনো key-গুলো একবার ব্যবহারেই SHA-256-এ auto-upgrade হয়
- [x] Device OTP generate: JWT + org-admin ownership check (আগে শুধু header থাকলেই হতো → device takeover)
- [x] `.env` git-ignored; শুধু `.env.example`
- [ ] Production-এ Supabase **Leaked Password Protection** চালু করুন
- [ ] `service_role` key শুধু Edge Function secret-এ
- [ ] একটি নিয়মিত DB backup (`supabase db dump`)

---

## ১০. Troubleshooting

| উপসর্গ | কারণ | সমাধান |
|---|---|---|
| সাদা পেজ / 404 (route refresh) | SPA rewrite নেই | `vercel.json`-এর `rewrites` ঠিক আছে কিনা দেখুন (repo-তে দেওয়া আছে) |
| Login-এর পর redirect ভুল জায়গায় | Supabase Site URL পুরোনো | §৪-এ Vercel URL বসিয়ে **Redeploy** |
| `new row violates row-level security policy` | ইউজারের org role নেই | `user_roles`-এ ওই user+org-এর row আছে কিনা দেখুন |
| API key `Invalid API key` | key revoke/inactive, বা prefix collision | নতুন key তৈরি করুন; DB-তে `key_prefix` duplicate নয় দেখুন |
| `verify_jwt` 401 | ফাংশনে JWT পাঠানো হয়নি | `Authorization: Bearer <access_token>` দিন (API key নয়) |
| Checkout-এ `PAYMENT_GATEWAY_NOT_CONFIGURED` | কোনো active gateway নেই | Gateways-এ একটি গেটওয়ে active করুন |
| Supabase project paused | ৭ দিন নিষ্ক্রিয় | Dashboard থেকে restore + keep-alive workflow |
| Vite env বদলেও পুরোনো URL | env build-time | Vercel → Redeploy |
