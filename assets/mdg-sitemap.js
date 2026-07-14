/* MDG site map — a draggable/pannable node graph of the whole site, for /mdg.html.
   Drag the canvas to pan, drag a node to rearrange, click a node to go there.
   Theme-aware (reads CSS vars), no animation loop — redraws only on interaction. */
(function(){
  'use strict';
  var TAU=Math.PI*2;

  // The site's navigation, as a tree rooted at the homepage.
  var MAP={ label:'mattdanusergrant.com', url:'/', children:[
    { label:'Must Design Games', url:'https://mustdesigngames.mattdanusergrant.com/', children:[
      { label:'Metropolis Dawn Grid', url:'https://mustdesigngames.mattdanusergrant.com/metropolisdawngrid/' },
      { label:'Moon Druid Guardians', url:'https://moondruidguardians.mattdanusergrant.com/' },
      { label:'Match Deck Gathering', url:'https://mustdesigngames.mattdanusergrant.com/matchdeckgathering/' }
    ]},
    { label:'Tools', url:'/#tools-h', children:[
      { label:'Math Draws Graphics', url:'https://mathdrawsgraphics.mattdanusergrant.com/', blank:true },
      { label:'Make Dope Grooves', url:'/tool.html?app=makedopegrooves' },
      { label:'Markdown Document Generator', url:'/resume-builder.html' }
    ]},
    { label:'Projects', url:'/#projects-h', children:[
      { label:'Invisible Ink', url:'https://itsinvisible.ink', blank:true },
      { label:'Keeping Cadence', url:'https://mattdanusergrant.github.io/keeping-cadence/', blank:true },
      { label:'Dank Omphalos', url:'https://dankomphalos.com/', blank:true }
    ]},
    { label:'Case Studies', url:'/#case-studies', children:[
      { label:'Building this site', url:'/case-studies/building-this-site.html' },
      { label:'Building with AI', url:'/case-studies/building-with-ai.html' },
      { label:'Living Atlas', url:'/case-studies/living-atlas-fantasy-rpg.html' }
    ]},
    { label:'Consulting', url:'/consulting.html' },
    { label:'Resume', url:'/resume.html' },
    { label:'MDG Workshop', url:'/mdg.html', here:true },
    { label:'Many Doors Guild', url:'https://manydoorsguild.com', blank:true }
  ]};

  // Radial layout: home at origin, tier-1 on a ring, each child fanned out past its parent.
  function layout(){
    var nodes=[], edges=[];
    var home={label:MAP.label,url:MAP.url,x:0,y:0,depth:0}; nodes.push(home);
    var kids=MAP.children, n=kids.length, R1=210;
    kids.forEach(function(k,i){
      var a=(i/n)*TAU - Math.PI/2;
      var nd={label:k.label,url:k.url,blank:k.blank,here:k.here,depth:1,x:Math.cos(a)*R1,y:Math.sin(a)*R1};
      nodes.push(nd); edges.push([home,nd]);
      var ch=k.children||[], m=ch.length, R2=180, spread=Math.min(TAU*0.42,0.5+m*0.16);
      ch.forEach(function(c,j){
        var off=m>1?(j/(m-1)-0.5)*spread:0, aa=a+off;
        var cn={label:c.label,url:c.url,blank:c.blank,depth:2,x:nd.x+Math.cos(aa)*R2,y:nd.y+Math.sin(aa)*R2};
        nodes.push(cn); edges.push([nd,cn]);
      });
    });
    return {nodes:nodes,edges:edges};
  }

  function mount(cv){
    if(!cv||cv.dataset.mounted)return; cv.dataset.mounted='1';
    var ctx=cv.getContext('2d'), dpr=1;
    var g=layout(), nodes=g.nodes, edges=g.edges;
    var panX=0, panY=0, scale=1, C={};

    function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim();}
    function readTheme(){C.bg=css('--bg');C.paper=css('--paper');C.ink=css('--ink');C.muted=css('--muted');C.line=css('--line');C.line2=css('--line-2');draw();}

    function nodeFont(){ctx.font='600 13px Fraunces, Georgia, serif';}
    function measure(nd){ nodeFont(); var tw=ctx.measureText(nd.label).width; nd._w=tw+26; nd._h=30; return nd; }

    function fit(){
      nodes.forEach(measure);
      var minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
      nodes.forEach(function(n){minX=Math.min(minX,n.x-n._w/2);maxX=Math.max(maxX,n.x+n._w/2);minY=Math.min(minY,n.y-n._h/2);maxY=Math.max(maxY,n.y+n._h/2);});
      var w=cv.clientWidth,h=cv.clientHeight,pad=36;
      scale=Math.min((w-pad*2)/(maxX-minX),(h-pad*2)/(maxY-minY),1);
      var bcx=(minX+maxX)/2, bcy=(minY+maxY)/2;
      panX=-bcx*scale; panY=-bcy*scale;
    }

    function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

    function draw(){
      var w=cv.clientWidth,h=cv.clientHeight;
      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
      ctx.save(); ctx.translate(w/2+panX,h/2+panY); ctx.scale(scale,scale);
      ctx.strokeStyle=C.line2; ctx.lineWidth=1.3;
      edges.forEach(function(e){ctx.beginPath();ctx.moveTo(e[0].x,e[0].y);ctx.lineTo(e[1].x,e[1].y);ctx.stroke();});
      nodeFont(); ctx.textAlign='center'; ctx.textBaseline='middle';
      nodes.forEach(function(nd){
        var x=nd.x-nd._w/2,y=nd.y-nd._h/2;
        roundRect(x,y,nd._w,nd._h,15);
        if(nd.depth===0){ctx.fillStyle=C.ink;ctx.fill();ctx.fillStyle=C.bg;}
        else{ctx.fillStyle=C.paper;ctx.fill();ctx.lineWidth=nd.here?2.2:1.4;ctx.strokeStyle=nd.here?C.ink:C.line2;ctx.stroke();ctx.fillStyle=nd.depth===2?C.muted:C.ink;}
        ctx.fillText(nd.label,nd.x,nd.y+0.5);
      });
      ctx.restore();
    }

    function toWorld(e){var r=cv.getBoundingClientRect();return {x:((e.clientX-r.left)-(cv.clientWidth/2+panX))/scale,y:((e.clientY-r.top)-(cv.clientHeight/2+panY))/scale};}
    function nodeAt(p){for(var i=nodes.length-1;i>=0;i--){var n=nodes[i];if(Math.abs(p.x-n.x)<=n._w/2&&Math.abs(p.y-n.y)<=n._h/2)return n;}return null;}

    var dragNode=null,panning=false,moved=0,cx0=0,cy0=0,sx0=0,sy0=0,nx0=0,ny0=0;
    cv.addEventListener('pointerdown',function(e){
      e.preventDefault(); cv.setPointerCapture(e.pointerId);
      var nd=nodeAt(toWorld(e)); moved=0; cx0=e.clientX; cy0=e.clientY;
      if(nd){dragNode=nd;nx0=nd.x;ny0=nd.y;}else{panning=true;sx0=panX;sy0=panY;}
      cv.classList.add('grabbing');
    });
    cv.addEventListener('pointermove',function(e){
      if(!dragNode&&!panning){ cv.style.cursor=nodeAt(toWorld(e))?'pointer':'grab'; return; }
      var dx=e.clientX-cx0, dy=e.clientY-cy0; moved=Math.max(moved,Math.hypot(dx,dy));
      if(dragNode){dragNode.x=nx0+dx/scale;dragNode.y=ny0+dy/scale;}
      else{panX=sx0+dx;panY=sy0+dy;}
      draw();
    });
    function end(e){
      if(moved<5){ var nd=dragNode||nodeAt(toWorld(e)); if(nd&&!nd.here){ if(nd.blank)window.open(nd.url,'_blank','noopener'); else location.href=nd.url; } }
      dragNode=null; panning=false; cv.classList.remove('grabbing');
    }
    cv.addEventListener('pointerup',end);
    cv.addEventListener('pointercancel',function(){dragNode=null;panning=false;cv.classList.remove('grabbing');});

    function resize(){dpr=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(cv.clientWidth*dpr);cv.height=Math.round(cv.clientHeight*dpr);fit();draw();}
    var rt; window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(resize,150);});
    new MutationObserver(readTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    readTheme(); resize();
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){fit();draw();});
  }

  window.MDGSitemap={mount:mount};
  function init(){mount(document.getElementById('sitemap-canvas'));}
  if(document.readyState!=='loading')init(); else document.addEventListener('DOMContentLoaded',init);
})();
