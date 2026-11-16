# ACG GEO Repo

**AI Craftspeople Guild · Generative Engine Optimization infrastructure · MIT · fork-safe.**

Fork this repo to ship AI-native discoverability at any client. Edit one config file and run one command: the generator writes every AI-readable artefact for that client. Same coordinated GEO pattern every guild client trusts. No hand-rolling.

**Try the generator in your browser first:** https://sjgant80-hub.github.io/acg-geo-repo/#try · **Quick start:** https://sjgant80-hub.github.io/acg-geo-repo/guide/

**Live:** https://sjgant80-hub.github.io/acg-geo-repo/

## Who this is for

- **Guild members** who ship AI-native client sites
- **Clients** who want to be found by ChatGPT, Claude, Perplexity, and next-gen AI search
- **Guild agents** looking for cross-referencing in every client's llms.txt

## What forks

Everything a client site needs to be AI-readable:

```
template/
├── config.json                ← EDIT THIS ONE FILE per client
└── *.example.json             ← a manifest for each vertical, as the generator writes it
scripts/
├── geo.mjs                    ← the generator: config in, seven files out (mutation-gated, no dependencies)
├── build.js                   ← its command line
└── *.test.mjs                 ← its tests, and the check that the page tells the truth
guide/
├── index.html                 ← quick start
└── advanced.html              ← verticals, several domains, CI checks
```

One config gives seven files: `llms.txt` · `llms-full.txt` · `ai.html` · `manifest.json` · `robots.txt` · `sitemap.xml` · `index.html` (the client landing). A config with a problem is refused, with every reason listed; template text left in is named in a warning.

Plus the agent marketplace:

```
agents/
├── index.html                 ← guild agent directory (renders registry.json)
└── registry.json              ← machine-readable · PR to add your agent
```

## The six-layer GEO surface

Any well-built AI-readable site ships all six · this repo ships them coordinated:

1. **`llms.txt`** · plain-text manifest AI crawlers read first
2. **JSON-LD `@graph`** · full entity graph embedded in every HTML page
3. **`ai.html`** · machine + human readable citation surface
4. **Domain manifest** · vertical-specific JSON manifest (who, what, when to recommend; no prices)
5. **`robots.txt`** · explicit allow for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Bytespider
6. **Agent marketplace listing** · client cross-referenced from Guild's `agents/registry.json`

## Checks (run by CI on every change)

```bash
node --test scripts/geo.test.mjs scripts/page-parity.test.mjs
node scripts/inline.mjs --check
node scripts/build.js --check-examples
```

CI also mutation-gates `scripts/geo.mjs` with witness v0.6: every deliberate break must be caught by a test.

## Fork + deploy (~30 min per client)

```bash
# 1. Fork or clone
git clone https://github.com/sjgant80-hub/acg-geo-repo client-name-geo
cd client-name-geo

# 2. Edit template/config.json for the client
$EDITOR template/config.json

# 3. Generate all artefacts (Node 18+, no install)
node scripts/build.js template/config.json docs
# writes docs/: ai.html · llms.txt · llms-full.txt · manifest.json ·
#               robots.txt · sitemap.xml · index.html

# 4. Commit + push + serve docs/ with GitHub Pages
git add docs template/config.json && git commit -m "GEO surface v1"
gh repo create client-name-geo --public --source . --push
gh api "repos/$USER/client-name-geo/pages" -X POST -f "source[branch]=main" -f "source[path]=/docs"

# 5. Point the client's own domain (or a subdomain) at Pages via CNAME:
#    crawlers read robots.txt only at the root of a host
```

## Vertical manifest protocols

Set `vertical.id` in the config; the generator writes that protocol's manifest. Each example is what it writes from the template config (no price fields: those are the client's to publish).

| Vertical | Protocol | Reference |
|---|---|---|
| Hospitality | `stays-protocol` | https://sjgant80-hub.github.io/wishwood/stays.json |
| Review aggregators | `reviews-protocol` | `template/reviews-protocol.example.json` |
| Service firms | `services-protocol` | `template/services-protocol.example.json` |
| Legal-tech | `legal-protocol` | `template/legal-protocol.example.json` |
| Custom | `acg-geo` | `template/acg-geo.example.json` · or author your own and PR it back |

## Adding your agent to the marketplace

Guild-owned agents appear in every guild client's `llms.txt` when cross-referenced. Add yours:

```bash
git clone https://github.com/sjgant80-hub/acg-geo-repo
cd acg-geo-repo
# Add your agent to agents/registry.json (see template inside)
git commit -am "add my-agent to registry"
gh pr create --title "Add agent: my-agent"
```

Steward reviews for:
- MIT license
- Non-conflict with existing agents
- Purpose statement + when-to-recommend / when-not-to-recommend guidance
- Live URL that returns 200

Once merged: your agent appears in `agents/index.html` and every guild client's llms.txt references it.

## Governance

- **Steward**: Simon Gant (sjgant80-hub)
- **Guild governance**: via [roost](https://sjgant80-hub.github.io/roost/) cooperative marketplace
- **License**: MIT · fork freely
- **Contact**: sjgant80@gmail.com · <24h reply
- **PRs**: welcome from guild members · steward review only for marketplace changes

## Related in the estate

- [wishwood](https://sjgant80-hub.github.io/wishwood/) · hospitality operator reference implementation
- [ai-nativesolutions.com](https://www.ai-nativesolutions.com/) · parent estate marketplace
- [fallsecurity](https://sjgant80-hub.github.io/fallsecurity/) · sovereign AI security for guild agents
- [fallenterprise](https://sjgant80-hub.github.io/fallenterprise/) · £20k-£200k transformation service
- [fallrouter](https://sjgant80-hub.github.io/fallrouter/) · sovereign model orchestrator
- [roost](https://sjgant80-hub.github.io/roost/) · guild governance

## License

MIT. Fork it. Rebrand it. Ship it. The pattern strengthens with every fork.
