/* Tool: JSON Formatter — format, minify, validate and sort JSON. */
"use strict";
(function () {
  const SAMPLE = '{\n  "name": "Toolbelt",\n  "version": "1.0.0",\n  "tags": ["json", "devtools"],\n  "meta": { "stars": 0, "openSource": true }\n}';

  function sortKeys(value) {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === "object") {
      const out = {};
      for (const k of Object.keys(value).sort()) out[k] = sortKeys(value[k]);
      return out;
    }
    return value;
  }

  function errorPosition(e, text) {
    const m = /position (\d+)/.exec(String(e && e.message ? e.message : ""));
    if (!m) return "";
    const pos = Math.min(Number(m[1]), text.length);
    const before = text.slice(0, pos);
    const line = before.split("\n").length;
    const col = pos - before.lastIndexOf("\n");
    return " (line " + line + ", column " + col + ")";
  }

  DevKit.register({
    id: "json",
    name: "JSON Formatter",
    category: "Data",
    description: "Format, minify, validate and sort JSON — with precise error locations.",
    keywords: ["json", "pretty", "print", "minify", "validate", "sort", "lint"],
    icon: "braces",

    render(root) {
      const el = DevKit.el;
      let parsed = undefined; // undefined = not parsed yet

      const input = el("textarea", { rows: 12, spellcheck: "false", placeholder: "Paste JSON here…" });
      const status = el("div", { class: "status-line" });
      const output = el("pre", { class: "output-block" });

      function parse() {
        const text = input.value;
        if (!text.trim()) { parsed = undefined; DevKit.setStatus(status, "Waiting for input…", "muted"); return false; }
        try {
          parsed = JSON.parse(text);
          DevKit.setStatus(status, "✓ Valid JSON · " + text.length.toLocaleString() + " characters", "ok");
          return true;
        } catch (e) {
          parsed = undefined;
          DevKit.setStatus(status, "✖ " + (e && e.message ? e.message : "Invalid JSON") + errorPosition(e, text), "err");
          return false;
        }
      }
      const parseLive = DevKit.debounce(parse, 180);

      function show(str, msg) {
        output.textContent = str;
        if (msg) DevKit.setStatus(status, msg, "ok");
      }

      function format(spaces) {
        if (!parse()) { output.textContent = ""; return; }
        show(JSON.stringify(parsed, null, spaces), "✓ Formatted with " + spaces + " spaces");
      }
      function minify() {
        if (!parse()) { output.textContent = ""; return; }
        show(JSON.stringify(parsed), "✓ Minified · " + JSON.stringify(parsed).length.toLocaleString() + " characters");
      }
      function sort() {
        if (!parse()) { output.textContent = ""; return; }
        show(JSON.stringify(sortKeys(parsed), null, 2), "✓ Keys sorted alphabetically");
      }

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "field" }, el("label", { text: "JSON input" }), input),
        el("div", { class: "toolbar" },
          el("button", { class: "btn btn-primary", onclick: () => format(2) }, "Format (2 spaces)"),
          el("button", { class: "btn btn-ghost", onclick: () => format(4) }, "4 spaces"),
          el("button", { class: "btn btn-ghost", onclick: minify }, "Minify"),
          el("button", { class: "btn btn-ghost", onclick: sort }, "Sort keys"),
          el("button", { class: "btn btn-ghost", onclick: () => { input.value = SAMPLE; parse(); } }, "Sample"),
          el("button", {
            class: "btn btn-danger-ghost",
            onclick: () => { input.value = ""; output.textContent = ""; parsed = undefined; DevKit.setStatus(status, "Waiting for input…", "muted"); }
          }, "Clear"),
          status
        )
      ));

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "panel-head" },
          el("span", { class: "panel-title", text: "Output" }),
          DevKit.copyBtn(() => output.textContent)
        ),
        output
      ));

      input.addEventListener("input", () => { parseLive(); });
      parse();
    }
  });
})();
