// Dependency-free test harness for the shared-world Worker.
// Mocks KV (a Map) + uses Node 22's global Request/Response/URL. `node test.mjs`.
import { handle, plotOf, plotCenter, plotNbs, SEED_HUBS } from './worker.js';

let fails = 0;
const ok = (m) => console.log('ok  : ' + m);
const fail = (m) => { console.error('FAIL: ' + m); fails++; };
const eq = (got, want, m) => (got === want ? ok(m + ' (' + got + ')') : fail(m + ' — got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)));

function makeKV() {
  const m = new Map();
  return {
    _m: m,
    get: async (k, type) => { const v = m.get(k); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; },
    put: async (k, v) => { m.set(k, v); },
    list: async ({ prefix = '', limit = 1000 } = {}) => ({
      keys: [...m.keys()].filter((k) => k.startsWith(prefix)).slice(0, limit).map((name) => ({ name })),
      list_complete: true, cursor: null
    })
  };
}
const env = () => ({ WORLD: makeKV() });
const req = (method, path, body) => new Request('https://x' + path, {
  method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined
});
const call = async (e, method, path, body) => { const r = await handle(req(method, path, body), e); return { status: r.status, body: await r.json().catch(() => null) }; };

const TOKEN = 'testdevicetoken001';

(async () => {
  // ---- health ----
  { const e = env(); const r = await call(e, 'GET', '/'); eq(r.status, 200, 'GET / health'); eq(r.body.service, 'mdg-world', 'health names the service'); }

  // ---- cloud city save round-trip ----
  {
    const e = env();
    const put = await call(e, 'PUT', '/v1/city', { token: TOKEN, slug: '14_0', blob: 'MDG1.hello', ts: 111 });
    eq(put.status, 200, 'PUT /v1/city stores');
    const get = await call(e, 'GET', '/v1/city?token=' + TOKEN + '&slug=14_0');
    eq(get.status, 200, 'GET /v1/city returns'); eq(get.body.blob, 'MDG1.hello', 'blob round-trips'); eq(get.body.ts, 111, 'ts round-trips');
    const miss = await call(e, 'GET', '/v1/city?token=' + TOKEN + '&slug=99_9'); eq(miss.status, 404, 'missing city → 404');
    const badTok = await call(e, 'PUT', '/v1/city', { token: 'x', slug: 'a', blob: 'y' }); eq(badTok.status, 400, 'bad token → 400');
    const big = await call(e, 'PUT', '/v1/city', { token: TOKEN, slug: 'a', blob: 'z'.repeat(600 * 1024) }); eq(big.status, 413, 'oversized blob → 413');
  }

  // ---- world seeds the 8 hubs ----
  {
    const e = env(); const w = await call(e, 'GET', '/v1/world');
    eq(w.status, 200, 'GET /v1/world'); eq(w.body.cities.length, SEED_HUBS.length, 'world seeds all hubs');
    if (w.body.cities.every((c) => c.hub)) ok('seed cities are flagged as hubs'); else fail('a seed city is not a hub');
  }

  // ---- claim: adjacency enforced, and the CHAIN rule works ----
  {
    const e = env();
    // a plot bordering New Sprawlton (a hub) — valid
    const hub = SEED_HUBS[0]; const hp = plotOf(hub.lat, hub.lon);
    const nb = plotNbs(hp.pi, hp.pj)[0]; const c1 = plotCenter(nb[0], nb[1]);
    const claim1 = await call(e, 'POST', '/v1/claim', { token: TOKEN, name: 'Frontier One', lat: c1.lat, lon: c1.lon, ts: 1 });
    eq(claim1.status, 200, 'claim bordering a hub → ok'); eq(claim1.body.city.name, 'Frontier One', 'claim keeps the name');

    // the SAME plot again — taken
    const dup = await call(e, 'POST', '/v1/claim', { token: TOKEN, name: 'Dup', lat: c1.lat, lon: c1.lon });
    eq(dup.status, 409, 'claiming a taken plot → 409');

    // a plot far from everything — beyond the frontier
    const far = await call(e, 'POST', '/v1/claim', { token: TOKEN, name: 'Nowhere', lat: 0.7, lon: 1.3 });
    eq(far.status, 422, 'claim beyond the frontier → 422');

    // a plot bordering the NEW claim but NOT any hub — only valid via the chain
    // find a neighbour of the claimed plot that is not adjacent to a hub
    const claimedPlot = plotOf(c1.lat, c1.lon);
    const hubKeys = new Set(SEED_HUBS.map((h) => { const p = plotOf(h.lat, h.lon); return p && p.key; }));
    const hubAdj = new Set();
    hubKeys.forEach((k) => { const [pi, pj] = k.split(',').map(Number); plotNbs(pi, pj).forEach((n) => hubAdj.add(n[0] + ',' + n[1])); });
    let chainPlot = null;
    for (const n of plotNbs(claimedPlot.pi, claimedPlot.pj)) {
      const k = n[0] + ',' + n[1];
      if (k !== hp.key && !hubKeys.has(k) && !hubAdj.has(k)) { chainPlot = n; break; }
    }
    if (chainPlot) {
      const c2 = plotCenter(chainPlot[0], chainPlot[1]);
      const claim2 = await call(e, 'POST', '/v1/claim', { token: TOKEN, name: 'Chain Two', lat: c2.lat, lon: c2.lon });
      eq(claim2.status, 200, 'CHAIN RULE: claim bordering only the new city (2 hops from a hub) → ok');
    } else { ok('chain-plot geometry unavailable in this layout — skipping chain assertion'); }

    // world now reflects the claims
    const w2 = await call(e, 'GET', '/v1/world');
    const owned = w2.body.cities.filter((c) => c.owner === TOKEN).length;
    if (owned >= 1) ok('shared world now shows ' + owned + ' player-claimed cities'); else fail('claims not visible in /world');

    // XSS/junk name is sanitised
    const hp2 = plotOf(SEED_HUBS[1].lat, SEED_HUBS[1].lon); const nb2 = plotNbs(hp2.pi, hp2.pj)[0]; const c3 = plotCenter(nb2[0], nb2[1]);
    const evil = await call(e, 'POST', '/v1/claim', { token: TOKEN, name: '<script>alert(1)</script>', lat: c3.lat, lon: c3.lon });
    if (evil.status === 200 && !/[<>]/.test(evil.body.city.name)) ok('claim name is sanitised (' + evil.body.city.name + ')'); else fail('name not sanitised: ' + JSON.stringify(evil.body));

    const noTok = await call(e, 'POST', '/v1/claim', { name: 'x', lat: 0, lon: 0 }); eq(noTok.status, 400, 'claim without a token → 400');
  }

  // ---- neighbours near a hub ----
  {
    const e = env(); const hub = SEED_HUBS[0];
    const n = await call(e, 'GET', '/v1/neighbors?lat=' + hub.lat + '&lon=' + hub.lon + '&r=10');
    eq(n.status, 200, 'GET /v1/neighbors');
    if (n.body.neighbors.some((c) => c.name === hub.name)) ok('neighbours include the nearby hub'); else fail('nearby hub missing from neighbours');
  }

  // ---- CORS preflight ----
  { const e = env(); const r = await handle(req('OPTIONS', '/v1/claim'), e); eq(r.status, 204, 'OPTIONS preflight → 204'); eq(r.headers.get('Access-Control-Allow-Origin'), '*', 'CORS header present'); }

  console.log(fails ? '\nRESULT: ' + fails + ' FAILURES' : '\nRESULT: ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('harness error:', e); process.exit(2); });
