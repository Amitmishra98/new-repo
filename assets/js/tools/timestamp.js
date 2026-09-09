/* Tool: Timestamp Converter — unix seconds/milliseconds, ISO 8601, local time and relative dates. */
"use strict";
(function () {
  const pad = (n, w) => String(n).padStart(w || 2, "0");

  function toLocalISO(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  function relTime(d) {
    const diff = (d.getTime() - Date.now()) / 1000;
    const past = diff < 0;
    const abs = Math.abs(diff);
    let text;
    if (abs < 45) text = "less than a minute";
    else if (abs < 2700) text = Math.round(abs / 60) + " minutes";
    else if (abs < 79200) text = Math.round(abs / 3600) + " hours";
    else if (abs < 2.4e6) text = Math.round(abs / 86400) + " days";
    else if (abs < 2.9e7) text = Math.round(abs / 2592000) + " months";
    else text = Math.round(abs / 31536000) + " years";
    return past ? text + " ago" : "in " + text;
  }

  function parseTimestamp(str) {
    const t = String(str).trim();
    if (!t) return null;
    if (/^-?\d+$/.test(t)) {
      const n = Number(t);
      if (Math.abs(n) > 1e14) return null; // implausible
      return new Date(Math.abs(n) > 1e11 ? n : n * 1000);
    }
    const d = new Date(t);
    return isNaN(d.getTime()) ? null : d;
  }

  DevKit.register({
    id: "timestamp",
    name: "Timestamp Converter",
    category: "Time",
    description: "Convert between unix time, ISO 8601, local time and human-relative dates.",
    keywords: ["timestamp", "unix", "epoch", "iso", "8601", "date", "time", "relative", "milliseconds"],
    icon: "clock",

    render(root) {
      const el = DevKit.el;
      let timer = 0;

      /* ---- live "now" panel ---- */
      const nowRows = {};
      const NOW_FIELDS = [
        ["Unix (s)", () => String(Math.floor(Date.now() / 1000))],
        ["Unix (ms)", () => String(Date.now())],
        ["ISO 8601 UTC", () => new Date().toISOString()],
        ["Local (ISO-like)", () => toLocalISO(new Date())],
        ["UTC string", () => new Date().toUTCString()]
      ];
      const nowBox = el("div", null, NOW_FIELDS.map((f) => {
        const code = el("code", { class: "out-value" });
        nowRows[f[0]] = { code, get: f[1] };
        return DevKit.kvRow(f[0], code);
      }));
      function tick() {
        for (const k of Object.keys(nowRows)) nowRows[k].code.textContent = nowRows[k].get();
      }
      tick();
      timer = setInterval(tick, 1000);

      /* ---- converter ---- */
      const input = el("input", { type: "text", spellcheck: "false", placeholder: "1735689600 · 1735689600000 · 2025-01-01T00:00:00Z · now" });
      const picker = el("input", { type: "datetime-local", step: "1" });
      const status = el("div", { class: "status-line" });
      const resultBox = el("div");

      function convert() {
        resultBox.replaceChildren();
        const raw = input.value.trim();
        if (!raw || raw.toLowerCase() === "now") {
          if (!raw) { DevKit.setStatus(status, "Waiting for input…", "muted"); return; }
        }
        const d = raw.toLowerCase() === "now" ? new Date() : parseTimestamp(raw);
        if (!d || isNaN(d.getTime())) {
          DevKit.setStatus(status, "✖ Could not parse — try unix seconds, milliseconds or an ISO 8601 string.", "err");
          return;
        }
        DevKit.setStatus(status, "✓ Parsed as " + (Date.now() > d.getTime() ? "a past" : "a future") + " date", "ok");
        const rows = [
          ["Unix (s)", String(Math.floor(d.getTime() / 1000))],
          ["Unix (ms)", String(d.getTime())],
          ["ISO 8601 UTC", d.toISOString()],
          ["Local", toLocalISO(d)],
          ["UTC string", d.toUTCString()],
          ["Relative", relTime(d)]
        ];
        resultBox.replaceChildren.apply(resultBox, rows.map((r) => DevKit.kvRow(r[0], r[1])));
      }
      const convertLive = DevKit.debounce(convert, 180);

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "panel-head" },
          el("span", { class: "panel-title", text: "Right now" }),
          el("span", { class: "panel-note", text: "updates every second" })
        ),
        nowBox
      ));

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "panel-head" }, el("span", { class: "panel-title", text: "Convert" })),
        el("div", { class: "field" }, el("label", { text: "Unix seconds, milliseconds, ISO string or “now”" }), input),
        el("div", { class: "toolbar" },
          el("button", { class: "btn btn-primary", onclick: convert }, "Convert"),
          el("button", { class: "btn btn-ghost", onclick: () => { input.value = String(Math.floor(Date.now() / 1000)); convert(); } }, "Use now"),
          picker,
          el("button", {
            class: "btn btn-ghost",
            title: "Convert the picked date & time",
            onclick: () => { if (picker.value) { input.value = picker.value; convert(); } }
          }, "From picker"),
          el("button", {
            class: "btn btn-danger-ghost",
            onclick: () => { input.value = ""; resultBox.replaceChildren(); DevKit.setStatus(status, "Waiting for input…", "muted"); }
          }, "Clear"),
          status
        ),
        el("div", { style: { marginTop: "10px" } }, resultBox)
      ));

      input.addEventListener("input", convertLive);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") convert(); });
      convert();

      return {
        destroy() { if (timer) clearInterval(timer); }
      };
    }
  });
})();
