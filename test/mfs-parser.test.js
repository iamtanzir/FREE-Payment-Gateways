'use strict';
// Universal BD MFS SMS parser — regression battery. Run: node test/mfs-parser.test.js
const assert = require('node:assert/strict');
const { parsePaymentSms, detectProvider, extractTrxId, PROVIDERS } = require('../src/mfs-parser');

let n = 0;
const ok = (cond, msg) => {
  assert.ok(cond, msg);
  n++;
  console.log('✓', msg);
};

const CASES = [
  // bKash (English SMS)
  ['bkash', 'bKash', 'You have received Tk 500.00 from 01XXXXXXXX. Fee Tk 0.00. Balance Tk 1,234.00. TrxID ABC123XYZ9 at 12/05/2026 14:32', 50000, 'ABC123XYZ9'],
  ['bkash', 'bKash', 'You have received Tk 1,999.50 from 01711223344. Balance Tk 9,999.99. TrxID 8N7K2M9A1Q Time: 17-May-26', 199950, '8N7K2M9A1Q'],
  ['bkash', 'bKash', 'Dear customer, you have received Tk 2,500.00 from 01799000000. TrxID AB1CD2EF3G.', 250000, 'AB1CD2EF3G'],

  // Nagad
  ['nagad', 'NAGAD', 'You have received Tk 500.00 from 01312345678. TrxID: 9F8K2MAB1C at 2026-05-12 14:32', 50000, '9F8K2MAB1C'],

  // Rocket
  ['rocket', 'ROCKET', 'Tk 500.00 received from 01316789012. Transaction ID: 25A1B2C3D4E at 12-05-2026', 50000, '25A1B2C3D4E'],
  ['rocket', '16216', 'You have received Tk 120.00 from 01316789012. Transaction ID: RC12345678AB at 01-06-2026', 12000, 'RC12345678AB'],

  // Upay
  ['upay', 'UPAY', 'You have received BDT 500.00 from 01612345678. TrxID: UP123ABC456', 50000, 'UP123ABC456'],
  ['upay', 'UPAY', 'আপনার কাছে ৫০০.০০ টাকা এসেছে। লেনদেন নম্বর: UP123ABC456', 50000, 'UP123ABC456'],

  // Other manual rails (parsed; provider detect best-effort)
  ['mcash', 'MCASH', 'You have received Tk 350.00 from 01811223344. Transaction ID: MC1122334455 at 12/06/2026 11:00', 35000, 'MC1122334455'],
  ['cellfin', 'CELLFIN', 'You have received Tk 700.00 from 01611223344. TrxID: CF9988776655 at 10/06/2026 09:20', 70000, 'CF9988776655'],

  // Digit same as amount substring in text should not confuse parser
  ['bkash', 'bKash', 'You have received Tk 1,000.00 from 01711223344. TrxID ZZ1122334455 at 12/05/2026', 100000, 'ZZ1122334455'],
];

for (const [provider, from, text, amount, trx] of CASES) {
  const r = parsePaymentSms({ from, text });
  ok(r.amountMinor === amount, `${provider}: amount ${amount / 100} BDT parsed from "${from}" SMS`);
  ok(r.trxId === trx, `${provider}: TrxID ${trx} extracted`);
  ok(r.provider === provider, `${provider}: provider detected as "${provider}"`);
}

// Provider detection sanity
ok(detectProvider('bKash', 'anything') === 'bkash', 'provider from sender id (bKash)');
ok(detectProvider('16216', 'anything') === 'rocket', 'provider from sender id (16216)');
ok(detectProvider('UPAY', 'anything') === 'upay', 'provider from sender id (UPAY)');
ok(detectProvider('somethingelse', 'Tk 500.00 ...') === null, 'unknown sender → provider null (no crash)');

// TrxID fallback must NOT match a plain BD mobile number
ok(extractTrxId('You have received Tk 500 from 01711223344.') === null, 'plain BD mobile number is not misread as TrxID');

// Malformed / missing data
for (const [from, text] of [
  ['bKash', 'You have received Tk 500.00 from 01X'],
  ['bKash', 'hello world'],
  ['nagad', 'You have received Tk ABC from 01312345678. TrxID: XYZABCDEFG'],
]) {
  let threw = false;
  try { parsePaymentSms({ from, text }); } catch { threw = true; }
  ok(threw, `unparsable SMS rejected ("${from}")`);
}

// Every known provider id parses its own canonical aliases without crashing
for (const p of PROVIDERS) {
  ok(typeof detectProvider(p.aliases[0], 'x') === 'string', `provider "${p.id}" detects its own alias`);
}

console.log(`\n✅ MFS parser tests passed (${n} assertions)`);
