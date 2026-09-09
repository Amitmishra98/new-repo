/* Tool: Hash Generator — SHA-1/256/384/512 digests via the browser's WebCrypto API. */
"use strict";
(function () {
  const ALGS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];

  function toHex(buf) {
    const bytes = new Uint8Array(buf);
    let out = "";
    for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
    return out;
  }

  DevKit.register({
    id: "hash",
    name: "Hash Generator",
    category: "Security",
    description: "SHA-1, SHA-256, SHA-384 and SHA-512 digests, computed locally with WebCrypto.",
    keywords: ["hash", "sha", "sha1", "sha256", "sha512", "digest", "checksum", "crypto"],
    icon: "hash",

    render(root) {
      const el = DevKit.el;
      const input = el("textarea", { rows: 6, spellcheck: "false", placeholder: "Type or paste text to hash…" });
      const status = el("div", { class: "status-line" });
      const rowsBox = el("div");
      const values = {};

      const rowEls = {};
      for (const alg of ALGS) {
        const valueEl = el("code", { class: "out-value wrap", text: "" });
        values[alg] = valueEl;
        rowEls[alg] = DevKit.kvRow(alg, valueEl);
      }
      rowsBox.replaceChildren.apply(rowsBox, ALGS.map((a) => rowEls[a]));

      async function compute() {
        const text = input.value;
        if (!text) {
          for (const alg of ALGS) values[alg].textContent = "";
          DevKit.setStatus(status, "Waiting for input…", "muted");
          return;
        }
        if (!(window.crypto && crypto.subtle && crypto.subtle.digest)) {
          DevKit.setStatus(status, "✖ WebCrypto is unavailable — open this page over HTTPS or localhost.", "err");
          return;
        }
        try {
          const bytes = new TextEncoder().encode(text);
          const results = await Promise.all(ALGS.map((alg) => crypto.subtle.digest(alg, bytes)));
          ALGS.forEach((alg, i) => { values[alg].textContent = toHex(results[i]); });
          DevKit.setStatus(status, "✓ Hashed " + text.length.toLocaleString() + " characters", "ok");
        } catch (e) {
          DevKit.setStatus(status, "✖ Hashing failed: " + (e && e.message ? e.message : e), "err");
        }
      }
      const computeLive = DevKit.debounce(compute, 220);

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "field" }, el("label", { text: "Input" }), input),
        el("div", { class: "toolbar" },
          el("button", {
            class: "btn btn-danger-ghost",
            onclick: () => { input.value = ""; compute(); }
          }, "Clear"),
          status
        )
      ));

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "panel-head" },
          el("span", { class: "panel-title", text: "Digests" }),
          el("span", { class: "panel-note", text: "hex, lowercase" })
        ),
        rowsBox
      ));

      input.addEventListener("input", computeLive);
      compute();
    }
  });
})();
