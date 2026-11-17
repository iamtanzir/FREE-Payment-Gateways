'use strict';
const crypto = require('crypto');

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('base64url')}`;
}

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function hmacSha256(secret, data) {
  return crypto.createHmac('sha256', String(secret)).update(data).digest('hex');
}

function timingSafeEqualHex(a, b) {
  try {
    const ba = Buffer.from(String(a), 'hex');
    const bb = Buffer.from(String(b), 'hex');
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function scryptHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function scryptVerify(password, stored) {
  try {
    const [scheme, salt, hash] = String(stored).split(':');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const candidate = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return timingSafeEqualHex(candidate, hash);
  } catch {
    return false;
  }
}

/** Escape user-controlled strings for HTML output. */
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** Convert "120.50" → 12050 (minor units). Returns null on invalid/negative input. */
function toMinorUnits(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  const minor = Math.round(n * 100);
  if (!Number.isSafeInteger(minor) || minor > 9_000_000_000_000) return null;
  return minor;
}

function formatMoney(minor, currency) {
  const n = Number(minor) || 0;
  const formatted = (n / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${String(currency || '').toUpperCase()}`;
}

/** Append query params to a URL safely. */
function appendQuery(url, params) {
  try {
    const u = new URL(url);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
    return u.toString();
  } catch {
    const sep = String(url).includes('?') ? '&' : '?';
    const qs = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return `${url}${sep}${qs}`;
  }
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Best public base URL from the environment, without any database access.
 * Order: BASE_URL → Vercel production domain → Vercel deployment URL.
 * Returns '' when nothing is configured (callers then derive it from the request).
 */
function envBaseUrl(env = process.env) {
  const explicit = String(env.BASE_URL || '').trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = String(env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL || '').trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//i, '').replace(/\/+$/, '')}`;
  return '';
}

module.exports = {
  newId,
  sha256,
  hmacSha256,
  timingSafeEqualHex,
  scryptHash,
  scryptVerify,
  esc,
  toMinorUnits,
  formatMoney,
  appendQuery,
  nowIso,
  envBaseUrl,
};
