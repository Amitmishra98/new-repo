#!/usr/bin/env node
/* Smoke test for DevForge — loads app.js + every tool inside a tiny fake DOM and
 * exercises rendering, input events and button clicks. Zero dependencies.
 * Run: node scripts/smoke-test.js   (exits non-zero on any error)
 */
"use strict";

const fs = require("fs");
const path = require("path");

/* ================================================================
 * Minimal fake DOM — good enough to boot the app and render tools.
 * ================================================================ */

const idMap = new Map();
const winBus = {};
const docBus = {};

function dispatchWin(type, ev) {
  (winBus[type] || []).forEach((fn) => {
    try { fn(ev || {}); } catch (e) { recordError("window:" + type, e); }
  });
}

let errors = 0;
function recordError(where, e) {
  console.error("  ✖ [" + where + "] " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e));
  errors++;
}

class FakeNode {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this._text = "";
    this._html = undefined;
    this._classSet = new Set();
    this.dataset = {};
    this.style = {};
    this.attributes = {};
    this.handlers = {};
    this.value = "";
    this.checked = false;
    this.hidden = false;
    this.disabled = false;
    this.id = "";
  }
  get classList() {
    const self = this;
    return {
      add: (...c) => c.forEach((x) => self._classSet.add(x)),
      remove: (...c) => c.forEach((x) => self._classSet.delete(x)),
      toggle: (c, f) => {
        const on = f === undefined ? !self._classSet.has(c) : !!f;
        if (on) self._classSet.add(c); else self._classSet.delete(c);
        return on;
      },
      contains: (c) => self._classSet.has(c)
    };
  }
  get className() { return [...this._classSet].join(" "); }
  set className(v) { this._classSet = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get textContent() {
    return this._html !== undefined ? String(this._html) :
      (this.children.length ? this.children.map((c) => c.textContent).join("") : this._text);
  }
  set textContent(v) { this._text = String(v); this.children = []; this._html = undefined; }
  get innerHTML() { return this._html !== undefined ? this._html : this.textContent; }
  set innerHTML(v) { this._html = String(v); this.children = []; this._text = ""; }
  setAttribute(k, v) {
    this.attributes[k] = String(v);
    if (k === "id") { this.id = String(v); idMap.set(String(v), this); }
    else if (k === "class") this.className = v;
    else if (k === "value") this.value = String(v);
    else if (k === "checked") this.checked = true;
    else if (k === "disabled") this.disabled = true;
    else if (k === "hidden") this.hidden = true;
  }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; if (k === "id") { idMap.delete(this.id); this.id = ""; } }
  appendChild(c) {
    if (c.parentNode) c.parentNode.removeChild(c);
    c.parentNode = this;
    this.children.push(c);
    return c;
  }
  append(...cs) { cs.forEach((c) => { if (c == null || c === false) return; this.appendChild(c); }); }
  insertBefore(n, ref) {
    n.parentNode = this;
    const i = this.children.indexOf(ref);
    if (i === -1) this.children.push(n); else this.children.splice(i, 0, n);
    return n;
  }
  removeChild(c) {
    const i = this.children.indexOf(c);
    if (i !== -1) this.children.splice(i, 1);
    c.parentNode = null;
    return c;
  }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  replaceChildren(...cs) { this.children = []; this._html = undefined; cs.forEach((c) => this.appendChild(c)); }
  addEventListener(t, fn) { (this.handlers[t] = this.handlers[t] || []).push(fn); }
  removeEventListener(t, fn) { this.handlers[t] = (this.handlers[t] || []).filter((f) => f !== fn); }
  dispatchEvent(type, ev) {
    const e = ev || {};
    e.type = type;
    if (e.target === undefined) e.target = this;
    if (e.currentTarget === undefined) e.currentTarget = this;
    if (!e.preventDefault) e.preventDefault = () => {};
    if (!e.stopPropagation) e.stopPropagation = () => {};
    (this.handlers[type] || []).forEach((fn) => fn(e));
    return true;
  }
  focus() {} blur() {} select() {} scrollTo() {}
  click() { this.dispatchEvent("click"); }
  get firstChild() { return this.children[0] || null; }
  get parentElement() { return this.parentNode; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
}

const docElement = new FakeNode("html");
const body = new FakeNode("body");

/* Pre-create the elements index.html ships with, so getElementById finds them. */
for (const id of ["menu-btn", "theme-toggle", "palette-trigger", "palette", "palette-input",
  "palette-list", "palette-foot", "filter", "nav-groups", "content", "toast-region",
  "sidebar", "sidebar-backdrop", "sidebar-count"]) {
  const n = new FakeNode("div");
  n.setAttribute("id", id); // registers in idMap
}

const documentShim = {
  readyState: "loading",
  title: "",
  documentElement: docElement,
  body,
  createElement: (t) => new FakeNode(t),
  createTextNode: (t) => { const n = new FakeNode("#text"); n._text = String(t); return n; },
  getElementById: (id) => idMap.get(id) || null,
  addEventListener: (t, fn) => { (docBus[t] = docBus[t] || []).push(fn); },
  execCommand: () => true
};

global.window = global;
global.document = documentShim;

let _hash = "";
Object.defineProperty(global, "location", {
  configurable: true,
  value: {
    get hash() { return _hash; },
    set hash(v) { _hash = String(v); dispatchWin("hashchange"); },
    protocol: "http:",
    hostname: "localhost"
  }
});

global.addEventListener = (t, fn) => { (winBus[t] = winBus[t] || []).push(fn); };
global.removeEventListener = (t, fn) => { winBus[t] = (winBus[t] || []).filter((f) => f !== fn); };
global.dispatchEvent = dispatchWin;
global.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

/* navigator exists as a global from Node 21 onwards; shim it for older runtimes
 * so app boot behaves identically everywhere (no serviceWorker → SW skipped). */
if (typeof global.navigator === "undefined") {
  Object.defineProperty(global, "navigator", { configurable: true, value: { onLine: true } });
}

const _store = {};
try {
  Object.defineProperty(global, "localStorage", {
    configurable: true,
    value: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null),
      setItem: (k, v) => { _store[k] = String(v); },
      removeItem: (k) => { delete _store[k]; },
      clear: () => { for (const k of Object.keys(_store)) delete _store[k]; }
    }
  });
} catch (e) { /* some runtimes already define it */ }

if (!global.crypto || !global.crypto.subtle) {
  global.crypto = require("crypto").webcrypto;
}

/* ================================================================
 * Load the app and every tool, in the same order as index.html.
 * ================================================================ */

const root = path.join(__dirname, "..");
const scripts = [
  "assets/js/app.js",
  ...fs.readdirSync(path.join(root, "assets/js/tools"))
    .filter((f) => f.endsWith(".js")).sort()
    .map((f) => "assets/js/tools/" + f)
];

for (const f of scripts) {
  const src = fs.readFileSync(path.join(root, f), "utf8");
  try {
    (0, eval)(src); // indirect eval → global scope, like a classic <script>
  } catch (e) {
    recordError("load " + f, e);
  }
}

/* Fire DOMContentLoaded → app boots. */
(docBus.DOMContentLoaded || []).forEach((fn) => {
  try { fn(); } catch (e) { recordError("boot", e); }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function collect(node, pred, out) {
  out = out || [];
  for (const c of node.children || []) {
    if (pred(c)) out.push(c);
    collect(c, pred, out);
  }
  return out;
}

/* ================================================================
 * Exercise every tool: navigate, seed inputs, click all the buttons.
 * ================================================================ */

/* Seeds are applied to INPUT/TEXTAREA/SELECT elements in DOM order. */
const SEEDS = {
  base64: ["Hello, DevForge! ⚒ — unicode test", ""],
  case: ["hello world_test-foo BarBaz 42things"],
  color: ["#3b82f6", "#3b82f6"],
  cron: ["*/15 9-17 * * mon-fri"],
  diff: ["line one\nline two\nline three", "line one\nchanged line\nline three\nline four"],
  hash: ["hello world"],
  json: ['{"b":2,"a":{"z":1,"y":[true,null,"txt"]}}'],
  jwt: ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbmUgRG9lIiwiaWF0IjoxNzA5MDAwMDAwLCJleHAiOjE5NDY2MDQ4MDB9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"],
  lorem: ["paragraphs", "3", ""],
  regex: ["hel+o", "", "", "", "", "", "", "hello there\nhelllo world\nhey, hello!"],
  timestamp: ["1735689600", ""],
  url: ["https://user:pass@example.com:8443/tools/list?page=2&sort=desc%20desc#json",
        "https://user:pass@example.com:8443/tools/list?page=2&sort=desc%20desc#json"],
  uuid: ["5", "", ""]
};

/* ---------- assertion helpers ---------- */

function texts(root, pred) {
  return collect(root, pred, []).map((n) => String(n.value !== undefined && n.value !== "" ? n.value : n.textContent));
}

function codeValues(root) {
  return collect(root, (n) => n.tagName === "CODE" && String(n.className).includes("out-value"), [])
    .map((n) => String(n.textContent));
}

function rowValue(root, label) {
  const row = collect(root, (n) => n.classList.contains("out-row"), [])
    .find((r) => collect(r, (c) => c.classList.contains("out-label"), [])
      .some((c) => c.textContent === label));
  if (!row) return null;
  const code = collect(row, (c) => c.tagName === "CODE", [])[0];
  return code ? String(code.textContent) : null;
}

function readonlyTextareas(root) {
  return collect(root, (n) => n.tagName === "TEXTAREA" && n.getAttribute("readonly") !== null, [])
    .map((n) => String(n.value || ""));
}

function outputBlocks(root) {
  return collect(root, (n) => /output-block|diff-block/.test(String(n.className)), [])
    .map((n) => String(n.textContent));
}

/* Value assertions — only checked when the expected output exists, so they are
 * safe to run both right after seeding and after the first button click. */
const ASSERT = {
  base64(root) {
    const v = readonlyTextareas(root).find((t) => /^[A-Za-z0-9+/\-_=\s]+$/.test(t) && t.length > 8);
    if (!v) return null;
    const round = Buffer.from(v, "base64").toString("utf8");
    return round === "Hello, DevForge! ⚒ — unicode test" ? null : "base64 round-trip mismatch: " + round;
  },
  case(root) {
    const v = rowValue(root, "snake_case");
    if (v == null || v === "") return null;
    return v === "hello_world_test_foo_bar_baz_42things" ? null : "snake_case wrong: " + v;
  },
  color(root) {
    const v = rowValue(root, "HEX");
    if (!v) return null;
    return v.toLowerCase() === "#3b82f6" ? null : "hex conversion wrong: " + v;
  },
  cron(root) {
    const summary = texts(root, (n) => n.tagName === "STRONG")[0];
    if (!summary) return null;
    if (!/every 15 minutes between 09:00 and 17:45/i.test(summary)) return "summary wrong: " + summary;
    if (!/Monday to Friday/.test(summary)) return "summary day clause wrong: " + summary;
    const times = codeValues(root).filter((t) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(t));
    if (!times.length) return "no next-run times rendered";
    return times.every((t) => /:(00|15|30|45)$/.test(t)) ? null : "next runs not on */15 boundaries: " + times.join(", ");
  },
  diff(root) {
    const html = collect(root, (n) => /diff-block/.test(String(n.className)), []).map((n) => String(n.innerHTML)).join("");
    if (!html) return null;
    return html.includes("diff-add") && html.includes("diff-del") ? null : "diff missing add/del rows";
  },
  hash(root) {
    const vals = codeValues(root);
    if (!vals.some((v) => v.length === 64)) return null;
    const expected = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";
    return vals.includes(expected) ? null : "sha256('hello world') wrong: " + vals.join(",");
  },
  json(root) {
    const out = outputBlocks(root).find((t) => t.trim().startsWith("{"));
    if (!out) return null;
    if (!out.includes('"a"')) return "sorted keys missing 'a' first: " + out.slice(0, 40);
    return out.includes('\n  "') ? null : "expected 2-space indent: " + JSON.stringify(out.slice(0, 24));
  },
  jwt(root) {
    const blocks = outputBlocks(root);
    if (!blocks.length) return null;
    if (!blocks.some((b) => b.includes("HS256"))) return "header missing alg";
    const badges = texts(root, (n) => String(n.className).includes("badge"));
    if (!badges.includes("valid")) return "expiry badge missing (expected 'valid')";
    return null;
  },
  lorem(root) {
    const v = readonlyTextareas(root)[0];
    if (!v) return null;
    return v.startsWith("Lorem ipsum") ? null : "classic start missing: " + v.slice(0, 30);
  },
  regex(root) {
    const html = collect(root, (n) => /output-block/.test(String(n.className)), []).map((n) => String(n.innerHTML)).join("");
    if (!html) return null;
    return html.includes("<mark") ? null : "no highlighted matches";
  },
  timestamp(root) {
    // The first "ISO 8601 UTC" row belongs to the live "now" panel, so check
    // the converted unix seconds and the relative form instead.
    const unix = codeValues(root).filter((t) => /^\d+$/.test(t));
    if (!unix.length) return null;
    if (!unix.includes("1735689600")) return "unix conversion missing 1735689600: " + unix.join(",");
    const rel = rowValue(root, "Relative");
    if (rel == null || rel === "") return "relative row missing";
    return /ago$/.test(rel) ? null : "relative should be in the past: " + rel;
  },
  url(root) {
    const values = codeValues(root);
    if (!values.length) return null;
    if (!values.some((v) => v.includes("example.com"))) return "host missing: " + values.join(",");
    return null;
  },
  uuid(root) {
    const v = readonlyTextareas(root)[0];
    if (!v) return null;
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    const lines = v.split("\n").filter(Boolean);
    if (lines.length !== 5) return "expected 5 uuids, got " + lines.length;
    return lines.every((l) => re.test(l)) ? null : "invalid v4 uuid: " + v.split("\n")[0];
  }
};

async function main() {
  const DevKit = global.DevKit;
  if (!DevKit) { console.error("  ✖ DevKit never loaded"); process.exit(1); }
  if (!DevKit.tools.length) { console.error("  ✖ no tools registered"); process.exit(1); }

  console.log("Boot OK — " + DevKit.tools.length + " tools registered.");

  // Home view rendered?
  const content = idMap.get("content");
  if (!content || !content.children.length) { console.error("  ✖ home view did not render"); errors++; }
  const navItems = collect(idMap.get("nav-groups"), (n) => n.classList.contains("nav-item"), []);
  if (navItems.length !== DevKit.tools.length) {
    console.error("  ✖ sidebar shows " + navItems.length + " items, expected " + DevKit.tools.length);
    errors++;
  }

  // Command palette: open → filter → keyboard nav → open tool → close.
  idMap.get("palette-trigger").dispatchEvent("click");
  const pInput = idMap.get("palette-input");
  pInput.value = "json";
  pInput.dispatchEvent("input", { target: pInput });
  pInput.dispatchEvent("keydown", { key: "ArrowDown", preventDefault() {}, stopPropagation() {} });
  pInput.dispatchEvent("keydown", { key: "Enter", preventDefault() {}, stopPropagation() {} });
  await sleep(20);
  if (!/#\/[a-z-]+/.test(_hash)) { console.error("  ✖ palette Enter did not navigate (hash=" + _hash + ")"); errors++; }

  // Theme toggle + global shortcut.
  idMap.get("theme-toggle").dispatchEvent("click");
  dispatchWin("keydown", { ctrlKey: true, key: "k", preventDefault() {}, stopPropagation() {} });
  dispatchWin("keydown", { key: "Escape" });

  for (const tool of DevKit.tools) {
    process.stdout.write("  · " + tool.id + " … ");
    const before = errors;

    location.hash = "#/" + tool.id; // hashchange → route() → render
    await sleep(30);

    const toolRoot = content.children[0];
    if (!toolRoot) { console.error("✖ tool view empty"); errors++; continue; }

    // Seed inputs in DOM order, then fire input + change.
    const fields = collect(toolRoot, (n) => ["INPUT", "TEXTAREA", "SELECT"].includes(n.tagName), []);
    const seed = SEEDS[tool.id] || [];
    fields.forEach((n, i) => {
      if (seed[i] !== undefined) n.value = seed[i];
      n.dispatchEvent("input", { target: n });
      n.dispatchEvent("change", { target: n });
    });
    await sleep(450); // let debounced handlers fire

    // Value assertion, round 1 (output produced by live/debounced handlers).
    let asserted = false;
    const checkAssert = () => {
      if (asserted || !ASSERT[tool.id]) return;
      const msg = ASSERT[tool.id](toolRoot);
      asserted = true;
      if (msg) recordError(tool.id + " assertion", new Error(msg));
    };
    checkAssert();

    // Click every button in the tool UI.
    const buttons = collect(toolRoot, (n) => n.tagName === "BUTTON", []);
    let sawOutput = outputBlocks(toolRoot).some((t) => t.trim()) || codeValues(toolRoot).some((t) => t.trim()) || readonlyTextareas(toolRoot).some((t) => t.trim());
    for (const b of buttons) {
      const label = (b.textContent || b.title || "?").trim().slice(0, 24);
      try { b.dispatchEvent("click"); } catch (e) { recordError(tool.id + " click(" + label + ")", e); }
      await sleep(15);
      if (!/^clear$/i.test(label)) {
        if (outputBlocks(toolRoot).some((t) => t.trim()) || codeValues(toolRoot).some((t) => t.trim()) || readonlyTextareas(toolRoot).some((t) => t.trim())) sawOutput = true;
        checkAssert();
      }
    }
    await sleep(120); // async handlers settle

    if (!sawOutput) recordError(tool.id, new Error("tool produced no output"));
    if (!asserted && ASSERT[tool.id]) recordError(tool.id + " assertion", new Error("expected output never appeared"));

    // Navigate away (exercises cleanup), then back home.
    location.hash = "#/";
    await sleep(10);

    console.log(errors === before ? "ok (" + buttons.length + " buttons)" : "FAILED");
  }

  console.log(errors === 0 ? "\n✔ Smoke test passed — all tools render, react and produce correct output." : "\n✖ " + errors + " error(s).");
  process.exit(errors === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
