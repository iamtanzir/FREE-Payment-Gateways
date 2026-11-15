'use strict';
const { esc } = require('../util');
// Bangla QR provider — 100% free.
// The merchant displays their OWN bank-issued Bangla QR (bKash/Nagad/bank apps can all scan it).
// The customer pays by scanning, then submits the transaction ID. The admin verifies in the
// dashboard and clicks "Approve" → invoice becomes paid and the merchant webhook fires.
// No SSLCommerz/bank enrollment or API fees required.
module.exports = {
  id: 'banglaqr',
  name: '🇧🇩 Bangla QR — scan & pay (free)',
  isEnabled: (s) => (s.banglaqr_enabled ?? '1') === '1',
  panel(invoice, s, _ctx) {
    const img = String(s.banglaqr_qr_image || '').trim();
    const imgHtml = img
      ? `<img src="${esc(img)}" alt="Bangla QR" style="display:block;max-width:230px;width:100%;margin:10px auto;border-radius:12px;background:#fff;padding:8px">`
      : `<div class="alert alert-warn" style="text-align:left">Merchant has not uploaded their Bangla QR image yet.<br><span class="muted">Admin → Settings → Bangla QR → paste the image URL (e.g. upload it into <code>public/</code> and use <code>/banglaqr.png</code>).</span></div>`;
    return `
      <div style="background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:14px;margin:8px 0;text-align:center">
        <div class="muted" style="margin-bottom:4px">${esc(s.banglaqr_note || '')}</div>
        ${imgHtml}
        <form method="post" action="/pay/${encodeURIComponent(invoice.id)}/banglaqr/submit" style="text-align:left">
          <label for="trx_sender">Your number (the one you paid from)</label>
          <input id="trx_sender" name="trx_sender" required placeholder="01XXXXXXXXX" autocomplete="off">
          <label for="trx_id">Transaction ID (TrxID)</label>
          <input id="trx_id" name="trx_id" required placeholder="e.g. 9G7H2K4LMN" autocomplete="off">
          <button type="submit" class="btn" style="margin-top:12px;width:100%">Submit for verification</button>
        </form>
      </div>`;
  },
};
