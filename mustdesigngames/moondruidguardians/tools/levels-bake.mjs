// levels-bake.mjs — bundle several map-editor levels into ONE build with an in-game picker.
//
//   node tools/bake.mjs --out dist/pack.html                                 # sprites once
//   node tools/levels-bake.mjs --maps a.json,b.json,c.json --game dist/pack.html --out dist/pack.html
//
// Each map becomes a LEVELS[] entry {name, terrain, home, knoll, nodes, blocked}; the game
// shows a "Choose your moor" screen and plays the picked one (#lvl=N). Deploys via Cloudflare
// direct upload like any real-art build (embeds licensed art — never git).

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join, basename } from 'path';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const MAPS = (arg('--maps') || '').split(',').map(s => s.trim()).filter(Boolean);
const GAME = arg('--game', 'dist/index.html');
const OUT  = arg('--out', 'dist/index.html');
const PACKS = arg('--packs', '../../modulardigitalgoods/packs');
const DAYLIGHT = process.argv.includes('--daylight');
if (!MAPS.length) { console.error('need --maps a.json,b.json,…'); process.exit(1); }

const SHEET_FILES = ['MainLev.png','Dec_props1.png','Dec_props2.png','anim/tree1A.png','anim/tree1B.png','anim/tree2A.png','anim/tree2B.png','anim/water_effA.png','anim/water_effB.png'];
const dataURI = p => `data:image/png;base64,${readFileSync(p).toString('base64')}`;
const srcs = SHEET_FILES.map(f => { try { return dataURI(join(PACKS, 'szadi-wetland', '_PNG', f)); } catch { return null; } });
const title = s => s.replace(/[-_]+/g, ' ').replace(/\.[^.]+$/, '').replace(/\b\w/g, m => m.toUpperCase());
const TS = 32, WD = 1600, HT = 1000, NM = { well: 'Lightwell', copse: 'Elderwood copse' };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.evaluate(async (srcs) => {
  window.__imgs = await Promise.all(srcs.map(u => u ? new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = u; }) : Promise.resolve(null)));
}, srcs);

const LEVELS = [];
for (const mp of MAPS) {
  const map = JSON.parse(readFileSync(mp, 'utf8'));
  const px = (c, r) => ({ x: Math.round((c + 0.5) / map.w * WD), y: Math.round((r + 0.5) / map.h * HT) });
  const marks = map.markers || [];
  const homeM = marks.find(m => m.type === 'home'), knollM = marks.find(m => m.type === 'knoll');
  const home = homeM ? px(homeM.c, homeM.r) : null;
  const nodes = marks.filter(m => m.type === 'well' || m.type === 'copse').map(m => {
    const p = px(m.c, m.r), far = home ? Math.hypot(p.x - home.x, p.y - home.y) > 620 : false;
    return { kind: m.type, nm: NM[m.type], x: p.x, y: p.y, ...(far ? { far: true } : {}) };
  });
  const terrain = await page.evaluate(({ map, TS, daylight }) => {
    const imgs = window.__imgs, c = document.createElement('canvas'); c.width = map.w * TS; c.height = map.h * TS;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#16232a'; g.fillRect(0, 0, c.width, c.height);
    for (const layer of map.layers) { if (layer.vis === false) continue;
      for (let i = 0; i < layer.cells.length; i++) { const t = layer.cells[i]; if (!t || !imgs[t.s]) continue;
        g.drawImage(imgs[t.s], t.tx * TS, t.ty * TS, TS, TS, (i % map.w) * TS, ((i / map.w) | 0) * TS, TS, TS); } }
    if (!daylight) { g.globalCompositeOperation = 'multiply'; g.fillStyle = '#516a72'; g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(18,30,44,0.20)'; g.fillRect(0, 0, c.width, c.height); }
    return c.toDataURL('image/webp', 0.85);
  }, { map, TS, daylight: DAYLIGHT });
  const L = { name: map.name || title(basename(mp)), terrain };
  if (home) L.home = home;
  if (knollM) { const p = px(knollM.c, knollM.r); L.knoll = { x: p.x, y: p.y, r: 170 }; }
  if (nodes.length) L.nodes = nodes;
  if (map.blocked && map.blocked.length === map.w * map.h && map.blocked.some(Boolean)) L.blocked = { w: map.w, h: map.h, cells: map.blocked };
  LEVELS.push(L);
  console.log(`  + ${L.name}  (home:${!!L.home} nodes:${nodes.length} blocked:${!!L.blocked})`);
}
await browser.close();

let html = readFileSync(GAME, 'utf8');
if (!/const LEVELS=null;/.test(html)) throw new Error(`injection point "const LEVELS=null;" not found in ${GAME}`);
html = html.replace(/const LEVELS=null;/, 'const LEVELS=' + JSON.stringify(LEVELS) + ';');
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
console.log(`level pack baked → ${OUT}  (${LEVELS.length} levels)`);
