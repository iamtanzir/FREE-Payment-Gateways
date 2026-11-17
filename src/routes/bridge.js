'use strict';
// ── SMS Bridge — ingestion endpoint for the Android SMS forwarder ─────
// The merchant's Android phone (the SIM that receives MFS payments) forwards
// every relevant incoming SMS to this endpoint. We parse it, match it against
// pending invoices and — when confident — mark them paid automatically.
//
// The forwarder can be any SMS-forwarding app (MacroDroid / SMS Gate / Tasker);
// see docs/AUTO-VERIFY.md for ready-made recipes.
//
// Request:  POST /bridge/sms
// Headers:  Authorization: Bearer <sms_bridge_token>
// Body:     { "from": "bKash", "text": "You have received Tk 500.00 from 01… TrxID ABC123 at …" }
//           ("text" is also accepted as "sms"; "from" from "sender"/"origin")
// Response: { "status": "paid" | "review" | "ambiguous" | "nomatch" | "duplicate", ... }

const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { getSetting } = require('../settings');
const { sha256, newId, nowIso, timingSafeEqualHex } = require('../util');
const { parsePaymentSms } = require('../mfs-parser');
const { markPaid } = require('../lifecycle');

const router = express.Router();

// Per-IP rate limit (the merchant's own phone is the only caller expected)
const ipHits = new Map();
function rateLimited(key) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const list = (ipHits.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= 60) { ipHits.set(key, list); return true; }
  list.push(now);
  ipHits.set(key, list);
  if (ipHits.size > 5000) ipHits.clear();
  return false;
}

/**
 * Bridge auth — two token types work:
 *  1) per-device webhook key  (whd_… — shown once at creation, sha256 stored)
 *  2) the legacy global bridge token (kept for backwards compatibility)
 * Returns { deviceId, name } or sends a 401/403 and returns null.
 */
async function bridgeAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const m = header.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: 'Missing Authorization: Bearer <token>' });
    const hash = sha256(m[1].trim());

    const device = await db.prepare('SELECT * FROM devices WHERE webhook_key_hash = ? AND revoked_at IS NULL').get(hash);
    if (device) {
      if (!device.is_active) return res.status(403).json({ error: 'This device is disabled by the merchant.' });
      await db.prepare('UPDATE devices SET last_seen_at = ? WHERE id = ?').run(nowIso(), device.id);
      req.bridgeDevice = { deviceId: device.id, name: device.name };
      return next();
    }

    const stored = await getSetting('sms_bridge_token_hash');
    if (!stored) return res.status(503).json({ error: 'SMS bridge not configured — generate a token first (admin → SMS Bridge).' });
    if (!timingSafeEqualHex(hash, stored)) return res.status(401).json({ error: 'Invalid bridge token' });
    req.bridgeDevice = { deviceId: null, name: 'global' };
    return next();
  } catch (err) {
    next(err);
  }
}

async function logSms({ provider, sender, amountMinor, trxId, rawText, status, invoiceId, note, receivedAt, deviceId }) {
  await db.prepare(`INSERT INTO sms_events
      (id, provider, sender, amount_minor, currency, trx_id, raw_text, status, invoice_id, device_id, note, received_at, created_at)
      VALUES (?, ?, ?, ?, 'BDT', ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      newId('sms'), provider || null,
      sender ? String(sender).slice(0, 60) : null,
      Number.isFinite(amountMinor) ? amountMinor : 0,
      trxId || null, rawText || '',
      status, invoiceId || null, deviceId || null,
      note ? String(note).slice(0, 200) : null,
      String(receivedAt || nowIso()).slice(0, 40), nowIso()
    );
}

router.post('/heartbeat', bridgeAuth, async (req, res, next) => {
  try {
    res.json({ ok: true, device: req.bridgeDevice.deviceId ? req.bridgeDevice.name : 'global', time: nowIso() });
  } catch (err) {
    next(err);
  }
});

router.post('/sms', bridgeAuth, async (req, res, next) => {
  try {
    const deviceId = req.bridgeDevice.deviceId;
    if (rateLimited(deviceId || req.ip || 'unknown')) {
      return res.status(429).json({ error: 'too many requests — wait a few minutes' });
    }
    // Update device activity tracker (fire-and-forget)
    if (deviceId) {
      db.prepare('UPDATE devices SET last_seen_at = ?, last_sms_at = ? WHERE id = ?').run(nowIso(), nowIso(), deviceId).catch(() => {});
    }

    const body = req.body || {};
    const text = String(body.text ?? body.sms ?? '');
    const from = String(body.from ?? body.sender ?? body.origin ?? '');
    const receivedAt = body.received_at ?? body.timestamp ?? nowIso();

    // Optional sender allowlist (comma-separated, case-insensitive)
    const allowRaw = await getSetting('sms_sender_allowlist');
    const allow = String(allowRaw || '').trim().toLowerCase();
    if (allow) {
      const senderLow = from.toLowerCase();
      const ok = allow.split(',').map((s) => s.trim()).filter(Boolean).some((a) => senderLow.includes(a));
      if (!ok) {
        await logSms({ provider: null, sender: from, amountMinor: 0, trxId: null, rawText: text.slice(0, 500), status: 'rejected', note: 'sender not in allowlist', receivedAt, deviceId });
        return res.status(403).json({ error: 'sender not in allowlist' });
      }
    }

    let parsed;
    try {
      parsed = parsePaymentSms({ from, text });
    } catch (err) {
      await logSms({ provider: null, sender: from, amountMinor: 0, trxId: null, rawText: text.slice(0, 500), status: 'unparsed', note: String(err.message || err), receivedAt, deviceId });
      return res.status(422).json({ error: 'unparsable sms', detail: String(err.message || err) });
    }

    // Replay protection: a TrxID already seen anywhere in our log is rejected
    const seen = await db.prepare('SELECT id FROM sms_events WHERE trx_id = ? LIMIT 1').get(parsed.trxId);
    if (seen) {
      await logSms({ ...parsed, status: 'replay', note: 'TrxID already seen', receivedAt, deviceId });
      return res.status(409).json({ error: 'duplicate trx_id — already processed' });
    }

    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    // Strategy 1: customer already submitted this exact TrxID on the checkout page
    let invoice = await db.prepare("SELECT * FROM invoices WHERE trx_id = ? AND status = 'pending' LIMIT 1").get(parsed.trxId);

    // Strategy 2: exact amount + last 24h pending manual/banglaqr invoices (unique candidate only)
    let candidates = null;
    if (!invoice) {
      candidates = await db.prepare(
        `SELECT * FROM invoices
         WHERE status = 'pending' AND amount_minor = ? AND (provider IS NULL OR provider IN ('manual','banglaqr')) AND created_at >= ?
         ORDER BY created_at ASC LIMIT 5`
      ).all(parsed.amountMinor, dayAgo);
      if (candidates.length === 1) invoice = candidates[0];
    }

    const autoEnabled = (await getSetting('sms_auto_verify')) === '1';
    const autoMax = parseInt((await getSetting('sms_auto_max_minor')) || '0', 10);
    const belowAutoMax = Number.isFinite(autoMax) && autoMax > 0 && parsed.amountMinor <= autoMax;
    const ts = nowIso();

    if (!invoice) {
      if (candidates && candidates.length > 1) {
        await logSms({ ...parsed, status: 'ambiguous', note: `${candidates.length} pending invoices share this amount — merchant must pick`, receivedAt, deviceId });
        return res.status(200).json({ status: 'ambiguous', matched: false, candidates: candidates.length });
      }
      await logSms({ ...parsed, status: 'nomatch', note: 'no pending invoice with this amount in last 24h', receivedAt, deviceId });
      return res.status(200).json({ status: 'nomatch', matched: false });
    }

    // Pre-fill TrxID/sender so the merchant's manual review is one click
    if (!invoice.trx_id) {
      await db.prepare('UPDATE invoices SET trx_id = ?, trx_sender = ?, updated_at = ? WHERE id = ?')
        .run(parsed.trxId, parsed.sender || '', ts, invoice.id);
    }

    if (autoEnabled && belowAutoMax) {
      const updated = await markPaid(invoice.id, parsed.provider || 'sms-auto');
      await logSms({ ...parsed, status: 'matched', invoiceId: invoice.id, note: 'auto-paid by SMS bridge', receivedAt, deviceId });
      return res.status(200).json({ status: 'paid', matched: true, invoice_id: updated ? updated.id : invoice.id, provider: parsed.provider || null });
    }

    const note = !autoEnabled ? 'auto-verify disabled — manual review' : 'above auto-approve limit — manual review';
    await logSms({ ...parsed, status: 'review', invoiceId: invoice.id, note, receivedAt, deviceId });
    return res.status(200).json({ status: 'review', matched: true, invoice_id: invoice.id, note });
  } catch (err) {
    next(err);
  }
});

module.exports = { router };
