'use strict';
// Stripe provider — free to sign up, no monthly fee, pay-per-transaction.
// NOTE: Stripe does NOT support BDT. Use bKash/Manual for Bangladeshi Taka.
const crypto = require('crypto');

module.exports = {
  id: 'stripe',
  name: '💳 Stripe (Card / Apple Pay — per-transaction fee)',
  isEnabled: (s) => Boolean(s.stripe_secret_key),

  async begin(invoice, s, ctx) {
    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', `${ctx.baseUrl}/pay/${encodeURIComponent(invoice.id)}/return?provider=stripe`);
    params.set('cancel_url', `${ctx.baseUrl}/pay/${encodeURIComponent(invoice.id)}/cancel`);
    params.set('client_reference_id', invoice.id);
    params.set('line_items[0][price_data][currency]', String(invoice.currency).toLowerCase());
    params.set('line_items[0][price_data][product_data][name]', invoice.description || 'Payment');
    params.set('line_items[0][price_data][unit_amount]', String(invoice.amount_minor));
    params.set('line_items[0][quantity]', '1');

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${s.stripe_secret_key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Stripe error (${res.status}): ${text.slice(0, 300)}`);
    }
    const data = await res.json();
    return { redirect: data.url, providerRef: data.id };
  },

  /** Verify the Stripe-Signature header (`t=…,v1=…`, HMAC-SHA256 of `${t}.${rawBody}`). */
  verifyWebhook(rawBody, headers, s) {
    const secret = s.stripe_webhook_secret;
    if (!secret) return true; // not configured → accept (documented behaviour)
    const header = headers['stripe-signature'] || headers['Stripe-Signature'] || '';
    const parts = Object.fromEntries(
      String(header).split(',').map((kv) => {
        const idx = kv.indexOf('=');
        return [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()];
      })
    );
    if (!parts.t || !parts.v1) return false;
    const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');
    const a = Buffer.from(String(parts.v1));
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  },

  webhookEvent(rawBody) {
    try {
      const body = JSON.parse(rawBody.toString('utf8'));
      const obj = body.data && body.data.object ? body.data.object : {};
      return {
        type: body.type,
        invoiceId: obj.client_reference_id || null,
        providerRef: obj.id || null,
      };
    } catch {
      return {};
    }
  },
};
