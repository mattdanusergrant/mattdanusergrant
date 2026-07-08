import { wordPathExists } from "../grid.mjs";

const wordPoints = (len) => (len >= 8 ? 11 : ({ 3: 1, 4: 1, 5: 2, 6: 3, 7: 5 }[len] || 0));

export const wordHunt = {
  id: "word_hunt",
  label: "Word Hunt",
  interaction: "trace",
  instructions: "Find words by linking adjacent letters (diagonals count). No reusing a tile within a word.",
  setup() { return {}; },
  // submission: { words: string[] }   ctx: { board, dict }
  score(submission, ctx) {
    const { board, dict } = ctx;
    const seen = new Set(), found = [], invalid = [];
    for (const raw of submission.words || []) {
      const w = String(raw).toUpperCase();
      if (w.length < 3 || seen.has(w)) continue;
      if (dict.has(w) && wordPathExists(board.letters, w)) {
        seen.add(w); found.push({ w, pts: wordPoints(w.length) });
      } else invalid.push(w);
    }
    return {
      points: found.reduce((s, v) => s + v.pts, 0),
      valid: found.length > 0,
      detail: { found, invalid },
    };
  },
};
