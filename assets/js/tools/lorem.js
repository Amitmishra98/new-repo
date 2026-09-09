/* Tool: Lorem Ipsum — placeholder text on demand. */
"use strict";
(function () {
  const WORDS = ("lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore " +
    "et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea " +
    "commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur " +
    "excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum").split(" ");

  const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const pick = () => WORDS[randInt(0, WORDS.length - 1)];

  function sentence() {
    const n = randInt(6, 14);
    let s = "";
    for (let i = 0; i < n; i++) s += (i === 0 ? "" : " ") + pick();
    return s.charAt(0).toUpperCase() + s.slice(1) + ".";
  }

  function paragraph() {
    return Array.from({ length: randInt(4, 8) }, sentence).join(" ");
  }

  DevKit.register({
    id: "lorem",
    name: "Lorem Ipsum",
    category: "Text",
    description: "Generate placeholder paragraphs, sentences or words of classic lorem ipsum.",
    keywords: ["lorem", "ipsum", "placeholder", "dummy", "text", "filler"],
    icon: "align",

    render(root) {
      const el = DevKit.el;
      const kind = el("select", null,
        el("option", { value: "paragraphs", text: "Paragraphs" }),
        el("option", { value: "sentences", text: "Sentences" }),
        el("option", { value: "words", text: "Words" })
      );
      const count = el("input", { type: "number", min: "1", max: "100", value: "3" });
      const classic = el("input", { type: "checkbox" });
      classic.checked = true;
      const status = el("div", { class: "status-line" });
      const output = el("textarea", { rows: 12, readonly: "readonly", spellcheck: "false", placeholder: "Generated text appears here…" });

      function generate() {
        let n = Math.round(Number(count.value));
        if (!isFinite(n) || n < 1) n = 1;
        if (n > 100) n = 100;
        count.value = String(n);

        let text = "";
        if (kind.value === "words") {
          const parts = Array.from({ length: n }, pick);
          if (classic.checked) parts.splice(0, 2, "lorem", "ipsum");
          text = parts.join(" ");
        } else if (kind.value === "sentences") {
          const parts = Array.from({ length: n }, sentence);
          if (classic.checked) parts[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
          text = parts.join(" ");
        } else {
          const parts = Array.from({ length: n }, paragraph);
          if (classic.checked) parts[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
          text = parts.join("\n\n");
        }
        output.value = text;
        const unit = kind.value;
        DevKit.setStatus(status, "✓ Generated " + n + " " + unit.replace(/s$/, n === 1 ? "" : "s"), "ok");
      }

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "toolbar" },
          el("label", { class: "check" }, el("span", { text: "Type" }), kind),
          el("label", { class: "check" }, el("span", { text: "Count" }), count),
          el("label", { class: "check" }, classic, el("span", { text: "start with “Lorem ipsum…”" })),
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

      kind.addEventListener("change", generate);
      count.addEventListener("change", generate);
      generate();
    }
  });
})();
