'use strict';
// End-to-end smoke test: admin → API key → checkout → demo payment → webhook → manual approval.
// Run: npm test
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const TMP_DB = path.join(os.tmpdir(), `fpg-smoke-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = TMP_DB;
process.env.ADMIN_PASSWORD = 'test-admin-password-123';
delete process.env.BASE_URL;
process.env.SPA_ENABLED = ''; // single-merchant default mode for smoke tests (opts out of .env's SPA_ENABLED=1)

const assert = (cond, msg) => { if (!cond) { console.error('❌ FAIL:', msg); process.exitCode = 1; throw new Error(msg); } };

async function main() {
  const { createApp } = require('../src/server');
  const db = require('../src/db');
  const { sha256, hmacSha256 } = require('../src/util');

  const app = await createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  console.log('Gateway listening at', base);

  // ── Webhook receiver ─────────────────────────────────────────────
  const webhookHits = [];
  const webhookServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => body += c);
    req.on('end', () => { webhookHits.push({ headers: req.headers, body }); res.writeHead(200).end('ok'); });
  });
  await new Promise((r) => webhookServer.listen(0, () => r()));
  const webhookUrl = `http://127.0.0.1:${webhookServer.address().port}/webhooks/fpg`;

  try {
    // ── Health ─────────────────────────────────────────────────────
    const health = await fetch(`${base}/health`).then(r => r.json());
    assert(health.ok === true, '/health returns ok');
    assert(health.version === require('../package.json').version, '/health version matches package.json');
    assert(['sqlite', 'turso', 'postgres'].includes(health.db), '/health reports the active database backend → ' + health.db);
    console.log('✓ health check');

    // ── Public landing page at "/" → merchant login lives at /admin/login ──
    {
      process.env.LANDING_PAGE = '1';
      const home = await fetch(`${base}/`);
      const html = await home.text();
      assert(home.status === 200, '/ serves the public landing page');
      assert((home.headers.get('content-type') || '').includes('text/html'), '/ is HTML');
      assert(html.includes('href="/admin/login"'), 'landing page links to the merchant login');
      assert(/id="rails"/.test(html) && /Payment rails/.test(html), 'landing page lists the supported rails');
      assert(/bKash/.test(html) && /Nagad/.test(html), 'landing page names the supported rails');
      assert(html.includes('iamtanzir.github.io'), 'landing page keeps the footer credit');
      assert((html.match(/Built with/g) || []).length === 1, 'landing footer credit appears exactly once');
      assert((html.match(/class="login-btn"/g) || []).length === 1, 'landing page has exactly one Merchant login button');
      assert(html.includes('href="#quickstart"'), 'hero CTA scrolls to the quick start (no duplicate login button)');
      assert(html.includes('aria-label="GitHub repository"'), 'icon-only GitHub link has an accessible name');
      const loginPage = await fetch(`${base}/admin/login`);
      assert(loginPage.status === 200, 'merchant login is reachable after the landing page');
      assert((loginPage.headers.get('cache-control') || '').includes('no-store'), 'login page is not cached');
      const loginHtml = await loginPage.text();
      assert(/<h1[^>]*class="login-title"/.test(loginHtml), 'login page has a semantic h1');
      assert((loginHtml.match(/Built with/g) || []).length === 1, 'login footer credit appears exactly once');
      console.log('✓ landing page at / → merchant login at /admin/login');

      process.env.LANDING_PAGE = '0';
      const old = await fetch(`${base}/`, { redirect: 'manual' });
      assert(old.status === 302 && (old.headers.get('location') || '').endsWith('/admin'), 'LANDING_PAGE=0 restores the / → /admin redirect');
      process.env.LANDING_PAGE = '1';
      console.log('✓ LANDING_PAGE=0 escape hatch works');
    }

    // ── /app defaults to redirect (single-merchant mode; SPA behind SPA_ENABLED=1) ──
    {
      const dash = await fetch(`${base}/app/`, { redirect: 'manual' });
      assert(dash.status === 302, '/app/ redirects to /admin by default (no email)');
      assert((dash.headers.get('location') || '').endsWith('/admin'), '/app/ redirect target is /admin');
      console.log('✓ /app redirects to /admin by default');
    }

    // ── Admin login ────────────────────────────────────────────────
    const loginRes = await fetch(`${base}/admin/login`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password: 'test-admin-password-123' }),
    });
    assert(loginRes.status === 303, 'admin login redirects (303 post-redirect), got ' + loginRes.status);
    const cookies = loginRes.headers.getSetCookie();
    const adminCookie = (cookies.find(c => c.startsWith('fpg_admin=')) || '').split(';')[0];
    assert(adminCookie.length > 10, 'admin session cookie set');
    console.log('✓ admin login');

    const dash = await fetch(`${base}/admin`, { headers: { Cookie: adminCookie }, redirect: 'manual' });
    assert(dash.status === 200, 'admin dashboard loads');
    const dashHtml = await dash.text();
    assert((dashHtml.match(/Built with/g) || []).length === 1, 'dashboard footer credit appears exactly once');
    assert(dashHtml.includes('iamtanzir.github.io'), 'dashboard footer keeps the credit link');
    console.log('✓ admin dashboard');

    // An already-signed-in merchant never sees the login form a second time.
    const relogin = await fetch(`${base}/admin/login`, { headers: { Cookie: adminCookie }, redirect: 'manual' });
    assert(relogin.status === 302 && (relogin.headers.get('location') || '').endsWith('/admin'), 'signed-in merchant skips the login page');
    console.log('✓ login page skipped when already signed in');

    // ── Seed an API key directly (deterministic for the test) ──────
    const rawKey = 'fpg_test_smoke_key_1234567890';
    const secret = 'whsec_smoke_test_secret';
    await db.prepare(`INSERT INTO api_keys (id, label, prefix, key_hash, webhook_secret, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run('key_smoke', 'smoke-test', rawKey.slice(0, 12), sha256(rawKey), secret, new Date().toISOString());

    // ── Unauthenticated request rejected ───────────────────────────
    const unauth = await fetch(`${base}/api/v1/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert(unauth.status === 401, 'API rejects missing key with 401');
    console.log('✓ api auth required');

    // ── Create checkout ────────────────────────────────────────────
    const createRes = await fetch(`${base}/api/v1/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({
        amount: '150.50', currency: 'BDT', description: 'Smoke order #1',
        customer_name: 'Tanzir', success_url: 'https://example.com/ok',
        webhook_url: webhookUrl, metadata: { order_id: 'SMOKE-1' },
      }),
    });
    assert(createRes.status === 201, 'checkout created (201), got ' + createRes.status);
    const invoice = await createRes.json();
    assert(invoice.checkout_url && invoice.checkout_url.startsWith('http'), 'checkout_url returned');
    assert(Math.abs(invoice.amount - 150.5) < 1e-9, 'amount parsed as 150.50');
    const invoiceId = invoice.id;
    console.log('✓ checkout created', invoiceId);

    // ── Hosted page renders ────────────────────────────────────────
    const page = await fetch(`${base}/pay/${invoiceId}`);
    const html = await page.text();
    assert(page.status === 200 && html.includes('150.50'), 'hosted checkout page renders amount');
    assert(html.includes('Demo'), 'hosted page shows demo provider');
    console.log('✓ hosted checkout page');

    // ── Complete demo payment ──────────────────────────────────────
    const payRes = await fetch(`${base}/pay/${invoiceId}/demo/complete`, { method: 'POST', redirect: 'manual' });
    assert(payRes.status === 303, 'demo complete redirects (303 after POST)');
    const loc = payRes.headers.get('location') || '';
    assert(loc.startsWith('https://example.com/ok') && loc.includes('fpg_status=paid'), 'redirects to success_url with fpg_status=paid → ' + loc);
    console.log('✓ demo payment completed');

    // ── Invoice now paid (via API) ─────────────────────────────────
    const invRes = await fetch(`${base}/api/v1/invoices/${invoiceId}`, { headers: { Authorization: `Bearer ${rawKey}` } });
    const inv = await invRes.json();
    assert(inv.status === 'paid', 'invoice status paid');
    console.log('✓ invoice paid via API');

    // ── Allow the webhook a moment, then verify signature ──────────
    const deadline = Date.now() + 5000;
    while (webhookHits.length === 0 && Date.now() < deadline) {
      await new Promise(r => setImmediate(r));
    }
    assert(webhookHits.length === 1, 'webhook delivered to merchant URL');
    const hit = webhookHits[0];
    const expected = 'sha256=' + hmacSha256(secret, hit.body);
    assert(hit.headers['x-fpg-signature'] === expected, 'webhook HMAC signature matches');
    const payload = JSON.parse(hit.body);
    assert(payload.type === 'payment.paid' && payload.data.id === invoiceId, 'webhook payload correct');
    console.log('✓ webhook signature verified (payment.paid)');

    // ── Manual provider: submit + admin approve ────────────────────
    const create2 = await fetch(`${base}/api/v1/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ amount: 200, currency: 'BDT', description: 'Manual bKash test' }),
    });
    const invoice2 = await create2.json();
    const manualRes = await fetch(`${base}/pay/${invoice2.id}/manual/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ trx_id: 'SMOKETRY123', trx_sender: '01711111111' }),
    });
    assert(manualRes.status === 200, 'manual submission accepted');
    const approve = await fetch(`${base}/admin/invoices/${invoice2.id}/approve`, {
      method: 'POST', redirect: 'manual', headers: { Cookie: adminCookie },
    });
    assert(approve.status === 303, 'admin approve redirects (303)');
    const inv2 = await fetch(`${base}/api/v1/invoices/${invoice2.id}`, { headers: { Authorization: `Bearer ${rawKey}` } }).then(r => r.json());
    assert(inv2.status === 'paid', 'manual invoice approved → paid');
    console.log('✓ manual bKash flow (submit → admin approve → paid)');

    // ── Input validation: bad amount / currency rejected ───────────
    const badAmount = await fetch(`${base}/api/v1/checkout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ amount: '-50', currency: 'BDT' }),
    });
    assert(badAmount.status === 400, 'negative amount rejected (400)');
    const badCurrency = await fetch(`${base}/api/v1/checkout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ amount: 100, currency: 'Bangladeshi' }),
    });
    assert(badCurrency.status === 400, 'invalid currency rejected (400)');
    console.log('✓ input validation (amount/currency)');

    // ── Malformed JSON body → 400, not 500 ────────────────────────
    const badJson = await fetch(`${base}/api/v1/checkout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
      body: '{not json',
    });
    assert(badJson.status === 400, 'malformed JSON returns 400 (not 500), got ' + badJson.status);
    console.log('✓ malformed JSON → 400 not 500');

    // ── Invoice listing works ─────────────────────────────────────
    const list = await fetch(`${base}/api/v1/invoices?limit=10`, { headers: { Authorization: `Bearer ${rawKey}` } }).then(r => r.json());
    assert(Array.isArray(list.invoices) && list.invoices.length >= 2, 'invoice listing returns our invoices');
    console.log('✓ invoice list endpoint');

    // ── Wrong admin password rejected ─────────────────────────────
    const wrongLogin = await fetch(`${base}/admin/login`, {
      method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password: 'definitely-wrong' }),
    });
    assert(wrongLogin.status === 303 && (wrongLogin.headers.get('location') || '').includes('err=1'), 'wrong admin password rejected');
    console.log('✓ wrong password rejected');

    // ── Unknown API route returns JSON 404 ────────────────────────
    const notFound = await fetch(`${base}/api/v1/definitely-not-a-route`, { headers: { Authorization: `Bearer ${rawKey}` } });
    assert(notFound.status === 404 && (await notFound.json()).error, 'unknown route → JSON 404');
    console.log('✓ 404 JSON for unknown routes');

    // ── Cancel flow ───────────────────────────────────────────────
    const create3 = await fetch(`${base}/api/v1/checkout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ amount: 300, currency: 'BDT', description: 'Cancel flow test' }),
    });
    const invoice3 = await create3.json();
    const cancel = await fetch(`${base}/api/v1/invoices/${invoice3.id}/cancel`, {
      method: 'POST', headers: { Authorization: `Bearer ${rawKey}` },
    });
    assert(cancel.status === 200, 'pending invoice can be cancelled');
    const cancelAgain = await fetch(`${base}/api/v1/invoices/${invoice3.id}/cancel`, {
      method: 'POST', headers: { Authorization: `Bearer ${rawKey}` },
    });
    assert(cancelAgain.status === 409, 'double-cancel rejected (409)');
    const closedPage = await fetch(`${base}/pay/${invoice3.id}`);
    assert((await closedPage.text()).includes('cancelled'), 'cancelled invoice renders closed page');
    console.log('✓ cancel flow');

    // ── Admin reject (manual submission rejected → failed) ────────
    const create4 = await fetch(`${base}/api/v1/checkout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ amount: 400, currency: 'BDT', description: 'Reject flow test' }),
    });
    const invoice4 = await create4.json();
    await fetch(`${base}/pay/${invoice4.id}/manual/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ trx_id: 'REJECTME', trx_sender: '01811111111' }),
    });
    const reject = await fetch(`${base}/admin/invoices/${invoice4.id}/reject`, {
      method: 'POST', redirect: 'manual', headers: { Cookie: adminCookie },
    });
    assert(reject.status === 303, 'admin reject redirects (303)');
    const inv4 = await fetch(`${base}/api/v1/invoices/${invoice4.id}`, { headers: { Authorization: `Bearer ${rawKey}` } }).then(r => r.json());
    assert(inv4.status === 'failed', 'rejected manual payment → failed');
    console.log('✓ manual reject flow');

    // ── Admin force mark-paid fires webhook ───────────────────────
    const create5 = await fetch(`${base}/api/v1/checkout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ amount: 500, currency: 'BDT', description: 'Mark-paid flow', webhook_url: webhookUrl }),
    });
    const invoice5 = await create5.json();
    const hitsBefore = webhookHits.length;
    const markPaidRes = await fetch(`${base}/admin/invoices/${invoice5.id}/mark-paid`, {
      method: 'POST', redirect: 'manual', headers: { Cookie: adminCookie },
    });
    assert(markPaidRes.status === 303, 'admin mark-paid redirects (303)');
    const deadline2 = Date.now() + 5000;
    while (webhookHits.length === hitsBefore && Date.now() < deadline2) {
      await new Promise(r => setImmediate(r));
    }
    assert(webhookHits.length === hitsBefore + 1, 'webhook delivered after admin mark-paid');
    const inv5 = await fetch(`${base}/api/v1/invoices/${invoice5.id}`, { headers: { Authorization: `Bearer ${rawKey}` } }).then(r => r.json());
    assert(inv5.status === 'paid', 'admin mark-paid sets invoice paid');
    console.log('✓ admin mark-paid + webhook');

    // ── Webhook retry: endpoint 500s first, retry delivers ─────────
    let flakeHits = 0;
    const flakeServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        flakeHits++;
        if (flakeHits === 1) { res.writeHead(500).end('temporary failure'); } else { res.writeHead(200).end('ok'); }
      });
    });
    await new Promise(r => flakeServer.listen(0, r));
    const flakeUrl = `http://127.0.0.1:${flakeServer.address().port}/hook`;
    const create6 = await fetch(`${base}/api/v1/checkout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ amount: 700, currency: 'BDT', description: 'Webhook retry test', webhook_url: flakeUrl }),
    });
    const invoice6 = await create6.json();
    await fetch(`${base}/admin/invoices/${invoice6.id}/mark-paid`, {
      method: 'POST', redirect: 'manual', headers: { Cookie: adminCookie },
    });
    const waitForFlake = async () => {
      const deadline = Date.now() + 5000;
      while (flakeHits === 0 && Date.now() < deadline) await new Promise(r => setImmediate(r));
    };
    await waitForFlake();
    assert(flakeHits === 1, 'first webhook attempt fired');
    const del1 = await db.prepare('SELECT * FROM webhook_deliveries WHERE invoice_id = ?').get(invoice6.id);
    assert(del1 && del1.attempts === 1 && del1.status === 'pending', 'failed attempt stays pending for retry → ' + JSON.stringify(del1));
    const retryRes = await fetch(`${base}/admin/webhooks/${del1.id}/retry`, {
      method: 'POST', redirect: 'manual', headers: { Cookie: adminCookie },
    });
    assert(retryRes.status === 303, 'retry redirects (303)');
    const del2 = await db.prepare('SELECT * FROM webhook_deliveries WHERE id = ?').get(del1.id);
    assert(del2.status === 'delivered' && del2.attempts === 2, 'manual retry delivers → ' + JSON.stringify(del2));
    await new Promise(r => flakeServer.close(r));
    console.log('✓ webhook retry (500 → pending → manual retry → delivered)');

    // ── Webhook retry: a delivery that already exhausted its attempts ──
    // (the admin "Retry" button used to be a silent no-op for status=failed)
    const create6b = await fetch(`${base}/api/v1/checkout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ amount: 750, currency: 'BDT', description: 'Exhausted webhook retry', webhook_url: 'http://127.0.0.1:1/dead' }),
    });
    const invoice6b = await create6b.json();
    await fetch(`${base}/admin/invoices/${invoice6b.id}/mark-paid`, {
      method: 'POST', redirect: 'manual', headers: { Cookie: adminCookie },
    });
    const delRow = await db.prepare('SELECT * FROM webhook_deliveries WHERE invoice_id = ?').get(invoice6b.id);
    assert(delRow && delRow.attempts === 1 && delRow.status === 'pending', 'dead endpoint queues a pending delivery');
    // Simulate the queue having given up (5 failed attempts), then point it at a live receiver.
    await db.prepare("UPDATE webhook_deliveries SET status = 'failed', attempts = 5, max_attempts = 5, url = ? WHERE id = ?").run(webhookUrl, delRow.id);
    const hitsBeforeRetry = webhookHits.length;
    const retryFailed = await fetch(`${base}/admin/webhooks/${delRow.id}/retry`, {
      method: 'POST', redirect: 'manual', headers: { Cookie: adminCookie },
    });
    assert(retryFailed.status === 303, 'retry of failed delivery redirects (303)');
    const delRetried = await db.prepare('SELECT * FROM webhook_deliveries WHERE id = ?').get(delRow.id);
    assert(delRetried.status === 'delivered' && delRetried.attempts === 6, 'failed delivery is re-queued and delivered → ' + JSON.stringify(delRetried));
    assert(webhookHits.length === hitsBeforeRetry + 1, 'webhook actually reached the merchant on manual retry');
    console.log('✓ webhook retry after max attempts (failed → re-queued → delivered)');

    // ── Payment Links: create → public pay → demo pay → signed webhook ──
    const linkRes = await fetch(`${base}/admin/links`, {
      method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: adminCookie },
      body: new URLSearchParams({ label: 'ISP bill test', amount: '349.00', currency: 'BDT', description: 'ISP monthly bill', webhook_url: webhookUrl }),
    });
    assert(linkRes.status === 303, 'payment link created (303)');
    const linkLoc = linkRes.headers.get('location') || '';
    const linkId = (linkLoc.match(/plink_[A-Za-z0-9_-]+/) || [])[0];
    assert(linkId, 'redirect contains payment link id → ' + linkLoc);
    const createdPage = await fetch(`${base}${linkLoc}`, { headers: { Cookie: adminCookie } });
    const createdHtml = await createdPage.text();
    assert(createdHtml.includes('/l/' + linkId), 'payment link URL shown on creation page');
    const linkSecret = (createdHtml.match(/whsec_[A-Za-z0-9_-]+/) || [])[0];
    assert(linkSecret, 'link webhook secret shown once on creation page');
    const pub = await fetch(`${base}/l/${linkId}`, { redirect: 'manual' });
    assert(pub.status === 302, 'public link redirects to checkout');
    const payLoc = pub.headers.get('location') || '';
    const linkInvId = (payLoc.match(/inv_[A-Za-z0-9_-]+/) || [])[0];
    assert(linkInvId, 'redirected to /pay/<invoice> → ' + payLoc);
    const hitsBeforeLink = webhookHits.length;
    const demoPay = await fetch(`${base}/pay/${linkInvId}/demo/complete`, { method: 'POST', redirect: 'manual' });
    assert(demoPay.status === 303, 'link invoice paid via demo provider (303)');
    const deadline3 = Date.now() + 5000;
    while (webhookHits.length === hitsBeforeLink && Date.now() < deadline3) {
      await new Promise(r => setImmediate(r));
    }
    assert(webhookHits.length === hitsBeforeLink + 1, 'webhook delivered for payment link invoice');
    const hit3 = webhookHits[webhookHits.length - 1];
    const expected3 = 'sha256=' + hmacSha256(linkSecret, hit3.body);
    assert(hit3.headers['x-fpg-signature'] === expected3, 'link webhook signature matches the link secret');
    console.log('✓ payment link flow (create → pay → webhook)');

    // ── SMS bridge: SMS → auto-paid + replay protection ───────────
    await db.prepare("INSERT INTO settings (key, value) VALUES ('sms_auto_verify', '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value").run();
    const bridgeToken = 'sms_bridge_smoke_test_token_123456';
    await db.prepare("INSERT INTO settings (key, value) VALUES ('sms_bridge_token_hash', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(sha256(bridgeToken));
    const smsInvoice = await fetch(`${base}/api/v1/checkout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
      body: JSON.stringify({ amount: 321, currency: 'BDT', description: 'SMS bridge test order' }),
    }).then(r => r.json());
    const wrongToken = await fetch(`${base}/bridge/sms`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-token' }, body: '{}',
    });
    assert(wrongToken.status === 401, 'bridge rejects invalid token (401)');
    const smsText = 'You have received Tk 321.00 from 01711111111. Fee Tk 0.00. Balance Tk 9,999.00. TrxID SMK321ABC123 at 12/05/2026 14:32';
    const smsRes = await fetch(`${base}/bridge/sms`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bridgeToken}` },
      body: JSON.stringify({ from: 'bKash', text: smsText }),
    });
    const smsJson = await smsRes.json();
    assert(smsRes.status === 200 && smsJson.status === 'paid', 'SMS auto-verify marks invoice paid → ' + JSON.stringify(smsJson));
    const smsInv = await fetch(`${base}/api/v1/invoices/${smsInvoice.id}`, { headers: { Authorization: `Bearer ${rawKey}` } }).then(r => r.json());
    assert(smsInv.status === 'paid', 'invoice paid via SMS bridge');
    assert(smsInv.trx_id === 'SMK321ABC123', 'trx_id backfilled onto invoice');
    const replay = await fetch(`${base}/bridge/sms`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bridgeToken}` },
      body: JSON.stringify({ from: 'bKash', text: smsText }),
    });
    assert(replay.status === 409, 'replayed TrxID rejected (409)');
    console.log('✓ sms bridge (parse → match → paid, replay protection)');

    // ── Multi-device SMS bridge: device key auth + heartbeat ──────
    const devId = 'dev_device_test_0001';
    const devKey = 'whd_device_test_key_for_smoke_0123456789';
    await db.prepare('INSERT INTO devices (id, name, webhook_key_hash, webhook_key_prefix, is_active, created_at, revoked_at) VALUES (?, ?, ?, ?, 1, ?, NULL)')
      .run(devId, 'Smoke counter phone', sha256(devKey), devKey.slice(0, 12), new Date().toISOString());
    const devSms = await fetch(`${base}/bridge/sms`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devKey}` },
      body: JSON.stringify({ from: 'NAGAD', text: 'You have received Tk 111.00 from 01719998877. TrxID DEV111ABC123 at 12/05/2026 15:00' }),
    });
    assert(devSms.status === 200, 'device key accepted by bridge');
    const hb = await fetch(`${base}/bridge/heartbeat`, { method: 'POST', headers: { Authorization: `Bearer ${devKey}` } });
    assert(hb.status === 200, 'device heartbeat ok');
    const devRow = await db.prepare('SELECT * FROM devices WHERE id = ?').get(devId);
    assert(devRow.last_seen_at && devRow.last_sms_at, 'device last_seen_at + last_sms_at updated');
    await db.prepare("UPDATE devices SET is_active = 0 WHERE id = ?").run(devId);
    const devBlocked = await fetch(`${base}/bridge/sms`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devKey}` },
      body: JSON.stringify({ from: 'NAGAD', text: 'x' }),
    });
    assert(devBlocked.status === 403, 'disabled device rejected');
    console.log('✓ multi-device SMS bridge (device key auth, heartbeat, disable)');

    // ── Settings: every documented field must be editable ───────────
    {
      const settingsPage = await fetch(`${base}/admin/settings`, { headers: { Cookie: adminCookie } });
      const html = await settingsPage.text();
      assert(settingsPage.status === 200, 'settings page loads');
      for (const key of [
        'manual_bkash_number', 'manual_nagad_number', 'manual_rocket_number',
        'manual_upay_number', 'manual_mcash_number', 'manual_cellfin_number',
        'manual_okwallet_number', 'manual_ipay_number', 'manual_tap_number',
        'manual_bank', 'manual_note', 'banglaqr_qr_image', 'banglaqr_note',
      ]) {
        assert(html.includes(`name="${key}"`), `settings form exposes ${key}`);
      }
      const saveRes = await fetch(`${base}/admin/settings`, {
        method: 'POST', redirect: 'manual',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: adminCookie },
        body: new URLSearchParams({
          manual_ipay_number: '01700000008',
          manual_tap_number: '01700000009',
          manual_bank: 'Acme Bank · 1234567890',
          manual_note: 'Send money, then paste the TrxID below.',
          banglaqr_qr_image: '/banglaqr.png',
          banglaqr_note: 'Scan with any bank app',
        }),
      });
      assert(saveRes.status === 303, 'settings save redirects (303)');
      const saved = await fetch(`${base}/admin/settings`, { headers: { Cookie: adminCookie } }).then((r) => r.text());
      for (const value of ['01700000008', '01700000009', 'Acme Bank · 1234567890',
        'Send money, then paste the TrxID below.', '/banglaqr.png', 'Scan with any bank app']) {
        assert(saved.includes(value), `settings value persisted and rendered: ${value}`);
      }
      console.log('✓ settings: all fields editable and persisted');
    }

    // ── No success_url → stay on the gateway's own "paid" page ──────
    {
      const c = await fetch(`${base}/api/v1/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
        body: JSON.stringify({ amount: 88, currency: 'BDT', description: 'no success_url' }),
      }).then((r) => r.json());
      const paid = await fetch(`${base}/pay/${c.id}/demo/complete`, { method: 'POST', redirect: 'manual' });
      const loc = paid.headers.get('location') || '';
      assert(loc.startsWith(`/pay/${c.id}`), 'paid redirect stays on /pay/<id> when no success_url → ' + loc);
      assert(loc.includes('fpg_status=paid'), 'paid redirect carries fpg_status=paid');
      const pageHtml = await fetch(`${base}/pay/${c.id}`).then((r) => r.text());
      assert(pageHtml.includes('Payment successful'), 'own success page renders');
      console.log('✓ paid redirect without success_url');
    }

    // ── One TrxID can only be claimed by one invoice (anti-fraud) ────
    {
      const a = await fetch(`${base}/api/v1/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
        body: JSON.stringify({ amount: 61, currency: 'BDT', description: 'trx owner' }),
      }).then((r) => r.json());
      const b = await fetch(`${base}/api/v1/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
        body: JSON.stringify({ amount: 62, currency: 'BDT', description: 'trx thief' }),
      }).then((r) => r.json());
      const form = (id) => fetch(`${base}/pay/${id}/manual/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ trx_id: 'DUP123456', trx_sender: '01712223333' }),
      });
      const first = await form(a.id);
      assert(first.status === 200, 'first TrxID submission accepted');
      const second = await form(b.id);
      assert(second.status === 409, 'same TrxID on another invoice rejected (409), got ' + second.status);
      const bad = await fetch(`${base}/pay/${b.id}/manual/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ trx_id: 'x', trx_sender: 'abc' }),
      });
      assert(bad.status === 400, 'malformed TrxID/sender rejected (400)');
      console.log('✓ TrxID reuse + malformed submission rejected');
    }

    // ── Double approval must not fire two webhooks ───────────────────
    {
      const c = await fetch(`${base}/api/v1/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
        body: JSON.stringify({ amount: 99, currency: 'BDT', description: 'race', webhook_url: webhookUrl }),
      }).then((r) => r.json());
      const before = webhookHits.length;
      await Promise.all([
        fetch(`${base}/admin/invoices/${c.id}/mark-paid`, { method: 'POST', redirect: 'manual', headers: { Cookie: adminCookie } }),
        fetch(`${base}/admin/invoices/${c.id}/mark-paid`, { method: 'POST', redirect: 'manual', headers: { Cookie: adminCookie } }),
        fetch(`${base}/admin/invoices/${c.id}/approve`, { method: 'POST', redirect: 'manual', headers: { Cookie: adminCookie } }),
      ]);
      const deadline = Date.now() + 5000;
      while (webhookHits.length === before && Date.now() < deadline) await new Promise((r) => setImmediate(r));
      const deliveries = await db.prepare('SELECT COUNT(*) AS c FROM webhook_deliveries WHERE invoice_id = ?').get(c.id);
      assert(deliveries.c === 1, 'concurrent approvals create exactly one webhook delivery, got ' + deliveries.c);
      assert(webhookHits.length === before + 1, 'concurrent approvals deliver exactly one webhook');
      console.log('✓ concurrent approve/mark-paid is idempotent');
    }

    // ── 404: HTML for browsers, JSON for API clients ────────────────
    {
      const browser = await fetch(`${base}/no-such-page`, { headers: { Accept: 'text/html' } });
      const browserBody = await browser.text();
      assert(browser.status === 404, 'unknown page → 404');
      assert((browser.headers.get('content-type') || '').includes('text/html'), 'browser gets an HTML 404');
      assert(browserBody.includes('404'), 'HTML 404 body explains the problem');
      const api = await fetch(`${base}/api/v1/definitely-not-a-route`);
      assert((api.headers.get('content-type') || '').includes('application/json'), 'API client still gets JSON');
      console.log('✓ content-negotiated 404');
    }

    // ── Password rotation: stay signed in here, kick out every other device ──
    {
      const res = await fetch(`${base}/admin/settings`, {
        method: 'POST', redirect: 'manual',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: adminCookie },
        body: new URLSearchParams({ new_admin_password: 'brand-new-password-9' }),
      });
      assert(res.status === 303, 'password change redirects (303)');
      const loc = res.headers.get('location') || '';
      assert(loc.includes('pwok=1'), 'password change reports success → ' + loc);
      const rotated = (res.headers.getSetCookie().find((c) => c.startsWith('fpg_admin=')) || '').split(';')[0];
      assert(rotated.length > 10 && rotated !== adminCookie, 'password change issues a fresh session cookie');
      const after = await fetch(base + loc, { headers: { Cookie: rotated } });
      const afterHtml = await after.text();
      assert(after.status === 200, 'merchant stays signed in after changing the password');
      assert(afterHtml.includes('id="pwok"'), 'success banner is actually rendered (not bounced to login)');
      const oldSession = await fetch(`${base}/admin`, { headers: { Cookie: adminCookie }, redirect: 'manual' });
      assert(oldSession.status === 302, 'sessions on other devices are invalidated');
      const newLogin = await fetch(`${base}/admin/login`, {
        method: 'POST', redirect: 'manual',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ password: 'brand-new-password-9' }),
      });
      assert(newLogin.status === 303 && newLogin.headers.get('location') === '/admin', 'new password logs in');
      const oldLogin = await fetch(`${base}/admin/login`, {
        method: 'POST', redirect: 'manual',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ password: 'test-admin-password-123' }),
      });
      assert((oldLogin.headers.get('location') || '').includes('err=1'), 'old password no longer works');
      console.log('✓ password rotation (stays signed in, other sessions invalidated)');
    }

    console.log('\n✅ ALL SMOKE TESTS PASSED — gateway is fully functional.\n');
  } finally {
    await new Promise(r => server.close(r));
    await new Promise(r => webhookServer.close(r));
    await db.close();
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(TMP_DB + suffix); } catch {}
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
