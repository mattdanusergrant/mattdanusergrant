#!/usr/bin/env node
/* Tile screenshot generator — the "screenshot tech" behind the homepage cards.
 *
 * Loads each target page in headless Chromium and saves a 16:10 JPG to shots/<slug>.jpg,
 * which index.html renders as the <img class="tile-shot"> on top of that tile.
 *
 * Setup (once):   npm i -g playwright-core   (or `npm i playwright-core` in this dir)
 * Browser:        uses an installed Chromium — set CHROME_BIN, or it tries common paths.
 * Local targets:  start a static server first →  python3 -m http.server 8099
 * Run:            node tools/capture-shots.mjs           # all targets
 *                 node tools/capture-shots.mjs projects  # one group
 *
 * NOTE: external targets (the Projects group) need real outbound network — they work
 * from a local machine but NOT from a Claude Code web sandbox, where headless Chromium
 * cannot egress. Capture those three locally, or drop hand-made 16:10 shots into shots/.
 */
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'shots');
const W = 1000, H = 625, BASE = 'http://127.0.0.1:8099';

const GROUPS = {
  games: [ // reused from mustdesigngames/thumbs — usually already present, listed for completeness
    { slug: 'metropolis-dawn-grid',  url: `${BASE}/mustdesigngames/metropolisdawngrid/` },
    { slug: 'moon-druid-guardians',  url: `${BASE}/mustdesigngames/moondruidguardians/` },
    { slug: 'match-deck-gateway',    url: `${BASE}/mustdesigngames/matchdeckgateway/` },
  ],
  tools: [
    { slug: 'math-draws-graphics',        url: `${BASE}/mathdrawsgraphics/` },
    { slug: 'make-dope-grooves',          url: `${BASE}/tool.html?app=makedopegrooves` },
    { slug: 'markdown-document-generator',url: `${BASE}/resume-builder.html` },
  ],
  projects: [ // external — capture locally, see NOTE above
    { slug: 'invisible-ink',   url: 'https://itsinvisible.ink/' },
    { slug: 'keeping-cadence', url: 'https://mattdanusergrant.github.io/keeping-cadence/' },
    { slug: 'dank-omphalos',   url: 'https://dankomphalos.com/' },
  ],
};

function findChrome() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  const guesses = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  return guesses.find(existsSync); // undefined -> playwright uses its own download
}

const want = process.argv[2];
const targets = want ? (GROUPS[want] || []) : Object.values(GROUPS).flat();
if (!targets.length) { console.error(`Unknown group "${want}". Use: games | tools | projects`); process.exit(1); }

const { chromium } = await import('playwright-core');
const exe = findChrome();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1.5 });
const page = await ctx.newPage();

for (const t of targets) {
  try {
    await page.goto(t.url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2500); // let canvases / apps settle
    const buf = await page.screenshot({ type: 'jpeg', quality: 82 });
    await fs.writeFile(join(OUT, `${t.slug}.jpg`), buf);
    console.log(`OK   ${t.slug}  (${Math.round(buf.length / 1024)}KB)`);
  } catch (e) {
    console.log(`FAIL ${t.slug}  ${e.message.split('\n')[0]}`);
  }
}
await browser.close();
