/* Tool: Case Converter — camelCase, snake_case, kebab-case and friends, all at once. */
"use strict";
(function () {
  function splitWords(text) {
    return String(text)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")     // camelCase -> camel Case
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")  // HTMLParser -> HTML Parser
      .replace(/[_\-./\\]+/g, " ")                 // separators -> spaces
      .split(/\s+/)
      .filter(Boolean);
  }

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  DevKit.register({
    id: "case",
    name: "Case Converter",
    category: "Text",
    description: "Convert text between camelCase, snake_case, kebab-case, CONSTANT_CASE and more.",
    keywords: ["case", "camel", "pascal", "snake", "kebab", "constant", "title", "upper", "lower", "naming"],
    icon: "type",

    render(root) {
      const el = DevKit.el;
      const input = el("textarea", { rows: 6, spellcheck: "false" }, "hello world_example — a camelCase string");
      const listBox = el("div");

      const cases = [
        ["camelCase", (w) => w.map((x, i) => i === 0 ? x.toLowerCase() : cap(x)).join("")],
        ["PascalCase", (w) => w.map(cap).join("")],
        ["snake_case", (w) => w.map((x) => x.toLowerCase()).join("_")],
        ["kebab-case", (w) => w.map((x) => x.toLowerCase()).join("-")],
        ["CONSTANT_CASE", (w) => w.map((x) => x.toUpperCase()).join("_")],
        ["dot.case", (w) => w.map((x) => x.toLowerCase()).join(".")],
        ["path/case", (w) => w.map((x) => x.toLowerCase()).join("/")],
        ["Title Case", (w) => w.map(cap).join(" ")],
        ["Sentence case", (w) => w.length ? cap(w.join(" ")) : ""],
        ["UPPERCASE", (w) => w.join(" ").toUpperCase()],
        ["lowercase", (w) => w.join(" ").toLowerCase()]
      ];

      function convert() {
        const words = splitWords(input.value);
        const rows = cases.map((c) => DevKit.kvRow(c[0], words.length ? c[1](words) : ""));
        listBox.replaceChildren.apply(listBox, rows);
      }
      const convertLive = DevKit.debounce(convert, 140);

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "field" }, el("label", { text: "Input — words are detected from spaces, separators and camelCase boundaries" }), input)
      ));

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "panel-head" },
          el("span", { class: "panel-title", text: "All the cases" }),
          el("span", { class: "panel-note", text: "click the copy button on any row" })
        ),
        listBox
      ));

      input.addEventListener("input", convertLive);
      convert();
    }
  });
})();
