// acg-geo-repo · scripts/page-parity.test.mjs — the page and the repo tell the truth about each other.
// 1. index.html runs scripts/geo.mjs byte for byte, and the inlined copy agrees with the module.
// 2. Every file the page's tree, the README and the guide name is in the repo (this repo once advertised a generator,
//    seven templates and a guide that did not exist; this test is why that cannot happen again).
// 3. The deploy steps run the real command; the examples are what the generator writes; nothing says TBA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import G from './geo.mjs';

const NL = String.fromCharCode(10);
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, NL);
const exists = (p) => existsSync(new URL('../' + p, import.meta.url));
const page = read('index.html');
const src = read('scripts/geo.mjs');
const body = src.slice(src.indexOf('export const VERTICALS'), src.indexOf('export default')).replace(/\bexport /g, '').trimEnd();

test('index.html inlines scripts/geo.mjs byte for byte, and nothing in it can end the page script early', () => {
  assert.ok(body.length > 5000);
  // inside an HTML script block the browser ends the script at the first closing script tag, even in a JS string or
  // comment, and treats a comment opener specially; the inlined generator must contain neither
  assert.ok(!/<\/script/i.test(body), 'the inlined generator spells a closing script tag');
  assert.ok(!body.includes('<!--'), 'the inlined generator contains an HTML comment opener');
  const ui = page.slice(page.indexOf('/*GEO:END*/'), page.indexOf('</script>', page.indexOf('/*GEO:END*/')));
  assert.ok(ui.includes('generate();') && ui.includes("fetch('template/config.json')"), 'the page script runs to its end, past the generator');
  assert.ok(page.includes('/*GEO:BEGIN*/' + NL + body + NL + '/*GEO:END*/'));
});

test('the inlined generator agrees with the module on the template and on a refusal', () => {
  const ctx = { URL };
  vm.runInNewContext(body + NL + ';globalThis.__g = { render };', ctx);
  const cfg = JSON.parse(read('template/config.json'));
  assert.equal(JSON.stringify(ctx.__g.render(cfg, { date: '2026-11-16' })), JSON.stringify(G.render(cfg, { date: '2026-11-16' })));
  assert.equal(JSON.stringify(ctx.__g.render({})), JSON.stringify(G.render({})));
});

test('every file the page tree lists is in the repo', () => {
  const tree = page.slice(page.indexOf('<pre><code>acg-geo-repo/'), page.indexOf('</code></pre>', page.indexOf('<pre><code>acg-geo-repo/')));
  const stack = [];
  let checked = 0;
  for (const line of tree.split(NL).slice(1)) {
    const m = line.match(/^((?:│   |    )*)(?:├── |└── )([^\s←]+)/);
    if (!m) continue;
    const depth = m[1].length / 4, name = m[2];
    stack.length = depth;
    const p = [...stack, name].join('/');
    if (name.endsWith('/')) { stack[depth] = name.slice(0, -1); assert.ok(exists(p), 'folder ' + p); checked++; continue; }
    if (name.includes('*')) {
      const re = new RegExp('^' + name.replace(/[.]/g, '\\.').replace('*', '[^/]+') + '$');
      const dir = stack.join('/');
      const found = readdirNames(dir).filter((f) => re.test(f));
      assert.ok(found.length > 0, 'nothing in ' + dir + ' matches ' + name);
      checked++; continue;
    }
    assert.ok(exists(p), 'the page lists ' + p + ', which is not in the repo');
    checked++;
  }
  assert.ok(checked >= 20, 'the tree was read (' + checked + ' entries)');
});


function readdirNames(dir) { return readdirSync(new URL('../' + (dir ? dir + '/' : ''), import.meta.url)); }

test('the README, the guide, llms.txt and ai.html name only files that exist', () => {
  const docs = ['README.md', 'guide/index.html', 'guide/advanced.html', 'llms.txt', 'ai.html'];
  const named = new Set();
  for (const d of docs) for (const m of read(d).matchAll(/(?:scripts|template|guide|agents)\/[a-z0-9._-]+\.(?:json|mjs|js|html)\b/g)) named.add(m[0]);
  assert.ok(named.has('scripts/build.js') && named.has('scripts/geo.mjs') && named.has('template/config.json'));
  for (const p of named) assert.ok(exists(p), p + ' is named in the docs but is not in the repo');
});

test('the deploy steps run the real command, and the examples are what the generator writes', () => {
  assert.ok(page.includes('node scripts/build.js template/config.json docs'));
  const cfg = JSON.parse(read('template/config.json'));
  for (const [id, v] of Object.entries(G.VERTICALS)) {
    const want = G.render({ ...cfg, vertical: { id } }).files['manifest.json'];
    assert.equal(read('template/' + v.protocol.split('/')[0] + '.example.json'), want, id + ' example is out of date');
  }
});

test('no surface still says TBA, and the page names no prices', () => {
  for (const f of ['index.html', 'README.md', 'ai.html', 'llms.txt', 'manifest.json', 'guide/index.html', 'guide/advanced.html']) assert.ok(!/\bTBA\b/.test(read(f)), f + ' says TBA');
  const text = page.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
  assert.ok(!/[£€]\s?\d/.test(text), 'a price on the page');
});

test('no claim the generator cannot back: no promised recommendation, no unmeasured speed, no entities it never writes', () => {
  // each of these was on the page before the generator's claims were checked against its code (2026-11-16)
  const CLAIMS = [/~?50 ?ms/i, /invisible to those crawlers/i, /No more "GPT/i, /\bPerson \+|\+ Place\b|Product\/Service\/Place/i, /cited more often/i, /read this before touching the HTML/i];
  for (const f of ['index.html', 'README.md', 'llms.txt', 'ai.html', 'guide/index.html', 'guide/advanced.html']) {
    for (const re of CLAIMS) assert.ok(!re.test(read(f)), f + ' claims ' + re);
  }
  assert.ok(page.includes('It cannot make an assistant recommend the client'), 'the page says what the kit cannot do');
});

test('the brochure answers each buyer, names the supplier, prints no price, and measures its one figure', () => {
  const biz = page.slice(page.indexOf('<section class="section" id="business">'), page.indexOf('<section class="section" id="deploy">'));
  for (const h of ['The owner', 'Finance', 'The guild member', 'Technical lead', 'Marketing', 'The board', 'Against what you pay now', 'Security and data protection', 'Ownership, support and exit', 'Risks, answered straight']) {
    assert.ok(biz.includes(h), 'brochure: ' + h);
  }
  assert.ok(biz.includes('href="https://www.ai-nativesolutions.com/">AI Native Solutions</a>'), 'supplier named');
  assert.ok(biz.includes('MIT, © Simon Gant'), 'licence holder');
  assert.ok(!/[£€$]\s?\d/.test(biz.replace(/<[^>]+>/g, ' ')), 'no price or money figure in the brochure');
  assert.ok(page.includes("$('yield')") && page.includes("files[name].split('\\n').length"), 'the brochure figure is computed from the generated files');
});

test('the page builds its output with text nodes, never innerHTML', () => {
  const ui = page.slice(page.indexOf('/*GEO:END*/'));
  assert.ok(!/\.innerHTML\s*=|insertAdjacentHTML|document\.write/.test(ui.slice(0, ui.indexOf('</script>'))));
});
