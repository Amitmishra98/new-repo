# DevForge ⚒️

**The most advanced free online developer toolbox — 13 pro-grade tools, zero dependencies, 100% in your browser.**

🌐 **Live app: <https://gost-co.github.io/new-repo/>**

[![CI](https://github.com/Gost-co/new-repo/actions/workflows/ci.yml/badge.svg)](https://github.com/Gost-co/new-repo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-f5b52e.svg)](LICENSE)

DevForge packs the utilities you reach for a dozen times a day — formatting JSON,
decoding a JWT, testing a regex, checking a cron schedule — into one
lightning-fast page that runs entirely client-side.

- 🔒 **Private by design** — every tool runs locally; your data never leaves your device
- ⚡ **Instant** — no frameworks, no npm packages, no CDN scripts, no build step
- 📴 **Offline** — installable PWA; a service worker caches the whole app shell
- 🆓 **Free forever** — MIT-licensed, no signup, no ads, no tracking
- 🔍 **Search & AI-engine ready** — JSON-LD structured data, FAQ schema, Open
  Graph/Twitter cards, `robots.txt`, `sitemap.xml` and `llms.txt`

## The 13 tools

| Tool | What it does | Try it |
| --- | --- | --- |
| **JSON Formatter** | Format, minify, validate and sort JSON with error positions | [#/json](https://gost-co.github.io/new-repo/#/json) |
| **JWT Decoder** | Inspect header, payload, expiry and claims | [#/jwt](https://gost-co.github.io/new-repo/#/jwt) |
| **Regex Tester** | Live match highlighting and capture-group tables | [#/regex](https://gost-co.github.io/new-repo/#/regex) |
| **Cron Explainer** | Plain-English cron descriptions + next 5 run times | [#/cron](https://gost-co.github.io/new-repo/#/cron) |
| **Base64** | Encode/decode text (unicode-safe, URL-safe alphabet) | [#/base64](https://gost-co.github.io/new-repo/#/base64) |
| **Hash Generator** | SHA-1/256/384/512 digests via WebCrypto | [#/hash](https://gost-co.github.io/new-repo/#/hash) |
| **Timestamp Converter** | unix ⇄ ISO 8601 ⇄ local ⇄ relative, live clock | [#/timestamp](https://gost-co.github.io/new-repo/#/timestamp) |
| **URL Encode & Inspect** | Percent encode/decode + full URL breakdown | [#/url](https://gost-co.github.io/new-repo/#/url) |
| **Color Converter** | hex/rgb/hsl conversion, shade ramps, WCAG contrast | [#/color](https://gost-co.github.io/new-repo/#/color) |
| **UUID Generator** | Cryptographically random UUIDv4, in bulk | [#/uuid](https://gost-co.github.io/new-repo/#/uuid) |
| **Case Converter** | camelCase ⇄ snake_case ⇄ kebab-case ⇄ CONSTANT_CASE ⇄ … | [#/case](https://gost-co.github.io/new-repo/#/case) |
| **Diff Checker** | Line-by-line diff of any two texts | [#/diff](https://gost-co.github.io/new-repo/#/diff) |
| **Lorem Ipsum** | Placeholder paragraphs, sentences or words | [#/lorem](https://gost-co.github.io/new-repo/#/lorem) |

## Quick start

No install, no dependencies. Either:

- **Just open it** — double-click `index.html` (everything works; only the
  offline service worker needs a server), or
- **Serve it** — any static file server does:

  ```bash
  python3 -m http.server 8000
  # → http://localhost:8000
  ```

- **Install it** — served over HTTPS (or localhost), use your browser's
  "Install app" action to get DevForge as a standalone PWA that works offline.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `Ctrl`/`⌘` + `K` | Open the tool palette |
| `↑` `↓` | Move through palette results |
| `↵` | Open the selected tool |
| `Esc` | Close the palette |

Every tool has a shareable URL — `#/json`, `#/cron`, `#/regex`, ….

## Built to rank (SEO & AI search)

DevForge is deliberately easy for Google, Bing, ChatGPT, Perplexity and other
answer engines to understand:

- **Static, crawlable content** — a plain-HTML footer describes all 13 tools
  and an on-page FAQ, so crawlers that don't run JavaScript still see everything
- **Structured data** — JSON-LD `WebApplication` + `WebSite` + `FAQPage` schemas
- **Social & sharing meta** — full Open Graph and Twitter card tags with a
  1200×630 banner
- **Crawler directives** — `robots.txt` (explicitly welcoming AI crawlers),
  `sitemap.xml`, and `llms.txt` for LLM-based answer engines
- **Performance** — one page, zero dependencies, zero build step: it scores
  ~100 on Core Web Vitals by construction

Tip: after your first deploy, submit
<https://gost-co.github.io/new-repo/> to
[Google Search Console](https://search.google.com/search-console) to speed up
indexing.

## Project layout

```
index.html              ← the whole app shell (+ SEO meta, JSON-LD, static footer)
assets/css/style.css    ← the single stylesheet (dark + light themes)
assets/js/app.js        ← registry, router, palette, helpers (the DevKit API)
assets/js/tools/*.js    ← one self-contained file per tool
assets/img/og-image.png ← 1200×630 social sharing banner
sw.js                   ← offline support (service worker)
manifest.webmanifest    ← PWA manifest
robots.txt              ← crawler rules (AI crawlers welcome)
sitemap.xml             ← XML sitemap
llms.txt                ← content guide for AI answer engines
scripts/
  gen-icons.js          ← generates the PNG icons (hand-rolled PNG encoder)
  validate.js           ← static wiring checks
  smoke-test.js         ← renders + clicks every tool in a fake DOM
.github/workflows/ci.yml← CI + automatic GitHub Pages deployment
```

Every push to `main` is tested and then deployed to GitHub Pages automatically.

## Contributing

Adding a tool is a perfect first PR — it's one file and about 30 lines. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the template and guidelines.

```bash
node scripts/validate.js    # wiring checks
node scripts/smoke-test.js  # render + interact with every tool
```

## License

[MIT](LICENSE) — free to use, fork and remix.
