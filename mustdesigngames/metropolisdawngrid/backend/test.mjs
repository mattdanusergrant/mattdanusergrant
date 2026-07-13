// Dependency-free test harness for the shared-world Worker.
// Mocks KV (a Map) + uses Node 22's global Request/Response/URL. `node test.mjs`.
import { handle, plotOf, plotCenter, plotNbs, seedHubId, SEED_HUBS } from './worker.js';

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
    delete: async (k) => { m.delete(k); },
    list: async ({ prefix = '', limit = 1000 } = {}) => ({
      keys: [...m.keys()].filter((k) => k.startsWith(prefix)).slice(0, limit).map((name) => ({ name })),
      list_complete: true, cursor: null
    })
  };
}
const ADMIN = 'test-admin-secret';
// env(opts): { inviteOnly=true, admin=true }
const env = (opts = {}) => {
  const e = { WORLD: makeKV() };
  if (opts.admin !== false) e.ADMIN_KEY = ADMIN;
  e.WORLD_INVITE_ONLY = opts.inviteOnly === false ? 'false' : 'true';
  return e;
};
const req = (method, path, body, headers) => new Request('https://x' + path, {
  method,
  headers: Object.assign(body ? { 'Content-Type': 'application/json' } : {}, headers || {}),
  body: body ? JSON.stringify(body) : undefined
});
const call = async (e, method, path, body, headers) => { const r = await handle(req(method, path, body, headers), e); return { status: r.status, body: await r.json().catch(() => null) }; };
const admGet = async (e, path) => call(e, 'GET', path, null, { Authorization: 'Bearer ' + ADMIN });
const admPost = async (e, path, body) => call(e, 'POST', path, body, { Authorization: 'Bearer ' + ADMIN });

const TOKEN = 'testdevicetoken001';

(async () => {
  // ---- health ----
  { const e = env(); const r = await call(e, 'GET', '/'); eq(r.status, 200, 'GET / health'); eq(r.body.service, 'mdg-world', 'health names the service'); eq(r.body.inviteOnly, true, 'health reports invite-only default'); }

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
    if (w.body.cities.every((c) => c.hubId)) ok('seed cities carry a hubId'); else fail('a seed city lacks a hubId');
  }

  // ---- OPEN MODE: claim adjacency + chain rule (legacy behaviour, invite gate off) ----
  {
    const e = env({ inviteOnly: false });
    const hub = SEED_HUBS[0]; const hp = plotOf(hub.lat, hub.lon);
    const nb = plotNbs(hp.pi, hp.pj)[0]; const c1 = plotCenter(nb[0], nb[1]);
    const claim1 = await call(e, 'POST', '/v1/claim', { token: TOKEN, name: 'Frontier One', lat: c1.lat, lon: c1.lon, ts: 1 });
    eq(claim1.status, 200, 'open mode: claim bordering a hub → ok'); eq(claim1.body.city.name, 'Frontier One', 'claim keeps the name');

    const dup = await call(e, 'POST', '/v1/claim', { token: TOKEN, name: 'Dup', lat: c1.lat, lon: c1.lon });
    eq(dup.status, 409, 'claiming a taken plot → 409');

    const far = await call(e, 'POST', '/v1/claim', { token: TOKEN, name: 'Nowhere', lat: 0.7, lon: 1.3 });
    eq(far.status, 422, 'claim beyond the frontier → 422');

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
      eq(claim2.status, 200, 'CHAIN RULE: claim bordering only the new city → ok');
    } else { ok('chain-plot geometry unavailable in this layout — skipping chain assertion'); }

    const w2 = await call(e, 'GET', '/v1/world');
    const owned = w2.body.cities.filter((c) => c.owner === TOKEN).length;
    if (owned >= 1) ok('shared world now shows ' + owned + ' player-claimed cities'); else fail('claims not visible in /world');

    const hp2 = plotOf(SEED_HUBS[1].lat, SEED_HUBS[1].lon); const nb2 = plotNbs(hp2.pi, hp2.pj)[0]; const c3 = plotCenter(nb2[0], nb2[1]);
    const evil = await call(e, 'POST', '/v1/claim', { token: TOKEN, name: '<script>alert(1)</script>', lat: c3.lat, lon: c3.lon });
    if (evil.status === 200 && !/[<>]/.test(evil.body.city.name)) ok('claim name is sanitised (' + evil.body.city.name + ')'); else fail('name not sanitised: ' + JSON.stringify(evil.body));

    const noTok = await call(e, 'POST', '/v1/claim', { name: 'x', lat: 0, lon: 0 }); eq(noTok.status, 400, 'claim without a token → 400');
  }

  // ======================= HUB-PLAYER SYSTEM =======================

  // ---- admin auth is required to mint a hub ----
  {
    const e = env();
    const h = SEED_HUBS[2]; const hp = plotOf(h.lat, h.lon); const nb = plotNbs(hp.pi, hp.pj)[0]; const c = plotCenter(nb[0], nb[1]);
    const noAuth = await call(e, 'POST', '/v1/admin/hub', { name: 'City Planner Plays', lat: c.lat, lon: c.lon });
    eq(noAuth.status, 403, 'minting a hub without admin auth → 403');
    const badAuth = await call(e, 'POST', '/v1/admin/hub', { name: 'X', lat: c.lat, lon: c.lon }, { Authorization: 'Bearer wrong' });
    eq(badAuth.status, 403, 'wrong admin key → 403');
  }

  // ---- full flow: mint hub → generate code → redeem → member grows the hub territory ----
  {
    const e = env();   // invite-only (default)
    // pick an OPEN plot bordering a seed hub for City Planner Plays' hub
    const seed = SEED_HUBS[3]; const sp = plotOf(seed.lat, seed.lon);
    const hubNb = plotNbs(sp.pi, sp.pj).find((n) => (n[0] + ',' + n[1]) !== sp.key);
    const hubCenter = plotCenter(hubNb[0], hubNb[1]);

    const mint = await admPost(e, '/v1/admin/hub', { name: 'City Planner Plays', lat: hubCenter.lat, lon: hubCenter.lon, patreonUrl: 'https://patreon.com/cityplannerplays', handle: '@CityPlannerPlays', tier: 4 });
    eq(mint.status, 200, 'admin mints a hub → ok');
    const hubId = mint.body.hub.hubId, ownerToken = mint.body.ownerToken;
    if (hubId && /^city-planner-plays/.test(hubId)) ok('hub gets a readable hubId (' + hubId + ')'); else fail('bad hubId: ' + hubId);
    if (okTokenish(ownerToken)) ok('hub mint returns an owner token'); else fail('no owner token: ' + ownerToken);
    eq(mint.body.hub.patreonUrl, 'https://patreon.com/cityplannerplays', 'hub keeps its Patreon URL');

    // hub is now visible in the world + public directory
    const world = await call(e, 'GET', '/v1/world');
    const hubCity = world.body.cities.find((c) => c.hubId === hubId);
    if (hubCity && hubCity.human) ok('the hub appears in /v1/world as a human hub'); else fail('hub missing from world');
    const dir = await call(e, 'GET', '/v1/hubs');
    if (dir.body.hubs.some((h) => h.hubId === hubId)) ok('the hub appears in the public directory'); else fail('hub missing from /v1/hubs');
    if (!JSON.stringify(dir.body).includes(ownerToken)) ok('public directory does NOT leak owner tokens'); else fail('owner token leaked in /v1/hubs');

    // owner self-serves an OPEN code + a PATRON code
    const oc = await call(e, 'POST', '/v1/hub/code', { hubId, ownerToken, kind: 'open', max: 50, note: 'YouTube pinned comment' });
    eq(oc.status, 200, 'hub owner generates an open code'); const openCode = oc.body.code.code;
    const pc = await admPost(e, '/v1/hub/code', { hubId, kind: 'patron', code: 'CPPGOLD', note: 'patrons only' });
    eq(pc.status, 200, 'admin generates a patron code'); eq(pc.body.code.kind, 'patron', 'patron code is flagged patron'); eq(pc.body.code.code, 'CPPGOLD', 'custom code is honoured (uppercased)');

    // a code cannot be generated by a stranger
    const stranger = await call(e, 'POST', '/v1/hub/code', { hubId, ownerToken: 'not-the-owner-000', kind: 'open' });
    eq(stranger.status, 403, 'a non-owner cannot mint codes for the hub');
    // duplicate custom code rejected
    const dupCode = await admPost(e, '/v1/hub/code', { hubId, code: 'CPPGOLD' });
    eq(dupCode.status, 409, 'duplicate code → 409');

    // an un-affiliated player CANNOT claim in invite-only mode
    const MEMBER = 'memberdevicetoken01';
    const nearHub = plotNbs(plotOf(hubCenter.lat, hubCenter.lon).pi, plotOf(hubCenter.lat, hubCenter.lon).pj).find((n) => {
      const k = n[0] + ',' + n[1]; return k !== sp.key;   // an open plot beside the hub, not the seed
    });
    const nearCenter = plotCenter(nearHub[0], nearHub[1]);
    const blocked = await call(e, 'POST', '/v1/claim', { token: MEMBER, name: 'Sneaky', lat: nearCenter.lat, lon: nearCenter.lon });
    eq(blocked.status, 403, 'invite-only: a stranger cannot claim (need_invite)'); eq(blocked.body.code, 'need_invite', 'block reason is need_invite');

    // redeem the open code → now a member of the hub
    const bad = await call(e, 'POST', '/v1/redeem', { token: MEMBER, code: 'NOPEEE' });
    eq(bad.status, 404, 'redeeming an unknown code → 404');
    const red = await call(e, 'POST', '/v1/redeem', { token: MEMBER, code: openCode.toLowerCase() });   // codes are case-insensitive
    eq(red.status, 200, 'redeeming a valid code → ok'); eq(red.body.hubId, hubId, 'redeem joins the right hub'); eq(red.body.patreonUrl, 'https://patreon.com/cityplannerplays', 'redeem surfaces the Patreon URL');

    // /v1/me reflects membership
    const me = await call(e, 'GET', '/v1/me?token=' + MEMBER);
    eq(me.body.member, true, '/v1/me shows the player is now a member'); eq(me.body.hubId, hubId, '/v1/me names the hub');

    // member can now claim a plot bordering the HUB's territory, tagged with the hubId
    const claim = await call(e, 'POST', '/v1/claim', { token: MEMBER, name: 'Plannerville', lat: nearCenter.lat, lon: nearCenter.lon });
    eq(claim.status, 200, 'member claims a plot bordering the hub → ok'); eq(claim.body.hubId, hubId, 'the new city inherits the hub territory');

    // member CANNOT claim way out near a DIFFERENT seed hub (not their hub territory)
    const other = SEED_HUBS[5]; const op = plotOf(other.lat, other.lon); const onb = plotNbs(op.pi, op.pj)[0]; const oc2 = plotCenter(onb[0], onb[1]);
    const wrongTerr = await call(e, 'POST', '/v1/claim', { token: MEMBER, name: 'Faraway', lat: oc2.lat, lon: oc2.lon });
    eq(wrongTerr.status, 422, 'member cannot claim outside their hub territory (frontier)'); eq(wrongTerr.body.code, 'frontier', 'reason is frontier');

    // the hub territory now grew: directory shows 1 member + 1 city
    const dir2 = await call(e, 'GET', '/v1/hubs');
    const mine = dir2.body.hubs.find((h) => h.hubId === hubId);
    eq(mine.members, 1, 'directory counts the member'); eq(mine.cities, 1, 'directory counts the founded city');

    // a SECOND member chains off the first member's city (territory keeps growing)
    const M2 = 'member2devicetoken0';
    await call(e, 'POST', '/v1/redeem', { token: M2, code: 'CPPGOLD' });
    const claimedPlot = plotOf(nearCenter.lat, nearCenter.lon);
    const grow = plotNbs(claimedPlot.pi, claimedPlot.pj).find((n) => {
      const k = n[0] + ',' + n[1];
      return k !== sp.key && k !== plotOf(hubCenter.lat, hubCenter.lon).key;
    });
    const growCenter = plotCenter(grow[0], grow[1]);
    const claim2 = await call(e, 'POST', '/v1/claim', { token: M2, name: 'Second Suburb', lat: growCenter.lat, lon: growCenter.lon });
    eq(claim2.status, 200, 'a second member grows the hub cluster further out'); eq(claim2.body.hubId, hubId, 'chained city still belongs to the hub');

    // patron-code use is capped
    const capHub = await admPost(e, '/v1/hub/code', { hubId, code: 'ONETIME', max: 1 });
    eq(capHub.status, 200, 'created a single-use code');
    await call(e, 'POST', '/v1/redeem', { token: 'capuser0000001', code: 'ONETIME' });
    const spent = await call(e, 'POST', '/v1/redeem', { token: 'capuser0000002', code: 'ONETIME' });
    eq(spent.status, 409, 'a single-use code is spent after one redemption'); eq(spent.body.code, 'code_spent', 'reason is code_spent');

    // can't be in two hubs: mint a 2nd hub, its code, try to redeem as an existing member
    const seed2 = SEED_HUBS[6]; const s2p = plotOf(seed2.lat, seed2.lon);
    const h2nb = plotNbs(s2p.pi, s2p.pj).find((n) => (n[0] + ',' + n[1]) !== s2p.key); const h2c = plotCenter(h2nb[0], h2nb[1]);
    const mint2 = await admPost(e, '/v1/admin/hub', { name: 'Biffa Plays', lat: h2c.lat, lon: h2c.lon });
    const code2 = (await admPost(e, '/v1/hub/code', { hubId: mint2.body.hub.hubId, code: 'BIFFA1' })).body.code.code;
    const twoHubs = await call(e, 'POST', '/v1/redeem', { token: MEMBER, code: code2 });
    eq(twoHubs.status, 409, 'a player already in a hub cannot join a second'); eq(twoHubs.body.code, 'other_hub', 'reason is other_hub');
  }

  // ---- HUB APPLICATIONS: earn / gate / approve → hub, plus "upgrade my city" ----
  {
    const e = env();   // invite-only, HUB_MIN_MS default 7 (Metropolis)
    const LOW = 'lowmayordevice001';   // a small-town mayor
    const under = await call(e, 'POST', '/v1/apply', { token: LOW, hubName: 'Tinyville', bestMs: 3, bestPop: 900 });
    eq(under.status, 422, 'a low-tier city cannot apply for a hub'); eq(under.body.code, 'ineligible', 'reason is ineligible'); eq(under.body.minMs, 7, 'gate names the required milestone');

    // a Metropolis mayor with a claimed city applies
    const BIG = 'bigmayordevice0001';
    // give them a claim first (open mode not needed — seed an admin hub they can border? simpler: claim in open mode via a temp env is messy).
    // Instead: place their claim by minting via redeem into an existing hub, then applying to upgrade.
    const seed = SEED_HUBS[4]; const sp = plotOf(seed.lat, seed.lon);
    const hnb = plotNbs(sp.pi, sp.pj).find((n) => (n[0] + ',' + n[1]) !== sp.key); const hc = plotCenter(hnb[0], hnb[1]);
    const host = await admPost(e, '/v1/admin/hub', { name: 'Host Hub', lat: hc.lat, lon: hc.lon });
    const hostId = host.body.hub.hubId;
    const hostCode = (await admPost(e, '/v1/hub/code', { hubId: hostId, code: 'HOST01' })).body.code.code;
    await call(e, 'POST', '/v1/redeem', { token: BIG, code: hostCode });
    // BIG claims a city bordering Host Hub
    const bignb = plotNbs(plotOf(hc.lat, hc.lon).pi, plotOf(hc.lat, hc.lon).pj).find((n) => (n[0] + ',' + n[1]) !== sp.key);
    const bigc = plotCenter(bignb[0], bignb[1]);
    const bigClaim = await call(e, 'POST', '/v1/claim', { token: BIG, name: 'Grandopolis', lat: bigc.lat, lon: bigc.lon });
    eq(bigClaim.status, 200, 'the aspiring mayor first founds a city under an existing hub');

    const apply = await call(e, 'POST', '/v1/apply', { token: BIG, name: 'Grand Mayor', hubName: 'Grandopolis Hub', bestMs: 7, bestPop: 20000, patreonUrl: 'https://patreon.com/grand', note: 'huge city' });
    eq(apply.status, 200, 'a Metropolis mayor CAN apply'); eq(apply.body.application.status, 'pending', 'the application is pending');

    const mine = await call(e, 'GET', '/v1/apply?token=' + BIG);
    eq(mine.body.application.hubName, 'Grandopolis Hub', 'the applicant can read their pending application back');

    const adminList = await admGet(e, '/v1/admin/apps');
    if (adminList.body.applications.some((a) => a.token === BIG && a.status === 'pending')) ok('the application shows in the admin queue'); else fail('application missing from admin queue');
    const listNoAuth = await call(e, 'GET', '/v1/admin/apps'); eq(listNoAuth.status, 403, 'the admin queue needs admin auth');

    // approve → "upgrade the city into a hub": their claim plot becomes the hub, owned by them
    const bigPlotKey = plotOf(bigc.lat, bigc.lon).key;
    const decide = await admPost(e, '/v1/admin/apps/decide', { token: BIG, approve: true, useCurrentCity: true });
    eq(decide.status, 200, 'admin approves the application'); eq(decide.body.converted, true, 'their city was UPGRADED into the hub');
    const newHubId = decide.body.hub.hubId;
    eq(decide.body.hub.ownerToken, BIG, 'the applicant now OWNS the new hub');
    eq(decide.body.hub.tier, 4, 'a Metropolis mayor’s hub starts at tier 4');

    // /v1/me now reports them as a hub OWNER
    const bigMe = await call(e, 'GET', '/v1/me?token=' + BIG);
    eq(bigMe.body.owner, true, 'the new hub player is recognised as an owner'); eq(bigMe.body.hubId, newHubId, '/v1/me names their hub');

    // the old claim at that plot is gone (converted), the hub occupies it
    const worldNow = await call(e, 'GET', '/v1/world');
    const asClaim = worldNow.body.cities.filter((c) => c.owner === BIG && !c.hub).length;
    const asHub = worldNow.body.cities.filter((c) => c.hubId === newHubId && c.human).length;
    if (asClaim === 0 && asHub === 1) ok('the plot is now a HUB, not a plain claim'); else fail('conversion left a stray claim (claim=' + asClaim + ', hub=' + asHub + ')');

    // the new owner can now mint invite codes for THEIR community
    const ownerCode = await call(e, 'POST', '/v1/hub/code', { hubId: newHubId, ownerToken: BIG, kind: 'open' });
    eq(ownerCode.status, 200, 'the freshly-minted hub player can generate invite codes');

    // applying again is refused — already a hub
    const again = await call(e, 'POST', '/v1/apply', { token: BIG, hubName: 'Another', bestMs: 8 });
    eq(again.status, 409, 'an existing hub owner cannot apply again'); eq(again.body.code, 'already_hub', 'reason is already_hub');

    // a PAID charter bypasses the progress gate (still pending review)
    const CHARTER = 'charterbuyerdev01';
    const charter = await call(e, 'POST', '/v1/apply', { token: CHARTER, hubName: 'Bought Hub', bestMs: 2, intent: 'charter' });
    eq(charter.status, 200, 'a paid charter application bypasses the progress gate'); eq(charter.body.application.intent, 'charter', 'the charter intent is recorded');

    // reject path
    const REJ = 'rejectmedevice001';
    await call(e, 'POST', '/v1/apply', { token: REJ, hubName: 'Nope Hub', bestMs: 7 });
    const rej = await admPost(e, '/v1/admin/apps/decide', { token: REJ, approve: false, reason: 'too close to another hub' });
    eq(rej.body.application.status, 'rejected', 'admin can reject an application'); eq(rej.body.application.reason, 'too close to another hub', 'the rejection reason is stored');

    // approve WITHOUT a current city → auto-places a hub on an open frontier plot
    const NOCITY = 'nocitymayordev001';
    await call(e, 'POST', '/v1/apply', { token: NOCITY, hubName: 'Fresh Hub', bestMs: 8, bestPop: 40000 });
    const autop = await admPost(e, '/v1/admin/apps/decide', { token: NOCITY, approve: true });
    eq(autop.status, 200, 'approving a mayor with no claim auto-places their hub'); eq(autop.body.converted, false, 'auto-placed (not a conversion)'); eq(autop.body.hub.tier, 5, 'a Megacity mayor’s hub starts at tier 5');
  }

  // ---- admin cannot mint a hub on an occupied plot ----
  {
    const e = env();
    const seed = SEED_HUBS[0]; const sp = plotOf(seed.lat, seed.lon);
    const onHub = await admPost(e, '/v1/admin/hub', { name: 'Overlap', lat: seed.lat, lon: seed.lon });
    eq(onHub.status, 409, 'minting a hub onto a seed-hub plot → 409');
  }

  // ---- CORS preflight includes Authorization ----
  { const e = env(); const r = await handle(req('OPTIONS', '/v1/claim'), e); eq(r.status, 204, 'OPTIONS preflight → 204'); if (/Authorization/i.test(r.headers.get('Access-Control-Allow-Headers') || '')) ok('CORS allows the Authorization header'); else fail('CORS missing Authorization'); }

  console.log(fails ? '\nRESULT: ' + fails + ' FAILURES' : '\nRESULT: ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('harness error:', e); process.exit(2); });

function okTokenish(t) { return typeof t === 'string' && /^[A-Za-z0-9_-]{12,64}$/.test(t); }
