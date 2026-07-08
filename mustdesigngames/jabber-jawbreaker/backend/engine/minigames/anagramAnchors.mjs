// Anagram Anchors — reorder the tiles within each row to spell a 5-letter word.
// Partial credit by design: you score the rows you solve (board solvability of all
import { wordValue } from "../manip.mjs";

const PERFECT_BONUS = 50;

export const anagramAnchors = {
  id: "anagram_anchors", label: "Anagram Anchors", interaction: "anchors",
  instructions: "Reorder the tiles in each row into a 5-letter word. Solve all five for a perfect bout.",
  setup() { return {}; },
  // submission: { letters }  (the current 25-array)   ctx: { board, dict }
  score(sub, ctx) {
    const L = sub.letters || ctx.board.letters;
    const rows = [];
    for (let r = 0; r < 5; r++) {
      const word = L.slice(r * 5, r * 5 + 5).join("");
      if (ctx.dict.has(word)) rows.push(word);
    }
    const base = rows.reduce((s, w) => s + wordValue(w), 0);
    const perfect = rows.length === 5 ? PERFECT_BONUS : 0;
    return { points: base + perfect, valid: rows.length > 0, detail: { rows, perfect } };
  },
};
