# 🧩 USE CASES — তোমার business অনুযায়ী gateway সেটআপ

এই gateway **single-merchant, self-hosted** — মানে **তুমি** চালাও, **তোমার** customer তোমার bKash/Nagad/Bank-এ টাকা দেয়। অন্য merchant-দের জন্য SaaS হিসেবে দেওয়া এই project-এর লক্ষ্য নয় (নিজের নামে host করে দাও — এটা allowed, এটাই "sobar nijer nijer setup")।

দুইটা integration style — নিজের প্রয়োজন অনুযায়ী বেছে নাও:

| Style | কখন | Code লাগে? |
|---|---|---|
| **A. Payment Links** (`/admin → Pay Links`) | SMS/WhatsApp-এ link পাঠানো, POS counter, donation, দোকান, ISP bill | ❌ না একদম |
| **B. REST API** (`/api/v1/checkout`) | Website/app-এর ভিতর থেকে checkout — order ID, webhook sync, automation | ✅ হ্যাঁ (অল্প) |
| **C. WordPress plugin** (`wordpress/`) | WooCommerce store / [fpg_pay] shortcode | ❌ plugin activate + URL/key বসানো |

---

## 1️⃣ Static website / যেকোনো site — "Pay" button (0 code)

**Style A — Payment Links**

1. Deploy (→ [`DEPLOY-ANYWHERE.md`](DEPLOY-ANYWHERE.md) — $0 যেকোনো host-এ) → `/admin` → **Pay Links → Create**: amount `৳350`, label `Premium T-shirt`, `Max uses: 0` (unlimited)
2. Copy the `/l/plink_…` URL
3. Site-এ button:
   ```html
   <a href="https://pay.myshop.com/l/plink_xxxxxxxx" class="btn">এখনই pay করুন — ৳350</a>
   ```
4. Customer tap করলে hosted checkout ওপেন হয় → bKash/Nagad/Rocket/Bangla QR/Demo — যেকোনো enabled provider → TrxID দিলে তুমি `/admin → Invoices`-এ approve করো → **paid** → webhook (optional URL দিলে) যায়

> ✅ এটা GitHub Pages / Netlify / Google Sites — যেকোনো static site-এ কাজ করে, কোনো backend লাগে না।

## 2️⃣ Dynamic website (any stack) — checkout programmatically

**Style B — REST API.** Flow: **your server** creates checkout → redirect customer to `checkout_url` → customer pays → webhook hits your `webhook_url` → order update।

**PHP:**
```php
$ch = curl_init('https://pay.myshop.com/api/v1/checkout');
curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . FPG_KEY, 'Content-Type: application/json'],
  CURLOPT_POSTFIELDS => json_encode(['amount' => 150.50, 'currency' => 'BDT',
    'description' => "Order #$orderId", 'customer_name' => $name,
    'success_url' => 'https://myshop.com/thanks', 'webhook_url' => 'https://myshop.com/hooks/fpg'])]);
$r = json_decode(curl_exec($ch), true);
header('Location: ' . $r['checkout_url']);  // customer hosted checkout-এ চলে যায়
```

**Node.js:**
```js
const res = await fetch('https://pay.myshop.com/api/v1/checkout', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${process.env.FPG_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: '150.50', currency: 'BDT', description: `Order #${id}`,
    success_url: 'https://myshop.com/thanks', webhook_url: 'https://myshop.com/hooks/fpg',
    metadata: { order_id: id } }),
});
const { checkout_url } = await res.json();
res.redirect(checkout_url);
```

**Webhook receiver (HMAC verify — বাধ্যতামূলক):**
```js
const raw = await getRawBody(req);           // raw body লাগবে signature-এর জন্য!
const sig = 'sha256=' + crypto.createHmac('sha256', process.env.FPG_WEBHOOK_SECRET).update(raw).digest('hex');
if (sig !== req.headers['x-fpg-signature']) return res.sendStatus(401);
const evt = JSON.parse(raw);                 // evt.type === 'payment.paid'
// আপনার order paid mark করুন (evt.data.metadata.order_id দিয়ে)
```
`metadata`-এ order_id রাখলে webhook-এ একই order ফিরে পাও — filenames match করা লাগে না।

## 3️⃣ WordPress / WooCommerce (কোনো code নেই)

`wordpress/free-payment-gateways/` → zip → WP-এ install → **Settings → FPG Gateway** → URL + API key → Save → 2টা gateway checkout-এ দেখাবে। অথবা `[fpg_pay amount="349" description="Consultation"]Pay now[/fpg_pay]` shortcode দিয়ে যেকোনো page-এ button।

## 4️⃣ ISP — মাসিক বিল collection (SMS + payment link)

**Pattern:** তোমার billing system (যেকোনো DB/CSV) → প্রতি মাসে প্রতি subscriber-এর জন্য link বানাও → SMS পাঠাও → customer pay → webhook-এ bill mark paid।

**Step 1 — API key** `/admin → API Keys` থেকে (label "ISP billing")।

**Step 2 — মাসিক cron script** (Node 24+, আলাদা একটা machine-এ/PC-তে cron):
```js
// isp-bills.js — node isp-bills.js bills.csv
import { readFileSync } from 'node:fs';
const FPG = 'https://pay.myisp.com';
const KEY = process.env.FPG_KEY;                 // API key
for (const line of readFileSync(process.argv[2], 'utf8').trim().split('\n').slice(1)) {
  const [phone, name, amount, month] = line.split(',');
  const res = await fetch(FPG + '/api/v1/checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: Number(amount), currency: 'BDT',
      description: `ISP bill ${month} — ${name}`,
      customer_phone: phone, customer_name: name,
      success_url: 'https://myisp.com/thank-you',
      webhook_url: 'https://myisp.com/hooks/fpg',
      metadata: { phone, month },
    }),
  });
  const { checkout_url } = await res.json();
  console.log(`sms:${phone} \`প্রিয় ${name}, ${month} মাসের বিল ৳${amount} — pay: ${checkout_url}\``);
}
```
`bills.csv`: `phone,name,amount,month` — `01711...,Rahim,500,2026-06` ইত্যাদি। Output-এ SMS gateway (যেমন iSMS/BulkSMSBD API)-তে text পাঠিয়ে দাও।

**Step 3 — webhook → bill paid mark:** hook endpoint-এ `payment.paid` event-এ `metadata.phone` + `month` দেখে তোমার billing DB-তে `paid` set করো (আগের §2-এর HMAC verify code ব্যবহার করুন)।

> 💡 কোনো billing system না থাকলেও কাজ করে: **fixed Payment Links** (§1) দিয়ে "বিল pay করুন" button site-এ — customer নাম+phone দিলে manual verify-তেও চলে।

## 5️⃣ POS machine / দোকানের counter-এ payment receive

POS apps সাধারণত **webhook** বা **poll** করে — দুটোই support করে।

**Option A — Fixed QR/counter link:** দোকানে একটা QR print করো — QR = `/l/plink_xxx` (amount variable? fixed amount-এর জন্য ঠিক আছে; mixed amounts-এর জন্য counter-এ input দাও)।

**Option B — Per-sale link + POS auto-detect paid:**
1. Sale finalize করার সময় POS server API-তে checkout বানায় (§2-এর মতো) — `metadata: { sale_id }`
2. Customer counter-এর screen/QR থেকে pay করে (TrxID দিয়ে / demo-তে)
3. POS হয় **webhook** (instant) না হয় **poll** (প্রতি 2 সে.) দিয়ে জানে paid হয়েছে:
```js
// poll-status.mjs — pay হলে exit 0, timeout/failed-এ exit 1
const FPG = 'https://pay.myshop.com';
const id = process.argv[2];
for (let i = 0; i < 150; i++) {                    // ৫ মিনিট
  const r = await fetch(`${FPG}/api/v1/invoices/${id}`, { headers: { Authorization: `Bearer ${process.env.FPG_KEY}` } });
  const inv = await r.json();
  if (inv.status === 'paid') process.exit(0);
  if (inv.status === 'failed') process.exit(1);
  await new Promise(r => setTimeout(r, 2000));
}
process.exit(1);
```
4. Paid হলে thermal printer-এ receipt print (POS-এর নিজের ESC/POS integration — সেটা POS software-এর কাজ; gateway শুধু `paid` confirmation দেয়)।

**Note:** এই gateway নিজে কোনো POS hardware driver নয় — এটা হলো **payment rail**; POS software-এ একটাই integration লাগে: "checkout বানাও + paid হলে receipt দাও"।

## 6️⃣ Donation / চাঁদা / crowdfunding

যেকোনো static site-এ: **Pay Link** (§1) — unlimited uses, amount fixed বা customer নিজে amount দিতে পারবে না (fixed)। Variable amount চাইলে: ছোট button-গুলো (৳100/500/1000 → 3টা আলাদা link) অথবা WordPress shortcode `[fpg_pay amount="…"]`।

## 7️⃣ WhatsApp / Facebook / F-commerce order

1. Buyer: "ভাই 1টা t-shirt নিব"
2. তুমি (বা তোমার assistant) `/admin → Pay Links` (existing: product-wise) অথবা API দিয়ে per-order link বানাও → buyer-কে পাঠাও:

   > "ধন্যবাদ! T-shirt x1 = ৳850। এই link-এ pay করুন 👇 https://pay.myshop.com/l/plink_abc"
3. Buyer pay করলে তোমার `/admin → Invoices`-এ দেখবা → approve → order confirmed
4. Per-order custom amount হলে API দিয়ে link (script এইটাই automate করতে পারে)

**Scaling tip:** প্রচুর order হলে — WordPress + WooCommerce plugin (§3) অথবা আপনার site-এ API integration (§2) বেশি ভালো।

## 8️⃣ SaaS / লাইসেন্স key flow

1. Customer checkout করে (§2 API) → success_url-এ যায়
2. Webhook-এ `payment.paid` → তোমার system license key generate করে → email পাঠায়
3. ⚠️ **Subscription/recurring billing built-in নয়** — প্রতি মাসের জন্য নতুন invoice/link বানাতে হবে (cron script দিয়ে automate করুন — §4-এর pattern)। এটা honest limitation।

## 9️⃣ Restaurant / দোকানের self-service kiosk

Static menu page (kiosk screen) → item-wise Pay Links → customer scan করে pay → kitchen screen webhook শুনতে পারে (kitchen display software-এ integrate) অথবা staff `/admin → Invoices` দেখে।

---

## কোন path কোনটা? — ২ সেকেন্ডের সিদ্ধান্ত

| তোমার setup | Integration |
|---|---|
| Static site, কোনো backend নেই | **Pay Links** (§1) |
| WordPress / WooCommerce | **Plugin** (§3) |
| নিজের site/app, backend আছে | **REST API** (§2) |
| দোকানের counter / POS | **Fixed link** বা **poll API** (§5) |
| ISP / মাসিক বিল / mass SMS | **API + cron + webhook** (§4) |
| WhatsApp/Facebook order | **Pay Links** (§7) অথবা API |
| Donation / চাঁদা | **Pay Links** (§6) |

## ❌ এই gateway যা পারে না (সৎ কথা)

- **Recurring/subscription billing** — built-in নেই (cron দিয়ে per-cycle invoice বানাও)
- **Card payment auto-capture** — এই project-এ কোনো card/Stripe provider নেই (ইচ্ছাকৃতভাবে); BDT-তে card support nativeভাবে নেই, তাই সবচেয়ে কম খরচে কার্ড নিতে হলে bKash/Nagad/Rocket-এর নিজের card/QR rail (manual verify) ব্যবহার করো
- **Multi-tenant SaaS (অন্যদের জন্য host করে দেওয়া)** — এটা single-merchant; অন্য কেউ চাইলে নিজের copy নিজে চালাবে (AGPL-3.0 — allowed)
- **Chargeback/refund automation** — refund হাতে করতে হবে (নিজের bKash/Nagad/Rocket app থেকে — transaction hunt করে TrxID-র বিপরীতে)
- **POS hardware driver** — এটা payment rail; printer/cash-drawer integration তোমার POS software-এর কাজ

Deploy (ফ্রি, যেকোনো platform) → [`DEPLOY-ANYWHERE.md`](DEPLOY-ANYWHERE.md) · merchant setup guide → [`MERCHANT-SETUP.md`](MERCHANT-SETUP.md) (বাংলা) · API docs → [`README.md`](../README.md)
