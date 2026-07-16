#!/usr/bin/env node
/* ============================================================================
 * Metropolis Dawn Grid — headless economy simulator
 * ----------------------------------------------------------------------------
 * Runs the REAL game logic (../index.html) in a headless browser as AI-run
 * cities, sweeps parameter combinations, and prints stats. No graphics, no UI.
 *
 * Because it drives the actual shipped index.html (via its ?e2e=1 debug hooks
 * and ?ai=1 city planner), the numbers CANNOT drift from the real game — there
 * is no reimplementation to keep in sync. Balance conclusions reflect reality.
 *
 * Usage:
 *   node sim/simulate.mjs                       # default sweep (tiers 0-5 × 3 regions)
 *   node sim/simulate.mjs --ticks 400
 *   node sim/simulate.mjs --tiers 3,4,5 --regions 2
 *   node sim/simulate.mjs --tune tradeRate=4,elecPrice=5
 *   node sim/simulate.mjs --elec 0.5                 # 50% of factories run Electronics
 *   node sim/simulate.mjs --partners ore,stone       # add rail trade partners
 *   node sim/simulate.mjs --json out/run.json        # write full results
 *   node sim/simulate.mjs --samples 8                # record a trajectory per city
 *
 * Requires Playwright + Chromium:  npm i -D playwright && npx playwright install chromium
 * ============================================================================ */

import http from 'http';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_DIR = path.resolve(__dirname, '..');           // the folder holding index.html

// ---- Playwright loader (installed locally, or the environment's global) ----
async function loadChromium() {
  const tries = ['playwright', '/opt/node22/lib/node_modules/playwright/index.js'];
  for (const p of tries) {
    try { const m = await import(p); const c = m.chromium || (m.default && m.default.chromium); if (c) return c; } catch {}
  }
  throw new Error('Playwright not found. Install it:  npm i -D playwright && npx playwright install chromium');
}

// ---- tiny static server so the game loads over http (localStorage etc. behave) ----
function serve(dir) {
  const srv = http.createServer((req, res) => {
    try { let p = req.url.split('?')[0]; if (p === '/') p = '/index.html';
      res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(readFileSync(path.join(dir, p))); }
    catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise(r => srv.listen(0, () => r({ srv, port: srv.address().port })));
}

// ---- default parameter space ----
const REGIONS = [                                          // varied spawn points → different terrain/resource profiles
  { name: 'A', lat: 34.05, lon: -118.24 },
  { name: 'B', lat: 48.86, lon: 2.35 },
  { name: 'C', lat: -23.55, lon: -46.63 },
  { name: 'D', lat: 1.35, lon: 103.82 },
  { name: 'E', lat: 59.91, lon: 10.75 },
];

// ---- args ----
function parseArgs(argv) {
  const a = { ticks: 150, tiers: [0,1,2,3,4,5], regions: 3, tune: {}, elec: 0, partners: [], json: null, samples: 0, conc: 4 };
  for (let i = 0; i < argv.length; i++) {
    const [k, v] = argv[i].startsWith('--') ? [argv[i].slice(2), argv[i+1]] : [null, null];
    if (k === 'ticks') { a.ticks = +v; i++; }
    else if (k === 'concurrency' || k === 'conc') { a.conc = Math.max(1, +v); i++; }
    else if (k === 'tiers') { a.tiers = v.split(',').map(Number); i++; }
    else if (k === 'regions') { a.regions = +v; i++; }
    else if (k === 'tune') { v.split(',').forEach(kv => { const [tk, tv] = kv.split('='); a.tune[tk] = +tv; }); i++; }
    else if (k === 'elec') { a.elec = +v; i++; }
    else if (k === 'partners') { a.partners = v.split(',').map(s => s.trim()); i++; }
    else if (k === 'json') { a.json = v; i++; }
    else if (k === 'samples') { a.samples = +v; i++; }
    else if (k === 'help') { console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]); process.exit(0); }
  }
  return a;
}

// ---- run one AI city to steady state, return its stats ----
async function runCity(browser, base, { tier, region, tune, ticks, samples, elec, partners }) {
  const eff = { ...tune };
  if (elec > 0 && eff.elecTier === undefined) eff.elecTier = 0;   // make the Electronics recipe active for AI tiers (≤5)
  const q = new URLSearchParams({ e2e: '1', ai: '1', tier: String(tier), lat: String(region.lat), lon: String(region.lon) });
  if (Object.keys(eff).length) q.set('tune', JSON.stringify(eff));
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  try {
    await page.goto(`${base}/index.html?${q.toString()}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__dbg && window.__dbg.stats, { timeout: 8000 });
    const out = await page.evaluate(({ ticks, samples, elec, partners }) => {
      const d = window.__dbg;
      const setup = {};
      if (partners && partners.length) setup.partners = d.setPartners(partners);
      if (elec > 0) setup.recipes = d.setRecipes(elec);
      const traj = [];
      const every = samples > 0 ? Math.max(1, Math.floor(ticks / samples)) : 0;
      for (let t = 1; t <= ticks; t++) {
        d.tick();
        if (every && t % every === 0) { const s = d.stats(); traj.push({ tick: t, pop: s.pop, cash: s.cash, net: s.net, tpAvg: s.tpAvg, cong: s.congestion, tier: s.tier }); }
      }
      return { final: d.stats(), traj, setup, tune: d.tune().live };
    }, { ticks, samples, elec, partners });
    return { tier, region: region.name, ...out, errs };
  } catch (e) {
    return { tier, region: region.name, error: String(e.message || e), errs };
  } finally {
    await page.close();
  }
}

// ---- formatting ----
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
function worstSup(sup) {                                    // the tightest supply ratio (the bottleneck)
  let k = null, v = 2; for (const id in sup) if (sup[id] < v) { v = sup[id]; k = id; }
  return v >= 0.999 ? 'ok' : `${k} ${Math.round(v * 100)}%`;
}
function table(rows) {
  const H = ['reg(spec)', 'built→', 'reached', 'pop', 'cash', 'net/mo', 'solv', 'tp.avg', 'cong', 'worstSup', 'buildings'];
  const W = [11, 6, 10, 8, 9, 8, 5, 7, 5, 12, 22];
  const line = (c) => c.map((x, i) => (i >= 3 && i <= 8 ? padL(x, W[i]) : pad(x, W[i]))).join('  ');
  const out = [line(H), line(W.map(w => '─'.repeat(w)))];
  for (const r of rows) {
    if (r.error) { out.push(line([`${r.region}`, `T${r.tier}`, 'ERROR', '', '', '', '', '', '', '', r.error.slice(0, 22)])); continue; }
    const s = r.final;
    const b = Object.entries(s.buildings).sort((a, z) => z[1] - a[1]).slice(0, 4).map(([k, n]) => `${k}${n}`).join(' ');
    out.push(line([
      `${r.region}(${s.spec.slice(0,4)})`, `T${r.tier}`, s.tierName, s.pop.toLocaleString(),
      s.cash.toLocaleString(), (s.net >= 0 ? '+' : '') + s.net, s.insolvent ? 'NO' : 'yes',
      s.tpAvg, Math.round(s.congestion * 100) + '%', worstSup(s.sup), b,
    ]));
  }
  return out.join('\n');
}

// ---- main ----
(async () => {
  const args = parseArgs(process.argv.slice(2));
  const regions = REGIONS.slice(0, Math.max(1, Math.min(REGIONS.length, args.regions)));
  const chromium = await loadChromium();
  const { srv, port } = await serve(GAME_DIR);
  const base = `http://localhost:${port}`;
  const browser = await chromium.launch();

  const combos = [];
  for (const region of regions) for (const tier of args.tiers) combos.push({ region, tier });

  console.log(`\nMetropolis Dawn Grid — headless sim`);
  console.log(`  cities: ${combos.length}  (${args.tiers.length} tiers × ${regions.length} regions)   ticks/city: ${args.ticks}   parallel: ${args.conc}`);
  if (Object.keys(args.tune).length) console.log(`  tune override: ${JSON.stringify(args.tune)}`);
  if (args.elec > 0) console.log(`  electronics: ${Math.round(args.elec * 100)}% of factories`);
  if (args.partners.length) console.log(`  trade partners: ${args.partners.join(', ')}`);
  console.log('');

  // concurrency pool — Chromium runs each page in its own process, so parallel cities use multiple cores
  const rows = new Array(combos.length);
  let idx = 0, done = 0;
  async function worker() {
    while (idx < combos.length) {
      const i = idx++;
      rows[i] = await runCity(browser, base, { ...combos[i], tune: args.tune, ticks: args.ticks, samples: args.samples, elec: args.elec, partners: args.partners });
      done++; process.stdout.write(`\r  simulating… ${done}/${combos.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(args.conc, combos.length) }, worker));
  process.stdout.write('\r' + ' '.repeat(40) + '\r');

  console.log(table(rows) + '\n');

  // ---- summary ----
  const ok = rows.filter(r => !r.error);
  const insolvent = ok.filter(r => r.final.insolvent).length;
  const byTier = {};
  for (const r of ok) { (byTier[r.tier] ||= []).push(r); }
  console.log('summary');
  console.log(`  insolvent cities: ${insolvent}/${ok.length}${insolvent ? '  ⚠' : ''}`);
  for (const t of Object.keys(byTier).sort()) {
    const g = byTier[t]; const avg = (f) => (g.reduce((s, r) => s + f(r.final), 0) / g.length);
    console.log(`  built T${t}: reached ${g.map(r=>r.final.tierName).join('/')} · avg pop ${Math.round(avg(s=>s.pop)).toLocaleString()} · avg net ${Math.round(avg(s=>s.net))} · avg tp ${avg(s=>s.tpAvg).toFixed(1)} · avg cong ${Math.round(avg(s=>s.congestion)*100)}%`);
  }
  const anyErr = rows.filter(r => r.error || (r.errs && r.errs.length));
  if (anyErr.length) console.log(`  ⚠ ${anyErr.length} city(ies) had errors — see JSON / re-run with --json`);

  if (args.json) {
    const p = path.resolve(process.cwd(), args.json);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify({ args, generatedTicks: args.ticks, rows }, null, 2));
    console.log(`\n  full results → ${p}`);
  }

  await browser.close();
  srv.close();
})();
