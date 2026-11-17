// Shared API-key hashing/verification for the edge functions.
//
// Keys are random `sk_live_...` strings. Only a SHA-256 hash is stored in the
// database (`sha256:<hex>`), never the key itself. Older rows created by the
// dashboard used `btoa(key)` (reversible base64) — those are still accepted
// once and upgraded in place by the calling function.

const SHA256_PREFIX = "sha256:";

/** Lowercase hex SHA-256 of a string. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Canonical stored form of an API key hash. */
export async function hashApiKey(apiKey: string): Promise<string> {
  return SHA256_PREFIX + (await sha256Hex(apiKey));
}

/** Constant-time-ish string comparison (length leak only). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True when a stored value is not yet a SHA-256 hash (legacy base64 row). */
export function isLegacyApiKeyHash(stored: string | null | undefined): boolean {
  const s = (stored ?? "").trim();
  return s.length > 0 && !s.toLowerCase().startsWith(SHA256_PREFIX) && !/^[0-9a-f]{64}$/i.test(s);
}

/** Verify a presented API key against the stored hash (SHA-256 or legacy base64). */
export async function verifyApiKey(
  apiKey: string,
  stored: string | null | undefined,
): Promise<boolean> {
  const s = (stored ?? "").trim();
  if (!s) return false;

  if (s.toLowerCase().startsWith(SHA256_PREFIX)) {
    return safeEqual(await sha256Hex(apiKey), s.slice(SHA256_PREFIX.length).toLowerCase());
  }
  if (/^[0-9a-f]{64}$/i.test(s)) {
    return safeEqual(await sha256Hex(apiKey), s.toLowerCase());
  }
  // Legacy: base64(key). Accepted only so existing keys keep working until the
  // caller upgrades the row (see isLegacyApiKeyHash).
  return safeEqual(btoa(apiKey), s);
}
