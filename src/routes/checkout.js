'use strict';
const express = require('express');
const db = require('../db');
const { getAllSettings, getSetting } = require('../settings');
const { enabledProviders, getProvider } = require('../providers');
const { layout, statusPill, esc } = require('../views');
const { formatMoney, appendQuery, nowIso, newId, toMinorUnits } = require('../util');
const { markPaid, markStatus, publicInvoice } = require('../lifecycle');
const { baseUrl } = require('./api');

const router = express.Router();

async function getInvoice(id) {
  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
}

function successRedirect(req, res, invoice) {
  // No success_url configured → show our own "payment successful" page instead of
  // dumping the customer on "/" (which redirects to the merchant's admin login).
  const url = invoice.success_url || `/pay/${encodeURIComponent(invoice.id)}`;
  res.redirect(appendQuery(url, { fpg_payment_id: invoice.id, fpg_status: 'paid' }));
}

function cancelRedirect(req, res, invoice) {
  const url = invoice.cancel_url || `/pay/${encodeURIComponent(invoice.id)}`;
  res.redirect(appendQuery(url, { fpg_payment_id: invoice.id, fpg_status: 'cancelled' }));
}

function errorPage(res, message, status = 400) {
  res.status(status).send(layout({
    title: 'Payment error',
    nav: false,
    body: `<div class="checkout"><div class="card">
      <h1>⚠️ Something went wrong</h1>
      <div class="alert alert-err">${esc(message)}</div>
      <a class="btn btn-secondary" href="javascript:history.back()">← Go back</a>
    </div></div>`,
  }));
}

// ── Hosted checkout page ────────────────────────────────────────────
router.get('/pay/:id', async (req, res, next) => {
  try {
    const inv = await getInvoice(req.params.id);
    if (!inv) {
      return res.status(404).send(layout({ title: 'Not found', nav: false, body: `<div class="checkout"><div class="card"><h1>Invoice not found</h1><p class="muted">The link may be broken or the invoice id is wrong.</p></div></div>` }));
    }
    const settings = await getAllSettings();
    const brand = settings.brand_name || 'FREE Payment Gateways';

    if (inv.status === 'paid') {
      return res.send(layout({ title: 'Payment complete', nav: false, body: `<div class="checkout"><div class="card" style="text-align:center">
        <div style="font-size:56px">✅</div><h1>Payment successful</h1>
        <p class="muted">Invoice <span class="mono">${esc(inv.id)}</span> — ${esc(formatMoney(inv.amount_minor, inv.currency))}</p>
        ${inv.success_url ? `<a class="btn" href="${esc(appendQuery(inv.success_url, { fpg_payment_id: inv.id, fpg_status: 'paid' }))}">Continue →</a>` : ''}
      </div></div>` }));
    }
    if (inv.status !== 'pending') {
      return res.send(layout({ title: 'Invoice closed', nav: false, body: `<div class="checkout"><div class="card" style="text-align:center">
        <h1>This invoice is ${esc(inv.status)}</h1><p class="muted">No payment is required.</p>
      </div></div>` }));
    }

    const providers = enabledProviders(settings);
    const ctx = { baseUrl: await baseUrl(req) };
    const panels = providers.filter(p => p.panel).map(p => `
        <div><div class="muted" style="margin:4px 0 2px;font-weight:700">${esc(p.name)}</div>${p.panel(inv, settings, ctx)}</div>`).join('');
    const redirectForms = providers.filter(p => p.begin).map(p => `
        <form method="post" action="/pay/${encodeURIComponent(inv.id)}/provider/${esc(p.id)}">
          <button type="submit" class="provider-btn"><span>${esc(p.name)}</span><span>→</span></button>
        </form>`).join('');

    const metaRows = Object.entries(safeJson(inv.metadata)).slice(0, 6)
      .map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:12px"><span class="muted">${esc(k)}</span><span>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</span></div>`).join('');

    res.send(layout({
      title: `Pay ${formatMoney(inv.amount_minor, inv.currency)} — ${brand}`,
      nav: false,
      body: `<div class="checkout">
        <div class="card">
          <div class="muted" style="text-align:center;text-transform:uppercase;letter-spacing:1px;font-size:11px">${esc(brand)} — Secure checkout</div>
          <div class="amount">${esc(formatMoney(inv.amount_minor, inv.currency))}</div>
          <div style="text-align:center" class="muted">${esc(inv.description || 'Payment')} · ${statusPill(inv.status)}</div>
          ${metaRows ? `<div class="hr"></div>${metaRows}` : ''}
          <div class="hr"></div>
          ${redirectForms}
          ${panels}
          ${providers.length === 0 ? '<div class="alert alert-warn">No payment providers are enabled. Ask the site owner to enable at least one provider in Admin → Settings.</div>' : ''}
          <div class="hr"></div>
          <form method="post" action="/pay/${encodeURIComponent(inv.id)}/cancel" onsubmit="return confirm('Cancel this payment?')">
            <button type="submit" class="btn btn-secondary btn-sm" style="width:100%">Cancel payment</button>
          </form>
          <div class="muted" style="text-align:center;margin-top:10px;font-size:11px">Invoice ${esc(inv.id)}</div>
        </div>
      </div>`,
    }));
  } catch (err) {
    next(err);
  }
});

// ── Start a redirect-type provider ──────────────────────────────────
router.post('/pay/:id/provider/:providerId', async (req, res, next) => {
  try {
    const inv = await getInvoice(req.params.id);
    if (!inv) return errorPage(res, 'Invoice not found', 404);
    if (inv.status !== 'pending') return errorPage(res, `Invoice is already ${inv.status}`, 409);
    const provider = getProvider(req.params.providerId);
    if (!provider || typeof provider.begin !== 'function') return errorPage(res, 'Unknown provider', 400);
    const settings = await getAllSettings();
    if (!provider.isEnabled(settings)) return errorPage(res, 'This provider is not enabled', 400);
    const ctx = { baseUrl: await baseUrl(req) };
    try {
      const { redirect, providerRef } = await provider.begin(inv, settings, ctx);
      const ts = nowIso();
      await db.prepare('UPDATE invoices SET provider = ?, provider_ref = ?, updated_at = ? WHERE id = ?')
        .run(provider.id, providerRef || null, ts, inv.id);
      return res.redirect(redirect);
    } catch (err) {
      return errorPage(res, err.message || 'Could not start the payment provider', 502);
    }
  } catch (err) {
    next(err);
  }
});

// ── Demo provider completion ────────────────────────────────────────
router.post('/pay/:id/demo/complete', async (req, res, next) => {
  try {
    const inv = await getInvoice(req.params.id);
    if (!inv) return errorPage(res, 'Invoice not found', 404);
    if (inv.status !== 'pending') return successRedirect(req, res, inv);
    const settings = await getAllSettings();
    if ((settings.demo_enabled ?? '1') !== '1') return errorPage(res, 'Demo provider is disabled', 400);
    const updated = await markPaid(inv.id, 'demo');
    successRedirect(req, res, updated);
  } catch (err) {
    next(err);
  }
});

// TrxID hygiene: operators use 6–24 alphanumerics (sometimes with - or _).
const TRX_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{3,63}$/;
const TRX_DUPLICATE_MESSAGE =
  'This transaction ID has already been submitted for another payment. ' +
  'Check the TrxID, or contact the merchant if you paid twice.';

function validateTrxSubmission(trxId, trxSender) {
  if (!trxId || !trxSender) return 'Transaction ID and sender number are required.';
  if (!TRX_ID_RE.test(trxId)) return 'That transaction ID does not look valid (4–64 letters/digits).';
  if (!/[0-9]/.test(trxSender)) return 'Enter the mobile number / account you paid from.';
  return '';
}

/** True when another invoice already carries this TrxID (anti-fraud: one payment = one order). */
async function trxIdAlreadyUsed(trxId, invoiceId) {
  const row = await db.prepare('SELECT id FROM invoices WHERE trx_id = ? AND id <> ? LIMIT 1')
    .get(trxId, invoiceId);
  return !!row;
}

// ── Bangla QR submission (awaits admin approval) ────────────────────
router.post('/pay/:id/banglaqr/submit', async (req, res, next) => {
  try {
    const inv = await getInvoice(req.params.id);
    if (!inv) return errorPage(res, 'Invoice not found', 404);
    if (inv.status !== 'pending') return successRedirect(req, res, inv);
    const settings = await getAllSettings();
    if ((settings.banglaqr_enabled ?? '1') !== '1') return errorPage(res, 'Bangla QR provider is disabled', 400);
    const trxId = String(req.body.trx_id || '').trim().slice(0, 100);
    const trxSender = String(req.body.trx_sender || '').trim().slice(0, 50);
    const invalid = validateTrxSubmission(trxId, trxSender);
    if (invalid) return errorPage(res, invalid, 400);
    if (await trxIdAlreadyUsed(trxId, inv.id)) return errorPage(res, TRX_DUPLICATE_MESSAGE, 409);
    const ts = nowIso();
    await db.prepare(`UPDATE invoices SET provider = 'banglaqr', trx_id = ?, trx_sender = ?, updated_at = ? WHERE id = ?`)
      .run(trxId, trxSender, ts, inv.id);
    res.send(layout({
      title: 'Submitted', nav: false,
      body: `<div class="checkout"><div class="card" style="text-align:center">
        <div style="font-size:52px">🕐</div>
        <h1>Payment submitted</h1>
        <p class="muted">Transaction <span class="mono">${esc(trxId)}</span> is waiting for the merchant to verify it against their bank app. You will be notified once it is approved.</p>
      </div></div>`,
    }));
  } catch (err) {
    next(err);
  }
});

// ── Manual provider submission (awaits admin approval) ──────────────
router.post('/pay/:id/manual/submit', async (req, res, next) => {
  try {
    const inv = await getInvoice(req.params.id);
    if (!inv) return errorPage(res, 'Invoice not found', 404);
    if (inv.status !== 'pending') return successRedirect(req, res, inv);
    const settings = await getAllSettings();
    if ((settings.manual_enabled ?? '1') !== '1') return errorPage(res, 'Manual payments are disabled by the merchant.', 400);
    const trxId = String(req.body.trx_id || '').trim().slice(0, 100);
    const trxSender = String(req.body.trx_sender || '').trim().slice(0, 50);
    const invalid = validateTrxSubmission(trxId, trxSender);
    if (invalid) return errorPage(res, invalid, 400);
    if (await trxIdAlreadyUsed(trxId, inv.id)) return errorPage(res, TRX_DUPLICATE_MESSAGE, 409);
    const ts = nowIso();
    await db.prepare(`UPDATE invoices SET provider = 'manual', trx_id = ?, trx_sender = ?, updated_at = ? WHERE id = ?`)
      .run(trxId, trxSender, ts, inv.id);
    res.send(layout({
      title: 'Submitted', nav: false,
      body: `<div class="checkout"><div class="card" style="text-align:center">
        <div style="font-size:52px">🕐</div>
        <h1>Payment submitted</h1>
        <p class="muted">Transaction <span class="mono">${esc(trxId)}</span> is waiting for the merchant to verify it. You will be notified once it is approved.</p>
      </div></div>`,
    }));
  } catch (err) {
    next(err);
  }
});

// Per-IP rate limit for public payment-link invoice creation (protects the DB)
const plinkAttempts = new Map();
function plinkRateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const list = (plinkAttempts.get(ip) || []).filter((t) => now - t < windowMs);
  if (list.length >= 30) { plinkAttempts.set(ip, list); return true; }
  list.push(now);
  plinkAttempts.set(ip, list);
  if (plinkAttempts.size > 5000) plinkAttempts.clear();
  return false;
}

// ── Public payment link → create invoice on the fly ─────────────────
// Merchant shares a fixed/reusable pay URL (from /admin/links) — e.g. in SMS,
// WhatsApp, on a POS screen — no API integration needed on their side.
router.get('/l/:id', async (req, res, next) => {
  try {
    if (plinkRateLimited(req.ip || 'unknown')) {
      return errorPage(res, 'Too many requests — please wait a few minutes and try again.', 429);
    }
    const link = await db.prepare('SELECT * FROM payment_links WHERE id = ?').get(req.params.id);
    if (!link || link.revoked_at) return errorPage(res, 'This payment link is not valid.', 404);
    if (!link.enabled) return errorPage(res, 'This payment link is currently disabled by the merchant.', 403);
    // Atomic usage accounting (works on both SQLite and Postgres)
    const upd = await db.prepare(
      'UPDATE payment_links SET uses = uses + 1 WHERE id = ? AND enabled = 1 AND revoked_at IS NULL AND (max_uses = 0 OR uses < max_uses)'
    ).run(link.id);
    if (!upd.changes) return errorPage(res, 'This payment link has reached its usage limit.', 410);

    const invId = newId('inv');
    const ts = nowIso();
    try {
      await db.prepare(`
        INSERT INTO invoices (id, api_key_id, amount_minor, currency, description,
          customer_name, customer_email, customer_phone, status, metadata,
          success_url, cancel_url, webhook_url, created_at, updated_at)
        VALUES (?, NULL, ?, ?, ?, '', '', '', 'pending', ?, ?, ?, ?, ?, ?)
      `).run(
        invId, link.amount_minor, link.currency, link.description,
        JSON.stringify({ source: 'payment_link', link_id: link.id, label: link.label }),
        link.success_url, link.cancel_url, link.webhook_url, ts, ts
      );
    } catch (err) {
      // Don't burn a use of the link when the invoice could not be created.
      await db.prepare('UPDATE payment_links SET uses = CASE WHEN uses > 0 THEN uses - 1 ELSE 0 END WHERE id = ?')
        .run(link.id).catch(() => {});
      throw err;
    }
    return res.redirect(`/pay/${invId}`);
  } catch (err) {
    next(err);
  }
});

// ── Provider return URLs ────────────────────────────────────────────
router.get('/pay/:id/return', async (req, res, next) => {
  try {
    const inv = await getInvoice(req.params.id);
    if (!inv) return errorPage(res, 'Invoice not found', 404);
    if (inv.status === 'paid') return successRedirect(req, res, inv);
    // Not paid yet — show a confirming page that polls status (providers confirm async).
    res.send(layout({
      title: 'Confirming payment…', nav: false,
      body: `<div class="checkout"><div class="card" style="text-align:center">
        <div style="font-size:52px">⏳</div>
        <h1>Confirming your payment…</h1>
        <p class="muted">This page checks automatically every 3 seconds.</p>
        <p id="st" class="pill pill-pending">PENDING</p>
        <script>
          const id = ${JSON.stringify(inv.id)};
          const t = setInterval(async () => {
            try {
              const r = await fetch('/pay/' + encodeURIComponent(id) + '/status');
              const d = await r.json();
              document.getElementById('st').textContent = String(d.status).toUpperCase();
              if (d.status === 'paid') { clearInterval(t); location.href = d.success_url || ('/pay/' + encodeURIComponent(id)); }
              if (d.status !== 'pending') clearInterval(t);
            } catch (e) {}
          }, 3000);
        </script>
      </div></div>`,
    }));
  } catch (err) {
    next(err);
  }
});

router.get('/pay/:id/status', async (req, res, next) => {
  try {
    const inv = await getInvoice(req.params.id);
    if (!inv) return res.status(404).json({ error: 'not found' });
    res.json({
      status: inv.status,
      success_url: inv.success_url ? appendQuery(inv.success_url, { fpg_payment_id: inv.id, fpg_status: inv.status }) : null,
    });
  } catch (err) {
    next(err);
  }
});



router.post('/pay/:id/cancel', async (req, res, next) => {
  try {
    const inv = await getInvoice(req.params.id);
    if (!inv) return errorPage(res, 'Invoice not found', 404);
    if (inv.status === 'pending') await markStatus(inv.id, 'cancelled');
    cancelRedirect(req, res, inv);
  } catch (err) {
    next(err);
  }
});

router.get('/pay/:id/cancel', async (req, res, next) => {
  try {
    const inv = await getInvoice(req.params.id);
    if (inv && inv.status === 'pending') await markStatus(inv.id, 'cancelled');
    if (inv) return cancelRedirect(req, res, inv);
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

function safeJson(s) { try { return JSON.parse(s || '{}'); } catch { return {}; } }

module.exports = { checkoutRouter: router };
