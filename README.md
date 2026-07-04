# ACG GEO Repo

**AI Craftspeople Guild · Generative Engine Optimization infrastructure · MIT · fork-safe.**

Fork this repo to ship AI-native discoverability at any client. Edit one config file, every artefact regenerates. Same coordinated GEO pattern every guild client trusts. No hand-rolling.

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
├── ai.html.template           ← client agent dossier (config-driven)
├── llms.txt.template          ← client llms.txt (config-driven)
├── llms-full.txt.template     ← deep context dump for AI context-loading
├── manifest.json.template     ← client's vertical manifest
├── robots.txt.template        ← AI crawler allow-list
├── sitemap.xml.template       ← agent-friendly sitemap
└── README.md                  ← per-client build instructions
```

Plus the agent marketplace:

```
agents/
├── index.html                 ← guild agent directory (renders registry.json)
├── registry.json              ← machine-readable · PR to add your agent
└── README.md
```

## The six-layer GEO surface

Any well-built AI-readable site ships all six · this repo ships them coordinated:

1. **`llms.txt`** · plain-text manifest AI crawlers read first
2. **JSON-LD `@graph`** · full entity graph embedded in every HTML page
3. **`ai.html`** · machine + human readable citation surface
4. **Domain manifest** · vertical-specific JSON schema AI agents parse in ~50ms
5. **`robots.txt`** · explicit allow for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Bytespider
6. **Agent marketplace listing** · client cross-referenced from Guild's `agents/registry.json`

## Fork + deploy (~30 min per client)

```bash
# 1. Fork or clone
git clone https://github.com/sjgant80-hub/acg-geo-repo client-name-geo
cd client-name-geo

# 2. Edit template/config.json for the client
$EDITOR template/config.json

# 3. Generate all artefacts (Node)
node scripts/build.js
# writes: ai.html · llms.txt · llms-full.txt · manifest.json ·
#         robots.txt · sitemap.xml · index.html

# 4. Commit + push + enable GitHub Pages
git init && git commit -am "GEO surface v1"
gh repo create client-name-geo --public --push
gh api "repos/$USER/client-name-geo/pages" -X POST -f "source[branch]=main"

# 5. Point client's domain (or subdomain) at Pages via CNAME
```

## Vertical manifest protocols

Pick one · or extend for a new vertical:

| Vertical | Protocol | Reference |
|---|---|---|
| Hospitality | `stays-protocol` | https://sjgant80-hub.github.io/wishwood/stays.json |
| Review aggregators | `reviews-protocol` | (template shipping soon) |
| Service firms | `services-protocol` | (template shipping soon) |
| Legal-tech | `legal-protocol` | (template shipping soon) |
| Custom | (author your own) | contribute back via PR |

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

**◊·κ=1 · phi is home**
