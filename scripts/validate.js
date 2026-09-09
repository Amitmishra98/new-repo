#!/usr/bin/env node
/* Static validation for DevForge — checks that every tool is wired up correctly.
 * Run: node scripts/validate.js   (exits non-zero on failure)
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const toolDir = path.join(root, "assets", "js", "tools");

let failures = 0;
const must = (cond, msg) => {
  if (cond) return true;
  console.error("  ✖ " + msg);
  failures++;
  return false;
};

/* ---- every tool file is well-formed and registered ---- */
const files = fs.readdirSync(toolDir).filter((f) => f.endsWith(".js")).sort();
if (files.length === 0) must(false, "no tool files found in assets/js/tools/");

const ids = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(toolDir, f), "utf8");
  must(/DevKit\.register\s*\(\s*\{/.test(src), f + ": missing DevKit.register({...})");
  const id = (src.match(/\bid:\s*['"]([a-z0-9-]+)['"]/) || [])[1];
  must(!!id, f + ": missing id: 'kebab-case-id'");
  if (id) {
    must(!ids.includes(id), f + ": duplicate tool id '" + id + "'");
    ids.push(id);
  }
  must(/\bname:\s*['"]/.test(src), f + ": missing name");
  must(/\bcategory:\s*['"]/.test(src), f + ": missing category");
  must(/\bdescription:\s*['"]/.test(src), f + ": missing description");
  must(/render\s*\(/.test(src), f + ": missing render(container)");
}

/* ---- every tool file is loaded by index.html ---- */
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const f of files) {
  must(html.includes('src="assets/js/tools/' + f + '"'), f + " is not loaded by index.html");
}

/* ---- every tool file is precached by the service worker ---- */
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
for (const f of files) {
  must(sw.includes('"./assets/js/tools/' + f + '"'), f + " is missing from the sw.js precache list");
}

/* ---- core files exist ---- */
for (const f of ["index.html", "manifest.webmanifest", "sw.js", "favicon.svg", "assets/css/style.css", "assets/js/app.js", "LICENSE", "README.md", "CONTRIBUTING.md"]) {
  must(fs.existsSync(path.join(root, f)), "missing required file: " + f);
}
for (const f of ["assets/icons/icon-192.png", "assets/icons/icon-512.png"]) {
  must(fs.existsSync(path.join(root, f)), "missing icon: " + f + " (run node scripts/gen-icons.js)");
}

/* ---- SEO / crawler files exist ---- */
for (const f of ["robots.txt", "sitemap.xml", "llms.txt", "assets/img/og-image.png"]) {
  must(fs.existsSync(path.join(root, f)), "missing SEO file: " + f);
}

if (failures) {
  console.error("\n" + failures + " problem(s) found.");
  process.exit(1);
}
console.log("✔ " + files.length + " tools validated, all wired up (index.html, sw.js, icons, docs).");
