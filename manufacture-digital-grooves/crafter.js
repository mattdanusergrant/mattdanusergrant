// THUDWORKS — Code Crafter: build a song with buttons, get code out.
// Each "part" is one instrument + a 16-step pattern; it generates a play(...) line.
import { createKit } from './synth.js';
import { compile, SongPlayer, INSTRUMENTS, PITCHED } from './song.js';

const STEPS = 16;
const NOTES = [];
['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  .forEach(n => [1, 2, 3, 4, 5].forEach(o => NOTES.push(n + o)));

const el = id => document.getElementById(id);
const partsEl = el('parts'), codeEl = el('code'), statusEl = el('status');
const bpmEl = el('bpm'), bpmv = el('bpmv'), playBtn = el('play');

let ctx, kit, master, player;
let tempo = 120;
const parts = [];                                  // { inst, note, steps:[bool x16] }

const stepsFrom = s => Array.from({ length: STEPS }, (_, i) => s[i] && s[i] !== '.');

function ensureAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor(); master.connect(comp).connect(ctx.destination);
  kit = createKit(ctx, master);
  player = new SongPlayer(ctx, kit);
}

const setStatus = (m, err = false) => { statusEl.textContent = m; statusEl.classList.toggle('err', err); };

function genCode() {
  const lines = [`tempo(${tempo})`, ''];
  for (const p of parts) {
    const pat = PITCHED.includes(p.inst)
      ? p.steps.map(s => s ? p.note : '.').join(' ')
      : p.steps.map(s => s ? 'x' : '.').join('');
    lines.push(`play('${p.inst}', "${pat}")`);
  }
  return lines.join('\n');
}

const refresh = () => { codeEl.textContent = genCode(); };

function renderParts() {
  partsEl.innerHTML = '';
  parts.forEach((p, idx) => {
    const row = document.createElement('div'); row.className = 'craft-part';

    const isel = document.createElement('select');
    INSTRUMENTS.forEach(i => {
      const o = document.createElement('option'); o.value = i; o.textContent = i;
      if (i === p.inst) o.selected = true; isel.appendChild(o);
    });
    isel.onchange = () => { p.inst = isel.value; renderParts(); refresh(); };
    row.appendChild(isel);

    if (PITCHED.includes(p.inst)) {
      const nsel = document.createElement('select');
      NOTES.forEach(n => {
        const o = document.createElement('option'); o.value = n; o.textContent = n;
        if (n === p.note) o.selected = true; nsel.appendChild(o);
      });
      nsel.onchange = () => { p.note = nsel.value; refresh(); };
      row.appendChild(nsel);
    }

    const steps = document.createElement('div'); steps.className = 'craft-steps';
    p.steps.forEach((on, i) => {
      const b = document.createElement('button');
      b.className = 'cstep' + (on ? ' on' : '') + (i % 4 === 0 ? ' beat' : '');
      b.onclick = () => { p.steps[i] = !p.steps[i]; b.classList.toggle('on', p.steps[i]); refresh(); };
      steps.appendChild(b);
    });
    row.appendChild(steps);

    const rm = document.createElement('button'); rm.className = 'ghost'; rm.textContent = '×';
    rm.title = 'remove part';
    rm.onclick = () => { parts.splice(idx, 1); renderParts(); refresh(); };
    row.appendChild(rm);

    partsEl.appendChild(row);
  });
}

function addPart(inst = 'kick', note = 'C3', pattern = '................') {
  parts.push({ inst, note, steps: stepsFrom(pattern) });
  renderParts(); refresh();
}

playBtn.onclick = () => {
  ensureAudio();
  if (ctx.state === 'suspended') ctx.resume();
  if (player.playing) { player.stop(); playBtn.textContent = '▶ Play'; playBtn.classList.remove('on'); setStatus(''); return; }
  let song;
  try { song = compile(genCode()); }
  catch (e) { setStatus('⚠ ' + e.message, true); return; }
  player.load(song); player.start();
  playBtn.textContent = '■ Stop'; playBtn.classList.add('on');
  setStatus(`playing · ${tempo} bpm · ${parts.length} part${parts.length === 1 ? '' : 's'}`);
};

bpmEl.oninput = () => { tempo = +bpmEl.value; bpmv.textContent = tempo; refresh(); };
el('add').onclick = () => addPart('kick');
el('copy').onclick = async () => {
  try { await navigator.clipboard.writeText(genCode()); setStatus('copied to clipboard ✓'); }
  catch { setStatus('copy failed — select the code and copy manually', true); }
};
el('open').onclick = () => { localStorage.setItem('mdg:craft', genCode()); };   // index.html reads this

// seed with a starter beat so the page demonstrates itself
addPart('kick',  'C3', 'x...x...x...x...');
addPart('snare', 'C3', '....x.......x...');
addPart('hat',   'C3', 'x.x.x.x.x.x.x.x.');
addPart('bass',  'C2', 'x.......x.......');
setStatus('tap steps, then ▶ Play');
