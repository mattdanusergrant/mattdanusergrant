// level-bake.mjs — turn a map-editor level (JSON) into a real Moon Druid Guardians build.
//
// Renders the map's tiles into the terrain image (ART_TERRAIN) and converts its markers
// (Home / Lightwell / Copse / Knoll) into the game's gameplay geometry (LEVEL). Run it
// AFTER tools/bake.mjs — bake.mjs fills the sprite atlas (units + foes), then this overrides
// the terrain and injects the level geometry:
//
//   node tools/bake.mjs --out dist/level.html                       # sprites + default moor
//   node tools/level-bake.mjs --map <map.json> --game dist/level.html --out dist/level.html
//
// The map JSON comes from the private modulardigitalgoods map editor; sheet indices match
// that editor's sheet order. Output deploys via Cloudflare direct upload like any real-art
// build — never committed (embeds licensed art).

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { chromium } from './_pw.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const MAP  = arg('--map');
const GAME = arg('--game', 'dist/index.html');
const OUT  = arg('--out', 'dist/index.html');
const PACKS = arg('--packs', '../../modulardigitalgoods/packs');
const DAYLIGHT = process.argv.includes('--daylight'); // skip the moonlit grade, keep the map's raw colours
if (!MAP) { console.error('need --map <level.json>'); process.exit(1); }

// Sheet order MUST match modulardigitalgoods/tools/map-editor/build-editor.mjs.
const SHEET_FILES = ['MainLev.png','Dec_props1.png','Dec_props2.png','anim/tree1A.png','anim/tree1B.png','anim/tree2A.png','anim/tree2B.png','anim/water_effA.png','anim/water_effB.png'];
const dataURI = p => `data:image/png;base64,${readFileSync(p).toString('base64')}`;

const map = JSON.parse(readFileSync(MAP, 'utf8'));
const TS = 32, WD = 1600, HT = 1000;

// markers → LEVEL geometry (tile coords → world px)
const px = (c, r) => ({ x: Math.round((c + 0.5) / map.w * WD), y: Math.round((r + 0.5) / map.h * HT) });
const NM = { well: 'Lightwell', copse: 'Elderwood copse' };
const marks = map.markers || [];
const homeM = marks.find(m => m.type === 'home');
const knollM = marks.find(m => m.type === 'knoll');
const home = homeM ? px(homeM.c, homeM.r) : null;
const nodes = marks.filter(m => m.type === 'well' || m.type === 'copse').map(m => {
  const p = px(m.c, m.r);
  const far = home ? Math.hypot(p.x - home.x, p.y - home.y) > 620 : false;
  return { kind: m.type, nm: NM[m.type], x: p.x, y: p.y, ...(far ? { far: true } : {}) };
});
const LEVEL = {};
if (home) LEVEL.home = home;
if (knollM) { const p = px(knollM.c, knollM.r); LEVEL.knoll = { x: p.x, y: p.y, r: 170 }; }
if (nodes.length) LEVEL.nodes = nodes;
if (map.blocked && map.blocked.length === map.w * map.h && map.blocked.some(Boolean))
  LEVEL.blocked = { w: map.w, h: map.h, cells: map.blocked }; // impassable grid → foe flow-field + build blocking

// render the map's tiles into a terrain image
const srcs = SHEET_FILES.map(f => { try { return dataURI(join(PACKS, 'szadi-wetland', '_PNG', f)); } catch { return null; } });
const browser = await chromium.launch();
const page = await browser.newPage();
const terrain = await page.evaluate(async ({ srcs, map, TS, daylight }) => {
  const imgs = await Promise.all(srcs.map(u => u ? new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = u; }) : Promise.resolve(null)));
  const c = document.createElement('canvas'); c.width = map.w * TS; c.height = map.h * TS;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#16232a'; g.fillRect(0, 0, c.width, c.height); // moor base under any gaps
  for (const layer of map.layers) { if (layer.vis === false) continue;
    for (let i = 0; i < layer.cells.length; i++) { const t = layer.cells[i]; if (!t || !imgs[t.s]) continue;
      const col = i % map.w, row = (i / map.w) | 0;
      g.drawImage(imgs[t.s], t.tx * TS, t.ty * TS, TS, TS, col * TS, row * TS, TS, TS); } }
  if (!daylight) { // grade to the moonlit night so custom levels match the game's mood
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#516a72'; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(18,30,44,0.20)'; g.fillRect(0, 0, c.width, c.height); }
  return c.toDataURL('image/webp', 0.85);
}, { srcs, map, TS, daylight: DAYLIGHT });
await browser.close();

// inject ART_TERRAIN (replace whatever bake.mjs set) + LEVEL (replace null)
let html = readFileSync(GAME, 'utf8');
const rep = (re, val, label) => { if (!re.test(html)) throw new Error(`injection point ${label} not found in ${GAME}`); html = html.replace(re, val); };
rep(/const ART_TERRAIN=(?:null|"[^"]*");/, 'const ART_TERRAIN=' + JSON.stringify(terrain) + ';', 'ART_TERRAIN');
rep(/const LEVEL=null;/, 'const LEVEL=' + JSON.stringify(LEVEL) + ';', 'LEVEL');

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
console.log(`level baked → ${OUT}`);
console.log(`  terrain: ${map.w}×${map.h} tiles  | home:${!!LEVEL.home} knoll:${!!LEVEL.knoll} nodes:${nodes.length}`);
