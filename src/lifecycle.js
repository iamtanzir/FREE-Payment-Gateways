'use strict';
const db = require('./db');
const { hmacSha256, newId, nowIso } = require('./util');
const { version: VERSION } = require('../package.json');

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
    trx_id: inv.trx_id || '',
    trx_sender: inv.trx_sender || '',
    created_at: inv.created_at,
    paid_at: inv.paid_at,
  };
}

function safeJson(s) {
  try { return JSON.parse(s || '{}'); } catch { return {}; }
}

/** Mark an invoice as paid and fire the merchant webhook (best effort, logged). */
async function markPaid(invoiceId, provider) {
  const inv = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  if (!inv) return null;
  if (inv.status === 'paid') return inv;
  const ts = nowIso();
  // Atomic + idempotent: two concurrent approvals (double click, webhook retry,
  // admin + SMS bridge) must not send the webhook twice.
  const upd = await db.prepare(
    `UPDATE invoices SET status = 'paid', provider = COALESCE(NULLIF(provider, ''), ?), paid_at = ?, updated_at = ? WHERE id = ? AND status <> 'paid'`
  ).run(provider || inv.provider || null, ts, ts, invoiceId);
  const updated = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  if (!updated) return null;
  if (!upd || !upd.changes) return updated; // someone else won the race — no duplicate webhook
  await dispatchWebhook(updated).catch(() => {});
  return updated;
}

async function markStatus(invoiceId, status) {
  const ts = nowIso();
  // A paid invoice is terminal: never let a late cancel/reject downgrade it.
  await db.prepare("UPDATE invoices SET status = ?, updated_at = ? WHERE id = ? AND status <> 'paid'").run(status, ts, invoiceId);
  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
}

// Backoff after consecutive failures (attempt 1→2 min, 2→5 min, 3→30 min, 4→2 h, 5→final)
const WEBHOOK_BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000];

async function webhookSecretFor(invoice) {
  let secret = null;
  if (invoice.api_key_id) {
    const keyRow = await db.prepare('SELECT webhook_secret FROM api_keys WHERE id = ?').get(invoice.api_key_id);
    if (keyRow) secret = keyRow.webhook_secret;
  }
  if (!secret) {
    // Payment Links carry their own webhook secret (links create invoices without an api_key)
    try {
      const meta = invoice.metadata ? JSON.parse(invoice.metadata) : null;
      if (meta && meta.link_id) {
        const link = await db.prepare('SELECT webhook_secret FROM payment_links WHERE id = ?').get(meta.link_id);
        if (link && link.webhook_secret) secret = link.webhook_secret;
      }
    } catch { /* fall through to global secret */ }
  }
  if (!secret) {
    const row = await db.prepare("SELECT value FROM settings WHERE key = 'global_webhook_secret'").get();
    secret = row ? row.value : '';
  }
  return secret;
}

/** Enqueue the payment.paid webhook (delivery with automatic retry) and attempt it now. */
async function dispatchWebhook(invoice) {
  const url = invoice.webhook_url;
  if (!url) return { skipped: true };

  const secret = await webhookSecretFor(invoice);
  const body = JSON.stringify({ type: 'payment.paid', data: publicInvoice(invoice) });
  const signature = 'sha256=' + hmacSha256(secret, body);
  const now = nowIso();
  const id = newId('whd');
  await db.prepare(`
    INSERT INTO webhook_deliveries (id, invoice_id, url, event, payload, signature, status, attempts, max_attempts, next_attempt_at, created_at)
    VALUES (?, ?, ?, 'payment.paid', ?, ?, 'pending', 0, 5, ?, ?)
  `).run(id, invoice.id, url, body, signature, now, now);
  return attemptDelivery(id);
}

/** Attempt one pending delivery. Returns { ok } or { skipped }. */
async function attemptDelivery(id) {
  const d = await db.prepare('SELECT * FROM webhook_deliveries WHERE id = ?').get(id);
  if (!d || d.status !== 'pending') return { skipped: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let statusCode = 0, response = '', ok = false;
  try {
    const res = await fetch(d.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FPG-Event': d.event,
        'X-FPG-Signature': d.signature,
        'User-Agent': `FREE Payment Gateways/${VERSION}`,
      },
      body: d.payload,
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

  const ts = nowIso();
  // Legacy audit log (kept for backwards compatibility and debugging)
  try {
    await db.prepare('INSERT INTO webhook_log (invoice_id, url, status_code, ok, response, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(d.invoice_id, d.url, statusCode, ok ? 1 : 0, response, ts);
  } catch { /* non-fatal */ }

  if (ok) {
    await db.prepare(
      "UPDATE webhook_deliveries SET status = 'delivered', attempts = attempts + 1, last_status_code = ?, last_response = ?, delivered_at = ?, next_attempt_at = ? WHERE id = ?"
    ).run(statusCode, response, ts, ts, d.id);
    return { ok: true, statusCode };
  }
  const attempts = d.attempts + 1;
  if (attempts >= d.max_attempts) {
    await db.prepare("UPDATE webhook_deliveries SET status = 'failed', attempts = ?, last_status_code = ?, last_response = ? WHERE id = ?")
      .run(attempts, statusCode, response, d.id);
  } else {
    const backoff = WEBHOOK_BACKOFF_MS[Math.min(attempts - 1, WEBHOOK_BACKOFF_MS.length - 1)];
    const next = new Date(Date.now() + backoff).toISOString();
    await db.prepare("UPDATE webhook_deliveries SET attempts = ?, last_status_code = ?, last_response = ?, next_attempt_at = ? WHERE id = ?")
      .run(attempts, statusCode, response, next, d.id);
  }
  return { ok: false, statusCode };
}

/**
 * Manually (re)attempt one delivery from the admin UI.
 * - pending  → attempt immediately (even if its next_attempt_at is in the future)
 * - failed   → re-queue it with one extra allowed attempt, then attempt
 * - delivered→ nothing to do
 */
async function requeueDelivery(id) {
  const d = await db.prepare('SELECT * FROM webhook_deliveries WHERE id = ?').get(id);
  if (!d) return { skipped: true, reason: 'not found' };
  if (d.status === 'delivered') return { skipped: true, reason: 'already delivered' };
  if (d.status !== 'pending') {
    // Give a manually retried delivery one fresh attempt even if it hit max_attempts.
    await db.prepare(
      `UPDATE webhook_deliveries
          SET status = 'pending',
              max_attempts = CASE WHEN attempts >= max_attempts THEN attempts + 1 ELSE max_attempts END,
              next_attempt_at = ?
        WHERE id = ?`
    ).run(nowIso(), id);
  }
  return attemptDelivery(id);
}

/** Attempt every due pending delivery (called by the retry worker and the admin "Retry due now" button). */async function processDueDeliveries(limit = 20) {
  const rows = await db.prepare(
    "SELECT id FROM webhook_deliveries WHERE status = 'pending' AND next_attempt_at <= ? ORDER BY next_attempt_at ASC LIMIT ?"
  ).all(nowIso(), limit);
  let n = 0;
  for (const row of rows) {
    await attemptDelivery(row.id).catch(() => {});
    n++;
  }
  return n;
}

/** In-process retry worker for single-instance deployments. */
function startWebhookRetryWorker(intervalMs = 30000) {
  const timer = setInterval(() => {
    processDueDeliveries(10).catch(() => {});
  }, intervalMs);
  if (timer.unref) timer.unref();
  return timer;
}

module.exports = { markPaid, markStatus, dispatchWebhook, publicInvoice, attemptDelivery, requeueDelivery, processDueDeliveries, startWebhookRetryWorker };
