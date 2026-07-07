/* gol-bg.js — Conway's Game of Life as a faint, site-wide living background.

   Matches the home screen's post-intro background, but shared verbatim across
   every page (home, Consulting, Resume, the Must Design Games arcade).

   The slow-down cadence (Fibonacci gaps: 1,1,2,3,5,8,…,144s, then every 144s)
   is anchored to ONE shared clock kept in a cookie scoped to
   .mattdanusergrant.com — so it survives navigation between pages AND across
   the apex ↔ subdomain boundary. A page loaded 3 minutes into the visit
   adopts that age immediately and keeps ticking slowly; it never restarts the
   fast early ticks. Set the clock once, then only ever read it. */
(function(){
  'use strict';
  var canvas=document.getElementById('intro-canvas');
  if(!canvas){
    canvas=document.createElement('canvas');
    canvas.id='intro-canvas';canvas.className='bg';canvas.setAttribute('aria-hidden','true');
    document.body.insertBefore(canvas,document.body.firstChild);
  }
  if(!canvas.getContext)return;
  var ctx=canvas.getContext('2d');
  var DPR=Math.min(2,window.devicePixelRatio||1);
  var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ── Shared slow-down clock (cookie: mdgGolStart) ─────────────────────── */
  var COOKIE='mdgGolStart', MAXAGE=6*3600;   // 6h: a visit's background ages continuously
  function readStart(){
    var m=document.cookie.match(/(?:^|;\s*)mdgGolStart=(\d+)/);
    return m?parseInt(m[1],10):null;
  }
  function writeStart(ts){
    var dom=/(^|\.)mattdanusergrant\.com$/.test(location.hostname)?';domain=.mattdanusergrant.com':'';
    document.cookie=COOKIE+'='+ts+';path=/;max-age='+MAXAGE+dom+';SameSite=Lax';
  }
  var start=readStart();
  if(start===null){start=Date.now();writeStart(start);}
  function ageSec(){return (Date.now()-start)/1000;}

  // Cumulative Fibonacci tick times: 1,2,4,7,12,20,33,54,88,143,232,376; then every 144s.
  var FIB_T=(function(){var g=[1,1,2,3,5,8,13,21,34,55,89,144],a=0,o=[];for(var i=0;i<g.length;i++){a+=g[i];o.push(a);}return o;})();
  function ticksFor(sec){
    var last=FIB_T[FIB_T.length-1];
    if(sec>=last)return FIB_T.length+Math.floor((sec-last)/144);
    var n=0;for(var i=0;i<FIB_T.length&&FIB_T[i]<=sec;i++)n++;return n;
  }

  /* ── Cell colour: a faint version of the page's own --ink, so it stays
     visible on every theme, including the resume's forced-white background. ── */
  function cellStyle(){
    var ink=getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()||'#808080',r,g,b,m;
    if(ink.charAt(0)==='#'){var h=ink.slice(1);if(h.length===3)h=h.replace(/./g,'$&$&');r=parseInt(h.slice(0,2),16);g=parseInt(h.slice(2,4),16);b=parseInt(h.slice(4,6),16);}
    else{m=ink.match(/\d+/g)||[128,128,128];r=+m[0];g=+m[1];b=+m[2];}
    return 'rgba('+r+','+g+','+b+',0.18)';
  }

  /* ── Conway's Life on a wrap-around grid ── */
  var S={};
  function seed(cols,rows){
    var grid=[];for(var y=0;y<rows;y++){var row=[];for(var x=0;x<cols;x++)row.push(Math.random()<0.15?1:0);grid.push(row);}
    S.grid=grid;S.cols=cols;S.rows=rows;S.gen=S.gen||0;S.seedGen=S.gen;
  }
  function stepLife(){
    var g=S.grid,cols=S.cols,rows=S.rows,ng=[],pop=0;
    for(var y=0;y<rows;y++){var row=[];for(var x=0;x<cols;x++){var nb=0;
      for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++)if(dx||dy)nb+=g[(y+dy+rows)%rows][(x+dx+cols)%cols];
      var alive=g[y][x]?(nb===2||nb===3):(nb===3);row.push(alive?1:0);if(alive)pop++;}ng.push(row);}
    S.grid=ng;S.gen++;if(pop===0||S.gen-S.seedGen>140)seed(cols,rows);
  }

  var cell=8;
  function resize(){
    var w=canvas.clientWidth,h=canvas.clientHeight;
    canvas.width=w*DPR;canvas.height=h*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
    cell=Math.max(5,Math.round(Math.min(w,h)/60));
    var cols=Math.max(8,Math.floor(w/cell)),rows=Math.max(8,Math.floor(h/cell));
    if(S.cols!==cols||S.rows!==rows||!S.grid)seed(cols,rows);
  }

  var ticks=null,lastDraw=0,raf=0;
  function draw(){
    var w=canvas.clientWidth,h=canvas.clientHeight,pad=Math.max(1,cell*0.1),g=S.grid;
    ctx.clearRect(0,0,w,h);ctx.fillStyle=cellStyle();
    for(var y=0;y<S.rows;y++)for(var x=0;x<S.cols;x++)if(g[y][x])ctx.fillRect(x*cell+pad,y*cell+pad,cell-2*pad,cell-2*pad);
  }
  function frame(now){
    raf=requestAnimationFrame(frame);
    if(now-lastDraw<90)return;   // throttle to ~11fps
    lastDraw=now;
    var want=ticksFor(ageSec());
    if(ticks===null)ticks=want;          // adopt the shared age on load — no catch-up burst
    while(ticks<want){stepLife();ticks++;}
    draw();
  }

  resize();
  window.addEventListener('resize',function(){resize();if(reduce)draw();});
  if(reduce){ticks=ticksFor(ageSec());draw();}   // static: one age-appropriate frame, no animation
  else raf=requestAnimationFrame(frame);
})();
