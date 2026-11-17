'use strict';
// ── FREE Payment Gateways — self-hosted, zero-monthly-fee payment gateway ──
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
const pkg = require('../package.json');
const { getSetting, setSetting } = require('./settings');
const { scryptHash, envBaseUrl } = require('./util');
const { layout } = require('./views');

async function firstRunInit() {
  if (!(await getSetting('admin_password_hash'))) {
    const fromEnv = !!process.env.ADMIN_PASSWORD;
    const password = process.env.ADMIN_PASSWORD || '12345678';
    await setSetting('admin_password_hash', scryptHash(password));
    if (!fromEnv) {
      console.log('\n┌──────────────────────────────────────────────────────────┐');
      console.log('│  FIRST RUN — default admin password: 12345678            │');
      console.log('│  Sign in at /admin → Settings → Change admin password    │');
      console.log('│  to set your own permanent password (min 8 characters).   │');
      console.log('└──────────────────────────────────────────────────────────┘\n');
    } else {
      console.log('\nAdmin password set from ADMIN_PASSWORD env var.\n');
    }
  }
  if (!(await getSetting('admin_session_secret'))) {
    await setSetting('admin_session_secret', crypto.randomBytes(32).toString('hex'));
  }
  if (process.env.BASE_URL && !(await getSetting('base_url'))) {
    await setSetting('base_url', process.env.BASE_URL.replace(/\/+$/, ''));
  }
}

async function createApp() {
  await firstRunInit();
  const app = express();
  app.disable('x-powered-by');
  if (String(process.env.TRUST_PROXY).toLowerCase() === 'true') app.set('trust proxy', true);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  // Baseline hardening. No CSP here on purpose: the dashboard uses small inline
  // handlers/scripts, and a policy strong enough to matter would break them.
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Tokens are shown once via ?created=… — never leak them to third parties.
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // Redirects after a POST must be 303 (See Other), never 302/307.
  // Vercel's edge normalises 302 responses of non-GET requests to 307, which
  // makes the browser re-issue the same method+body to the redirect target —
  // e.g. POST /admin/login → 307 → POST /admin → no such route →
  // {"error":"Not found"}. 303 forces the follow-up request to GET.
  app.use((req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    const raw = res.redirect.bind(res);
    res.redirect = (...args) => raw(303, args.length === 1 ? args[0] : args[1]);
    next();
  });

  const { router: apiRouter } = require('./routes/api');
  app.use('/api/v1', apiRouter);

  const { checkoutRouter } = require('./routes/checkout');
  app.use('/', checkoutRouter);

  const { router: bridgeRouter } = require('./routes/bridge');
  app.use('/bridge', bridgeRouter);

  const { router: adminRouter } = require('./routes/admin');
  app.use('/', adminRouter);

  // Public front door. LANDING_PAGE=0 restores the old "/" → "/admin" redirect.
  app.get('/', (req, res) => {
    if (process.env.LANDING_PAGE === '0') return res.redirect('/admin');
    const { landingPage } = require('./landing');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.type('html').send(landingPage({ paid: req.query.fpg_status === 'paid' }));
  });
  const APP_DIR = require('path').join(__dirname, '..', 'public', 'app');
  const appIndex = require('path').join(APP_DIR, 'index.html');
  // Merchant SPA is OPT-IN via SPA_ENABLED=1. Default: /app → /admin (password-only, no email).
  const spaEnabled = process.env.SPA_ENABLED === '1';

  // Serve the embedded FREE Payment Gateways dashboard BEFORE the generic public/ static,
  // so hashed assets get far-future cache headers instead of the 1 h default.
  if (fs.existsSync(appIndex) && spaEnabled) {
    app.get(/^\/app$/, (req, res) => res.redirect('/app/'));
    app.use('/app', express.static(APP_DIR, {
      maxAge: '1h',
      index: false,
      setHeaders(res, filePath) {
        if (/[/\\]assets[/\\]/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }));
  }

  app.use(express.static(require('path').join(__dirname, '..', 'public'), { maxAge: '1h', index: false }));

  if (fs.existsSync(appIndex) && spaEnabled) {
    app.get(/^\/app\//, (req, res) => {
      // Real files were already served by /app static above; anything left is an
      // SPA route — hand back the shell. A missing *asset* is a 404, not HTML.
      if (/^\/app\/assets\//.test(req.path)) return res.status(404).json({ error: 'Not found' });
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(appIndex);
    });
  } else {
    // Single-merchant default: send everyone who lands on /app to the /admin dashboard.
    app.get(/^\/app(\/|$)/, (req, res) => {
      if (spaEnabled) {
        res.status(503).type('text/plain; charset=utf-8').send(
          'FREE Payment Gateways dashboard is not built yet.\n' +
          'Run `npm run build:app` (see README → "Optional SPA").\n' +
          'The gateway dashboard is always available at /admin.',
        );
        return;
      }
      res.redirect('/admin');
    });
  }

  app.get('/health', (req, res) => res.json({
    ok: true,
    name: 'free-payment-gateways',
    version: pkg.version,
    app: spaEnabled ? '/app' : 'admin-only',
    db: db.mode,
  }));

  // ── Cron: retry due webhooks (Vercel Cron / any external scheduler) ──
  // Vercel Hobby only allows a daily cron, so the dashboard also sweeps
  // opportunistically (see routes/admin.js). Protect with CRON_SECRET when set.
  app.all('/cron/webhook-sweep', async (req, res) => {
    const secret = String(process.env.CRON_SECRET || '').trim();
    if (secret) {
      const auth = String(req.headers.authorization || '');
      const provided = auth.replace(/^Bearer\s+/i, '').trim() || String(req.query.secret || '');
      if (provided !== secret) return res.status(401).json({ error: 'unauthorized' });
    }
    try {
      const { processDueDeliveries } = require('./lifecycle');
      const processed = await processDueDeliveries(50);
      res.json({ ok: true, processed, db: db.mode });
    } catch (err) {
      console.error('[cron] webhook sweep failed:', err);
      res.status(500).json({ ok: false, error: 'webhook sweep failed' });
    }
  });

  // Never render the JSON 404/error page to a browser: browsers (and clients
  // sending `Accept: */*`) always get the styled HTML page. JSON is only
  // returned when the client explicitly prefers it (`Accept: application/json`).
  const wantsHtml = (req) => req.method === 'GET' && req.accepts(['html', 'json']) !== 'json';
  app.use((req, res) => {
    if (wantsHtml(req)) {
      return res.status(404).type('html').send(layout({
        title: 'Not found — FREE Payment Gateways',
        body: `<div class="checkout"><div class="card" style="text-align:center">
          <h1>404 — not found</h1>
          <p class="muted">There is no page at <code class="mono">${req.path.replace(/[<>&"]/g, '')}</code>.</p>
          <a class="btn" href="/admin">Go to dashboard →</a>
        </div></div>`,
      }));
    }
    res.status(404).json({ error: 'Not found' });
  });
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    // Framework/parse errors (e.g. malformed JSON) carry a 4xx status — forward it.
    const rawStatus = Number(err.status ?? err.statusCode);
    if (Number.isFinite(rawStatus) && rawStatus >= 400 && rawStatus < 500) {
      if (wantsHtml(req)) {
        return res.status(rawStatus).type('html').send(layout({
          title: 'Bad request — FREE Payment Gateways',
          body: `<div class="checkout"><div class="card" style="text-align:center">
            <h1>${rawStatus} — bad request</h1>
            <p class="muted">${err.expose && err.message ? String(err.message).replace(/[<>&"]/g, '') : 'The request could not be understood.'}</p>
            <a class="btn btn-secondary" href="javascript:history.back()">← Go back</a>
          </div></div>`,
        }));
      }
      return res.status(rawStatus).json({
        error: err.expose && err.message ? err.message : 'Bad request',
      });
    }
    console.error(err);
    if (wantsHtml(req)) {
      return res.status(500).type('html').send(layout({
        title: 'Server error — FREE Payment Gateways',
        body: `<div class="checkout"><div class="card" style="text-align:center">
          <h1>Something went wrong</h1>
          <p class="muted">The server hit an unexpected error. Check the server log for details.</p>
          <a class="btn btn-secondary" href="/admin">Back to dashboard</a>
        </div></div>`,
      }));
    }
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

if (require.main === module) {
  createApp().then((app) => {
    const port = parseInt(process.env.PORT, 10) || 3000;
    app.listen(port, () => {
      const base = envBaseUrl() || `http://localhost:${port}`;
      console.log(`⚡ FREE Payment Gateways listening on port ${port}`);
      console.log(`   Admin dashboard : ${base}/admin  (password-only — no email)`);
      console.log(`   Database        : ${db.mode}`);
      if (process.env.SPA_ENABLED === '1') {
        console.log(`   Merchant SPA   : ${base}/app  (multi-merchant, optional)`);
      } else {
        console.log(`   Merchant SPA   : disabled (set SPA_ENABLED=1 to enable)`);
      }
      console.log(`   Health check    : ${base}/health\n`);
      // Auto-retry failed webhook deliveries (single-instance deployments)
      const { startWebhookRetryWorker } = require('./lifecycle');
      startWebhookRetryWorker();
    });
  }).catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
}

module.exports = { createApp, firstRunInit };
