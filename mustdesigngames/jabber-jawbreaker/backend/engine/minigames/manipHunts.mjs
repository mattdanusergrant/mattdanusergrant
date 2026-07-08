// Three manipulation games that share one engine: spend a budget of grid moves,
// then hunt words on the board you reshaped. Same fair seeded start for everyone;
import { traceFind } from "../manip.mjs";

const huntScore = (sub, ctx) => {
  const r = traceFind(sub.words, ctx.board, ctx.dict, {});
  return { points: r.base, valid: r.found.length > 0, detail: r };
};

export const jabSwap = {
  id: "jab_swap", label: "Jab Swap", interaction: "manip", manipKind: "swap", moves: 3,
  instructions: "Swap up to 3 pairs of tiles, then hunt words on your rearranged board.",
  setup() { return {}; }, score: huntScore,
};
export const rollWithIt = {
  id: "roll_with_it", label: "Roll With It", interaction: "manip", manipKind: "shift", moves: 4,
  instructions: "Slide rows and columns (they wrap around) up to 4 times, then hunt words.",
  setup() { return {}; }, score: huntScore,
};
export const bobWeave = {
  id: "bob_weave", label: "Bob & Weave", interaction: "manip", manipKind: "rotate", moves: 4,
  instructions: "Rotate 2×2 blocks (up to 4 times) to line up letters, then hunt words.",
  setup() { return {}; }, score: huntScore,
};
