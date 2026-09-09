/* Tool: JWT Decoder — inspect header, payload and expiry of JSON Web Tokens.
 * Note: this decodes for inspection only — it does NOT verify signatures.
 */
"use strict";
(function () {
  function b64urlToBytes(s) {
    let b = String(s).replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
    while (b.length % 4) b += "=";
    const bin = atob(b);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function relTime(ts) {
    const diff = ts - Date.now() / 1000;
    const abs = Math.abs(diff);
    const units = [[60, "second"], [3600, "minute"], [86400, "hour"], [2592000, "day"], [31536000, "month"], [Infinity, "year"]];
    let n = abs, unit = "second";
    for (let i = 0; i < units.length; i++) {
      if (abs < units[i][0]) { n = Math.max(1, Math.round(abs / (i === 0 ? 1 : units[i - 1][0]))); unit = units[i][1]; break; }
    }
    const plural = n === 1 ? "" : "s";
    return diff >= 0 ? "in " + n + " " + unit + plural : n + " " + unit + plural + " ago";
  }

  function dateClaimRow(label, value) {
    const d = new Date(value * 1000);
    if (isNaN(d.getTime())) return DevKit.kvRow(label, String(value));
    const text = value + "  →  " + d.toISOString() + "  (" + relTime(value) + ")";
    const node = DevKit.el("div", { style: { display: "flex", gap: "8px", alignItems: "center", flex: "1", minWidth: "0" } },
      DevKit.el("code", { class: "out-value wrap", text })
    );
    return DevKit.el("div", { class: "out-row" },
      DevKit.el("span", { class: "out-label", text: label }), node);
  }

  DevKit.register({
    id: "jwt",
    name: "JWT Decoder",
    category: "Security",
    description: "Decode JWT headers, payloads and expiry. Inspection only — signatures are not verified.",
    keywords: ["jwt", "token", "auth", "bearer", "decode", "exp", "claims"],
    icon: "key",

    render(root) {
      const el = DevKit.el;
      const SAMPLE = [
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.",
        "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbmUgRG9lIiwiaWF0IjoxNzA5MDAwMDAwLCJleHAiOjE5NDY2MDQ4MDB9.",
        "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
      ].join("");

      const input = el("textarea", { rows: 6, spellcheck: "false", placeholder: "eyJhbGciOiJIUzI1NiIs…" });
      const status = el("div", { class: "status-line" });
      const result = el("div", null);

      function prettyObj(bytes) {
        const text = new TextDecoder().decode(bytes);
        const obj = JSON.parse(text);
        return { obj, text: JSON.stringify(obj, null, 2) };
      }

      function claimRow(key, value) {
        if ((key === "exp" || key === "iat" || key === "nbf") && typeof value === "number" && value > 0 && value < 4e10) {
          const row = dateClaimRow(key, value);
          if (key === "exp") {
            const expired = value * 1000 < Date.now();
            row.appendChild(el("span", { class: "badge " + (expired ? "badge-err" : "badge-ok"), text: expired ? "expired" : "valid" }));
          }
          return row;
        }
        return DevKit.kvRow(key, typeof value === "object" ? JSON.stringify(value) : String(value));
      }

      function decode() {
        const token = input.value.trim();
        result.replaceChildren();
        if (!token) { DevKit.setStatus(status, "Waiting for a token…", "muted"); return; }

        const parts = token.split(".");
        if (parts.length !== 3) {
          DevKit.setStatus(status, "✖ A JWT has three dot-separated sections — this one has " + parts.length + ".", "err");
          return;
        }

        let header, payload;
        try { header = prettyObj(b64urlToBytes(parts[0])); }
        catch (e) { DevKit.setStatus(status, "✖ Could not decode the header (not valid Base64URL).", "err"); return; }
        try { payload = prettyObj(b64urlToBytes(parts[1])); }
        catch (e) { DevKit.setStatus(status, "✖ Could not decode the payload (not valid Base64URL or not JSON).", "err"); return; }
        if (!parts[2]) { DevKit.setStatus(status, "✖ Token is missing its signature section.", "err"); return; }

        DevKit.setStatus(status, "✓ Decoded · algorithm: " + (header.obj.alg || "unknown"), "ok");

        result.appendChild(el("div", { class: "panel" },
          el("div", { class: "panel-head" },
            el("span", { class: "panel-title", text: "Header" }),
            DevKit.copyBtn(() => header.text)
          ),
          el("pre", { class: "output-block", text: header.text })
        ));

        result.appendChild(el("div", { class: "panel" },
          el("div", { class: "panel-head" },
            el("span", { class: "panel-title", text: "Payload" }),
            el("span", { class: "badge badge-neutral", text: "signature not verified" }),
            DevKit.copyBtn(() => payload.text)
          ),
          el("pre", { class: "output-block", text: payload.text }),
          el("div", { style: { marginTop: "10px" } },
            Object.keys(payload.obj).map((k) => claimRow(k, payload.obj[k]))
          )
        ));

        result.appendChild(el("div", { class: "panel" },
          el("div", { class: "panel-head" }, el("span", { class: "panel-title", text: "Signature (raw)" })),
          el("pre", { class: "output-block", text: parts[2] })
        ));
      }
      const decodeLive = DevKit.debounce(decode, 180);

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "field" }, el("label", { text: "JWT" }), input),
        el("div", { class: "toolbar" },
          el("button", { class: "btn btn-ghost", onclick: () => { input.value = SAMPLE; decode(); } }, "Sample token"),
          el("button", {
            class: "btn btn-danger-ghost",
            onclick: () => { input.value = ""; result.replaceChildren(); DevKit.setStatus(status, "Waiting for a token…", "muted"); }
          }, "Clear"),
          status
        ),
        el("div", { class: "note", style: { marginTop: "12px" }, text: "Decoding a JWT does not prove it is authentic — never trust claims without verifying the signature server-side." })
      ));

      root.appendChild(result);
      input.addEventListener("input", decodeLive);
      decode();
    }
  });
})();
