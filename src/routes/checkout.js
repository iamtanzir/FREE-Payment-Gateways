'use strict';
const express = require('express');
const db = require('../db');
const { getAllSettings, getSetting } = require('../settings');
const { enabledProviders, getProvider } = require('../providers');
const { layout, statusPill, esc } = require('../views');
const { formatMoney, appendQuery, nowIso } = require('../util');
const { markPaid, markStatus, publicInvoice } = require('../lifecycle');
const { baseUrl } = require('./api');

const router = express.Router();

function getInvoice(id) {
  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
}

function successRedirect(req, res, invoice) {
  const url = invoice.success_url || '/';
  res.redirect(appendQuery(url, { fpg_payment_id: invoice.id, fpg_status: 'paid' }));
}

function cancelRedirect(req, res, invoice) {
  const url = invoice.cancel_url || '/';
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
router.get('/pay/:id', (req, res) => {
  const inv = getInvoice(req.params.id);
  if (!inv) {
    return res.status(404).send(layout({ title: 'Not found', nav: false, body: `<div class="checkout"><div class="card"><h1>Invoice not found</h1><p class="muted">The link may be broken or the invoice id is wrong.</p></div></div>` }));
  }
  const settings = getAllSettings();
  const brand = settings.brand_name || 'FREE-Payment-Gateways';

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
  const ctx = { baseUrl: baseUrl(req) };
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
});

// ── Start a redirect-type provider (btcpay / stripe / bkash) ────────
router.post('/pay/:id/provider/:providerId', async (req, res) => {
  const inv = getInvoice(req.params.id);
  if (!inv) return errorPage(res, 'Invoice not found', 404);
  if (inv.status !== 'pending') return errorPage(res, `Invoice is already ${inv.status}`, 409);
  const provider = getProvider(req.params.providerId);
  if (!provider || typeof provider.begin !== 'function') return errorPage(res, 'Unknown provider', 400);
  const settings = getAllSettings();
  if (!provider.isEnabled(settings)) return errorPage(res, 'This provider is not enabled', 400);
  const ctx = { baseUrl: baseUrl(req) };
  try {
    const { redirect, providerRef } = await provider.begin(inv, settings, ctx);
    const ts = nowIso();
    db.prepare('UPDATE invoices SET provider = ?, provider_ref = ?, updated_at = ? WHERE id = ?')
      .run(provider.id, providerRef || null, ts, inv.id);
    return res.redirect(redirect);
  } catch (err) {
    return errorPage(res, err.message || 'Could not start the payment provider', 502);
  }
});

// ── Demo provider completion ────────────────────────────────────────
router.post('/pay/:id/demo/complete', (req, res) => {
  const inv = getInvoice(req.params.id);
  if (!inv) return errorPage(res, 'Invoice not found', 404);
  if (inv.status !== 'pending') return successRedirect(req, res, inv);
  const settings = getAllSettings();
  if ((settings.demo_enabled ?? '1') !== '1') return errorPage(res, 'Demo provider is disabled', 400);
  const updated = markPaid(inv.id, 'demo');
  successRedirect(req, res, updated);
});

// ── Manual provider submission (awaits admin approval) ──────────────
router.post('/pay/:id/manual/submit', (req, res) => {
  const inv = getInvoice(req.params.id);
  if (!inv) return errorPage(res, 'Invoice not found', 404);
  if (inv.status !== 'pending') return successRedirect(req, res, inv);
  const trxId = String(req.body.trx_id || '').trim().slice(0, 100);
  const trxSender = String(req.body.trx_sender || '').trim().slice(0, 50);
  if (!trxId || !trxSender) return errorPage(res, 'Transaction ID and sender number are required.', 400);
  const ts = nowIso();
  db.prepare(`UPDATE invoices SET provider = 'manual', trx_id = ?, trx_sender = ?, updated_at = ? WHERE id = ?`)
    .run(trxId, trxSender, ts, inv.id);
  res.send(layout({
    title: 'Submitted', nav: false,
    body: `<div class="checkout"><div class="card" style="text-align:center">
      <div style="font-size:52px">🕐</div>
      <h1>Payment submitted</h1>
      <p class="muted">Transaction <span class="mono">${esc(trxId)}</span> is waiting for the merchant to verify it. You will be notified once it is approved.</p>
    </div></div>`,
  }));
});

// ── Provider return URLs ────────────────────────────────────────────
router.get('/pay/:id/return', (req, res) => {
  const inv = getInvoice(req.params.id);
  if (!inv) return errorPage(res, 'Invoice not found', 404);
  if (inv.status === 'paid') return successRedirect(req, res, inv);
  // Not paid yet — show a confirming page that polls status (BTCPay confirms async).
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
});

router.get('/pay/:id/status', (req, res) => {
  const inv = getInvoice(req.params.id);
  if (!inv) return res.status(404).json({ error: 'not found' });
  res.json({
    status: inv.status,
    success_url: inv.success_url ? appendQuery(inv.success_url, { fpg_payment_id: inv.id, fpg_status: inv.status }) : null,
  });
});

router.get('/pay/:id/bkash/return', async (req, res) => {
  const inv = getInvoice(req.params.id);
  if (!inv) return errorPage(res, 'Invoice not found', 404);
  const status = String(req.query.status || '');
  const paymentID = String(req.query.paymentID || inv.provider_ref || '');
  if (status !== 'success' || !paymentID) return cancelRedirect(req, res, inv);
  const provider = getProvider('bkash');
  const settings = getAllSettings();
  try {
    const result = await provider.execute(paymentID, settings);
    const done = String(result.transactionStatus || '').toLowerCase() === 'completed';
    if (done) {
      db.prepare('UPDATE invoices SET provider_ref = ? WHERE id = ?').run(paymentID, inv.id);
      const updated = markPaid(inv.id, 'bkash');
      return successRedirect(req, res, updated);
    }
    markStatus(inv.id, 'failed');
    return errorPage(res, `bKash payment not completed (status: ${result.transactionStatus || 'unknown'})`, 400);
  } catch (err) {
    return errorPage(res, err.message || 'bKash execution failed', 502);
  }
});

router.post('/pay/:id/cancel', (req, res) => {
  const inv = getInvoice(req.params.id);
  if (!inv) return errorPage(res, 'Invoice not found', 404);
  if (inv.status === 'pending') markStatus(inv.id, 'cancelled');
  cancelRedirect(req, res, inv);
});

router.get('/pay/:id/cancel', (req, res) => {
  const inv = getInvoice(req.params.id);
  if (inv && inv.status === 'pending') markStatus(inv.id, 'cancelled');
  if (inv) return cancelRedirect(req, res, inv);
  res.redirect('/');
});

function safeJson(s) { try { return JSON.parse(s || '{}'); } catch { return {}; } }

// ── Inbound provider webhooks (RAW body for signature verification) ──
const rawBody = express.raw({ type: '*/*', limit: '512kb' });

const btcpayWebhook = express.Router();
btcpayWebhook.post('/webhooks/btcpay', rawBody, (req, res) => {
  const settings = getAllSettings();
  const provider = getProvider('btcpay');
  const raw = req.body; // Buffer (express.raw)
  if (!provider.verifyWebhook(raw, req.headers, settings)) {
    return res.status(401).json({ error: 'bad signature' });
  }
  const event = provider.webhookEvent(raw);
  if (event.type === 'InvoiceSettled' || event.type === 'InvoicePaymentSettled' || event.type === 'InvoiceProcessing') {
    const row = event.invoiceId
      ? db.prepare('SELECT * FROM invoices WHERE provider_ref = ?').get(event.invoiceId)
      : null;
    if (row) markPaid(row.id, 'btcpay');
  }
  res.json({ received: true });
});

const stripeWebhook = express.Router();
stripeWebhook.post('/webhooks/stripe', rawBody, (req, res) => {
  const settings = getAllSettings();
  const provider = getProvider('stripe');
  const raw = req.body; // Buffer (express.raw)
  if (!provider.verifyWebhook(raw, req.headers, settings)) {
    return res.status(401).json({ error: 'bad signature' });
  }
  const event = provider.webhookEvent(raw);
  if (event.type === 'checkout.session.completed' && event.invoiceId) {
    markPaid(event.invoiceId, 'stripe');
  }
  res.json({ received: true });
});

module.exports = { checkoutRouter: router, btcpayWebhook, stripeWebhook };
