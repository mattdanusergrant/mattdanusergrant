import { canSpell, LETTER_VALUES } from "../grid.mjs";

export const longestWord = {
  id: "longest_word",
  label: "Longest Word",
  interaction: "build", single: true,
  instructions: "Make the single longest valid word using the board's letters (each letter once per copy).",
  setup() { return {}; },
  // submission: { word: string }   ctx: { board, dict }
  score(submission, ctx) {
    const w = String(submission.word || "").toUpperCase();
    const { board, dict } = ctx;
    const reason = w.length < 3 ? "too short"
      : !dict.has(w) ? "not a word"
      : !canSpell(w, board.letters) ? "not on the board" : null;
    if (reason) return { points: 0, valid: false, detail: { word: w, reason } };
    const base = [...w].reduce((s, ch) => s + (LETTER_VALUES[ch] || 0), 0);
    const points = Math.round(base * (1 + 0.15 * (w.length - 3))); // length bonus
    return { points, valid: true, detail: { word: w, base, len: w.length } };
  },
};
