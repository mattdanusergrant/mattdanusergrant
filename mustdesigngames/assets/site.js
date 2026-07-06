/* site.js — shared theme toggle + theme-switch FX.
   Single source of truth; was duplicated verbatim in every page.
   The head-blocking theme-init (reads localStorage before paint) stays inline per page. */
(function(){
  var btn=document.getElementById('theme-toggle');
  if(!btn)return;
  var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  function fx(theme){
    if(reduce)return;
    var o=document.createElement('div');
    o.className='fx-overlay '+(theme==='light'?'fx-sunrise':'fx-sunset');
    document.body.appendChild(o);
    setTimeout(function(){o.remove();},3600);
  }
  btn.addEventListener('click',function(){
    var next=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
    if(!reduce){
      document.documentElement.classList.add('mode-shift');
      setTimeout(function(){document.documentElement.classList.remove('mode-shift');},2600);
    }
    document.documentElement.setAttribute('data-theme',next);
    localStorage.setItem('theme',next);
    fx(next);
  });
})();

/* Responsive nav: hamburger toggle on small screens. */
(function(){
  var nav=document.querySelector('.nav');
  if(!nav)return;
  var btn=nav.querySelector('.nav-toggle');
  var links=document.getElementById('nav-links');
  if(!btn||!links)return;
  function set(open){
    if(open)nav.setAttribute('data-open','');else nav.removeAttribute('data-open');
    btn.setAttribute('aria-expanded',open?'true':'false');
  }
  btn.addEventListener('click',function(e){e.stopPropagation();set(!nav.hasAttribute('data-open'));});
  links.addEventListener('click',function(e){if(e.target.closest('a'))set(false);});
  document.addEventListener('click',function(e){if(nav.hasAttribute('data-open')&&!nav.contains(e.target))set(false);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')set(false);});
  window.addEventListener('resize',function(){if(window.innerWidth>640)set(false);});
})();
