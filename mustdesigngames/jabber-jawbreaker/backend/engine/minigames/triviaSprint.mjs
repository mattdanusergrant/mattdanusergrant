// Trivia Sprint — five seeded clues in a row, each answer spelled from the board.
import { canSpell, mulberry32, subSeed } from "../grid.mjs";
import { BANK } from "./triviaSpell.mjs";

const norm = (s) => String(s || "").toUpperCase().replace(/[^A-Z]/g, "");

export const triviaSprint = {
  id: "trivia_sprint", label: "Trivia Sprint", interaction: "build", sprint: true,
  instructions: "Spell the answers to five quick clues from the board — as fast as you can.",
  setup(board, seed) {
    const pool = BANK.filter((q) => canSpell(norm(q.a), board.letters));
    const src = pool.length >= 5 ? pool : BANK;     // fallback: ignore spellability if thin
    const rng = mulberry32(subSeed(seed, 0, 13));
    const picks = [], used = new Set();
    while (picks.length < 5 && used.size < src.length) {
      const i = Math.floor(rng() * src.length);
      if (used.has(i)) continue;
      used.add(i);
      picks.push({ clue: src[i].clue, answer: norm(src[i].a), answerLen: norm(src[i].a).length });
    }
    return { clues: picks };
  },
  // submission: { guess, idx, timeMs }   ctx: { prompt }
  score(sub, ctx) {
    const q = ctx.prompt.clues[sub.idx];
    if (!q || norm(sub.guess) !== norm(q.answer)) return { points: 0, valid: false, detail: { idx: sub.idx, correct: false } };
    const speed = Math.max(1, 2 - (sub.timeMs || 0) / 15000);
    return { points: Math.round(300 * speed), valid: true, detail: { idx: sub.idx, correct: true, speed: +speed.toFixed(2) } };
  },
};
