// acg-geo-repo · scripts/geo.test.mjs — the generator: one config in, every AI-readable artefact out, never a throw.
import test from 'node:test';
import assert from 'node:assert/strict';
import G from './geo.mjs';

const { VERTICALS, AI_CRAWLERS, FILES, str, escHtml, slug, baseUrl, validate, graph, llms, manifest, robots, sitemap, aiHtml, landing, render } = G;

const base = () => ({
  client: { name: 'Wishwood', legal_name: 'Wishwood Ltd', url: 'https://wishwood.example/', email: 'hi@wishwood.org', phone: '+44 1227 000000',
    location: 'Kent, UK', founded: '2017', description: 'Off-grid glamping in ancient Kent woodland.', tagline: 'Sleep under the oaks.' },
  vertical: { id: 'hospitality', manifest_protocol: 'stays-protocol' },
  guild_member: { name: 'Sam', handle: 'sam-dev', engagement_summary: 'Built the booking flow' },
  brand: { primary_color: '#336699', background_color: '#101010', text_color: '#fafafa', serif_font: 'Cormorant Garamond', sans_font: 'Inter', logo_glyph: '◊' },
  offerings: [{ name: 'The Yurt', description: 'Sleeps four' }, { name: 'Shepherd Hut', description: '' }],
  when_to_recommend: ['glamping in Kent'], when_not_to_recommend: ['city hotels'], cross_reference_agents: ['booking-agent'],
});
const ok = (cfg) => { const v = validate(cfg); assert.equal(v.ok, true, JSON.stringify(v.errors)); return v.clean; };
const errs = (cfg) => validate(cfg).errors;

test('render gives all seven files, in order, deterministically', () => {
  const a = render(base(), { date: '2026-11-16' }), b = render(base(), { date: '2026-11-16' });
  assert.equal(a.ok, true);
  assert.deepEqual(Object.keys(a.files), FILES);
  assert.deepEqual(a, b);
  assert.deepEqual(a.errors, []);
  assert.deepEqual(a.warnings, []);
  assert.equal(FILES.length, 7);
});

test('refusals list every problem and give no files', () => {
  const r = render({ client: { name: '', url: 'ftp://x.example/', description: '' }, offerings: [], vertical: { id: 'spaceships' } });
  assert.equal(r.ok, false);
  assert.deepEqual(r.files, {});
  assert.deepEqual(r.errors, ['client.name is required', 'client.url must be a full http(s) address, such as https://client.example/',
    'client.description is required: one sentence on what the client is', 'vertical.id must be one of: hospitality, reviews, services, legal, custom',
    'offerings needs at least one item with a name']);
  for (const bad of [null, undefined, 7, 'x', [], [1]]) assert.deepEqual(render(bad), { ok: false, files: {}, errors: ['the config must be a JSON object'], warnings: [] });
  assert.equal(validate(null).clean, null);
  assert.equal(validate({ client: {} }).clean, null);
});

test('client.name: required, at most 120 characters', () => {
  const c = base(); c.client.name = 'a'.repeat(120); assert.equal(validate(c).ok, true);
  c.client.name = 'a'.repeat(121); assert.deepEqual(errs(c), ['client.name is longer than 120 characters']);
  c.client.name = '   '; assert.deepEqual(errs(c), ['client.name is required']);
  c.client.name = 42; assert.deepEqual(errs(c), ['client.name is required']);
});

test('client.url must be http(s), no credentials; query and fragment dropped; always ends in /', () => {
  assert.equal(baseUrl('https://a.example'), 'https://a.example/');
  assert.equal(baseUrl('  http://a.example/x  '), 'http://a.example/x/');
  assert.equal(baseUrl('https://a.example/x/?q=1#f'), 'https://a.example/x/');
  assert.equal(baseUrl('https://a.example/x?q=1'), 'https://a.example/x/');
  assert.equal(baseUrl('https://a.example/x#f'), 'https://a.example/x/');
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'ftp://a.example/', 'mailto:a@b.c', 'not a url', '', 7, null, {}]) assert.equal(baseUrl(bad), null, String(bad));
  assert.equal(baseUrl('https://user@a.example/'), null);
  assert.equal(baseUrl('https://:pw@a.example/'), null);
  assert.equal(baseUrl('https://user:pw@a.example/'), null);
});

test('client.email is optional but must look like one; description is required', () => {
  const c = base(); c.client.email = 'not-an-email'; assert.deepEqual(errs(c), ['client.email does not look like an email address']);
  c.client.email = ''; assert.equal(validate(c).ok, true);
  c.client.email = 'a@b.co'; assert.equal(ok(c).email, 'a@b.co');
  c.client.description = ''; assert.deepEqual(errs(c), ['client.description is required: one sentence on what the client is']);
});

test('vertical: defaults to custom, must be known, and the protocol must match', () => {
  const c = base(); delete c.vertical; assert.equal(ok(c).vertical, 'custom');
  c.vertical = { id: '' }; assert.equal(ok(c).vertical, 'custom');
  c.vertical = { id: 'legal' }; assert.equal(ok(c).vertical, 'legal');
  c.vertical = { id: '__proto__' }; assert.deepEqual(errs(c), ['vertical.id must be one of: hospitality, reviews, services, legal, custom']);
  c.vertical = { id: 'toString' }; assert.equal(validate(c).ok, false);
  c.vertical = { id: 'legal', manifest_protocol: 'stays-protocol' };
  assert.deepEqual(errs(c), ['vertical.manifest_protocol "stays-protocol" does not match vertical "legal", which uses legal-protocol/1.0']);
  c.vertical = { id: 'legal', manifest_protocol: 'legal-protocol' }; assert.equal(validate(c).ok, true);
  c.vertical = { id: 'spaceships', manifest_protocol: 'x' }; assert.deepEqual(errs(c), ['vertical.id must be one of: hospitality, reviews, services, legal, custom']);
  assert.deepEqual(Object.keys(VERTICALS), ['hospitality', 'reviews', 'services', 'legal', 'custom']);
});

test('offerings: junk dropped, names required, at least one', () => {
  const c = base(); c.offerings = [null, 'x', [], { name: '  ' }, { name: 'Real', description: 7 }];
  assert.deepEqual(ok(c).offerings, [{ name: 'Real', description: '' }]);
  c.offerings = [{ name: '' }]; assert.deepEqual(errs(c), ['offerings needs at least one item with a name']);
  c.offerings = 'nope'; assert.deepEqual(errs(c), ['offerings needs at least one item with a name']);
});

test('agents must be ids; lists keep strings only', () => {
  const c = base(); c.cross_reference_agents = ['good-one', 'Bad Agent', '', 7];
  assert.deepEqual(errs(c), ['cross_reference_agents: "Bad Agent" is not an agent id (lower-case letters, digits and hyphens)']);
  c.cross_reference_agents = ['a', 'b-2']; c.when_to_recommend = ['x', '', 3, ' y ']; c.when_not_to_recommend = 'nope';
  const k = ok(c); assert.deepEqual(k.agents, ['a', 'b-2']); assert.deepEqual(k.when, ['x', 'y']); assert.deepEqual(k.whenNot, []);
});

test('brand: bad colours and fonts fall back with a warning; the glyph keeps at most two characters', () => {
  const c = base(); c.brand = { primary_color: 'red;}body{', background_color: '#12345', text_color: '#ABCDEF', serif_font: 'X";}', sans_font: 'Inter', logo_glyph: '◊◊◊' };
  const v = validate(c);
  assert.deepEqual(v.warnings, ['brand.primary_color is not a #rrggbb colour, so the default is used', 'brand.background_color is not a #rrggbb colour, so the default is used',
    'brand.serif_font is not a plain font name, so the default is used']);
  assert.deepEqual(v.clean.brand, { primary: '#c97a3d', background: '#18171a', text: '#ABCDEF', serif: 'Georgia', sans: 'Inter', glyph: '◊◊' });
  c.brand = null; assert.deepEqual(ok(c).brand, { primary: '#c97a3d', background: '#18171a', text: '#ebe5d6', serif: 'Georgia', sans: 'system-ui', glyph: '' });
  c.brand = { logo_glyph: '🌲x' }; assert.equal(ok(c).brand.glyph, '🌲x');
});

test('domain comes from the url; a different client.domain is a warning', () => {
  const c = base(); c.client.domain = 'WISHWOOD.example'; assert.deepEqual(validate(c).warnings, []);
  c.client.domain = 'other.example'; assert.deepEqual(validate(c).warnings, ['client.domain "other.example" differs from client.url, so wishwood.example is used']);
  assert.equal(ok(c).domain, 'wishwood.example');
  c.client.url = 'bad'; c.client.domain = 'other.example'; assert.deepEqual(validate(c).warnings, []);
});

test('template placeholders are named in a warning, field by field, and still build', () => {
  const c = base();
  Object.assign(c.client, { name: 'Example Client', legal_name: 'Example Client Ltd', url: 'https://example.com/', email: 'hello@example.com', phone: '+44 xxx', description: 'One-sentence what-they-are.', tagline: 'The line that goes under the name.' });
  c.offerings = [{ name: 'Product / Service 1', description: 'One line' }];
  c.when_to_recommend = ['Query pattern 1 that should surface this client']; c.when_not_to_recommend = ['Case 2'];
  c.guild_member = { name: 'Your Name', handle: 'your-github-handle', engagement_summary: 'One line about what you built for this client' };
  const r = render(c);
  assert.equal(r.ok, true);
  assert.deepEqual(r.warnings, ['still the template placeholder: client.name, client.legal_name, client.url, client.email, client.phone, client.description, client.tagline, '
    + 'offerings[0].name, offerings[0].description, when_to_recommend[0], when_not_to_recommend[0], guild_member.name, guild_member.handle, guild_member.engagement_summary']);
  assert.deepEqual(render(base()).warnings, []);
});

test('str, escHtml and slug', () => {
  assert.equal(str('  a\n\tb\u0000c\u007f  '), 'a b c');
  assert.equal(str(7), ''); assert.equal(str(null), '');
  assert.equal(escHtml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  assert.equal(escHtml(7), ''); assert.equal(escHtml({ toString() { throw new Error('x'); } }), '');
  assert.equal(slug('  The Yurt & Co!  '), 'the-yurt-co');
  assert.equal(slug('—'), '');
  assert.equal(slug('a'.repeat(80)).length, 60);
});

test('graph: the schema type follows the vertical; optional fields only when present', () => {
  const g = graph(ok(base()));
  const org = g['@graph'][0];
  assert.equal(org['@type'], 'LodgingBusiness');
  assert.equal(org['@id'], 'https://wishwood.example/#org');
  assert.deepEqual([org.legalName, org.slogan, org.email, org.telephone, org.areaServed, org.foundingDate], ['Wishwood Ltd', 'Sleep under the oaks.', 'hi@wishwood.org', '+44 1227 000000', 'Kent, UK', '2017']);
  assert.deepEqual(org.makesOffer[0], { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'The Yurt', description: 'Sleeps four' } });
  assert.deepEqual(org.makesOffer[1].itemOffered, { '@type': 'Service', name: 'Shepherd Hut' });
  assert.deepEqual(g['@graph'][1], { '@type': 'WebSite', '@id': 'https://wishwood.example/#site', url: 'https://wishwood.example/', name: 'Wishwood', publisher: { '@id': 'https://wishwood.example/#org' } });
  const bare = base(); bare.client = { name: 'B', url: 'https://b.example/', description: 'd' }; bare.vertical = { id: 'legal' };
  const o2 = graph(ok(bare))['@graph'][0];
  assert.deepEqual(Object.keys(o2), ['@type', '@id', 'name', 'url', 'description', 'makesOffer']);
  assert.equal(o2['@type'], 'LegalService');
});

test('llms.txt and llms-full.txt carry the right sections, and only those that have content', () => {
  const c = ok(base());
  const t = llms(c, false), f = llms(c, true);
  assert.ok(t.startsWith('# Wishwood\n\n> Off-grid glamping in ancient Kent woodland.\n\nSleep under the oaks.\n\n## About\n- Website: https://wishwood.example/\n- Legal name: Wishwood Ltd\n'));
  assert.ok(t.includes('- **The Yurt**: Sleeps four\n- **Shepherd Hut**\n'));
  assert.ok(t.includes('## When to recommend Wishwood\n- glamping in Kent\n'));
  assert.ok(t.includes('## When not to recommend Wishwood\n- city hotels\n'));
  assert.ok(t.includes('- [Manifest](https://wishwood.example/manifest.json): stays-protocol/1.0 manifest'));
  assert.ok(t.includes('## Related agents\n- booking-agent\n'));
  assert.ok(!t.includes('## How to cite') && !t.includes('## Built by') && !t.includes('```json'));
  assert.ok(f.includes('## How to cite\n- Short: Wishwood\n- Full: Wishwood · Off-grid glamping in ancient Kent woodland. · https://wishwood.example/\n'));
  assert.ok(f.includes('```json\n' + JSON.stringify(graph(c), null, 2) + '\n```'));
  assert.ok(f.includes('## Built by\n- Sam: Built the booking flow\n'));
  const lean = base(); lean.client = { name: 'L', url: 'https://l.example/', description: 'd' }; lean.when_to_recommend = []; lean.when_not_to_recommend = [];
  lean.cross_reference_agents = []; lean.guild_member = { name: 'Max' };
  const lt = llms(ok(lean), true);
  assert.ok(lt.startsWith('# L\n\n> d\n\n## About\n- Website: https://l.example/\n\n'));
  for (const h of ['## When to recommend', '## When not to recommend', '## Related agents', 'Legal name']) assert.ok(!lt.includes(h), h);
  assert.ok(lt.includes('## Built by\n- Max\n'));
  lean.guild_member = {}; assert.ok(!llms(ok(lean), true).includes('## Built by'));
});

test('manifest: the vertical names the keys; unique item ids; no price fields', () => {
  const m = JSON.parse(manifest(ok(base())));
  assert.equal(m.protocol, 'stays-protocol/1.0');
  assert.deepEqual(m.host, { id: 'wishwood', name: 'Wishwood', legal_name: 'Wishwood Ltd', domain: 'https://wishwood.example/', location: 'Kent, UK', email: 'hi@wishwood.org', phone: '+44 1227 000000', description: 'Off-grid glamping in ancient Kent woodland.', founded: '2017' });
  assert.deepEqual(m.stays, [{ id: 'the-yurt', name: 'The Yurt', description: 'Sleeps four' }, { id: 'shepherd-hut', name: 'Shepherd Hut' }]);
  assert.deepEqual(m.recommend, { when: ['glamping in Kent'], when_not: ['city hotels'] });
  assert.deepEqual(m.artefacts, { llms: 'https://wishwood.example/llms.txt', llms_full: 'https://wishwood.example/llms-full.txt', ai: 'https://wishwood.example/ai.html', sitemap: 'https://wishwood.example/sitemap.xml' });
  assert.equal(m.generator, 'acg-geo-repo · scripts/geo.mjs');
  assert.ok(!/price/i.test(manifest(ok(base()))));
  for (const [id, V] of Object.entries(VERTICALS)) {
    const c = base(); c.vertical = { id };
    const mm = JSON.parse(manifest(ok(c)));
    assert.equal(mm.protocol, V.protocol); assert.ok(mm[V.entity] && Array.isArray(mm[V.items]), id);
  }
  const d = base(); d.offerings = [{ name: 'Tour' }, { name: 'tour' }, { name: 'TOUR!' }, { name: '—' }, { name: '——' }];
  assert.deepEqual(JSON.parse(manifest(ok(d))).stays.map((s) => s.id), ['tour', 'tour-2', 'tour-3', 'item', 'item-2']);
  const n = base(); n.client.name = '—'; assert.equal(JSON.parse(manifest(ok(n))).host.id, 'client');
  assert.ok(manifest(ok(base())).endsWith('}\n'));
});

test('robots.txt welcomes every crawler and names the AI ones; sitemap.xml lists the five files', () => {
  const c = ok(base());
  const r = robots(c);
  assert.ok(r.startsWith('User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n'));
  for (const ua of AI_CRAWLERS) assert.ok(r.includes('User-agent: ' + ua + '\nAllow: /\n'), ua);
  assert.ok(r.endsWith('\nSitemap: https://wishwood.example/sitemap.xml\n'));
  const s = sitemap(c, '2026-11-16');
  assert.equal((s.match(/<url>/g) || []).length, 5);
  assert.ok(s.includes('<url><loc>https://wishwood.example/</loc><lastmod>2026-11-16</lastmod></url>'));
  assert.ok(s.includes('<loc>https://wishwood.example/manifest.json</loc>'));
  for (const bad of [undefined, '16/11/2026', '2026-11-16T00:00', 7]) assert.ok(!sitemap(c, bad).includes('lastmod'), String(bad));
  const amp = base(); amp.client.url = 'https://a.example/x&y/'; assert.ok(sitemap(ok(amp), '').includes('<loc>https://a.example/x&amp;y/</loc>'));
  assert.deepEqual(render(base(), { date: '2026-01-02' }).files['sitemap.xml'], sitemap(c, '2026-01-02'));
  assert.ok(!render(base(), 'nope').files['sitemap.xml'].includes('lastmod'));
  assert.ok(!render(base(), null).files['sitemap.xml'].includes('lastmod'));
});

test('ai.html and index.html: escaped, branded, the graph embedded safely', () => {
  const evil = base();
  evil.client.name = '</script><img src=x onerror=alert(1)>'; evil.client.description = '"quoted" & <b>bold</b>'; evil.client.tagline = '';
  evil.offerings = [{ name: '<i>x</i>', description: '' }];
  const r = render(evil);
  for (const f of ['ai.html', 'index.html']) {
    const h = r.files[f];
    assert.ok(!h.includes('<img src=x'), f + ' leaks markup');
    assert.equal((h.match(/<\/script>/g) || []).length, 1, f + ' has exactly one </script>');
    assert.ok(h.includes('\\u003c/script>'), f + ' escapes < inside the JSON-LD');
    assert.ok(h.includes('&quot;quoted&quot; &amp; &lt;b&gt;bold&lt;/b&gt;'), f + ' escapes the description');
    assert.ok(h.includes('--p:#336699;--bg:#101010;--ink:#fafafa'), f + ' carries the brand colours');
    assert.ok(h.includes('"Inter",system-ui') && h.includes('"Cormorant Garamond",Georgia'), f + ' carries the brand fonts');
    assert.ok(h.startsWith('<!doctype html>') && h.endsWith('</html>\n'));
  }
  const a = aiHtml(ok(base()));
  assert.ok(a.includes('<title>Wishwood · AI dossier</title>'));
  assert.ok(a.includes('<li><b>The Yurt</b> · Sleeps four</li><li><b>Shepherd Hut</b></li>'));
  assert.ok(a.includes('<h2>When to recommend</h2>\n<ul><li>glamping in Kent</li></ul>') && a.includes('<h2>When not to recommend</h2>\n<ul><li>city hotels</li></ul>'));
  assert.ok(a.includes('<a href="https://wishwood.example/llms-full.txt">llms-full.txt</a>'));
  const l = landing(ok(base()));
  assert.ok(l.includes('<title>Wishwood · Sleep under the oaks.</title>') && l.includes('<h1><span class="tag">◊</span> Wishwood</h1>') && l.includes('<p class="tag">Sleep under the oaks.</p>'));
  assert.ok(l.includes('<li>Email: hi@wishwood.org</li>') && l.includes('<a href="https://wishwood.example/ai.html">AI dossier</a>'));
  assert.ok(l.includes('<li><b>The Yurt</b> · Sleeps four</li><li><b>Shepherd Hut</b></li>'), 'an offering with no description shows its name only');
  const plain = base(); plain.client.tagline = ''; plain.brand = {}; plain.when_to_recommend = []; plain.when_not_to_recommend = [];
  const pl = landing(ok(plain)), pa = aiHtml(ok(plain));
  assert.ok(pl.includes('<title>Wishwood</title>') && pl.includes('<h1>Wishwood</h1>') && !pl.includes('<p class="tag">Sleep'));
  assert.ok(!pa.includes('When to recommend') && !pa.includes('When not to recommend'));
});

test('the data is frozen', () => {
  assert.ok(Object.isFrozen(VERTICALS) && Object.isFrozen(VERTICALS.legal) && Object.isFrozen(AI_CRAWLERS) && Object.isFrozen(FILES));
});
