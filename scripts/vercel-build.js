/**
 * Build step used by Vercel (see `vercel.json`).
 *
 * The gateway is a stateful Node app served by the `api/index.js` serverless
 * function — there is intentionally nothing for Vercel to upload as a static
 * site. Vercel still requires a non-empty output directory, so we emit a
 * single metadata file here instead of pretending the repo has static output.
 *
 * The file deliberately does NOT share any real request path (no `index.html`,
 * no assets), so it can never shadow the gateway routes, regardless of how
 * Vercel orders its static-file and rewrite handling.
 */

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', '.vercel-static');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, 'build.json'),
  JSON.stringify(
    {
      name: 'FREE Payment Gateways',
      note: 'No static site is published. All routes are rewritten to the api/index.js serverless function, which serves the gateway itself (public/ is bundled into the function via includeFiles).',
      version: require('../package.json').version,
    },
    null,
    2
  ) + '\n',
  'utf8'
);

console.log(`[vercel-build] wrote ${path.join('.vercel-static', 'build.json')}`);
