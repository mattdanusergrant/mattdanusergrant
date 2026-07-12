/*
 * Metropolis Dawn Grid — shared-world backend (Cloudflare Worker + KV)
 *
 * The seed of the online layer: cloud city saves and a PERSISTENT SHARED WORLD
 * where real players' plot claims are stored authoritatively and seen by everyone.
 * The settlement adjacency rule (a new city must border the connected megacity
 * network) is enforced HERE on the server — the client can't cheat it.
 *
 * Storage: a single KV namespace (binding: WORLD).
 *   city:<token>:<slug>  -> { blob, ts }              cloud save (one per region a player builds)
 *   claim:<pi>,<pj>      -> { token, name, lat, lon, tier, ts }   one per shared-world plot
 *
 * Identity (v1): an opaque, client-generated device token. No accounts/credentials
 * yet — that (email + Stripe) is a later phase. A token owns its cities and claims.
 *
 * The game degrades gracefully: if this backend is unreachable, play is fully local.
 */

// ---- world grid: MUST match world/index.html exactly (authoritative plot math) ----
var TS = 6, TROWS = 24, TCOLS = 60;
var PLOTS = 4, PP = TS / PLOTS, PCOLS = TCOLS * PLOTS, PROWS = TROWS * PLOTS;   // 240 × 96 plots

// The megacity seed network — connected by definition. Mirrors the client's AI hub cities.
var SEED_HUBS = [
  { name: 'New Sprawlton', lat: 32, lon: -46, tier: 2 },
  { name: 'Gridholm', lat: -8, lon: 38, tier: 2 },
  { name: 'Port Zoning', lat: -30, lon: -18, tier: 3 },
  { name: 'Fort Density', lat: 48, lon: 70, tier: 3 },
  { name: 'Lake Parcel', lat: 6, lon: 128, tier: 2 },
  { name: 'Trade Junction', lat: -22, lon: 96, tier: 4 },
  { name: 'Old Commons', lat: 24, lon: 182, tier: 3 },
  { name: 'Mount Civic', lat: -46, lon: 150, tier: 2 }
];

function plotOf(lat, lon) {
  if (lat < -72 || lat >= 72) return null;
  var pj = Math.floor((lat + 72) / PP);
  var pi = Math.floor(((((lon + 180) % 360) + 360) % 360) / PP) % PCOLS;
  return { pi: pi, pj: pj, key: pi + ',' + pj };
}
function plotCenter(pi, pj) { return { lat: pj * PP - 72 + PP / 2, lon: pi * PP - 180 + PP / 2 }; }
function plotNbs(pi, pj) {
  var o = [[(pi + 1) % PCOLS, pj], [(pi + PCOLS - 1) % PCOLS, pj]];   // E/W wrap around the globe
  if (pj > 0) o.push([pi, pj - 1]);
  if (pj < PROWS - 1) o.push([pi, pj + 1]);
  return o;
}

// ---- helpers ----
var CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CORS)
  });
}
function okToken(t) { return typeof t === 'string' && /^[A-Za-z0-9_-]{12,64}$/.test(t); }
function cleanName(n) {
  if (typeof n !== 'string') return 'New City';
  n = n.replace(/[<>&"'\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 28);
  return n || 'New City';
}
function okSlug(s) { return typeof s === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(s); }

// Build the connected-plot set: hubs, plus every claim reachable from a hub through
// adjacent claimed plots (the chain rule). Returns { occ:Set, conn:Set, byKey:{} }.
function connectivity(claims) {
  var occ = {}, byKey = {}, i;
  for (i = 0; i < SEED_HUBS.length; i++) {
    var hp = plotOf(SEED_HUBS[i].lat, SEED_HUBS[i].lon);
    if (hp) { occ[hp.key] = 1; byKey[hp.key] = Object.assign({ hub: true }, SEED_HUBS[i]); }
  }
  for (i = 0; i < claims.length; i++) {
    var cp = plotOf(claims[i].lat, claims[i].lon);
    if (cp) { occ[cp.key] = 1; if (!byKey[cp.key]) byKey[cp.key] = claims[i]; }
  }
  // BFS from hubs through adjacency over occupied plots
  var conn = {}, q = [];
  for (var k in byKey) if (byKey[k].hub) { conn[k] = 1; q.push(k); }
  var head = 0;
  while (head < q.length) {
    var parts = q[head++].split(','), pi = +parts[0], pj = +parts[1];
    var nb = plotNbs(pi, pj);
    for (var n = 0; n < nb.length; n++) {
      var nk = nb[n][0] + ',' + nb[n][1];
      if (occ[nk] && !conn[nk]) { conn[nk] = 1; q.push(nk); }
    }
  }
  return { occ: occ, conn: conn, byKey: byKey };
}

async function loadClaims(env) {
  var out = [], cursor = null, guard = 0;
  do {
    var list = await env.WORLD.list({ prefix: 'claim:', cursor: cursor, limit: 1000 });
    for (var i = 0; i < list.keys.length; i++) {
      var v = await env.WORLD.get(list.keys[i].name, 'json');
      if (v) out.push(v);
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor && ++guard < 20);   // hard cap ~20k claims for v1
  return out;
}

async function handle(request, env) {
  var url = new URL(request.url);
  var path = url.pathname.replace(/\/+$/, '') || '/';
  var method = request.method;

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (path === '/' || path === '/v1') return json({ ok: true, service: 'mdg-world', v: 1 });

  // ---- cloud city saves ----
  if (path === '/v1/city') {
    if (method === 'PUT' || method === 'POST') {
      var body = await request.json().catch(function () { return null; });
      if (!body || !okToken(body.token) || !okSlug(body.slug)) return json({ error: 'bad token or slug' }, 400);
      if (typeof body.blob !== 'string' || body.blob.length > 512 * 1024) return json({ error: 'blob missing or too large' }, 413);
      var rec = { blob: body.blob, ts: Number(body.ts) || 0 };
      await env.WORLD.put('city:' + body.token + ':' + body.slug, JSON.stringify(rec));
      return json({ ok: true, ts: rec.ts });
    }
    if (method === 'GET') {
      var tok = url.searchParams.get('token'), slug = url.searchParams.get('slug');
      if (!okToken(tok) || !okSlug(slug)) return json({ error: 'bad token or slug' }, 400);
      var got = await env.WORLD.get('city:' + tok + ':' + slug, 'json');
      if (!got) return json({ error: 'not found' }, 404);
      return json({ ok: true, blob: got.blob, ts: got.ts });
    }
    return json({ error: 'method not allowed' }, 405);
  }

  // ---- shared world: everyone's claimed plots (+ the hub seed) ----
  if (path === '/v1/world' && method === 'GET') {
    var claims = await loadClaims(env);
    var cities = SEED_HUBS.map(function (h) { return { name: h.name, lat: h.lat, lon: h.lon, tier: h.tier, hub: true }; })
      .concat(claims.map(function (c) { return { name: c.name, lat: c.lat, lon: c.lon, tier: c.tier || 1, owner: c.token }; }));
    return json({ ok: true, cities: cities, count: cities.length });
  }

  // ---- claim a plot (server enforces: open + borders the connected network) ----
  if (path === '/v1/claim' && method === 'POST') {
    var b = await request.json().catch(function () { return null; });
    if (!b || !okToken(b.token)) return json({ error: 'bad token' }, 400);
    if (typeof b.lat !== 'number' || typeof b.lon !== 'number') return json({ error: 'bad coordinates' }, 400);
    var target = plotOf(b.lat, b.lon);
    if (!target) return json({ error: 'outside the habitable band' }, 400);

    var claims = await loadClaims(env);
    var net = connectivity(claims);
    if (net.occ[target.key]) return json({ error: 'that plot is already taken' }, 409);
    // must border a CONNECTED plot (a hub, or a city chained to one)
    var nb = plotNbs(target.pi, target.pj), bordersNet = false;
    for (var i = 0; i < nb.length; i++) if (net.conn[nb[i][0] + ',' + nb[i][1]]) { bordersNet = true; break; }
    if (!bordersNet) return json({ error: 'beyond the frontier — a new city must border the network' }, 422);

    var center = plotCenter(target.pi, target.pj);
    var rec = { token: b.token, name: cleanName(b.name), lat: center.lat, lon: center.lon, tier: 1, ts: Number(b.ts) || 0 };
    await env.WORLD.put('claim:' + target.key, JSON.stringify(rec));
    return json({ ok: true, city: rec, plot: target.key });
  }

  // ---- neighbours near a region (for trade discovery) ----
  if (path === '/v1/neighbors' && method === 'GET') {
    var la = parseFloat(url.searchParams.get('lat')), lo = parseFloat(url.searchParams.get('lon'));
    var rad = Math.min(40, Math.max(3, parseFloat(url.searchParams.get('r')) || 18));
    if (isNaN(la) || isNaN(lo)) return json({ error: 'bad coordinates' }, 400);
    var all = SEED_HUBS.concat(await loadClaims(env));
    var near = all.filter(function (c) {
      var dLon = Math.abs(((c.lon - lo + 540) % 360) - 180);
      return Math.abs(c.lat - la) <= rad && dLon <= rad;
    }).map(function (c) { return { name: c.name, lat: c.lat, lon: c.lon, tier: c.tier || 1, hub: !!c.tier && !c.token }; });
    return json({ ok: true, neighbors: near.slice(0, 40) });
  }

  return json({ error: 'not found' }, 404);
}

export default {
  fetch: function (request, env, ctx) {
    return handle(request, env).catch(function (err) {
      return json({ error: 'server error', detail: String(err && err.message || err) }, 500);
    });
  }
};

// Exposed for the local Node test harness (ignored by the Workers runtime).
export { plotOf, plotCenter, plotNbs, connectivity, cleanName, okToken, handle, SEED_HUBS };
