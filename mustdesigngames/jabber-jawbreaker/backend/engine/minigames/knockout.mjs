// Knockout — trace a word; it shatters, tiles drop, fresh letters fall in.
// Pure per-word scorer: the front-end owns the mutable board + the seeded refill
import { wordValue } from "../manip.mjs";
import { wordPath } from "../grid.mjs";

export const knockout = {
  id: "knockout", label: "Knockout", interaction: "trace", cascade: true,
  instructions: "Trace a word — it shatters and new letters drop in. Chain words for a KO multiplier.",
  setup() { return {}; },
  // submission: { word, combo }   ctx: { board (current), dict }
  score(sub, ctx) {
    const w = String(sub.word || "").toUpperCase();
    const path = ctx.dict.has(w) ? wordPath(ctx.board.letters, w) : null;
    if (w.length < 3 || !path) return { points: 0, valid: false, detail: { word: w, path: null } };
    const mult = 1 + 0.5 * Math.max(0, (sub.combo || 1) - 1);
    return { points: Math.round(wordValue(w) * mult), valid: true, detail: { word: w, path, mult: +mult.toFixed(1) } };
  },
};
