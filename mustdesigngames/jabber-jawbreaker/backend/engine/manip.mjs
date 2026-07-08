// Pure grid-manipulation + shared scoring helpers for the v0.2 mini-games.
// Every op is immutable (returns a fresh 25-array) so the deterministic
import { LETTER_VALUES, wordPath } from "./grid.mjs";

export const VOWELS = new Set("AEIOU");
export const countVowels = (w) => [...w].filter((c) => VOWELS.has(c)).length;

// Scrabble-ish value with a gentle length bonus — the shared word currency.
export function wordValue(word) {
  const w = String(word).toUpperCase();
  const base = [...w].reduce((s, c) => s + (LETTER_VALUES[c] || 0), 0);
  return Math.round(base * (1 + 0.15 * Math.max(0, w.length - 3)));
}

// ---------- immutable grid ops (letters = 25-array, row-major) ----------
export const swap = (L, i, j) => { const a = L.slice(); [a[i], a[j]] = [a[j], a[i]]; return a; };

export function shiftRow(L, r, dir = 1) {          // dir +1 = right, -1 = left (wraps)
  const a = L.slice(), row = a.slice(r * 5, r * 5 + 5), k = ((dir % 5) + 5) % 5;
  for (let c = 0; c < 5; c++) a[r * 5 + c] = row[(c - k + 5) % 5];
  return a;
}
export function shiftCol(L, c, dir = 1) {          // dir +1 = down, -1 = up (wraps)
  const a = L.slice(), col = [0, 1, 2, 3, 4].map((r) => L[r * 5 + c]), k = ((dir % 5) + 5) % 5;
  for (let r = 0; r < 5; r++) a[r * 5 + c] = col[(r - k + 5) % 5];
  return a;
}
export function rotate2x2(L, tl, dir = 1) {        // tl = top-left index; clamped to a valid block
  const a = L.slice();
  let r = (tl / 5) | 0, c = tl % 5;
  r = Math.min(r, 3); c = Math.min(c, 3);
  const i = r * 5 + c, j = i + 1, k = i + 5, m = i + 6;       // i j / k m
  if (dir > 0) [a[i], a[j], a[m], a[k]] = [L[k], L[i], L[j], L[m]];   // clockwise
  else [a[i], a[j], a[m], a[k]] = [L[j], L[m], L[k], L[i]];
  return a;
}
export const reorderRow = (L, r, order) => {       // order = permutation of 0..4
  const a = L.slice(), row = a.slice(r * 5, r * 5 + 5);
  order.forEach((src, c) => { a[r * 5 + c] = row[src]; });
  return a;
};

// ---------- cascade: clear cells, gravity-drop survivors, refill from a stream ----------
export function collapse(L, clearIdx, next) {      // next() => a fresh letter
  const a = L.slice(), cleared = new Set(clearIdx);
  for (let c = 0; c < 5; c++) {
    const survivors = [];
    for (let r = 0; r < 5; r++) { const idx = r * 5 + c; if (!cleared.has(idx)) survivors.push(a[idx]); }
    const fresh = [];
    for (let n = 0; n < 5 - survivors.length; n++) fresh.push(next());
    const col = fresh.concat(survivors);           // new letters on top, survivors sink
    for (let r = 0; r < 5; r++) a[r * 5 + c] = col[r];
  }
  return a;
}
// deterministic weighted letter stream (vowel-rich, like the board bag) for refills.
const BAG = "EEEEAAAIIIOOTTNNRRSSLLDDUGCMPBHFVWYKJXQZ".split("");
export const letterStream = (rng) => () => BAG[Math.floor(rng() * BAG.length)];

// ---------- shared trace scorer (Word Hunt family) ----------
// Validates board-path words; tallies value, covered cells and completed lines.
export function traceFind(words, board, dict, opts = {}) {
  const { minLen = 3, vowelMax = Infinity } = opts;
  const seen = new Set(), found = [], invalid = [], covered = new Set();
  for (const raw of words || []) {
    const w = String(raw).toUpperCase();
    if (w.length < minLen || seen.has(w)) continue;
    const path = dict.has(w) ? wordPath(board.letters, w) : null;
    if (path && countVowels(w) <= vowelMax) {
      seen.add(w); found.push({ w, pts: wordValue(w), path });
      path.forEach((i) => covered.add(i));
    } else invalid.push(w);
  }
  const lines = [];
  for (let r = 0; r < 5; r++) if ([0, 1, 2, 3, 4].every((c) => covered.has(r * 5 + c))) lines.push("R" + r);
  for (let c = 0; c < 5; c++) if ([0, 1, 2, 3, 4].every((r) => covered.has(r * 5 + c))) lines.push("C" + c);
  return { found, invalid, lines, covered: [...covered], base: found.reduce((s, v) => s + v.pts, 0) };
}
