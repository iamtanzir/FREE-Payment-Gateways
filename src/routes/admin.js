'use strict';
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const {
  getSetting, getAllSettings, setSetting, SECRET_KEYS,
} = require('../settings');
const { layout, statusPill, esc } = require('../views');
const {
  scryptHash, scryptVerify, hmacSha256, sha256, newId, formatMoney, nowIso,
} = require('../util');
const { markPaid, markStatus, publicInvoice } = require('../lifecycle');

const COOKIE = 'fpg_admin';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const loginAttempts = new Map(); // ip → number[] (timestamps)

function sessionSecret() {
  let s = getSetting('admin_session_secret');
  if (!s) { s = crypto.randomBytes(32).toString('hex'); setSetting('admin_session_secret', s); }
  return s;
}

function signSession(exp) {
  return `${exp}.${hmacSha256(sessionSecret(), String(exp))}`;
}

function verifySession(value) {
  if (!value) return false;
  const idx = value.indexOf('.');
  if (idx < 0) return false;
  const exp = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  if (!/^\d+$/.test(exp)) return false;
  if (Number(exp) < Date.now()) return false;
  const expected = hmacSha256(sessionSecret(), exp);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function requireAdmin(req, res, next) {
  const cookies = parseCookies(req);
  if (verifySession(cookies[COOKIE])) return next();
  res.redirect('/admin/login');
}

function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const list = (loginAttempts.get(ip) || []).filter((t) => now - t < windowMs);
  loginAttempts.set(ip, list);
  return list.length >= 10;
}
function recordAttempt(ip) {
  const list = loginAttempts.get(ip) || [];
  list.push(Date.now());
  loginAttempts.set(ip, list);
}

const router = express.Router();

// ── Login / logout ──────────────────────────────────────────────────
router.get('/admin/login', (req, res) => {
  res.send(layout({
    title: 'Admin login — FREE-Payment-Gateways', nav: false,
    body: `<div class="checkout"><div class="card">
      <div class="brand" style="font-size:22px;margin-bottom:6px">⚡ FREE-Payment-Gateways</div>
      <h2>Admin dashboard</h2>
      ${req.query.err ? '<div class="alert alert-err">Wrong password. Try again.</div>' : ''}
      <form method="post" action="/admin/login">
        <label for="password">Admin password</label>
        <input id="password" name="password" type="password" required autocomplete="current-password" autofocus>
        <button type="submit" class="btn" style="width:100%;margin-top:14px">Sign in</button>
      </form>
    </div></div>`,
  }));
});

router.post('/admin/login', (req, res) => {
  const ip = req.ip || 'unknown';
  if (rateLimited(ip)) return res.status(429).send('Too many attempts. Wait 10 minutes.');
  const hash = getSetting('admin_password_hash');
  const ok = hash && scryptVerify(String(req.body.password || ''), hash);
  recordAttempt(ip);
  if (!ok) return res.redirect('/admin/login?err=1');
  loginAttempts.delete(ip);
  const exp = Date.now() + SESSION_TTL_MS;
  res.setHeader('Set-Cookie', `${COOKIE}=${signSession(exp)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${req.secure ? '; Secure' : ''}`);
  res.redirect('/admin');
});

router.get('/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.redirect('/admin/login');
});

// ── Dashboard ───────────────────────────────────────────────────────
router.get('/admin', requireAdmin, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const paidToday = db.prepare("SELECT COUNT(*) AS c, COALESCE(SUM(amount_minor),0) AS s FROM invoices WHERE status='paid' AND substr(paid_at,1,10)=?").get(today);
  const pending = db.prepare("SELECT COUNT(*) AS c FROM invoices WHERE status='pending'").get();
  const awaitingManual = db.prepare("SELECT COUNT(*) AS c FROM invoices WHERE status='pending' AND provider='manual' AND trx_id != ''").get();
  const totalPaid = db.prepare("SELECT COUNT(*) AS c, COALESCE(SUM(amount_minor),0) AS s FROM invoices WHERE status='paid'").get();
  const recent = db.prepare('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 15').all();

  res.send(layout({
    title: 'Dashboard — FREE-Payment-Gateways',
    body: `
      <h1>Dashboard</h1>
      <div class="grid grid-4">
        <div class="card"><div class="stat">${paidToday.c}<small>Paid today</small></div></div>
        <div class="card"><div class="stat">${formatMoney(paidToday.s, 'BDT')}<small>Volume today (all currencies shown as BDT)</small></div></div>
        <div class="card"><div class="stat">${pending.c}<small>Pending invoices</small></div></div>
        <div class="card"><div class="stat" style="color:var(--warn)">${awaitingManual.c}<small>Manual approvals waiting</small></div></div>
      </div>
      <div class="card" style="margin-top:16px"><h2>Totals (all time)</h2>
        <p>${totalPaid.c} paid invoices · ${formatMoney(totalPaid.s, 'BDT')} total volume</p>
      </div>
      <div class="card" style="margin-top:16px"><h2>Recent invoices</h2>
        ${invoiceTable(recent, true)}
      </div>`,
  }));
});

// ── Invoices list + actions ─────────────────────────────────────────
router.get('/admin/invoices', requireAdmin, (req, res) => {
  const status = ['pending', 'paid', 'failed', 'cancelled'].includes(String(req.query.status)) ? String(req.query.status) : null;
  const rows = status
    ? db.prepare('SELECT * FROM invoices WHERE status = ? ORDER BY created_at DESC LIMIT 200').all(status)
    : db.prepare('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 200').all();
  const manualQueue = db.prepare("SELECT * FROM invoices WHERE status='pending' AND provider='manual' AND trx_id != '' ORDER BY updated_at ASC").all();
  res.send(layout({
    title: 'Invoices — FREE-Payment-Gateways',
    body: `
      <h1>Invoices</h1>
      <p><a class="btn btn-secondary btn-sm" href="/admin/invoices">All</a>
         <a class="btn btn-secondary btn-sm" href="/admin/invoices?status=pending">Pending</a>
         <a class="btn btn-secondary btn-sm" href="/admin/invoices?status=paid">Paid</a>
         <a class="btn btn-secondary btn-sm" href="/admin/invoices?status=failed">Failed</a>
         <a class="btn btn-secondary btn-sm" href="/admin/invoices?status=cancelled">Cancelled</a></p>

      ${manualQueue.length ? `<div class="card" style="margin:14px 0;border-color:var(--warn)">
        <h2>🕐 Manual payments awaiting approval (${manualQueue.length})</h2>
        <table><thead><tr><th>Invoice</th><th>Amount</th><th>Sender</th><th>TrxID</th><th>Submitted</th><th></th></tr></thead><tbody>
        ${manualQueue.map((inv) => `<tr>
          <td class="mono">${esc(inv.id)}</td>
          <td>${esc(formatMoney(inv.amount_minor, inv.currency))}</td>
          <td>${esc(inv.trx_sender)}</td>
          <td class="mono">${esc(inv.trx_id)}</td>
          <td>${esc(inv.updated_at)}</td>
          <td style="white-space:nowrap">
            <form method="post" action="/admin/invoices/${encodeURIComponent(inv.id)}/approve" style="display:inline"><button class="btn btn-sm">Approve ✓</button></form>
            <form method="post" action="/admin/invoices/${encodeURIComponent(inv.id)}/reject" style="display:inline"><button class="btn btn-sm btn-danger">Reject ✗</button></form>
          </td>
        </tr>`).join('')}
        </tbody></table>
      </div>` : ''}

      <div class="card">${invoiceTable(rows, false)}</div>`,
  }));
});

router.post('/admin/invoices/:id/approve', requireAdmin, (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (inv && inv.status === 'pending') markPaid(inv.id, inv.provider || 'manual');
  res.redirect('/admin/invoices');
});

router.post('/admin/invoices/:id/reject', requireAdmin, (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (inv && inv.status === 'pending') markStatus(inv.id, 'failed');
  res.redirect('/admin/invoices');
});

router.post('/admin/invoices/:id/mark-paid', requireAdmin, (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (inv && inv.status !== 'paid') markPaid(inv.id, inv.provider || 'admin');
  res.redirect('/admin/invoices');
});

router.post('/admin/invoices/:id/mark-failed', requireAdmin, (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (inv && inv.status === 'pending') markStatus(inv.id, 'failed');
  res.redirect('/admin/invoices');
});

// ── Settings ────────────────────────────────────────────────────────
const TEXT_FIELDS = [
  ['brand_name', 'Brand name'], ['base_url', 'Public base URL (e.g. https://pay.yourdomain.com)'],
  ['manual_bkash_number', 'bKash number (Send Money to)'], ['manual_nagad_number', 'Nagad number'],
  ['manual_rocket_number', 'Rocket number'], ['manual_bank', 'Bank account details (free text)'],
  ['manual_note', 'Customer instructions (manual payments)'],
  ['stripe_secret_key', 'Stripe secret key (sk_live_… / sk_test_…)'],
  ['bkash_app_key', 'bKash app key'], ['bkash_username', 'bKash username'],
];
const SECRET_FIELDS = [
  ['stripe_webhook_secret', 'Stripe webhook secret (whsec_…)'],
  ['bkash_app_secret', 'bKash app secret'], ['bkash_password', 'bKash password'],
];

router.get('/admin/settings', requireAdmin, (req, res) => {
  const s = getAllSettings();
  const check = (v) => (v === '1' ? 'checked' : '');
  res.send(layout({
    title: 'Settings — FREE-Payment-Gateways',
    body: `<h1>Settings</h1>
    ${req.query.saved ? '<div class="alert alert-ok">Settings saved.</div>' : ''}
    <form method="post" action="/admin/settings">
      <div class="card">
        <h2>General</h2>
        ${TEXT_FIELDS.slice(0, 2).map(([k, label]) => `<label for="${k}">${esc(label)}</label><input id="${k}" name="${k}" value="${esc(s[k] || '')}">`).join('')}
        <label><input type="checkbox" name="demo_enabled" value="1" style="width:auto;margin-right:8px" ${check(s.demo_enabled)}> Enable Demo provider (test payments, no real money)</label>
        <label><input type="checkbox" name="manual_enabled" value="1" style="width:auto;margin-right:8px" ${check(s.manual_enabled)}> Enable Manual bKash/Nagad/Rocket/Bank provider</label>
      </div>

      <div class="card" style="margin-top:16px">
        <h2>📱 Manual payment receiving accounts</h2>
        ${TEXT_FIELDS.slice(2, 7).map(([k, label]) => `<label for="${k}">${esc(label)}</label><input id="${k}" name="${k}" value="${esc(s[k] || '')}">`).join('')}
      </div>

      <div class="card" style="margin-top:16px">
        <h2>💳 Stripe — free signup, per-transaction fee (no BDT support)</h2>
        ${TEXT_FIELDS.slice(7, 8).map(([k, label]) => `<label for="${k}">${esc(label)}</label><input id="${k}" name="${k}" type="password" value="" placeholder="${s[k] ? '•••••••• (set) — leave blank to keep' : 'not set'}" autocomplete="new-password">`).join('')}
        ${SECRET_FIELDS.slice(0, 1).map(([k, label]) => `<label for="${k}">${esc(label)} — leave blank to keep current</label><input id="${k}" name="${k}" type="password" value="" placeholder="${s[k] ? '•••••••• (set)' : 'not set'}" autocomplete="new-password">`).join('')}
      </div>

      <div class="card" style="margin-top:16px">
        <h2>🩷 bKash Tokenized Checkout — auto-verified (merchant account needed)</h2>
        <label><input type="checkbox" name="bkash_enabled" value="1" style="width:auto;margin-right:8px" ${check(s.bkash_enabled)}> Enable bKash provider</label>
        <label><input type="checkbox" name="bkash_sandbox" value="1" style="width:auto;margin-right:8px" ${check(s.bkash_sandbox)}> Sandbox mode (uncheck for live payments)</label>
        ${TEXT_FIELDS.slice(8).map(([k, label]) => `<label for="${k}">${esc(label)}</label><input id="${k}" name="${k}" value="${esc(s[k] || '')}">`).join('')}
        ${SECRET_FIELDS.slice(1).map(([k, label]) => `<label for="${k}">${esc(label)} — leave blank to keep current</label><input id="${k}" name="${k}" type="password" value="" placeholder="${s[k] ? '•••••••• (set)' : 'not set'}" autocomplete="new-password">`).join('')}
      </div>

      <div class="card" style="margin-top:16px">
        <h2>🔑 Change admin password</h2>
        <label for="new_admin_password">New password (leave blank to keep current)</label>
        <input id="new_admin_password" name="new_admin_password" type="password" autocomplete="new-password">
      </div>

      <button type="submit" class="btn" style="margin-top:16px">Save settings</button>
    </form>`,
  }));
});

router.post('/admin/settings', requireAdmin, (req, res) => {
  const body = req.body || {};
  // Plain text fields (stripe_secret_key is a secret — handled separately below)
  for (const [key] of TEXT_FIELDS) {
    if (key === 'stripe_secret_key') continue;
    setSetting(key, body[key] ?? '');
  }
  // Secrets: only overwrite when a non-empty value was typed
  for (const key of SECRET_KEYS) {
    const v = body[key];
    if (typeof v === 'string' && v.trim() !== '') setSetting(key, v.trim());
  }
  if (typeof body.stripe_secret_key === 'string' && body.stripe_secret_key.trim() !== '') {
    setSetting('stripe_secret_key', body.stripe_secret_key.trim());
  }
  // Checkboxes
  setSetting('demo_enabled', body.demo_enabled === '1' ? '1' : '0');
  setSetting('manual_enabled', body.manual_enabled === '1' ? '1' : '0');
  setSetting('bkash_enabled', body.bkash_enabled === '1' ? '1' : '0');
  setSetting('bkash_sandbox', body.bkash_sandbox === '1' ? '1' : '0');
  // Password rotation
  if (typeof body.new_admin_password === 'string' && body.new_admin_password.length >= 8) {
    setSetting('admin_password_hash', scryptHash(body.new_admin_password));
  }
  res.redirect('/admin/settings?saved=1');
});

// ── API keys ────────────────────────────────────────────────────────
router.get('/admin/keys', requireAdmin, (req, res) => {
  const keys = db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all();
  const created = req.query.created ? String(req.query.created) : null;
  res.send(layout({
    title: 'API Keys — FREE-Payment-Gateways',
    body: `<h1>Merchant API keys</h1>
      ${created ? `<div class="alert alert-ok"><strong>New key created — copy it now, it will never be shown again:</strong><code class="key">${esc(created)}</code></div>` : ''}
      <div class="card">
        <form method="post" action="/admin/keys" style="display:flex;gap:10px;align-items:flex-end">
          <div style="flex:1"><label for="label">Key label (e.g. "My website")</label><input id="label" name="label" placeholder="My website"></div>
          <button type="submit" class="btn">Create API key</button>
        </form>
      </div>
      <div class="card" style="margin-top:16px">
        <h2>Existing keys</h2>
        <table><thead><tr><th>Label</th><th>Prefix</th><th>Created</th><th>Status</th><th></th></tr></thead><tbody>
        ${keys.map(k => `<tr>
          <td>${esc(k.label)}</td>
          <td class="mono">${esc(k.prefix)}…</td>
          <td>${esc(k.created_at)}</td>
          <td>${k.revoked_at ? '<span class="pill pill-failed">REVOKED</span>' : '<span class="pill pill-paid">ACTIVE</span>'}</td>
          <td>${k.revoked_at ? '' : `<form method="post" action="/admin/keys/${encodeURIComponent(k.id)}/revoke" onsubmit="return confirm('Revoke this key?')"><button class="btn btn-sm btn-danger">Revoke</button></form>`}</td>
        </tr>`).join('')}
        </tbody></table>
      </div>
      <div class="card" style="margin-top:16px"><h2>Example request</h2>
        <pre class="mono" style="white-space:pre-wrap;background:var(--card2);padding:12px;border-radius:10px;font-size:12px">curl -X POST ${esc(getSetting('base_url') || 'http://localhost:3000')}/api/v1/checkout \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 150.50, "currency": "BDT", "description": "Order #1001",
       "customer_name": "Tanzir", "success_url": "https://yoursite.com/thanks",
       "webhook_url": "https://yoursite.com/webhooks/fpg"}'</pre>
      </div>`,
  }));
});

router.post('/admin/keys', requireAdmin, (req, res) => {
  const label = String((req.body || {}).label || 'API key').slice(0, 100);
  const rawKey = 'fpg_' + crypto.randomBytes(24).toString('base64url');
  const webhookSecret = 'whsec_' + crypto.randomBytes(24).toString('base64url');
  const id = newId('key');
  db.prepare(`INSERT INTO api_keys (id, label, prefix, key_hash, webhook_secret, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, label, rawKey.slice(0, 12), sha256(rawKey), webhookSecret, nowIso());
  // Also set the global fallback webhook secret for keys created before this existed
  if (!getSetting('global_webhook_secret')) setSetting('global_webhook_secret', webhookSecret);
  res.redirect('/admin/keys?created=' + encodeURIComponent(rawKey));
});

router.post('/admin/keys/:id/revoke', requireAdmin, (req, res) => {
  db.prepare('UPDATE api_keys SET revoked_at = ? WHERE id = ?').run(nowIso(), req.params.id);
  res.redirect('/admin/keys');
});

function invoiceTable(rows, compact) {
  if (!rows.length) return '<p class="muted">No invoices yet. Create one via the API — see API Keys page for an example.</p>';
  return `<table><thead><tr><th>ID</th><th>Amount</th><th>Customer</th><th>Provider</th><th>Status</th><th>Created</th>${compact ? '' : '<th></th>'}</tr></thead><tbody>
    ${rows.map(inv => `<tr>
      <td class="mono">${esc(inv.id)}</td>
      <td>${esc(formatMoney(inv.amount_minor, inv.currency))}</td>
      <td>${esc(inv.customer_name || inv.customer_email || '—')}${inv.trx_id ? `<br><span class="muted">TrxID: ${esc(inv.trx_id)}</span>` : ''}</td>
      <td>${esc(inv.provider || '—')}</td>
      <td>${statusPill(inv.status)}</td>
      <td>${esc((inv.created_at || '').slice(0, 19).replace('T', ' '))}</td>
      ${compact ? '' : `<td style="white-space:nowrap">
        ${inv.status === 'pending' ? `<form method="post" action="/admin/invoices/${encodeURIComponent(inv.id)}/mark-paid" style="display:inline"><button class="btn btn-sm" title="Mark as paid">Paid ✓</button></form>
        <form method="post" action="/admin/invoices/${encodeURIComponent(inv.id)}/mark-failed" style="display:inline"><button class="btn btn-sm btn-warn" title="Mark as failed">Fail ✗</button></form>` : ''}
      </td>`}
    </tr>`).join('')}
  </tbody></table>`;
}

module.exports = { router, requireAdmin };
