'use strict';
const db = require('./db');

const DEFAULTS = {
  brand_name: 'FREE Payment Gateways',
  demo_enabled: '1',
  manual_enabled: '1',
  // Free payment rails only — no Stripe / bKash Tokenized (per-transaction-fee providers removed)
  manual_bkash_number: '',
  // SMS auto-verify (personal/agent MFS accounts via Android SMS forwarder)
  sms_auto_verify: '0',            // '1' = auto-mark paid on confident SMS match
  sms_auto_max_minor: '500000',    // at or below this (৳5,000 default) auto-approve; above → manual review
  sms_bridge_token_hash: '',       // sha256 of the bridge token (token shown once at creation)
  sms_sender_allowlist: '',        // optional comma-separated — only accept SMS from these sender ids

  manual_nagad_number: '',
  manual_rocket_number: '',
  manual_upay_number: '',
  manual_mcash_number: '',
  manual_cellfin_number: '',
  manual_okwallet_number: '',
  manual_ipay_number: '',
  manual_tap_number: '',
  manual_bank: '',
  manual_note: 'Send the exact amount and put the Invoice ID as reference. Then enter your transaction ID below.',
  banglaqr_enabled: '1',
  banglaqr_qr_image: '',
  banglaqr_note: 'Scan the Bangla QR with bKash / Nagad / your bank app, pay the exact amount, then enter your transaction ID below.',
};

async function getSetting(key, fallback) {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  // Row present → the merchant explicitly chose this value, including an empty
  // string. Only a missing row falls through to the fallback/default, otherwise
  // clearing a field in Settings would silently restore its default forever.
  if (row) return row.value ?? '';
  if (fallback !== undefined) return fallback;
  return DEFAULTS[key] ?? '';
}

async function getSettings(keys) {
  const out = {};
  for (const k of keys) out[k] = await getSetting(k);
  return out;
}

async function getAllSettings() {
  const out = { ...DEFAULTS };
  const rows = await db.prepare('SELECT key, value FROM settings').all();
  for (const row of rows) out[row.key] = row.value;
  return out;
}

async function setSetting(key, value) {
  const v = String(value ?? '');
  await db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ' +
    'ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, v);
}

const SECRET_KEYS = [];

module.exports = { getSetting, getSettings, getAllSettings, setSetting, SECRET_KEYS, DEFAULTS };
