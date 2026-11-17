'use strict';
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const {
  getSetting, getAllSettings, setSetting,
} = require('../settings');
const { layout, statusPill, esc } = require('../views');
const {
  scryptHash, scryptVerify, hmacSha256, sha256, newId, formatMoney, nowIso, toMinorUnits, envBaseUrl,
} = require('../util');
const { markPaid, markStatus, publicInvoice, processDueDeliveries } = require('../lifecycle');

const COOKIE = 'fpg_admin';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const loginAttempts = new Map(); // ip → number[] (timestamps)

function isHttps(req) {
  if (req.secure) return true;
  return String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function sessionCookie(value, req) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${isHttps(req) ? '; Secure' : ''}`;
}

async function sessionSecret() {
  let s = await getSetting('admin_session_secret');
  if (!s) { s = crypto.randomBytes(32).toString('hex'); await setSetting('admin_session_secret', s); }
  return s;
}

async function signSession(exp) {
  return `${exp}.${hmacSha256(await sessionSecret(), String(exp))}`;
}

async function verifySession(value) {
  if (!value) return false;
  const idx = value.indexOf('.');
  if (idx < 0) return false;
  const exp = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  if (!/^\d+$/.test(exp)) return false;
  if (Number(exp) < Date.now()) return false;
  const expected = hmacSha256(await sessionSecret(), exp);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const name = part.slice(0, idx).trim();
    const raw = part.slice(idx + 1).trim();
    try { out[name] = decodeURIComponent(raw); } catch { out[name] = raw; }
  }
  return out;
}

async function requireAdmin(req, res, next) {
  const cookies = parseCookies(req);
  if (!(await verifySession(cookies[COOKIE]))) return res.redirect('/admin/login');
  // Admin pages contain API keys/secrets once shown — keep them out of shared caches.
  res.setHeader('Cache-Control', 'no-store');
  sweepWebhooksInBackground();
  // NOTE: no forced redirect on the default password (12345678). The merchant can use
  // every dashboard page normally — a persistent banner only reminds them to change
  // the password in Settings (it is stored hashed there, sessions invalidate).
  next();
}

// True while the merchant is still using the public default password ('12345678')
async function isDefaultPw() {
  const hash = await getSetting('admin_password_hash');
  return !!(hash && scryptVerify('12345678', hash));
}
const DEFAULT_PW_BANNER = `<div class="alert alert-err" style="font-size:13px"><strong>⚠️ Default password (12345678) এখনো সক্রিয়</strong> — তোমার dashboard সবার জন্য খোলা। এখনই <a href="/admin/settings">Settings → Change admin password</a>-এ নিজের password বসাও (কমপক্ষে ৮ অক্ষর, permanent)।</div>`;
const DEMO_BANNER = `<div class="alert alert-warn" style="font-size:13px"><strong>🧪 Demo provider ON আছে</strong> — যে কেউ "Pay now (simulated)" চেপে বিনামূল্যে invoice কে paid mark করাতে পারবে। Production-এ <a href="/admin/settings">Settings</a> থেকে Demo provider <strong>OFF</strong> করে দাও।</div>`;

function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const list = (loginAttempts.get(ip) || []).filter((t) => now - t < windowMs);
  loginAttempts.set(ip, list);
  return list.length >= 10;
}
function recordAttempt(ip) {
  if (loginAttempts.size > 5000) loginAttempts.clear(); // cap memory on long-running servers
  const list = loginAttempts.get(ip) || [];
  list.push(Date.now());
  loginAttempts.set(ip, list);
}

// Serverless hosts (Vercel) don't keep the setInterval retry worker alive, so
// sweep the webhook queue opportunistically whenever the merchant visits the
// dashboard. Throttled: at most once a minute per instance.
let lastSweepAt = 0;
function sweepWebhooksInBackground() {
  if (Date.now() - lastSweepAt < 60_000) return;
  lastSweepAt = Date.now();
  processDueDeliveries(10).catch(() => {});
}

const router = express.Router();

// ── Login / logout ──────────────────────────────────────────────────
function loginPage(error = '') {
  return layout({
    title: 'Merchant login — FREE Payment Gateways', nav: false,
    body: `<div class="checkout"><div class="card">
      <div class="brand" style="font-size:22px;margin-bottom:6px">⚡ FREE Payment Gateways</div>
      <h1 class="login-title">Merchant login</h1>
      ${error ? `<div class="alert alert-err" role="alert">${esc(error)}</div>` : ''}
      <form method="post" action="/admin/login">
        <label for="password">Admin password</label>
        <input id="password" name="password" type="password" required autocomplete="current-password" autofocus spellcheck="false" autocapitalize="off">
        <button type="submit" class="btn" style="width:100%;margin-top:14px">Sign in</button>
      </form>
      <p class="muted sm" style="margin:14px 0 0"><a href="/">← Back to home</a></p>
    </div></div>`,
  });
}

router.get('/admin/login', async (req, res, next) => {
  try {
    // Login pages must never be cached (they may contain a rate-limit / error state).
    res.setHeader('Cache-Control', 'no-store');
    // Already signed in? Go straight to the dashboard instead of asking twice.
    if (await verifySession(parseCookies(req)[COOKIE])) return res.redirect('/admin');
    let error = '';
    if (req.query.err === 'rate') error = 'Too many attempts. Try again in 10 minutes.';
    else if (req.query.err) error = 'Wrong password. Try again.';
    res.send(loginPage(error));
  } catch (err) {
    next(err);
  }
});

router.post('/admin/login', async (req, res, next) => {
  try {
    const ip = req.ip || 'unknown';
    if (rateLimited(ip)) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Retry-After', '600');
      return res.status(429).send(loginPage('Too many attempts. Try again in 10 minutes.'));
    }
    const hash = await getSetting('admin_password_hash');
    const ok = hash && scryptVerify(String(req.body.password || ''), hash);
    recordAttempt(ip);
    if (!ok) return res.redirect('/admin/login?err=1');
    loginAttempts.delete(ip);
    const exp = Date.now() + SESSION_TTL_MS;
    res.setHeader('Set-Cookie', sessionCookie(await signSession(exp), req));
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

router.get('/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.redirect('/admin/login');
});

// ── Dashboard ───────────────────────────────────────────────────────
router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const paidToday = await db.prepare("SELECT COUNT(*) AS c, COALESCE(SUM(amount_minor),0) AS s FROM invoices WHERE status='paid' AND substr(paid_at,1,10)=?").get(today);
    const pending = await db.prepare("SELECT COUNT(*) AS c FROM invoices WHERE status='pending'").get();
    const awaitingManual = await db.prepare("SELECT COUNT(*) AS c FROM invoices WHERE status='pending' AND provider IN ('manual','banglaqr') AND trx_id != ''").get();
    const totalPaid = await db.prepare("SELECT COUNT(*) AS c, COALESCE(SUM(amount_minor),0) AS s FROM invoices WHERE status='paid'").get();
    const pwDefault = await isDefaultPw();
    const demoOn = (await getSetting('demo_enabled')) === '1';
    const recent = await db.prepare('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 15').all();

    res.send(layout({
      title: 'Dashboard — FREE Payment Gateways',
      body: `
        <h1>Dashboard</h1>
        ${pwDefault ? DEFAULT_PW_BANNER : ''}
        ${demoOn ? DEMO_BANNER : ''}
        <div class="alert alert-warn" style="font-size:12px">
          ⚠️ Render Free ব্যবহার করলে restart-এ <code>data/fpg.db</code> মুছে যায়। স্থায়ী data চাইলে <code>DATABASE_URL</code> দিয়ে ফ্রি external database (Neon/Supabase/CockroachDB — 10 GB) যুক্ত করুন — <code>docs/DEPLOYMENT.md</code>-এ ধাপ দেওয়া আছে।
        </div>
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
  } catch (err) {
    next(err);
  }
});

// ── Invoices list + actions ─────────────────────────────────────────
router.get('/admin/invoices', requireAdmin, async (req, res, next) => {
  try {
    const status = ['pending', 'paid', 'failed', 'cancelled'].includes(String(req.query.status)) ? String(req.query.status) : null;
    const rows = status
      ? await db.prepare('SELECT * FROM invoices WHERE status = ? ORDER BY created_at DESC LIMIT 200').all(status)
      : await db.prepare('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 200').all();
    const manualQueue = await db.prepare("SELECT * FROM invoices WHERE status='pending' AND provider IN ('manual','banglaqr') AND trx_id != '' ORDER BY updated_at ASC").all();
    res.send(layout({
      title: 'Invoices — FREE Payment Gateways',
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
  } catch (err) {
    next(err);
  }
});

router.post('/admin/invoices/:id/approve', requireAdmin, async (req, res, next) => {
  try {
    const inv = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (inv && inv.status === 'pending') await markPaid(inv.id, inv.provider || 'manual');
    res.redirect('/admin/invoices');
  } catch (err) {
    next(err);
  }
});

router.post('/admin/invoices/:id/reject', requireAdmin, async (req, res, next) => {
  try {
    const inv = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (inv && inv.status === 'pending') await markStatus(inv.id, 'failed');
    res.redirect('/admin/invoices');
  } catch (err) {
    next(err);
  }
});

router.post('/admin/invoices/:id/mark-paid', requireAdmin, async (req, res, next) => {
  try {
    const inv = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (inv && inv.status !== 'paid') await markPaid(inv.id, inv.provider || 'admin');
    res.redirect('/admin/invoices');
  } catch (err) {
    next(err);
  }
});

router.post('/admin/invoices/:id/mark-failed', requireAdmin, async (req, res, next) => {
  try {
    const inv = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (inv && inv.status === 'pending') await markStatus(inv.id, 'failed');
    res.redirect('/admin/invoices');
  } catch (err) {
    next(err);
  }
});

// ── Settings ────────────────────────────────────────────────────────
// Free payment rails only — no per-transaction-fee providers (Stripe/bKash Tokenized removed).
// ONE source of truth: these groups drive both the rendered form and the POST
// handler, so a field can never be rendered without being saved (or vice versa).
const SETTING_GROUPS = [
  {
    title: 'General',
    fields: [
      ['brand_name', 'Brand name'],
      ['base_url', 'Public base URL (e.g. https://pay.yourdomain.com)'],
    ],
  },
  {
    title: '📱 Manual payment receiving accounts',
    intro: 'Customer এই নম্বরগুলোতে Send Money করে TrxID submit করবে; আপনি Invoices → Approve করবেন। খালি রাখলে checkout-এ সেটা দেখাবে না।',
    fields: [
      ['manual_bkash_number', 'bKash number (Send Money to)'],
      ['manual_nagad_number', 'Nagad number'],
      ['manual_rocket_number', 'Rocket number'],
      ['manual_upay_number', 'Upay number'],
      ['manual_mcash_number', 'mCash number'],
      ['manual_cellfin_number', 'Cellfin number'],
      ['manual_okwallet_number', 'OK Wallet number'],
      ['manual_ipay_number', 'iPay number'],
      ['manual_tap_number', 'Tap number'],
    ],
  },
  {
    title: '🏦 Bank transfer',
    fields: [
      ['manual_bank', 'Bank account details (free text)', 'textarea'],
    ],
  },
  {
    title: '🧾 Customer instructions',
    intro: 'Manual payment panel-এ customer এই লেখাটা দেখবে (TrxID কোথায় বসাবে ইত্যাদি)।',
    fields: [
      ['manual_note', 'Customer instructions (manual payments)', 'textarea'],
    ],
  },
  {
    title: '🇧🇩 Bangla QR — free, scan & pay (your own bank QR)',
    intro: 'নিজের bank-issued QR ব্যবহার করুন — bKash/Nagad/bank app সবই scan করতে পারে। কোনো enrollment বা fee নেই।',
    toggle: 'banglaqr_enabled',
    toggleLabel: 'Enable Bangla QR provider',
    fields: [
      ['banglaqr_qr_image', 'Bangla QR image URL (upload into public/ and use /banglaqr.png, or an https:// link)'],
      ['banglaqr_note', 'Bangla QR instructions for customers', 'textarea'],
    ],
  },
];
const TEXT_FIELDS = SETTING_GROUPS.flatMap((g) => g.fields);

function settingFieldHtml([key, label, kind], settings) {
  const val = esc(settings[key] || '');
  const control = kind === 'textarea'
    ? `<textarea id="${key}" name="${key}" rows="3">${val}</textarea>`
    : `<input id="${key}" name="${key}" value="${val}">`;
  return `<label for="${key}">${esc(label)}</label>${control}`;
}

router.get('/admin/settings', requireAdmin, async (req, res, next) => {
  try {
    const s = await getAllSettings();
    const check = (v) => (v === '1' ? 'checked' : '');
    const pwDefault = await isDefaultPw();
    res.send(layout({
      title: 'Settings — FREE Payment Gateways',
      body: `<h1>Settings</h1>
    ${pwDefault ? DEFAULT_PW_BANNER : ''}
    ${req.query.saved ? '<div class="alert alert-ok">Settings saved.</div>' : ''}
    ${req.query.pwshort ? '<div class="alert alert-err">Password too short — কমপক্ষে ৮ অক্ষরের password দিন। Password পরিবর্তন হয়নি।</div>' : ''}
    ${req.query.pwok ? '<div class="alert alert-ok" id="pwok"><strong>Password স্থায়ীভাবে পরিবর্তন হয়েছে ✅</strong> — সব পুরনো session (অন্য device) invalidate হয়েছে; এই browser-এ এখনো logged in আছেন। নতুন password মনে রাখুন।</div>' : ''}
    <div class="alert alert-warn" style="font-size:12px">
      ⚠️ <strong>Ephemeral hosting (Render Free / Vercel / Cloud Run):</strong> restart বা redeploy-এ local SQLite ফাইল মুছে যায় — Settings, API keys, invoices reset হয়।<br>
      স্থায়ী করতে <strong>Turso</strong> (<code>TURSO_DATABASE_URL</code> + <code>TURSO_AUTH_TOKEN</code> — সুপারিশকৃত) অথবা Postgres (<code>DATABASE_URL</code> — Supabase pooler / Neon / Aiven) সেট করুন। গাইড: <code>docs/VERCEL-TURSO.md</code> · <code>docs/DATABASE.md</code>
    </div>
    <form method="post" action="/admin/settings">
      <div class="card">
        <h2>General</h2>
        ${SETTING_GROUPS[0].fields.map((f) => settingFieldHtml(f, s)).join('')}
        <input type="hidden" name="demo_enabled" value="0"><label><input type="checkbox" name="demo_enabled" value="1" style="width:auto;margin-right:8px" ${check(s.demo_enabled)}> Enable Demo provider — <em>(⚠️ production-এ off রাখো)</em></label>
        <input type="hidden" name="manual_enabled" value="0"><label><input type="checkbox" name="manual_enabled" value="1" style="width:auto;margin-right:8px" ${check(s.manual_enabled)}> Enable Manual bKash/Nagad/Rocket/Bank provider</label>
      </div>

      ${SETTING_GROUPS.filter((g) => !g.toggle).slice(1).map((g) => `
      <div class="card" style="margin-top:16px">
        <h2>${g.title}</h2>
        ${g.intro ? `<p class="muted">${g.intro}</p>` : ''}
        ${g.fields.map((f) => settingFieldHtml(f, s)).join('')}
      </div>`).join('')}

      <div class="card" style="margin-top:16px">
        <h2>${SETTING_GROUPS.find((g) => g.toggle).title}</h2>
        <p class="muted">${SETTING_GROUPS.find((g) => g.toggle).intro}</p>
        <input type="hidden" name="banglaqr_enabled" value="0"><label><input type="checkbox" name="banglaqr_enabled" value="1" style="width:auto;margin-right:8px" ${check(s.banglaqr_enabled)}> ${SETTING_GROUPS.find((g) => g.toggle).toggleLabel}</label>
        ${SETTING_GROUPS.find((g) => g.toggle).fields.map((f) => settingFieldHtml(f, s)).join('')}
      </div>

      <div class="card" style="margin-top:16px">
        <h2>🔑 Change admin password</h2>
        <label for="new_admin_password">New password (leave blank to keep current — কমপক্ষে ৮ অক্ষর)</label>
        <input id="new_admin_password" name="new_admin_password" type="password" autocomplete="new-password">
        <p class="muted" style="margin-top:6px">Password বদলালে সব পুরনো session (অন্য device) logout হয়ে যাবে; এই browser-এ logged-in থাকবেন।</p>
      </div>

      <button type="submit" class="btn" style="margin-top:16px">Save settings</button>
    </form>`,
    }));
  } catch (err) {
    next(err);
  }
});

router.post('/admin/settings', requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    // Only fields present in the request are updated — a partial POST must never
    // erase settings the merchant already configured (e.g. via a minimal script).
    // An empty string is a real value now: it clears the field.
    for (const [key] of TEXT_FIELDS) {
      if (key in body) await setSetting(key, typeof body[key] === 'string' ? body[key] : '');
    }
    // Checkboxes — only when present in the request (partial posts must not reset them)
    if ('demo_enabled' in body) await setSetting('demo_enabled', body.demo_enabled === '1' ? '1' : '0');
    if ('manual_enabled' in body) await setSetting('manual_enabled', body.manual_enabled === '1' ? '1' : '0');
    if ('banglaqr_enabled' in body) await setSetting('banglaqr_enabled', body.banglaqr_enabled === '1' ? '1' : '0');

    // Password rotation — with honest feedback (short password used to be silently ignored)
    let pwResult = '';
    if (typeof body.new_admin_password === 'string' && body.new_admin_password.trim() !== '') {
      if (body.new_admin_password.trim().length >= 8) {
        await setSetting('admin_password_hash', scryptHash(body.new_admin_password.trim()));
        // Rotate the session secret → every existing session (on any device) is invalidated.
        await setSetting('admin_session_secret', crypto.randomBytes(32).toString('hex'));
        // Issue a fresh cookie for THIS browser, otherwise the redirect below would
        // bounce the merchant to the login page and the success message would never appear.
        const exp = Date.now() + SESSION_TTL_MS;
        res.setHeader('Set-Cookie', sessionCookie(await signSession(exp), req));
        pwResult = '&pwok=1';
      } else {
        pwResult = '&pwshort=1';
      }
    }
    res.redirect('/admin/settings?saved=1' + pwResult);
  } catch (err) {
    next(err);
  }
});

// ── SMS Bridge (personal/agent MFS auto-verify) ─────────────────────
function smsStatusPill(status) {
  const cls = { matched: 'paid', review: 'pending', ambiguous: 'pending', nomatch: 'cancelled', replay: 'failed', rejected: 'failed', unparsed: 'failed', logged: 'cancelled' }[status] || 'pending';
  return `<span class="pill pill-${cls}">${esc(String(status || '?').toUpperCase())}</span>`;
}

router.get('/admin/sms', requireAdmin, async (req, res, next) => {
  try {
    const s = await getAllSettings();
    const events = await db.prepare(`SELECT e.*, i.trx_id AS inv_trx FROM sms_events e LEFT JOIN invoices i ON i.id = e.invoice_id ORDER BY e.created_at DESC LIMIT 50`).all();
    const devices = await db.prepare('SELECT * FROM devices ORDER BY created_at DESC').all();
    const createdDeviceToken = req.query.device_created ? String(req.query.device_created) : null;
    const tokenSet = !!(await getSetting('sms_bridge_token_hash'));
    const base = ((await getSetting('base_url')) || envBaseUrl() || 'http://localhost:3000').replace(/\/+$/, '');
    const createdToken = req.query.created ? String(req.query.created) : null;
    const maxBdt = (Number(s.sms_auto_max_minor || 0) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
    res.send(layout({
      title: 'SMS Bridge — FREE Payment Gateways',
      body: `<h1>📲 SMS auto-verify bridge</h1>
      <p class="muted">আপনার MFS SIM-যে ফোনে বসে আছে সেখান থেকে SMS forward হলে gateway নিজেই পেমেন্ট detect করে invoice paid মার্ক করে দেয়। সম্পূর্ণ self-hosted, কোনো fee নেই। বিস্তারিত: <code>docs/AUTO-VERIFY.md</code>।</p>
      ${req.query.saved ? '<div class="alert alert-ok">Saved.</div>' : ''}

      ${createdToken ? `<div class="alert alert-ok">
        <strong>আপনার bridge token — একবারই দেখাবে, কপি করে রাখুন:</strong>
        <code class="key" id="newBridgeToken" style="margin-top:6px">${esc(createdToken)}</code>
        <button class="btn btn-secondary btn-sm" type="button" data-copy="newBridgeToken" style="margin-top:8px">📋 Copy token</button>
        <p class="muted" style="margin-top:8px">Android forwarder app-এ (MacroDroid/Tasker/SMS Gate) endpoint + header হিসেবে বসান — docs/AUTO-VERIFY.md</p>
      </div>` : ''}

      <div class="card">
        <h2>1 · Bridge token <span class="muted" style="font-weight:400;font-size:13px">(token-এর hash stored; token কখনো দেখে নিশ্চিত করা যায় না)</span></h2>
        <p>Status: ${tokenSet ? '<span class="pill pill-paid">CONFIGURED</span>' : '<span class="pill pill-failed">NOT SET</span>'} — endpoint: <code class="mono">${esc(base)}/bridge/sms</code></p>
        <form method="post" action="/admin/sms/token" style="margin-top:8px"><button class="btn ${tokenSet ? 'btn-warn' : ''}" type="submit">${tokenSet ? '🔄 Regenerate bridge token' : 'Generate bridge token'}</button></form>
        ${tokenSet ? '<p class="muted" style="margin-top:6px">নতুন token বানানো হলে পুরনো token দুটোই সঙ্গে সঙ্গে invalid হয়ে যাবে — forwarder app আপডেট করতে হবে।</p>' : ''}
      </div>

      ${createdDeviceToken ? `<div class="alert alert-ok">
        <strong>Device key — একবারই দেখাবে, কপি করে রাখুন:</strong>
        <code class="key" id="newDeviceKey" style="margin-top:6px">${esc(createdDeviceToken)}</code>
        <button class="btn btn-secondary btn-sm" type="button" data-copy="newDeviceKey" style="margin-top:8px">📋 Copy key</button>
        <p class="muted" style="margin-top:8px">Endpoint: <code class="mono">${esc(base)}/bridge/sms</code> · এই key টা আপনার Android forwarder app-এ বসান।</p>
      </div>` : ''}

      <div class="card" style="margin-top:16px">
        <h2>2 · Devices <span class="muted" style="font-weight:400;font-size:13px">(একাধিক MFS SIM/ফোন — প্রতিটির আলাদা key)</span></h2>
        <p class="muted">একই নম্বরে টাকা আসে, ফোন বদলালে, বা একাধিক SIM (যেমন bKash একটা ফোনে, Nagad আরেকটায়) আলাদা device হিসেবে যুক্ত করুন।</p>
        <form method="post" action="/admin/devices" style="display:flex;gap:10px;align-items:flex-end;margin:12px 0;flex-wrap:wrap">
          <div style="flex:1;min-width:200px"><label for="devname">Device name</label><input id="devname" name="name" placeholder="Shop counter phone (bKash)" required></div>
          <button type="submit" class="btn">+ Add device</button>
        </form>
        <table><thead><tr><th>Name</th><th>Key</th><th>Status</th><th>Last seen</th><th>Last SMS</th><th></th></tr></thead><tbody>
        ${devices.length ? devices.map((d) => `<tr>
          <td>${esc(d.name)}</td>
          <td class="mono">${esc(d.webhook_key_prefix)}…</td>
          <td>${d.revoked_at ? '<span class="pill pill-failed">REVOKED</span>' : (d.is_active ? '<span class="pill pill-paid">ACTIVE</span>' : '<span class="pill pill-cancelled">DISABLED</span>')}</td>
          <td class="mono" style="font-size:11px">${d.last_seen_at ? esc(String(d.last_seen_at).slice(5, 19).replace('T', ' ')) : '—'}</td>
          <td class="mono" style="font-size:11px">${d.last_sms_at ? esc(String(d.last_sms_at).slice(5, 19).replace('T', ' ')) : '—'}</td>
          <td style="white-space:nowrap">${d.revoked_at ? '' : `<form method="post" action="/admin/devices/${encodeURIComponent(d.id)}/toggle" style="display:inline"><button class="btn btn-sm btn-secondary">${d.is_active ? 'Disable' : 'Enable'}</button></form>
          <form method="post" action="/admin/devices/${encodeURIComponent(d.id)}/regenerate" style="display:inline" onsubmit="return confirm('Regenerate key? পুরনো key কাজ করবে না।')"><button class="btn btn-sm btn-warn">Regen key</button></form>
          <form method="post" action="/admin/devices/${encodeURIComponent(d.id)}/revoke" style="display:inline" onsubmit="return confirm('Revoke this device? এটি আর SMS পাঠাতে পারবে না।')"><button class="btn btn-sm btn-danger">Revoke</button></form>`}
          </td>
        </tr>`).join('') : '<tr><td colspan="6" class="muted">এখনো কোনো device নেই — legacy global token চালু আছে (নিচে ১ নম্বর), বা একটা device যোগ করুন।</td></tr>'}
        </tbody></table>
      </div>

      <div class="card" style="margin-top:16px">
        <h2>3 · Auto-verify settings</h2>
        <form method="post" action="/admin/sms/settings">
          <input type="hidden" name="sms_auto_verify" value="0">
          <label><input type="checkbox" name="sms_auto_verify" value="1" style="width:auto;margin-right:8px" ${s.sms_auto_verify === '1' ? 'checked' : ''}> Enable SMS auto-verify — confident match-এ invoice auto-paid</label>
          <label for="sms_auto_max">Auto-approve সর্বোচ্চ (৳) — এর চেয়ে বেশি amount হলে auto হয় না, manual review</label>
          <input id="sms_auto_max" name="sms_auto_max" type="number" min="0" step="0.01" value="${esc(maxBdt)}">
          <p class="muted">0-এর বেশি দিলেই limit প্রযোজ্য। সব amount auto করতে চাইলে 999999999 দিন।</p>
          <label for="sms_allow">Sender allowlist (optional, comma-separated — খালি = যেকোনো sender থেকে accept)</label>
          <input id="sms_allow" name="sms_allow" value="${esc(s.sms_sender_allowlist || '')}" placeholder="bKash, NAGAD, 16216, UPAY">
          <p class="muted">শুধু এই sender ID-গুলোর SMS গ্রহণ করা হবে — প্রথম verification-এর পর আপনার operator-এর exact sender ID দেখে বসান।</p>
          <button class="btn" type="submit" style="margin-top:12px">Save SMS settings</button>
        </form>
      </div>

      <div class="card" style="margin-top:16px">
        <h2>4 · Parser test <span class="muted" style="font-weight:400;font-size:13px">(কোনো data save হয় না)</span></h2>
        <form method="post" action="/admin/sms/test">
          <label for="tfrom">From (sender id as the phone shows)</label>
          <input id="tfrom" name="from" placeholder="bKash" value="bKash">
          <label for="ttext">SMS text</label>
          <textarea id="ttext" name="text" rows="3" placeholder="You have received Tk 500.00 from 01711XXXXXX. TrxID ABC123XYZ9 at 12/05/2026 14:32">You have received Tk 500.00 from 01711XXXXXX. TrxID ABC123XYZ9 at 12/05/2026 14:32</textarea>
          <button class="btn btn-secondary" type="submit" style="margin-top:10px">Parse →</button>
        </form>
        ${req.query.parsed ? `<div class="alert alert-ok" style="margin-top:12px">✅ <code class="mono">${esc(req.query.parsed)}</code></div>` : ''}
        ${req.query.parse_err ? `<div class="alert alert-err" style="margin-top:12px">❌ ${esc(req.query.parse_err)}</div>` : ''}
      </div>

      <div class="card" style="margin-top:16px">
        <h2>Recent SMS events <span class="muted" style="font-weight:400;font-size:13px">(সর্বশেষ ৫০)</span></h2>
        <table><thead><tr><th>Time</th><th>Provider</th><th>Amount</th><th>TrxID</th><th>Status</th><th>Note</th></tr></thead><tbody>
        ${events.length ? events.map((e) => `<tr>
          <td class="mono" style="font-size:11px">${esc(String(e.created_at || '').slice(5, 19).replace('T', ' '))}</td>
          <td>${esc(e.provider || '—')}<br><span class="muted" style="font-size:11px">${esc(e.sender || '')}</span></td>
          <td class="mono">${e.amount_minor ? esc(formatMoney(e.amount_minor, e.currency)) : '—'}</td>
          <td class="mono" style="font-size:11px">${esc(e.trx_id || '—')}</td>
          <td>${smsStatusPill(e.status)}</td>
          <td class="muted" style="font-size:11px">${esc(e.note || '')}</td>
        </tr>`).join('') : '<tr><td colspan="6" class="muted">এখনো কোনো SMS bridge event নেই — forwarder সেটআপ করে একটা test SMS পাঠান (Step 1–2)।</td></tr>'}
        </tbody></table>
      </div>
      <script>
      (function(){
        async function copyText(t){ try { await navigator.clipboard.writeText(t); return; } catch (e) {} var ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(e){} ta.remove(); }
        document.querySelectorAll('[data-copy]').forEach(function(btn){ btn.addEventListener('click', async function(){ var el=document.getElementById(btn.getAttribute('data-copy')); if(!el) return; await copyText(el.textContent.trim()); var o=btn.textContent; btn.textContent='✅ Copied!'; setTimeout(function(){btn.textContent=o;},1500); }); });
      })();
      </script>`,
    }));
  } catch (err) {
    next(err);
  }
});

router.post('/admin/sms/settings', requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    await setSetting('sms_auto_verify', body.sms_auto_verify === '1' ? '1' : '0');
    const bdt = Number(String(body.sms_auto_max ?? '0').replace(/,/g, ''));
    const minor = Number.isFinite(bdt) && bdt >= 0 ? Math.round(bdt * 100) : 500000;
    await setSetting('sms_auto_max_minor', String(Math.min(minor, 9000000000)));
    const allow = String(body.sms_allow ?? body.sms_sender_allowlist ?? '').slice(0, 200);
    await setSetting('sms_sender_allowlist', allow);
    res.redirect('/admin/sms?saved=1');
  } catch (err) {
    next(err);
  }
});

router.post('/admin/sms/token', requireAdmin, async (req, res, next) => {
  try {
    const token = 'sms_' + crypto.randomBytes(24).toString('base64url');
    await setSetting('sms_bridge_token_hash', sha256(token));
    res.redirect('/admin/sms?created=' + encodeURIComponent(token));
  } catch (err) {
    next(err);
  }
});

router.post('/admin/sms/test', requireAdmin, async (req, res, next) => {
  try {
    const { parsePaymentSms } = require('../mfs-parser');
    const from = String((req.body || {}).from || '');
    const text = String((req.body || {}).text || '');
    try {
      const p = parsePaymentSms({ from, text });
      const fmt = (n) => (n / 100).toFixed(2);
      res.redirect('/admin/sms?parsed=' + encodeURIComponent(`provider=${p.provider || 'unknown'} · amount=৳${fmt(p.amountMinor)} · trxId=${p.trxId} · sender=${p.sender || '—'}`));
    } catch (err) {
      res.redirect('/admin/sms?parse_err=' + encodeURIComponent(String(err.message || err)));
    }
  } catch (err) {
    next(err);
  }
});

// ── Webhook deliveries (automatic retry) ────────────────────────────
router.get('/admin/webhooks', requireAdmin, async (req, res, next) => {
  try {
    const counts = await db.prepare("SELECT status, COUNT(*) AS c FROM webhook_deliveries GROUP BY status").all();
    const c = Object.fromEntries(counts.map((r) => [r.status, r.c]));
    const rows = await db.prepare("SELECT * FROM webhook_deliveries ORDER BY created_at DESC LIMIT 100").all();
    res.send(layout({
      title: 'Webhooks — FREE Payment Gateways',
      body: `<h1>Webhook deliveries</h1>
      <p class="muted">প্রতিটি <code>payment.paid</code> webhook এখানে track হয়; ব্যর্থ হলে automatic retry (১মি / ৫মি / ৩০মি / ২ঘণ্টা, সর্বোচ্চ ৫ বার)। Production-এ তোমার endpoint down থাকলেও webhook হারাবে না।</p>
      <div class="grid grid-4">
        <div class="card"><div class="stat" style="color:var(--warn)">${c.pending || 0}<small>Pending</small></div></div>
        <div class="card"><div class="stat" style="color:var(--accent)">${c.delivered || 0}<small>Delivered</small></div></div>
        <div class="card"><div class="stat" style="color:var(--danger)">${c.failed || 0}<small>Failed</small></div></div>
        <div class="card"><div class="stat">${rows.length}<small>Showing</small></div></div>
      </div>
      <form method="post" action="/admin/webhooks/sweep" style="margin:14px 0"><button class="btn btn-secondary btn-sm">🔄 Retry due deliveries now</button></form>
      <div class="card">
        <h2>Recent deliveries</h2>
        <table><thead><tr><th>Time</th><th>Event</th><th>URL</th><th>Attempts</th><th>Status</th><th></th></tr></thead><tbody>
        ${rows.length ? rows.map((d) => `<tr>
          <td class="mono" style="font-size:11px">${esc(String(d.created_at || '').slice(5, 19).replace('T', ' '))}</td>
          <td class="mono" style="font-size:12px">${esc(d.event)}</td>
          <td class="mono" style="font-size:11px;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(d.url)}">/${esc(String(d.url).replace(/^https?:\/\/[^/]+/, ''))}</td>
          <td class="mono">${esc(String(d.attempts))}/${esc(String(d.max_attempts))}</td>
          <td><span class="pill pill-${d.status === 'delivered' ? 'paid' : d.status === 'failed' ? 'failed' : 'pending'}">${esc(String(d.status).toUpperCase())}</span>${d.last_status_code ? `<br><span class="muted" style="font-size:11px">HTTP ${esc(String(d.last_status_code))}</span>` : ''}</td>
          <td>${d.status !== 'delivered' ? `<form method="post" action="/admin/webhooks/${encodeURIComponent(d.id)}/retry" style="display:inline"><button class="btn btn-sm btn-secondary">Retry</button></form>` : ''}</td>
        </tr>`).join('') : '<tr><td colspan="6" class="muted">এখনো কোনো webhook নেই — কোনো invoice paid হলে এখানে আসবে।</td></tr>'}
        </tbody></table>
      </div>`,
    }));
  } catch (err) {
    next(err);
  }
});

router.post('/admin/webhooks/:id/retry', requireAdmin, async (req, res, next) => {
  try {
    const { requeueDelivery } = require('../lifecycle');
    await requeueDelivery(req.params.id);
    res.redirect('/admin/webhooks');
  } catch (err) {
    next(err);
  }
});

router.post('/admin/webhooks/sweep', requireAdmin, async (req, res, next) => {
  try {
    const { processDueDeliveries } = require('../lifecycle');
    await processDueDeliveries(50);
    res.redirect('/admin/webhooks');
  } catch (err) {
    next(err);
  }
});

// ── Devices (per-device bridge keys for SMS forwarders) ─────────────
router.post('/admin/devices', requireAdmin, async (req, res, next) => {
  try {
    const name = String((req.body || {}).name || 'Device').slice(0, 60).trim() || 'Device';
    const id = newId('dev');
    const key = 'whd_' + crypto.randomBytes(20).toString('base64url');
    await db.prepare('INSERT INTO devices (id, name, webhook_key_hash, webhook_key_prefix, is_active, created_at, revoked_at) VALUES (?, ?, ?, ?, 1, ?, NULL)')
      .run(id, name, sha256(key), key.slice(0, 12), nowIso());
    res.redirect('/admin/sms?device_created=' + encodeURIComponent(key));
  } catch (err) {
    next(err);
  }
});

router.post('/admin/devices/:id/toggle', requireAdmin, async (req, res, next) => {
  try {
    await db.prepare('UPDATE devices SET is_active = 1 - is_active WHERE id = ? AND revoked_at IS NULL').run(req.params.id);
    res.redirect('/admin/sms');
  } catch (err) {
    next(err);
  }
});

router.post('/admin/devices/:id/revoke', requireAdmin, async (req, res, next) => {
  try {
    await db.prepare('UPDATE devices SET revoked_at = ?, is_active = 0 WHERE id = ? AND revoked_at IS NULL').run(nowIso(), req.params.id);
    res.redirect('/admin/sms');
  } catch (err) {
    next(err);
  }
});

router.post('/admin/devices/:id/regenerate', requireAdmin, async (req, res, next) => {
  try {
    const key = 'whd_' + crypto.randomBytes(20).toString('base64url');
    await db.prepare('UPDATE devices SET webhook_key_hash = ?, webhook_key_prefix = ?, revoked_at = NULL, is_active = 1 WHERE id = ?')
      .run(sha256(key), key.slice(0, 12), req.params.id);
    res.redirect('/admin/sms?device_created=' + encodeURIComponent(key));
  } catch (err) {
    next(err);
  }
});

// ── API keys ────────────────────────────────────────────────────────
router.get('/admin/keys', requireAdmin, async (req, res, next) => {
  try {
    const keys = await db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all();
    const baseUrlValue = await getSetting('base_url');
    const created = req.query.created ? String(req.query.created) : null;
    res.send(layout({
      title: 'API Keys — FREE Payment Gateways',
      body: `<h1>Merchant API keys</h1>
        ${created ? `<div class="alert alert-ok">
          <strong>New key created — copy it now, it will never be shown again:</strong>
          <div style="display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap">
            <code class="key" id="newApiKey" style="flex:1;min-width:280px">${esc(created)}</code>
            <button class="btn btn-sm" type="button" id="copyNewKeyBtn">📋 Copy key</button>
          </div>
        </div>` : ''}
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
          <pre id="exampleCurl" class="mono" style="white-space:pre-wrap;background:var(--card2);padding:12px;border-radius:10px;font-size:12px">curl -X POST ${esc(baseUrlValue || envBaseUrl() || 'http://localhost:3000')}/api/v1/checkout \
  -H "Authorization: Bearer ${esc(created || 'YOUR_API_KEY')}" \
  -H "Content-Type: application/json" \
  -d '{"amount": 150.50, "currency": "BDT", "description": "Order #1001",
       "customer_name": "Tanzir", "success_url": "https://yoursite.com/thanks",
       "webhook_url": "https://yoursite.com/webhooks/fpg"}'</pre>
          <button class="btn btn-secondary btn-sm" type="button" id="copyCurlBtn" style="margin-top:8px">📋 Copy cURL</button>
        </div>
        <script>
        (function(){
          async function copyText(t){
            try { await navigator.clipboard.writeText(t); return; } catch (e) {}
            var ta = document.createElement('textarea'); ta.value = t; ta.style.position='fixed'; ta.style.opacity='0';
            document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove();
          }
          var kBtn = document.getElementById('copyNewKeyBtn');
          if (kBtn) kBtn.addEventListener('click', async function(){
            var el = document.getElementById('newApiKey'); if (!el) return;
            await copyText(el.textContent.trim());
            kBtn.textContent = '✅ Copied!'; setTimeout(function(){ kBtn.textContent = '📋 Copy key'; }, 1600);
          });
          var cBtn = document.getElementById('copyCurlBtn');
          if (cBtn) cBtn.addEventListener('click', async function(){
            var el = document.getElementById('exampleCurl'); if (!el) return;
            await copyText(el.innerText);
            cBtn.textContent = '✅ Copied!'; setTimeout(function(){ cBtn.textContent = '📋 Copy cURL'; }, 1600);
          });
        })();
        </script>`,
    }));
  } catch (err) {
    next(err);
  }
});

router.post('/admin/keys', requireAdmin, async (req, res, next) => {
  try {
    const label = String((req.body || {}).label || 'API key').slice(0, 100);
    const rawKey = 'fpg_' + crypto.randomBytes(24).toString('base64url');
    const webhookSecret = 'whsec_' + crypto.randomBytes(24).toString('base64url');
    const id = newId('key');
    await db.prepare(`INSERT INTO api_keys (id, label, prefix, key_hash, webhook_secret, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, label, rawKey.slice(0, 12), sha256(rawKey), webhookSecret, nowIso());
    // Also set the global fallback webhook secret for keys created before this existed
    if (!(await getSetting('global_webhook_secret'))) await setSetting('global_webhook_secret', webhookSecret);
    res.redirect('/admin/keys?created=' + encodeURIComponent(rawKey));
  } catch (err) {
    next(err);
  }
});

router.post('/admin/keys/:id/revoke', requireAdmin, async (req, res, next) => {
  try {
    await db.prepare('UPDATE api_keys SET revoked_at = ? WHERE id = ?').run(nowIso(), req.params.id);
    res.redirect('/admin/keys');
  } catch (err) {
    next(err);
  }
});

// ── Payment Links (no-code, shareable pay URLs) ────────────────────
router.get('/admin/links', requireAdmin, async (req, res, next) => {
  try {
    const links = await db.prepare('SELECT * FROM payment_links ORDER BY created_at DESC').all();
    const createdId = req.query.created ? String(req.query.created) : null;
    const created = createdId ? links.find((l) => l.id === createdId) : null;
    const base = ((await getSetting('base_url')) || envBaseUrl() || 'http://localhost:3000').replace(/\/+$/, '');
    res.send(layout({
      title: 'Pay Links — FREE Payment Gateways',
      body: `<h1>Payment links</h1>
      <p class="muted">Fixed/reusable pay URL — SMS, WhatsApp, POS screen, invoice ইমেইলে যেকোনো জায়গায় share করুন। Customer ক্লিক করলে hosted checkout ওপেন হয়; কোনো API বা code লাগে না।</p>
      ${req.query.err ? '<div class="alert alert-err">Invalid input — amount (positive number) আর currency (3-letter ISO) ঠিক আছে কিনা দেখুন।</div>' : ''}
      ${created ? `<div class="alert alert-ok">
        <strong>✅ Link তৈরি হয়েছে — URL ও webhook secret একবারই দেখাবে:</strong>
        <code class="key" id="newLinkUrl" style="margin-top:6px">${esc(base)}/l/${esc(created.id)}</code>
        <button class="btn btn-secondary btn-sm" type="button" data-copy="newLinkUrl" style="margin-top:8px">📋 Copy link</button>
        <label style="margin-top:12px">Webhook secret (স্বাক্ষর যাচাইয়ের জন্য — link তোমার integration-এ signature match করতে এই secret ব্যবহার করবে)</label>
        <code class="key" id="newLinkSecret">${esc(created.webhook_secret)}</code>
        <button class="btn btn-secondary btn-sm" type="button" data-copy="newLinkSecret" style="margin-top:8px">📋 Copy secret</button>
      </div>` : ''}
      <div class="card">
        <form method="post" action="/admin/links" class="grid grid-2" style="gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
          <div><label for="label">Label (internal name)</label><input id="label" name="label" placeholder="ISP bill - June" required></div>
          <div><label for="amount">Amount</label><input id="amount" name="amount" type="number" step="0.01" min="0.01" placeholder="349.00" required></div>
          <div><label for="currency">Currency</label><input id="currency" name="currency" value="BDT" maxlength="3" required></div>
          <div><label for="max_uses">Max uses (0 = unlimited)</label><input id="max_uses" name="max_uses" type="number" min="0" value="0"></div>
          <div style="grid-column:1/-1"><label for="description">Description (customer checkout-এ দেখবে)</label><input id="description" name="description" placeholder="ISP monthly bill — June 2026"></div>
          <div style="grid-column:1/-1"><label for="webhook_url">Webhook URL (optional — paid হলে POST হবে, link-এর secret দিয়ে signed)</label><input id="webhook_url" name="webhook_url" type="url" placeholder="https://yoursite.com/webhooks/fpg"></div>
          <div style="grid-column:1/-1"><label for="success_url">Success redirect URL (optional)</label><input id="success_url" name="success_url" type="url" placeholder="https://yoursite.com/thanks"></div>
          <div style="grid-column:1/-1"><button type="submit" class="btn">+ Create payment link</button></div>
        </form>
      </div>
      <div class="card" style="margin-top:16px">
        <h2>Existing links</h2>
        <table><thead><tr><th>Label</th><th>Amount</th><th>Uses</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>
        ${links.length ? links.map((l) => `<tr>
          <td>${esc(l.label)}<br><span class="muted mono" style="font-size:11px">/l/${esc(l.id)}</span></td>
          <td class="mono">${esc(formatMoney(l.amount_minor, l.currency))}</td>
          <td class="mono">${esc(String(l.uses))} / ${l.max_uses > 0 ? esc(String(l.max_uses)) : '∞'}</td>
          <td>${l.revoked_at ? '<span class="pill pill-failed">REVOKED</span>' : (l.enabled ? '<span class="pill pill-paid">ACTIVE</span>' : '<span class="pill pill-cancelled">DISABLED</span>')}</td>
          <td>${esc((l.created_at || '').slice(0, 19).replace('T', ' '))}</td>
          <td style="white-space:nowrap">
            ${l.revoked_at ? '' : `<form method="post" action="/admin/links/${encodeURIComponent(l.id)}/toggle" style="display:inline"><button class="btn btn-sm btn-secondary">${l.enabled ? 'Disable' : 'Enable'}</button></form>
            <form method="post" action="/admin/links/${encodeURIComponent(l.id)}/revoke" style="display:inline" onsubmit="return confirm('Revoke this link? এটি আর কাজ করবে না।')"><button class="btn btn-sm btn-danger">Revoke</button></form>`}
          </td>
        </tr>`).join('') : '<tr><td colspan="6" class="muted">এখনো কোনো payment link নেই — উপরের ফর্ম দিয়ে প্রথমটা বানাও (যেমন: ISP bill, donation, দোকানের counter)।</td></tr>'}
        </tbody></table>
      </div>
      <script>
      (function(){
        async function copyText(t){
          try { await navigator.clipboard.writeText(t); return true; } catch (e) {}
          var ta = document.createElement('textarea'); ta.value = t; ta.style.position='fixed'; ta.style.opacity='0';
          document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); return true;
        }
        document.querySelectorAll('[data-copy]').forEach(function(btn){
          btn.addEventListener('click', async function(){
            var el = document.getElementById(btn.getAttribute('data-copy')); if (!el) return;
            await copyText(el.textContent.trim());
            var orig = btn.textContent; btn.textContent = '✅ Copied!'; setTimeout(function(){ btn.textContent = orig; }, 1500);
          });
        });
      })();
      </script>`,
    }));
  } catch (err) {
    next(err);
  }
});

router.post('/admin/links', requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const amountMinor = toMinorUnits(body.amount);
    const currency = String(body.currency || 'BDT').trim().toUpperCase();
    if (amountMinor === null || !/^[A-Z]{3}$/.test(currency)) return res.redirect('/admin/links?err=1');
    // Only absolute http(s) URLs or same-origin paths. `//evil.com` is rejected
    // because browsers treat it as a protocol-relative (external) URL.
    const url = (v) => {
      if (typeof v !== 'string') return '';
      const s = v.trim();
      if (/^https?:\/\/[^\s]+$/i.test(s)) return s;
      if (/^\/(?!\/)/.test(s)) return s;
      return '';
    };
    const label = String(body.label || 'Payment link').slice(0, 100);
    const description = String(body.description || label).slice(0, 500);
    let maxUses = parseInt(body.max_uses, 10);
    if (!Number.isFinite(maxUses) || maxUses < 0) maxUses = 0;
    maxUses = Math.min(maxUses, 1_000_000);
    const id = newId('plink');
    const secret = 'whsec_' + crypto.randomBytes(24).toString('base64url');
    await db.prepare(`INSERT INTO payment_links (id, label, amount_minor, currency, description, webhook_url, success_url, cancel_url, webhook_secret, max_uses, uses, enabled, created_at, revoked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, NULL)`)
      .run(id, label, amountMinor, currency, description, url(body.webhook_url), url(body.success_url), url(body.cancel_url), secret, maxUses, nowIso());
    res.redirect('/admin/links?created=' + encodeURIComponent(id));
  } catch (err) {
    next(err);
  }
});

router.post('/admin/links/:id/revoke', requireAdmin, async (req, res, next) => {
  try {
    await db.prepare('UPDATE payment_links SET revoked_at = ?, enabled = 0 WHERE id = ? AND revoked_at IS NULL').run(nowIso(), req.params.id);
    res.redirect('/admin/links');
  } catch (err) {
    next(err);
  }
});

router.post('/admin/links/:id/toggle', requireAdmin, async (req, res, next) => {
  try {
    await db.prepare('UPDATE payment_links SET enabled = 1 - enabled WHERE id = ? AND revoked_at IS NULL').run(req.params.id);
    res.redirect('/admin/links');
  } catch (err) {
    next(err);
  }
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
