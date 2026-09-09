/* Tool: Regex Tester — live match highlighting and a capture-group table. */
"use strict";
(function () {
  const esc = DevKit.esc;

  DevKit.register({
    id: "regex",
    name: "Regex Tester",
    category: "Web & Style",
    description: "Test JavaScript regular expressions with live highlighting and match details.",
    keywords: ["regex", "regexp", "pattern", "match", "test", "groups", "highlight"],
    icon: "terminal",

    render(root) {
      const el = DevKit.el;
      const pattern = el("input", { type: "text", spellcheck: "false", placeholder: "Pattern, e.g. \\b\\w+@\\w+\\.\\w+\\b", value: "hel+o" });
      const testText = el("textarea", { rows: 8, spellcheck: "false" }, "hello there\nhelllo world\nhey, hello!\nhi");
      const status = el("div", { class: "status-line" });
      const highlightBox = el("div", { class: "output-block", style: { whiteSpace: "pre-wrap", maxHeight: "260px" } });
      const tableBox = el("div");

      const FLAGS = ["g", "i", "m", "s", "u", "y"];
      const flagChecks = FLAGS.map((f) => {
        const cb = el("input", { type: "checkbox", title: "flag " + f });
        if (f === "g") cb.checked = true;
        return el("label", { class: "check", title: "flag " + f }, cb, el("span", { class: "mono", text: f }));
      });
      const flagNodes = flagChecks.map((n) => n.firstChild);

      function flagsOn() {
        return FLAGS.filter((f, i) => flagNodes[i].checked).join("");
      }

      function run() {
        const src = testText.value;
        const pat = pattern.value;
        tableBox.replaceChildren();
        highlightBox.textContent = "";

        if (!pat) {
          DevKit.setStatus(status, "Type a pattern above.", "muted");
          highlightBox.textContent = src || "";
          return;
        }

        let re, reGlobal;
        const flags = flagsOn();
        try {
          re = new RegExp(pat, flags);
          reGlobal = new RegExp(pat, flags.includes("g") ? flags : flags + "g");
        } catch (e) {
          DevKit.setStatus(status, "✖ Invalid pattern: " + (e && e.message ? e.message : e), "err");
          highlightBox.textContent = src;
          return;
        }

        // Collect matches (guard against zero-length infinite loops).
        const matches = [];
        const sticky = flags.includes("g") === false; // highlight first match only without /g
        let m, guard = 0;
        reGlobal.lastIndex = 0;
        while ((m = reGlobal.exec(src)) !== null) {
          matches.push({ text: m[0], index: m.index, groups: m.slice(1), named: m.groups || null });
          if (sticky) break;
          if (m[0] === "") { reGlobal.lastIndex++; if (reGlobal.lastIndex > src.length) break; }
          if (++guard > 5000) break;
        }

        // Build highlighted view.
        let html = "", last = 0;
        for (const mt of matches) {
          if (mt.index > last) html += esc(src.slice(last, mt.index));
          const safe = esc(mt.text);
          html += safe === "" ? "<mark class=\"hl\"> </mark>" : "<mark class=\"hl\">" + safe + "</mark>";
          last = mt.index + mt.text.length;
        }
        html += esc(src.slice(last));
        highlightBox.innerHTML = html || (src ? esc(src) : "");

        const n = matches.length;
        if (!n) {
          DevKit.setStatus(status, "No matches · /" + pat + "/" + flags, "muted");
          return;
        }
        DevKit.setStatus(status, "✓ " + n + " match" + (n === 1 ? "" : "es") + " · /" + pat + "/" + flags, "ok");

        const rows = matches.slice(0, 200).map((mt, i) => el("tr", null,
          el("td", { class: "mono-cell", text: String(i + 1) }),
          el("td", { class: "mono-cell", text: String(mt.index) }),
          el("td", { class: "mono-cell", text: JSON.stringify(mt.text) }),
          el("td", { class: "mono-cell", text: mt.groups.length ? mt.groups.map((g) => g == null ? "—" : JSON.stringify(g)).join(" · ") : "—" }),
          el("td", { class: "mono-cell", text: mt.named ? Object.keys(mt.named).map((k) => k + ": " + JSON.stringify(mt.named[k])).join(" · ") : "—" })
        ));
        tableBox.appendChild(el("table", { class: "data-table" },
          el("thead", null, el("tr", null,
            el("th", { text: "#" }), el("th", { text: "Index" }), el("th", { text: "Match" }), el("th", { text: "Groups" }), el("th", { text: "Named" })
          )),
          el("tbody", null, rows)
        ));
      }
      const runLive = DevKit.debounce(run, 220);

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "field" }, el("label", { text: "Pattern" }), pattern),
        el("div", { class: "toolbar" },
          el("span", { class: "panel-note", text: "Flags:" }),
          flagChecks,
          el("span", { class: "panel-note", style: { marginLeft: "auto" }, text: "JavaScript (ES2018+) flavor" })
        )
      ));

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "field" }, el("label", { text: "Test string" }), testText),
        status
      ));

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "panel-head" },
          el("span", { class: "panel-title", text: "Highlighted matches" }),
          DevKit.copyBtn(() => testText.value)
        ),
        highlightBox
      ));

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "panel-head" }, el("span", { class: "panel-title", text: "Matches" })),
        tableBox
      ));

      pattern.addEventListener("input", runLive);
      testText.addEventListener("input", runLive);
      flagNodes.forEach((cb) => cb.addEventListener("change", run));
      run();
    }
  });
})();
