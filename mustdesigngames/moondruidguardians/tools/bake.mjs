// bake.mjs — Modular Digital Goods → Moon Druid Guardians real-art build.
//
// Headless: reuses the project's Playwright/Chromium (no native image deps). Reads the
// licensed packs from the PRIVATE `modulardigitalgoods` repo, composites the Vigil Moor
// + a trimmed/tinted sprite atlas, and writes dist/index.html with the three ART_*
// constants filled in. The output is deployed via Cloudflare DIRECT UPLOAD — never
// committed to the public repo. Full spec: (vault) 07_projects/modulardigitalgoods/README.md
//
// Run (a cloud session or GitHub Actions with BOTH repos checked out side by side):
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/bake.mjs \
//     --packs ../../modulardigitalgoods/packs --game index.html --out dist/index.html
//
// Terrain: tile a real Wetland ground tile across the moor, grade it to the moonlit
// night palette, then redraw the seeded stream/path/knoll/tarn geometry on top (ported
// verbatim from index.html paintTerrain) so the art lines up with gameplay. Atlas: each
// cast sprite is alpha-trimmed from its 32rogues sheet (the sheets are NOT a clean grid —
// creatures vary in size), tinted, and packed; a labeled _debug-atlas.png is emitted so
// the picks can be eyeballed. Buildings + Glimmer + Elderbough stay procedural/emoji.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const PACKS = arg('--packs', '../modulardigitalgoods/packs');
const GAME  = arg('--game', 'index.html');
const OUT   = arg('--out', 'dist/index.html');

const dataURI = (p, mime = 'image/png') => `data:${mime};base64,${readFileSync(p).toString('base64')}`;

const SRC = {
  rogues:   join(PACKS, '32rogues', 'rogues.png'),
  monsters: join(PACKS, '32rogues', 'monsters.png'),
  animals:  join(PACKS, '32rogues', 'animals.png'),
  wetland:  join(PACKS, 'szadi-wetland', '_PNG', 'MainLev.png'),
};

// Tint recipes: [r, g, b, strength] applied over opaque pixels (source-atop).
const MOONLIT = [150, 180, 255, 0.30]; // cool silver-blue — the druid defenders
const GLOAM   = [74, 50, 116, 0.60];   // dark violet — the Gloam reads as shadow

// Cast → atlas. Each row: key, sheet, [bx,by,bw,bh] approx source box (alpha-trimmed to a
// tight rect inside it), tint. Boxes measured from a 32px grid overlay of each sheet.
// 32rogues rows/cols confirmed: rogues is a clean 32px grid; monsters/animals are not.
const CAST = [
  // UNITS — druid defenders, moonlit
  ['u_thorn', 'rogues',   [64, 128, 32, 32], MOONLIT], // druid (r5c)
  ['u_bow',   'rogues',   [64,   0, 32, 32], MOONLIT], // ranger (r1c)
  ['u_star',  'rogues',   [ 0, 128, 32, 32], MOONLIT], // female wizard (r5a)
  ['u_mend',  'rogues',   [32,  64, 32, 32], MOONLIT], // priest (r3b)
  ['u_bear',  'animals',  [ 0,   0, 58, 58], MOONLIT], // grizzly bear (r1a) — companion
  // FOES — the Gloam, dark violet
  ['f_shamble','monsters',[126,126, 38, 40], GLOAM],   // zombie (r5e)
  ['f_prowler','animals', [190,126, 56, 42], GLOAM],   // grey wolf (r6g)
  ['f_hulk',   'monsters',[ 62,220, 62, 68], GLOAM],   // rock golem (r8c)
  ['f_moth',   'monsters',[222,194, 42, 30], GLOAM],   // giant bat (r7g) — the flyer
  ['f_spore',  'monsters',[ 30,316, 64, 46], GLOAM],   // large myconid (r11b) — mushroom
  ['f_maw',    'monsters',[ 61,189, 66, 42], GLOAM],   // giant earthworm (r7c) — the boss maw
];

// Wetland ground tiles (top-left px on MainLev, 32×32) tiled under the moor. Mostly grass,
// occasional heath-moss for variation — then graded to the moonlit night palette.
const GROUND = [[352, 748], [416, 748], [352, 780], [96, 780]];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const srcs = {};
  for (const k of Object.keys(SRC)) { try { srcs[k] = dataURI(SRC[k]); } catch { /* pack not present */ } }
  await page.evaluate(async (s) => {
    window.__img = {};
    for (const [k, uri] of Object.entries(s)) { const im = new Image(); im.src = uri; await im.decode(); window.__img[k] = im; }
  }, srcs);

  // 1) TERRAIN — tile a real Wetland ground, grade to moonlit night, redraw moor geometry.
  const terrain = await page.evaluate(({ GROUND }) => {
    if (!window.__img.wetland) return null;
    const WD = 1600, HT = 1000, TAU = Math.PI * 2, sheet = window.__img.wetland;
    // gameplay geometry — copied from index.html so terrain lines up with the board.
    const EX = 430, EY = 650, KNOLL = { x: 1240, y: 330, r: 170 };
    const NODES = [
      { kind: 'well', x: 180, y: 330 }, { kind: 'copse', x: 140, y: 840 },
      { kind: 'well', x: 1400, y: 240 }, { kind: 'copse', x: 1120, y: 180 },
    ];
    const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const PATH_PTS = (() => { const p = []; for (let i = 0; i <= 24; i++) { const u = i / 24; p.push({ x: (1 - u) * (1 - u) * 430 + 2 * (1 - u) * u * 820 + u * u * 1240, y: (1 - u) * (1 - u) * 650 + 2 * (1 - u) * u * 520 + u * u * 330 }); } return p; })();
    const STREAM_PTS = (() => { const p = []; const cub = (a, b, c2, d, u) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c2 + u * u * u * d; }; for (let i = 0; i <= 20; i++) { const u = i / 20; p.push({ x: cub(795, 700, 950, 880, u), y: cub(-30, 180, 320, 520, u) }); } for (let i = 1; i <= 20; i++) { const u = i / 20; p.push({ x: cub(880, 820, 1000, 950, u), y: cub(520, 700, 820, 1030, u) }); } return p; })();

    const c = document.createElement('canvas'); c.width = WD; c.height = HT;
    const g = c.getContext('2d');
    const r = mulberry(20260709);

    // tile the real Wetland ground (native 32px, crisp)
    g.imageSmoothingEnabled = false;
    const TS = 32;
    for (let y = 0; y < HT; y += TS) for (let x = 0; x < WD; x += TS) {
      const t = GROUND[(r() * (r() < 0.82 ? 3 : GROUND.length)) | 0];
      g.drawImage(sheet, t[0], t[1], TS, TS, x, y, TS, TS);
    }
    // grade to the moonlit moor: multiply darkens+cools the bright daytime grass, then a
    // thin cool wash for depth. Kept light enough that the real Wetland tile texture reads.
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = '#516a72'; g.fillRect(0, 0, WD, HT);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(18,30,40,0.18)'; g.fillRect(0, 0, WD, HT);

    // ── moor geometry, redrawn on top (ported from paintTerrain) ──
    g.imageSmoothingEnabled = true;
    const TONES = ['rgba(50,88,72,', 'rgba(38,74,80,', 'rgba(54,94,62,', 'rgba(34,62,66,', 'rgba(76,62,110,'];
    for (let i = 0; i < 120; i++) {
      const x = r() * WD, y = r() * HT, rad = 36 + r() * 110, tone = TONES[(r() * (r() < 0.9 ? 4 : 5)) | 0];
      const bg = g.createRadialGradient(x, y, 2, x, y, rad);
      bg.addColorStop(0, tone + (0.05 + r() * 0.07).toFixed(3) + ')'); bg.addColorStop(1, tone + '0)');
      g.fillStyle = bg; g.beginPath(); g.ellipse(x, y, rad, rad * (0.6 + r() * 0.4), r() * 3, 0, TAU); g.fill();
    }
    for (let i = 0; i < 5; i++) {
      const x = r() * WD, y = r() * HT, rad = 180 + r() * 160;
      const mb = g.createRadialGradient(x, y, 10, x, y, rad);
      mb.addColorStop(0, 'rgba(220,235,255,0.05)'); mb.addColorStop(1, 'rgba(220,235,255,0)');
      g.fillStyle = mb; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    }
    g.lineCap = 'round';
    const strokeStream = (w, st) => { g.strokeStyle = st; g.lineWidth = w; g.beginPath(); g.moveTo(795, -30); g.bezierCurveTo(700, 180, 950, 320, 880, 520); g.bezierCurveTo(820, 700, 1000, 820, 950, 1030); g.stroke(); };
    strokeStream(38, 'rgba(8,16,30,0.5)'); strokeStream(26, 'rgba(22,42,68,0.92)'); strokeStream(14, 'rgba(36,62,96,0.92)');
    g.setLineDash([3, 34]); strokeStream(2, 'rgba(170,200,250,0.34)'); g.setLineDash([]);
    const strokePath = (w, st) => { g.strokeStyle = st; g.lineWidth = w; g.beginPath(); g.moveTo(430, 650); g.quadraticCurveTo(820, 520, 1240, 330); g.stroke(); };
    strokePath(26, 'rgba(52,45,34,0.5)'); g.setLineDash([16, 10]); strokePath(12, 'rgba(120,104,74,0.42)'); g.setLineDash([]);
    let fi = 0, fd = 1e9;
    PATH_PTS.forEach((pp, i) => { for (const sp of STREAM_PTS) { const dd = (pp.x - sp.x) ** 2 + (pp.y - sp.y) ** 2; if (dd < fd) { fd = dd; fi = i; } } });
    const fp = PATH_PTS[fi], fq = PATH_PTS[Math.min(fi + 1, PATH_PTS.length - 1)], fa = Math.atan2(fq.y - fp.y, fq.x - fp.x);
    for (let i = -1; i <= 2; i++) {
      const fx = fp.x + Math.cos(fa) * i * 15, fy = fp.y + Math.sin(fa) * i * 15;
      g.fillStyle = '#4b5666'; g.beginPath(); g.ellipse(fx, fy, 7, 5, fa, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath(); g.ellipse(fx - 2, fy - 2, 3, 2, fa, 0, TAU); g.fill();
    }
    const disc = (x, y, rad, c0, c1) => { const d2 = g.createRadialGradient(x, y, 6, x, y, rad); d2.addColorStop(0, c0); d2.addColorStop(1, c1); g.fillStyle = d2; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); };
    disc(EX, EY, 150, 'rgba(74,116,84,0.30)', 'rgba(74,116,84,0)');
    disc(KNOLL.x, KNOLL.y, KNOLL.r + 20, 'rgba(118,126,96,0.20)', 'rgba(118,126,96,0)');
    for (const nd of NODES) if (nd.kind === 'well') {
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(nd.x + 4, nd.y + 8, 58, 42, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(24,44,72,0.92)'; g.beginPath(); g.ellipse(nd.x, nd.y + 4, 52, 38, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(150,180,230,0.28)'; g.lineWidth = 2; g.beginPath(); g.ellipse(nd.x, nd.y + 4, 52, 38, 0, 0, TAU); g.stroke();
    }
    for (let i = 0; i < 26; i++) {
      const x = r() * WD, y = r() * HT, s = 4 + r() * 9, a = r() * 3;
      g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.ellipse(x + 2, y + 3, s * 1.1, s * 0.7, a, 0, TAU); g.fill();
      g.fillStyle = '#3a4450'; g.beginPath(); g.ellipse(x, y, s, s * 0.72, a, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.ellipse(x - s * 0.25, y - s * 0.3, s * 0.5, s * 0.3, a, 0, TAU); g.fill();
    }
    g.lineWidth = 1.3;
    for (let i = 0; i < 110; i++) {
      const x = r() * WD, y = r() * HT;
      g.strokeStyle = r() < 0.7 ? 'rgba(105,140,105,0.3)' : 'rgba(130,160,180,0.22)';
      for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + k * 2.5 + (r() * 2 - 1), y - 4 - r() * 4); g.stroke(); }
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let trees = 0, guard = 600;
    while (trees < 22 && guard-- > 0) {
      const x = 40 + r() * (WD - 80), y = 40 + r() * (HT - 80);
      if (Math.hypot(x - EX, y - EY) < 420) continue;
      if (Math.hypot(x - KNOLL.x, y - KNOLL.y) < KNOLL.r + 120) continue;
      if (NODES.some(nd => Math.hypot(x - nd.x, y - nd.y) < 90)) continue;
      if (STREAM_PTS.some(p => Math.hypot(x - p.x, y - p.y) < 58)) continue;
      if (PATH_PTS.some(p => Math.hypot(x - p.x, y - p.y) < 60)) continue;
      g.globalAlpha = 0.9; g.font = (20 + r() * 14) + 'px serif'; g.fillText('🌲', x, y); g.globalAlpha = 1; trees++;
    }
    return c.toDataURL('image/webp', 0.85);
  }, { GROUND });

  // 2) ATLAS — masked connected-component trim + tint each cast sprite into one packed
  // sheet; build ART_MAP. The 32rogues sheets pack creatures tightly with no gutters, so a
  // plain bbox bleeds neighbour fragments in. Flood-fill the blob from the box centre and
  // copy ONLY those pixels — disconnected neighbours are dropped.
  const atlas = await page.evaluate((cast) => {
    const trim = (sheetName, bx, by, bw, bh) => {
      const im = window.__img[sheetName]; if (!im) return null;
      const t = document.createElement('canvas'); t.width = bw; t.height = bh;
      const tg = t.getContext('2d'); tg.imageSmoothingEnabled = false;
      tg.drawImage(im, bx, by, bw, bh, 0, 0, bw, bh);
      const src = tg.getImageData(0, 0, bw, bh), d = src.data;
      const A = (x, y) => d[(y * bw + x) * 4 + 3];
      // seed = opaque pixel nearest the box centre
      const cx = bw / 2, cy = bh / 2; let seed = -1, best = 1e9;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        if (A(x, y) > 24) { const dd = (x - cx) ** 2 + (y - cy) ** 2; if (dd < best) { best = dd; seed = y * bw + x; } }
      }
      if (seed < 0) return null;
      // 8-connected flood over opaque pixels
      const seen = new Uint8Array(bw * bh), st = [seed]; seen[seed] = 1;
      let x0 = bw, y0 = bh, x1 = -1, y1 = -1;
      while (st.length) {
        const p = st.pop(), x = p % bw, y = (p / bw) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue;
          const q = ny * bw + nx; if (!seen[q] && A(nx, ny) > 24) { seen[q] = 1; st.push(q); }
        }
      }
      const sw = x1 - x0 + 1, sh = y1 - y0 + 1;
      // copy only component pixels into a tight masked canvas
      const out = document.createElement('canvas'); out.width = sw; out.height = sh;
      const og = out.getContext('2d'), oimg = og.createImageData(sw, sh), od = oimg.data;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (!seen[y * bw + x]) continue;
        const si = (y * bw + x) * 4, di = ((y - y0) * sw + (x - x0)) * 4;
        od[di] = d[si]; od[di + 1] = d[si + 1]; od[di + 2] = d[si + 2]; od[di + 3] = d[si + 3];
      }
      og.putImageData(oimg, 0, 0);
      return { canvas: out, sw, sh };
    };
    const present = cast.filter(([, sheet]) => window.__img[sheet]);
    if (!present.length) return null;
    const CELL = 76, cols = 6, rows = Math.ceil(present.length / cols);
    const c = document.createElement('canvas'); c.width = cols * CELL; c.height = rows * CELL;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const map = {};
    present.forEach(([key, sheet, box, tint], i) => {
      const rc = trim(sheet, box[0], box[1], box[2], box[3]); if (!rc) return;
      const col = i % cols, row = (i / cols) | 0;
      const x = Math.round(col * CELL + (CELL - rc.sw) / 2), y = Math.round(row * CELL + (CELL - rc.sh) / 2);
      g.drawImage(rc.canvas, x, y);
      if (tint) {
        g.save(); g.beginPath(); g.rect(x, y, rc.sw, rc.sh); g.clip();
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${tint[3]})`;
        g.fillRect(x, y, rc.sw, rc.sh); g.restore();
      }
      map[key] = [x, y, rc.sw, rc.sh];
    });
    return { atlas: c.toDataURL('image/webp', 0.95), map };
  }, CAST);

  // 3) DEBUG — labeled contact sheet of the extracted+tinted sprites (for eyeballing picks).
  const debug = atlas ? await page.evaluate(({ atlasURL, map }) => new Promise((res) => {
    const im = new Image(); im.onload = () => {
      const Z = 3, pad = 4, keys = Object.keys(map);
      const cw = 88, ch = 104, cols = 6, rows = Math.ceil(keys.length / cols);
      const c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      g.fillStyle = '#12161b'; g.fillRect(0, 0, c.width, c.height);
      keys.forEach((k, i) => {
        const r = map[k], col = i % cols, row = (i / cols) | 0, ox = col * cw, oy = row * ch;
        const w = r[2] * Z, h = r[3] * Z, dx = ox + (cw - w) / 2, dy = oy + pad;
        g.drawImage(im, r[0], r[1], r[2], r[3], dx, dy, w, h);
        g.fillStyle = '#9fb'; g.font = '11px monospace'; g.textAlign = 'center';
        g.fillText(`${k} ${r[2]}x${r[3]}`, ox + cw / 2, oy + ch - 6);
      });
      res(c.toDataURL('image/png'));
    }; im.src = atlasURL;
  }), { atlasURL: atlas.atlas, map: atlas.map }) : null;

  await browser.close();

  // 4) INJECT — replace the three null constants in the game with the baked values.
  let html = readFileSync(GAME, 'utf8');
  const inject = (name, value) => {
    const re = new RegExp('const\\s+' + name + '\\s*=\\s*null;');
    if (!re.test(html)) throw new Error(`injection point ${name} not found in ${GAME}`);
    html = html.replace(re, `const ${name}=${value == null ? 'null' : JSON.stringify(value)};`);
  };
  inject('ART_TERRAIN', terrain);
  inject('ART_ATLAS', atlas ? atlas.atlas : null);
  inject('ART_MAP', atlas ? atlas.map : null);

  // Attribution — licenses appreciate (not require) credit. Only the baked build uses the
  // third-party art, so the credit lives here, not in the procedural public source.
  html = html.replace('</body>', '<!-- Real-art build. Terrain: Szadi art — RPG Worlds Wetland. Sprites: Seth Boyles — 32rogues. Licensed to Matt Danus (commercial + modify OK); NOT for redistribution. -->\n</body>');

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, html);
  if (debug) writeFileSync(join(dirname(OUT), '_debug-atlas.png'), Buffer.from(debug.split(',')[1], 'base64'));
  console.log(`baked → ${OUT}  (terrain:${!!terrain} atlas:${!!atlas} keys:${atlas ? Object.keys(atlas.map).length : 0})`);
}
main().catch((e) => { console.error(e); process.exit(1); });
