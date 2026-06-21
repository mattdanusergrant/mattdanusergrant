// THUDWORKS, app glue: a code editor that compiles to a song, transport, examples.
import { createKit } from './synth.js';
import { compile, SongPlayer } from './song.js';
import { EXAMPLES } from './examples.js';

let ctx, kit, master, player;

const codeEl = document.getElementById('code');
const playBtn = document.getElementById('play');
const volEl = document.getElementById('vol');
const statusEl = document.getElementById('status');
const downloadBtn = document.getElementById('download');
const copyBtn = document.getElementById('copy');
const NOOP_KIT = new Proxy({}, { get: () => () => {} });
let rendering = false;

function ensureAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = +volEl.value;
  const comp = ctx.createDynamicsCompressor();            // glue + soft limit so stacks don't clip
  master.connect(comp).connect(ctx.destination);
  kit = createKit(ctx, master);
  player = new SongPlayer(ctx, kit);
  requestAnimationFrame(tickStatus);
}

function setStatus(msg, error = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle('err', error);
}

function stop() {
  if (player) player.stop();
  playBtn.textContent = '▶ Play'; playBtn.classList.remove('on');
}

// Compile what's in the editor and start playing it. Returns true on success.
function run() {
  ensureAudio();
  if (ctx.state === 'suspended') ctx.resume();
  player.stop();
  let song;
  try { song = compile(codeEl.value); }
  catch (e) { setStatus('⚠ ' + e.message, true); playBtn.textContent = '▶ Play'; playBtn.classList.remove('on'); return false; }
  player.load(song);
  player.start();
  playBtn.textContent = '■ Stop'; playBtn.classList.add('on');
  return true;
}

playBtn.onclick = () => { if (player && player.playing) stop(); else run(); };
volEl.oninput = () => { if (master) master.gain.value = +volEl.value; };
copyBtn.onclick = async () => {
  try { await navigator.clipboard.writeText(codeEl.value); setStatus('copied to clipboard ✓'); }
  catch { setStatus('copy failed, select the code and copy manually', true); }
};

// live status: tempo + bar while playing
function tickStatus() {
  if (!rendering && player && player.playing) setStatus(`♪ ${player.bpm} bpm · bar ${player.bar()} / ${player.bars}`);
  requestAnimationFrame(tickStatus);
}

// ---- download: render the song offline and write a .wav (no libraries) ----
async function renderWav(song) {
  const sr = 44100;
  const probe = new SongPlayer({ currentTime: 0 }, NOOP_KIT); probe.load(song);   // just for songDur
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const off = new OAC(2, Math.ceil((probe.songDur + 0.6) * sr), sr);              // +tail for release
  const m = off.createGain(); m.gain.value = +volEl.value;
  const comp = off.createDynamicsCompressor(); m.connect(comp).connect(off.destination);
  const player2 = new SongPlayer(off, createKit(off, m)); player2.load(song);
  for (const ev of player2.events) ev.run(ev.time);                              // schedule at absolute times
  return bufferToWav(await off.startRendering());
}

function bufferToWav(buf) {
  const nch = buf.numberOfChannels, sr = buf.sampleRate, n = buf.length;
  const ab = new ArrayBuffer(44 + n * nch * 2), view = new DataView(ab);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); view.setUint32(4, 36 + n * nch * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, nch, true);
  view.setUint32(24, sr, true); view.setUint32(28, sr * nch * 2, true); view.setUint16(32, nch * 2, true); view.setUint16(34, 16, true);
  str(36, 'data'); view.setUint32(40, n * nch * 2, true);
  const chans = []; for (let c = 0; c < nch; c++) chans.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < nch; c++) {
    const s = Math.max(-1, Math.min(1, chans[c][i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2;
  }
  return new Blob([ab], { type: 'audio/wav' });
}

downloadBtn.onclick = async () => {
  let song;
  try { song = compile(codeEl.value); }
  catch (e) { setStatus('⚠ ' + e.message, true); return; }
  rendering = true; setStatus('generating WAV…'); downloadBtn.disabled = true;
  try {
    const blob = await renderWav(song);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'thudworks.wav'; a.click();
    URL.revokeObjectURL(a.href);
    setStatus('saved thudworks.wav ✓');
  } catch (e) { setStatus('⚠ render failed: ' + e.message, true); }
  finally { rendering = false; downloadBtn.disabled = false; }
};

// example songs, grouped by genre, each loads into the editor and plays on click
const exBar = document.getElementById('examples');
EXAMPLES.forEach(group => {
  const row = document.createElement('div'); row.className = 'exrow';
  const label = document.createElement('span'); label.className = 'glabel'; label.textContent = group.group;
  row.appendChild(label);
  group.songs.forEach(ex => {
    const b = document.createElement('button'); b.className = 'ex'; b.textContent = ex.name;
    b.onclick = () => { codeEl.value = ex.code.trim(); run(); };
    row.appendChild(b);
  });
  exBar.appendChild(row);
});

// boot: code handed over from the Code Crafter wins, else the first example
const fromCrafter = localStorage.getItem('mdg:craft');
if (fromCrafter) {
  localStorage.removeItem('mdg:craft');
  codeEl.value = fromCrafter;
  setStatus('loaded from Code Crafter, press ▶ Play');
} else {
  codeEl.value = EXAMPLES[0].songs[0].code.trim();
  setStatus('press ▶ Play, or pick a song above');
}
