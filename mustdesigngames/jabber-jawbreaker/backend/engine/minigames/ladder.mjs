// Ladder — climb a chain of words, each exactly one letter longer than the last
import { canSpell } from "../grid.mjs";
import { wordValue } from "../manip.mjs";

export const ladder = {
  id: "ladder", label: "Ladder", interaction: "build", chain: true,
  instructions: "Build a ladder of words, each one letter longer than the last, all from the board's letters.",
  setup() { return {}; },
  // submission: { words: [] }   ctx: { board, dict }
  score(sub, ctx) {
    const words = (sub.words || []).map((w) => String(w).toUpperCase());
    const rungs = []; let points = 0;
    for (const w of words) {
      const need = rungs.length ? rungs[rungs.length - 1].length + 1 : Math.max(3, w.length);
      const good = w.length === need && ctx.dict.has(w) && canSpell(w, ctx.board.letters);
      if (!good) break;                       // ladder stops at the first bad rung
      rungs.push(w); points += wordValue(w) * rungs.length;   // higher rungs worth more
    }
    return { points, valid: rungs.length > 0, detail: { rungs } };
  },
};
