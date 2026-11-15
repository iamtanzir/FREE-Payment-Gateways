'use strict';
const db = require('./db');

const DEFAULTS = {
  brand_name: 'FREE-Payment-Gateways',
  demo_enabled: '1',
  manual_enabled: '1',
  manual_bkash_number: '',
  manual_nagad_number: '',
  manual_rocket_number: '',
  manual_bank: '',
  manual_note: 'Send the exact amount and put the Invoice ID as reference. Then enter your transaction ID below.',
  btcpay_url: '',
  btcpay_store_id: '',
  btcpay_api_key: '',
  btcpay_webhook_secret: '',
  stripe_secret_key: '',
  stripe_webhook_secret: '',
  bkash_enabled: '0',
  bkash_sandbox: '1',
  bkash_app_key: '',
  bkash_app_secret: '',
  bkash_username: '',
  bkash_password: '',
};

function getSetting(key, fallback) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (row && row.value !== undefined && row.value !== null && row.value !== '') return row.value;
  if (fallback !== undefined) return fallback;
  return DEFAULTS[key] ?? '';
}

function getSettings(keys) {
  const out = {};
  for (const k of keys) out[k] = getSetting(k);
  return out;
}

function getAllSettings() {
  const out = { ...DEFAULTS };
  const rows = db.prepare('SELECT key, value FROM settings').all();
  for (const row of rows) out[row.key] = row.value;
  return out;
}

function setSetting(key, value) {
  const v = String(value ?? '');
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ' +
    'ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, v);
}

/** Secrets that should never be echoed back into HTML forms (sent empty, keep-if-blank semantics). */
const SECRET_KEYS = [
  'btcpay_api_key', 'btcpay_webhook_secret',
  'stripe_secret_key', 'stripe_webhook_secret',
  'bkash_app_secret', 'bkash_password',
];

module.exports = { getSetting, getSettings, getAllSettings, setSetting, SECRET_KEYS, DEFAULTS };
