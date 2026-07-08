import { traceFind } from "../manip.mjs";

const LINE_BONUS = 25;

export const bingoLines = {
  id: "bingo_lines", label: "Bingo Lines", interaction: "trace", lineBonus: true,
  instructions: "Find words. When your found words fully cover a row or column, score a BINGO bonus.",
  setup() { return {}; },
  // submission: { words: [] }   ctx: { board, dict }
  score(sub, ctx) {
    const r = traceFind(sub.words, ctx.board, ctx.dict, {});
    const bonus = r.lines.length * LINE_BONUS;
    return { points: r.base + bonus, valid: r.found.length > 0, detail: { ...r, bonus } };
  },
};
