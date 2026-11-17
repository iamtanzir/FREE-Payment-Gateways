# 📲 AUTO-VERIFY — SMS দিয়ে পেমেন্ট অটো ভেরিফাই (self-hosted, 100% ফ্রি)

পুরনো সমস্যা: customer টাকা পাঠায় → তুমি হাতে TrxID check করো → approve → order confirm। দিনে ৫টা order-এ ঠিক আছে, ৫০টাতে **দুঃস্বপ্ন**।

**সমাধান (এই project-এ এখন built-in):** তোমার MFS SIM-যে ফোনে আছে → SMS পেলেই একটা Android app ওটা HTTPS-এ আমাদের gateway-তে পাঠিয়ে দেয় → gateway **amount + TrxID** মিলিয়ে pending invoice **auto-paid** করে ফেলে। কোনো API enrollment লাগে না, bKash/Nagad/Rocket/Upay personal ও agent দুটো নম্বরেই কাজ করে। কোনো per-transaction fee নেই।

## আর্কিটেকচার

```
📱 Android phone (তোমার MFS SIM, সবসময় অন)
     │  SMS received (incoming, e.g. "You have received Tk 500.00 from 01XXXXXXXX … TrxID ABC123 at …")
     ▼
🔁 SMS forwarder app (MacroDroid / Tasker / SMS Gate — যেকোনো SMS forwarder)
     │  HTTPS POST https://pay.yourdomain.com/bridge/sms · Authorization: Bearer <bridge token>
     ▼
⚡ Gateway (self-hosted)
     ├─ sender allowlist ✓  →  reject
     ├─ parse: provider + amount + TrxID + sender
     ├─ replay check (TrxID আগে দেখা গেছে? → 409)
     ├─ match: pending invoice (TrxID match) OR (exact amount, 24h, unique)
     └─ auto-paid ─► webhook (payment.paid, HMAC-SHA256) → তোমার site/WooCommerce-এ order confirmed
```

**খরচ:** $0 (অন্তত একটা SMS forwarder app আছে যেটা ফ্রি — MacroDroid এর free tier / F-Droid-এর SMS Gate)। **SMS নিজেরই চার্জ লাগে না** (operator incoming SMS free)।

---

## ধাপ ১ — Gateway live

আগে [`DEPLOY-ANYWHERE.md`](DEPLOY-ANYWHERE.md) অনুযায়ী deploy করো (সবচেয়ে সহজ: PC/Pi/VPS + Docker, বা Cloud Run + Neon — সব ফ্রি)। এরপর `https://YOUR-DOMAIN/admin` → login।

## ধাপ ২ — Android ফোনে SMS forwarder বোঝাও

তোমার shop-এর যে phone-এ bKash/Nagad নম্বর আছে (merchant নম্বর), সেটাকে "payment receiver" বানাও। App বেছে নাও (যেকোনো **একটা**):

| App | খরচ | Note |
|---|---|---|
| **MacroDroid** (Play Store) | ফ্রি tier | সবচেয়ে সহজ; নিচের recipe |
| **Tasker** | ~৳300 one-time | আরও powerful |
| **SMS Gate** (F-Droid) | ফ্রি, open-source | SMS gateway হিসেবেও কাজ করে |
| **Automate** (Play Store) | ফ্রি | Automate (by lambo) — Tasker-এর বিনামূল্যের বিকল্প |

### MacroDroid recipe (প্রায় ৩ মিনিট)

1. **Add Macro** → নাম `FPG SMS Bridge`
2. **Trigger:** `SMS Received` → From = `any` (বা `bKash|NAGAD|16216|UPAY` regular expression, ভার্সন ভেদে) → SMS text contains `received` (Bangla হলে `পেয়েছেন`)
3. **Action:** `HTTP Request` (POST) →
   - URL: `https://YOUR-DOMAIN/bridge/sms`
   - Headers: `Content-Type: application/json` · `Authorization: Bearer <TOKEN>` (ধাপ ৩-এর)
   - Body: `{"from": "<SMS sender variable>", "text": "<SMS body variable>"}`
   - MacroDroid-এ SMS trigger-এর ভেরিয়েবল সাধারণত `[sms_number]` / `[sms_message]` (exact নাম অ্যাপ ভার্সনে বদলাতে পারে — trigger config-এর variable picker-এ দেখো)
4. **Save & Enable** → test SMS পাঠিয়ে দেখো (নিচের curl দিয়ে নিজেও test করতে পারো)

**Forwarder দিয়ে test** (ফোনের আগেই bridge কাজ করছে কিনা check):
```bash
curl -X POST https://YOUR-DOMAIN/bridge/sms \
  -H "Authorization: Bearer YOUR_BRIDGE_TOKEN" -H "Content-Type: application/json" \
  -d '{"from":"bKash","text":"You have received Tk 321.00 from 01711111111. TrxID TEST123ABC at 12/05/2026 14:32"}'
# → {"status":"nomatch","matched":false}  (code + token ঠিক থাকলে এই JSON-ই আসবে — এটাই সঠিক)
```

## 📱 একাধিক ফোন / SIM (multi-device)

একাধিক নম্বরে টাকা আসলে (যেমন: bKash আলাদা ফোনে, Nagad আরেকটায়) — প্রতিটি ফোনের জন্য আলাদা device বানাও:

1. `/admin → SMS Bridge` → **Devices → + Add device** → নাম দাও (যেমন "Shop counter (bKash)")
2. দেখানো key `whd_…` একবারই দেখা যাবে — কপি করে ওই ফোনের forwarder app-এর header-এ বসাও
3. ওই ফোনে SMS আসলে **Last seen / Last SMS** আপডেট হবে → সব ঠিক আছে কিনা check করো
4. Pause/প্রত্যাহার চাইলে → **Disable** (SMS আর নিবে না) বা **Revoke** (permanent) — দুটোই সাথে সাথে কার্যকর
5. Key হারালে → **Regen key** → নতুন key forwarder app-এ বসাও (পুরনো আর কাজ করবে না)

Global bridge token (ধাপ ৩) এখনো কাজ করবে — শুধু একটা ফোন থাকলে সেটাই যথেষ্ট; device-এ আলাদা revoke/per-device control পাও।

## ধাপ ৩ — Admin → SMS Bridge → enable

1. `/admin → SMS Bridge` → **Generate bridge token** → একবারের মতন দেখাবে — Copy
2. Token-টা MacroDroid-এর Header-এ বসাও (ধাপ ২)
3. **Parser test** বক্সে কোনো আসল sample SMS পেস্ট করে নাও — provider/amount/TrxID ঠিক পার্স হচ্ছে কিনা
4. **Auto-verify settings:**
   - ☑ **Enable SMS auto-verify**
   - **Auto-approve সর্বোচ্চ (৳)** — default ৳5,000। এর বেশি amount হলে খালি TrxID pre-fill হয়, আর **তুমি নিজে Approve করো** (train এর চেয়ে নিরাপদ)
   - **Sender allowlist** — খালি রাখলে যেকোনো sender accept; নিরাপদ হতে `bKash, NAGAD, 16216, UPAY`
5. Save — done ✅

## ধাপ ৪ — Customer experience (কিছু বদলায়নি)

- Customer তোমার site/link থেকে order করে → hosted checkout → Manual bKash বা Bangla QR বেছে নেয়
- টাকা পাঠায় তোমার নম্বরে (amount exact) — **TrxID দিয়ে দিলে আরও নিশ্চিত**
- SMS এলে gateway সাথে সাথে মিলে → **paid** → success page → webhook → order confirm
- TrxID না দিলেও চলবে (unique amount ২৪ ঘণ্টার মধ্যে হলে); না মিলে থাকলে **ইনবয়েস pending-ই** থাকে — কেউ money পাঠিয়ে "বিনা টাকায় paid" হতে পারবে না।

##  নিরাপত্তা — সততার সাথে

| ঝুঁকি | আমাদের ব্যবস্থা | তোমার কাজ |
|---|---|---|
| ভুয়া SMS (spoofed sender) | Sender **allowlist** (operator ID দেখে); auto-approve শুধু `max amount` পর্যন্ত | বড় লেনদেনে **Manual Review** চালু রাখো |
| একই TrxID আবার accept | **Replay protection** — পুরনো TrxID → `409` | — |
| Token লিক | সহজে revoke/regenerate (`/admin → SMS Bridge → Regenerate`) | SIM/phone Lock রাখো |
| Ambiguous match (একই amount-এর ২টা pending) | auto হয় না — **manual review**-এ যায় | Amount আলাদা রাখতে বলতে পারো (e.g. ৳345 + cents odd) |
| ২৪/৭ ফোন অন | — | চার্জারে রাখো; ফোন বন্ধ হলে SMS miss হয় → invoice pending-ই থাকে (কোনো টাকা হারায় না) |
| SMS delay/অপারেটর কনস্যার্ট | — | Pending থাকলে TrxID দিয়ে নিজে approve করো (old flow-ই চলবে) |

> ⚠️ **সততার কথা:** SMS-sender ID স্পুফ করা যায় — এটা **যেকোনো SMS-based auto-verify system-এরই** সীমাবদ্ধতা। SMS ভিত্তিক auto-verify ছোট-মাঝারি লেনদেনের জন্য; **৳50,000+ লেনদেনে offline verify (phone-এ bKash app → SMS → TrxID match) করো**। আর SIM/phone কখনো হাতছাড়া কোরো না — operator-এর কাছে রিপোর্ট করলে ফোন Lock করো।

## যা নেই / সততার তালিকা
- MFS provider সরাসরি API দেয় না (personal/agent নম্বর) → SMS-ই একমাত্র রিয়েল-টাইম সংকেত
- Android ছাড়া SMS রিড করা যায় না → **যেকোনো Android ফোন লাগে (পুরনো ফোনও হবে)**
- Sender ID/format অপারেটর ভেদে বদলে যায় — কোনো sample ঠিকঠাক parse না হলে Issues-এ exact SMS text দিন (private অংশ ঢেকে) → regex update হবে
- Auto-verify কেবল **incoming** SMS-এ কাজ করে — **outgoing** (তুমি টাকা পাঠালে) নয়
- ২৪ ঘণ্টা wrap-around-এ ১টার বেশি same-amount pending থাকলে auto verify হবে না — Manual review প্রযোজ্য

## Troubleshooting

| সমস্যা | কারণ / সমাধান |
|---|---|
| Forwarder টালবাহানা — SMS আসলে bridge কিছু পায় না | MacroDroid: trigger enable? Internet? URL টাইপো? log: `adb logcat` বা app-এর "Last run log" |
| `422 unparsable sms` | Operator format বদলেছে — `/admin → SMS Bridge → Recent SMS events` থেকে exact text কপি করে Issues-এ দেও |
| `409 duplicate trx_id` | ওই SMS আবার bridge-এ পৌঁছেছে (phone retry) — নিরাপদ, চিন্তা নেই |
| `403 sender not in allowlist` | allowlist-এ তোমার operator-এর exact sender ID বসাও (empty-তেই আগে test করো) |
| Ambiguous | একই পরিমাণ টাকা দুইজন দিয়েছে — Invoices-এ গিয়ে TrxID মিলিয়ে নিজে Approve |
| Token লিক / প্রত্যাহার চাই | SMS Bridge → **Regenerate token** → forwarder app-এ নতুন বসাও |

## Compare — কী বাছাই করবে

| Approach | খরচ | Setup | Reliability |
|---|---|---|---|
| Manual TrxID approve (আগের মতো) | $0 | ০ মিনিট | সর্বোচ্চ |
| **SMS auto-verify (এই feature)** | $0 | ১০ মিনিট + Android phone | ভালো (ছোট-মাঝারি amount) |

আমাদের approach একটি **self-contained SMS agent → HTTPS → parser → matcher** architecture — SQLite/Postgres-এ সব, কোনো multi-tenant SaaS নির্ভরতা নেই।
