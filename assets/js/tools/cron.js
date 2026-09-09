/* Tool: Cron Explainer — describe standard 5-field cron expressions and compute next runs. */
"use strict";
(function () {
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTH_NAMES = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const DAY_NAMES = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

  const FIELDS = [
    { key: "minute", label: "Minute", min: 0, max: 59, names: null },
    { key: "hour", label: "Hour", min: 0, max: 23, names: null },
    { key: "dom", label: "Day of month", min: 1, max: 31, names: null },
    { key: "month", label: "Month", min: 1, max: 12, names: MONTH_NAMES },
    { key: "dow", label: "Day of week", min: 0, max: 7, names: DAY_NAMES }
  ];

  function parseField(field, spec) {
    const values = new Set();
    const parts = [];
    for (const part of String(field).split(",")) {
      const piece = part.trim();
      if (!piece) throw new Error('empty value in "' + field + '" for ' + spec.label.toLowerCase());
      let step = 1;
      let body = piece;
      if (piece.includes("/")) {
        const slash = piece.split("/");
        body = slash[0];
        step = parseInt(slash[1], 10);
        if (!isFinite(step) || step < 1) throw new Error('invalid step "' + slash[1] + '" in ' + spec.label.toLowerCase() + ' field');
      }
      let from, to;
      const resolve = (tok) => {
        const t = String(tok).trim().toLowerCase();
        if (spec.names && spec.names[t] != null) return spec.names[t];
        const n = parseInt(t, 10);
        if (!/^\d+$/.test(t) || isNaN(n)) throw new Error('unknown value "' + tok + '" in ' + spec.label.toLowerCase() + ' field');
        return n;
      };
      if (body === "*" || body === "") {
        from = spec.min; to = spec.max;
      } else if (body.includes("-")) {
        const bits = body.split("-");
        from = resolve(bits[0]); to = resolve(bits[1]);
      } else {
        from = to = resolve(body);
        if (step > 1 && body !== "*") to = spec.max; // "5/15" style
      }
      if (isNaN(from) || isNaN(to) || from < spec.min || to > spec.max || from > to) {
        throw new Error('"' + body + '" is out of range (' + spec.min + "–" + spec.max + ") for " + spec.label.toLowerCase());
      }
      for (let v = from; v <= to; v += step) values.add(v);
      parts.push({ body, step });
    }
    const wild = field.trim() === "*";
    // Sunday can be 0 or 7.
    if (spec.key === "dow" && values.has(7)) { values.add(0); values.delete(7); }
    return { values, wild, str: field.trim() };
  }

  function parseCron(expr) {
    const raw = String(expr).trim().replace(/\s+/g, " ");
    if (!raw) throw new Error("Enter a cron expression.");
    const fields = raw.split(" ");
    if (fields.length !== 5) {
      throw new Error("Expected 5 fields (minute hour day-of-month month day-of-week), got " + fields.length + ".");
    }
    const parsed = {};
    FIELDS.forEach((spec, i) => {
      parsed[spec.key] = parseField(fields[i], spec);
    });
    return { raw, fields: parsed };
  }

  function describeValues(p, spec) {
    if (p.wild) return "every " + spec.label.toLowerCase();
    const sorted = [...p.values].sort((a, b) => a - b);
    const fmt = (v) => spec.key === "month" ? MONTHS[v - 1] : spec.key === "dow" ? DAYS[v] : String(v);
    let text = sorted.map(fmt).join(", ");
    // Compact long runs: "1,2,3,...,31" -> "1–31"
    if (sorted.length > 6) {
      const step = sorted.length > 1 ? sorted[1] - sorted[0] : 1;
      const isRun = step > 0 && sorted.every((v, i) => i === 0 || v - sorted[i - 1] === step);
      if (isRun) text = fmt(sorted[0]) + " to " + fmt(sorted[sorted.length - 1]) + (step > 1 ? ", every " + step : "");
    }
    return text;
  }

  function contiguousRange(sorted) {
    if (!sorted || sorted.length < 2) return null;
    if (sorted[1] - sorted[0] !== 1) return null;
    for (let i = 2; i < sorted.length; i++) if (sorted[i] - sorted[i - 1] !== 1) return null;
    return [sorted[0], sorted[sorted.length - 1]];
  }

  function uniformStep(sorted) {
    if (!sorted || sorted.length < 2) return null;
    const step = sorted[1] - sorted[0];
    if (step < 1) return null;
    for (let i = 2; i < sorted.length; i++) if (sorted[i] - sorted[i - 1] !== step) return null;
    return step;
  }

  function summarize(parsed) {
    const f = parsed.fields;
    const minutes = [...f.minute.values].sort((a, b) => a - b);
    const hours = [...f.hour.values].sort((a, b) => a - b);
    const doms = [...f.dom.values].sort((a, b) => a - b);
    const dows = [...f.dow.values].sort((a, b) => a - b);
    const two = (n) => String(n).padStart(2, "0");

    /* Time clause. */
    let timeClause;
    const mStep = f.minute.wild ? null : uniformStep(minutes);
    const hRange = f.hour.wild ? null : contiguousRange(hours);
    if (f.minute.wild && f.hour.wild) {
      timeClause = "every minute";
    } else if (mStep && minutes[0] === 0 && (f.hour.wild || hRange)) {
      const lastM = 59 - (59 % mStep);
      if (f.hour.wild) {
        timeClause = "every " + mStep + " minutes";
      } else {
        timeClause = "every " + mStep + " minutes between " + two(hours[0]) + ":00 and " + two(hours[hours.length - 1]) + ":" + two(lastM);
      }
    } else {
      const mins = f.minute.wild ? [0] : minutes;
      const times = [];
      for (const h of hours) for (const m of mins) times.push(two(h) + ":" + two(m));
      timeClause = "at " + times.slice(0, 6).join(", ") + (times.length > 6 ? " and more" : "");
    }

    /* Day clause. */
    let dayClause;
    if (f.dom.wild && f.dow.wild) {
      dayClause = "every day";
    } else if (f.dow.wild) {
      const r = contiguousRange(doms);
      dayClause = (r && r[0] !== r[1])
        ? "on days " + r[0] + " to " + r[1] + " of the month"
        : "on " + describeValues(f.dom, FIELDS[2]) + " of the month";
    } else if (f.dom.wild) {
      const r = contiguousRange(dows);
      if (r && r[1] - r[0] >= 2) dayClause = "on " + DAYS[r[0]] + " to " + DAYS[r[1]];
      else dayClause = "on " + dows.map((d) => DAYS[d]).join(", ");
    } else {
      dayClause = "on day " + describeValues(f.dom, FIELDS[2]) + " of the month and on " + describeValues(f.dow, FIELDS[4]);
    }

    /* Month clause. */
    const monthClause = f.month.wild ? "" : " in " + describeValues(f.month, FIELDS[3]);

    const sentence = timeClause.charAt(0).toUpperCase() + timeClause.slice(1) + ", " + dayClause + monthClause + ".";
    return sentence;
  }

  function nextRuns(parsed, count) {
    const f = parsed.fields;
    const start = new Date();
    start.setSeconds(0, 0);
    const firstMinute = new Date(start.getTime() + 60000);

    const dayMatches = (d) => {
      if (!f.month.values.has(d.getMonth() + 1)) return false;
      const domOk = f.dom.values.has(d.getDate());
      const dowOk = f.dow.values.has(d.getDay());
      if (f.dom.wild && f.dow.wild) return true;
      if (f.dom.wild) return dowOk;
      if (f.dow.wild) return domOk;
      return domOk || dowOk; // standard cron OR semantics when both are restricted
    };

    const out = [];
    const scanStart = new Date(firstMinute.getFullYear(), firstMinute.getMonth(), firstMinute.getDate());
    for (let day = 0; day < 731 && out.length < count; day++) {
      const d = new Date(scanStart.getFullYear(), scanStart.getMonth(), scanStart.getDate() + day);
      if (!dayMatches(d)) continue;
      const dayStart = d.getTime();
      const fromMinute = day === 0 ? firstMinute.getHours() * 60 + firstMinute.getMinutes() : 0;
      for (let mins = fromMinute; mins < 1440 && out.length < count; mins++) {
        if (!f.hour.values.has(Math.floor(mins / 60))) continue;
        if (!f.minute.values.has(mins % 60)) continue;
        out.push(new Date(dayStart + mins * 60000));
      }
    }
    return out;
  }

  DevKit.register({
    id: "cron",
    name: "Cron Explainer",
    category: "Time",
    description: "Translate standard 5-field cron expressions into plain English and see upcoming run times.",
    keywords: ["cron", "crontab", "schedule", "expression", "explain", "next run"],
    icon: "calendar",

    render(root) {
      const el = DevKit.el;
      const input = el("input", { type: "text", spellcheck: "false", placeholder: "*/5 9-17 * * mon-fri", value: "*/5 9-17 * * mon-fri" });
      const status = el("div", { class: "status-line" });
      const summaryBox = el("div");
      const tableBox = el("div");
      const nextBox = el("div");

      function run() {
        summaryBox.replaceChildren();
        tableBox.replaceChildren();
        nextBox.replaceChildren();

        let parsed;
        try {
          parsed = parseCron(input.value);
        } catch (e) {
          DevKit.setStatus(status, "✖ " + (e && e.message ? e.message : "Invalid expression"), "err");
          return;
        }
        DevKit.setStatus(status, "✓ Valid cron expression", "ok");

        summaryBox.appendChild(el("p", { style: { margin: "0", fontSize: "15px", lineHeight: "1.6" } },
          el("strong", { text: summarize(parsed) })
        ));

        tableBox.appendChild(el("table", { class: "data-table" },
          el("thead", null, el("tr", null, el("th", { text: "Field" }), el("th", { text: "Allowed values" }))),
          el("tbody", null, FIELDS.map((spec) => el("tr", null,
            el("td", { text: spec.label + " (" + parsed.fields[spec.key].str + ")" }),
            el("td", { class: "mono-cell", text: describeValues(parsed.fields[spec.key], spec) })
          )))
        ));

        const runs = nextRuns(parsed, 5);
        if (!runs.length) {
          nextBox.appendChild(el("div", { class: "note", text: "No runs found within the next two years (e.g. February 30th?)." }));
        } else {
          nextBox.appendChild(el("div", null, runs.map((d) => DevKit.kvRow(
            DAYS[d.getDay()],
            d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") +
              " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0")
          ))));
        }
      }
      const runLive = DevKit.debounce(run, 220);

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "field" }, el("label", { text: "Cron expression — minute · hour · day of month · month · day of week" }), input),
        el("div", { class: "toolbar" },
          el("button", { class: "btn btn-primary", onclick: run }, "Explain"),
          el("button", { class: "btn btn-ghost", onclick: () => { input.value = "*/5 9-17 * * mon-fri"; run(); } }, "Sample"),
          status
        )
      ));

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "panel-head" }, el("span", { class: "panel-title", text: "In plain English" })),
        summaryBox
      ));

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "panel-head" }, el("span", { class: "panel-title", text: "Field breakdown" })),
        tableBox
      ));

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "panel-head" },
          el("span", { class: "panel-title", text: "Next 5 runs (your local time)" }),
          el("span", { class: "panel-note", text: "standard cron semantics: when both day fields are restricted, either may match" })
        ),
        nextBox
      ));

      input.addEventListener("input", runLive);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
      run();
    }
  });
})();
