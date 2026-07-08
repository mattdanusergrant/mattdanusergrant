/* mdg-net.js — the shared multiplayer client for Must Design Games ("Master Data Genome").
   One module every online game imports. It hides the backend behind a small interface:

     const net = window.MDGNet;
     await net.connect();                                  // loads supabase-js + anon sign-in
     const m = await net.createMatch({game:'baduk', config:{...}, name:'Matt'});   // host (seat B)
     const m = await net.openMatch(id, {name:'Dad'});      // open a shared link
     m.on(state => render(state));   // {players:{B,W}, moves:[...], status, result}, plus m.myColor
     await m.join('Dad');            // claim the open seat (White)
     await m.move({c,r} | {pass:true} | {resign:true});
     await m.end({winner:'B', reason:'score', ...});

   Backend = Supabase (state-sync schema: game_matches + game_moves + turn-gated RPCs,
   identity via Anonymous Auth). Swappable: set window.__MDG_ADAPTER for tests/offline.
   Games never touch Supabase directly, so changing backends = changing one adapter.

   Also exposes a second pattern for N-player party games (word-pounce):
     const db = window.MDGNet.roomDb();   // firebase-compat–shaped database() over game_rooms
   ref/child/set/update/remove/get/on/off/transaction/onDisconnect — same interface the
   game already spoke to Firebase, so the game logic is unchanged. Test backend via
   window.__MDG_ROOM_BACKEND. */
(function(){
  "use strict";

  // ── Config: "Move Delivery Gears" Supabase project (the realtime multiplayer backend).
  //    The publishable key is client-safe by design — meant to ship in the page. ──
  const SUPABASE_URL  = "https://xryvcqrobipogjaxtnpw.supabase.co";
  const SUPABASE_ANON = "sb_publishable_40l9LJrrmY32-9dd3KLNdA_B_Yi6oy9";   // publishable key (public-safe)
  const SUPABASE_LIB  = "https://esm.sh/@supabase/supabase-js@2";

  const BLACK=1, WHITE=2;
  const seatOf = c => c===BLACK ? "B" : c===WHITE ? "W" : null;
  const colorOfSeat = s => s==="B" ? BLACK : s==="W" ? WHITE : 0;

  let connState="idle", connCbs=[];
  function setConn(s){ if(s===connState) return; connState=s; connCbs.forEach(cb=>{try{cb(s);}catch(e){}}); }
  function keySet(){ return SUPABASE_ANON.indexOf("REPLACE_ME")!==0; }

  // One Supabase client, shared by the match adapter and the room API.
  let _sbP=null;
  function ensureClient(){
    if(_sbP) return _sbP;
    if(!keySet()){ setConn("offline"); return _sbP=Promise.reject(new Error("anon key not set")); }
    _sbP = (async ()=>{ const { createClient } = await import(SUPABASE_LIB);
      return createClient(SUPABASE_URL, SUPABASE_ANON, { auth:{ persistSession:true, autoRefreshToken:true } }); })();
    return _sbP;
  }

  /* ── Supabase adapter (turn-based matches — needs a signed-in identity) ──── */
  function supabaseAdapter(){
    let sb=null, uid=null;
    return {
      get uid(){ return uid; },
      async ready(){
        if(sb && uid) return true;
        sb = await ensureClient();
        const { data:{ user } } = await sb.auth.getUser().catch(()=>({data:{}}));
        if(!user){ setConn("offline"); throw new Error("sign in first"); }   // accounts required — no anonymous
        uid = user.id; setConn("online"); return true;
      },
      async createMatch(game, config, name){
        const { data, error } = await sb.rpc("mdg_create_game", { p_game:game, p_config:config||{}, p_name:name||null });
        if(error) throw error; return data;
      },
      async getMatch(id){ const { data, error } = await sb.from("game_matches").select("*").eq("id",id).maybeSingle(); if(error) throw error; return data; },
      async joinMatch(id, name){ const { data, error } = await sb.rpc("mdg_join_game", { p_id:id, p_name:name||null }); if(error) throw error; return data; },
      async move(id, ply, mv){ const { data, error } = await sb.rpc("mdg_move", { p_id:id, p_ply:ply, p_move:mv }); if(error) throw error; return data; },
      async end(id, result){ const { error } = await sb.rpc("mdg_end_game", { p_id:id, p_result:result||null }); if(error) throw error; },
      async loadMoves(id){ const { data, error } = await sb.from("game_moves").select("ply,seat,move").eq("match_id",id).order("ply"); if(error) throw error; return (data||[]).map(r=>r.move); },
      subscribe(id, onChange){
        const ch = sb.channel("m-"+id)
          .on("postgres_changes",{event:"*",schema:"public",table:"game_moves",filter:"match_id=eq."+id}, onChange)
          .on("postgres_changes",{event:"*",schema:"public",table:"game_matches",filter:"id=eq."+id}, onChange)
          .subscribe(st=>{ if(st==="SUBSCRIBED") setConn("online"); else if(st==="CHANNEL_ERROR"||st==="TIMED_OUT") setConn("offline"); });
        return ()=>{ try{ sb.removeChannel(ch); }catch(e){} };
      },
    };
  }

  /* ── Match handle (backend-agnostic) ───────────────────────────────────── */
  function makeMatch(adapter, id){
    let listeners=[], unsub=null, state={players:{},moves:[],status:"waiting",result:null};
    const m = {
      id, get url(){ return location.origin+location.pathname+"?g="+id; },
      get myColor(){ const p=state.players||{};
        return (p.B&&p.B.uid===adapter.uid)?BLACK : (p.W&&p.W.uid===adapter.uid)?WHITE : 0; },
      get state(){ return state; },
      on(cb){ listeners.push(cb); if(state) cb(state, m); return m; },
      async join(name){ const row=await adapter.joinMatch(id,name); applyRow(row); await refresh(); },
      async move(mv){ try{ await adapter.move(id, state.moves.length, mv); }catch(e){ /* stale/not-your-turn → a fresh push resyncs us */ await refresh(); throw e; } },
      async end(result){ await adapter.end(id, result); },
      close(){ if(unsub) unsub(); listeners=[]; },
    };
    function applyRow(row){ if(!row) return;
      state.players={ B: row.seat_b?{uid:row.seat_b,name:row.name_b}:null, W: row.seat_w?{uid:row.seat_w,name:row.name_w}:null };
      state.status=row.status; state.result=row.result||null; }
    async function refresh(){
      const [row, moves] = await Promise.all([adapter.getMatch(id), adapter.loadMoves(id)]);
      applyRow(row); state.moves=moves||[];
      listeners.forEach(cb=>{ try{ cb(state, m); }catch(e){} });
    }
    m._start = async ()=>{ unsub = adapter.subscribe(id, ()=>refresh()); await refresh(); return m; };
    return m;
  }

  /* ── Room documents (N-player party games) ─────────────────────────────────
     A second pattern for games that aren't 2-seat/turn-based (word-pounce): one
     mutable jsonb doc per room, every client subscribes. To keep the game code
     untouched, roomDb() returns an object shaped exactly like firebase-compat's
     database() — ref/child/set/update/remove/get/on/off/transaction/onDisconnect —
     so the same game logic runs on Firebase, the in-memory solo mock, or Supabase. */
  function supabaseRoomBackend(){
    let sb=null;
    async function client(){ return sb || (sb = await ensureClient()); }
    return {
      async getRoom(code){ const c=await client(); const { data } = await c.from("game_rooms").select("doc").eq("code",code.toUpperCase()).maybeSingle(); return data?data.doc:null; },
      async createRoom(code, game, doc){ const c=await client(); const { data, error } = await c.rpc("mdg_room_create",{p_code:code,p_game:game||"word-pounce",p_doc:doc||{}}); if(error) throw error; return data; },
      async setPath(code, path, val){ const c=await client(); const { data, error } = await c.rpc("mdg_room_set",{p_code:code,p_path:path,p_val:val===undefined?null:val}); if(error) throw error; return data; },
      async updatePatch(code, base, patch){ const c=await client(); const { data, error } = await c.rpc("mdg_room_update",{p_code:code,p_base:base,p_patch:patch}); if(error) throw error; return data; },
      async claim(code, path, val){ const c=await client(); const { data, error } = await c.rpc("mdg_room_claim",{p_code:code,p_path:path,p_val:val}); if(error) throw error; return data; },
      async subscribe(code, onDoc){ const c=await client();
        const ch=c.channel("room-"+code).on("postgres_changes",{event:"*",schema:"public",table:"game_rooms",filter:"code=eq."+code.toUpperCase()},
          p=>{ if(p.new&&p.new.doc) onDoc(p.new.doc); }).subscribe(st=>{ if(st==="SUBSCRIBED") setConn("online"); });
        return ()=>{ try{ c.removeChannel(ch); }catch(e){} }; },
    };
  }

  const seg = k => String(k).split("/").filter(Boolean);
  const getPath = (doc, path) => { let n=doc; for(const k of path){ if(n==null) return null; n=n[k]; } return n===undefined?null:n; };
  const cloneJ = v => v==null?v:JSON.parse(JSON.stringify(v));
  function mkSnap(v){ return { exists:()=>v!=null, val:()=>cloneJ(v), child:k=>mkSnap(getPath(v, seg(k))) }; }
  const isPrefix = (a,b)=>{ const n=Math.min(a.length,b.length); for(let i=0;i<n;i++) if(a[i]!==b[i]) return false; return true; };

  function makeRoomDb(backend){
    const rooms={};                                   // code → {doc, listeners:[{path,cb}], sub, subP}
    const roomOf = code => rooms[code] || (rooms[code]={doc:null,listeners:[],sub:null,subP:null});
    const fireAll = code => { const R=rooms[code]; if(R) R.listeners.slice().forEach(L=>{ try{ L.cb(mkSnap(getPath(R.doc,L.path))); }catch(e){} }); };
    async function ensureSub(code){ const R=roomOf(code); if(R.sub) return;
      if(!R.subP) R.subP=(async()=>{ R.sub=await backend.subscribe(code, doc=>{ R.doc=doc; fireAll(code); }); })();
      await R.subP; }
    const unloaders=[];
    if(typeof window!=="undefined") window.addEventListener("pagehide",()=>{ unloaders.forEach(fn=>{ try{fn();}catch(e){} }); });

    function ref(segs){
      const code=segs[1], path=segs.slice(2);           // segs = ['rooms', CODE, ...]
      return {
        child(k){ return ref(segs.concat(seg(k))); },
        async set(v){ const doc = path.length? await backend.setPath(code,path,v) : await backend.createRoom(code, undefined, v);
          roomOf(code).doc=doc; fireAll(code); },
        async update(o){ const doc=await backend.updatePatch(code, path, o); roomOf(code).doc=doc; fireAll(code); },
        async remove(){ const doc=await backend.setPath(code,path,null); roomOf(code).doc=doc; fireAll(code); },
        async get(){ const R=roomOf(code); if(R.doc==null && !R.sub) R.doc=await backend.getRoom(code); return mkSnap(getPath(R.doc,path)); },
        on(ev,cb){ if(ev!=="value") return cb; const R=roomOf(code); R.listeners.push({path,cb});
          (async()=>{ await ensureSub(code); if(R.doc==null) R.doc=await backend.getRoom(code); cb(mkSnap(getPath(R.doc,path))); })();
          return cb; },
        off(){ const R=rooms[code]; if(!R) return; R.listeners=R.listeners.filter(L=>!isPrefix(path,L.path));
          if(!R.listeners.length && R.sub){ R.sub(); R.sub=null; R.subP=null; } },
        onDisconnect(){ return { remove(){ unloaders.push(()=>{ backend.setPath(code,path,null).catch(()=>{}); }); return Promise.resolve(); } }; },
        async transaction(fn){ const proposed=fn(null); const R=roomOf(code);
          if(proposed===undefined) return { committed:false, snapshot:mkSnap(getPath(R.doc,path)) };
          const res=await backend.claim(code,path,proposed);
          if(res && res.doc){ R.doc=res.doc; fireAll(code); }
          return { committed:!!(res&&res.committed), snapshot:mkSnap(res?res.value:null) }; },
      };
    }
    return { ref(p){ return ref(seg(p)); } };
  }

  /* ── Accounts + wallet (Wagering Arena Phase 1) ────────────────────────────
     Real accounts (email + Google) over the same shared client; every session —
     including the anonymous fallback used for casual play — gets a profile + a
     play-money chip wallet (1000 to start, +10/day). Mock via window.__MDG_AUTH. */
  function realAuth(){
    const self = {
      async _sb(){ return ensureClient(); },
      async user(){ const c=await self._sb(); const { data } = await c.auth.getUser().catch(()=>({data:{}})); return (data&&data.user)||null; },
      async signInWithGoogle(){ const c=await self._sb(); const u=await self.user();
        // If we're anonymous, LINK so existing chips/games carry over; else plain OAuth.
        if(u&&u.is_anonymous) return c.auth.linkIdentity({ provider:"google", options:{ redirectTo:location.href } });
        return c.auth.signInWithOAuth({ provider:"google", options:{ redirectTo:location.href } }); },
      async signInWithOtp(email){ const c=await self._sb(); return c.auth.signInWithOtp({ email, options:{ emailRedirectTo:location.href } }); },
      async signInWithPassword(email,password){ const c=await self._sb(); return c.auth.signInWithPassword({ email, password }); },
      async signUp(email,password){ const c=await self._sb(); return c.auth.signUp({ email, password }); },
      async signOut(){ const c=await self._sb(); return c.auth.signOut(); },
      async onAuth(cb){ const c=await self._sb(); c.auth.onAuthStateChange((_e,s)=>cb(s?s.user:null)); cb(await self.user()); },
      async wallet(){ const c=await self._sb(); const { data, error } = await c.rpc("mdg_wallet"); if(error) throw error; return data; },
      async claimDaily(){ const c=await self._sb(); const { data, error } = await c.rpc("mdg_claim_daily"); if(error) throw error; return data; },
      async setName(name){ const c=await self._sb(); const { data, error } = await c.rpc("mdg_set_name",{ p_name:name }); if(error) throw error; return data; },
      async watchWallet(onChange){ const c=await self._sb(); const u=await self.user(); if(!u) return ()=>{};
        const ch=c.channel("wallet-"+u.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"wallet_ledger",filter:"uid=eq."+u.id},()=>onChange()).subscribe();
        return ()=>{ try{ c.removeChannel(ch); }catch(e){} }; },
    };
    return self;
  }
  let authInst=null;
  function pickAuth(){ return window.__MDG_AUTH || (authInst || (authInst=realAuth())); }

  /* ── Public API ────────────────────────────────────────────────────────── */
  let adapter=null;
  function pickAdapter(){ return window.__MDG_ADAPTER || (adapter || (adapter=supabaseAdapter())); }
  function pickRoomBackend(){ return window.__MDG_ROOM_BACKEND || supabaseRoomBackend(); }

  window.MDGNet = {
    BLACK, WHITE, seatOf, colorOfSeat,
    get online(){ return connState==="online"; },
    get connState(){ return connState; },
    onConn(cb){ connCbs.push(cb); cb(connState); },
    async connect(){ try{ await pickAdapter().ready(); return true; }catch(e){ setConn("offline"); return false; } },
    async createMatch({game, config, name}){
      const a=pickAdapter(); await a.ready();
      const row=await a.createMatch(game, config||{}, name);
      return makeMatch(a, row.id)._start();
    },
    async openMatch(id, opts){
      const a=pickAdapter(); await a.ready();
      return makeMatch(a, id)._start();
    },
    // Room API — is online multiplayer configured, and a firebase-shaped db for it.
    roomsAvailable(){ return !!window.__MDG_ROOM_BACKEND || keySet(); },
    roomDb(){ return makeRoomDb(pickRoomBackend()); },
    // Accounts + wallet.
    accountsAvailable(){ return !!window.__MDG_AUTH || keySet(); },
    get auth(){ return pickAuth(); },
  };
})();
