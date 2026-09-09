/* Tool: Base64 — encode and decode text (unicode-safe, URL-safe alphabet supported). */
"use strict";
(function () {
  function bytesToBase64(bytes) {
    let bin = "";
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CH, bytes.length)));
    }
    return btoa(bin);
  }

  function base64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function normalizeBase64(str, urlSafe) {
    let s = String(str).replace(/\s+/g, "");
    if (urlSafe) s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return s;
  }

  DevKit.register({
    id: "base64",
    name: "Base64",
    category: "Data",
    description: "Encode and decode Base64 — unicode-safe, with URL-safe alphabet support.",
    keywords: ["base64", "encode", "decode", "atob", "btoa", "url safe"],
    icon: "code",

    render(root) {
      const el = DevKit.el;
      const input = el("textarea", { rows: 8, spellcheck: "false", placeholder: "Type text to encode, or paste Base64 to decode…" });
      const output = el("textarea", { rows: 8, readonly: "readonly", spellcheck: "false", placeholder: "Result appears here…" });
      const status = el("div", { class: "status-line" });
      const urlSafe = el("input", { type: "checkbox", id: "b64-urlsafe" });
      let mode = "encode";

      function run() {
        const text = input.value;
        if (!text) { output.value = ""; DevKit.setStatus(status, "Waiting for input…", "muted"); return; }
        try {
          if (mode === "encode") {
            let s = bytesToBase64(new TextEncoder().encode(text));
            if (urlSafe.checked) s = s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
            output.value = s;
            DevKit.setStatus(status, "✓ Encoded " + text.length.toLocaleString() + " characters", "ok");
          } else {
            const bytes = base64ToBytes(normalizeBase64(text, urlSafe.checked));
            output.value = new TextDecoder().decode(bytes);
            DevKit.setStatus(status, "✓ Decoded " + text.length.toLocaleString() + " Base64 characters", "ok");
          }
        } catch (e) {
          output.value = "";
          DevKit.setStatus(status, "✖ Not valid Base64 (check for stray characters or padding)", "err");
        }
      }
      const runLive = DevKit.debounce(run, 150);

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "field" }, el("label", { text: "Input" }), input),
        el("div", { class: "toolbar" },
          el("button", { class: "btn btn-primary", onclick: () => { mode = "encode"; run(); } }, "Encode →"),
          el("button", { class: "btn btn-ghost", onclick: () => { mode = "decode"; run(); } }, "← Decode"),
          el("button", {
            class: "btn btn-ghost",
            title: "Use the output as the new input",
            onclick: () => { if (output.value) { input.value = output.value; run(); } }
          }, "⇅ Swap"),
          el("label", { class: "check" }, urlSafe, el("span", { text: "URL-safe (-_)" })),
          el("button", {
            class: "btn btn-danger-ghost",
            onclick: () => { input.value = ""; output.value = ""; DevKit.setStatus(status, "Waiting for input…", "muted"); }
          }, "Clear"),
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

      input.addEventListener("input", runLive);
      urlSafe.addEventListener("change", run);
      DevKit.setStatus(status, "Waiting for input…", "muted");
    }
  });
})();

