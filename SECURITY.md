# Security Policy

## Supported versions

Only the latest commit on `main` is supported. This project is a self-hostable
payment platform: **you** are responsible for the database, secrets and hosting
you deploy it on.

## Reporting a vulnerability

Do **not** open a public issue for a security problem. Report it privately:

- GitHub → **Security** tab → **Report a vulnerability** (private advisory), or
- email the maintainer listed on https://github.com/iamtanzir

Please include: affected file/function, a reproduction (request or steps),
impact, and the version/commit you tested. Expect an acknowledgement within a
few days.

## Secrets checklist for deployments

- `.env` is git-ignored; only `.env.example` is tracked. Never commit real keys.
- The `service_role` key belongs in **Supabase Edge Function secrets only** —
  never in the SPA, never in `VITE_*` variables (those are baked into the
  public bundle at build time).
- The dashboard must never read `api_keys.key_hash`; the migration
  `20261117090000_api_key_security.sql` enforces this at the column-privilege
  level as well.
- Rotate any key that has ever been pasted into a chat, log or screenshot.
- Enable Supabase **Leaked Password Protection** and MFA for admin accounts.
- Keep an off-site backup: `supabase db dump -f backup.sql`.

## Known hardening already applied

| Issue | Status |
|---|---|
| API keys generated with `Math.random` (predictable) | fixed — `crypto.getRandomValues` |
| API keys stored as `btoa(key)` (reversible, not a hash) | fixed — `sha256:<hex>`, legacy rows auto-upgraded |
| `api_keys.select("*")` exposed `key_hash` to any org member | fixed — explicit column list + DB column grants |
| `validate-device-otp` minted an OTP for any `Authorization` header | fixed — real JWT + org-admin role check |

## Out of scope

- Vulnerabilities in third-party services (Supabase, Vercel, Aiven, PipraPay)
  should be reported to those projects.
- Findings that require the attacker to already hold the service-role key or
  database superuser access.
