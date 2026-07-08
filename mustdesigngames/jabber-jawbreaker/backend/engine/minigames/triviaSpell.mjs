// The clue/answer for a round derive from the seed (like the board), so every player
// in a match gets the same question. Answers are short so they fit a 25-letter board.
import { canSpell, mulberry32, subSeed } from "../grid.mjs";

// short-answer trivia bank (answers 3–9 letters; spaces ignored when spelling)
export const BANK = [
  { clue: "The only planet not named after a god.", a: "EARTH" },
  { clue: "The Red Planet.", a: "MARS" },
  { clue: "Longest river in the world (by most measures).", a: "NILE" },
  { clue: "The ship that sank in 1912 on its maiden voyage.", a: "TITANIC" },
  { clue: "Wakanda's most famous export, chemically: element Au.", a: "GOLD" },
  { clue: "Element Fe.", a: "IRON" },
  { clue: "The four-yearly event with a torch and five rings.", a: "OLYMPICS" },
  { clue: "Largest planet in the solar system.", a: "JUPITER" },
  { clue: "The 'powerhouse of the cell' — short form.", a: "MITO" },
  { clue: "Frozen water.", a: "ICE" },
  { clue: "A group of lions.", a: "PRIDE" },
  { clue: "The fastest land animal.", a: "CHEETAH" },
  { clue: "The currency of Japan.", a: "YEN" },
  { clue: "Author of 'Romeo and Juliet' — last name.", a: "BARD" },
  { clue: "The study of living things.", a: "BIOLOGY" },
  { clue: "A baby cat.", a: "KITTEN" },
  { clue: "The closest star to Earth.", a: "SUN" },
  { clue: "Capital of France.", a: "PARIS" },
  { clue: "Capital of Italy.", a: "ROME" },
  { clue: "The largest ocean.", a: "PACIFIC" },
  { clue: "H2O, plainly.", a: "WATER" },
  { clue: "King of the jungle.", a: "LION" },
  { clue: "A seven-day period.", a: "WEEK" },
  { clue: "The opposite of night.", a: "DAY" },
  { clue: "A red salad fruit often called a vegetable.", a: "TOMATO" },
  { clue: "The hardest natural substance.", a: "DIAMOND" },
  { clue: "A doctor for teeth.", a: "DENTIST" },
  { clue: "The gas we breathe out, in short.", a: "CO2" },
  { clue: "A shape with three sides.", a: "TRIANGLE" },
  { clue: "The number of days in a week.", a: "SEVEN" },
];

export const triviaSpell = {
  id: "trivia_spell",
  label: "Trivia Spell",
  interaction: "build",
  instructions: "Answer the clue by spelling it out from the board's letters.",
  // setup is seed-derived: pick a clue whose answer is spellable from this board
  setup(board, seed) {
    const spellable = BANK.filter((q) => canSpell(q.a, board.letters));
    const pool = spellable.length ? spellable : BANK; // fallback (rare): any clue
    const q = pool[Math.floor(mulberry32(subSeed(seed, 0, 7))() * pool.length)];
    const norm = (s) => s.toUpperCase().replace(/[^A-Z]/g, "");
    return { clue: q.clue, answer: norm(q.a), answerLen: norm(q.a).length, onBoard: spellable.length > 0 };
  },
  // submission: { guess, timeMs }   ctx: { prompt } (from setup)
  score(submission, ctx) {
    const norm = (s) => String(s || "").toUpperCase().replace(/[^A-Z]/g, "");
    const correct = norm(submission.guess) === norm(ctx.prompt.answer);
    if (!correct) return { points: 0, valid: false, detail: { correct: false } };
    const speed = Math.max(1, 2.5 - (submission.timeMs || 0) / 20000); // decays over ~30s
    return { points: Math.round(1000 * speed), valid: true, detail: { correct: true, speed: +speed.toFixed(2) } };
  },
};
