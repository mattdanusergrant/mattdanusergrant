/*
 * Metropolis Dawn Grid — shared-world backend (Cloudflare Worker + KV)
 *
 * The online layer: cloud city saves and a PERSISTENT SHARED WORLD where real
 * players' plot claims are stored authoritatively and seen by everyone. The
 * settlement adjacency rule (a new city must border its hub's territory) is
 * enforced HERE on the server — the client can't cheat it.
 *
 * HUB PLAYERS (invite-only communities)
 *   A "hub player" is a real influencer (e.g. City Planner Plays) whose community
 *   grows out of THEIR hub. The Operator mints a hub; the hub owner (or Operator)
 *   generates invite codes; a player redeems a code to JOIN that hub, and can then
 *   claim plots that border the hub's own growing territory. Each hub is a distinct,
 *   contiguous cluster on the globe — you can watch an influencer's empire spread.
 *   Codes carry a kind: 'open' | 'patron'. Patron codes are simply shared behind the
 *   influencer's Patreon paywall (a patrons-only post) — no Patreon API in v1.
 *
 * Storage: a single KV namespace (binding: WORLD).
 *   city:<token>:<slug>  -> { blob, ts }                            cloud save
 *   claim:<pi>,<pj>      -> { token, name, lat, lon, tier, hubId, ts }   a shared-world plot
 *   hub:<hubId>         -> { hubId, name, ownerToken, lat, lon, tier, patreonUrl, handle, url, created }
 *   code:<CODE>         -> { code, hubId, kind, max, uses, active, note, created }
 *   member:<token>      -> { token, hubId, code, ts }               a redeemed affiliation
 *
 * Identity (v1): an opaque, client-generated device token. Admin actions (minting
 * hubs) require the ADMIN_KEY secret as a Bearer token. Hub owners self-serve code
 * generation with their owner token. Accounts (email + Stripe) are a later phase.
 *
 * Config (env vars / secrets):
 *   ADMIN_KEY           -> operator secret; required for /v1/admin/* endpoints
 *   WORLD_INVITE_ONLY   -> 'true' (default) gates world claims behind hub membership;
 *                          'false' opens claiming to anyone (affiliation-layer mode)
 *
 * The game degrades gracefully: if this backend is unreachable, play is fully local.
 */

// ---- world grid: MUST match world/index.html exactly (authoritative plot math) ----
var TS = 6, TROWS = 24, TCOLS = 60;
var PLOTS = 4, PP = TS / PLOTS, PCOLS = TCOLS * PLOTS, PROWS = TROWS * PLOTS;   // 240 × 96 plots

// The AI megacity seed network — connected scenery, present in every world. These are
// NOT joinable hubs (no owner, no codes); human hub players are stored in KV.
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
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Max-Age': '86400'
};
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CORS)
  });
}
function okToken(t) { return typeof t === 'string' && /^[A-Za-z0-9_-]{12,64}$/.test(t); }
function okSlug(s) { return typeof s === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(s); }
function okHubId(h) { return typeof h === 'string' && /^[a-z0-9][a-z0-9-]{1,48}$/.test(h); }
function normCode(c) { return typeof c === 'string' ? c.toUpperCase().replace(/[^A-Z0-9]/g, '') : ''; }
function okCode(c) { return /^[A-Z0-9]{4,24}$/.test(normCode(c)); }
function cleanName(n) {
  if (typeof n !== 'string') return 'New City';
  n = n.replace(/[<>&"'\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 28);
  return n || 'New City';
}
function cleanText(n, max) {
  if (typeof n !== 'string') return '';
  return n.replace(/[<>&"'\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, max || 40);
}
function cleanUrl(u) {
  if (typeof u !== 'string') return '';
  u = u.trim().slice(0, 200);
  return /^https?:\/\/[^\s<>"'\\]+$/i.test(u) ? u : '';
}
function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28) || 'hub';
}
function clampInt(v, lo, hi, dflt) {
  v = Math.floor(Number(v)); if (!isFinite(v)) return dflt;
  return Math.max(lo, Math.min(hi, v));
}
var _CA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no ambiguous chars (0/O, 1/I/L)
function randStr(n, alphabet) {
  var a = alphabet || _CA, u = new Uint8Array(n), s = '';
  crypto.getRandomValues(u);
  for (var i = 0; i < n; i++) s += a[u[i] % a.length];
  return s;
}
function genCode() { return randStr(6); }
function genToken() { return randStr(32, 'abcdefghijklmnopqrstuvwxyz0123456789'); }
function isAdmin(request, env) {
  if (!env || !env.ADMIN_KEY) return false;
  var h = request.headers.get('Authorization') || '';
  var m = /^Bearer\s+(.+)$/.exec(h);
  return !!m && m[1] === env.ADMIN_KEY;
}
function inviteOnly(env) { return String((env && env.WORLD_INVITE_ONLY) || 'true') !== 'false'; }
// Eligibility to APPLY for a hub: reach at least this milestone (MS index in the builder —
// 7 = Metropolis, 8 = Megacity), or have paid at least this much lifetime (0 = disabled).
function hubMinMs(env) { var v = parseInt(env && env.HUB_MIN_MS, 10); return isFinite(v) ? v : 7; }
function hubMinPaid(env) { var v = parseFloat(env && env.HUB_MIN_PAID); return isFinite(v) ? v : 0; }
function okMs(v) { v = Math.floor(Number(v)); return isFinite(v) && v >= -1 && v <= 12; }

// ---- KV loaders ----
async function loadPrefix(env, prefix, guardCap) {
  var out = [], cursor = null, guard = 0;
  do {
    var list = await env.WORLD.list({ prefix: prefix, cursor: cursor, limit: 1000 });
    for (var i = 0; i < list.keys.length; i++) {
      var v = await env.WORLD.get(list.keys[i].name, 'json');
      if (v) out.push(v);
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor && ++guard < (guardCap || 20));
  return out;
}
function loadClaims(env) { return loadPrefix(env, 'claim:', 20); }   // hard cap ~20k claims for v1
function loadHubs(env) { return loadPrefix(env, 'hub:', 5); }
function loadMembers(env) { return loadPrefix(env, 'member:', 20); }
function loadApps(env) { return loadPrefix(env, 'app:', 10); }
function getHub(env, hubId) { return env.WORLD.get('hub:' + hubId, 'json'); }

// Nearest open plot to any AI seed hub (BFS) — where an auto-placed new hub lands.
function autoOpenPlot(occ) {
  for (var i = 0; i < SEED_HUBS.length; i++) {
    var sp = plotOf(SEED_HUBS[i].lat, SEED_HUBS[i].lon); if (!sp) continue;
    var seen = {}, q = [[sp.pi, sp.pj]], head = 0, guard = 0; seen[sp.key] = 1;
    while (head < q.length && guard++ < 6000) {
      var cur = q[head++], nb = plotNbs(cur[0], cur[1]);
      for (var n = 0; n < nb.length; n++) {
        var k = nb[n][0] + ',' + nb[n][1]; if (seen[k]) continue; seen[k] = 1;
        if (!occ[k]) { var c = plotCenter(nb[n][0], nb[n][1]); return { lat: c.lat, lon: c.lon, key: k }; }
        q.push(nb[n]);
      }
    }
  }
  return null;
}

var seedHubId = function (name) { return 'seed-' + slugify(name); };

// The occupancy map: every filled plot → its hubId. Seed + human hubs are hubs;
// claims inherit the hubId of the hub they were founded under (null = unaffiliated).
function occupancy(claims, hubs) {
  var occ = {}, i, p;
  for (i = 0; i < SEED_HUBS.length; i++) {
    p = plotOf(SEED_HUBS[i].lat, SEED_HUBS[i].lon);
    if (p) occ[p.key] = { hubId: seedHubId(SEED_HUBS[i].name), name: SEED_HUBS[i].name, hub: true, tier: SEED_HUBS[i].tier };
  }
  for (i = 0; hubs && i < hubs.length; i++) {
    p = plotOf(hubs[i].lat, hubs[i].lon);
    if (p) occ[p.key] = { hubId: hubs[i].hubId, name: hubs[i].name, hub: true, human: true, tier: hubs[i].tier || 3 };
  }
  for (i = 0; i < claims.length; i++) {
    p = plotOf(claims[i].lat, claims[i].lon);
    if (p && !occ[p.key]) occ[p.key] = { hubId: claims[i].hubId || null, name: claims[i].name, tier: claims[i].tier || 1, token: claims[i].token };
  }
  return occ;
}

// Global connectivity (open-mode fallback): BFS from every hub through adjacent
// occupied plots. Returns { occ, conn } — conn = plots chained to some hub.
function connectivity(claims, hubs) {
  var occ = occupancy(claims, hubs), conn = {}, q = [], k;
  for (k in occ) if (occ[k].hub) { conn[k] = 1; q.push(k); }
  var head = 0;
  while (head < q.length) {
    var parts = q[head++].split(','), pi = +parts[0], pj = +parts[1];
    var nb = plotNbs(pi, pj);
    for (var n = 0; n < nb.length; n++) {
      var nk = nb[n][0] + ',' + nb[n][1];
      if (occ[nk] && !conn[nk]) { conn[nk] = 1; q.push(nk); }
    }
  }
  return { occ: occ, conn: conn };
}

// A player's hub affiliation: a redeemed member, or a hub they own (owners build in
// their own territory). Returns hubId or null.
async function claimerHub(env, token, hubs) {
  var m = await env.WORLD.get('member:' + token, 'json');
  if (m && m.hubId) return m.hubId;
  for (var i = 0; hubs && i < hubs.length; i++) if (hubs[i].ownerToken === token) return hubs[i].hubId;
  return null;
}

function hubPublic(h, memberCount, cityCount) {
  return {
    hubId: h.hubId, name: h.name, lat: h.lat, lon: h.lon, tier: h.tier || 3,
    patreonUrl: h.patreonUrl || '', handle: h.handle || '', url: h.url || '',
    members: memberCount || 0, cities: cityCount || 0, created: h.created || 0
  };
}
function countFor(hubId, members, claims) {
  var m = 0, c = 0, i;
  for (i = 0; i < members.length; i++) if (members[i].hubId === hubId) m++;
  for (i = 0; i < claims.length; i++) if (claims[i].hubId === hubId) c++;
  return { members: m, cities: c };
}

async function handle(request, env) {
  var url = new URL(request.url);
  var path = url.pathname.replace(/\/+$/, '') || '/';
  var method = request.method;

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (path === '/' || path === '/v1') return json({ ok: true, service: 'mdg-world', v: 1, inviteOnly: inviteOnly(env) });

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

  // ---- shared world: hubs (seed + human) + everyone's claimed plots ----
  if (path === '/v1/world' && method === 'GET') {
    var wClaims = await loadClaims(env), wHubs = await loadHubs(env);
    var cities = SEED_HUBS.map(function (h) { return { name: h.name, lat: h.lat, lon: h.lon, tier: h.tier, hub: true, hubId: seedHubId(h.name) }; })
      .concat(wHubs.map(function (h) { return { name: h.name, lat: h.lat, lon: h.lon, tier: h.tier || 3, hub: true, human: true, hubId: h.hubId, patreonUrl: h.patreonUrl || '', handle: h.handle || '' }; }))
      .concat(wClaims.map(function (c) { return { name: c.name, lat: c.lat, lon: c.lon, tier: c.tier || 1, owner: c.token, hubId: c.hubId || null }; }));
    return json({ ok: true, cities: cities, count: cities.length, inviteOnly: inviteOnly(env), hubMinMs: hubMinMs(env) });
  }

  // ---- public hub directory (a "communities" browser) ----
  if (path === '/v1/hubs' && method === 'GET') {
    var dHubs = await loadHubs(env), dMembers = await loadMembers(env), dClaims = await loadClaims(env);
    var out = dHubs.map(function (h) { var n = countFor(h.hubId, dMembers, dClaims); return hubPublic(h, n.members, n.cities); });
    return json({ ok: true, hubs: out, count: out.length });
  }

  // ---- redeem an invite code → join that hub ----
  if (path === '/v1/redeem' && method === 'POST') {
    var rb = await request.json().catch(function () { return null; });
    if (!rb || !okToken(rb.token)) return json({ error: 'bad token' }, 400);
    if (!okCode(rb.code)) return json({ error: 'bad code' }, 400);
    var code = normCode(rb.code);
    var crec = await env.WORLD.get('code:' + code, 'json');
    if (!crec || !crec.active) return json({ error: 'that invite code isn’t valid', code: 'bad_code' }, 404);
    if (crec.max && crec.uses >= crec.max) return json({ error: 'that invite code has been fully used', code: 'code_spent' }, 409);
    var rhub = await getHub(env, crec.hubId);
    if (!rhub) return json({ error: 'that hub no longer exists', code: 'no_hub' }, 404);
    var existing = await env.WORLD.get('member:' + rb.token, 'json');
    if (existing && existing.hubId && existing.hubId !== crec.hubId)
      return json({ error: 'you’re already part of another hub', code: 'other_hub', hubId: existing.hubId }, 409);
    if (!existing) {   // first redemption for this device consumes one use
      crec.uses = (crec.uses || 0) + 1;
      await env.WORLD.put('code:' + code, JSON.stringify(crec));
    }
    var mrec = { token: rb.token, hubId: crec.hubId, code: code, ts: Number(rb.ts) || 0 };
    await env.WORLD.put('member:' + rb.token, JSON.stringify(mrec));
    return json({ ok: true, hubId: rhub.hubId, hubName: rhub.name, patreonUrl: rhub.patreonUrl || '', handle: rhub.handle || '', kind: crec.kind, lat: rhub.lat, lon: rhub.lon });
  }

  // ---- apply to become a hub player (gated by progress and/or lifetime spend) ----
  if (path === '/v1/apply') {
    if (method === 'GET') {
      var at = url.searchParams.get('token');
      if (!okToken(at)) return json({ error: 'bad token' }, 400);
      var gotApp = await env.WORLD.get('app:' + at, 'json');
      return json({ ok: true, application: gotApp || null, minMs: hubMinMs(env), minPaid: hubMinPaid(env) });
    }
    if (method === 'POST') {
      var pb = await request.json().catch(function () { return null; });
      if (!pb || !okToken(pb.token)) return json({ error: 'bad token' }, 400);
      var pHubs = await loadHubs(env), i;
      for (i = 0; i < pHubs.length; i++) if (pHubs[i].ownerToken === pb.token) return json({ error: 'you already own a hub', code: 'already_hub', hubId: pHubs[i].hubId }, 409);
      var bestMs = okMs(pb.bestMs) ? Math.floor(pb.bestMs) : -1;
      var paid = Math.max(0, Number(pb.paidTotal) || 0);
      var intent = (pb.intent === 'charter' || pb.intent === 'founding') ? pb.intent : 'earn';
      var minMs = hubMinMs(env), minPaid = hubMinPaid(env);
      if (intent === 'earn') {                                  // the free/earned path is gated; paid charters skip the grind (still reviewed)
        var okProg = bestMs >= minMs, okPaid = minPaid > 0 && paid >= minPaid;
        if (!okProg && !okPaid) return json({ error: 'not eligible yet — grow a bigger city or keep supporting', code: 'ineligible', minMs: minMs, minPaid: minPaid, bestMs: bestMs }, 422);
      }
      var arec = {
        token: pb.token, name: cleanName(pb.name || 'A Mayor'), hubName: cleanName(pb.hubName || pb.name || 'New Hub'),
        bestMs: bestMs, bestPop: Math.max(0, Math.floor(Number(pb.bestPop) || 0)), paidTotal: paid,
        patreonUrl: cleanUrl(pb.patreonUrl), note: cleanText(pb.note, 140), intent: intent,
        status: 'pending', ts: Number(pb.ts) || 0
      };
      await env.WORLD.put('app:' + pb.token, JSON.stringify(arec));
      return json({ ok: true, application: arec });
    }
    return json({ error: 'method not allowed' }, 405);
  }

  // ---- ADMIN: list hub applications ----
  if (path === '/v1/admin/apps' && method === 'GET') {
    if (!isAdmin(request, env)) return json({ error: 'admin only' }, 403);
    var apps = await loadApps(env);
    apps.sort(function (a, b) { return ((a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1)) || (b.ts - a.ts); });
    return json({ ok: true, applications: apps, minMs: hubMinMs(env), minPaid: hubMinPaid(env) });
  }

  // ---- ADMIN: approve/reject an application (approve mints a hub owned by the applicant) ----
  if (path === '/v1/admin/apps/decide' && method === 'POST') {
    if (!isAdmin(request, env)) return json({ error: 'admin only' }, 403);
    var db = await request.json().catch(function () { return null; });
    if (!db || !okToken(db.token)) return json({ error: 'bad token' }, 400);
    var app = await env.WORLD.get('app:' + db.token, 'json');
    if (!app) return json({ error: 'no such application' }, 404);
    if (!db.approve) {
      app.status = 'rejected'; app.reason = cleanText(db.reason, 140);
      await env.WORLD.put('app:' + db.token, JSON.stringify(app));
      return json({ ok: true, application: app });
    }
    var dClaims = await loadClaims(env), dHubs = await loadHubs(env);
    var dOcc = occupancy(dClaims, dHubs);
    var lat, lon, converted = false, oldKey = null, di;
    if (db.useCurrentCity !== false) {                          // "hub city upgrade" — turn their existing city INTO the hub
      for (di = 0; di < dClaims.length; di++) if (dClaims[di].token === db.token) {
        var cp = plotOf(dClaims[di].lat, dClaims[di].lon); lat = dClaims[di].lat; lon = dClaims[di].lon; oldKey = cp && cp.key; converted = true; break;
      }
    }
    if (!converted) {
      if (typeof db.lat === 'number' && typeof db.lon === 'number') { lat = db.lat; lon = db.lon; }
      else { var found = autoOpenPlot(dOcc); if (!found) return json({ error: 'no open plot found — pass lat/lon' }, 409); lat = found.lat; lon = found.lon; }
    }
    var tgt = plotOf(lat, lon); if (!tgt) return json({ error: 'bad location' }, 400);
    if (!converted && dOcc[tgt.key]) return json({ error: 'that plot is occupied' }, 409);
    var base = slugify(app.hubName), hubId = base, tries = 0;
    while (dHubs.some(function (h) { return h.hubId === hubId; }) || (await getHub(env, hubId))) { hubId = base + '-' + randStr(3, 'abcdefghijklmnopqrstuvwxyz0123456789'); if (++tries > 6) break; }
    var center = plotCenter(tgt.pi, tgt.pj);
    var tier = Math.max(3, Math.min(5, 3 + Math.max(0, (app.bestMs || 0) - 6)));   // Metropolis(7)→4, Megacity(8)→5
    var hrec = { hubId: hubId, name: app.hubName, ownerToken: db.token, lat: center.lat, lon: center.lon, tier: tier, patreonUrl: app.patreonUrl || '', handle: '', url: '', created: Number(db.ts) || 0 };
    if (converted && oldKey) await env.WORLD.delete('claim:' + oldKey);   // their claim becomes the hub seed
    await env.WORLD.put('hub:' + hubId, JSON.stringify(hrec));
    await env.WORLD.delete('member:' + db.token);                          // ownership now governs their claims (drop any prior membership)
    app.status = 'approved'; app.hubId = hubId;
    await env.WORLD.put('app:' + db.token, JSON.stringify(app));
    return json({ ok: true, application: app, hub: hrec, converted: converted });
  }

  // ---- who am I: my hub membership (client bootstrap) ----
  if (path === '/v1/me' && method === 'GET') {
    var meTok = url.searchParams.get('token');
    if (!okToken(meTok)) return json({ error: 'bad token' }, 400);
    var meHubs = await loadHubs(env);
    var meHubId = await claimerHub(env, meTok, meHubs);
    if (!meHubId) return json({ ok: true, member: false, inviteOnly: inviteOnly(env), hubMinMs: hubMinMs(env) });
    var meHub = await getHub(env, meHubId) || meHubs.filter(function (h) { return h.hubId === meHubId; })[0];
    var owner = !!(meHub && meHub.ownerToken === meTok);
    return json({ ok: true, member: true, owner: owner, hubId: meHubId, hubName: meHub ? meHub.name : meHubId, patreonUrl: meHub ? (meHub.patreonUrl || '') : '', inviteOnly: inviteOnly(env), hubMinMs: hubMinMs(env) });
  }

  // ---- generate an invite code (admin OR the hub's owner token) ----
  if (path === '/v1/hub/code' && method === 'POST') {
    var gb = await request.json().catch(function () { return null; });
    if (!gb || !okHubId(gb.hubId)) return json({ error: 'bad hubId' }, 400);
    var ghub = await getHub(env, gb.hubId);
    if (!ghub) return json({ error: 'no such hub' }, 404);
    var authed = isAdmin(request, env) || (okToken(gb.ownerToken) && gb.ownerToken === ghub.ownerToken);
    if (!authed) return json({ error: 'not authorised for this hub' }, 403);
    var wantCode = gb.code ? normCode(gb.code) : genCode();
    if (!okCode(wantCode)) return json({ error: 'bad code format' }, 400);
    var clash = await env.WORLD.get('code:' + wantCode, 'json');
    if (clash) return json({ error: 'that code already exists' }, 409);
    var crc = {
      code: wantCode, hubId: gb.hubId,
      kind: gb.kind === 'patron' ? 'patron' : 'open',
      max: clampInt(gb.max, 1, 100000, 100), uses: 0, active: true,
      note: cleanText(gb.note, 60), created: Number(gb.ts) || 0
    };
    await env.WORLD.put('code:' + wantCode, JSON.stringify(crc));
    return json({ ok: true, code: crc });
  }

  // ---- public hub info (for the join card): /v1/hub/<hubId> ----
  if (path.indexOf('/v1/hub/') === 0 && method === 'GET') {
    var hid = path.slice('/v1/hub/'.length);
    if (!okHubId(hid)) return json({ error: 'bad hubId' }, 400);
    var phub = await getHub(env, hid);
    if (!phub) return json({ error: 'no such hub' }, 404);
    var pMembers = await loadMembers(env), pClaims = await loadClaims(env);
    var pc = countFor(hid, pMembers, pClaims);
    return json({ ok: true, hub: hubPublic(phub, pc.members, pc.cities) });
  }

  // ---- ADMIN: mint a hub for an influencer ----
  if (path === '/v1/admin/hub' && method === 'POST') {
    if (!isAdmin(request, env)) return json({ error: 'admin only' }, 403);
    var ab = await request.json().catch(function () { return null; });
    if (!ab || typeof ab.name !== 'string' || !ab.name.trim()) return json({ error: 'name required' }, 400);
    if (typeof ab.lat !== 'number' || typeof ab.lon !== 'number') return json({ error: 'lat/lon required' }, 400);
    var aTarget = plotOf(ab.lat, ab.lon);
    if (!aTarget) return json({ error: 'outside the habitable band' }, 400);
    var aClaims = await loadClaims(env), aHubs = await loadHubs(env);
    var aOcc = occupancy(aClaims, aHubs);
    if (aOcc[aTarget.key]) return json({ error: 'that plot is already occupied' }, 409);
    var base = slugify(ab.name), hubId = base, tries = 0;
    while (aHubs.some(function (h) { return h.hubId === hubId; }) || (await getHub(env, hubId))) {
      hubId = base + '-' + randStr(3, 'abcdefghijklmnopqrstuvwxyz0123456789'); if (++tries > 6) break;
    }
    var owner = okToken(ab.ownerToken) ? ab.ownerToken : genToken();
    var aCenter = plotCenter(aTarget.pi, aTarget.pj);
    var hrec = {
      hubId: hubId, name: cleanName(ab.name), ownerToken: owner,
      lat: aCenter.lat, lon: aCenter.lon, tier: clampInt(ab.tier, 2, 5, 3),
      patreonUrl: cleanUrl(ab.patreonUrl), handle: cleanText(ab.handle, 40), url: cleanUrl(ab.url),
      created: Number(ab.ts) || 0
    };
    await env.WORLD.put('hub:' + hubId, JSON.stringify(hrec));
    return json({ ok: true, hub: hrec, ownerToken: owner, plot: aTarget.key });
  }

  // ---- ADMIN: list all hubs (with counts + owner tokens) ----
  if (path === '/v1/admin/hubs' && method === 'GET') {
    if (!isAdmin(request, env)) return json({ error: 'admin only' }, 403);
    var lHubs = await loadHubs(env), lMembers = await loadMembers(env), lClaims = await loadClaims(env);
    var full = lHubs.map(function (h) {
      var n = countFor(h.hubId, lMembers, lClaims);
      var pub = hubPublic(h, n.members, n.cities); pub.ownerToken = h.ownerToken; return pub;
    });
    return json({ ok: true, hubs: full, inviteOnly: inviteOnly(env) });
  }

  // ---- claim a plot (server enforces: open + borders your hub's territory) ----
  if (path === '/v1/claim' && method === 'POST') {
    var b = await request.json().catch(function () { return null; });
    if (!b || !okToken(b.token)) return json({ error: 'bad token' }, 400);
    if (typeof b.lat !== 'number' || typeof b.lon !== 'number') return json({ error: 'bad coordinates' }, 400);
    var target = plotOf(b.lat, b.lon);
    if (!target) return json({ error: 'outside the habitable band' }, 400);

    var claims = await loadClaims(env), hubs = await loadHubs(env);
    var occ = occupancy(claims, hubs);
    if (occ[target.key]) return json({ error: 'that plot is already taken' }, 409);

    var myHub = await claimerHub(env, b.token, hubs);
    if (inviteOnly(env) && !myHub) return json({ error: 'you need an invite code to found a city in the shared world', code: 'need_invite' }, 403);

    var nb = plotNbs(target.pi, target.pj), i, borders = false;
    if (myHub) {                                                  // members grow out of their OWN hub's cluster
      for (i = 0; i < nb.length; i++) { var o = occ[nb[i][0] + ',' + nb[i][1]]; if (o && o.hubId === myHub) { borders = true; break; } }
      if (!borders) return json({ error: 'a new city must border your hub’s territory', code: 'frontier' }, 422);
    } else {                                                      // open mode, unaffiliated: border any connected plot
      var net = connectivity(claims, hubs);
      for (i = 0; i < nb.length; i++) if (net.conn[nb[i][0] + ',' + nb[i][1]]) { borders = true; break; }
      if (!borders) return json({ error: 'beyond the frontier — a new city must border the network', code: 'frontier' }, 422);
    }

    var center = plotCenter(target.pi, target.pj);
    var rec = { token: b.token, name: cleanName(b.name), lat: center.lat, lon: center.lon, tier: 1, hubId: myHub || null, ts: Number(b.ts) || 0 };
    await env.WORLD.put('claim:' + target.key, JSON.stringify(rec));
    return json({ ok: true, city: rec, plot: target.key, hubId: myHub || null });
  }

  // ---- neighbours near a region (for trade discovery) ----
  if (path === '/v1/neighbors' && method === 'GET') {
    var la = parseFloat(url.searchParams.get('lat')), lo = parseFloat(url.searchParams.get('lon'));
    var rad = Math.min(40, Math.max(3, parseFloat(url.searchParams.get('r')) || 18));
    if (isNaN(la) || isNaN(lo)) return json({ error: 'bad coordinates' }, 400);
    var all = SEED_HUBS.concat(await loadHubs(env)).concat(await loadClaims(env));
    var near = all.filter(function (c) {
      var dLon = Math.abs(((c.lon - lo + 540) % 360) - 180);
      return Math.abs(c.lat - la) <= rad && dLon <= rad;
    }).map(function (c) { return { name: c.name, lat: c.lat, lon: c.lon, tier: c.tier || 1, hub: !!c.tier && !c.token, hubId: c.hubId || null }; });
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
export { plotOf, plotCenter, plotNbs, connectivity, occupancy, cleanName, okToken, okCode, normCode, slugify, seedHubId, handle, SEED_HUBS };
