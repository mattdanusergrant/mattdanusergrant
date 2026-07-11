// verify.mjs — headless invariant suite for Moon Druid Guardians. Boots the game in
// Chromium (Playwright) and asserts core behaviour, so a baked build can be checked
// against the same invariants as the source. The art layer is optional: run against
// index.html (procedural, ART_* null) or dist/index.html (baked, ART_* filled).
//
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/verify.mjs [--game dist/index.html]
//
// Exits non-zero if any check fails.

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { resolve } from 'path';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const GAME = resolve(arg('--game', 'index.html'));
const URL = 'file://' + GAME;

const checks = [];
const ok = (name, cond) => checks.push({ name, pass: !!cond });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(700);

ok('boots without JS errors', errs.length === 0);
ok('MDG test surface present', await page.evaluate(() => !!(window.MDG && window.MDG.R && window.MDG.step && window.MDG.forceNight)));

const rosters = await page.evaluate(() => { const D = window.MDG.DATA; return { b: Object.keys(D.BUILDS).length, u: Object.keys(D.UNITS).length, f: Object.keys(D.FOES).length }; });
ok('building roster intact (9)', rosters.b === 9);
ok('unit roster intact (6)', rosters.u === 6);
ok('foe roster intact (6)', rosters.f === 6);

try { await page.click('#begin', { timeout: 1500 }); } catch {}
const boot = await page.evaluate(() => { const r = window.MDG.R(); return { light: r.light, elderHp: r.buildings.find(b => b.id === 'elder')?.hp, night: r.night }; });
ok('run boots with starting light', boot.light > 0);
ok('Elderbough present at full health', boot.elderHp > 0);

// play a night: foes must spawn and the sim must advance without crashing
await page.evaluate(() => { window.MDG.give(99999, 99999); window.MDG.autoplay(); window.MDG.forceNight(4); window.MDG.step(8); });
const mid = await page.evaluate(() => { const r = window.MDG.R(); return { foes: r.foes.length, night: r.night, elderHp: r.buildings.find(b => b.id === 'elder')?.hp }; });
ok('forceNight advanced to night 4', mid.night === 4);
ok('foes spawned during the night', mid.foes > 0);
ok('Elderbough survives an early night', mid.elderHp > 0);
ok('no JS errors after a played night', errs.length === 0);

// art layer: assert it matches the build (baked → sprites active; source → procedural fallback)
const art = await page.evaluate(() => {
  const keys = ['u_thorn', 'f_maw', 'f_shamble'];
  const drawn = keys.map(k => window.sprite(k, 40, 40, 40));
  return { any: drawn.some(Boolean), all: drawn.every(Boolean) };
});
const baked = /dist/.test(GAME);
ok(baked ? 'baked build: sprite() renders real art' : 'source build: sprite() falls back (procedural)', baked ? art.all : !art.any);

await browser.close();

const passed = checks.filter(c => c.pass).length;
for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}`);
console.log(`\n${passed}/${checks.length} checks passed${errs.length ? `  | errors: ${errs.slice(0, 5).join(' || ')}` : ''}`);
process.exit(passed === checks.length ? 0 : 1);
