#!/usr/bin/env node
/* Generates the DevForge PNG icons (192px, 512px) with zero dependencies:
 * a hand-rolled PNG encoder + signed-distance-field rasterizer drawing the ">_" logo.
 * Run: node scripts/gen-icons.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

/* ---------- PNG encoding ---------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

/* ---------- geometry (on a 64x64 grid, like favicon.svg) ---------- */

// Distance from point to segment.
function distSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const gx = x1 + t * dx - px, gy = y1 + t * dy - py;
  return Math.sqrt(gx * gx + gy * gy);
}

// Signed distance to a rounded rectangle (negative inside).
function distRoundRect(px, py, w, h, r) {
  const cx = Math.abs(px - w / 2), cy = Math.abs(py - h / 2);
  const qx = Math.max(cx - (w / 2 - r), 0), qy = Math.max(cy - (h / 2 - r), 0);
  return Math.sqrt(qx * qx + qy * qy) + Math.min(Math.max(cx - (w / 2 - r), cy - (h / 2 - r)), 0) - r;
}

// Signed distance to a stroked polyline (round caps), i.e. the ">" chevron.
function distChevron(px, py) {
  return Math.min(
    distSegment(px, py, 18, 19, 36, 32),
    distSegment(px, py, 36, 32, 18, 45)
  );
}

function distUnder(px, py) {
  return distSegment(px, py, 28, 50, 46, 50);
}

/* ---------- rasterize ---------- */

function render(size) {
  const s = size / 64; // scale from the 64-unit grid
  const BG = [245, 158, 11];   // #f59e0b
  const FG = [28, 25, 23];     // #1c1917
  const rgba = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) / s, py = (y + 0.5) / s;

      // Anti-aliased alpha for the rounded-square background.
      const aBg = Math.max(0, Math.min(1, 0.5 - distRoundRect(px, py, 64, 64, 14)));

      // Glyph = union of chevron + underscore strokes (halfwidth 3.5 units).
      const dGlyph = Math.min(distChevron(px, py), distUnder(px, py));
      const aGlyph = Math.max(0, Math.min(1, 0.5 + (3.5 - dGlyph)));

      let r = BG[0], g = BG[1], b = BG[2];
      r = FG[0] * aGlyph + r * (1 - aGlyph);
      g = FG[1] * aGlyph + g * (1 - aGlyph);
      b = FG[2] * aGlyph + b * (1 - aGlyph);

      const o = (y * size + x) * 4;
      rgba[o] = Math.round(r);
      rgba[o + 1] = Math.round(g);
      rgba[o + 2] = Math.round(b);
      rgba[o + 3] = Math.round(aBg * 255);
    }
  }
  return encodePNG(size, size, rgba);
}

/* ---------- write ---------- */

const outDir = path.join(__dirname, "..", "assets", "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  const file = path.join(outDir, "icon-" + size + ".png");
  fs.writeFileSync(file, render(size));
  console.log("wrote " + file + " (" + fs.statSync(file).size + " bytes)");
}
