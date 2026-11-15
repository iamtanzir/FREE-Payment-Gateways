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

const assert = (cond, msg) => { if (!cond) { console.error('❌ FAIL:', msg); process.exitCode = 1; throw new Error(msg); } };

async function main() {
  const { createApp } = require('../src/server');
  const db = require('../src/db');
  const { sha256, hmacSha256 } = require('../src/util');

  const app = createApp();
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
    console.log('✓ health check');

    // ── Admin login ────────────────────────────────────────────────
    const loginRes = await fetch(`${base}/admin/login`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password: 'test-admin-password-123' }),
    });
    assert(loginRes.status === 302, 'admin login redirects (302), got ' + loginRes.status);
    const cookies = loginRes.headers.getSetCookie();
    const adminCookie = (cookies.find(c => c.startsWith('fpg_admin=')) || '').split(';')[0];
    assert(adminCookie.length > 10, 'admin session cookie set');
    console.log('✓ admin login');

    const dash = await fetch(`${base}/admin`, { headers: { Cookie: adminCookie }, redirect: 'manual' });
    assert(dash.status === 200, 'admin dashboard loads');
    console.log('✓ admin dashboard');

    // ── Seed an API key directly (deterministic for the test) ──────
    const rawKey = 'fpg_test_smoke_key_1234567890';
    const secret = 'whsec_smoke_test_secret';
    db.prepare(`INSERT INTO api_keys (id, label, prefix, key_hash, webhook_secret, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
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
    assert(payRes.status === 302, 'demo complete redirects');
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
    assert(approve.status === 302, 'admin approve redirects');
    const inv2 = await fetch(`${base}/api/v1/invoices/${invoice2.id}`, { headers: { Authorization: `Bearer ${rawKey}` } }).then(r => r.json());
    assert(inv2.status === 'paid', 'manual invoice approved → paid');
    console.log('✓ manual bKash flow (submit → admin approve → paid)');

    console.log('\n✅ SMOKE TEST PASSED — gateway is fully functional.\n');
  } finally {
    await new Promise(r => server.close(r));
    await new Promise(r => webhookServer.close(r));
    db.close();
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(TMP_DB + suffix); } catch {}
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
