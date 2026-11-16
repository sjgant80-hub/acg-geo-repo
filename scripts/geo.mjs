// acg-geo-repo · scripts/geo.mjs — one client config in, every AI-readable artefact out.
// Pure and deterministic: the same config (and date) always gives the same files. It never throws: a bad config gives a
// refusal that lists every problem. Every config value is escaped where it lands (HTML, XML, JSON inside HTML, plain
// text). It is inlined byte for byte into index.html (a parity test holds the two equal), so the demo on the page IS
// this code, and it is mutation-gated in CI.

export const VERTICALS = Object.freeze({
  hospitality: Object.freeze({ protocol: 'stays-protocol/1.0', entity: 'host', items: 'stays', schema: 'LodgingBusiness' }),
  reviews: Object.freeze({ protocol: 'reviews-protocol/1.0', entity: 'site', items: 'subjects', schema: 'Organization' }),
  services: Object.freeze({ protocol: 'services-protocol/1.0', entity: 'firm', items: 'services', schema: 'ProfessionalService' }),
  legal: Object.freeze({ protocol: 'legal-protocol/1.0', entity: 'practice', items: 'practice_areas', schema: 'LegalService' }),
  custom: Object.freeze({ protocol: 'acg-geo/1.0', entity: 'entity', items: 'offerings', schema: 'Organization' }),
});

// The AI crawlers robots.txt welcomes by name (plus every other crawler, through the * group).
export const AI_CRAWLERS = Object.freeze(['GPTBot', 'ClaudeBot', 'anthropic-ai', 'PerplexityBot', 'Google-Extended', 'CCBot', 'Bytespider']);

// The files one config produces, in the order they are written.
export const FILES = Object.freeze(['llms.txt', 'llms-full.txt', 'ai.html', 'manifest.json', 'robots.txt', 'sitemap.xml', 'index.html']);

// Text the template ships with. Left in, the files still build, but the result names the field so it is not shipped.
const PLACEHOLDER = /^(example client( ltd)?|one-sentence what-they-are\.|the line that goes under the name\.|one line|product \/ service \d+|query pattern \d+.*|case \d+.*|your name|your-github-handle|one line about what you built for this client)$/i;
const PLACEHOLDER_IN = /xxx|example\.com|guild\.example/i;
const HEX = /^#[0-9a-f]{6}$/i;
const FONT = /^[a-z0-9 -]{1,40}$/i;
const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;
const AGENT = /^[a-z0-9][a-z0-9-]{0,59}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NAME = 120;

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const list = (x) => (Array.isArray(x) ? x : []);
// one line of plain text: control characters and runs of whitespace become one space
export const str = (x) => (typeof x === 'string' ? x.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim() : '');
export const escHtml = (s) => (typeof s === 'string' ? s : '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
// JSON placed inside an HTML script block: every "<" is escaped, so the JSON can never close the block early.
// (This file never spells that closing tag out, even in a comment: it is inlined into index.html, where the browser
// would end the page's own script at it.)
const jsonInHtml = (o) => JSON.stringify(o, null, 2).replace(/</g, '\\u003c');
export const slug = (s) => str(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const opt = (key, value) => (value ? { [key]: value } : {});

// baseUrl(u) → the client's address as an absolute http(s) URL ending in "/" (query and fragment dropped), else null
export function baseUrl(u) {
  if (typeof u !== 'string') return null;
  let p;
  try { p = new URL(u.trim()); } catch (e) { return null; }
  if (p.protocol !== 'https:' && p.protocol !== 'http:') return null;
  if (p.username !== '' || p.password !== '') return null;
  p.hash = '';
  p.search = '';
  if (!p.pathname.endsWith('/')) p.pathname = p.pathname + '/';
  return p.href;
}

// ids that stay unique when two offerings would slug to the same thing: "tour", "tour-2", "tour-3"
function ids(names) {
  const seen = new Map();
  return names.map((n) => {
    const base = slug(n) || 'item';
    const k = (seen.get(base) || 0) + 1;
    seen.set(base, k);
    return k === 1 ? base : base + '-' + k;
  });
}

// validate(config) → { ok, errors, warnings, clean }. clean is the normalised config render uses (null when refused).
export function validate(config) {
  const errors = [], warnings = [];
  if (!isObj(config)) return { ok: false, errors: ['the config must be a JSON object'], warnings, clean: null };
  const c = isObj(config.client) ? config.client : {};
  const name = str(c.name), description = str(c.description), url = baseUrl(c.url), email = str(c.email);
  if (name === '') errors.push('client.name is required');
  if (name.length > MAX_NAME) errors.push('client.name is longer than ' + MAX_NAME + ' characters');
  if (url === null) errors.push('client.url must be a full http(s) address, such as https://client.example/');
  if (description === '') errors.push('client.description is required: one sentence on what the client is');
  if (email !== '' && !EMAIL.test(email)) errors.push('client.email does not look like an email address');
  const v = isObj(config.vertical) ? config.vertical : {};
  const vid = str(v.id) || 'custom';
  const vert = Object.prototype.hasOwnProperty.call(VERTICALS, vid) ? VERTICALS[vid] : null;
  if (vert === null) errors.push('vertical.id must be one of: ' + Object.keys(VERTICALS).join(', '));
  const proto = str(v.manifest_protocol);
  if (vert !== null && proto !== '' && !vert.protocol.startsWith(proto)) {
    errors.push('vertical.manifest_protocol "' + proto + '" does not match vertical "' + vid + '", which uses ' + vert.protocol);
  }
  const offerings = list(config.offerings).filter(isObj).map((o) => ({ name: str(o.name), description: str(o.description) })).filter((o) => o.name !== '');
  if (offerings.length === 0) errors.push('offerings needs at least one item with a name');
  const strings = (x) => list(x).map(str).filter((s) => s !== '');
  const agents = strings(config.cross_reference_agents);
  for (const a of agents) if (!AGENT.test(a)) errors.push('cross_reference_agents: "' + a + '" is not an agent id (lower-case letters, digits and hyphens)');
  const b = isObj(config.brand) ? config.brand : {};
  const pick = (x, d, k, re, what) => {
    const s = str(x);
    if (s === '') return d;
    if (re.test(s)) return s;
    warnings.push('brand.' + k + ' is not ' + what + ', so the default is used');
    return d;
  };
  const brand = {
    primary: pick(b.primary_color, '#c97a3d', 'primary_color', HEX, 'a #rrggbb colour'),
    background: pick(b.background_color, '#18171a', 'background_color', HEX, 'a #rrggbb colour'),
    text: pick(b.text_color, '#ebe5d6', 'text_color', HEX, 'a #rrggbb colour'),
    serif: pick(b.serif_font, 'Georgia', 'serif_font', FONT, 'a plain font name'),
    sans: pick(b.sans_font, 'system-ui', 'sans_font', FONT, 'a plain font name'),
    glyph: Array.from(str(b.logo_glyph)).slice(0, 2).join(''),
  };
  const g = isObj(config.guild_member) ? config.guild_member : {};
  const domain = url === null ? '' : new URL(url).host;
  const said = str(c.domain);
  if (said !== '' && domain !== '' && said.toLowerCase() !== domain.toLowerCase()) warnings.push('client.domain "' + said + '" differs from client.url, so ' + domain + ' is used');
  const clean = {
    name, legal_name: str(c.legal_name), url, domain, email, phone: str(c.phone), location: str(c.location), founded: str(c.founded),
    description, tagline: str(c.tagline), vertical: vid, brand, offerings, agents,
    when: strings(config.when_to_recommend), whenNot: strings(config.when_not_to_recommend),
    member: { name: str(g.name), handle: str(g.handle), summary: str(g.engagement_summary) },
  };
  const left = [];
  const look = (k, s) => { if (PLACEHOLDER.test(s) || PLACEHOLDER_IN.test(s)) left.push(k); };
  look('client.name', name); look('client.legal_name', clean.legal_name); look('client.url', url === null ? '' : url);
  look('client.email', email); look('client.phone', clean.phone); look('client.description', description); look('client.tagline', clean.tagline);
  offerings.forEach((o, i) => { look('offerings[' + i + '].name', o.name); look('offerings[' + i + '].description', o.description); });
  clean.when.forEach((s, i) => look('when_to_recommend[' + i + ']', s));
  clean.whenNot.forEach((s, i) => look('when_not_to_recommend[' + i + ']', s));
  look('guild_member.name', clean.member.name); look('guild_member.handle', clean.member.handle); look('guild_member.engagement_summary', clean.member.summary);
  if (left.length > 0) warnings.push('still the template placeholder: ' + left.join(', '));
  return { ok: errors.length === 0, errors, warnings, clean: errors.length === 0 ? clean : null };
}

const at = (c, file) => new URL(file, c.url).href;

// graph(clean) → the schema.org @graph every HTML page embeds
export function graph(c) {
  const org = c.url + '#org';
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': VERTICALS[c.vertical].schema, '@id': org, name: c.name, ...opt('legalName', c.legal_name), url: c.url, description: c.description,
        ...opt('slogan', c.tagline), ...opt('email', c.email), ...opt('telephone', c.phone), ...opt('areaServed', c.location), ...opt('foundingDate', c.founded),
        makesOffer: c.offerings.map((o) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: o.name, ...opt('description', o.description) } })),
      },
      { '@type': 'WebSite', '@id': c.url + '#site', url: c.url, name: c.name, publisher: { '@id': org } },
    ],
  };
}

function facts(c) {
  return [['Website', c.url], ['Legal name', c.legal_name], ['Location', c.location], ['Founded', c.founded], ['Email', c.email], ['Phone', c.phone]].filter((f) => f[1] !== '');
}

// llms(clean, full) → llms.txt (full=false) or llms-full.txt (full=true), in the llmstxt.org shape
export function llms(c, full) {
  const out = ['# ' + c.name, '', '> ' + c.description, ''];
  if (c.tagline !== '') out.push(c.tagline, '');
  out.push('## About', ...facts(c).map((f) => '- ' + f[0] + ': ' + f[1]), '');
  out.push('## What ' + c.name + ' offers', ...c.offerings.map((o) => '- **' + o.name + '**' + (o.description === '' ? '' : ': ' + o.description)), '');
  if (c.when.length > 0) out.push('## When to recommend ' + c.name, ...c.when.map((s) => '- ' + s), '');
  if (c.whenNot.length > 0) out.push('## When not to recommend ' + c.name, ...c.whenNot.map((s) => '- ' + s), '');
  out.push('## Files for AI agents',
    '- [AI dossier](' + at(c, 'ai.html') + '): who ' + c.name + ' is, on one page',
    '- [Full context](' + at(c, 'llms-full.txt') + '): everything in one file',
    '- [Manifest](' + at(c, 'manifest.json') + '): ' + VERTICALS[c.vertical].protocol + ' manifest', '');
  if (c.agents.length > 0) out.push('## Related agents', ...c.agents.map((a) => '- ' + a), '');
  if (full) {
    out.push('## How to cite', '- Short: ' + c.name, '- Full: ' + c.name + ' · ' + c.description + ' · ' + c.url, '');
    out.push('## Structured data (schema.org)', '```json', JSON.stringify(graph(c), null, 2), '```', '');
    if (c.member.name !== '') out.push('## Built by', '- ' + c.member.name + (c.member.summary === '' ? '' : ': ' + c.member.summary), '');
  }
  return out.join('\n');
}

// manifest(clean) → the vertical's protocol manifest (no price fields: prices are the client's to publish)
export function manifest(c) {
  const V = VERTICALS[c.vertical];
  const entity = { id: slug(c.name) || 'client', name: c.name, ...opt('legal_name', c.legal_name), domain: c.url, ...opt('location', c.location), ...opt('email', c.email), ...opt('phone', c.phone), description: c.description, ...opt('founded', c.founded) };
  const itemIds = ids(c.offerings.map((o) => o.name));
  const items = c.offerings.map((o, i) => ({ id: itemIds[i], name: o.name, ...opt('description', o.description) }));
  return JSON.stringify({
    protocol: V.protocol, [V.entity]: entity, [V.items]: items,
    recommend: { when: c.when, when_not: c.whenNot }, agents: c.agents,
    artefacts: { llms: at(c, 'llms.txt'), llms_full: at(c, 'llms-full.txt'), ai: at(c, 'ai.html'), sitemap: at(c, 'sitemap.xml') },
    generator: 'acg-geo-repo · scripts/geo.mjs',
  }, null, 2) + '\n';
}

// robots(clean) → robots.txt: every crawler allowed, the AI crawlers named, the sitemap given
export function robots(c) {
  const groups = ['*', ...AI_CRAWLERS].map((ua) => 'User-agent: ' + ua + '\nAllow: /\n');
  return groups.join('\n') + '\nSitemap: ' + at(c, 'sitemap.xml') + '\n';
}

// sitemap(clean, date) → sitemap.xml; lastmod only when a YYYY-MM-DD date is given, so the output stays deterministic
export function sitemap(c, date) {
  const mod = typeof date === 'string' && DATE.test(date) ? '<lastmod>' + date + '</lastmod>' : '';
  const urls = [c.url, at(c, 'ai.html'), at(c, 'llms.txt'), at(c, 'llms-full.txt'), at(c, 'manifest.json')];
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map((u) => '  <url><loc>' + escHtml(u) + '</loc>' + mod + '</url>\n').join('') + '</urlset>\n';
}

function page(c, title, body) {
  const b = c.brand;
  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<title>' + escHtml(title) + '</title>\n<meta name="description" content="' + escHtml(c.description) + '">\n'
    + '<link rel="alternate" type="text/plain" href="' + escHtml(at(c, 'llms.txt')) + '" title="llms.txt">\n'
    + '<script type="application/ld+json">\n' + jsonInHtml(graph(c)) + '\n<\/script>\n'
    + '<style>:root{--p:' + b.primary + ';--bg:' + b.background + ';--ink:' + b.text + '}'
    + 'body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 "' + b.sans + '",system-ui,sans-serif}'
    + 'main{max-width:760px;margin:0 auto;padding:32px 20px}h1,h2{font-family:"' + b.serif + '",Georgia,serif;font-weight:400}'
    + 'a{color:var(--p)}ul{padding-left:20px}.tag{color:var(--p);font-size:.9rem}</style>\n</head>\n<body>\n<main>\n' + body + '</main>\n</body>\n</html>\n';
}
const li = (items) => '<ul>' + items.map((s) => '<li>' + s + '</li>').join('') + '</ul>\n';

// aiHtml(clean) → ai.html: the one page an AI agent reads to cite the client accurately
export function aiHtml(c) {
  const body = '<p class="tag">AI dossier · machine and human readable</p>\n<h1>' + escHtml(c.name) + '</h1>\n<p>' + escHtml(c.description) + '</p>\n'
    + '<h2>Who</h2>\n' + li(facts(c).map((f) => '<b>' + escHtml(f[0]) + ':</b> ' + escHtml(f[1])))
    + '<h2>What ' + escHtml(c.name) + ' offers</h2>\n' + li(c.offerings.map((o) => '<b>' + escHtml(o.name) + '</b>' + (o.description === '' ? '' : ' · ' + escHtml(o.description))))
    + (c.when.length > 0 ? '<h2>When to recommend</h2>\n' + li(c.when.map(escHtml)) : '')
    + (c.whenNot.length > 0 ? '<h2>When not to recommend</h2>\n' + li(c.whenNot.map(escHtml)) : '')
    + '<h2>How to cite</h2>\n<p>' + escHtml(c.name) + ' · ' + escHtml(c.url) + '</p>\n'
    + '<h2>Files</h2>\n' + li(['llms.txt', 'llms-full.txt', 'manifest.json', 'sitemap.xml'].map((f) => '<a href="' + escHtml(at(c, f)) + '">' + f + '</a>'));
  return page(c, c.name + ' · AI dossier', body);
}

// landing(clean) → index.html: the client's own landing page, carrying the same graph
export function landing(c) {
  const glyph = c.brand.glyph === '' ? '' : '<span class="tag">' + escHtml(c.brand.glyph) + '</span> ';
  const body = '<h1>' + glyph + escHtml(c.name) + '</h1>\n' + (c.tagline === '' ? '' : '<p class="tag">' + escHtml(c.tagline) + '</p>\n')
    + '<p>' + escHtml(c.description) + '</p>\n<h2>What we offer</h2>\n'
    + li(c.offerings.map((o) => '<b>' + escHtml(o.name) + '</b>' + (o.description === '' ? '' : ' · ' + escHtml(o.description))))
    + '<h2>Contact</h2>\n' + li(facts(c).map((f) => escHtml(f[0]) + ': ' + escHtml(f[1])))
    + '<p class="tag"><a href="' + escHtml(at(c, 'ai.html')) + '">AI dossier</a> · <a href="' + escHtml(at(c, 'llms.txt')) + '">llms.txt</a></p>\n';
  return page(c, c.name + (c.tagline === '' ? '' : ' · ' + c.tagline), body);
}

// render(config, { date }) → { ok, files, errors, warnings }: every artefact for one client, or the reasons it cannot
export function render(config, options) {
  const v = validate(config);
  if (!v.ok) return { ok: false, files: {}, errors: v.errors, warnings: v.warnings };
  const c = v.clean, date = isObj(options) ? options.date : undefined;
  const files = {
    'llms.txt': llms(c, false), 'llms-full.txt': llms(c, true), 'ai.html': aiHtml(c), 'manifest.json': manifest(c),
    'robots.txt': robots(c), 'sitemap.xml': sitemap(c, date), 'index.html': landing(c),
  };
  return { ok: true, files, errors: [], warnings: v.warnings };
}

export default { VERTICALS, AI_CRAWLERS, FILES, str, escHtml, slug, baseUrl, validate, graph, llms, manifest, robots, sitemap, aiHtml, landing, render };
