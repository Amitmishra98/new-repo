# Toolbelt

**A pocket Swiss-Army knife for developers.** Toolbelt packs the small
utilities you reach for a dozen times a day — formatting JSON, decoding a JWT,
checking a cron expression, testing a regex — into one page that runs entirely
in your browser.

- **0 dependencies** — no frameworks, no npm packages, no CDN scripts
- **0 build steps** — what you read is what runs
- **100% local** — your data never leaves the browser (works offline, too)
- **Installable** — add it as a PWA and it lives in your dock

## The tools

| Tool | What it does |
| --- | --- |
| **Base64** | Encode/decode text (unicode-safe, URL-safe alphabet) |
| **Case Converter** | camelCase ⇄ snake_case ⇄ kebab-case ⇄ CONSTANT_CASE ⇄ … |
| **Color Converter** | hex/rgb/hsl conversion, shade ramps, WCAG contrast |
| **Cron Explainer** | Plain-English cron descriptions + next 5 run times |
| **Diff Checker** | Line-by-line diff of any two texts |
| **Hash Generator** | SHA-1/256/384/512 digests via WebCrypto |
| **JSON Formatter** | Format, minify, validate and sort JSON with error positions |
| **JWT Decoder** | Inspect header, payload, expiry and claims |
| **Lorem Ipsum** | Placeholder paragraphs, sentences or words |
| **Regex Tester** | Live match highlighting and capture-group tables |
| **Timestamp Converter** | unix ⇄ ISO 8601 ⇄ local ⇄ relative, live clock |
| **URL Encode & Inspect** | Percent encode/decode + full URL breakdown |
| **UUID Generator** | Cryptographically random UUIDv4, in bulk |

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
  "Install app" action to get Toolbelt as a standalone PWA that works offline.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `Ctrl`/`⌘` + `K` | Open the tool palette |
| `↑` `↓` | Move through palette results |
| `↵` | Open the selected tool |
| `Esc` | Close the palette |

Every tool has a shareable URL — `#/json`, `#/cron`, `#/regex`, ….

## Project layout

```
index.html              ← the whole app shell
assets/css/style.css    ← the single stylesheet (dark + light themes)
assets/js/app.js        ← registry, router, palette, helpers (the DevKit API)
assets/js/tools/*.js    ← one self-contained file per tool
sw.js                   ← offline support (service worker)
manifest.webmanifest    ← PWA manifest
scripts/
  gen-icons.js          ← generates the PNG icons (hand-rolled PNG encoder)
  validate.js           ← static wiring checks
  smoke-test.js         ← renders + clicks every tool in a fake DOM
```

## Contributing

Adding a tool is a perfect first PR — it's one file and about 30 lines. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the template and guidelines.

```bash
node scripts/validate.js    # wiring checks
node scripts/smoke-test.js  # render + interact with every tool
```

## License

[MIT](LICENSE) — free to use, fork and remix.
