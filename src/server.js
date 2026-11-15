'use strict';
// ── FREE-Payment-Gateways — self-hosted, zero-monthly-fee payment gateway ──
// Zero-dependency .env loader (no dotenv package needed)
const fs = require('fs');
const path = require('path');
(function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^["']|["']$/g, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
})();

const crypto = require('crypto');
const express = require('express');
const db = require('./db');
const { getSetting, setSetting } = require('./settings');
const { scryptHash } = require('./util');

function firstRunInit() {
  if (!getSetting('admin_password_hash')) {
    const generated = !process.env.ADMIN_PASSWORD;
    const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
    setSetting('admin_password_hash', scryptHash(password));
    if (generated) {
      console.log('\n┌──────────────────────────────────────────────────────────┐');
      console.log('│  FIRST RUN — admin password generated (shown once):      │');
      console.log(`│  ${password}`);
      console.log('│  Sign in at /admin then change it in Settings.           │');
      console.log('└──────────────────────────────────────────────────────────┘\n');
    }
  }
  if (!getSetting('admin_session_secret')) {
    setSetting('admin_session_secret', crypto.randomBytes(32).toString('hex'));
  }
  if (process.env.BASE_URL && !getSetting('base_url')) {
    setSetting('base_url', process.env.BASE_URL.replace(/\/+$/, ''));
  }
}

function createApp() {
  firstRunInit();
  const app = express();
  app.disable('x-powered-by');
  if (String(process.env.TRUST_PROXY).toLowerCase() === 'true') app.set('trust proxy', true);

  // Inbound provider webhooks use express.raw per-route (see routes/checkout.js)
  // so raw body is available only there; JSON parsing below is safe.
  const { btcpayWebhook, stripeWebhook } = require('./routes/checkout');
  app.use('/', btcpayWebhook);
  app.use('/', stripeWebhook);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  const { router: apiRouter } = require('./routes/api');
  app.use('/api/v1', apiRouter);

  const { checkoutRouter } = require('./routes/checkout');
  app.use('/', checkoutRouter);

  const { router: adminRouter } = require('./routes/admin');
  app.use('/', adminRouter);

  app.get('/', (req, res) => res.redirect('/admin'));
  app.get('/health', (req, res) => res.json({ ok: true, name: 'free-payment-gateways', version: '1.0.0' }));

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = parseInt(process.env.PORT, 10) || 3000;
  app.listen(port, () => {
    const base = process.env.BASE_URL || `http://localhost:${port}`;
    console.log(`\n⚡ FREE-Payment-Gateways listening on port ${port}`);
    console.log(`   Admin dashboard : ${base}/admin`);
    console.log(`   Health check    : ${base}/health\n`);
  });
}

module.exports = { createApp, firstRunInit };
