'use strict';
// Demo provider — works completely offline. Lets you test the full
// checkout → webhook → success-redirect flow on localhost. NOT real money.
module.exports = {
  id: 'demo',
  name: '🧪 Demo Payment (test)',
  isEnabled: (s) => (s.demo_enabled ?? '1') === '1',
  panel(invoice, _s, _ctx) {
    return `
      <form method="post" action="/pay/${encodeURIComponent(invoice.id)}/demo/complete">
        <button type="submit" class="provider-btn" style="background:linear-gradient(90deg,#1e3a8a,#312e81);border-color:#3730a3">
          <span>Pay now (simulated) <small class="muted">— no real money moves</small></span>
          <span>→</span>
        </button>
      </form>`;
  },
};
