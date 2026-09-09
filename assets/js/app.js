/* Toolbelt — app shell: tool registry, hash router, command palette, theme, shared helpers.
 * Zero dependencies, zero build step. Each tool lives in assets/js/tools/<id>.js
 * and registers itself with DevKit.register({ id, name, category, description, keywords, icon, render }).
 */
"use strict";
(function () {
  /* ------------------------------------------------------------------ *
   * Tiny DOM helpers                                                    *
   * ------------------------------------------------------------------ */
  function isNodeLike(v) {
    return v && typeof v === "object" && typeof v.appendChild === "function";
  }

  function appendKids(node, list) {
    for (const c of list) {
      if (c == null || c === false) continue;
      if (Array.isArray(c)) { appendKids(node, c); continue; }
      node.appendChild(isNodeLike(c) ? c : document.createTextNode(String(c)));
    }
  }

  /** el(tag, attrs, ...children) — attrs supports class, html, text, style, dataset, on-event handlers, value, checked; anything else becomes an attribute. */
  function el(tag, attrs) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const key of Object.keys(attrs)) {
        const v = attrs[key];
        if (v == null || v === false) continue;
        if (key === "class") node.className = v;
        else if (key === "html") node.innerHTML = v;
        else if (key === "text") node.textContent = v;
        else if (key === "style" && typeof v === "object") Object.assign(node.style, v);
        else if (key === "dataset") Object.assign(node.dataset, v);
        else if (key === "value") { node.value = v; node.setAttribute("value", v); }
        else if (key === "checked") { node.checked = true; node.setAttribute("checked", "checked"); }
        else if (key === "disabled") { node.disabled = true; node.setAttribute("disabled", "disabled"); }
        else if (key.slice(0, 2) === "on" && typeof v === "function") node.addEventListener(key.slice(2).toLowerCase(), v);
        else node.setAttribute(key, v);
      }
    }
    appendKids(node, Array.prototype.slice.call(arguments, 2));
    return node;
  }

  /** Escape a string for safe insertion into innerHTML. */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function debounce(fn, ms) {
    let t = 0;
    return function () {
      const args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(self, args), ms);
    };
  }

  /* ------------------------------------------------------------------ *
   * Icons (inline SVG, feather-style)                                   *
   * ------------------------------------------------------------------ */
  const ICONS = {
    braces: '<path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1"/>',
    code: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
    terminal: '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    droplet: '<path d="M12 2.7s6.5 6.6 6.5 11.3a6.5 6.5 0 0 1-13 0C5.5 9.3 12 2.7 12 2.7z"/>',
    hash: '<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="m16 3-2 18"/>',
    zap: '<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/>',
    key: '<path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    type: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
    diff: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    align: '<path d="M3 4h18"/><path d="M3 9h12"/><path d="M3 14h16"/><path d="M3 19h9"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.9 4.9l1.4 1.4"/><path d="M17.7 17.7l1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.9 19.1 1.4-1.4"/><path d="M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/>'
  };

  function icon(name) {
    const p = ICONS[name] || ICONS.zap;
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>";
  }

  /* ------------------------------------------------------------------ *
   * Toast + clipboard                                                   *
   * ------------------------------------------------------------------ */
  let toastRegionEl = null;

  function toast(msg, type) {
    if (!toastRegionEl) return;
    const t = el("div", { class: "toast toast-" + (type || "success") },
      el("span", { class: "toast-icon", html: icon(type === "error" ? "x" : "check") }),
      el("span", { text: msg })
    );
    toastRegionEl.appendChild(t);
    setTimeout(() => {
      t.classList.add("toast-out");
      setTimeout(() => t.remove(), 260);
    }, 2200);
  }

  async function copy(text) {
    const s = String(text == null ? "" : text);
    if (!s) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(s);
        return true;
      }
    } catch (e) { /* fall through to legacy path */ }
    try {
      const ta = document.createElement("textarea");
      ta.value = s;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return !!ok;
    } catch (e) {
      return false;
    }
  }

  /** A small ghost button that copies text (string or () => string) and toasts the result. */
  function copyBtn(getText, label) {
    return el("button", {
      class: "btn btn-ghost btn-sm",
      title: "Copy to clipboard",
      onclick: async () => {
        const text = typeof getText === "function" ? getText() : getText;
        const ok = await copy(text);
        toast(ok ? "Copied to clipboard" : "Nothing to copy", ok ? "success" : "error");
      }
    }, el("span", { class: "btn-icon", html: icon("copy") }), label ? el("span", { text: label }) : null);
  }

  /* ------------------------------------------------------------------ *
   * Shared UI bits used by many tools                                   *
   * ------------------------------------------------------------------ */
  function setStatus(node, msg, type) {
    node.textContent = msg || "";
    node.className = "status-line status-" + (type || "muted");
  }

  /** A label + mono value + copy button row. value can be a string or a node. opts: { wrap:boolean, copy:null to hide } */
  function kvRow(label, value, opts) {
    opts = opts || {};
    const valEl = isNodeLike(value) ? value : el("code", { class: "out-value" + (opts.wrap ? " wrap" : ""), text: String(value) });
    const kids = [el("span", { class: "out-label", text: label }), valEl];
    if (opts.copy !== null) kids.push(copyBtn(() => valEl.textContent));
    return el("div", { class: "out-row" }, kids);
  }

  /* ------------------------------------------------------------------ *
   * Tool registry                                                       *
   * ------------------------------------------------------------------ */
  const tools = [];
  let booted = false;

  function register(tool) {
    if (!tool || typeof tool !== "object") { console.warn("[toolbelt] register: expected an object"); return; }
    if (!tool.id || !/^[a-z0-9-]+$/.test(tool.id)) { console.warn("[toolbelt] register: invalid id", tool.id); return; }
    if (typeof tool.render !== "function") { console.warn("[toolbelt] register: missing render()", tool.id); return; }
    if (tools.some((t) => t.id === tool.id)) { console.warn("[toolbelt] register: duplicate id", tool.id); return; }
    tool.category = tool.category || "Other";
    tool.keywords = tool.keywords || [];
    tool.icon = tool.icon || "zap";
    tools.push(tool);
    if (booted) buildSidebar();
  }

  const CATEGORY_ORDER = ["Data", "Text", "Web & Style", "Time", "Security", "Other"];

  function groupTools() {
    const cats = [];
    for (const t of tools) if (!cats.includes(t.category)) cats.push(t.category);
    cats.sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return cats.map((c) => ({
      category: c,
      tools: tools.filter((t) => t.category === c).sort((a, b) => a.name.localeCompare(b.name))
    }));
  }

  /* ------------------------------------------------------------------ *
   * State + elements                                                    *
   * ------------------------------------------------------------------ */
  const LS_THEME = "toolbelt.theme";
  let contentEl = null, navGroupsEl = null, filterEl = null, themeBtn = null;
  let paletteEl = null, paletteInputEl = null, paletteListEl = null;
  let paletteOpen = false, paletteActive = 0, paletteMatches = [];
  const navItems = {};       // tool id -> nav <a>
  const navGroups = {};      // category -> group element
  let currentTool = null;

  /* ------------------------------------------------------------------ *
   * Theme                                                               *
   * ------------------------------------------------------------------ */
  function setTheme(t, persist) {
    document.documentElement.setAttribute("data-theme", t);
    if (themeBtn) themeBtn.innerHTML = icon(t === "dark" ? "sun" : "moon");
    if (persist) { try { localStorage.setItem(LS_THEME, t); } catch (e) { /* private mode etc. */ } }
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(LS_THEME); } catch (e) { /* ignore */ }
    let t = "dark";
    if (saved === "light" || saved === "dark") t = saved;
    else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) t = "light";
    setTheme(t, false);
    themeBtn.addEventListener("click", () => {
      setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
    });
  }

  /* ------------------------------------------------------------------ *
   * Sidebar                                                             *
   * ------------------------------------------------------------------ */
  function buildSidebar() {
    navGroupsEl.replaceChildren();
    for (const k of Object.keys(navItems)) delete navItems[k];
    for (const k of Object.keys(navGroups)) delete navGroups[k];

    const groups = groupTools();
    for (const g of groups) {
      const items = g.tools.map((t) => {
        const a = el("a", {
          class: "nav-item",
          href: "#/" + t.id,
          title: t.description || t.name,
          html: icon(t.icon) + "<span>" + esc(t.name) + "</span>"
        });
        a.addEventListener("click", () => closeMobileSidebar());
        navItems[t.id] = a;
        return a;
      });
      const grp = el("div", { class: "nav-group" },
        el("div", { class: "nav-group-title", text: g.category }),
        items
      );
      navGroups[g.category] = grp;
      navGroupsEl.appendChild(grp);
    }
    const count = document.getElementById("sidebar-count");
    if (count) count.textContent = tools.length + " tools";
    applyFilter(filterEl ? filterEl.value : "");
    updateActiveNav(currentTool ? currentTool.id : null);
  }

  function applyFilter(q) {
    const query = (q || "").trim().toLowerCase();
    for (const t of tools) {
      const hay = (t.name + " " + t.keywords.join(" ")).toLowerCase();
      const item = navItems[t.id];
      if (item) item.classList.toggle("hidden", !!query && hay.indexOf(query) === -1);
    }
    for (const cat of Object.keys(navGroups)) {
      const grp = navGroups[cat];
      const anyVisible = tools.some((t) => t.category === cat && navItems[t.id] && !navItems[t.id].classList.contains("hidden"));
      grp.classList.toggle("hidden", !anyVisible);
    }
  }

  function updateActiveNav(id) {
    for (const t of tools) {
      const item = navItems[t.id];
      if (item) item.classList.toggle("active", t.id === id);
    }
  }

  /* ------------------------------------------------------------------ *
   * Views                                                               *
   * ------------------------------------------------------------------ */
  function renderHome() {
    const groups = groupTools();
    contentEl.replaceChildren(el("div", { class: "home" },
      el("section", { class: "hero" },
        el("div", { class: "hero-mark", html: '<svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#f59e0b"/><path d="M18 19 36 32 18 45" stroke="#1c1917" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M28 50h18" stroke="#1c1917" stroke-width="7" stroke-linecap="round"/></svg>' }),
        el("h1", { text: "Toolbelt" }),
        el("p", {
          class: "hero-tag",
          text: "A pocket Swiss-Army knife for developers. Every tool runs locally in your browser — no server, no build step, no dependencies."
        }),
        el("div", { class: "chips" },
          el("span", { class: "chip", text: tools.length + " tools" }),
          el("span", { class: "chip", text: "0 dependencies" }),
          el("span", { class: "chip", text: "works offline" }),
          el("span", { class: "chip", text: "MIT licensed" })
        )
      ),
      groups.map((g) => el("section", { class: "home-group" },
        el("h2", { class: "home-group-title", text: g.category }),
        el("div", { class: "cards" }, g.tools.map((t) =>
          el("a", {
            class: "card",
            href: "#/" + t.id,
            html: '<span class="card-icon">' + icon(t.icon) + "</span>" +
                  '<span class="card-name">' + esc(t.name) + "</span>" +
                  '<span class="card-desc">' + esc(t.description || "") + "</span>"
          })
        ))
      ))
    ));
  }

  function cleanupTool(tool) {
    if (tool._cleanup && typeof tool._cleanup.destroy === "function") {
      try { tool._cleanup.destroy(); } catch (e) { /* ignore */ }
      tool._cleanup = null;
    }
    if (typeof tool.destroy === "function") {
      try { tool.destroy(); } catch (e) { /* ignore */ }
    }
  }

  function renderTool(tool) {
    const body = el("div", { class: "tool-body" });
    currentTool = tool;
    contentEl.replaceChildren(el("div", { class: "tool" },
      el("header", { class: "tool-head" },
        el("div", { class: "tool-head-icon", html: icon(tool.icon) }),
        el("div", { class: "tool-head-text" },
          el("h1", { class: "tool-title", text: tool.name }),
          el("p", { class: "tool-desc", text: tool.description || "" })
        )
      ),
      body
    ));
    try {
      const ret = tool.render(body);
      if (ret && typeof ret.destroy === "function") tool._cleanup = ret;
    } catch (e) {
      body.appendChild(el("div", { class: "panel panel-err", text: "This tool failed to render: " + (e && e.message ? e.message : e) }));
      console.error("[toolbelt] render failed for " + tool.id, e);
    }
    if (typeof contentEl.scrollTo === "function") contentEl.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------------ *
   * Router                                                              *
   * ------------------------------------------------------------------ */
  function route() {
    const m = location.hash.match(/^#\/([a-z0-9-]+)/);
    const tool = m ? tools.find((t) => t.id === m[1]) : null;

    if (currentTool) { cleanupTool(currentTool); currentTool = null; }

    if (tool) renderTool(tool);
    else renderHome();

    updateActiveNav(tool ? tool.id : null);
    document.title = tool ? tool.name + " — Toolbelt" : "Toolbelt — a zero-dependency developer toolbox";
    closeMobileSidebar();
  }

  function navigate(id) {
    const target = "#/" + id;
    if (location.hash === target) route();
    else location.hash = target; // fires hashchange -> route()
  }

  /* ------------------------------------------------------------------ *
   * Command palette                                                     *
   * ------------------------------------------------------------------ */
  function fuzzy(query, text) {
    if (!query) return 1;
    let ti = 0, first = -1;
    for (let i = 0; i < query.length; i++) {
      const idx = text.indexOf(query[i], ti);
      if (idx === -1) return 0;
      if (i === 0) first = idx;
      ti = idx + 1;
    }
    return (first === 0 ? 3 : 2);
  }

  function paletteQuery(q) {
    const query = (q || "").trim().toLowerCase();
    return tools
      .map((t) => ({ t, score: fuzzy(query, (t.name + " " + t.keywords.join(" ")).toLowerCase()) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.t.name.localeCompare(b.t.name))
      .map((x) => x.t);
  }

  function renderPalette(query) {
    paletteMatches = paletteQuery(query);
    paletteActive = 0;
    const items = paletteMatches.map((t, i) =>
      el("li", {
        class: "palette-item" + (i === 0 ? " active" : ""),
        role: "option",
        "aria-selected": i === 0 ? "true" : "false",
        onclick: () => { closePalette(); navigate(t.id); },
        html: '<span class="palette-item-icon">' + icon(t.icon) + "</span>" +
              '<span class="palette-item-name">' + esc(t.name) + "</span>" +
              '<span class="palette-item-cat">' + esc(t.category) + "</span>"
      })
    );
    if (items.length) paletteListEl.replaceChildren.apply(paletteListEl, items);
    else paletteListEl.replaceChildren(el("li", { class: "palette-empty", text: "No tools match “" + query.trim() + "”" }));
  }

  function openPalette() {
    paletteOpen = true;
    paletteEl.hidden = false;
    paletteInputEl.value = "";
    renderPalette("");
    paletteInputEl.focus();
  }

  function closePalette() {
    if (!paletteOpen) return;
    paletteOpen = false;
    paletteEl.hidden = true;
  }

  function movePalette(delta) {
    if (!paletteMatches.length) return;
    paletteActive = (paletteActive + delta + paletteMatches.length) % paletteMatches.length;
    const kids = paletteListEl.children;
    for (let i = 0; i < kids.length; i++) {
      const isOn = i === paletteActive;
      kids[i].classList.toggle("active", isOn);
      kids[i].setAttribute("aria-selected", isOn ? "true" : "false");
    }
  }

  /* ------------------------------------------------------------------ *
   * Mobile sidebar                                                      *
   * ------------------------------------------------------------------ */
  function openMobileSidebar() {
    document.body.classList.add("sidebar-open");
    const bd = document.getElementById("sidebar-backdrop");
    if (bd) bd.hidden = false;
  }

  function closeMobileSidebar() {
    document.body.classList.remove("sidebar-open");
    const bd = document.getElementById("sidebar-backdrop");
    if (bd) bd.hidden = true;
  }

  /* ------------------------------------------------------------------ *
   * Boot                                                                *
   * ------------------------------------------------------------------ */
  function boot() {
    contentEl = document.getElementById("content");
    navGroupsEl = document.getElementById("nav-groups");
    filterEl = document.getElementById("filter");
    themeBtn = document.getElementById("theme-toggle");
    paletteEl = document.getElementById("palette");
    paletteInputEl = document.getElementById("palette-input");
    paletteListEl = document.getElementById("palette-list");
    toastRegionEl = document.getElementById("toast-region");
    booted = true;

    initTheme();
    buildSidebar();

    // Filter as you type in the sidebar.
    filterEl.addEventListener("input", () => applyFilter(filterEl.value));

    // Command palette.
    document.getElementById("palette-trigger").addEventListener("click", openPalette);
    paletteEl.addEventListener("click", (e) => { if (e.target === paletteEl) closePalette(); });
    paletteInputEl.addEventListener("input", () => renderPalette(paletteInputEl.value));
    paletteInputEl.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); movePalette(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); movePalette(-1); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const t = paletteMatches[paletteActive];
        if (t) { closePalette(); navigate(t.id); }
      } else if (e.key === "Escape") {
        closePalette();
      }
    });

    // Global shortcuts.
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === "k") {
        e.preventDefault();
        if (paletteOpen) closePalette(); else openPalette();
      } else if (e.key === "Escape" && paletteOpen) {
        closePalette();
      }
    });

    // Mobile menu.
    document.getElementById("menu-btn").addEventListener("click", () => {
      if (document.body.classList.contains("sidebar-open")) closeMobileSidebar();
      else openMobileSidebar();
    });
    document.getElementById("sidebar-backdrop").addEventListener("click", closeMobileSidebar);

    // Router.
    window.addEventListener("hashchange", route);
    route();

    // Offline support (skipped when opened straight from the file system).
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => { /* offline mode unavailable — fine */ });
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  /* ------------------------------------------------------------------ *
   * Public API for tools                                                *
   * ------------------------------------------------------------------ */
  window.DevKit = {
    tools,
    register,
    el, esc, icon,
    toast, copy, copyBtn,
    debounce, kvRow, setStatus,
    navigate
  };
})();
