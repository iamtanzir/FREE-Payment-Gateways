'use strict';
const db = require('./db');
const { hmacSha256, nowIso } = require('./util');

function publicInvoice(inv) {
  return {
    id: inv.id,
    amount: Number(inv.amount_minor) / 100,
    amount_minor: inv.amount_minor,
    currency: inv.currency,
    description: inv.description,
    status: inv.status,
    provider: inv.provider,
    customer: {
      name: inv.customer_name,
      email: inv.customer_email,
      phone: inv.customer_phone,
    },
    metadata: safeJson(inv.metadata),
    created_at: inv.created_at,
    paid_at: inv.paid_at,
  };
}

function safeJson(s) {
  try { return JSON.parse(s || '{}'); } catch { return {}; }
}

/** Mark an invoice as paid and fire the merchant webhook (best effort, logged). */
function markPaid(invoiceId, provider) {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  if (!inv) return null;
  if (inv.status === 'paid') return inv;
  const ts = nowIso();
  db.prepare(
    `UPDATE invoices SET status = 'paid', provider = COALESCE(provider, ?), paid_at = ?, updated_at = ? WHERE id = ?`
  ).run(provider || inv.provider || null, ts, ts, invoiceId);
  const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  dispatchWebhook(updated).catch(() => {});
  return updated;
}

function markStatus(invoiceId, status) {
  const ts = nowIso();
  db.prepare('UPDATE invoices SET status = ?, updated_at = ? WHERE id = ?').run(status, ts, invoiceId);
  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
}

/** POST the payment.paid event to the invoice's webhook_url (HMAC-signed). */
async function dispatchWebhook(invoice) {
  const url = invoice.webhook_url;
  if (!url) return { skipped: true };

  // Secret lives on the API key that created the invoice; fall back to settings.
  let secret = null;
  if (invoice.api_key_id) {
    const keyRow = db.prepare('SELECT webhook_secret FROM api_keys WHERE id = ?').get(invoice.api_key_id);
    if (keyRow) secret = keyRow.webhook_secret;
  }
  if (!secret) {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'global_webhook_secret'").get();
    secret = row ? row.value : '';
  }

  const body = JSON.stringify({ type: 'payment.paid', data: publicInvoice(invoice) });
  const signature = 'sha256=' + hmacSha256(secret, body);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let statusCode = 0, response = '', ok = false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FPG-Event': 'payment.paid',
        'X-FPG-Signature': signature,
        'User-Agent': 'FREE-Payment-Gateways/1.0',
      },
      body,
      signal: controller.signal,
    });
    statusCode = res.status;
    ok = res.status >= 200 && res.status < 300;
    response = (await res.text()).slice(0, 500);
  } catch (err) {
    response = String((err && err.message) || err).slice(0, 500);
  } finally {
    clearTimeout(timer);
  }

  db.prepare(
    'INSERT INTO webhook_log (invoice_id, url, status_code, ok, response, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(invoice.id, url, statusCode, ok ? 1 : 0, response, nowIso());

  return { ok, statusCode };
}

module.exports = { markPaid, markStatus, dispatchWebhook, publicInvoice };
