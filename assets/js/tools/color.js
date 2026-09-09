/* Tool: Color Converter — hex, rgb and hsl conversions, shades, and WCAG contrast. */
"use strict";
(function () {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function parseHex(s) {
    const m = /^#?([0-9a-f]{3,8})$/i.exec(s.trim());
    if (!m) return null;
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some(isNaN)) return null;
    return { r, g, b };
  }

  function parseRgb(s) {
    const m = /^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})/.exec(s.trim());
    if (!m) return null;
    const out = { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
    if (Object.values(out).some((v) => isNaN(v) || v > 255)) return null;
    return out;
  }

  function parseHsl(s) {
    const m = /^hsla?\(\s*(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(\d{1,3}(?:\.\d+)?)%?\s*[,\s]\s*(\d{1,3}(?:\.\d+)?)%?/.exec(s.trim());
    if (!m) return null;
    return hslToRgb(Number(m[1]), clamp(Number(m[2]), 0, 100), clamp(Number(m[3]), 0, 100));
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      else if (max === g) h = ((b - r) / d + 2) * 60;
      else h = ((r - g) / d + 4) * 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  const hex2 = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  const toHex = (c) => "#" + hex2(c.r) + hex2(c.g) + hex2(c.b);
  const toRgb = (c) => "rgb(" + c.r + ", " + c.g + ", " + c.b + ")";

  function luminance(c) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  function contrast(c1, c2) {
    const l1 = luminance(c1), l2 = luminance(c2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  function wcagBadge(ratio) {
    if (ratio >= 7) return { cls: "badge-ok", text: "AAA" };
    if (ratio >= 4.5) return { cls: "badge-ok", text: "AA" };
    if (ratio >= 3) return { cls: "badge-warn", text: "AA large only" };
    return { cls: "badge-err", text: "fail" };
  }

  DevKit.register({
    id: "color",
    name: "Color Converter",
    category: "Web & Style",
    description: "Convert between hex, rgb and hsl, preview shades and check WCAG contrast.",
    keywords: ["color", "hex", "rgb", "hsl", "contrast", "wcag", "palette", "shades", "css"],
    icon: "droplet",

    render(root) {
      const el = DevKit.el;
      let current = { r: 245, g: 181, b: 46 }; // devforge amber

      const input = el("input", { type: "text", spellcheck: "false", placeholder: "#f5b52e · rgb(245, 181, 46) · hsl(39, 91%, 57%)", value: "#f5b52e" });
      const picker = el("input", { type: "color", value: "#f5b52e", title: "Pick a color" });
      const status = el("div", { class: "status-line" });
      const swatch = el("div", { class: "swatch-lg", text: "" });
      const outBox = el("div");
      const shadesBox = el("div", { class: "shades" });
      const contrastBox = el("div");

      function parseAny(str) {
        return parseHex(str) || parseRgb(str) || parseHsl(str);
      }

      function update(fromPicker) {
        const c = fromPicker ? parseHex(picker.value) : parseAny(input.value);
        if (!c) {
          DevKit.setStatus(status, "✖ Not a color I understand — try hex, rgb() or hsl().", "err");
          return;
        }
        current = c;
        const hex = toHex(c);
        const hsl = rgbToHsl(c.r, c.g, c.b);
        if (!fromPicker) picker.value = hex;
        else if (input.value.trim().toLowerCase() !== hex) input.value = hex;

        DevKit.setStatus(status, "✓ " + hex, "ok");
        const bgReadable = luminance(c) > 0.35;
        swatch.style.background = hex;
        swatch.style.color = bgReadable ? "#111111" : "#ffffff";
        swatch.textContent = hex.toUpperCase();

        outBox.replaceChildren(
          DevKit.kvRow("HEX", hex),
          DevKit.kvRow("RGB", toRgb(c)),
          DevKit.kvRow("HSL", "hsl(" + hsl.h + ", " + hsl.s + "%, " + hsl.l + "%)"),
          DevKit.kvRow("CSS var", "--color: " + hex + ";")
        );

        shadesBox.replaceChildren();
        for (let l = 95; l >= 5; l -= 10) {
          const sh = hslToRgb(hsl.h, hsl.s, l);
          const shHex = toHex(sh);
          const d = el("div", {
            class: "shade",
            title: l + "% · " + shHex + " (click to copy)",
            style: { background: shHex }
          });
          d.addEventListener("click", () => DevKit.copy(shHex).then((ok) => DevKit.toast(ok ? "Copied " + shHex : "Copy failed", ok ? "success" : "error")));
          shadesBox.appendChild(d);
        }

        const white = contrast(c, { r: 255, g: 255, b: 255 });
        const black = contrast(c, { r: 0, g: 0, b: 0 });
        contrastBox.replaceChildren(
          el("div", { class: "out-row" },
            el("span", { class: "out-label", text: "vs white" }),
            el("code", { class: "out-value", text: white.toFixed(2) + " : 1" }),
            el("span", { class: "badge " + wcagBadge(white).cls, text: wcagBadge(white).text })
          ),
          el("div", { class: "out-row" },
            el("span", { class: "out-label", text: "vs black" }),
            el("code", { class: "out-value", text: black.toFixed(2) + " : 1" }),
            el("span", { class: "badge " + wcagBadge(black).cls, text: wcagBadge(black).text })
          )
        );
      }
      const updateLive = DevKit.debounce(() => update(false), 160);

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "toolbar" },
          picker,
          el("div", { style: { flex: "1", minWidth: "180px" } }, input),
          status
        ),
        el("div", { style: { marginTop: "12px" } }, swatch)
      ));

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "panel-head" }, el("span", { class: "panel-title", text: "Formats" })),
        outBox
      ));

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "panel-head" },
          el("span", { class: "panel-title", text: "Shades" }),
          el("span", { class: "panel-note", text: "click to copy" })
        ),
        shadesBox
      ));

      root.appendChild(el("div", { class: "panel" },
        el("div", { class: "panel-head" },
          el("span", { class: "panel-title", text: "Contrast (WCAG)" }),
          el("span", { class: "panel-note", text: "AA ≥ 4.5 · AAA ≥ 7" })
        ),
        contrastBox
      ));

      input.addEventListener("input", updateLive);
      picker.addEventListener("input", () => update(true));
      update(false);
    }
  });
})();
