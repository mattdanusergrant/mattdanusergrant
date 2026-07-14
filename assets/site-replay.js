/* site-replay.js — a video-style "how this site was built" player.
   A curated timeline of real design decisions (dates/notes from the build log),
   each a live vignette: the actual intro sketches (parameterised so before→after
   states are faithful) or a small typographic scene. Self-contained: injects its
   own CSS, exposes window.SiteReplay.mount(el). White-on-black, one frame from t. */
(function(){
  'use strict';
  var TAU=Math.PI*2;
  var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  function col(a){return 'rgba(255,255,255,'+a+')';}

  /* ───────────────────────── sketches: fn(ctx,w,h,t,P,S) ─────────────────────────
     P = params for this scene, S = persistent per-run state (cleared on scene change). */
  var SKETCH={};

  // Hilbert curve traced by a travelling pen; P.ghost draws the faint full curve behind it.
  SKETCH.hilbert=function(ctx,w,h,t,P,S){
    var order=6,m=Math.min(w,h)*0.86,key=Math.round(w)+'x'+Math.round(h);
    if(S.key!==key){S.key=key;S.pts=[];var Q=S.pts;
      (function hil(x,y,xi,xj,yi,yj,n){
        if(n<=0){Q.push([x+(xi+yi)/2,y+(xj+yj)/2]);return;}
        hil(x,y,yi/2,yj/2,xi/2,xj/2,n-1);
        hil(x+xi/2,y+xj/2,xi/2,xj/2,yi/2,yj/2,n-1);
        hil(x+xi/2+yi/2,y+xj/2+yj/2,xi/2,xj/2,yi/2,yj/2,n-1);
        hil(x+xi/2+yi,y+xj/2+yj,-yi/2,-yj/2,-xi/2,-xj/2,n-1);
      })(w/2-m/2,h/2-m/2,m,0,0,m,order);
    }
    var pts=S.pts,N=pts.length,cyc=12,ph=(t%cyc)/cyc,draw=Math.min(1,ph/0.82),i;
    ctx.shadowBlur=0;ctx.lineCap='round';ctx.lineJoin='round';
    if(P.ghost){ ctx.strokeStyle=col(0.10);ctx.lineWidth=1.2;ctx.beginPath();
      ctx.moveTo(pts[0][0],pts[0][1]); for(i=1;i<N;i++)ctx.lineTo(pts[i][0],pts[i][1]); ctx.stroke(); }
    var upto=draw*(N-1),full=Math.floor(upto),frac=upto-full;
    ctx.strokeStyle=col(0.92);ctx.lineWidth=1.7;
    ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
    for(i=1;i<=full;i++)ctx.lineTo(pts[i][0],pts[i][1]);
    if(full<N-1){var a=pts[full],b=pts[full+1];ctx.lineTo(a[0]+(b[0]-a[0])*frac,a[1]+(b[1]-a[1])*frac);}
    ctx.stroke();
  };

  // Double helix. P.strands (1|2) and P.speed (scroll rate) capture the doubling + slow-down.
  SKETCH.helix=function(ctx,w,h,t,P,S){
    var A=Math.min(w,h)*0.16,twist=TAU/(Math.min(w,h)*0.46),scroll=reduce?0:t*(P.speed||0.45),step=Math.max(3,Math.round(h/120));
    ctx.shadowBlur=0;ctx.lineCap='round';
    function helixAt(cx,dir){
      var sc=scroll*dir;
      for(var y=-A;y<=h+A;y+=step*3){
        var ph=y*twist+sc,sa=Math.sin(ph),dp=Math.cos(ph),xa=cx+A*sa,xb=cx-A*sa;
        ctx.strokeStyle=col(0.12+0.30*Math.abs(sa));ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(xa,y);ctx.lineTo(xb,y);ctx.stroke();
        ctx.fillStyle=col(0.22+0.62*(dp+1)/2);ctx.beginPath();ctx.arc(xa,y,1.8,0,TAU);ctx.fill();
        ctx.fillStyle=col(0.22+0.62*(1-(dp+1)/2));ctx.beginPath();ctx.arc(xb,y,1.8,0,TAU);ctx.fill();
      }
      function strand(po){var px,py;
        for(var y=-A;y<=h+A;y+=step){var ph=y*twist+sc+po,x=cx+A*Math.sin(ph),front=(Math.cos(ph)+1)/2;
          if(y>-A){ctx.strokeStyle=col(0.18+0.77*front);ctx.lineWidth=0.8+1.9*front;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(x,y);ctx.stroke();}
          px=x;py=y;}
      }
      strand(0);strand(Math.PI);
    }
    if((P.strands||2)===1){ helixAt(w/2,1); } else { helixAt(w*0.2,1); helixAt(w*0.8,P.counter?-1:1); }
  };

  // Pythagoras tree of empty squares; P.speed sets the sway rate (0.5 fast → 0.125 quarter).
  SKETCH.pythagoras=function(ctx,w,h,t,P,S){
    var m=Math.min(w,h),s0=m*0.135,baseY=h*0.78,cx=w/2,ang=Math.PI/4+Math.sin(t*(P.speed||0.125))*0.30;
    ctx.shadowBlur=0;ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=col(0.82);ctx.lineWidth=1;
    ctx.beginPath();
    (function pyth(x1,y1,x2,y2,depth){
      var dx=x2-x1,dy=y2-y1;
      if(depth<=0||Math.abs(dx)+Math.abs(dy)<1.5)return;
      var x3=x2+dy,y3=y2-dx,x4=x1+dy,y4=y1-dx;
      ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineTo(x3,y3);ctx.lineTo(x4,y4);ctx.closePath();
      var c=Math.cos(ang),si=Math.sin(ang),ex=x4+c*(dx*c+dy*si),ey=y4+c*(-dx*si+dy*c);
      pyth(x4,y4,ex,ey,depth-1);
      pyth(ex,ey,x3,y3,depth-1);
    })(cx-s0/2,baseY,cx+s0/2,baseY,12);
    ctx.stroke();
  };

  // Cards. P.mode: 'flower' (one fanned ring) → 'fractal' (infinite Droste spiral).
  SKETCH.cards=function(ctx,w,h,t,P,S){
    var cx=w/2,cy=h/2,m=Math.min(w,h),N=7;
    ctx.shadowBlur=0;ctx.lineJoin='round';ctx.lineCap='round';
    function rrect(x,y,ww,hh,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+ww,y,x+ww,y+hh,r);ctx.arcTo(x+ww,y+hh,x,y+hh,r);ctx.arcTo(x,y+hh,x,y,r);ctx.arcTo(x,y,x+ww,y,r);ctx.closePath();}
    function card(px,py,rot,cw,ch,alpha){
      ctx.save();ctx.translate(px,py);ctx.rotate(rot);
      rrect(-cw/2,-ch/2,cw,ch,Math.max(0.4,cw*0.14));
      ctx.fillStyle='rgba(0,0,0,'+(0.7*Math.min(1,alpha+0.25)).toFixed(3)+')';ctx.fill();
      ctx.lineWidth=Math.max(0.6,cw*0.06);ctx.strokeStyle=col(0.9*alpha);ctx.stroke();ctx.restore();
    }
    if(P.mode==='flower'){                        // a single ring of cards fanned from the centre like petals
      var ch=m*0.20,cw=ch*0.64,D=m*0.24,spin=t*0.18;
      for(var i=0;i<N;i++){var ang=i/N*TAU+spin; card(cx+Math.cos(ang)*D,cy+Math.sin(ang)*D,ang-Math.PI/2-0.4,cw,ch,0.95);}
      return;
    }
    var S1=1.9,twist=0.7,CH0=m*0.05,DC0=CH0*1.05,SMIN=-3,SMAX=7,screenR=Math.hypot(w,h)/2; // infinite Droste fractal
    var phase=(t*0.22)%1;
    for(var s=SMIN;s<=SMAX;s++){
      var L=s+phase,scale=Math.pow(S1,L),chh=CH0*scale,cww=chh*0.64,D2=DC0*scale,rOuter=D2+chh/2;
      if(rOuter>screenR*1.2)continue;
      var alpha=Math.max(0,Math.min(1,(L-SMIN)/1.8))*Math.max(0,Math.min(1,(screenR*1.05-rOuter)/(screenR*0.4)));
      if(alpha<=0.01)continue;
      for(var j=0;j<N;j++){var ang2=j/N*TAU+L*twist; card(cx+Math.cos(ang2)*D2,cy+Math.sin(ang2)*D2,ang2-Math.PI/2-0.4,cww,chh,alpha);}
    }
  };

  // Conway's Game of Life — the living background, self-contained (steps ~2/s).
  SKETCH.life=function(ctx,w,h,t,P,S){
    var cell=Math.max(6,Math.round(Math.min(w,h)/34)),cols=Math.max(8,Math.floor(w/cell)),rows=Math.max(8,Math.floor(h/cell));
    function seed(){S.g=[];for(var y=0;y<rows;y++){var r=[];for(var x=0;x<cols;x++)r.push(Math.random()<0.30?1:0);S.g.push(r);}S.cols=cols;S.rows=rows;S.gen=0;S.seedGen=0;}
    if(S.cols!==cols||S.rows!==rows||!S.g)seed();
    var due=Math.floor(t*2);                    // 2 generations / second
    while((S.tick||0)<due){
      var g=S.g,ng=[],pop=0;
      for(var y=0;y<rows;y++){var row=[];for(var x=0;x<cols;x++){var nb=0;
        for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++)if(dx||dy)nb+=g[(y+dy+rows)%rows][(x+dx+cols)%cols];
        var alive=g[y][x]?(nb===2||nb===3):(nb===3);row.push(alive?1:0);if(alive)pop++;}ng.push(row);}
      S.g=ng;S.gen++;S.tick=(S.tick||0)+1; if(pop===0||S.gen-S.seedGen>140){seed();S.tick=due;}
    }
    var ox=(w-cols*cell)/2,oy=(h-rows*cell)/2;
    ctx.fillStyle=col(0.85);
    for(var yy=0;yy<rows;yy++)for(var xx=0;xx<cols;xx++)if(S.g[yy][xx])ctx.fillRect(ox+xx*cell+0.5,oy+yy*cell+0.5,cell-1,cell-1);
  };

  /* ───────────────────────── the timeline ─────────────────────────
     kind:'shot' → a real rendered screenshot of a past commit (img);
     kind:'sketch' → a live vignette; kind:'scene' → a typographic card (html + optional enter()). */
  var TL=[
    { act:'I · It starts with your name', date:'Jun 11', kind:'shot', img:'/case-studies/replay/01-name.png', dwell:5000,
      title:'The very first thing on the page was my name',
      note:'MATT · DANUSER · GRANT, stacked in three lines. Real screenshot, rendered from the June 11 commit.' },

    { act:'I · It starts with your name', date:'Jun 11', kind:'shot', img:'/case-studies/replay/02-games.png', dwell:5400,
      title:'…which the site scrambles into MUST · DESIGN · GAMES',
      note:'Same three initials — M, D, G. The whole identity of the site is a pun on my own name.' },

    { act:'I · It starts with your name', date:'Jun 14', kind:'scene', dwell:5200,
      title:'So every intro became an M·D·G',
      note:'Three words beginning M, D, G — and a rule I held to: no word ever repeats across any phrase.',
      ill:'<div class="rp-mdg"><span>M</span><span>D</span><span>G</span></div><div class="rp-mdg-sub" data-morph></div>' },

    { act:'I · It starts with your name', date:'Jun 16', kind:'shot', img:'/case-studies/replay/03-home-jun.png', dwell:5400,
      title:'The homepage, mid-June',
      note:'A different hero line, a Labs / AI-Consulting nav, three cards. Real footage — this is exactly how it looked.' },

    { act:'II · The math starts drawing', date:'Jul 6', kind:'sketch', sketch:'hilbert', params:{ghost:true}, dwell:5200,
      title:'Metropolis Dawn Grid → a Hilbert curve',
      note:'An intro sketch became a space-filling fractal. First pass: a faint full curve sat behind the travelling pen.' },

    { act:'II · The math starts drawing', date:'Jul 6', kind:'sketch', sketch:'hilbert', params:{ghost:false}, dwell:4800,
      title:'Lose the ghost',
      note:'Drop the preview. Now the pen writes the curve onto pure black — it draws itself, like a strand folded to fit.' },

    { act:'II · The math starts drawing', date:'Jul 6', kind:'sketch', sketch:'helix', params:{strands:1,speed:0.9}, dwell:4600,
      title:'Master Data Genome gets a helix',
      note:'A single twisting backbone with base-pair rungs — the strand in front brightens to sell the turn.' },

    { act:'II · The math starts drawing', date:'Jul 7', kind:'sketch', sketch:'helix', params:{strands:2,speed:0.9}, dwell:4600,
      title:'Double it — a strand either side of the words',
      note:'Two helixes now flank the centred title instead of one running through it.' },

    { act:'II · The math starts drawing', date:'Jul 8', kind:'sketch', sketch:'helix', params:{strands:2,speed:0.225,counter:true}, dwell:5000,
      title:'…then slow it and counter-rotate the strands',
      note:'Quarter of the original speed, and the right helix now spins opposite the left — the two strands turn against each other.' },

    { act:'II · The math starts drawing', date:'Jul 7', kind:'sketch', sketch:'pythagoras', params:{speed:0.5}, dwell:4400,
      title:'Moss Dew Garden — a Pythagoras tree',
      note:'Empty white squares, line-only, branching like foliage and swaying in a breeze.' },

    { act:'II · The math starts drawing', date:'Jul 7', kind:'sketch', sketch:'pythagoras', params:{speed:0.125}, dwell:4400,
      title:'Slow the sway to a quarter',
      note:'A gentler wind. The tree drifts at 0.25× — foliage, not a metronome.' },

    { act:'II · The math starts drawing', date:'Jul 6', kind:'sketch', sketch:'cards', params:{mode:'flower'}, dwell:4400,
      title:'Multiplayer Deck Gateway — a card flower',
      note:'The deck fans from the centre like petals. No pips on the cards; just the shapes.' },

    { act:'II · The math starts drawing', date:'Jul 6', kind:'sketch', sketch:'cards', params:{mode:'fractal'}, dwell:5200,
      title:'Make it infinite',
      note:'Cards are born at the centre and spiral outward forever — a seamless Droste loop, tilted into a spiral.' },

    { act:'III · Cut the homepage down', date:'Jul 6', kind:'scene', dwell:4600,
      title:'Three games, out front',
      note:'Feature exactly three. Stack each title onto its own three lines — Multiplayer / Deck / Gateway.',
      ill:'<div class="rp-tiles"><div class="rp-tile">Multiplayer<br>Deck<br>Gateway</div><div class="rp-tile">Metropolis<br>Dawn<br>Grid</div><div class="rp-tile">Moss<br>Dew<br>Garden</div></div>' },

    { act:'III · Cut the homepage down', date:'Jul 7', kind:'scene', dwell:4600,
      title:'Retire the Design Lab',
      note:'Everything folds onto the homepage; games move to their own subdomain; “Must Design Games” joins the top nav.',
      ill:'<div class="rp-nav"><span class="rp-strike">Design&nbsp;Lab</span><span>Must&nbsp;Design&nbsp;Games</span><span>Consulting</span><span>Resume</span></div>' },

    { act:'III · Cut the homepage down', date:'Jul 7', kind:'scene', dwell:5000,
      title:'The word-toy that won’t sit still',
      note:'The “more games” link drifts through M·D·G phrases. On mobile it slips below the three games.',
      ill:'<a class="rp-pill" data-morph>More Decent Gadgets <span>→</span></a>' },

    { act:'IV · A backstage door', date:'Jul 6–7', kind:'scene', dwell:5200,
      title:'Recover the lost easter egg',
      note:'Found the old MDG Registry in git history and restored it at a hidden /mdg.html — type M‑D‑G anywhere to open it. Inside: an Intro Viewer and a draggable site map.',
      ill:'<div class="rp-keys"><kbd>M</kbd><kbd>D</kbd><kbd>G</kbd></div>' },

    { act:'V · Sharpen the tools', date:'Jul 7', kind:'scene', dwell:5000,
      title:'One tool, one toggle',
      note:'Math Draws Graphics: Code Art and Pixel Art merged behind a single mode toggle, the pixel editor gained a two-way code view, and it took on the site’s top bar.',
      ill:'<div class="rp-toggle"><span class="on">Code Art</span><span>Pixel Art</span></div>' },

    { act:'V · Sharpen the tools', date:'Jul 7', kind:'sketch', sketch:'life', params:{}, dwell:5600,
      title:'A living background, everywhere',
      note:'Conway’s Game of Life runs behind every page — on one continuous clock, so the cadence never restarts as you move around.' },

    { act:'VI · How the calls got made', date:'Jul 7', kind:'scene', dwell:5400,
      title:'Tournaments — then overrule them',
      note:'Names and copy went through a five-judge decision tournament. Sometimes the judges won. Sometimes I threw it out: “prototypes in various states of disarray.”',
      ill:'<div class="rp-judges"><span>⚖</span><span>⚖</span><span>⚖</span><span>⚖</span><span>⚖</span></div><div class="rp-arrow">→ ✎ your own line</div>' },

    { act:'VII · Where you came in', date:'today', kind:'shot', img:'/case-studies/replay/99-today.png', dwell:5600,
      title:'The homepage, today',
      note:'New hero, a games-first nav, the restless “More Decent Gadgets” pill. From my name to here in about a month.' },

    { act:'—', date:'now', kind:'scene', dwell:6000, end:true,
      title:'…and it’s still moving',
      note:'Every beat above shipped live. Replay it, or go poke at the real thing.',
      ill:'<div class="rp-cta"><a href="https://mattdanusergrant.com" class="rp-btn">Visit the site</a><a href="/case-studies/building-with-ai.html" class="rp-btn ghost">The full write-up</a></div>' }
  ];

  /* ───────────────────────── styles ───────────────────────── */
  var CSS=`
  .rp{--stage:#0b0b0d;position:relative;width:100%;border:1.5px solid var(--line-2);border-radius:16px;overflow:hidden;background:var(--stage);box-shadow:var(--shadow-hover)}
  .rp-stage{position:relative;width:100%;aspect-ratio:16/10;background:var(--stage);overflow:hidden}
  @media(max-width:560px){.rp-stage{aspect-ratio:4/5}}
  .rp-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
  .rp-shot{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center;display:block}
  .rp-shot[hidden]{display:none}
  .rp-ill{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;color:#EDE8DF;padding:26px;font-family:'Inter',system-ui,sans-serif}
  .rp-ill[hidden]{display:none}
  .rp-hero{max-width:560px}
  .rp-eye{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8a857d;margin-bottom:14px}
  .rp-h1{font-family:'Fraunces',Georgia,serif;font-weight:500;font-size:clamp(24px,4.6vw,40px);line-height:1.12;letter-spacing:-.02em}
  .rp-h1 em{font-style:italic;color:#E8A317}
  .rp-lede{margin-top:14px;color:#a29c93;font-size:15px}
  .rp-mdg{display:flex;gap:min(6vw,54px);font-family:'Fraunces',serif;font-weight:600;font-size:clamp(48px,13vw,120px);color:#EDE8DF;line-height:1}
  .rp-mdg span{color:#E8A317}.rp-mdg span:nth-child(2){color:#EDE8DF}
  .rp-mdg-sub{font-family:ui-monospace,Menlo,monospace;font-size:clamp(13px,2.6vw,17px);letter-spacing:.14em;color:#8a857d;min-height:1.3em;text-transform:uppercase}
  .rp-tiles{display:flex;gap:14px;flex-wrap:wrap;justify-content:center}
  .rp-tile{border:1.5px solid #3a352e;border-radius:12px;padding:16px 20px;font-family:'Fraunces',serif;font-size:clamp(15px,2.4vw,19px);line-height:1.24;color:#EDE8DF;background:rgba(255,255,255,.02)}
  .rp-nav{display:flex;gap:22px;flex-wrap:wrap;justify-content:center;font-size:clamp(14px,2.6vw,18px);color:#a29c93;font-family:'Fraunces',serif}
  .rp-strike{text-decoration:line-through;color:#6a655d;text-decoration-thickness:2px}
  .rp-pill{display:inline-flex;align-items:center;gap:8px;font-family:'Fraunces',serif;font-weight:500;font-size:clamp(16px,3vw,22px);color:#EDE8DF;border:1.5px dashed #3a352e;border-radius:999px;padding:10px 22px}
  .rp-pill span{color:#E8A317}
  .rp-keys{display:flex;gap:14px}
  .rp-keys kbd{font-family:ui-monospace,Menlo,monospace;font-size:clamp(20px,5vw,40px);color:#EDE8DF;border:1.5px solid #3a352e;border-bottom-width:4px;border-radius:10px;padding:8px 16px;background:rgba(255,255,255,.03)}
  .rp-toggle{display:flex;border:1.5px solid #3a352e;border-radius:999px;overflow:hidden;font-family:'Fraunces',serif;font-size:clamp(14px,2.6vw,18px)}
  .rp-toggle span{padding:9px 22px;color:#8a857d}.rp-toggle span.on{background:#EDE8DF;color:#15161c}
  .rp-judges{display:flex;gap:12px;font-size:clamp(24px,5vw,44px);color:#E8A317}
  .rp-arrow{color:#a29c93;font-size:15px;font-family:'Fraunces',serif}
  .rp-cta{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
  .rp-btn{font-family:'Fraunces',serif;font-size:14px;font-weight:500;border-radius:999px;padding:10px 20px;background:#EDE8DF;color:#15161c;border:1.5px solid #EDE8DF;transition:filter .15s}
  .rp-btn:hover{filter:brightness(.94)}
  .rp-btn.ghost{background:transparent;color:#EDE8DF}

  .rp-cap{position:absolute;left:0;right:0;bottom:0;padding:20px 22px 22px;
    background:linear-gradient(0deg,rgba(6,6,9,.92) 0%,rgba(6,6,9,.62) 62%,transparent 100%);color:#EDE8DF;pointer-events:none}
  .rp-cap-meta{display:flex;justify-content:space-between;gap:12px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#E8A317;margin-bottom:7px}
  .rp-cap-date{color:#8a857d}
  .rp-cap-title{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(18px,3.2vw,25px);line-height:1.16;letter-spacing:-.01em;margin:0 0 6px}
  .rp-cap-note{font-size:14px;line-height:1.5;color:#c7c1b8;max-width:60ch}
  @media(max-width:560px){.rp-cap-note{font-size:12.5px}}

  .rp-bar{display:flex;align-items:center;gap:12px;padding:11px 16px;background:var(--paper);border-top:1.5px solid var(--line-2)}
  .rp-btn-t{flex:none;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--line-2);border-radius:999px;background:transparent;color:var(--ink);cursor:pointer;font-size:13px;transition:border-color .15s}
  .rp-btn-t:hover{border-color:var(--ink)}
  .rp-track{position:relative;flex:1;height:24px;cursor:pointer;display:flex;align-items:center}
  .rp-rail{position:absolute;left:0;right:0;height:4px;border-radius:999px;background:var(--line-2)}
  .rp-fill{position:absolute;left:0;height:4px;border-radius:999px;background:var(--ink);width:0}
  .rp-dot{position:absolute;top:50%;width:9px;height:9px;border-radius:50%;background:var(--line-2);border:1.5px solid var(--paper);transform:translate(-50%,-50%);transition:background .15s,transform .15s}
  .rp-dot.done{background:var(--ink)}
  .rp-dot.cur{background:var(--accent,#C9820A);transform:translate(-50%,-50%) scale(1.5)}
  .rp-dot:hover{transform:translate(-50%,-50%) scale(1.6)}
  .rp-time{flex:none;font-variant-numeric:tabular-nums;font-size:12px;color:var(--muted);min-width:3.2em;text-align:right}
  .rp-speed{flex:none;font-size:12px;color:var(--muted);border:1.5px solid var(--line-2);border-radius:999px;padding:4px 9px;background:transparent;cursor:pointer;font-family:inherit}
  .rp-speed:hover{border-color:var(--ink);color:var(--ink)}

  /* Fullscreen: fill the screen as a column so the caption + control bar stay on-screen
     (otherwise the 16:10 stage overflows a 16:9 display and the text gets clipped). */
  .rp:fullscreen{display:flex;flex-direction:column;width:100vw;height:100vh;border:0;border-radius:0}
  .rp:fullscreen .rp-stage{flex:1 1 auto;min-height:0;aspect-ratio:auto}
  .rp:fullscreen .rp-bar{flex:none}
  .rp:-webkit-full-screen{display:flex;flex-direction:column;width:100vw;height:100vh;border:0;border-radius:0}
  .rp:-webkit-full-screen .rp-stage{flex:1 1 auto;min-height:0;aspect-ratio:auto}
  .rp:-webkit-full-screen .rp-bar{flex:none}
  `;

  function injectCSS(){ if(document.getElementById('rp-css'))return; var s=document.createElement('style'); s.id='rp-css'; s.textContent=CSS; document.head.appendChild(s); }

  /* ───────────────────────── player ───────────────────────── */
  function mount(root){
    if(!root||root.dataset.mounted)return; root.dataset.mounted='1'; injectCSS();
    root.className='rp';
    root.innerHTML=
      '<div class="rp-stage"><canvas></canvas><img class="rp-shot" alt="" hidden><div class="rp-ill" hidden></div>'+
      '<div class="rp-cap"><div class="rp-cap-meta"><span class="rp-cap-act"></span><span class="rp-cap-date"></span></div>'+
      '<h3 class="rp-cap-title"></h3><div class="rp-cap-note"></div></div></div>'+
      '<div class="rp-bar">'+
        '<button class="rp-btn-t" data-a="prev" aria-label="Previous">⏮</button>'+
        '<button class="rp-btn-t" data-a="play" aria-label="Play / pause">▶</button>'+
        '<button class="rp-btn-t" data-a="next" aria-label="Next">⏭</button>'+
        '<div class="rp-track"><div class="rp-rail"></div><div class="rp-fill"></div></div>'+
        '<span class="rp-time">0:00</span>'+
        '<button class="rp-speed">1×</button>'+
        '<button class="rp-btn-t" data-a="full" aria-label="Fullscreen">⛶</button>'+
      '</div>';

    var stage=root.querySelector('.rp-stage'),cv=root.querySelector('canvas'),ctx=cv.getContext('2d'),
        shot=root.querySelector('.rp-shot'),
        ill=root.querySelector('.rp-ill'),capAct=root.querySelector('.rp-cap-act'),capDate=root.querySelector('.rp-cap-date'),
        capTitle=root.querySelector('.rp-cap-title'),capNote=root.querySelector('.rp-cap-note'),
        track=root.querySelector('.rp-track'),fill=root.querySelector('.rp-fill'),timeEl=root.querySelector('.rp-time'),
        playBtn=root.querySelector('[data-a=play]'),speedBtn=root.querySelector('.rp-speed');

    var offs=[],total=0; TL.forEach(function(s){offs.push(total);total+=s.dwell;});
    var dots=TL.map(function(s,i){var d=document.createElement('div');d.className='rp-dot';d.style.left=(offs[i]/total*100)+'%';
      d.title=s.title; d.addEventListener('click',function(e){e.stopPropagation();go(i,0);}); track.appendChild(d); return d;});

    var idx=-1, sceneStart=0, local=0, playing=false, speed=1, dpr=1, S={}, cleanup=null, raf=0;

    function size(){ dpr=Math.min(2,window.devicePixelRatio||1);
      cv.width=Math.round(stage.clientWidth*dpr); cv.height=Math.round(stage.clientHeight*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0); S={}; }
    function fmt(ms){var s=Math.round(ms/1000);return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2);}

    function enterScene(i){
      if(cleanup){cleanup();cleanup=null;}
      var sc=TL[i]; S={};
      capAct.textContent=sc.act; capDate.textContent=sc.date; capTitle.textContent=sc.title; capNote.textContent=sc.note;
      if(sc.kind==='shot'){ cv.style.display='none'; ill.hidden=true; shot.hidden=false; if(shot.getAttribute('src')!==sc.img)shot.src=sc.img; }
      else if(sc.kind==='sketch'){ shot.hidden=true; ill.hidden=true; cv.style.display='block'; }
      else { shot.hidden=true; cv.style.display='none'; ill.hidden=false; ill.innerHTML=sc.ill||''; cleanup=wireScene(ill); }
      dots.forEach(function(d,k){d.classList.toggle('cur',k===i);d.classList.toggle('done',k<i);});
    }

    // small per-scene animations for the typographic cards (morphing pill / cryptograph)
    function wireScene(el){
      var m=el.querySelector('[data-morph]'); if(!m)return null;
      var pill=m.classList.contains('rp-pill');
      var words=pill?['More Decent Gadgets','Mostly Dropped Gears','Mainly Defective Gems','Merely Discarded Gambles','Mildly Dubious Gambits']
                     :['MANY DOORS GUILD','MASTER DATA GENOME','METROPOLIS DAWN GRID','MOSS DEW GARDEN','MATH DRAWS GRAPHICS'];
      var k=0; function set(){ if(pill)m.firstChild.textContent=words[k]+' '; else m.textContent=words[k]; k=(k+1)%words.length; }
      set(); if(reduce)return null; var iv=setInterval(set,1400); return function(){clearInterval(iv);};
    }

    function draw(){
      var sc=TL[idx];
      if(sc.kind==='sketch'){
        ctx.clearRect(0,0,stage.clientWidth,stage.clientHeight);
        var tt=playing?local/1000:10;   // paused / reduced-motion → a settled representative frame (not the blank t=0)
        try{ SKETCH[sc.sketch](ctx,stage.clientWidth,stage.clientHeight,tt,sc.params||{},S); }catch(e){}
      }
      var elapsed=offs[idx]+Math.min(local,sc.dwell);
      fill.style.width=(elapsed/total*100)+'%';
      timeEl.textContent=fmt(elapsed);
    }

    function go(i,at){ i=(i+TL.length)%TL.length; idx=i; local=at||0; sceneStart=now()-local/speed; enterScene(i); draw(); }
    function now(){return performance.now();}

    function tick(){
      if(!playing){return;}
      local=(now()-sceneStart)*speed;
      var sc=TL[idx];
      if(local>=sc.dwell){
        if(idx===TL.length-1){ playing=false; playBtn.textContent='↺'; local=sc.dwell; draw(); return; } // hold on the final card
        go(idx+1,0); sceneStart=now();
      }
      draw();
      raf=requestAnimationFrame(tick);
    }

    function play(){ if(playing)return; if(idx>=TL.length-1&&local>=TL[idx].dwell)go(0,0); playing=true; playBtn.textContent='❘❘'; sceneStart=now()-local/speed; raf=requestAnimationFrame(tick); }
    function pause(){ playing=false; playBtn.textContent='▶'; cancelAnimationFrame(raf); }
    function toggle(){ playing?pause():play(); }

    playBtn.addEventListener('click',toggle);
    root.querySelector('[data-a=prev]').addEventListener('click',function(){go(idx-1,0);});
    root.querySelector('[data-a=next]').addEventListener('click',function(){go(idx+1,0);});
    root.querySelector('[data-a=full]').addEventListener('click',function(){ if(document.fullscreenElement)document.exitFullscreen(); else root.requestFullscreen&&root.requestFullscreen(); });
    speedBtn.addEventListener('click',function(){ var opt=[1,1.5,2,0.5]; var n=opt[(opt.indexOf(speed)+1)%opt.length]; speed=n; speedBtn.textContent=(n+'×'); if(playing)sceneStart=now()-local/speed; });
    track.addEventListener('click',function(e){ if(e.target.classList.contains('rp-dot'))return;
      var r=track.getBoundingClientRect(),f=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),want=f*total,i=0;
      while(i<TL.length-1&&offs[i+1]<=want)i++; go(i,want-offs[i]); if(playing)sceneStart=now()-local/speed; });

    var rt; window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){size();draw();},150);});
    document.addEventListener('fullscreenchange',function(){setTimeout(function(){size();draw();},60);});
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){draw();});

    size(); go(0,0);
    root.startReplay=function(){ go(0,0); play(); };

    if(reduce){ pause(); }   // reduced motion: land on scene 0, step manually with ⏮/⏭
    return root;
  }

  window.SiteReplay={mount:mount, timeline:TL};
})();
