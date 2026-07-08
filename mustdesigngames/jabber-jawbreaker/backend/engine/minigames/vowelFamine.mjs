import { traceFind } from "../manip.mjs";

export const vowelFamine = {
  id: "vowel_famine", label: "Vowel Famine", interaction: "trace", vowelMax: 2,
  instructions: "Find words using AT MOST two vowels. Lean and mean — consonants are king.",
  setup() { return {}; },
  // submission: { words: [] }   ctx: { board, dict }
  score(sub, ctx) {
    const r = traceFind(sub.words, ctx.board, ctx.dict, { vowelMax: 2 });
    return { points: r.base, valid: r.found.length > 0, detail: r };
  },
};
