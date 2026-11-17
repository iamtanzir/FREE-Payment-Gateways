'use strict';
const express = require('express');
const db = require('../db');
const { getSetting } = require('../settings');
const { sha256, newId, toMinorUnits, nowIso, envBaseUrl } = require('../util');
const { publicInvoice, markStatus } = require('../lifecycle');

async function baseUrl(req) {
  const configured = (await getSetting('base_url')) || envBaseUrl();
  if (configured) return configured.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  return `${proto}://${req.get('host')}`;
}

/** Bearer-auth middleware: key → api_keys row (rejects revoked/unknown keys). */
async function apiKeyAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const m = header.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: 'Missing Authorization: Bearer <api_key>' });
    const hash = sha256(m[1].trim());
    const row = await db.prepare('SELECT * FROM api_keys WHERE key_hash = ?').get(hash);
    if (!row || row.revoked_at) return res.status(401).json({ error: 'Invalid or revoked API key' });
    req.apiKey = row;
    next();
  } catch (err) {
    next(err);
  }
}

const router = express.Router();
router.use(apiKeyAuth);

// POST /api/v1/checkout — create a checkout session
router.post('/checkout', async (req, res, next) => {
  try {
    const body = req.body || {};
    const amountMinor = toMinorUnits(body.amount);
    if (amountMinor === null) {
      return res.status(400).json({ error: 'amount must be a positive number, e.g. 150.50' });
    }
    const currency = String(body.currency || 'BDT').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      return res.status(400).json({ error: 'currency must be a 3-letter ISO code, e.g. BDT, USD' });
    }
    // Only absolute http(s) URLs or same-origin paths. `//evil.com` is rejected
    // because browsers treat it as a protocol-relative (external) URL.
    const url = (v) => {
      if (typeof v !== 'string') return '';
      const s = v.trim();
      if (/^https?:\/\/[^\s]+$/i.test(s)) return s;
      if (/^\/(?!\/)/.test(s)) return s;
      return '';
    };
    const webhookUrl = url(body.webhook_url);
    const successUrl = url(body.success_url);
    const cancelUrl = url(body.cancel_url);

    let metadata = '{}';
    if (body.metadata && typeof body.metadata === 'object') {
      metadata = JSON.stringify(body.metadata).slice(0, 4000);
    } else if (typeof body.metadata === 'string') {
      try { JSON.parse(body.metadata); metadata = body.metadata.slice(0, 4000); } catch { /* ignore */ }
    }

    const id = newId('inv');
    const ts = nowIso();
    await db.prepare(`
      INSERT INTO invoices (id, api_key_id, amount_minor, currency, description,
        customer_name, customer_email, customer_phone, status, metadata,
        success_url, cancel_url, webhook_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.apiKey.id, amountMinor, currency,
      String(body.description || '').slice(0, 500),
      String(body.customer_name || '').slice(0, 200),
      String(body.customer_email || '').slice(0, 200),
      String(body.customer_phone || '').slice(0, 50),
      metadata, successUrl, cancelUrl, webhookUrl, ts, ts
    );

    const row = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    res.status(201).json({
      ...publicInvoice(row),
      checkout_url: `${await baseUrl(req)}/pay/${id}`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/invoices — list recent invoices created by this key
// NOTE on payment-link invoices (api_key_id IS NULL): this gateway is a
// single-merchant deployment, so every API key belongs to the same merchant.
// We therefore let any valid key read link-created invoices — required for
// POS/poll flows where the link invoice has no owning key.
router.get('/invoices', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const status = req.query.status ? String(req.query.status) : null;
    const rows = status
      ? await db.prepare('SELECT * FROM invoices WHERE (api_key_id = ? OR api_key_id IS NULL) AND status = ? ORDER BY created_at DESC LIMIT ?').all(req.apiKey.id, status, limit)
      : await db.prepare('SELECT * FROM invoices WHERE (api_key_id = ? OR api_key_id IS NULL) ORDER BY created_at DESC LIMIT ?').all(req.apiKey.id, limit);
    res.json({ invoices: rows.map(publicInvoice) });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/invoices/:id — fetch one invoice (must belong to this key)
router.get('/invoices/:id', async (req, res, next) => {
  try {
    const row = await db.prepare('SELECT * FROM invoices WHERE id = ? AND (api_key_id = ? OR api_key_id IS NULL)').get(req.params.id, req.apiKey.id);
    if (!row) return res.status(404).json({ error: 'Invoice not found' });
    res.json(publicInvoice(row));
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/invoices/:id/cancel — cancel a pending invoice
router.post('/invoices/:id/cancel', async (req, res, next) => {
  try {
    const row = await db.prepare('SELECT * FROM invoices WHERE id = ? AND (api_key_id = ? OR api_key_id IS NULL)').get(req.params.id, req.apiKey.id);
    if (!row) return res.status(404).json({ error: 'Invoice not found' });
    if (row.status !== 'pending') return res.status(409).json({ error: `Invoice is already ${row.status}` });
    const updated = await markStatus(row.id, 'cancelled');
    res.json(publicInvoice(updated));
  } catch (err) {
    next(err);
  }
});

// Terminal handler for anything under /api/v1 that no route matched —
// always JSON, regardless of the client's Accept header.
router.use((req, res) => res.status(404).json({ error: 'Not found' }));

module.exports = { router, baseUrl };
