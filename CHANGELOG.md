# Changelog

## v1.1.0 — 100% tested ("just make it easy and tested")

- **Testing:** full Node end-to-end suite (`npm test`) — 17 checks: checkout, demo pay, webhook HMAC verify, manual submit/approve/reject, cancel flow, input validation, 404 JSON, admin mark-paid + webhook
- **Testing:** PHP/WordPress smoke harness (`test/plugin-smoke.php`) via `php test/plugin-smoke.php` — all plugin files lint clean; gateways, shortcode and order flow verified without WordPress
- **Fixed (critical):** gateways were declared inside nested `plugins_loaded` closures — they never registered in real WordPress. Classes now load at file scope; HPOS compatibility declared from the main plugin file
- **Docs:** `docs/DEPLOYMENT.md` rewritten as Bengali A-to-Z (Render, cPanel, Hostinger, VPS+nginx, Docker, Cloudflare, update, backup, FAQ) with TL;DR; `README.md` TL;DR; `render.yaml` blueprint
- **Security:** admin login-attempt bucket cap (5,000 IPs)
- Repository contains only original MIT code; ownership: `LICENSE` — "Copyright (c) 2026 iamtanzir and contributors"

## v1.0.0 — Initial release

- Self-hosted gateway (Node.js, embedded SQLite): demo / manual bKash-Nagad-Rocket-Bank / Bangla QR / Stripe / bKash Tokenized
- Hosted checkout page, REST API v1, API-key auth, HMAC-signed webhooks, admin dashboard with manual approval
- WordPress plugin (`free-payment-gateways`): hosted checkout redirect gateway + `[fpg_pay]` shortcode + return handler
