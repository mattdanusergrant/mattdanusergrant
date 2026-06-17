#!/usr/bin/env node
// MDG Local Editor — no npm install required
// Usage:  node edit-server.js
// Then open  http://localhost:3131
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3131;
const ROOT = __dirname;

const MIME = {
  '.html' : 'text/html; charset=utf-8',
  '.css'  : 'text/css',
  '.js'   : 'application/javascript',
  '.mjs'  : 'application/javascript',
  '.json' : 'application/json',
  '.png'  : 'image/png',
  '.jpg'  : 'image/jpeg',
  '.jpeg' : 'image/jpeg',
  '.gif'  : 'image/gif',
  '.svg'  : 'image/svg+xml',
  '.ico'  : 'image/x-icon',
  '.woff' : 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf'  : 'font/ttf',
  '.webp' : 'image/webp',
  '.mp4'  : 'video/mp4',
  '.webm' : 'video/webm',
  '.txt'  : 'text/plain',
  '.md'   : 'text/plain',
};

// ─────────────────────────────────────────────────────────────────────────────
// buildOverlay() returns the HTML/CSS/JS injected before </body>.
// It's a function (not a template literal constant) so the embedded JS
// can be written as a plain string with explicit escaping where needed —
// avoiding the template-literal \s → s pitfall for embedded regex sources.
// ─────────────────────────────────────────────────────────────────────────────
function buildOverlay() {
  // Embedded client-side script written as a JS string (no template-literal
  // escape-sequence surprises).  Backticks and backslashes are escaped.
  const clientJS = [
    '(function(){',
    "'use strict';",
    'var editing=false,dragSrc=null,linkListeners=[];',
    "var hasBridge=typeof BRIDGE_SETS!=='undefined';",

    // ── Toolbar ───────────────────────────────────────────────────────────
    "var bar=document.createElement('div');",
    "bar.id='mdg-bar';",
    "bar.innerHTML='<span class=\"mdg-label\">MDG\\u00a0Editor<\\/span>'",
    "  +'<button id=\"mdg-toggle\">Edit<\\/button>'",
    "  +(hasBridge?'<button id=\"mdg-bridge\">Bridge sets<\\/button>':'')",
    "  +'<button id=\"mdg-save\" disabled>Save<\\/button>'",
    "  +'<span id=\"mdg-st\" class=\"mdg-st\"><\\/span>'",
    "  +'<span id=\"mdg-hint\" class=\"mdg-hint\"><\\/span>';",
    'document.body.appendChild(bar);',
    "var toggleBtn=bar.querySelector('#mdg-toggle');",
    "var saveBtn=bar.querySelector('#mdg-save');",
    "var stEl=bar.querySelector('#mdg-st');",
    "var hintEl=bar.querySelector('#mdg-hint');",

    // ── Helpers ───────────────────────────────────────────────────────────
    "function setStatus(msg,ms){stEl.textContent=msg;if(ms)setTimeout(function(){if(stEl.textContent===msg)stEl.textContent='';},ms);}",
    "function setHint(msg){hintEl.textContent=msg;}",

    // ── Toggle edit mode ──────────────────────────────────────────────────
    "toggleBtn.addEventListener('click',function(){",
    '  editing=!editing;',
    "  toggleBtn.classList.toggle('on',editing);",
    "  toggleBtn.textContent=editing?'Editing':'Edit';",
    '  saveBtn.disabled=!editing;',
    "  document.body.classList.toggle('mdg-editing',editing);",
    '  if(editing){enableEditing();setHint("Links stay put while editing \\u00b7 Ctrl+click to edit a URL");}',
    "  else{disableEditing();setHint('');}",
    '});',

    // ── Editable selectors ────────────────────────────────────────────────
    "var TEXT_SEL=[",
    "  '.head h1','.head .eyebrow','.head .lede',",
    "  '.col-head',",
    "  '.card h2','.card p','.card .btn',",
    "  '.hero h1','.hero .eyebrow','.hero .lede',",
    "  '.card .label',",
    "  '.r-header h1','.r-header .tagline',",
    "  '.section-label',",
    "  '.summary p',",
    "  '.company','.job-title','.dates',",
    "  '.game-credit',",
    "  'ul.bullets li','.qa-titles'",
    "].join(',');",

    // ── Enable / disable editing ──────────────────────────────────────────
    'function enableEditing(){',
    "  document.querySelectorAll(TEXT_SEL).forEach(function(el){",
    "    if(el.querySelector('svg'))return;",
    "    el.contentEditable='true';",
    '    el.spellcheck=false;',
    '  });',
    "  document.querySelectorAll('article.card').forEach(enableDrag);",
    "  document.querySelectorAll('a').forEach(function(a){",
    '    function fn(e){',
    '      if(!editing)return;',
    '      if(e.ctrlKey||e.metaKey){',
    '        e.preventDefault();e.stopPropagation();',
    "        var cur=a.getAttribute('href')||'';",
    "        var url=prompt('Edit link URL:',cur);",
    "        if(url!==null)a.setAttribute('href',url);",
    '        return;',
    '      }',
    '      e.preventDefault();',
    '    }',
    "    a.addEventListener('click',fn,true);",
    '    linkListeners.push({el:a,fn:fn});',
    '  });',
    '}',

    'function disableEditing(){',
    "  document.querySelectorAll('[contenteditable]').forEach(function(el){",
    "    el.removeAttribute('contenteditable');",
    "    el.removeAttribute('spellcheck');",
    '  });',
    "  document.querySelectorAll('article.card[draggable]').forEach(function(card){",
    "    card.removeAttribute('draggable');",
    "    card.removeEventListener('dragstart',onDragStart);",
    "    card.removeEventListener('dragover',onDragOver);",
    "    card.removeEventListener('dragleave',onDragLeave);",
    "    card.removeEventListener('drop',onDrop);",
    "    card.removeEventListener('dragend',onDragEnd);",
    '  });',
    "  linkListeners.forEach(function(l){l.el.removeEventListener('click',l.fn,true);});",
    '  linkListeners=[];',
    "  document.querySelectorAll('.mdg-drag-over,.mdg-dragging').forEach(function(el){",
    "    el.classList.remove('mdg-drag-over','mdg-dragging');",
    '  });',
    '}',

    // ── Drag & drop ───────────────────────────────────────────────────────
    'function enableDrag(card){',
    "  card.setAttribute('draggable','true');",
    "  card.addEventListener('dragstart',onDragStart);",
    "  card.addEventListener('dragover',onDragOver);",
    "  card.addEventListener('dragleave',onDragLeave);",
    "  card.addEventListener('drop',onDrop);",
    "  card.addEventListener('dragend',onDragEnd);",
    '}',

    'function onDragStart(e){',
    '  if(document.activeElement&&document.activeElement.isContentEditable){e.preventDefault();return;}',
    '  dragSrc=this;',
    "  this.classList.add('mdg-dragging');",
    "  e.dataTransfer.effectAllowed='move';",
    "  e.dataTransfer.setData('text/plain','');",
    '}',

    'function onDragOver(e){',
    '  e.preventDefault();',
    "  e.dataTransfer.dropEffect='move';",
    "  if(this!==dragSrc)this.classList.add('mdg-drag-over');",
    '  return false;',
    '}',

    'function onDragLeave(){',
    "  this.classList.remove('mdg-drag-over');",
    '}',

    'function onDrop(e){',
    '  e.stopPropagation();',
    "  this.classList.remove('mdg-drag-over');",
    '  if(dragSrc&&dragSrc!==this){',
    '    var rect=this.getBoundingClientRect();',
    '    var after=e.clientY>rect.top+rect.height/2;',
    '    if(after)this.parentNode.insertBefore(dragSrc,this.nextSibling);',
    '    else this.parentNode.insertBefore(dragSrc,this);',
    '  }',
    '  return false;',
    '}',

    'function onDragEnd(){',
    "  this.classList.remove('mdg-dragging');",
    "  document.querySelectorAll('.mdg-drag-over').forEach(function(el){el.classList.remove('mdg-drag-over');});",
    '  dragSrc=null;',
    '}',

    // ── Bridge sets editor ────────────────────────────────────────────────
    'if(hasBridge){',
    "  var modal=document.getElementById('mdg-modal');",
    "  var ta=document.getElementById('mdg-ta');",
    "  var bridgeBtn=bar.querySelector('#mdg-bridge');",
    "  bridgeBtn.addEventListener('click',function(){",
    "    var lines=(BRIDGE_SETS||[]).map(function(arr){return arr.join(',');});",
    "    if(typeof FINAL!=='undefined')lines.push('FINAL:'+FINAL.join(','));",
    "    ta.value=lines.join('\\n');",
    '    modal.classList.add(\'open\');ta.focus();',
    '  });',
    "  document.getElementById('mdg-apply').addEventListener('click',function(){",
    "    var lines=ta.value.trim().split('\\n').filter(Boolean);",
    '    var sets=[],fin=null;',
    '    lines.forEach(function(line){',
    '      line=line.trim();',
    "      if(line.toUpperCase().indexOf('FINAL:')===0){",
    "        fin=line.slice(6).split(',').map(function(w){return w.trim().toUpperCase();});",
    '      }else{',
    "        var words=line.split(',').map(function(w){return w.trim().toUpperCase();}).filter(Boolean);",
    '        if(words.length)sets.push(words);',
    '      }',
    '    });',
    '    if(sets.length)BRIDGE_SETS=sets;',
    '    if(fin)FINAL=fin;',
    '    modal.classList.remove(\'open\');',
    "    setStatus('Bridge updated \\u2014 save to write',4000);",
    '  });',
    "  document.getElementById('mdg-cancel').addEventListener('click',function(){modal.classList.remove('open');});",
    "  modal.addEventListener('click',function(e){if(e.target===modal)modal.classList.remove('open');});",
    '}',

    // ── Save ──────────────────────────────────────────────────────────────
    "saveBtn.addEventListener('click',function(){",
    "  setStatus('Saving\\u2026',0);",
    "  var overlay=document.getElementById('__mdg_overlay__');",
    '  document.body.removeChild(overlay);',
    "  document.querySelectorAll('[contenteditable]').forEach(function(el){",
    "    el.removeAttribute('contenteditable');el.removeAttribute('spellcheck');",
    '  });',
    "  document.querySelectorAll('article.card[draggable]').forEach(function(el){",
    "    el.removeAttribute('draggable');",
    '  });',
    "  var html='<!DOCTYPE html>\\n'+document.documentElement.outerHTML;",
    "  var file=location.pathname==='/'?'/index.html':location.pathname;",
    '  var payload={file:file,html:html};',
    "  if(hasBridge){payload.bridgeSets=BRIDGE_SETS;payload.final=FINAL;}",
    "  fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})",
    '  .then(function(r){return r.json();})',
    '  .then(function(d){',
    '    document.body.appendChild(overlay);',
    "    if(d.ok){setStatus('Saved \\u2713',3000);if(editing)enableEditing();}",
    "    else{setStatus('Error: '+(d.error||'?'),5000);}",
    '  })',
    '  .catch(function(e){',
    '    document.body.appendChild(overlay);',
    "    setStatus('Network error',5000);console.error('MDG save:',e);",
    '  });',
    '});',

    '})();',
  ].join('\n');

  return `
<div id="__mdg_overlay__">
<style>
#mdg-bar{
  position:fixed;bottom:24px;right:24px;z-index:2147483647;
  background:rgba(12,11,10,.94);color:#e8e4dc;
  padding:9px 14px;border-radius:13px;
  display:flex;align-items:center;gap:9px;
  font:600 12px/1 'Inter',system-ui,sans-serif;
  box-shadow:0 4px 28px rgba(0,0,0,.6);
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  user-select:none;white-space:nowrap;
}
#mdg-bar .mdg-label{color:#4fd1c5;letter-spacing:.05em}
#mdg-bar button{
  font:inherit;cursor:pointer;
  border:1.5px solid rgba(255,255,255,.13);
  border-radius:7px;padding:4px 10px;
  background:rgba(255,255,255,.07);color:inherit;
  transition:background .15s,border-color .15s;
  line-height:1.6;
}
#mdg-bar button:hover{background:rgba(255,255,255,.15)}
#mdg-bar button.on{background:#4fd1c5;color:#001a18;border-color:#4fd1c5}
#mdg-bar button:disabled{opacity:.3;cursor:default;pointer-events:none}
#mdg-bar .mdg-st{font-size:11px;color:#8a8478;min-width:46px;font-weight:400}
#mdg-bar .mdg-hint{font-size:10px;color:#6a6460;font-weight:400}
body.mdg-editing [contenteditable]{
  outline:1.5px dashed rgba(79,209,197,.38);
  outline-offset:2px;border-radius:2px;cursor:text;
}
body.mdg-editing [contenteditable]:hover{outline-color:rgba(79,209,197,.7)}
body.mdg-editing [contenteditable]:focus{outline:2px solid #4fd1c5;outline-offset:2px}
body.mdg-editing article.card{cursor:grab;position:relative}
body.mdg-editing article.card:active{cursor:grabbing}
body.mdg-editing article.card::after{
  content:'\\2807';
  position:absolute;top:10px;right:12px;
  font-size:15px;color:rgba(79,209,197,.45);
  pointer-events:none;line-height:1;
}
.mdg-drag-over{outline:2px dashed #4fd1c5 !important;outline-offset:4px}
.mdg-dragging{opacity:.38;transform:scale(.97)}
#mdg-modal{
  display:none;position:fixed;inset:0;z-index:2147483646;
  background:rgba(0,0,0,.65);align-items:center;justify-content:center;
}
#mdg-modal.open{display:flex}
#mdg-modal-inner{
  background:#1d1a16;color:#ede8df;
  border-radius:16px;padding:28px 24px;
  width:min(540px,92vw);max-height:80vh;overflow-y:auto;
  font:13px/1.6 'Inter',system-ui,sans-serif;
  box-shadow:0 8px 48px rgba(0,0,0,.7);
  border:1px solid rgba(255,255,255,.06);
}
#mdg-modal-inner h3{margin:0 0 6px;font-size:15px;color:#4fd1c5}
#mdg-modal-inner .sub{font-size:11px;color:#6a6560;margin:0 0 14px}
#mdg-modal-inner textarea{
  width:100%;box-sizing:border-box;
  background:rgba(255,255,255,.05);color:#ede8df;
  border:1.5px solid rgba(255,255,255,.1);border-radius:8px;
  padding:10px 12px;font:13px/1.65 monospace;
  resize:vertical;min-height:200px;
}
#mdg-modal-inner textarea:focus{outline:none;border-color:rgba(79,209,197,.5)}
#mdg-modal-inner .mrow{display:flex;gap:10px;margin-top:14px}
#mdg-modal-inner .mrow button{
  flex:1;padding:8px 14px;border-radius:8px;border:none;
  cursor:pointer;font:600 13px 'Inter',sans-serif;
}
#mdg-modal-inner .apply{background:#4fd1c5;color:#001a18}
#mdg-modal-inner .cancel{background:rgba(255,255,255,.09);color:#ede8df}
</style>

<div id="mdg-modal">
  <div id="mdg-modal-inner">
    <h3>Bridge Sets</h3>
    <p class="sub">One set per line &middot; words separated by commas &middot; prefix FINAL: for the closing set</p>
    <textarea id="mdg-ta" spellcheck="false"></textarea>
    <div class="mrow">
      <button class="apply"  id="mdg-apply">Apply</button>
      <button class="cancel" id="mdg-cancel">Cancel</button>
    </div>
  </div>
</div>

<script>${clientJS}<\/script>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP server
// ─────────────────────────────────────────────────────────────────────────────
const OVERLAY = buildOverlay();

const server = http.createServer((req, res) => {
  const u        = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = u.pathname;

  // ── Save API ────────────────────────────────────────────────────────────
  if (req.method === 'POST' && pathname === '/api/save') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { file, html, bridgeSets, final: finalSet } = JSON.parse(body);

        // Security: only allow saving .html files directly in ROOT
        const name   = path.basename(file);
        const target = path.join(ROOT, name);
        if (!name.endsWith('.html') || target !== path.join(ROOT, path.basename(target))) {
          res.writeHead(400); res.end(JSON.stringify({ ok: false, error: 'Invalid file' })); return;
        }

        let content = html;

        // Server-side bridge set patching — avoids client-side regex escaping issues
        if (bridgeSets && bridgeSets.length) {
          content = content.replace(
            /var BRIDGE_SETS=\[[\s\S]*?\];/,
            'var BRIDGE_SETS=' + JSON.stringify(bridgeSets) + ';'
          );
        }
        if (finalSet && finalSet.length) {
          content = content.replace(
            /var FINAL=\[[\s\S]*?\];/,
            'var FINAL=' + JSON.stringify(finalSet) + ';'
          );
        }

        fs.writeFileSync(target, content, 'utf8');
        console.log(`[save] ${name}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        console.error('[save error]', e.message);
        res.writeHead(500);
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // ── Static file serving ─────────────────────────────────────────────────
  let filePath = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);

  let stat;
  try { stat = fs.statSync(filePath); } catch (_) {}

  if (!stat) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`404 — Not found: ${pathname}`);
    return;
  }
  if (stat.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    try { fs.statSync(filePath); }
    catch (_) { res.writeHead(404); res.end('No index.html in directory'); return; }
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  try {
    if (ext === '.html') {
      const raw = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': mime });
      res.end(raw.replace('</body>', OVERLAY + '\n</body>'));
    } else {
      res.writeHead(200, { 'Content-Type': mime });
      res.end(fs.readFileSync(filePath));
    }
  } catch (e) {
    console.error('[serve error]', e.message);
    res.writeHead(500);
    res.end('Server error');
  }
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} already in use. Kill the other process or change PORT in this file.\n`);
  } else {
    console.error(e);
  }
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  MDG Local Editor');
  console.log('  ──────────────────────────────────────────────');
  console.log(`  http://localhost:${PORT}/                  Home`);
  console.log(`  http://localhost:${PORT}/experience.html   Experience`);
  console.log(`  http://localhost:${PORT}/design-lab.html   Design Lab`);
  console.log(`  http://localhost:${PORT}/consulting.html   Consulting`);
  console.log(`  http://localhost:${PORT}/case-studies.html Case Studies`);
  console.log('');
  console.log('  [Edit]       toggle edit mode');
  console.log('  [Bridge sets] edit the intro word-sets (home page only)');
  console.log('  Click        links/cards stay put while editing (no navigation)');
  console.log('  Ctrl+click   any link to edit its URL');
  console.log('  Drag         project cards to reorder them (Design Lab page)');
  console.log('  [Save]       write changes back to the HTML file on disk');
  console.log('');
  console.log('  Ctrl+C to stop.');
  console.log('');
});
