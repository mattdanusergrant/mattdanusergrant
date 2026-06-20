// THUDWORKS — the song language + player.
//
// A song is plain code. You call play(instrument, pattern, opts?) for each part;
// tempo()/swing() set the clock. Patterns are read one 16th-note per cell:
//
//   drums    — one character per step:  'x' (or any non-'.') = hit, '.' = rest.
//              spaces are ignored, so you can group beats:  "x... x... x... x..."
//   pitched  — whitespace-separated tokens, one per step:
//              note "C4" / "F#3" / "Bb2" = play it, '.' = rest, '-' = hold (tie).
//
// Every part loops to fill the longest part, so a 1-bar drum loop repeats under a
// 16-bar melody automatically. Build arrangements by composing strings with rep().

import { noteFreq } from './synth.js';

// instrument name -> { fn: kit method, pitched, opts: default voice tweaks }
const VOICES = {
  kick:    { fn: 'kick',      pitched: false },
  snare:   { fn: 'snare',     pitched: false },
  clap:    { fn: 'clap',      pitched: false },
  hat:     { fn: 'hatClosed', pitched: false },
  openhat: { fn: 'hatOpen',   pitched: false },
  cowbell: { fn: 'cowbell',   pitched: false },
  clave:   { fn: 'clave',     pitched: false },
  tom:     { fn: 'tom',       pitched: false },
  bass:    { fn: 'bass',      pitched: true  },                                   // 808 sub
  synth:   { fn: 'synth',     pitched: true  },
  lead:    { fn: 'synth',     pitched: true, opts: { wave: 'sawtooth', cutoff: 3500, detune: 8 } },
  pad:     { fn: 'synth',     pitched: true, opts: { wave: 'sawtooth', cutoff: 1400, detune: 12 } },
  pluck:   { fn: 'synth',     pitched: true, opts: { wave: 'triangle', cutoff: 2400, detune: 4 } },
  pulse:   { fn: 'synth',     pitched: true, opts: { wave: 'square',   cutoff: 7000, detune: 0 } },  // NES pulse 1
  pulse2:  { fn: 'synth',     pitched: true, opts: { wave: 'square',   cutoff: 5000, detune: 0 } },  // NES pulse 2
  tri:     { fn: 'synth',     pitched: true, opts: { wave: 'triangle', cutoff: 2600, detune: 0 } },  // NES triangle
};
export const INSTRUMENTS = Object.keys(VOICES);
export const PITCHED = INSTRUMENTS.filter(k => VOICES[k].pitched);   // need a note, not just 'x'

const FLAT = { Cb: 'B', Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function tokenFreq(tok) {
  const m = tok.match(/^([A-Ga-g])([#b]?)(-?\d)$/);
  if (!m) throw new Error(`bad note "${tok}"`);
  let name = m[1].toUpperCase() + (m[2] || '');
  if (name.length === 2 && name[1] === 'b') name = FLAT[name] || name;
  return noteFreq(name, +m[3]);
}

const parseDrum = str => [...str].filter(c => !/\s/.test(c)).map(c => (c === '.' || c === '_' ? null : { vel: 1 }));
const parsePitched = str => str.trim().split(/\s+/).filter(Boolean).map(t =>
  (t === '.' || t === '_') ? { rest: true }
  : (t === '-' || t === '~') ? { tie: true }
  : { freqs: t.split('+').map(tokenFreq) });                                     // "C4+E4+G4" = a chord

// Run the user's code with the DSL helpers in scope; collect the parts.
export function compile(code) {
  let bpm = 120, swing = 0, lengthBars = 0;
  const tracks = [];
  const rep = (s, n) => Array.from({ length: n }, () => s).join(' ');
  const seq = (...parts) => parts.join(' ');                                     // glue sections in order
  const euclid = (hits, steps, rot = 0) => {                                     // even-spread rhythm
    let s = '';
    for (let i = 0; i < steps; i++) s += ((i * hits) % steps) < hits ? 'x' : '.';
    return s.slice(rot % steps) + s.slice(0, rot % steps);
  };
  const tempo = v => { bpm = +v; };
  const swingFn = v => { swing = +v; };
  const length = v => { lengthBars = Math.max(1, Math.floor(+v)); };             // fix total song length
  const cellsOf = (inst, pattern) => {
    const meta = VOICES[inst];
    if (!meta) throw new Error(`unknown instrument "${inst}" — try: ${INSTRUMENTS.join(', ')}`);
    return meta.pitched ? parsePitched(pattern) : parseDrum(pattern);
  };
  const play = (inst, pattern, opts = {}) => {
    const cells = cellsOf(inst, pattern);
    if (!cells.length) throw new Error(`"${inst}" pattern is empty`);
    tracks.push({ meta: VOICES[inst], cells, opts });
  };

  // section(name, { instrument: pattern | [pattern, opts] }) defines a reusable block;
  // arrange(...names) plays those blocks in order, tiling each part to the block's length.
  const sections = {};
  const pat = v => Array.isArray(v) ? v[0] : v;
  const section = (name, parts) => {
    let bars = 1;
    for (const [inst, v] of Object.entries(parts)) bars = Math.max(bars, Math.ceil(cellsOf(inst, pat(v)).length / 16));
    sections[name] = { parts, bars };
  };
  const arrange = (...names) => {
    const secs = names.map(n => { if (!sections[n]) throw new Error(`unknown section "${n}"`); return sections[n]; });
    const used = {};
    for (const s of secs) for (const k of Object.keys(s.parts)) used[k] = true;
    for (const inst of Object.keys(used)) {
      const meta = VOICES[inst]; const cells = []; let opts = {};
      for (const s of secs) {
        const target = s.bars * 16;
        if (inst in s.parts) {
          const v = s.parts[inst], cs = cellsOf(inst, pat(v));
          if (Array.isArray(v) && v[1]) opts = { ...opts, ...v[1] };
          for (let i = 0; i < target; i++) cells.push(cs[i % cs.length]);
        } else {
          for (let i = 0; i < target; i++) cells.push(meta.pitched ? { rest: true } : null);
        }
      }
      tracks.push({ meta, cells, opts });
    }
  };
  // transpose a pitched pattern by N semitones (chords and ties pass through)
  const transpose = (pattern, semis) => pattern.trim().split(/\s+/).map(tok =>
    /^[.\-_~]$/.test(tok) ? tok : tok.split('+').map(nt => {
      const m = nt.match(/^([A-Ga-g])([#b]?)(-?\d)$/);
      if (!m) throw new Error(`bad note "${nt}"`);
      let name = m[1].toUpperCase() + (m[2] || '');
      if (name.length === 2 && name[1] === 'b') name = FLAT[name] || name;
      const abs = (+m[3]) * 12 + NAMES.indexOf(name) + (+semis);
      return NAMES[((abs % 12) + 12) % 12] + Math.floor(abs / 12);
    }).join('+')).join(' ');

  new Function('tempo', 'swing', 'play', 'rep', 'euclid', 'seq', 'length', 'section', 'arrange', 'transpose', code)
    (tempo, swingFn, play, rep, euclid, seq, length, section, arrange, transpose);
  if (!tracks.length) throw new Error('no play() calls — nothing to play');
  return { bpm: Math.max(20, bpm), swing: Math.min(70, Math.max(0, swing)),
           cells: lengthBars * 16, tracks };                                     // cells 0 = auto (longest part)
}

export class SongPlayer {
  constructor(ctx, kit) { this.ctx = ctx; this.kit = kit; this.playing = false; this.timer = null; }

  load(song) {
    this.bpm = song.bpm;
    const six = (60 / song.bpm) / 4;
    const cells = song.cells || Math.max(...song.tracks.map(t => t.cells.length));
    this.six = six; this.bars = Math.ceil(cells / 16); this.songDur = cells * six;

    const events = [];
    for (const tr of song.tracks) {
      const n = tr.cells.length, gain = tr.opts.gain ?? 1, fn = this.kit[tr.meta.fn];
      const swing = Math.min(70, Math.max(0, tr.opts.swing ?? song.swing));      // per-part swing override
      for (let c = 0; c < cells; c++) {
        const cell = tr.cells[c % n];
        if (!cell || cell.rest || cell.tie) continue;
        const time = c * six + (c % 2 ? six * (swing / 100) : 0);
        if (tr.meta.pitched) {
          let dur = 1;                                                           // extend over following ties
          while (tr.cells[(c + dur) % n] && tr.cells[(c + dur) % n].tie && c + dur < cells) dur++;
          const opts = { ...(tr.meta.opts || {}), ...tr.opts, dur: dur * six * 0.92 };
          const vg = gain / Math.sqrt(cell.freqs.length);                        // keep a chord's loudness in check
          for (const freq of cell.freqs) events.push({ time, run: when => fn(when, vg, freq, opts) });
        } else {
          events.push({ time, run: when => fn(when, gain * cell.vel) });
        }
      }
    }
    events.sort((a, b) => a.time - b.time);
    this.events = events;
  }

  start() {
    if (this.playing || !this.events || !this.events.length) return;
    this.playing = true; this.idx = 0;
    this.songStart = this.loopStart = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this._tick(), 25);
  }

  stop() { this.playing = false; clearInterval(this.timer); }

  bar() {                                                                        // 1-based bar for display
    if (!this.playing) return 0;
    const elapsed = this.ctx.currentTime - this.songStart;
    if (elapsed < 0) return 1;
    return Math.floor(((elapsed / this.six) % (this.bars * 16)) / 16) + 1;
  }

  _tick() {
    const ahead = this.ctx.currentTime + 0.12;
    while (this.playing) {
      if (this.idx >= this.events.length) { this.loopStart += this.songDur; this.idx = 0; }
      const ev = this.events[this.idx];
      const when = this.loopStart + ev.time;
      if (when >= ahead) break;
      ev.run(when); this.idx++;
    }
  }
}
