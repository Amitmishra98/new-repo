/* Tool: URL — encode/decode text and take URLs apart. */
"use strict";
(function () {
  DevKit.register({
    id: "url",
    name: "URL Encode & Inspect",
    category: "Web & Style",
    description: "Percent-encode or decode text, and break any URL into its parts.",
    keywords: ["url", "uri", "encode", "decode", "percent", "query", "params", "parser"],
    icon: "link",

    render(root) {
      const el = DevKit.el;

      /* ---- encode / decode ---- */
      const input = el("textarea", { rows: 6, spellcheck: "false", placeholder: "Text or percent-encoded string…" });
      const output = el("textarea", { rows: 6, readonly: "readonly", spellcheck: "false", placeholder: "Result…" });
      const status = el("div", { class: "status-line" });
      let mode = "encode";

      function run() {
        const text = input.value;
        if (!text) { output.value = ""; DevKit.setStatus(status, "Waiting for input…", "muted"); return; }
        try {
          output.value = mode === "encode" ? encodeURIComponent(text) : decodeURIComponent(text);
          DevKit.setStatus(status, "✓ Done", "ok");
        } catch (e) {
          output.value = "";
          DevKit.setStatus(status, "✖ Malformed percent-encoding (a lone % or invalid escape)", "err");
        }
      }
      const runLive = DevKit.debounce(run, 150);

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "field" }, el("label", { text: "Encode / decode" }), input),
        el("div", { class: "toolbar" },
          el("button", { class: "btn btn-primary", onclick: () => { mode = "encode"; run(); } }, "Encode →"),
          el("button", { class: "btn btn-ghost", onclick: () => { mode = "decode"; run(); } }, "← Decode"),
          el("button", {
            class: "btn btn-ghost",
            title: "Use the output as the new input",
            onclick: () => { if (output.value) { input.value = output.value; run(); } }
          }, "⇅ Swap"),
          el("button", {
            class: "btn btn-danger-ghost",
            onclick: () => { input.value = ""; output.value = ""; DevKit.setStatus(status, "Waiting for input…", "muted"); }
          }, "Clear"),
          status
        ),
        el("div", { style: { marginTop: "12px" } },
          el("div", { class: "field" }, el("label", { text: "Result" }), output)
        )
      ));

      input.addEventListener("input", runLive);

      /* ---- URL inspector ---- */
      const urlInput = el("input", { type: "text", spellcheck: "false", placeholder: "https://user:pass@example.com:8443/tools/list?page=2&sort=desc#json", value: "https://user:pass@example.com:8443/tools/list?page=2&sort=desc#json" });
      const urlStatus = el("div", { class: "status-line" });
      const partsBox = el("div");

      function inspect() {
        const raw = urlInput.value.trim();
        partsBox.replaceChildren();
        if (!raw) { DevKit.setStatus(urlStatus, "Waiting for a URL…", "muted"); return; }
        let u;
        try {
          u = new URL(raw);
        } catch (e) {
          DevKit.setStatus(urlStatus, "✖ Not a valid absolute URL (include the protocol, e.g. https://)", "err");
          return;
        }
        DevKit.setStatus(urlStatus, "✓ Parsed", "ok");

        const rows = [
          ["Protocol", u.protocol], ["Host", u.hostname], ["Port", u.port || "(default)"],
          ["Path", u.pathname], ["Hash", u.hash || "—"], ["Origin", u.origin]
        ];
        if (u.username) rows.push(["Username", u.username]);
        if (u.password) rows.push(["Password", u.password]);

        const params = [];
        u.searchParams.forEach((value, key) => params.push(el("tr", null,
          el("td", { class: "mono-cell", text: key }),
          el("td", { class: "mono-cell", text: value }),
          el("td", null, DevKit.copyBtn(key + "=" + value))
        )));

        partsBox.appendChild(el("div", { class: "out-list" },
          rows.map((r) => DevKit.kvRow(r[0], r[1]))
        ));
        partsBox.appendChild(el("h3", { class: "home-group-title", style: { margin: "16px 0 8px" }, text: "Query parameters" }));
        partsBox.appendChild(params.length
          ? el("table", { class: "data-table" },
              el("thead", null, el("tr", null, el("th", { text: "Key" }), el("th", { text: "Value" }), el("th"))),
              el("tbody", null, params))
          : el("div", { class: "note", text: "No query parameters." })
        );
      }
      const inspectLive = DevKit.debounce(inspect, 200);

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "panel-head" },
          el("span", { class: "panel-title", text: "URL inspector" }),
          el("span", { class: "panel-note", text: "parsed locally with the browser URL API" })
        ),
        el("div", { class: "field" }, el("label", { text: "URL" }), urlInput),
        el("div", { class: "toolbar" },
          el("button", { class: "btn btn-ghost", onclick: inspect }, "Parse"),
          urlStatus
        ),
        el("div", { style: { marginTop: "10px" } }, partsBox)
      ));

      urlInput.addEventListener("input", inspectLive);
      inspect();
    }
  });
})();
