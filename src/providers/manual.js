'use strict';
const { esc } = require('../util');
// Manual provider — 100% free, zero API fees.
// Customer sends money via bKash/Nagad/Rocket/Bank to the merchant's personal
// or merchant account, then submits the transaction ID. The admin verifies in
// the dashboard and clicks "Approve" → invoice becomes paid and webhook fires.
module.exports = {
  id: 'manual',
  name: '📱 bKash / Nagad / Rocket / Bank (manual verify)',
  isEnabled: (s) => (s.manual_enabled ?? '1') === '1',
  panel(invoice, s, _ctx) {
    const lines = [];
    if (s.manual_bkash_number)  lines.push(`<li><strong>bKash:</strong> ${esc(s.manual_bkash_number)}</li>`);
    if (s.manual_nagad_number)  lines.push(`<li><strong>Nagad:</strong> ${esc(s.manual_nagad_number)}</li>`);
    if (s.manual_rocket_number) lines.push(`<li><strong>Rocket:</strong> ${esc(s.manual_rocket_number)}</li>`);
    if (s.manual_upay_number)   lines.push(`<li><strong>Upay:</strong> ${esc(s.manual_upay_number)}</li>`);
    if (s.manual_mcash_number)  lines.push(`<li><strong>mCash:</strong> ${esc(s.manual_mcash_number)}</li>`);
    if (s.manual_cellfin_number) lines.push(`<li><strong>Cellfin:</strong> ${esc(s.manual_cellfin_number)}</li>`);
    if (s.manual_okwallet_number) lines.push(`<li><strong>OK Wallet:</strong> ${esc(s.manual_okwallet_number)}</li>`);
    if (s.manual_ipay_number)   lines.push(`<li><strong>iPay:</strong> ${esc(s.manual_ipay_number)}</li>`);
    if (s.manual_tap_number)    lines.push(`<li><strong>Tap:</strong> ${esc(s.manual_tap_number)}</li>`);
    if (s.manual_bank)          lines.push(`<li><strong>Bank:</strong> ${esc(s.manual_bank)}</li>`);
    if (lines.length === 0) {
      lines.push('<li class="muted">No merchant accounts configured yet. Admin → Settings → Manual payment numbers.</li>');
    }
    return `
      <div style="background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:14px;margin:8px 0">
        <div class="muted" style="margin-bottom:6px">${esc(s.manual_note || '')}</div>
        <ul style="margin:6px 0 12px 18px;padding:0;line-height:1.9">${lines.join('')}</ul>
        <form method="post" action="/pay/${encodeURIComponent(invoice.id)}/manual/submit">
          <label for="manual_trx_sender">Your number (the one you paid from)</label>
          <input id="manual_trx_sender" name="trx_sender" required placeholder="01XXXXXXXXX" autocomplete="off">
          <label for="manual_trx_id">Transaction ID (TrxID)</label>
          <input id="manual_trx_id" name="trx_id" required placeholder="e.g. 9G7H2K4LMN" autocomplete="off">
          <button type="submit" class="btn" style="margin-top:12px;width:100%">Submit for verification</button>
        </form>
      </div>`;
  },
};
