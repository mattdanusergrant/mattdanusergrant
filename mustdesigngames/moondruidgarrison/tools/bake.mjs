// bake.mjs — Modular Digital Goods → Moon Druid Garrison real-art build.
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
// STATUS: skeleton. The fs-read → inject → write path below is COMPLETE and correct.
// The two compositing functions (terrain, atlas) return null until finalized against the
// real PNGs — while they're null the baked game simply keeps its procedural moor / emoji
// cast, so this is safe to run early. Fill the TODOs once the packs are in `packs/`.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const PACKS = arg('--packs', '../modulardigitalgoods/packs');
const GAME  = arg('--game', 'index.html');
const OUT   = arg('--out', 'dist/index.html');

const dataURI = (p, mime = 'image/png') => `data:${mime};base64,${readFileSync(p).toString('base64')}`;

// TODO: exact filenames once the packs land.
const SRC = {
  wetland: join(PACKS, 'szadi-wetland', 'tileset.png'),
  rogues:  join(PACKS, '32rogues', 'rogues.png'),
};

// Tint recipes: [r, g, b, strength] applied over non-transparent pixels.
const MOONLIT = [150, 180, 255, 0.35]; // cool silver-blue — the druids
const GLOAM   = [90, 60, 150, 0.55];   // dark violet — the Gloam reads as shadow
// Cast → atlas. TODO: fill sx/sy (source cell) for each from the real 32×32 grid sheet.
// Buildings + Glimmer + Elderbough stay procedural/emoji in v1 (Wetland has no buildings;
// the Glimmer spark is better procedural) — see spec.
const CAST = [
  // key,        src,       sx, sy, w,  h,  tint
  ['u_thorn',   'rogues',   0,  0, 32, 32, MOONLIT], // TODO cell
  ['u_bow',     'rogues',   0,  0, 32, 32, MOONLIT], // TODO
  ['u_star',    'rogues',   0,  0, 32, 32, MOONLIT], // TODO
  ['u_mend',    'rogues',   0,  0, 32, 32, MOONLIT], // TODO
  ['u_bear',    'rogues',   0,  0, 32, 32, MOONLIT], // TODO
  ['f_shamble', 'rogues',   0,  0, 32, 32, GLOAM],   // TODO
  ['f_prowler', 'rogues',   0,  0, 32, 32, GLOAM],   // TODO (wolf, animal set)
  ['f_hulk',    'rogues',   0,  0, 32, 32, GLOAM],   // TODO (ogre/golem)
  ['f_moth',    'rogues',   0,  0, 32, 32, GLOAM],   // TODO (flyer)
  ['f_spore',   'rogues',   0,  0, 32, 32, GLOAM],   // TODO
  ['f_maw',     'rogues',   0,  0, 64, 64, GLOAM],   // TODO (boss — larger)
];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Load source sheets into the page as decoded <img>.
  const srcs = {};
  for (const k of Object.keys(SRC)) { try { srcs[k] = dataURI(SRC[k]); } catch { /* pack not present yet */ } }
  await page.evaluate(async (s) => {
    window.__img = {};
    for (const [k, uri] of Object.entries(s)) { const im = new Image(); im.src = uri; await im.decode(); window.__img[k] = im; }
  }, srcs);

  // 1) TERRAIN — composite the Vigil Moor from Wetland tiles.
  const terrain = await page.evaluate(() => {
    if (!window.__img.wetland) return null;
    const WD = 1600, HT = 1000;
    const c = document.createElement('canvas'); c.width = WD; c.height = HT;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    // TODO: paint the moor. Copy the seeded geometry from index.html (EX/EY, KNOLL,
    //   NODES, STREAM_PTS, PATH_PTS) so terrain lines up with gameplay:
    //   grass/heath fill → stream tiles along the curve → path tiles → tarns under
    //   Lightwells → fringe tree props (out of build zones). Then:
    //   return c.toDataURL('image/webp', 0.9);
    return null;
  });

  // 2) ATLAS — trim + tint each cast sprite into one packed sheet; build ART_MAP.
  const atlas = await page.evaluate((cast) => {
    if (!window.__img.rogues) return null;
    const CELL = 72, cols = 6, rows = Math.ceil(cast.length / cols);
    const c = document.createElement('canvas'); c.width = cols * CELL; c.height = rows * CELL;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const map = {};
    // TODO: for each [key, src, sx, sy, w, h, tint]:
    //   - draw the source cell to a tmp canvas, apply tint over opaque pixels,
    //   - blit into the sheet slot, record map[key] = [x, y, w, h].
    //   Then: return { atlas: c.toDataURL('image/webp', 0.95), map };
    return null;
  }, CAST);

  await browser.close();

  // 3) INJECT — replace the three null constants in the game with the baked values.
  let html = readFileSync(GAME, 'utf8');
  const inject = (name, value) => {
    const re = new RegExp('const\\s+' + name + '\\s*=\\s*null;');
    if (!re.test(html)) throw new Error(`injection point ${name} not found in ${GAME}`);
    html = html.replace(re, `const ${name}=${value == null ? 'null' : JSON.stringify(value)};`);
  };
  inject('ART_TERRAIN', terrain);
  inject('ART_ATLAS', atlas ? atlas.atlas : null);
  inject('ART_MAP', atlas ? atlas.map : null);

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, html);
  console.log(`baked → ${OUT}  (terrain:${!!terrain} atlas:${!!atlas})`);
}
main().catch((e) => { console.error(e); process.exit(1); });
