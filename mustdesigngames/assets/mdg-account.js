/* mdg-account.js — drop-in accounts UI for Must Design Games (Wagering Arena Phase 1).
   Renders a floating chip showing the player's name + play-money balance, and a sign-in
   sheet (Google + email: magic-link or password). Talks only to window.MDGNet.auth, so it
   works against Supabase in prod or an injected mock (window.__MDG_AUTH) in tests.

     <script src="../assets/mdg-net.js"></script>
     <script src="../assets/mdg-account.js"></script>
     MDGAccount.mount();                       // floating chip, top-right
     MDGAccount.mount({ open:true });           // and open the sheet immediately

   Fires window 'mdg-account' CustomEvents ({detail:{user,wallet}}) on any change. */
(function(){
  "use strict";
  const A = () => window.MDGNet && window.MDGNet.auth;
  const available = () => window.MDGNet && window.MDGNet.accountsAvailable && window.MDGNet.accountsAvailable();
  let user=null, wallet=null, unwatch=null, els={}, opts={};

  const CSS = `
  .mdga-chip{position:fixed;top:12px;right:12px;z-index:9998;display:inline-flex;align-items:center;gap:8px;
    padding:7px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(20,20,26,.82);
    color:#f4f1ea;font:600 14px/1 system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(6px)}
  .mdga-chip .coin{font-size:15px}.mdga-chip .nm{opacity:.72;font-weight:500;max-width:9ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mdga-back{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55)}
  .mdga-back.on{display:flex}
  .mdga-card{width:min(340px,92vw);background:#16161c;color:#f4f1ea;border:1px solid rgba(255,255,255,.12);
    border-radius:16px;padding:20px;font:14px/1.45 system-ui,sans-serif}
  .mdga-card h3{margin:0 0 4px;font-size:18px}.mdga-card .sub{opacity:.65;margin:0 0 16px;font-size:13px}
  .mdga-btn{display:block;width:100%;padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,.16);
    background:#26262f;color:#f4f1ea;font:600 14px/1 system-ui;cursor:pointer;margin-top:8px}
  .mdga-btn.g{background:#fff;color:#1a1a1a;border-color:#fff}
  .mdga-btn.primary{background:#7c5cff;border-color:#7c5cff}
  .mdga-in{width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:#0f0f14;
    color:#f4f1ea;font:14px system-ui;margin-top:8px;box-sizing:border-box}
  .mdga-or{text-align:center;opacity:.4;font-size:12px;margin:14px 0 4px}
  .mdga-msg{font-size:13px;margin-top:10px;min-height:16px}.mdga-msg.err{color:#ff8a8a}.mdga-msg.ok{color:#7ee0a3}
  .mdga-row{display:flex;gap:8px}.mdga-row .mdga-btn{margin-top:8px}
  .mdga-x{float:right;cursor:pointer;opacity:.5;font-size:20px;line-height:1;margin:-4px -4px 0 0}
  .mdga-bal{font-size:32px;font-weight:800;margin:6px 0}.mdga-bal .coin{font-size:24px}
  `;

  function emit(){ try{ window.dispatchEvent(new CustomEvent("mdg-account",{detail:{user,wallet}})); }catch(e){} }
  function fmt(n){ return (n==null?0:n).toLocaleString(); }

  function renderChip(){
    if(!els.chip) return;
    if(user){ els.chip.innerHTML = `<span class="coin">🪙</span><b>${fmt(wallet&&wallet.balance)}</b>`+
      `<span class="nm">${esc((wallet&&wallet.display_name)|| "you")}</span>`; }
    else { els.chip.innerHTML = `<span class="coin">👤</span>Sign in`; }
  }
  function renderSheet(){
    const c=els.card; if(!c) return;
    if(user){
      c.innerHTML = `<span class="mdga-x" data-x>×</span><h3>${esc((wallet&&wallet.display_name)||"Your account")}</h3>`+
        `<p class="sub">${user.email? esc(user.email) : "signed in"}</p>`+
        `<div class="mdga-bal"><span class="coin">🪙</span> ${fmt(wallet&&wallet.balance)}</div>`+
        `<p class="sub">+10 chips a day, every day.</p>`+
        `<button class="mdga-btn" data-signout>Sign out</button>`+
        `<div class="mdga-msg" data-msg></div>`;
    } else {
      c.innerHTML = `<span class="mdga-x" data-x>×</span><h3>Sign in</h3>`+
        `<p class="sub">Play-money chips, saved to your account. New players start with 1000.</p>`+
        `<input class="mdga-in" data-email type="email" placeholder="you@example.com">`+
        `<button class="mdga-btn primary" data-otp>Email me a sign-in link</button>`+
        `<div class="mdga-or">— or use a password —</div>`+
        `<input class="mdga-in" data-pw type="password" placeholder="password">`+
        `<div class="mdga-row"><button class="mdga-btn" data-pwin>Sign in</button>`+
        `<button class="mdga-btn" data-pwup>Create account</button></div>`+
        `<div class="mdga-msg" data-msg></div>`;
    }
    wire();
  }
  const q = s => els.card.querySelector(s);
  function msg(t,kind){ const m=q("[data-msg]"); if(m){ m.textContent=t; m.className="mdga-msg "+(kind||""); } }
  function wire(){
    const x=q("[data-x]"); if(x) x.onclick=close;
    const g=q("[data-google]"); if(g) g.onclick=()=>guard(()=>A().signInWithGoogle(),"Redirecting to Google…");
    const otp=q("[data-otp]"); if(otp) otp.onclick=()=>{ const e=(q("[data-email]")||{}).value; if(!e) return msg("Enter your email first.","err");
      guard(()=>A().signInWithOtp(e),"Check your email for the sign-in link.",true); };
    const pwin=q("[data-pwin]"); if(pwin) pwin.onclick=()=>authPw("signInWithPassword");
    const pwup=q("[data-pwup]"); if(pwup) pwup.onclick=()=>authPw("signUp");
    const so=q("[data-signout]"); if(so) so.onclick=()=>guard(()=>A().signOut(),"Signed out.");
  }
  function authPw(method){ const e=(q("[data-email]")||{}).value, p=(q("[data-pw]")||{}).value;
    if(!e||!p) return msg("Email and password required.","err");
    guard(async()=>{ const r=await A()[method](e,p); if(r&&r.error) throw r.error;
      if(method==="signUp") msg("Account created — check email if confirmation is on.","ok"); }, null); }
  async function guard(fn, okMsg, keepOpen){
    msg("…"); try{ const r=await fn(); if(r&&r.error) throw r.error; if(okMsg) msg(okMsg,"ok");
      if(!keepOpen && okMsg==null){} await refresh(); }
    catch(e){
      try{ console.error("[MDGAccount] auth error:", e); }catch(_){}
      let t = e && (e.message || e.error_description || e.msg || e.error);
      if(!t || t==="{}"){ t = "Couldn't send the email"+((e&&e.status)?(" (status "+e.status+")"):"")+
        " — check Supabase → Logs → Auth (usually SMTP/sender)"; }
      msg(t,"err");
    }
  }

  async function refresh(){
    if(!available()){ return; }
    try{ user = await A().user(); }catch(e){ user=null; }
    if(user){
      try{ wallet = await A().claimDaily(); }        // claim on load = lazy daily accrual
      catch(e){ try{ wallet = await A().wallet(); }catch(_){ wallet=null; } }
      if(!unwatch){ try{ unwatch = await A().watchWallet(async()=>{ try{ wallet=await A().wallet(); renderChip(); renderSheet(); emit(); }catch(e){} }); }catch(e){} }
    } else { wallet=null; if(unwatch){ unwatch(); unwatch=null; } }
    renderChip(); renderSheet(); emit();
  }

  const open  = ()=>{ els.back.classList.add("on"); };
  const close = ()=>{ els.back.classList.remove("on"); };
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m])); }

  window.MDGAccount = {
    async mount(o){
      opts=o||{};
      if(!document.getElementById("mdga-css")){ const s=document.createElement("style"); s.id="mdga-css"; s.textContent=CSS; document.head.appendChild(s); }
      els.chip=document.createElement("button"); els.chip.className="mdga-chip"; els.chip.onclick=open;
      els.back=document.createElement("div"); els.back.className="mdga-back";
      els.card=document.createElement("div"); els.card.className="mdga-card";
      els.back.appendChild(els.card); els.back.onclick=e=>{ if(e.target===els.back) close(); };
      (opts.container||document.body).appendChild(els.chip); document.body.appendChild(els.back);
      renderChip(); renderSheet();
      try{ if(A()) await A().onAuth(async u=>{ await refresh(); }); else await refresh(); }
      catch(e){ /* backend/client unavailable → stay in signed-out state, never break the host page */ }
      if(opts.open) open();
      return window.MDGAccount;
    },
    get user(){ return user; }, get wallet(){ return wallet; },
    open, close, refresh,
  };
})();
