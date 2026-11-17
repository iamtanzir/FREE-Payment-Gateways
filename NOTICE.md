# NOTICE — License & ownership

This repository is **100% original work owned by iamtanzir and contributors**.
Everything in this tree — the Node.js gateway, the WordPress plugin, docs, Docker
and tooling — is **licensed under the GNU Affero General Public License v3.0**
(see `LICENSE`). There is no vendored third-party code and there are no
third-party copyright holders in this tree (runtime npm dependencies are
installed from the registry, not committed — see the component list below).

History note: an earlier commit contained a vendored copy of an external
GPLv2+ WordPress plugin. That code was **completely removed** and replaced with
original AGPL-licensed code written for this project
(`wordpress/free-payment-gateways/`, including the `FPG Bangla QR & MFS`
gateway). Earlier commits in git history may still reference the removed
upstream project — this is only archival history and grants no rights in this
tree.

Service providers named in the docs and settings (bKash, Nagad, Rocket, Upay,
SSLCommerz, Stripe, WordPress, WooCommerce) are trademarks of their respective
owners. This project is not affiliated with or endorsed by any of them.

## Third-party components & assets (merchant SPA, `src/dashboard/`)

Everything shipped in this repository is licensed under AGPL-3.0-only. The
sub-project is a Vite/React application that reuses standard, permissively
licensed open-source components — no third-party code is relicensed, and no
third-party artwork is embedded:

| Component | License | Use |
|---|---|---|
| React, React DOM, Vite | MIT | UI runtime & toolchain |
| Tailwind CSS, PostCSS | MIT | CSS |
| Radix UI primitives / shadcn/ui | MIT | Accessible components |
| lucide-react | ISC | Icons |
| @tanstack/react-query, react-router, date-fns | MIT | State, routing, dates |
| Capacitor | MIT | Android/iOS shells |
| Supabase JS client | MIT | API client |
| Express, pg, @libsql/client | MIT | Gateway HTTP server, PostgreSQL & Turso/libSQL drivers |
| DM Sans (Google Fonts, OFL-1.1) | Open Font License | Loaded via fonts.googleapis.com at runtime |

**No third-party logos, icons, screenshots or banners are committed.** All
gateway tiles render as monograms in brand colors; brand names appear only as
text for nominative identification (e.g. "bKash", "Stripe") and imply no
affiliation, endorsement or partnership. Any logo a merchant wants shown in a
checkout/gateway screen is supplied by *that merchant* via `image_url`.

Earlier iterations of the FREE Payment Gateways dashboard contained scraped payment-provider
logo files and third-party marketing screenshots. Those assets are removed from
the working tree as of v1.8.1. Any commits/tags in history still reference them;
that archival history is not a distribution mechanism and grants no rights in
this tree.

The `fpg-logo.png` app icon is an original, simply-drawn letter tile
generated for this project — it is not a representation of any existing brand,
and it carries no third-party copyright.

Copyright is asserted only over code written here. Service names in UI copy are
descriptive ("supports Stripe"), not endorsements.
