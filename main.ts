// news-image-20261122 — draws one infographic of the world's news of
// Sunday 22 November 2026 and writes it to /output/entry.png
// (locally: $MAKEFUN_OUTPUT_DIR or ./out).
// Node standard library only. No network. Deterministic output.
// Bitmap 5x7 font + hand-rolled PNG encoder, both written for this entry.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- colours
const PAPER = [0xf8, 0xf4, 0xea];
const NAVY = [0x10, 0x26, 0x3f];
const GOLD = [0xc9, 0xa2, 0x27];
const INK = [0x14, 0x26, 0x3f];
const WHITE = [0xff, 0xff, 0xff];
const SUBLINE = [0xd8, 0xde, 0xe8];
const CARD = [0xff, 0xff, 0xff];
const SUMMARY = [0x3a, 0x4a, 0x5e];
const FOOTER = [0x4a, 0x55, 0x68];

// ---------------------------------------------------------------- font
// 5x7 bitmap glyphs, written here for this entry. Each glyph is 7 rows of
// 5 bits ("1" = ink). Characters covered: A-Z a-z 0-9 and
// . , ; : ! ? ' " - – — / ( ) & % $ # @ + * = and · (middle dot).
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10001", "10000", "10001", "01110"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01111", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "10010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "11110", "10001", "10001", "11110", "10000"],
  q: ["00000", "00000", "01111", "10001", "10001", "01111", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11100", "01000", "01000", "01000", "00110"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ";": ["00000", "01100", "00000", "01100", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "01010", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "–": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "·": ["00000", "00000", "00000", "01100", "01100", "00000", "00000"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

// ---------------------------------------------------------------- canvas
const px = new Uint8Array(W * H * 3);

function fillRect(x: number, y: number, w: number, h: number, c: number[]): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
    }
  }
}

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

function drawText(text: string, x: number, y: number, scale: number, c: number[]): void {
  let cx = x;
  for (const ch of text) {
    const glyph = FONT[ch] ?? FONT["?"];
    for (let r = 0; r < 7; r++) {
      const row = glyph[r];
      for (let col = 0; col < 5; col++) {
        if (row[col] === "1") {
          fillRect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(text: string, y: number, scale: number, c: number[]): void {
  drawText(text, Math.round((W - textWidth(text, scale)) / 2), y, scale, c);
}

// Greedy word wrap to at most `maxLines` lines of at most `maxChars` chars.
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur === "" ? w : cur + " " + w;
    if (next.length <= maxChars) {
      cur = next;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines.slice(0, maxLines);
}

// ---------------------------------------------------------------- stories
// Sunday 22 November 2026 — exact wording from the brief.
type Story = { cat: string; color: number[]; headline: string; summary: string };
const STORIES: Story[] = [
  { cat: "GULF", color: [0xb3, 0x12, 0x2e], headline: "Iran hits US base in Kuwait", summary: "Strikes hit a US base and Bahrain as Gulf tensions flare." },
  { cat: "PERU", color: [0x7a, 0x4a, 0x21], headline: "6.9 quake shakes Peru Andes", summary: "Magnitude 6.9 tremor rattles the Andes; no casualties reported." },
  { cat: "BALTIC", color: [0x3d, 0x6b, 0x8e], headline: "Drones hit Russian cargo ship", summary: "Blast hits a Russian ship; Finland tightens Baltic security." },
  { cat: "NATO", color: [0x27, 0x4b, 0x7a], headline: "Rutte vows to defend Poland", summary: "NATO chief in Warsaw after missiles land; Council meets Monday." },
  { cat: "JUSTICE", color: [0x6b, 0x3f, 0xa0], headline: "UN action sought on Myanmar", summary: "Paris wants Security Council action after ICJ ruling rejected." },
  { cat: "CLIMATE", color: [0x0e, 0x7a, 0x6b], headline: "COP31 deadlocked on fuel deal", summary: "No fossil-fuel deal as climate talks stall into overtime." },
  { cat: "MEXICO", color: [0xd9, 0x6c, 0x1e], headline: "Cartel chief seized in Sinaloa", summary: "'El Chapo Isidro' arrested; 11 killed in cartel violence." },
];

// ---------------------------------------------------------------- PNG encoder
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  // Raw scanlines: filter byte 0 + RGB rows. No timestamps anywhere.
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- render
function renderEntry(): void {
  fillRect(0, 0, W, H, PAPER);

  // Header band + gold rule.
  fillRect(0, 0, W, 150, NAVY);
  fillRect(0, 150, W, 6, GOLD);
  drawTextCentered("THE WORLD IN ONE IMAGE", 18, 2, GOLD);
  drawTextCentered("SUNDAY, 22 NOVEMBER 2026", 44, 6, WHITE);
  drawTextCentered("Seven stories that defined the day", 98, 2, SUBLINE);

  // Story cards.
  const cardX = 16;
  const cardW = 992;
  const cardH = 110;
  const gap = 6;
  let y = 168;
  for (const s of STORIES) {
    fillRect(cardX, y, cardW, cardH, CARD);
    fillRect(cardX, y, 10, cardH, s.color);
    // Category chip.
    const chipW = textWidth(s.cat, 2) + 16;
    fillRect(40, y + 5, chipW, 18, s.color);
    drawText(s.cat, 48, y + 7, 2, WHITE);
    // Headline, one line, scale 5.
    drawText(s.headline, 40, y + 25, 5, INK);
    // Summary, up to two lines, scale 3 (52 chars/line at 952 px inner width).
    const lines = wrap(s.summary, 52, 2);
    drawText(lines[0] ?? "", 40, y + 66, 3, SUMMARY);
    if (lines[1]) drawText(lines[1], 40, y + 88, 3, SUMMARY);
    y += cardH + gap;
  }

  // Footer.
  drawTextCentered("Sources: Reuters · AP · BBC — 22 Nov 2026", 982, 2, FOOTER);
  drawTextCentered("make.fun · news-image-20261122", 1002, 2, FOOTER);
}

function renderFontTest(): void {
  fillRect(0, 0, W, H, PAPER);
  fillRect(0, 0, W, 60, NAVY);
  drawTextCentered("FONT TEST — 5x7 BITMAP", 20, 3, WHITE);
  const rows: string[] = [
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "abcdefghijklmnopqrstuvwxyz",
    "0123456789",
    ".,;:!?'\"-",
    "–—/()&%$#@+*=",
    "· AaBbCc 123 ·",
    "SUNDAY, 22 NOVEMBER 2026",
  ];
  let yy = 100;
  for (const r of rows) {
    drawText(r, 40, yy, 4, INK);
    yy += 7 * 4 + 24;
  }
  drawText("The quick brown fox jumps over the lazy dog.", 40, yy, 3, SUMMARY);
  yy += 7 * 3 + 16;
  drawText("Pack my box with five dozen liquor jugs! 0123456789", 40, yy, 3, SUMMARY);
}

// ---------------------------------------------------------------- main
function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(outDir, { recursive: true });
  if (process.env.FONT_TEST === "1") {
    renderFontTest();
    writeFileSync(join(outDir, "font-test.png"), encodePNG());
    console.log("wrote font-test.png");
  } else {
    renderEntry();
    writeFileSync(join(outDir, "entry.png"), encodePNG());
    console.log("wrote entry.png");
  }
}

main();
