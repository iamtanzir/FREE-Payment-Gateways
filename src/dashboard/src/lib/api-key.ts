// Client-side API-key generation (browser). The plaintext key is shown to the
// merchant once; only its SHA-256 hash is stored in the database.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const KEY_RANDOM_LENGTH = 32;
const MAX_UNBIASED = 256 - (256 % ALPHABET.length); // rejection sampling → no modulo bias

/** Cryptographically secure `sk_live_...` key (never use Math.random for secrets). */
export function generateApiKey(): string {
  const out: string[] = [];
  while (out.length < KEY_RANDOM_LENGTH) {
    const buf = new Uint8Array(KEY_RANDOM_LENGTH);
    crypto.getRandomValues(buf);
    for (const byte of buf) {
      if (byte >= MAX_UNBIASED) continue; // reject to keep uniform distribution
      out.push(ALPHABET[byte % ALPHABET.length]);
      if (out.length === KEY_RANDOM_LENGTH) break;
    }
  }
  return `sk_live_${out.join("")}`;
}

async function sha256Hex(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("This browser cannot hash API keys securely (needs HTTPS + WebCrypto).");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Stored form: `sha256:<hex>` — matches supabase/functions/_shared/api-key.ts */
export async function hashApiKey(apiKey: string): Promise<string> {
  return `sha256:${await sha256Hex(apiKey)}`;
}
