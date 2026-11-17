-- API key hardening
-- 1) Store irreversible SHA-256 hashes instead of base64(key) (reversible).
-- 2) Stop clients (dashboard / any logged-in member) from ever selecting key_hash.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Legacy rows were created as btoa(key) (standard base64 with padding).
-- Convert them to 'sha256:<hex>' so existing keys keep working unchanged.
UPDATE public.api_keys
SET key_hash = 'sha256:' || encode(digest(decode(key_hash, 'base64'), 'sha256'), 'hex'),
    updated_at = now()
WHERE key_hash !~ '^sha256:[0-9a-f]{64}$'
  AND key_hash ~ '^[A-Za-z0-9+/]+={0,2}$';

-- Column-level privileges: authenticated users may read key metadata, but the
-- hash column is not selectable. (RLS still restricts rows to the member's org.)
REVOKE SELECT ON public.api_keys FROM anon, authenticated;

GRANT SELECT (
  id,
  organization_id,
  brand_id,
  label,
  key_prefix,
  is_active,
  rate_limit,
  last_used_at,
  created_at,
  updated_at
) ON public.api_keys TO authenticated;
