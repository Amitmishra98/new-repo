/* Tool: Diff Checker — line-by-line diff of two texts (classic LCS algorithm). */
"use strict";
(function () {
  const esc = DevKit.esc;
  const MAX_LINES = 2000;

  function diffLines(aText, bText) {
    let A = aText.split("\n");
    let B = bText.split("\n");
    let trimmed = false;
    if (A.length > MAX_LINES) { A = A.slice(0, MAX_LINES); trimmed = true; }
    if (B.length > MAX_LINES) { B = B.slice(0, MAX_LINES); trimmed = true; }
    const n = A.length, m = B.length;

    // Longest common subsequence table.
    const dp = new Uint32Array((n + 1) * (m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * (m + 1) + j] = A[i] === B[j]
          ? dp[(i + 1) * (m + 1) + (j + 1)] + 1
          : Math.max(dp[(i + 1) * (m + 1) + j], dp[i * (m + 1) + (j + 1)]);
      }
    }

    const ops = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { ops.push({ t: "ctx", s: A[i], a: i, b: j }); i++; j++; }
      else if (dp[(i + 1) * (m + 1) + j] >= dp[i * (m + 1) + (j + 1)]) { ops.push({ t: "del", s: A[i], a: i }); i++; }
      else { ops.push({ t: "add", s: B[j], b: j }); j++; }
    }
    while (i < n) { ops.push({ t: "del", s: A[i], a: i }); i++; }
    while (j < m) { ops.push({ t: "add", s: B[j], b: j }); j++; }
    return { ops, added: ops.filter((o) => o.t === "add").length, removed: ops.filter((o) => o.t === "del").length, context: ops.filter((o) => o.t === "ctx").length, trimmed };
  }

  function renderDiff(ops, changesOnly) {
    let html = "";
    for (const op of ops) {
      if (changesOnly && op.t === "ctx") continue;
      const left = op.a != null ? String(op.a + 1) : "";
      const right = op.b != null ? String(op.b + 1) : "";
      const cls = op.t === "add" ? "diff-add" : op.t === "del" ? "diff-del" : "";
      const marker = op.t === "add" ? "+" : op.t === "del" ? "−" : " ";
      html += '<div class="diff-line ' + cls + '">' +
        '<span class="diff-gutter"><span>' + left + "</span><span>" + right + "</span></span>" +
        '<span class="diff-text">' + marker + " " + (op.s === "" ? " " : esc(op.s)) + "</span></div>";
    }
    return html || '<div class="diff-line"><span class="diff-gutter"> </span><span class="diff-text">No differences.</span></div>';
  }

  DevKit.register({
    id: "diff",
    name: "Diff Checker",
    category: "Data",
    description: "Compare two texts line by line — additions, deletions and context.",
    keywords: ["diff", "compare", "changes", "text", "lines", "merge", "delta"],
    icon: "diff",

    render(root) {
      const el = DevKit.el;
      const a = el("textarea", { rows: 12, spellcheck: "false", placeholder: "Original text…" }, "the quick brown fox\njumps over\nthe lazy dog");
      const b = el("textarea", { rows: 12, spellcheck: "false", placeholder: "Changed text…" }, "the quick brown fox\nleaps over\nthe lazy dog\nand keeps running");
      const status = el("div", { class: "status-line" });
      const changesOnly = el("input", { type: "checkbox" });
      changesOnly.checked = true;
      const diffBox = el("div", { class: "diff-block" });
      let last = null;

      function compare() {
        const result = diffLines(a.value, b.value);
        last = result;
        diffBox.innerHTML = renderDiff(result.ops, changesOnly.checked);
        const bits = [];
        if (result.added) bits.push("+" + result.added + " added");
        if (result.removed) bits.push("−" + result.removed + " removed");
        if (result.context) bits.push(result.context + " unchanged");
        if (!result.added && !result.removed) DevKit.setStatus(status, "✓ The two texts are identical", "ok");
        else DevKit.setStatus(status, bits.join(" · ") + (result.trimmed ? " · (inputs longer than " + MAX_LINES + " lines were truncated)" : ""), "ok");
      }
      const compareLive = DevKit.debounce(compare, 400);

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "grid-2" },
          el("div", { class: "field" }, el("label", { text: "Original" }), a),
          el("div", { class: "field" }, el("label", { text: "Changed" }), b)
        ),
        el("div", { class: "toolbar" },
          el("button", { class: "btn btn-primary", onclick: compare }, "Compare"),
          el("label", { class: "check" }, changesOnly, el("span", { text: "changes only" })),
          el("button", {
            class: "btn btn-danger-ghost",
            onclick: () => { a.value = ""; b.value = ""; compare(); }
          }, "Clear"),
          status
        )
      ));

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "panel-head" },
          el("span", { class: "panel-title", text: "Unified diff" }),
          DevKit.copyBtn(() => diffBox.textContent)
        ),
        diffBox
      ));

      a.addEventListener("input", compareLive);
      b.addEventListener("input", compareLive);
      changesOnly.addEventListener("change", () => {
        if (last) diffBox.innerHTML = renderDiff(last.ops, changesOnly.checked);
      });
      compare();
    }
  });
})();
