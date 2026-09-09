/* Tool: UUID Generator — RFC 4122 v4 UUIDs from crypto-quality randomness. */
"use strict";
(function () {
  function uuidv4() {
    if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.prototype.map.call(b, (x) => x.toString(16).padStart(2, "0")).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }

  DevKit.register({
    id: "uuid",
    name: "UUID Generator",
    category: "Security",
    description: "Generate cryptographically random UUIDs (version 4) in bulk.",
    keywords: ["uuid", "guid", "id", "random", "v4", "identifier"],
    icon: "zap",

    render(root) {
      const el = DevKit.el;
      const count = el("input", { type: "number", min: "1", max: "500", value: "5" });
      const upper = el("input", { type: "checkbox" });
      const noHyphens = el("input", { type: "checkbox" });
      const output = el("textarea", { rows: 10, readonly: "readonly", spellcheck: "false", placeholder: "Click Generate…" });
      const status = el("div", { class: "status-line" });

      function generate() {
        let n = Math.round(Number(count.value));
        if (!isFinite(n) || n < 1) n = 1;
        if (n > 500) n = 500;
        if (String(n) !== count.value) count.value = String(n);
        const ids = [];
        for (let i = 0; i < n; i++) {
          let id = uuidv4();
          if (noHyphens.checked) id = id.replace(/-/g, "");
          if (upper.checked) id = id.toUpperCase();
          ids.push(id);
        }
        output.value = ids.join("\n");
        DevKit.setStatus(status, "✓ Generated " + n + " UUID" + (n === 1 ? "" : "s"), "ok");
      }

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "toolbar" },
          el("label", { class: "check" }, el("span", { text: "How many?" }), count),
          el("label", { class: "check" }, upper, el("span", { text: "UPPERCASE" })),
          el("label", { class: "check" }, noHyphens, el("span", { text: "no hyphens" })),
          el("button", { class: "btn btn-primary", onclick: generate }, "Generate"),
          status
        )
      ));

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "panel-head" },
          el("span", { class: "panel-title", text: "Output" }),
          DevKit.copyBtn(() => output.value)
        ),
        output
      ));

      count.addEventListener("change", generate);
      upper.addEventListener("change", generate);
      noHyphens.addEventListener("change", generate);
      generate();
    }
  });
})();
