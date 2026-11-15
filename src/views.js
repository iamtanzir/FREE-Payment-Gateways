'use strict';
const { esc } = require('./util');

const CSS = `
:root{--bg:#0b1020;--card:#131a33;--card2:#1a2342;--line:#263158;--text:#e8ecf8;--muted:#9aa6ce;--accent:#34d399;--accent2:#38bdf8;--danger:#f87171;--warn:#fbbf24;}
*{box-sizing:border-box}
body{margin:0;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:radial-gradient(1200px 600px at 20% -10%,#1b2650 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#0f3b3a 0%,transparent 55%),var(--bg);color:var(--text);min-height:100vh}
a{color:var(--accent2);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1080px;margin:0 auto;padding:24px 16px 64px}
.nav{display:flex;align-items:center;gap:18px;padding:14px 20px;background:rgba(19,26,51,.85);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}
.brand{font-weight:800;font-size:18px;letter-spacing:.3px;background:linear-gradient(90deg,#34d399,#38bdf8);-webkit-background-clip:text;background-clip:text;color:transparent}
.nav a{color:var(--muted);font-size:14px;font-weight:600}.nav a:hover{color:var(--text);text-decoration:none}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px;box-shadow:0 12px 40px rgba(0,0,0,.35)}
.grid{display:grid;gap:16px}.grid-2{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}.grid-4{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
h1,h2,h3{margin:0 0 12px}h1{font-size:26px}h2{font-size:19px;color:#c9d3f5}
label{display:block;font-size:12px;color:var(--muted);margin:10px 0 4px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
input,select,textarea{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--card2);color:var(--text);font-size:14px}
input:focus,select:focus,textarea:focus{outline:2px solid var(--accent2);border-color:transparent}
.btn{display:inline-block;border:0;border-radius:10px;padding:11px 18px;font-weight:700;font-size:14px;cursor:pointer;background:linear-gradient(90deg,#34d399,#10b981);color:#052e21;transition:transform .1s}
.btn:hover{transform:translateY(-1px)}.btn-secondary{background:var(--card2);color:var(--text);border:1px solid var(--line)}
.btn-danger{background:linear-gradient(90deg,#f87171,#ef4444);color:#3f0a0a}.btn-warn{background:linear-gradient(90deg,#fbbf24,#f59e0b);color:#3a2503}
.btn-sm{padding:7px 12px;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:left}th{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px}
.pill{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700}
.pill-paid{background:#064e3b;color:#6ee7b7}.pill-pending{background:#422006;color:#fcd34d}.pill-failed{background:#450a0a;color:#fca5a5}.pill-cancelled{background:#1f2937;color:#d1d5db}
.muted{color:var(--muted);font-size:13px}.mono{font-family:ui-monospace,Consolas,monospace}
.alert{padding:12px 14px;border-radius:10px;margin:12px 0;font-size:14px}.alert-ok{background:#064e3b;color:#a7f3d0;border:1px solid #065f46}.alert-err{background:#450a0a;color:#fecaca;border:1px solid #7f1d1d}.alert-warn{background:#422006;color:#fde68a;border:1px solid #78350f}
.stat{font-size:28px;font-weight:800}.stat small{display:block;font-size:12px;color:var(--muted);font-weight:600}
.checkout{max-width:520px;margin:0 auto}.amount{font-size:40px;font-weight:800;text-align:center;margin:6px 0}
.provider-btn{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;margin:8px 0;padding:14px 16px;border-radius:12px;border:1px solid var(--line);background:var(--card2);color:var(--text);cursor:pointer;font-size:15px;font-weight:600;text-align:left}
.provider-btn:hover{border-color:var(--accent2)}
.hr{border:0;border-top:1px solid var(--line);margin:16px 0}
.footer{text-align:center;color:var(--muted);font-size:12px;margin-top:28px}
code.key{display:block;padding:10px;background:#0a0f24;border:1px dashed var(--accent2);border-radius:8px;word-break:break-all;font-size:13px}
`;

function layout({ title, body, nav }) {
  const t = esc(title || 'FREE-Payment-Gateways');
  const navHtml = nav === false ? '' : `
  <nav class="nav">
    <span class="brand">⚡ FREE-Payment-Gateways</span>
    <a href="/admin">Dashboard</a>
    <a href="/admin/invoices">Invoices</a>
    <a href="/admin/settings">Settings</a>
    <a href="/admin/keys">API Keys</a>
    <a href="/admin/logout" style="margin-left:auto">Logout</a>
  </nav>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<style>${CSS}</style>
</head>
<body>
${navHtml}
<main class="wrap">
${body}
<div class="footer">FREE-Payment-Gateways — self-hosted &amp; open source (MIT). Zero monthly fees.</div>
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
