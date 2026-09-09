# Contributing to DevForge

Thanks for helping build DevForge! This project has a strict but simple
philosophy, and following it keeps the project tiny, fast and easy to maintain.

## The philosophy

1. **Zero dependencies.** No npm packages, no CDN scripts, no frameworks.
   Everything is hand-rolled, dependency-free JavaScript, CSS and HTML.
2. **Zero build step.** What you edit is what runs. If you can read the source,
   you can ship the source.
3. **Everything is local.** Tools never send data anywhere. Whatever you paste
   into a tool stays in your browser.
4. **One tool = one file.** Every tool is a self-contained file in
   `assets/js/tools/`, registered with `DevKit.register()`.

## Adding a new tool (≈30 lines)

1. **Create** `assets/js/tools/your-tool.js`:

   ```js
   /* Tool: Your Tool — what it does in one line. */
   "use strict";
   (function () {
     DevKit.register({
       id: "your-tool",            // kebab-case, unique
       name: "Your Tool",
       category: "Data",           // Data | Text | Web & Style | Time | Security
       description: "One sentence shown on the home cards.",
       keywords: ["searchable", "keywords"],
       icon: "zap",                // see the ICONS map in app.js
       render(root) {
         // Build your UI with DevKit.el() and append to `root`.
         // Helpers: DevKit.el, DevKit.esc, DevKit.kvRow, DevKit.copyBtn,
         //          DevKit.toast, DevKit.debounce, DevKit.setStatus
       }
       // Optional: destroy() { /* clear timers, listeners */ }
     });
   })();
   ```

2. **Register the script** in `index.html` (alphabetical order) and add the
   file to the `CORE` precache list in `sw.js`.

3. **Test & document:**
   - `node scripts/validate.js` — checks wiring (script tag, sw.js, ids).
   - `node scripts/smoke-test.js` — renders every tool in a fake DOM and
     clicks every button. Add a seed value for your tool in
     `scripts/smoke-test.js` (`SEEDS`) so its live handlers get exercised.
   - Add a row to the tool table in `README.md`.

That's it — the sidebar, home cards, command palette and routing pick your
tool up automatically.

## Guidelines

- **Escape user content.** Any user-provided string that ends up in
  `innerHTML` must go through `DevKit.esc()`. Better yet, build DOM nodes with
  `DevKit.el()` and use `textContent`.
- **Handle empty and invalid input gracefully.** Tools should show a muted
  "Waiting for input…" state, never throw.
- **Debounce** live reactions to typing (`DevKit.debounce(fn, 200)`).
- **Clean up after yourself.** If you start timers or listeners, clear them in
  `destroy()` (either on the tool object or returned from `render()`).
- **Vanilla CSS.** Add shared styles to `assets/css/style.css`; reuse existing
  classes (`.panel`, `.toolbar`, `.out-row`, `.badge`, …) before adding new ones.
- **Keep it keyboard-friendly.** Buttons are real `<button>`s; add `title`
  and `aria-label` attributes where the text alone isn't clear.

## Development workflow

```bash
# Serve locally (any static server works — this is just the shortest one):
python3 -m http.server 8000
# then open http://localhost:8000

# Validate + smoke test before opening a PR:
node scripts/validate.js
node scripts/smoke-test.js
```

CI (`.github/workflows/ci.yml`) runs both scripts on every push and pull
request.

## Roadmap ideas

Good first tools to contribute: Markdown preview, HTML entity encode/decode,
number base converter, text statistics, QR code generator (hand-rolled!),
URL-shortener decoder,slug generator, chmod calculator, HTTP status reference.

Questions? Open an issue. Happy hacking! 🔧
