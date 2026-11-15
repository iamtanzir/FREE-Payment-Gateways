'use strict';
// BTCPay Server provider — the only truly FREE-forever, zero-fee way to accept
// real money (Bitcoin/Lightning + stablecoins). Self-host BTCPay via Docker.
// Docs: docs/BTCPAY.md
module.exports = {
  id: 'btcpay',
  name: '₿ BTCPay Server (Bitcoin / Lightning — 0% fee)',
  isEnabled: (s) => Boolean(s.btcpay_url && s.btcpay_store_id && s.btcpay_api_key),

  async begin(invoice, s, ctx) {
    const base = String(s.btcpay_url).replace(/\/+$/, '');
    const amount = (Number(invoice.amount_minor) / 100).toFixed(2);
    const res = await fetch(`${base}/api/v1/stores/${encodeURIComponent(s.btcpay_store_id)}/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${s.btcpay_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: invoice.currency,
        metadata: { orderId: invoice.id },
        checkout: {
          redirectURL: `${ctx.baseUrl}/pay/${encodeURIComponent(invoice.id)}/return?provider=btcpay`,
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`BTCPay Server error (${res.status}): ${text.slice(0, 300)}`);
    }
    const data = await res.json();
    return { redirect: data.checkoutLink, providerRef: data.id };
  },

  /** Verify the BTCPay webhook signature (hex HMAC-SHA256 of the raw body). */
  verifyWebhook(rawBody, headers, s) {
    const secret = s.btcpay_webhook_secret;
    if (!secret) return true; // not configured → accept (documented behaviour)
    const sig = headers['btcpay-sig'] || headers['BTCPay-Sig'];
    if (!sig) return false;
    const expected = require('crypto').createHmac('sha256', secret).update(rawBody).digest('hex');
    return require('crypto').timingSafeEqual
      ? safeEq(String(sig), expected)
      : String(sig) === expected;
  },

  webhookEvent(rawBody) {
    try {
      const body = JSON.parse(rawBody.toString('utf8'));
      return { type: body.type, invoiceId: body.invoiceId || (body.metadata && body.metadata.orderId) };
    } catch {
      return {};
    }
  },
};

function safeEq(a, b) {
  try {
    const ba = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    if (ba.length !== bb.length) return false;
    return require('crypto').timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
