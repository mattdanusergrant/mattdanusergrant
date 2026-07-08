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
   Games never touch Supabase directly, so changing backends = changing one adapter. */
(function(){
  "use strict";

  // ── Config (public-safe: the anon key is meant to ship in client code) ──
  const SUPABASE_URL  = "https://hprivaysbttdqgebbjio.supabase.co";
  const SUPABASE_ANON = "REPLACE_ME_GAMES_ANON_KEY";   // paste the "Games" project anon key
  const SUPABASE_LIB  = "https://esm.sh/@supabase/supabase-js@2";

  const BLACK=1, WHITE=2;
  const seatOf = c => c===BLACK ? "B" : c===WHITE ? "W" : null;
  const colorOfSeat = s => s==="B" ? BLACK : s==="W" ? WHITE : 0;

  let connState="idle", connCbs=[];
  function setConn(s){ if(s===connState) return; connState=s; connCbs.forEach(cb=>{try{cb(s);}catch(e){}}); }

  /* ── Supabase adapter ──────────────────────────────────────────────────── */
  function supabaseAdapter(){
    let sb=null, uid=null;
    return {
      get uid(){ return uid; },
      async ready(){
        if(sb) return true;
        if(SUPABASE_ANON.indexOf("REPLACE_ME")===0){ setConn("offline"); throw new Error("anon key not set"); }
        const { createClient } = await import(SUPABASE_LIB);
        sb = createClient(SUPABASE_URL, SUPABASE_ANON, { auth:{ persistSession:true, autoRefreshToken:true } });
        let { data:{ user } } = await sb.auth.getUser().catch(()=>({data:{}}));
        if(!user){ const r = await sb.auth.signInAnonymously(); if(r.error) throw r.error; user = r.data.user; }
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

  /* ── Public API ────────────────────────────────────────────────────────── */
  let adapter=null;
  function pickAdapter(){ return window.__MDG_ADAPTER || (adapter || (adapter=supabaseAdapter())); }

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
  };
})();
