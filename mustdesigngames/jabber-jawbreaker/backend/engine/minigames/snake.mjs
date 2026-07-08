import { wordValue } from "../manip.mjs";
import { wordPath } from "../grid.mjs";

export const snake = {
  id: "snake", label: "Snake", interaction: "trace", single: true,
  instructions: "Trace ONE long word along a connected path (diagonals count, no reusing a tile).",
  setup() { return {}; },
  // submission: { word }   ctx: { board, dict }
  score(sub, ctx) {
    const w = String(sub.word || "").toUpperCase();
    const path = ctx.dict.has(w) ? wordPath(ctx.board.letters, w) : null;
    const reason = w.length < 3 ? "too short" : !ctx.dict.has(w) ? "not a word" : !path ? "not a path" : null;
    if (reason) return { points: 0, valid: false, detail: { word: w, reason } };
    return { points: wordValue(w), valid: true, detail: { word: w, len: w.length, path } };
  },
};
