'use strict';
const { esc } = require('./util');

const CSS = `
:root{--bg:#0b1220;--card:#16223c;--card2:#111a2e;--line:#243356;--text:#e8edf7;--muted:#9aa7c4;--accent:#fbbf24;--accent2:#fbbf24;--danger:#f87171;--warn:#fbbf24;}
*{box-sizing:border-box}
html{overflow-x:hidden}
body{margin:0;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:radial-gradient(1100px 500px at 50% -10%,#1b2b4d 0%,var(--bg) 60%);color:var(--text);min-height:100vh;min-height:100dvh;display:flex;flex-direction:column}
a{color:var(--accent2);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1080px;margin:0 auto;padding:24px 16px 0;width:100%;min-width:0;flex:1 0 auto;display:flex;flex-direction:column}
.nav{display:flex;align-items:center;flex-wrap:wrap;gap:8px 18px;padding:14px 20px;background:rgba(19,26,51,.85);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}
.brand{font-weight:800;font-size:18px;letter-spacing:.3px;background:linear-gradient(90deg,#fbbf24,#f59e0b);-webkit-background-clip:text;background-clip:text;color:transparent}
.nav a{color:var(--muted);font-size:14px;font-weight:600}.nav a:hover{color:var(--text);text-decoration:none}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px;box-shadow:0 12px 40px rgba(0,0,0,.35)}
.grid{display:grid;gap:16px}.grid-2{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}.grid-4{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
h1,h2,h3{margin:0 0 12px}h1{font-size:26px}h2{font-size:19px;color:#c9d3f5}
label{display:block;font-size:12px;color:var(--muted);margin:10px 0 4px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
input,select,textarea{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--card2);color:var(--text);font-size:14px}
input:focus,select:focus,textarea:focus{outline:2px solid var(--accent2);border-color:transparent}
.btn{display:inline-block;border:0;border-radius:10px;padding:11px 18px;font-weight:700;font-size:14px;cursor:pointer;background:#fbbf24;color:#241a02;transition:transform .1s}
.btn:hover{transform:translateY(-1px)}.btn-secondary{background:var(--card2);color:var(--text);border:1px solid var(--line)}
.btn-danger{background:linear-gradient(90deg,#f87171,#ef4444);color:#3f0a0a}.btn-warn{background:linear-gradient(90deg,#fbbf24,#f59e0b);color:#3a2503}
.btn-sm{padding:7px 12px;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:left}th{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px}
.pill{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700}
.pill-paid{background:#064e3b;color:#6ee7b7}.pill-pending{background:#422006;color:#fcd34d}.pill-failed{background:#450a0a;color:#fca5a5}.pill-cancelled{background:#1f2937;color:#d1d5db}
.muted{color:var(--muted);font-size:13px}.mono{font-family:ui-monospace,Consolas,monospace}
.alert{padding:12px 14px;border-radius:10px;margin:12px 0;font-size:14px}.alert-ok{background:#064e3b;color:#a7f3d0;border:1px solid #065f46}.alert-err{background:#450a0a;color:#fecaca;border:1px solid #7f1d1d}.alert-warn{background:#422006;color:#fde68a;border:1px solid #78350f}
.stat{font-size:28px;font-weight:800}.stat small{display:block;font-size:12px;color:var(--muted);font-weight:600}
.checkout{width:100%;max-width:520px;margin:0 auto;min-height:0;flex:1 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;justify-content:safe center;padding:24px 0}.amount{font-size:40px;font-weight:800;text-align:center;margin:6px 0}
.checkout .card{width:100%;max-width:520px;text-align:center}
.checkout .brand{justify-content:center}
.checkout label{margin-top:12px;text-align:left}
.checkout input{margin-top:4px}
.checkout .footer{margin-top:28px}
.login-title{font-size:20px;color:#c9d3f5;margin:0 0 12px}
.provider-btn{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;margin:8px 0;padding:14px 16px;border-radius:12px;border:1px solid var(--line);background:var(--card2);color:var(--text);cursor:pointer;font-size:15px;font-weight:600;text-align:left}
.provider-btn:hover{border-color:var(--accent2)}
.hr{border:0;border-top:1px solid var(--line);margin:16px 0}
.footer{text-align:center;color:var(--muted);font-size:12px;margin-top:auto;padding:28px 0 18px}
.footer a{color:var(--accent2);font-weight:700;white-space:nowrap}
.heart{display:inline-block;color:#fb7185;animation:heartbeat 1.15s ease-in-out infinite;transform-origin:center}
@keyframes heartbeat{0%,100%{transform:scale(1)}20%{transform:scale(1.35)}40%{transform:scale(.92)}60%{transform:scale(1.3)}80%{transform:scale(1)}}
code.key{display:block;padding:10px;background:#0a0f24;border:1px dashed var(--accent2);border-radius:8px;word-break:break-all;font-size:13px}
.sm{font-size:12px}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--accent2);outline-offset:2px}
@media(prefers-reduced-motion:reduce){.heart{animation:none}.btn{transition:none}}
@media(max-width:700px){
  .wrap{padding:18px 12px 0}
  .nav{padding:10px 14px;gap:8px 14px}
  .nav .brand{flex:1 1 100%}
  .nav a{font-size:13px}
  .nav a[href="/admin/logout"]{margin-left:auto}
  h1{font-size:22px}
  .card{padding:16px}
  .checkout{padding:18px 0}
  .checkout .card{padding:18px}
  .footer{padding:22px 0 14px}
}
@media(max-width:380px){
  .nav a{font-size:12px}
  .grid-2,.grid-4{grid-template-columns:1fr}
  .stat{font-size:24px}
}
`;

function layout({ title, body, nav }) {
  const t = esc(title || 'FREE Payment Gateways');
  const navHtml = nav === false ? '' : `
  <nav class="nav">
    <span class="brand">⚡ FREE Payment Gateways</span>
    <a href="/admin">Dashboard</a>
    <a href="/admin/invoices">Invoices</a>
    <a href="/admin/links">Pay Links</a>
    <a href="/admin/webhooks">Webhooks</a>
    <a href="/admin/sms">SMS Bridge</a>
    <a href="/admin/settings">Settings</a>
    <a href="/admin/keys">API Keys</a>
    <a href="/admin/logout" style="margin-left:auto">Logout</a>
  </nav>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0b1220">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath fill='%23fbbf24' d='M55 2 18 56h24L40 98 82 40H56z'/%3E%3C/svg%3E">
<title>${t}</title>
<style>${CSS}</style>
</head>
<body>
${navHtml}
<main class="wrap">
${body}
<div class="footer">⚡ FREE Payment Gateways · <a href="https://github.com/iamtanzir/FREE-Payment-Gateways/blob/main/LICENSE">AGPL-3.0 License</a> · <a href="https://github.com/iamtanzir/FREE-Payment-Gateways">Source</a> · <a href="https://github.com/iamtanzir/FREE-Payment-Gateways/blob/main/docs/DEPLOYMENT.md">Deployment guide</a> · Built with <span class="heart">❤️</span> using <a href="https://iamtanzir.github.io/" target="_blank" rel="noopener">Tanzir Ahmed</a></div>
</main>
</body>
</html>`;
}

function statusPill(status) {
  const s = String(status || 'pending');
  const cls = ['paid', 'pending', 'failed', 'cancelled'].includes(s) ? s : 'pending';
  return `<span class="pill pill-${cls}">${esc(s.toUpperCase())}</span>`;
}

module.exports = { layout, statusPill, esc };
