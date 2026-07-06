/* MDG intro library — the Math Draws Graphics sketches the homepage intro plays,
   packaged so /mdg.html's "Intro Viewer" can render each one on its own looping
   canvas (no reloading for the RNG). These are ported from index.html's inline
   intro (the `SK` block + BRIDGE_SETS) and kept in sync by hand; if a sketch or a
   phrase changes there, mirror it here. White-on-black, one frame from (w,h,t). */
(function(){
  'use strict';
  var TAU=Math.PI*2;

  // phrase → sketch, mirroring index.html BRIDGE_SETS + the MUST DESIGN GAMES finale.
  var INTROS=[
    {words:['MAKE','DOPE','GROOVES'],             sketch:'waves'},
    {words:['MAXIMUM','DOPAMINE','GUARANTEED'],   sketch:'phyllo'},
    {words:['MANY','DOORS','GUILD'],              sketch:'doors', variants:['doors','manyDoors','turningHall']},
    {words:['MULTIPLAYER','DECK','GATEWAY'],      sketch:'cards'},
    {words:['MASTER','DATA','GENOME'],            sketch:'helix'},
    {words:['METROPOLIS','DAWN','GRID'],          sketch:'hilbert'},
    {words:['MULTIPLE','DIMENSIONS','GENERATED'], sketch:'lorenz'},
    {words:['MODULAR','DIGITAL','GOODS'],         sketch:'sierpinski'},
    {words:['MANIFEST','DIVINE','GEOMETRY'],      sketch:'metatron'},
    {words:['MATH','DRAWS','GRAPHICS'],           sketch:'fourier'},
    {words:['MUST','DESIGN','GAMES'],             sketch:'life'}
  ];

  // Factory: each canvas gets its own sketch set + private state, so many run at once.
  function makeSketches(ctx){
    var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
    function col(hue,a){return 'rgba(255,255,255,'+a+')';}   // sketches draw pure white
    var fourierS={},hilbertS={},lifeS={};
    var SK={};

    SK.waves=function(w,h,t){
      var mid=h/2,nw=5,step=Math.max(2,Math.floor(w/260));ctx.lineCap='round';ctx.shadowColor=col(300,0.4);
      ctx.strokeStyle=col(300,0.1);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,mid);ctx.lineTo(w,mid);ctx.stroke();
      for(var k=0;k<nw;k++){var freq=2+k*1.6,amp=h*0.2*(1-k/(nw+1)),sp=0.7+k*0.35;
        ctx.strokeStyle=col(300+k*14,0.8-k*0.13);ctx.lineWidth=2.4-k*0.32;ctx.beginPath();
        for(var x=0;x<=w;x+=step){var u=x/w,win=Math.sin(Math.PI*u),y=mid+Math.sin(u*freq*TAU+t*sp)*amp*win;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}
        ctx.stroke();}
    };
    SK.phyllo=function(w,h,t){
      var cx=w/2,cy=h/2,golden=TAU/(((1+Math.sqrt(5))/2)*((1+Math.sqrt(5))/2)),N=600,R=Math.min(w,h)*0.46,scale=R/Math.sqrt(N),dot=Math.max(0.8,scale*0.5),spin=t*0.12;
      ctx.shadowColor=col(40,0.4);
      for(var i=1;i<=N;i++){var a=i*golden+spin,rad=scale*Math.sqrt(i),x=cx+Math.cos(a)*rad,y=cy+Math.sin(a)*rad,f=i/N;
        ctx.fillStyle=col(40+30*f,0.35+0.5*f);ctx.beginPath();ctx.arc(x,y,dot,0,TAU);ctx.fill();}
    };
    SK.doors=function(w,h,t){
      var N=22,speed=0.55,focal=Math.min(w,h)*0.62,march=t*speed;
      var cx=w/2+Math.sin(t*0.9)*w*0.018,cy=h/2+Math.sin(t*1.7)*h*0.012;
      ctx.shadowBlur=0;ctx.lineCap='butt';ctx.lineJoin='miter';
      ctx.strokeStyle='hsla(0,0%,45%,0.18)';ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(0,0);ctx.lineTo(cx,cy);ctx.moveTo(w,0);ctx.lineTo(cx,cy);
      ctx.moveTo(0,h);ctx.lineTo(cx,cy);ctx.moveTo(w,h);ctx.lineTo(cx,cy);
      ctx.stroke();
      for(var i=N;i>=1;i--){
        var z=i-(march%1),s=focal/z,hw=0.26*s,hh=0.42*s;
        if(hw<0.4)continue;
        var alpha=Math.min(1,Math.max(0.05,1.2-z/N)),top=cy-hh,bot=cy+hh;
        ctx.strokeStyle='rgba(255,255,255,'+alpha.toFixed(3)+')';
        ctx.lineWidth=Math.min(16,Math.max(0.8,7/z));
        ctx.beginPath();ctx.moveTo(cx-hw,bot);ctx.lineTo(cx-hw,top);ctx.lineTo(cx+hw,top);ctx.lineTo(cx+hw,bot);ctx.stroke();
      }
    };
    SK.manyDoors=function(w,h,t){
      var N=28,speed=0.5,focal=Math.min(w,h)*0.62,march=t*speed;
      var cx=w/2+Math.sin(t*0.7)*w*0.012,cy=h/2+Math.sin(t*1.3)*h*0.008;
      var WX=0.40,HY=0.52,DH=0.80,GAP=0.6;
      ctx.shadowBlur=0;ctx.lineCap='butt';ctx.lineJoin='miter';
      var e=focal;
      ctx.strokeStyle='rgba(255,255,255,0.14)';ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(cx-WX*e,cy-HY*e);ctx.lineTo(cx,cy);ctx.moveTo(cx+WX*e,cy-HY*e);ctx.lineTo(cx,cy);
      ctx.moveTo(cx-WX*e,cy+HY*e);ctx.lineTo(cx,cy);ctx.moveTo(cx+WX*e,cy+HY*e);ctx.lineTo(cx,cy);
      ctx.stroke();
      for(var i=N;i>=1;i--){
        var z=i-(march%1);
        if(z<0.12)continue;
        var s=focal/z;
        if(WX*s<0.4)continue;
        var zf=z+GAP,sf=focal/zf;
        var pass=z>0.4?1:Math.max(0,(z-0.12)/0.28);
        var alpha=Math.min(1,Math.max(0.05,1.25-z/N))*pass;
        ctx.lineWidth=Math.min(9,Math.max(0.7,4.2/z));
        ctx.strokeStyle='rgba(255,255,255,'+alpha.toFixed(3)+')';
        for(var side=-1;side<=1;side+=2){
          var xn=cx+side*WX*s,xf=cx+side*WX*sf;
          var floorN=cy+HY*s,floorF=cy+HY*sf,topN=cy+(HY-DH)*s,topF=cy+(HY-DH)*sf;
          ctx.beginPath();
          ctx.moveTo(xn,floorN);ctx.lineTo(xn,topN);ctx.lineTo(xf,topF);ctx.lineTo(xf,floorF);
          ctx.closePath();ctx.stroke();
        }
      }
    };
    SK.turningHall=function(w,h,t){
      var N=22,speed=0.5,focal=Math.min(w,h)*0.62,march=t*speed;
      var cy=h/2+Math.sin(t*1.4)*h*0.010,WX=0.26,HY=0.42;
      ctx.shadowBlur=0;ctx.lineCap='butt';ctx.lineJoin='miter';
      for(var i=N;i>=1;i--){
        var z=i-(march%1),s=focal/z;
        if(WX*s<0.4)continue;
        var bend=Math.sin(z*0.45-t*0.9)*w*0.16*(1-z/(N+3)),dx=w/2+bend;
        var alpha=Math.min(1,Math.max(0.05,1.2-z/N));
        ctx.strokeStyle='rgba(255,255,255,'+alpha.toFixed(3)+')';
        ctx.lineWidth=Math.min(15,Math.max(0.8,6.5/z));
        var hw=WX*s,hh=HY*s,top=cy-hh,bot=cy+hh;
        ctx.beginPath();
        ctx.moveTo(dx-hw,bot);ctx.lineTo(dx-hw,top);ctx.lineTo(dx+hw,top);ctx.lineTo(dx+hw,bot);
        ctx.stroke();
      }
    };
    SK.cards=function(w,h,t){
      var hx=w/2,hy=h*1.16,R=Math.min(w,h)*0.78,cw=Math.min(w,h)*0.155,ch=cw*1.45,rr=cw*0.12;
      var spread=TAU*0.34,N=23,flow=t*0.14;
      ctx.shadowBlur=0;ctx.lineJoin='round';
      function rrect(x,y,ww,hh,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+ww,y,x+ww,y+hh,r);ctx.arcTo(x+ww,y+hh,x,y+hh,r);ctx.arcTo(x,y+hh,x,y,r);ctx.arcTo(x,y,x+ww,y,r);ctx.closePath();}
      var fs=[];for(var i=0;i<N;i++)fs.push((((i/N+flow)%1)+1)%1);fs.sort(function(a,b){return a-b;});
      for(var j=0;j<fs.length;j++){var f=fs[j];
        var ang=-spread/2+f*spread,cx=hx+Math.sin(ang)*R,cy=hy-Math.cos(ang)*R;
        var a=Math.min(1,Math.min(f,1-f)/0.05);
        ctx.save();ctx.translate(cx,cy);ctx.rotate(ang);
        rrect(-cw/2,-ch/2,cw,ch,rr);
        ctx.fillStyle='rgba(0,0,0,'+(0.9*a).toFixed(3)+')';ctx.fill();
        ctx.lineWidth=Math.max(1,cw*0.05);ctx.strokeStyle='rgba(255,255,255,'+a.toFixed(3)+')';ctx.stroke();
        ctx.beginPath();ctx.arc(0,0,cw*0.15,0,TAU);ctx.fillStyle='rgba(255,255,255,'+a.toFixed(3)+')';ctx.fill();
        ctx.restore();
      }
    };
    SK.lorenz=function(w,h,t){
      var sg=10,rho=28,bt=8/3,dt=0.006,x=0.1,y=0,z=0,i,dx,dy,dz;
      for(i=0;i<400;i++){dx=sg*(y-x);dy=x*(rho-z)-y;dz=x*y-bt*z;x+=dx*dt;y+=dy*dt;z+=dz*dt;}
      var rot=t*0.25,cr=Math.cos(rot),sr=Math.sin(rot),sc=Math.min(w,h)/62,cx=w/2,cy=h/2;
      ctx.lineCap='round';ctx.shadowColor=col(190,0.5);ctx.strokeStyle=col(190,0.8);ctx.lineWidth=1.1;ctx.beginPath();
      for(i=0;i<5200;i++){dx=sg*(y-x);dy=x*(rho-z)-y;dz=x*y-bt*z;x+=dx*dt;y+=dy*dt;z+=dz*dt;var px=cx+(x*cr-y*sr)*sc,py=cy+(z-25)*sc;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}
      ctx.stroke();
    };
    SK.hilbert=function(w,h,t){
      var S=hilbertS,order=6,m=Math.min(w,h)*0.86,key=Math.round(w)+'x'+Math.round(h);
      if(S.key!==key){S.key=key;S.pts=[];var P=S.pts;
        (function hil(x,y,xi,xj,yi,yj,n){
          if(n<=0){P.push([x+(xi+yi)/2,y+(xj+yj)/2]);return;}
          hil(x,y,yi/2,yj/2,xi/2,xj/2,n-1);
          hil(x+xi/2,y+xj/2,xi/2,xj/2,yi/2,yj/2,n-1);
          hil(x+xi/2+yi/2,y+xj/2+yj/2,xi/2,xj/2,yi/2,yj/2,n-1);
          hil(x+xi/2+yi,y+xj/2+yj,-yi/2,-yj/2,-xi/2,-xj/2,n-1);
        })(w/2-m/2,h/2-m/2,m,0,0,m,order);
      }
      var pts=S.pts,N=pts.length,cyc=12,ph=(t%cyc)/cyc,draw=Math.min(1,ph/0.82);
      var upto=draw*(N-1),full=Math.floor(upto),frac=upto-full,i;
      ctx.shadowBlur=0;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=col(0,0.35);ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
      for(i=1;i<N;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.stroke();
      ctx.strokeStyle=col(0,0.92);ctx.lineWidth=1.7;
      ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
      for(i=1;i<=full;i++)ctx.lineTo(pts[i][0],pts[i][1]);
      if(full<N-1){var a=pts[full],b=pts[full+1];ctx.lineTo(a[0]+(b[0]-a[0])*frac,a[1]+(b[1]-a[1])*frac);}
      ctx.stroke();
    };
    SK.helix=function(w,h,t){
      var cx=w/2,A=Math.min(w,h)*0.16,twist=TAU/(Math.min(w,h)*0.46),scroll=reduce?0:t*0.9,step=Math.max(3,Math.round(h/120));
      ctx.shadowBlur=0;ctx.lineCap='round';
      for(var y=-A;y<=h+A;y+=step*3){
        var ph=y*twist+scroll,sa=Math.sin(ph),dp=Math.cos(ph),xa=cx+A*sa,xb=cx-A*sa;
        ctx.strokeStyle=col(0,0.12+0.30*Math.abs(sa));ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(xa,y);ctx.lineTo(xb,y);ctx.stroke();
        ctx.fillStyle=col(0,0.22+0.62*(dp+1)/2);ctx.beginPath();ctx.arc(xa,y,1.8,0,TAU);ctx.fill();
        ctx.fillStyle=col(0,0.22+0.62*(1-(dp+1)/2));ctx.beginPath();ctx.arc(xb,y,1.8,0,TAU);ctx.fill();
      }
      function strand(po){var px,py;
        for(var y=-A;y<=h+A;y+=step){var ph=y*twist+scroll+po,x=cx+A*Math.sin(ph),front=(Math.cos(ph)+1)/2;
          if(y>-A){ctx.strokeStyle=col(0,0.18+0.77*front);ctx.lineWidth=0.8+1.9*front;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(x,y);ctx.stroke();}
          px=x;py=y;}
      }
      strand(0);strand(Math.PI);
    };
    SK.sierpinski=function(w,h,t){
      var depth=7,R=Math.min(w,h)*0.46,cx=w/2,cy=h/2+R*0.12,rot=t*0.08,v=[],k;
      for(k=0;k<3;k++){var a=-Math.PI/2+k*TAU/3+rot;v.push([cx+Math.cos(a)*R,cy+Math.sin(a)*R]);}
      ctx.shadowColor=col(0,0.4);ctx.fillStyle=col(0,0.9);ctx.beginPath();
      function tri(a,b,c,n){
        if(n===0){ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.closePath();return;}
        var ab=[(a[0]+b[0])/2,(a[1]+b[1])/2],bc=[(b[0]+c[0])/2,(b[1]+c[1])/2],ca=[(c[0]+a[0])/2,(c[1]+a[1])/2];
        tri(a,ab,ca,n-1);tri(ab,b,bc,n-1);tri(ca,bc,c,n-1);
      }
      tri(v[0],v[1],v[2],depth);ctx.fill();
    };
    SK.metatron=function(w,h,t){
      var cx=w/2,cy=h/2,r=Math.min(w,h)*0.092,rot=t*0.12,p=[{x:0,y:0}],k,a,i,j;
      for(k=0;k<6;k++){a=k*TAU/6+rot;p.push({x:Math.cos(a)*2*r,y:Math.sin(a)*2*r});}
      for(k=0;k<6;k++){a=k*TAU/6+rot;p.push({x:Math.cos(a)*4*r,y:Math.sin(a)*4*r});}
      ctx.shadowColor=col(45,0.4);ctx.strokeStyle=col(45,0.22);ctx.lineWidth=1;ctx.beginPath();
      for(i=0;i<p.length;i++)for(j=i+1;j<p.length;j++){ctx.moveTo(cx+p[i].x,cy+p[i].y);ctx.lineTo(cx+p[j].x,cy+p[j].y);}ctx.stroke();
      ctx.strokeStyle=col(45,0.85);ctx.lineWidth=1.5;
      for(i=0;i<p.length;i++){ctx.beginPath();ctx.arc(cx+p[i].x,cy+p[i].y,r,0,TAU);ctx.stroke();}
    };
    SK.fourier=function(w,h,t){
      var S=fourierS;if(S.h!==h){S.h=h;S.trace=[];}
      var terms=6,baseR=Math.min(w,h)*0.18,cxc=w*0.30,px=cxc,py=h*0.5;
      ctx.lineCap='round';ctx.shadowColor=col(0,0.4);
      for(var k=0;k<terms;k++){
        var n=2*k+1,r=baseR*(4/(n*Math.PI));
        ctx.strokeStyle=col(0,0.16);ctx.lineWidth=1;ctx.beginPath();ctx.arc(px,py,r,0,TAU);ctx.stroke();
        var ang=n*t,nx=px+r*Math.cos(ang),ny=py+r*Math.sin(ang);
        ctx.strokeStyle=col(0,0.7);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(nx,ny);ctx.stroke();
        px=nx;py=ny;
      }
      S.trace.unshift(py);var maxLen=240;if(S.trace.length>maxLen)S.trace.length=maxLen;
      var waveX0=cxc+baseR+30,dx=(w-waveX0-8)/maxLen;
      ctx.strokeStyle=col(0,0.25);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(waveX0,S.trace[0]);ctx.stroke();
      ctx.strokeStyle=col(0,0.95);ctx.lineWidth=1.6;ctx.beginPath();
      for(var i=0;i<S.trace.length;i++){var X=waveX0+i*dx,Y=S.trace[i];i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);}
      ctx.stroke();
    };
    // Conway's Game of Life — the MUST DESIGN GAMES finale, simplified for the viewer
    // (no background-persistence machinery; ~3 generations/sec, reseeds when it dies out).
    SK.life=function(w,h,t){
      var cell=Math.max(5,Math.round(Math.min(w,h)/34)),cols=Math.max(8,Math.floor(w/cell)),rows=Math.max(8,Math.floor(h/cell)),S=lifeS;
      function seed(){S.grid=[];for(var y=0;y<rows;y++){var row=[];for(var x=0;x<cols;x++)row.push(Math.random()<0.30?1:0);S.grid.push(row);}S.cols=cols;S.rows=rows;S.gen=0;}
      if(S.cols!==cols||S.rows!==rows||!S.grid){seed();S.lastT=t;S.acc=0;}
      function step(){var g=S.grid,ng=[],pop=0;
        for(var y=0;y<rows;y++){var row=[];for(var x=0;x<cols;x++){var nb=0;
          for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++)if(dx||dy)nb+=g[(y+dy+rows)%rows][(x+dx+cols)%cols];
          var alive=g[y][x]?(nb===2||nb===3):(nb===3);row.push(alive?1:0);if(alive)pop++;}ng.push(row);}
        S.grid=ng;S.gen++;if(pop===0||S.gen>150)seed();}
      S.acc=(S.acc||0)+Math.max(0,t-(S.lastT||0));S.lastT=t;
      while(S.acc>=0.33){step();S.acc-=0.33;}
      ctx.shadowColor=col(0,0.4);ctx.fillStyle=col(0,0.9);var pad=Math.max(1,cell*0.1);
      for(var y2=0;y2<rows;y2++)for(var x2=0;x2<cols;x2++)if(S.grid[y2][x2])ctx.fillRect(x2*cell+pad,y2*cell+pad,cell-2*pad,cell-2*pad);
    };

    return SK;
  }

  // Draw one frame of a target {cv,ctx,SK,name,t0} at its CSS size.
  function drawTarget(tg,now,reduce){
    var w=tg.cv.clientWidth,h=tg.cv.clientHeight; if(!w||!h)return;
    if(!tg.t0)tg.t0=now; var t=(now-tg.t0)/1000;
    tg.ctx.clearRect(0,0,w,h); tg.ctx.save(); tg.ctx.lineCap='butt'; tg.ctx.lineJoin='round'; tg.ctx.shadowBlur=reduce?0:6;
    (tg.SK[tg.name]||function(){})(w,h,t); tg.ctx.restore();
  }
  function sizeCanvas(tg){var r=tg.cv.getBoundingClientRect(); if(!r.width)return; var dpr=Math.min(2,window.devicePixelRatio||1);
    tg.cv.width=Math.round(r.width*dpr); tg.cv.height=Math.round(r.height*dpr); tg.ctx.setTransform(dpr,0,0,dpr,0,0); tg.t0=0;}

  // Build a grid of looping intro cards, each click-to-embiggen into a lightbox.
  // One shared rAF drives the grid; while the lightbox is open only it draws.
  function mountViewer(grid){
    if(!grid||grid.dataset.mounted)return; grid.dataset.mounted='1';
    var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches, cards=[];

    // ---- lightbox ("embiggen") ----
    var modal=document.createElement('div'); modal.className='intro-modal'; modal.hidden=true;
    var inner=document.createElement('div'); inner.className='intro-modal-inner';
    var mcv=document.createElement('canvas'); inner.appendChild(mcv);
    var mcap=document.createElement('figcaption'); mcap.className='intro-words'; inner.appendChild(mcap);
    var cycleBtn=document.createElement('button'); cycleBtn.type='button'; cycleBtn.className='intro-cycle-btn'; cycleBtn.hidden=true; inner.appendChild(cycleBtn);
    var closeBtn=document.createElement('button'); closeBtn.type='button'; closeBtn.className='intro-close'; closeBtn.setAttribute('aria-label','Close'); closeBtn.innerHTML='&times;';
    modal.appendChild(inner); modal.appendChild(closeBtn); document.body.appendChild(modal);
    var big={cv:mcv,ctx:mcv.getContext('2d'),name:null,t0:0}; big.SK=makeSketches(big.ctx);
    var mOpen=false, mVariants=null, mVi=0;

    function cycleLabel(){ if(mVariants){cycleBtn.hidden=false; cycleBtn.textContent='⟳ next sketch ('+(mVi+1)+'/'+mVariants.length+')';} else cycleBtn.hidden=true; }
    function openModal(intro){
      mcap.innerHTML=''; intro.words.forEach(function(word){var s=document.createElement('span'); s.textContent=word; mcap.appendChild(s);});
      mVariants=intro.variants||null; mVi=0; big.name=mVariants?mVariants[0]:intro.sketch;
      mOpen=true; modal.hidden=false; document.body.style.overflow='hidden'; cycleLabel();
      requestAnimationFrame(function(){sizeCanvas(big); if(reduce)drawTarget(big,performance.now(),reduce);});
    }
    function closeModal(){ mOpen=false; modal.hidden=true; document.body.style.overflow=''; }
    function cycle(){ if(!mVariants)return; mVi=(mVi+1)%mVariants.length; big.name=mVariants[mVi]; big.t0=0; cycleLabel(); }
    cycleBtn.addEventListener('click',function(e){e.stopPropagation(); cycle();});
    closeBtn.addEventListener('click',closeModal);
    modal.addEventListener('click',function(e){ if(e.target===modal)closeModal(); });        // backdrop
    mcv.addEventListener('click',function(){ if(mVariants)cycle(); });                        // click sketch cycles (variant only)
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&mOpen)closeModal(); });

    // ---- grid ----
    INTROS.forEach(function(intro){
      var fig=document.createElement('figure'); fig.className='intro-card';
      var cv=document.createElement('canvas'); fig.appendChild(cv);
      var cap=document.createElement('figcaption'); cap.className='intro-words';
      intro.words.forEach(function(word){var s=document.createElement('span'); s.textContent=word; cap.appendChild(s);});
      fig.appendChild(cap);
      var card={cv:cv,ctx:cv.getContext('2d'),name:intro.sketch,t0:0}; card.SK=makeSketches(card.ctx);
      if(intro.variants){var badge=document.createElement('span'); badge.className='intro-cycle'; badge.textContent='⟳'; fig.appendChild(badge);}
      fig.title='Embiggen'; fig.setAttribute('role','button'); fig.tabIndex=0;
      fig.addEventListener('click',function(){openModal(intro);});
      fig.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openModal(intro);}});
      grid.appendChild(fig); cards.push(card);
    });

    function sizeAll(){cards.forEach(sizeCanvas); if(mOpen)sizeCanvas(big);}
    function frame(now){
      if(mOpen){ drawTarget(big,now,reduce); }
      else { for(var i=0;i<cards.length;i++)drawTarget(cards[i],now,reduce); }
      if(!reduce)requestAnimationFrame(frame);
    }
    sizeAll();
    var rt; window.addEventListener('resize',function(){clearTimeout(rt); rt=setTimeout(sizeAll,150);});
    requestAnimationFrame(frame);
  }

  window.MDGIntro={intros:INTROS, makeSketches:makeSketches, mountViewer:mountViewer};

  // Self-init: mount into #intro-grid once the DOM is ready.
  function init(){mountViewer(document.getElementById('intro-grid'));}
  if(document.readyState!=='loading')init(); else document.addEventListener('DOMContentLoaded',init);
})();
