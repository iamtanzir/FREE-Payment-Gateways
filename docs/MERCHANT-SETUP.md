# 🛒 মার্চেন্ট সেটআপ গাইড — নিজের Payment Gateway, একদম ফ্রি

> **লিখেছেন কোড নয়, ব্যবসার লোকের জন্য** — একজন নন-ডেভেলপার ব্যবসায়ী যেভাবে নিজে ১০ মিনিটে সেটআপ করতে পারবেন। কোথাও stuck হলে নিচে FAQ দেখুন অথবা যেকোনো developer-কে এই ফাইলটা দিন।
> **সর্বশেষ tested version: v1.7.2** (GitHub-এ `main` branch-এ ✅ 100% tested)

---

## এক চোখে

| প্রশ্ন | উত্তর |
|---|---|
| এটা কী জিনিস? | **আপনার নিজস্ব সম্পূর্ণ payment gateway** — ডেটা আপনার, টাকা সরাসরি আপনার wallet/ব্যাংকে যায় |
| কত টাকা লাগবে? | **৳০** (মাসিক/সেটআপ কোনো ফি নেই — hosting-এর খরচও $0/মাস) |
| কাকে টাকা দিব? | **কাউকে না** — গ্রাহকরা সরাসরি আপনার bKash/Nagad/Bank-এ টাকা দিবে |
| আমাকে কী করতে হবে? | Render-এ ৫ মিনিটের এক ক্লিক deploy + Settings-এ আপনার নম্বর/QR দেওয়া — হয়ে গেল |
| আমার site আছে? | WordPress/WooCommerce হলে প্লাগইন লেগে ৫ মিনিট; নাহলে payment link বানান (curl) |
| Developer লাগবে? | না — এটা হেল্প-ফ্রি লেখা step-by-step; চাইলে কাউকে দেন |
| ডেটা স্থায়ী থাকবে? | **হ্যাঁ — v1.2.0 থেকে ফ্রি স্থায়ী Postgres যুক্ত আছে** (Neon/CockroachDB); Render Free-র SQLite মুছে যাওয়ার সমস্যা সম্পূর্ণ সমাধান |

**যা লাগবে:** ইন্টারনেট + একটা email address + যেকোনো phone বা computer + আপনার bKash/Nagad/Bank নম্বর/QR।

---

## ধাপ ১ — Render-এ ফ্রি account খুলুন (2 মিনিট)

1. ব্রাউজারে যান: https://render.com
2. **Get Started** / **Sign up** → **GitHub** দিয়ে sign up করুন (GitHub-এও free account লাগে — https://github.com)
3. সেটআপ নিজে হলে GitHub-এই Sign up হয় — Render আপনাকে GitHub দিয়ে verify করতে চাইবে, **Authorize** দিন

> সব ফ্রি। কোনো credit card চাইবে না।

---

## ধাপ ২ — এক ক্লিকে Gateway deploy (৫ মিনিট)

1. GitHub-এ repo খুলুন: https://github.com/iamtanzir/FREE-Payment-Gateways
2. README-র নিচে **Deploy to Render** (নীল button) দেখবেন — অথবা এই link-এ যান:
   https://render.com/deploy?repo=https://github.com/iamtanzir/FREE-Payment-Gateways
3. Render জিজ্ঞেস করবে — **Free plan** সিলেক্ট আছে কিনা দেখে নিন
4. দুইটা জিনিস লিখতে বলবে:
   - **BASE_URL** — যেমন `https://free-mfs-bd.onrender.com` (বদলাতে না চাইলে যেটা দেখায় সেটাই রাখুন)
   - **ADMIN_PASSWORD** — **নিজে মনে রাখবেন এমন** strong password দিন (এই password দিয়ে `/admin`-এ ঢোকান)
5. **Apply** / **Deploy** চাপুন → ৩–৫ মিনিট অপেক্ষা → screen-এ **"Live"** লেখা দেখলে ✅
6. ব্রাউজারে লিখুন: `https://আপনার-app-name.onrender.com/health` → `{"ok":true...}` দেখলে deploy সঠিক

---

## ধাপ ২.৫ — 🗄️ স্থায়ী ডেটাবেস সেট করুন (v1.2.0+, সব ফ্রি) ⭐ গুরুত্বপূর্ণ

Render Free প্রতি restart/redeploy-এ সব ডেটা মুছে ফেলে (ephemeral filesystem)। **v1.2.0 থেকে আমাদের app-এ built-in PostgreSQL support** আছে — একটা `DATABASE_URL` দিলেই ডেটা স্থায়ী হয়ে যাবে (deploy/restart কখনোই তাকায় না)।

### ফ্রি Postgres দুটি (সব ফ্রি, app-এ built-in):

| Provider | ফ্রি storage | কোথায় |
|---|---|---|
| **CockroachDB Serverless** | **10 GB** (সবচেয়ে বড়) | AWS Singapore (বাংলাদেশে দ্রুততম) |
| **Neon** | 0.5 GB | AWS Singapore (বাংলাদেশে দ্রুততম) — v1.7.2 এ এই app Neon-এ verify হয়েছে |

### Neon দিয়ে সেট করুন (৩ মিনিট, v1.7.2-এ সরাসরি test করা হয়েছে):

1. https://neon.tech → **Sign in** (GitHub দিয়ে) → **New project**
2. **Project Name**: `FREE MFS BD` → **Region: AWS Asia Pacific 1 (Singapore)** → **PostgreSQL 17** → **Create project**
3. প্রজেক্ট তৈরির পরে **Connect** button চাপুন
4. **Connection string** copy করুন — দেখতে এরকম হবে:
   `postgresql://fpg_app:<PASSWORD>@ep-<id>-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
5. Render dashboard → service → **Environment** → **Add variable**
   - Key: `DATABASE_URL`
   - Value: ঐ connection string
6. **Save** → **Manual Deploy → Deploy latest commit**
7. `/health` check করুন — `{"ok":true,"version":"1.2.0"}` দেখলে সফল — ডেটা স্থায়ী

> 💡 **Tip:** CockroachDB Serverless নিলে 10 GB ফ্রি — এপ্লির মতোই settings, connection string Render-এ বসিয়ে redeploy。

---

## ধাপ ৩ — প্রথম login ও password বদল (৩ মিনিট)

1. যান: `https://<app-name>.onrender.com/admin`
2. এখন **ADMIN_PASSWORD** (ধাপ ২-এ দেওয়া বা Render dashboard-এ Set) দিয়ে sign in করুন
3. Settings-এ ঢুকে password পরিবর্তন করতে পারেন — **কিন্তু মনে রাখুন:** Render Free-এ restart/redeploy-এ SQLite reset হয়, তাই স্থায়ী password পরিবর্তনের জন্য Render dashboard → Environment-এ `ADMIN_PASSWORD` পরিবর্তন করে redeploy করুন (অথবা DATABASE_URL সেট থাকলে ব্যাপার স্থায়ী)

> 🔒 **Security:** Render কখনো আপনার password দেখায় না (masked) — কেবল আপনি জানেন। `.env` কখনো GitHub-এ commit করবেন না (আমাদের `.gitignore` তা রোধ করে)।

---

## ধাপ ৪ — আপনার টাকা নেওয়ার মাধ্যম সেট করুন (৫ মিনিট)

**Settings** menu-তে যা যা দেখবেন — একটা একটা করে সঠিক তথ্য দিন:

### ৪.১ 🇧🇩 Bangla QR (সবচেয়ে ফ্রি ও সরাসরি)

আপনার ব্যাংক/MFS দিয়ে চাওয়া Bangla QR ব্যবহার করে customer টাকা দিবে:

1. আপনার ব্যাংকের মোবাইল অ্যাপ খুলুন (যেমন DBBL Nexus / Citytouch / EBL Skybanking / আপনার ব্যাংক যেটা হোক) → **Bangla QR** অপশন খুঁজুন → আপনার QR **ডাউনলোড** করুন (PNG/JPG)
2. ছবিটা কোথাও আপলোড করুন:
   - আপনার website থাকলে → WordPress Media Library-তে আপলোড → ছবির URL কপি করুন
   - না থাকলে → https://imgbb.com-এ free upload করুন → "direct link" কপি করুন
3. **Admin → Settings → 🇧🇩 Bangla QR**: ঐ URL টি পেস্ট করে → **Save**
4. Test: একটা নিজের order বানিয়ে QR scan করে pay করে TrxID দিলে আপনি Order-এ "Approve" → done

### ৪.২ 📱 bKash / Nagad / Rocket / Upay / mCash / Cellfin / OK Wallet / iPay / Tap / Telecash (manual verify)

1. **Settings → 📱 Manual payment receiving accounts**:
   - আপনার **bKash** নম্বর (personal বা merchant — যেটাতে টাকা নিবেন)
   - আপনার **Nagad** / **Rocket** / **Upay** / **mCash** / **Cellfin** নম্বর
   - **Bank account** বিবরণ (free text)
2. **Save** — এখন থেকে customer money পাঠিয়ে TrxID দিলে আপনি dashboard-এ "Approve" করলে অর্ডার confirm

---

## ধাপ ৫ — নিজে আগে পরীক্ষা করে দেখুন (৫ মিনিট)

আসল টাকা না দিয়ে আপনি পুরো flow দেখতে পারবেন:

1. **Settings → Demo provider** tick আছে কিনা দেখে নিন (Default: enabled)
2. আপনি এক-টাকা order বানিয়ে demo payment দিয়ে checkout পেজ দেখে নিন — সব সঠিক কাজ করলে বুঝবেন
3. বাস্তব জীবনে পরীক্ষা: আপনার নিজের ফোন থেকে এক টাকা bKash করে TrxID দিয়ে Order-এ approve করুন।

---

## ধাপ ৬A — WordPress/WooCommerce site এ যুক্ত করুন (সবচেয়ে সহজ)

1. repo ডাউনলোড করুন/clone: https://github.com/iamtanzir/FREE-Payment-Gateways
2. `wordpress/free-payment-gateways` ফোল্ডারটা আপনার site-এর `wp-content/plugins/`-এ কপি করুন
3. WordPress → **Plugins → Installed Plugins → FREE Payment Gateways → Activate**
4. **Settings → FPG Gateway**:
   - **Gateway Base URL**: `https://<app-name>.onrender.com` (অথবা আপনার domain)
   - **API Key**: আপনার gateway `Admin → API Keys → Create` থেকে বানানো key দিন
   - **Save**
5. **WooCommerce → Settings → Payments** ট্যাবে দুটো virtual gateway দেখবেন:
   - **FPG Bangla QR & MFS** — checkout-এ payment, customer TrxID দিলে order, আপনি order screen-এ "Approve" চাপলে paid
   - **FPG Self-Hosted Gateway** — customer-কে hosted checkout page-এ redirect, order auto-paid
6. একটা test order করে দেখুন — সব ঠিক

## ধাপ ৬B — সাধারণ website/app-এ (developer লাগবে)

Client (website/app) API দিয়ে payment link বানায়, customer ঐ link খোলেন:

```bash
curl -X POST https://<app-name>.onrender.com/api/v1/checkout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 500, "currency": "BDT",
       "description": "Order #1",
       "success_url": "https://yoursite.com/thanks"}'
```
যে link (`checkout_url`) আসবে সেটাই customer-কে দিবেন (WhatsApp/SMS/Website)। Customer টাকা দিলে webhook (`payment.paid`) আপনার site-এ যায়।

---

## ধাপ ৭ — Go-Live Checklist (প্রিন্ট করে রাকুন)

- [ ] `https://<app>.onrender.com/health` → `{"ok":true,"version":"1.2.0"}` দেয়
- [ ] `/admin` → login → password পরিবর্তন করা হয়েছে
- [ ] **DATABASE_URL সেট করা হয়েছে** (v1.2.0+ — স্থায়ী ডেটা, ধাপ ২.৫)
- [ ] Bangla QR — টেস্ট করা হয়েছে (স্ক্যান করে pay করেছে)
- [ ] Manual bKash/Nagad — টেস্ট করা হয়েছে
- [ ] WooCommerce — test order approve হয়ে গেছে
- [ ] প্রথম customer-কে একই payment link পাঠান — দেখুন সব কাজ করে কিনা

---

## সমস্যা হলে (FAQ)

| উপসর্গ | সমাধান |
|---|---|
| `/health` এ ৫০৪ error | Deploy-এ ⏳ — Render free service ~৫০ সেকেন্ড ঘুম থেকে উঠতে সময় নেয়; আবার চেষ্টা করুন |
| Render-এ data হারাচ্ছে? | v1.2.0 থেকে `DATABASE_URL` দিয়ে ফ্রি Postgres (Neon/CockroachDB 10 GB) সেট করলে ডেটা স্থায়ী — ধাপ ২.৫ দেখুন |
| Admin-এ login হচ্ছে না | Password ভুলে গেছেন? Render → Environment → `ADMIN_PASSWORD` দেখে নিন/বদলে দিন → redeploy |
| Customer টাকা দিলে TrxID আসছে না | Order → "FPG MFS payment — verification needed" box দেখুন → TrxID আছে → bank/app-এ approve করুন |
| Bangla QR ছবি দেখা যাচ্ছে না | Settings-এ URL ঠিক আছে কিনা যাচাই করুন (খালি URL হলে QR কোথাও দেখানো হবে না) |
| bKash Cash-out fee box | এটা আপনার gateway না — bKash-এর নিজের ফি |
| প্রথমবার deploy-এই Blueprint বুঝতে পারছি না | Nephew/developer/friend-কে এই ফাইলটা দিন — "এটা পড়ো, ১০ মিনিটের কাজ" |

---

## পরিচালনা মোটামুটি এইভাবে চলে

```
Customer: website থেকে order → payment page → bKash/QR দিয়ে টাকা
                                          ↓
আপনি:  /admin → Invoices → customer-এর TrxID verify করে "Approve"
                                          ↓
         আপনার site-এ webhook যায় (যদি থাকে) → order confirmed
```

---

## প্রয়োজনের সময় কারা সহায়ক?

- **Technical developer** — repo/plumbing নিয়ে: https://github.com/iamtanzir/FREE-Payment-Gateways (issues tab)
- **Render/Node/Docker/nginx** — docs/DEPLOYMENT.md (বাংলা, A to Z)
- **বাংলা QR / ব্যাংক policy** — আপনার ব্যাংক (Citytouch/DBBL/EBL…) সরাসরি
- **ম্যানুয়াল bKash/Nagad/Rocket/Bank** — আপনার নিজের ওয়ালেট/ব্যাংক (সেটআপ নিজেই করুন, কোনো enrollment লাগে না)

---

## তথ্য এক জায়গায়

**Source code:** https://github.com/iamtanzir/FREE-Payment-Gateways
**Demo/Official docs:** repo-র README.md ও docs/DEPLOYMENT.md (বাংলা A to Z)
**Support:** repo-র Issues tab
**License:** AGPL-3.0-only — নিজের নাম/ব্র্যান্ডে ব্যবহার/পরিবর্তন করুন, এমনকি অন্যের জন্য host করুন (নিজের পরিবর্তিত source §13 অনুযায়ী প্রকাশ করুন)

**⚡ Built with ❤️ by Tanzir Ahmed** — https://iamtanzir.github.io/
