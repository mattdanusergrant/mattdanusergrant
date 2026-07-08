// Jabber Jawbreaker — seed-derived grid engine (v0.2)
// The crux of the design: a board (25 letters) + the round's mini-game are derived
// ENTIRELY from (matchSeed, roundNo). Every player reconstructs the identical round
// locally, so the backend only stores a scores ledger — never game state.

// ---------- deterministic PRNG ----------
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// stable 32-bit hash for sub-seeding (matchSeed + roundNo + salt)
export function subSeed(matchSeed, roundNo, salt = 0) {
  let h = 2166136261 ^ (matchSeed | 0);
  for (const v of [roundNo | 0, salt | 0, 0x9e3779b9]) {
    h ^= v; h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------- letter generation ----------
const VOWELS = "AEIOU".split("");
// weighted bags (denser-than-English; tuned for word-finding fun)
const VOWEL_W = { A: 9, E: 12, I: 8, O: 8, U: 4 };
const CONS_W = { R: 6, S: 6, T: 7, L: 5, N: 6, D: 4, G: 3, B: 2, C: 3, M: 3,
  P: 3, F: 2, H: 3, V: 2, W: 2, Y: 3, K: 1, J: 1, X: 1, Q: 1, Z: 1 };

function weightedPick(rng, weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) { if ((r -= w) < 0) return k; }
  return entries[entries.length - 1][0];
}

// 25 letters: 9–12 vowels, rest consonants, shuffled. Deterministic given rng.
export function genLetters(rng) {
  const vowelCount = 9 + Math.floor(rng() * 4); // 9..12
  const out = [];
  for (let i = 0; i < vowelCount; i++) out.push(weightedPick(rng, VOWEL_W));
  for (let i = 0; i < 25 - vowelCount; i++) out.push(weightedPick(rng, CONS_W));
  for (let i = out.length - 1; i > 0; i--) { // Fisher–Yates
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------- mini-game rotation ----------
export const ROTATION = ["word_hunt", "longest_word", "trivia_spell",
  "snake", "vowel_famine", "bingo_lines", "knockout",
  "jab_swap", "roll_with_it", "bob_weave", "anagram_anchors", "ladder", "trivia_sprint"];
export const LETTER_VALUES = { A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
  N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10 };

// does `word` exist as an 8-adjacent, non-repeating path on the 5×5 board?
export function wordPathExists(letters, word) {
  word = word.toUpperCase();
  const seen = new Array(25).fill(false);
  const dfs = (idx, k) => {
    if (letters[idx] !== word[k]) return false;
    if (k === word.length - 1) return true;
    seen[idx] = true;
    const r = (idx / 5) | 0, c = idx % 5;
    for (const dr of NEI) for (const dc of NEI) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr > 4 || nc < 0 || nc > 4) continue;
      const ni = nr * 5 + nc;
      if (!seen[ni] && dfs(ni, k + 1)) { seen[idx] = false; return true; }
    }
    seen[idx] = false; return false;
  };
  for (let i = 0; i < 25; i++) if (letters[i] === word[0] && dfs(i, 0)) return true;
  return false;
}
// like wordPathExists, but returns the actual cell-index path (or null). Used by
// games that care WHERE a word sits (Bingo lines, Knockout cascades, highlighting).
export function wordPath(letters, word) {
  word = word.toUpperCase();
  const path = [], seen = new Array(25).fill(false);
  const dfs = (idx, k) => {
    if (letters[idx] !== word[k]) return false;
    seen[idx] = true; path.push(idx);
    if (k === word.length - 1) return true;
    const r = (idx / 5) | 0, c = idx % 5;
    for (const dr of NEI) for (const dc of NEI) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr > 4 || nc < 0 || nc > 4) continue;
      const ni = nr * 5 + nc;
      if (!seen[ni] && dfs(ni, k + 1)) return true;
    }
    seen[idx] = false; path.pop(); return false;
  };
  for (let i = 0; i < 25; i++) {
    if (letters[i] === word[0]) { path.length = 0; seen.fill(false); if (dfs(i, 0)) return path.slice(); }
  }
  return null;
}
export function minigameForRound(matchSeed, roundNo, rotation = ROTATION) {
  // rotate predictably but seed-shuffled so matches don't all share a schedule
  const off = subSeed(matchSeed, 0, 99) % rotation.length;
  return rotation[(roundNo + off) % rotation.length];
}

// ---------- validators (the multi-game "fertility" gate) ----------
const NEI = [-1, 0, 1];
// Boggle-style: distinct words spellable along 8-adjacent, non-repeating paths.
export function wordHuntWords(letters, dict, prefixes, minLen = 3) {
  const found = new Set();
  const seen = new Array(25).fill(false);
  const dfs = (idx, path) => {
    seen[idx] = true; path += letters[idx];
    if (path.length >= minLen && dict.has(path)) found.add(path);
    if (!prefixes || prefixes.has(path)) {
      const r = (idx / 5) | 0, c = idx % 5;
      for (const dr of NEI) for (const dc of NEI) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr > 4 || nc < 0 || nc > 4) continue;
        const ni = nr * 5 + nc;
        if (!seen[ni]) dfs(ni, path);
      }
    }
    seen[idx] = false;
  };
  for (let i = 0; i < 25; i++) dfs(i, "");
  return found;
}
// can `word` be built from the letter multiset (Trivia Spell / Longest Word)?
export function canSpell(word, letters) {
  const bag = {};
  for (const ch of letters) bag[ch] = (bag[ch] || 0) + 1;
  for (const ch of word.toUpperCase()) { if (!bag[ch]--) return false; }
  return true;
}
// longest dictionary word that is a sub-multiset of the 25 letters.
export function longestAnagram(letters, dict) {
  let best = "";
  for (const w of dict) {
    if (w.length > best.length && canSpell(w, letters)) best = w;
  }
  return best;
}

// ---------- board generation (one board valid for the WHOLE rotation) ----------
// A board ships only if it's "fertile": enough hunt words + a long word exists.
// That single gate makes the same 25 letters work for every mini-game.
export function boardForMatch(matchSeed, roundNo, dict, opts = {}) {
  const { minWords = 20, minMaxLen = 6, minLongest = 7, maxAttempts = 300 } = opts;
  const prefixes = opts.prefixes || buildPrefixSet(dict);
  let last = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = mulberry32(subSeed(matchSeed, roundNo, attempt));
    const letters = genLetters(rng);
    const words = wordHuntWords(letters, dict, prefixes);
    const maxLen = words.size ? Math.max(...[...words].map(w => w.length)) : 0;
    const longest = longestAnagram(letters, dict);
    last = { letters, grid: toGrid(letters), words, maxLen, longest, attempt,
             minigame: minigameForRound(matchSeed, roundNo) };
    if (words.size >= minWords && maxLen >= minMaxLen && longest.length >= minLongest)
      return { ...last, fertile: true };
  }
  return { ...last, fertile: false }; // caller decides; never happens with a real dict
}

export function buildPrefixSet(dict) {
  const p = new Set();
  for (const w of dict) for (let i = 1; i <= w.length; i++) p.add(w.slice(0, i));
  return p;
}
export function toGrid(letters) {
  return [0, 1, 2, 3, 4].map(r => letters.slice(r * 5, r * 5 + 5));
}
