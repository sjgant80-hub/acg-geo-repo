// acg-geo-repo · scripts/inline.mjs — put the gated generator into index.html byte for byte, between the GEO markers,
// so the "Try it" demo on the page runs exactly the code CI mutation-gates.
//   node scripts/inline.mjs           write it
//   node scripts/inline.mjs --check   fail unless the page already holds it
import { readFileSync, writeFileSync } from 'node:fs';

const NL = String.fromCharCode(10);
const pageUrl = new URL('../index.html', import.meta.url);
const src = readFileSync(new URL('./geo.mjs', import.meta.url), 'utf8').replace(/\r\n/g, NL);
const page = readFileSync(pageUrl, 'utf8').replace(/\r\n/g, NL);

export function kernelBody(s) {
  const a = s.indexOf('export const VERTICALS'), b = s.indexOf('export default');
  if (a < 0 || b < a) throw new Error('scripts/geo.mjs has no export const VERTICALS … export default span');
  return s.slice(a, b).replace(/\bexport /g, '').trimEnd();
}

const BEGIN = '/*GEO:BEGIN*/', END = '/*GEO:END*/';
const i = page.indexOf(BEGIN), j = page.indexOf(END);
if (i < 0 || j < i) { console.error('index.html has no ' + BEGIN + ' … ' + END + ' markers'); process.exit(1); }
const next = page.slice(0, i + BEGIN.length) + NL + kernelBody(src) + NL + page.slice(j);
if (process.argv.includes('--check')) {
  if (next !== page) { console.error('index.html does not hold the current scripts/geo.mjs. Run: node scripts/inline.mjs'); process.exit(1); }
  console.log('index.html holds the gated generator byte for byte');
} else {
  writeFileSync(pageUrl, next);
  console.log('generator inlined into index.html');
}
