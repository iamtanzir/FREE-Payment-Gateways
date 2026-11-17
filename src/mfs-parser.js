'use strict';
// ── Universal Bangladeshi MFS (bKash / Nagad / Rocket / Upay / mCash / Cellfin …) ──
// Designed to be forgiving: sender id, carrier SMS wording and language vary
// between operators and app versions. The parser extracts (provider, amount,
// sender, trxId); callers decide what to do with it.
//
// Example texts (formats as published by operators; masked digits common):
//   bKash : "You have received Tk 500.00 from 01XXXXXXXX. Fee Tk 0.00. Balance Tk 1,234.00. TrxID ABC123XYZ9 at 12/05/2026 14:32"
//   Nagad : "You have received Tk 500.00 from 01XXXXXXXXX. TrxID: 9F8K2MAB1C at 2026-05-12 14:32"
//   Rocket: "Tk 500.00 received from 01XXXXXXXXX. Transaction ID: 25A1B2C3D4E at 12-05-2026"
//   Upay  : "আপনার কাছে ৫০০.০০ টাকা এসেছে। লেনদেন নম্বর: UP123ABC456"
//
// ALL SELECTED RAILS ARE FREE-TO-RUN (manual verification or SMS auto-verify).

const PROVIDERS = [
  { id: 'bkash', aliases: ['bkash', 'বিকাশ'] },
  { id: 'nagad', aliases: ['nagad', 'নগদ'] },
  { id: 'rocket', aliases: ['rocket', '16216', 'মোবাইল-টাকা', 'dbbl', 'dutch bangla'] },
  { id: 'upay', aliases: ['upay', 'উপায়'] },
  { id: 'mcash', aliases: ['mcash'] },
  { id: 'cellfin', aliases: ['cellfin'] },
  { id: 'okwallet', aliases: ['okwallet', 'ok wallet'] },
  { id: 'ipay', aliases: ['ipay', 'ipaybd'] },
  { id: 'tap', aliases: ['tap'] },
  { id: 'telecash', aliases: ['telecash'] },
  { id: 'pathaopay', aliases: ['pathaopay', 'pathao pay'] },
  { id: 'aamarpay', aliases: ['aamarpay'] },
  { id: 'paystation', aliases: ['paystation'] },
  { id: 'eps', aliases: ['eps'] },
];

function detectProvider(from, text) {
  const hay = `${from || ''} ${text || ''}`.toLowerCase();
  for (const p of PROVIDERS) {
    for (const a of p.aliases) {
      if (hay.includes(a.toLowerCase())) return p.id;
    }
  }
  return null;
}

const EN_DIGITS = '০১২৩৪৫৬৭৮৯';
const BN_TO_EN = new Map([...EN_DIGITS].map((d, i) => [d, String(i)]));

function bnDigitsToEn(s) {
  return String(s).replace(/[০-৯]/g, (d) => BN_TO_EN.get(d) ?? d);
}

/** Extract a BDT amount in minor units from SMS text. Returns null if not found. */
function extractAmountMinor(text) {
  const t = String(text || '');
  // Prefer amounts tied to money words; otherwise take the first amount-like token.
  const moneyRe = /(?:৳|tk|tk[.\s]*|bdt|taka)\s*[:=-]?\s*(?:৳)?\s*([\d০-৯,]+(?:\.[\d০-৯]{1,2})?)/i;
  const m = t.match(moneyRe);
  let raw = m ? bnDigitsToEn(m[1]) : null;
  if (!raw) {
    const any = t.match(/([\d০-৯,]+(?:\.[\d০-৯]{1,2})?)\s*(?:৳|tk|bdt|taka|টাকা|টাকা)/i);
    if (any) raw = bnDigitsToEn(any[1]);
  }
  if (!raw) {
    // Rare formats: "৫০০ টাকা" with no currency symbol in front
    const anyBn = t.match(/([০-৯]{3,}(?:\.[০-৯]{1,2})?)\s*(?:টাকা|টাকা মাত্র)/);
    if (anyBn) raw = bnDigitsToEn(anyBn[1]);
  }
  if (!raw) return null;
  const n = Number(String(raw).replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  const minor = Math.round(n * 100);
  if (!Number.isSafeInteger(minor) || minor > 9007199254740991) return null;
  return minor;
}

/** Extract the transaction id. Returns null if not found. */
function extractTrxId(text) {
  const t = String(text || '');
  const m = t.match(/(?:TrxID|TrxnID|Transaction\s*(?:ID|No\.?)|TID|Trx|লেনদেন\s*(?:নম্বর|আইডি|ID)?(?:\s*ID)?|লেনদেন)\s*[:#\-]?\s*[:#\-]?\s*([A-Za-z0-9]{6,24})/i);
  if (m) return m[1].toUpperCase();
  // Fallback: standalone long alphanum token that looks like an operator TrxID.
  // Never match a plain BD mobile number (01XXXXXXXXX — 11 digits).
  const fallback = t.match(/\b([A-Z0-9]{8,18})\b/);
  if (fallback && !/^01\d{9}$/.test(fallback[1])) return fallback[1];
  return null;
}

/** Extract sender number/id, masked or plain. */
function extractSender(from, text) {
  const t = String(text || '');
  const m = t.match(/from\s+((?:\+?88)?(?:01|8801)[\dX*x]{6,11}|01[\dX*x]{6,11}|[A-Za-z][A-Za-z0-9 .&_-]{1,40})/i);
  if (m) return m[1].trim();
  const f = String(from || '').trim();
  return f || null;
}

/** Basic hygiene for TrxID: at least 6 alnum chars, no spaces. */
function isValidTrxId(trxId) {
  return typeof trxId === 'string' && /^[A-Za-z0-9]{6,24}$/.test(trxId);
}

/** Parse an incoming SMS. Returns { provider, amountMinor, trxId, sender } or throws with a reason. */
function parsePaymentSms({ from, text }) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('empty sms text');
  const provider = detectProvider(from, raw);
  const amountMinor = extractAmountMinor(raw);
  const trxId = extractTrxId(raw);
  const sender = extractSender(from, raw);
  if (amountMinor === null) throw new Error('amount not found in sms');
  if (!trxId) throw new Error('transaction id not found in sms');
  if (!isValidTrxId(trxId)) throw new Error('transaction id looks malformed');
  return { provider, amountMinor, trxId, sender, rawText: raw.slice(0, 500) };
}

module.exports = { parsePaymentSms, detectProvider, extractAmountMinor, extractTrxId, PROVIDERS };
