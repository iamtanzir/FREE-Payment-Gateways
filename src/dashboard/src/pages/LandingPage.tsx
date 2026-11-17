import "./landing.css";

export default function LandingPage() {
  return (
    <div className="fpg-lp">


<div className="wrap">
  <nav>
    <a className="brand" href="https://github.com/iamtanzir/FREE-Payment-Gateways">
      <svg viewBox="0 0 100 100" aria-hidden="true"><path fill="#fbbf24" d="M55 2 18 56h24L40 98 82 40H56z"/></svg>
      <span>FREE Payment Gateways<small>Self-hosted · Zero monthly fee</small></span>
    </a>
    <a className="gh-btn" href="https://github.com/iamtanzir/FREE-Payment-Gateways" rel="noopener">
      <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
      GitHub
    </a>
  </nav>
</div>

<header className="wrap">
  <div className="pill">⚡ Open Source · AGPL-3.0 License</div>
  <h1>Accept payments in Bangladesh<br />with <span className="hi">zero monthly fees</span> — forever.</h1>
  <p className="sub">Self-hosted payment gateway: Bangla QR, bKash / Nagad / Rocket / Upay / Bank (manual verification) and a full demo mode. One Node.js app, your own server, your own money flow — free rails only, zero per-transaction fees.</p>
  <div className="cta-row">
    <a className="btn btn-primary" href="/register">Quick start →</a>
    <a className="btn btn-ghost" href="/api-docs">Read the API docs</a>
  </div>

  <div className="notice">
    <strong>Heads up:</strong> this Cloudflare page is a static landing site only. The payment gateway itself is a stateful
    Node.js ≥ 22.5 server (Express + embedded SQLite or Postgres) and <strong>cannot run on Cloudflare Workers/Pages</strong>.
    <strong>So <code>this-url.workers.dev/admin</code> will show a 404 — the merchant dashboard and login page will NOT appear here.</strong>
    To run the gateway, deploy it on Render, Docker, a VPS, or any Node host — see
    <a href="https://github.com/iamtanzir/FREE-Payment-Gateways/blob/main/docs/DEPLOYMENT.md">docs/DEPLOYMENT.md</a>
    (বাংলা guide included) and <a href="https://github.com/iamtanzir/FREE-Payment-Gateways/blob/main/docs/MIGRATE-FREE-HOST.md">docs/MIGRATE-FREE-HOST.md</a> for $0 always-on alternatives.
    Once it's deployed on a Node host (optionally behind Cloudflare Tunnel), your merchant dashboard lives at <code>https://pay.yourdomain.com/admin</code>.
  </div>
</header>

<section className="wrap" id="rails">
  <h2>Payment rails</h2>
  <p className="lead">No gateway can move money with truly zero cost — the networks charge something. What you get here: zero monthly/setup fees, and rails that are genuinely free to run.</p>
  <div className="grid">
    <div className="card">
      <h3>📱 Bangla QR <span className="tag tag-free">Free</span></h3>
      <p>Customer scans <em>your own bank-issued</em> Bangla QR with any bank/MFS app → pays → enters TrxID → you approve. No SSLCommerz enrollment, no API fees.</p>
    </div>
    <div className="card">
      <h3>💸 bKash / Nagad / Rocket / Upay / Bank <span className="tag tag-free">Free</span></h3>
      <p>Manual verification: customer sends money to your own wallet/account, you approve in the admin dashboard, a signed webhook fires.</p>
    </div>
    <div className="card">
      <h3>📲 SMS auto-verify <span className="tag tag-free">Free · beta</span></h3>
      <p>তোমার MFS SIM-যে ফোনে আছে — SMS এলেই gateway নিজেই match করে invoice auto-paid করে দেয়। Forwarder app (MacroDroid/Tasker) + ১০ মিনিট। Self-hosted, zero fee, zero manual TrxID checks.</p>
      <p style={{ marginTop: "8px" }}><a href="https://github.com/iamtanzir/FREE-Payment-Gateways/blob/main/docs/AUTO-VERIFY.md">Setup guide →</a></p>
    </div>
    <div className="card">
      <h3>🧪 Demo mode <span className="tag tag-free">Free</span></h3>
      <p>Full test flow for development — simulated payment, webhooks, approval — no money moves.</p>
    </div>
    <div className="card">
      <h3>🧩 Website / ISP / POS / সবাই</h3>
      <p>Website-এ checkout, ISP-র মাসিক বিল (SMS + link), POS counter-এ payment — সবই। <strong>Payment Links</strong> (<code>/admin → Pay Links</code>) — fixed/reusable pay URL, কোনো code লাগে না। Recipes: <a href="https://github.com/iamtanzir/FREE-Payment-Gateways/blob/main/docs/USE-CASES.md">USE-CASES.md</a></p>
    </div>
    <div className="card">
      <h3>🌐 WordPress / WooCommerce <span className="tag tag-free">Free</span></h3>
      <p>Bundled AGPL-3.0 plugin: two WooCommerce gateways plus an <code>[fpg_pay]</code> shortcode for any page or post.</p>
    </div>
  </div>
</section>

<section className="wrap" id="dashboard">
  <h2>Merchant যা দেখবে — Admin Dashboard</h2>
  <p className="lead">Merchant তাঁর নিজের deploy করা instance-এ <code>/admin</code> e login করবে। সেখানে থাকবে: আজকের sales, pending invoices, আর যেগুলো manual/Bangla QR টাকা এসেছে কিন্তু TrxID দিয়ে customer জমা দিয়েছে — সেগুলোর approve/reject queue। নিচেরটা illustrated preview; সব ৳ amount sample data।</p>

  <div className="browser" role="img" aria-label="Illustration of the FREE Payment Gateways merchant admin dashboard, showing paid today stats, a manual-approval queue and recent invoices">
    <div className="chrome">
      <div className="dots"><i className="dot-r"></i><i className="dot-y"></i><i className="dot-g"></i></div>
      <div className="addr">https://pay.yourdomain.com/admin</div>
    </div>
    <div className="mock">
      <div className="mnav">
        <span className="mbrand">⚡ FREE Payment Gateways</span>
        <span className="active">Dashboard</span><span>Invoices</span><span>Settings</span><span>API Keys</span><span>Sign out</span>
      </div>

      <div className="stats4">
        <div className="statcard"><div className="n">12</div><small>Paid today</small></div>
        <div className="statcard"><div className="n">৳18,450</div><small>Volume today</small></div>
        <div className="statcard"><div className="n">7</div><small>Pending invoices</small></div>
        <div className="statcard"><div className="n warn-n">2</div><small>Manual approvals waiting</small></div>
      </div>

      <div className="mock-panel">
        <h4>⏳ Waiting for verification (manual / Bangla QR)</h4>
        <div className="qrow">
          <div><strong>bKash · ৳620</strong><div className="meta">Grocery order #1042 · TrxID 8N7K2M9A1Q · from 01711000000</div></div>
          <div><button className="qbtn approve">Approve</button> <button className="qbtn reject">Reject</button></div>
        </div>
        <div className="qrow">
          <div><strong>Bangla QR · ৳1,850</strong><div className="meta">Premium T-shirt x2 · TrxID 9B2T81C4KD</div></div>
          <div><button className="qbtn approve">Approve</button> <button className="qbtn reject">Reject</button></div>
        </div>
      </div>

      <div className="mock-panel">
        <h4>Recent invoices</h4>
        <table className="mock-table">
          <thead><tr><th>ID</th><th>Amount</th><th>Provider</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>inv_gVttpFBHXbhyLj0d</td><td>৳1,850</td><td>demo</td><td><span className="mpill mpill-paid">PAID</span></td></tr>
            <tr><td>inv_35BDEuGZQi0YlNgF</td><td>৳620</td><td>manual (bKash)</td><td><span className="mpill mpill-pending">PENDING</span></td></tr>
            <tr><td>inv_ZyJjaFuGCv5EztDD</td><td>৳12,900</td><td>—</td><td><span className="mpill mpill-pending">PENDING</span></td></tr>
            <tr><td>inv_Z2d4SE7PESl8rOuu</td><td>৳350.50</td><td>—</td><td><span className="mpill mpill-failed">FAILED</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  <p className="caption">↑ Illustrated preview (sample data). পুরোটা দেখতে উপরের Quick start follow করে <code>npm start</code> চালিয়ে <code>/admin</code>-এ login করে দেখুন।</p>
</section>

<section className="wrap" id="mfs">
  <h2>কোন MFS set করবেন — কীভাবে (বাংলাদেশ)</h2>
  <p className="lead">সবচেয়ে সহজে শুরু: <strong>Manual bKash + Nagad + Bangla QR</strong> — পুরোপুরি free। সব settings <code>/admin → Settings</code> থেকে হবে, কোড touch লাগে না। এই project-এ ইচ্ছাকৃতভাবে কোনো per-transaction-fee provider (bKash Tokenized, Stripe) নেই — MFS-এ কোনো charge লাগে না।</p>
  <div className="table-wrap">
    <table>
      <thead><tr><th>Rail</th><th>কাকে লাগবে</th><th>কী লাগবে</th><th>কোথায় set করবেন</th><th>খরচ</th></tr></thead>
      <tbody>
        <tr><td><strong>📱 Manual bKash</strong></td><td>সবার জন্য — শুরু করুন এখান থেকেই</td><td>আপনার bKash নম্বর (personal বা merchant)</td><td>Settings → <em>Enable manual payments</em> ✅ → <em>bKash number (Send Money to)</em> → Save</td><td>Free</td></tr>
        <tr><td><strong>📱 Manual Nagad</strong></td><td>Nagad-heavy customer base</td><td>আপনার Nagad নম্বর</td><td>Settings → <em>Nagad number</em></td><td>Free</td></tr>
        <tr><td><strong>🚀 Manual Rocket</strong></td><td>DBBL Rocket ব্যবহারকারীরা</td><td>Rocket নম্বর (যেমন 017…-1)</td><td>Settings → <em>Rocket number</em></td><td>Free</td></tr>
        <tr><td><strong>🏦 Bank account</strong></td><td>বড় amount / B2B</td><td>Bank account details (free text)</td><td>Settings → <em>Bank account details</em></td><td>Free</td></tr>
        <tr><td><strong>🇧🇩 Bangla QR</strong></td><td>সবার জন্য — scan করে pay</td><td>আপনার <em>নিজের ব্যাংকের</em> Bangla QR (DBBL Nexus / City Bank / EBL / যেকোনো bank app) → QR টা image আকারে <code>public/banglaqr.png</code>-এ আপলোড → URL <code>/banglaqr.png</code></td><td>Settings → <em>Enable Bangla QR</em> ✅ → <em>Bangla QR image URL</em> + <em>instructions</em></td><td>Free</td></tr>
        <tr><td><strong>🧪 Demo</strong></td><td>development / testing</td><td>কিছুই না — simulated payment</td><td>Settings → <em>Enable demo payments</em> ✅ (default on; production-এ off করতে পারেন)</td><td>Free</td></tr>
      </tbody>
    </table>
  </div>

  <h2 style={{ marginTop: "34px" }}>Payment approve হওয়ার flow</h2>
  <p className="lead">Manual/Bangla QR-এর ক্ষেত্রে নিজে নিজে paid mark হয় না — এটা যেন fraud হয় (customer মিথ্যা TrxID দিতে পারে); merchant verify করে approve দেয়:</p>
  <ol className="steps">
    <li>Customer checkout page-এ (<code>/pay/:id</code>) আপনার bKash/Nagad/Rocket নম্বরে বা Bangla QR-এ টাকা পাঠায় → <strong>TrxID + sender number</strong> দেয়</li>
    <li>Invoice <code>pending</code> থাকে — কোনো টাকা auto-credit হয় না</li>
    <li>Merchant <code>/admin → Invoices</code>-এ ঢুকে <strong>TrxID মিলিয়ে দেখে</strong> (নিজের bKash/Nagad app-এ) → <strong>Approve</strong> → invoice <code>paid</code> + webhook fire (<code>payment.paid</code>) → WooCommerce order auto-complete</li>
    <li>না মিললে → <strong>Reject</strong> → invoice <code>failed</code></li>
  </ol>
  <p className="caption" style={{ textAlign: "left", marginTop: "14px" }}>Note: Upay-এর আলাদা field <code>/admin → Settings</code>-এ নেই — Upay নিতে চাইলে <em>Bank account details</em> (free text) field-এ আপনার Upay নম্বর লিখে দিন, আর <em>Customer instructions</em>-এ "Upay-এ send money" mention করুন।</p>
</section>

<section className="wrap" id="quickstart">
  <h2>Up and running in 5 steps</h2>
  <p className="lead">Requirements: Node.js ≥ 22.5 (built-in <code>node:sqlite</code>). Node 24/26 recommended.</p>
  <ol className="steps">
    <li><code>git clone https://github.com/iamtanzir/FREE-Payment-Gateways.git && cd FREE-Payment-Gateways</code></li>
    <li><code>npm install</code></li>
    <li><code>npm start</code> → open <code>http://localhost:3000</code> — the admin password is printed once in the console</li>
    <li><code>/admin → API Keys → Create</code> → copy your key</li>
    <li>Point your site at the REST API or drop the WordPress plugin in — full guide in <a href="https://github.com/iamtanzir/FREE-Payment-Gateways/blob/main/docs/MERCHANT-SETUP.md">MERCHANT-SETUP.md</a></li>
  </ol>
</section>

<section className="wrap" id="deploy">
  <h2>Where can I deploy it?</h2>
  <p className="lead">Anywhere Node.js runs. Cloudflare Workers is the one place it can't — use Cloudflare as a proxy/tunnel in front of your host instead (see <a href="https://github.com/iamtanzir/FREE-Payment-Gateways/blob/main/docs/DEPLOYMENT.md">DEPLOYMENT.md §4F</a>).</p>
  <div className="table-wrap">
    <table>
      <thead><tr><th>Option</th><th>Cost</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>Render (Blueprint, <code>render.yaml</code>)</td><td>$0 free tier</td><td>One-click blueprint; free plan sleeps after ~15 min idle</td></tr>
        <tr><td>Google Cloud Run / Vercel</td><td>$0 free tier</td><td>Serverless — needs free Postgres via <code>DATABASE_URL</code>; <code>*.run.app</code>/<code>*.vercel.app</code> URL with HTTPS</td></tr>
        <tr><td>Koyeb</td><td>Paid (free tier ended)</td><td>Scale-to-zero ECO compute, billed per second — no longer $0</td></tr>
        <tr><td>Docker / docker-compose</td><td>Your host</td><td><code>Dockerfile</code> included; works on any VPS, PC or Raspberry Pi / Orange Pi</td></tr>
        <tr><td>Raspberry Pi / Orange Pi (ARM64)</td><td>$0 (hardware you already have)</td><td>Docker or direct Node 24; free HTTPS via DuckDNS + Caddy — see DEPLOY-ANYWHERE.md</td></tr>
        <tr><td>Oracle Cloud Always Free / AWS EC2 free tier</td><td>$0 forever / $0 for 12 months</td><td>Best $0 24/7 alternative — see MIGRATE-FREE-HOST.md</td></tr>
        <tr><td><strong>Full matrix (12 platforms) incl. Railway, Vercel, AWS</strong></td><td>per host</td><td><a href="https://github.com/iamtanzir/FREE-Payment-Gateways/blob/main/docs/DEPLOY-ANYWHERE.md">docs/DEPLOY-ANYWHERE.md</a></td></tr>
        <tr><td>cPanel / Hostinger shared hosting</td><td>~hosting cost</td><td>Passenger/Node setup guide included</td></tr>
        <tr><td>WordPress plugin (self-hosted gateway required)</td><td>Free plugin</td><td>Plugin talks to your gateway instance; it is not standalone</td></tr>
      </tbody>
    </table>
  </div>
</section>

<footer>
  <div className="wrap">
    <div>© A.K.M. Tanzir Ahmed (<a href="https://github.com/iamtanzir">iamtanzir</a>) · AGPL-3.0 License</div>
    <div><a href="https://github.com/iamtanzir/FREE-Payment-Gateways">Source on GitHub</a> · <a href="https://github.com/iamtanzir/FREE-Payment-Gateways/blob/main/LICENSE">License</a> · <a href="https://github.com/iamtanzir/FREE-Payment-Gateways/blob/main/docs/DEPLOYMENT.md">Deployment guide</a></div>
  </div>
</footer>

    </div>
  );
}
