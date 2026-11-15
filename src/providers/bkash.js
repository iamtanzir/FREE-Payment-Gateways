'use strict';
// bKash Tokenized Checkout — free to open a merchant account (fees per transaction).
// Sandbox: https://sandbox.bka.sh  |  Live: merchant.bka.sh
// Set bkash_sandbox=1 while testing; toggle to 0 for production.
const BASE = {
  sandbox: 'https://tokenized.sandbox.bka.sh/v1.2.0-beta',
  live: 'https://tokenized.pay.bka.sh/v1.2.0-beta',
};

async function grantToken(s) {
  const base = (s.bkash_sandbox ?? '1') === '1' ? BASE.sandbox : BASE.live;
  const res = await fetch(`${base}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'username': s.bkash_username,
      'password': s.bkash_password,
    },
    body: JSON.stringify({ app_key: s.bkash_app_key, app_secret: s.bkash_app_secret }),
  });
  if (!res.ok) throw new Error(`bKash token grant failed (${res.status})`);
  const data = await res.json();
  if (!data.id_token) throw new Error('bKash token grant: missing id_token — check app_key/secret/username/password');
  return { base, idToken: data.id_token };
}

module.exports = {
  id: 'bkash',
  name: '🩷 bKash Tokenized Checkout (auto-verify)',
  isEnabled: (s) =>
    s.bkash_enabled === '1' &&
    Boolean(s.bkash_app_key && s.bkash_app_secret && s.bkash_username && s.bkash_password),

  async begin(invoice, s, ctx) {
    const { base, idToken } = await grantToken(s);
    const amount = (Number(invoice.amount_minor) / 100).toFixed(2);
    const res = await fetch(`${base}/tokenized/checkout/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': idToken,
        'X-APP-Key': s.bkash_app_key,
      },
      body: JSON.stringify({
        mode: '0011',
        payerReference: invoice.customer_phone || invoice.id,
        callbackURL: `${ctx.baseUrl}/pay/${encodeURIComponent(invoice.id)}/bkash/return`,
        amount,
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: invoice.id,
      }),
    });
    if (!res.ok) throw new Error(`bKash create payment failed (${res.status})`);
    const data = await res.json();
    if (!data.bkashURL) {
      throw new Error('bKash create payment: ' + JSON.stringify(data).slice(0, 300));
    }
    return { redirect: data.bkashURL, providerRef: data.paymentID };
  },

  /** Called on GET /pay/:id/bkash/return?paymentID&status — executes the payment. */
  async execute(paymentID, s) {
    const { base, idToken } = await grantToken(s);
    const res = await fetch(`${base}/tokenized/checkout/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': idToken,
        'X-APP-Key': s.bkash_app_key,
      },
      body: JSON.stringify({ paymentID }),
    });
    if (!res.ok) throw new Error(`bKash execute failed (${res.status})`);
    return res.json();
  },
};
