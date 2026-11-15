# NOTICE — Licensing map for this repository

This repository contains work under **two different licenses**. Please respect both.

| Path | License | Author / Upstream |
|---|---|---|
| `src/`, `test/`, `package.json`, `Dockerfile`, `docker-compose.yml`, `wordpress/free-payment-gateways/`, `README.md`, `docs/` | **MIT** (see `LICENSE`) | iamtanzir and contributors |
| `wordpress/bangladeshi-payment-gateways/` | **GPLv2 or later** | © ultraDevs and contributors — vendored from https://github.com/ultraDevs/Bangladeshi-Payment-Gateways @ `f5a62994246277c2fa0c7729fa5286531945ce02` (v4.1.0) |

## Credits & attribution

- **Bangladeshi Payment Gateways** (WordPress/WooCommerce plugin for bKash, Nagad, Rocket, Upay, Bangla QR with QR-code verification)
  by **ultraDevs** — https://github.com/ultraDevs/Bangladeshi-Payment-Gateways — vendored here under GPLv2+ with attribution.
  Modifications: `vendor/` (Composer deps) removed and restored via `composer install`; see `wordpress/bangladeshi-payment-gateways/UPSTREAM-NOTICE.md`.

- **UrbdPay** (https://urbdpay.com — self-hosted BD-MFS payment gateway platform with Android-SMS auto-verification)
  is **not included** in this repository. Its advertised source repository
  (`github.com/urbdpay/urbdpay`, referenced from urbdpay.com/docs/self-hosting)
  returned “Page not found” at the time of writing, so no code could be legally
  or technically vendored. If the upstream repository becomes public, it can be
  added as a git subtree following its license (advertised as MIT).

- **BTCPay Server** support was intentionally removed from this project on request (Nov 2026).

- **WordPress Plugin `bangladeshi-payment-gateways`** contains the optional Appsero telemetry SDK, which only activates after site-admin opt-in. See the privacy note in `wordpress/bangladeshi-payment-gateways/UPSTREAM-NOTICE.md`.
