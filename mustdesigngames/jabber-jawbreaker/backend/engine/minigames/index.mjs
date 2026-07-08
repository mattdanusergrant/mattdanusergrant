// Mini-game registry — v0.2 ships thirteen across four interaction styles
import { wordHunt } from "./wordHunt.mjs";
import { longestWord } from "./longestWord.mjs";
import { triviaSpell } from "./triviaSpell.mjs";
import { snake } from "./snake.mjs";
import { vowelFamine } from "./vowelFamine.mjs";
import { bingoLines } from "./bingoLines.mjs";
import { knockout } from "./knockout.mjs";
import { jabSwap, rollWithIt, bobWeave } from "./manipHunts.mjs";
import { anagramAnchors } from "./anagramAnchors.mjs";
import { ladder } from "./ladder.mjs";
import { triviaSprint } from "./triviaSprint.mjs";

export const MINIGAMES = {
  word_hunt: wordHunt,
  longest_word: longestWord,
  trivia_spell: triviaSpell,
  snake,
  vowel_famine: vowelFamine,
  bingo_lines: bingoLines,
  knockout,
  jab_swap: jabSwap,
  roll_with_it: rollWithIt,
  bob_weave: bobWeave,
  anagram_anchors: anagramAnchors,
  ladder,
  trivia_sprint: triviaSprint,
};
export const getMinigame = (id) => MINIGAMES[id];
