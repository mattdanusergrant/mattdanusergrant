// THUDWORKS, synth voices (Web Audio). Every drum is generated live: sine + noise
// + envelopes, the same way the real TR-808 works. No samples, no licensing.
// Each voice is trigger(time, gain, opts) and schedules itself on the audio clock.

export function createKit(ctx, out) {
  // shared 1s white-noise buffer (reused by every noise-based voice)
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const noise = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; };

  // soft-saturation curve so sub-bass has audible harmonics on small speakers
  const sat = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; sat[i] = Math.tanh(2.2 * x); }

  const decayGain = (t, peak, dur) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(peak, 0.0001), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return g;
  };

  function kick(t, gain = 1) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.08);
    const g = decayGain(t, gain, 0.5);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.55);
    // transient click
    const n = noise(), ng = decayGain(t, gain * 0.6, 0.012);
    n.connect(ng).connect(out); n.start(t); n.stop(t + 0.02);
  }

  function bass(t, gain = 1, freq = 55) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(freq * 2, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.04);
    const ws = ctx.createWaveShaper(); ws.curve = sat;
    const g = decayGain(t, gain * 0.9, 0.6);
    o.connect(ws).connect(g).connect(out); o.start(t); o.stop(t + 0.65);
  }

  function snare(t, gain = 1) {
    const n = noise(), f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 1500;
    const ng = decayGain(t, gain * 0.8, 0.18);
    n.connect(f).connect(ng).connect(out); n.start(t); n.stop(t + 0.2);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 180;
    const og = decayGain(t, gain * 0.5, 0.1);
    o.connect(og).connect(out); o.start(t); o.stop(t + 0.12);
  }

  const hat = (t, gain, dur) => {
    const n = noise(), f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 7000;
    const g = decayGain(t, gain * 0.5, dur);
    n.connect(f).connect(g).connect(out); n.start(t); n.stop(t + dur + 0.02);
  };
  const hatClosed = (t, gain = 1) => hat(t, gain, 0.045);
  const hatOpen = (t, gain = 1) => hat(t, gain, 0.35);

  function clap(t, gain = 1) {
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 1.4;
    const g = ctx.createGain(); f.connect(g).connect(out);
    const n = noise(); n.connect(f); n.start(t); n.stop(t + 0.25);
    g.gain.setValueAtTime(0.0001, t);
    [0, 0.009, 0.018].forEach(o => {
      g.gain.setValueAtTime(gain * 0.9, t + o);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o + 0.011);
    });
    g.gain.setValueAtTime(gain * 0.7, t + 0.027);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  }

  function cowbell(t, gain = 1) {
    const mk = f => { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f; return o; };
    const o1 = mk(540), o2 = mk(800);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2640; bp.Q.value = 1;
    const g = decayGain(t, gain * 0.4, 0.3);
    o1.connect(bp); o2.connect(bp); bp.connect(g).connect(out);
    o1.start(t); o2.start(t); o1.stop(t + 0.32); o2.stop(t + 0.32);
  }

  function clave(t, gain = 1) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 1180;
    const g = decayGain(t, gain * 0.8, 0.05);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.06);
  }

  function tom(t, gain = 1, freq = 150) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.04);
    const g = decayGain(t, gain, 0.22);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.24);
  }

  // melodic voice, two detuned oscillators through a lowpass with an AD envelope.
  // `dur` is the note length in seconds (set by the song engine from note ties).
  function synth(t, gain = 1, freq = 440, opts = {}) {
    const { wave = 'sawtooth', dur = 0.25, cutoff = 3000, detune = 6 } = opts;
    const rel = Math.min(0.08, dur * 0.4), a = 0.006;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(Math.max(cutoff, 200), t);
    f.frequency.exponentialRampToValueAtTime(Math.max(cutoff * 0.45, 200), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t + a);
    g.gain.setValueAtTime(Math.max(gain, 0.0002), t + Math.max(dur - rel, a));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    f.connect(g).connect(out);
    for (const d of [-detune, detune]) {
      const o = ctx.createOscillator(); o.type = wave; o.frequency.value = freq; o.detune.value = d;
      o.connect(f); o.start(t); o.stop(t + dur + 0.05);
    }
  }

  return { kick, bass, snare, hatClosed, hatOpen, clap, cowbell, clave, tom, synth };
}

// note name -> frequency (equal temperament, A4 = 440)
const SEMI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
export function noteFreq(name, octave) {
  return 440 * Math.pow(2, (SEMI[name] + (octave - 4) * 12 - 9) / 12);
}
