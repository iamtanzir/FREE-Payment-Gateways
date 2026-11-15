# UPSTREAM NOTICE — Bangladeshi Payment Gateways (vendored fork)

This directory contains a **vendored, unmodified-except-as-noted copy** of the
WordPress/WooCommerce plugin **“Bangladeshi Payment Gateways – Make Payment
Using QR Code”** by ultraDevs.

- **Upstream source:** https://github.com/ultraDevs/Bangladeshi-Payment-Gateways
- **WordPress.org page:** https://wordpress.org/plugins/bangladeshi-payment-gateways/
- **Vendored version:** 4.1.0 (upstream commit `f5a62994246277c2fa0c7729fa5286531945ce02`)
- **License:** GNU General Public License v2.0 or later (GPLv2+) — see `readme.txt` (`License: GPLv2 or later`)
- **Copyright:** © ultraDevs and contributors. All rights retained by the original authors.

## Why it is in this repository

This plugin is a field-tested, GPL-licensed way to accept Bangladeshi MFS
payments (bKash, Nagad, Rocket, Upay, Bangla QR) inside WooCommerce using QR
codes and fee rules. It is included here so the FREE-Payment-Gateways project
can serve as a universal free BD-MFS gateway for WordPress/WooCommerce out of
the box.

## Modifications made to the upstream code

1. `vendor/` (Composer dependencies, including mPDF) was **removed** to keep the
   repository light. Restore it with:
   ```bash
   cd wordpress/bangladeshi-payment-gateways
   composer install --no-dev --optimize-autoloader
   ```
2. `.github/`, `.git/` and `node_modules/` were removed (CI/dev only).
3. `.gitignore` extended with `vendor/`.
4. This `UPSTREAM-NOTICE.md` file was added.

No functional code changes were made. All plugin files, including the Appsero
telemetry SDK, are otherwise identical to upstream.

> **Privacy note:** this plugin integrates the Appsero SDK, which collects
> telemetry **only after the site administrator opts in** via the admin notice.
> It is off by default. You can also remove/disable it — under GPL you are free
> to modify the fork.

## License of this directory

Because this directory contains GPLv2+ code, **this directory as a whole is
GPLv2+** — including any modifications or derivative works of the plugin. The
rest of this repository (the Node.js gateway in `src/`, the `free-payment-gateways`
connector plugin in `wordpress/free-payment-gateways/`, docs and tooling) is MIT
licensed. See the root `LICENSE` and `NOTICE.md`.

## Support the original author

- Donate: https://ultradevs.com/donate/
- Documentation: https://ultradevs.com/docs/bangladeshi-payment-gateways
