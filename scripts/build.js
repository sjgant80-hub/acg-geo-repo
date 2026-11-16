#!/usr/bin/env node
// acg-geo-repo · scripts/build.js — the generator's command line. All the logic is in scripts/geo.mjs (mutation-gated).
//
//   node scripts/build.js                              template/config.json → client/
//   node scripts/build.js my-client.json out/          any config → any folder
//   node scripts/build.js --examples                   write template/<protocol>.example.json for every vertical
//   node scripts/build.js --check-examples             fail unless those files are exactly what the generator gives
//
// Exit code 0 on success, 1 when the config is refused (every reason is printed), 2 when the examples are out of date.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXAMPLE_CONFIG = path.join(ROOT, 'template', 'config.json');

function readConfig(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.error('cannot read ' + file + ': ' + e.message); process.exit(1); }
}

(async () => {
  const geo = await import('./geo.mjs');
  const args = process.argv.slice(2);

  if (args[0] === '--examples' || args[0] === '--check-examples') {
    const cfg = readConfig(EXAMPLE_CONFIG);
    let stale = 0;
    for (const [id, v] of Object.entries(geo.VERTICALS)) {
      const r = geo.render({ ...cfg, vertical: { id } });
      if (!r.ok) { console.error('the example config is refused for ' + id + ': ' + r.errors.join('; ')); process.exit(1); }
      const file = path.join(ROOT, 'template', v.protocol.split('/')[0] + '.example.json');
      const want = r.files['manifest.json'];
      if (args[0] === '--examples') { fs.writeFileSync(file, want); console.log('wrote ' + path.relative(ROOT, file)); continue; }
      const have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : null;
      if (have !== want) { stale++; console.error((have === null ? 'missing: ' : 'out of date: ') + path.relative(ROOT, file)); }
      else console.log('ok ' + path.relative(ROOT, file));
    }
    if (stale > 0) { console.error(stale + ' example(s) differ from the generator. Run: node scripts/build.js --examples'); process.exit(2); }
    return;
  }

  const cfgFile = path.resolve(args[0] || EXAMPLE_CONFIG);
  const out = path.resolve(args[1] || path.join(ROOT, 'client'));
  const r = geo.render(readConfig(cfgFile), { date: new Date().toISOString().slice(0, 10) });
  for (const w of r.warnings) console.warn('warning: ' + w);
  if (!r.ok) {
    console.error('refused: ' + path.relative(process.cwd(), cfgFile));
    for (const e of r.errors) console.error('  - ' + e);
    process.exit(1);
  }
  fs.mkdirSync(out, { recursive: true });
  for (const name of geo.FILES) {
    fs.writeFileSync(path.join(out, name), r.files[name]);
    console.log('wrote ' + path.relative(process.cwd(), path.join(out, name)));
  }
  console.log(geo.FILES.length + ' files for ' + path.relative(process.cwd(), cfgFile) + (r.warnings.length > 0 ? ' — read the warnings above before you publish' : ''));
})();
