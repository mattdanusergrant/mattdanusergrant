// Jabber Jawbreaker — bout adjudication: turn 12 rounds of raw mini-game scores into a
// boxing result. Pure & testable; no Supabase. Async-safe: both fighters play all rounds
//
// 10-point must, scaled by SHARE of the round's combined points (so a blowout in any
// mini-game maps to knockdowns regardless of that game's point scale):
//   share = winner / (winner + loser)  ∈ [0.5, 1]

// official referee tiers (also "The Technician" judge): [share < max] => loser card + knockdowns
const BASE = [{ max: 0.60, loser: 9, kd: 0 }, { max: 0.72, loser: 8, kd: 1 },
              { max: 0.84, loser: 7, kd: 2 }, { max: Infinity, loser: 6, kd: 3 }];
// "The Brawler" judge — rewards damage; lower thresholds => more knockdowns
const BRAWLER = [{ max: 0.57, loser: 9, kd: 0 }, { max: 0.66, loser: 8, kd: 1 },
                 { max: 0.78, loser: 7, kd: 2 }, { max: Infinity, loser: 6, kd: 3 }];

const cmp = (a, b) => (a > b ? "A" : b > a ? "B" : "D");
const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);

// score one round on a tier table -> {winner, cardA, cardB, kd, ko}
function roundCard(a, b, tiers) {
  if (a === b) return { winner: null, cardA: 10, cardB: 10, kd: 0, ko: false };
  const aWins = a > b, W = Math.max(a, b), L = Math.min(a, b);
  if (L === 0) return { winner: aWins ? "A" : "B", cardA: aWins ? 10 : 7, cardB: aWins ? 7 : 10, kd: 3, ko: true };
  const share = W / (W + L);
  let loser = 9, kd = 0;
  for (const t of tiers) { if (share < t.max) { loser = t.loser; kd = t.kd; break; } }
  return { winner: aWins ? "A" : "B", cardA: aWins ? 10 : loser, cardB: aWins ? loser : 10, kd, ko: false };
}

// rounds: [{ minigame?, a, b }]  (A and B are the two fighters' raw scores that round)
// opts:   { stoppage = true }    => set false to always go the distance
export function boxingCard(rounds, opts = {}) {
  const stoppageOn = opts.stoppage !== false;
  const official = rounds.map((r) => roundCard(r.a, r.b, BASE));

  // referee scan: a flash KO (opponent scored 0) or a 3rd cumulative knockdown stops it
  let stoppage = null, contested = rounds.length, kd = { A: 0, B: 0 };
  if (stoppageOn) {
    for (let i = 0; i < official.length; i++) {
      const o = official[i];
      if (o.ko) { stoppage = { type: "KO", round: i + 1, winner: o.winner }; contested = i + 1; break; }
      if (o.winner) {
        const loser = o.winner === "A" ? "B" : "A";
        kd[loser] += o.kd;
        if (kd[loser] >= 3) { stoppage = { type: "TKO", round: i + 1, winner: o.winner }; contested = i + 1; break; }
      }
    }
  }
  const used = rounds.slice(0, contested);
  const offUsed = official.slice(0, contested);
  if (!stoppage) { kd = { A: 0, B: 0 }; for (const o of offUsed) if (o.winner) kd[o.winner === "A" ? "B" : "A"] += o.kd; }

  const perRound = used.map((r, i) => ({ round: i + 1, minigame: r.minigame, a: r.a, b: r.b,
    winner: offUsed[i].winner, cardA: offUsed[i].cardA, cardB: offUsed[i].cardB, kd: offUsed[i].kd, ko: offUsed[i].ko }));

  let result, cards = null, verdicts = null, championship = null;
  if (stoppage) {
    result = { method: stoppage.type, winner: stoppage.winner, round: stoppage.round };
  } else {
    // three judges score the contested rounds their own way
    const braw = used.map((r) => roundCard(r.a, r.b, BRAWLER));
    cards = {
      technician: { A: sum(offUsed, "cardA"), B: sum(offUsed, "cardB") },
      brawler: { A: sum(braw, "cardA"), B: sum(braw, "cardB") },
      statistician: { A: sum(used, "a"), B: sum(used, "b") },     // raw-points aggregate
    };
    verdicts = { technician: cmp(cards.technician.A, cards.technician.B),
      brawler: cmp(cards.brawler.A, cards.brawler.B),
      statistician: cmp(cards.statistician.A, cards.statistician.B) };
    const v = Object.values(verdicts);
    const cA = v.filter((x) => x === "A").length, cB = v.filter((x) => x === "B").length;
    const side = cmp(cA, cB);
    if (side === "D") result = { method: "Draw", winner: null, round: contested };
    else { const w = side === "A" ? cA : cB, l = side === "A" ? cB : cA;
      result = { method: w === 3 ? "UD" : l === 0 ? "MD" : "SD", winner: side, round: contested }; }
    // championship rounds (last 3) tiebreak / flavor
    const start = Math.max(0, contested - 3);
    let chA = 0, chB = 0; for (let i = start; i < contested; i++) { chA += offUsed[i].cardA; chB += offUsed[i].cardB; }
    championship = { winner: cmp(chA, chB), A: chA, B: chB };
  }
  return { rounds: perRound, knockdownsAgainst: kd, stoppage, cards, verdicts, championship, contested, result };
}

const METHODS = { UD: "Unanimous Decision", MD: "Majority Decision", SD: "Split Decision" };
export function describeResult(card, a = "Fighter A", b = "Fighter B") {
  const { method, winner, round } = card.result;
  const W = winner === "A" ? a : winner === "B" ? b : null;
  const L = winner === "A" ? b : winner === "B" ? a : null;
  if (method === "KO" || method === "TKO") return `${W} def. ${L} by ${method}, Rd ${round}`;
  if (method === "Draw") return `Draw (${card.contested} rds)`;
  return `${W} def. ${L} by ${METHODS[method]}`;
}

// ===========================================================================
// resolveBout — the PLAYER-FACING health model (research-backed, 2026-06-14).
// Mobile boxing games show a HP bar + KO, not a scorecard. Each round's score
// margin becomes damage; a bout is won by KO/TKO or higher remaining HP. The
// share→damage tiers mirror the scorecard's knockdown tiers, so the hidden
// boxingCard() still narrates the same fight. Default "Slugfest" = best of 3.
// (Use boxingCard() as the authoritative scorecard for 12-round "Title Fight".)
// ---------------------------------------------------------------------------
// share < max  =>  damage to the round LOSER, chip to the winner, knockdown tier
const DMG = [{ max: 0.60, loser: 18, chip: 8, kd: 0 }, { max: 0.72, loser: 30, chip: 6, kd: 1 },
             { max: 0.84, loser: 45, chip: 4, kd: 2 }, { max: Infinity, loser: 70, chip: 2, kd: 3 }];

export function resolveBout(rounds, opts = {}) {
  const maxHP = opts.maxHP ?? 100;
  let hpA = maxHP, hpB = maxHP, contested = rounds.length, stoppage = null;
  const perRound = [], hp = { A: [], B: [] }, kdAgainst = { A: 0, B: 0 };

  for (let i = 0; i < rounds.length; i++) {
    const { a, b, minigame } = rounds[i];
    let dA = 0, dB = 0, winner = null, kd = 0, ko = false;
    if (a === b) { dA = dB = 8; }                              // even round — both tagged
    else {
      winner = a > b ? "A" : "B";
      const W = Math.max(a, b), L = Math.min(a, b);
      if (L === 0) { ko = true; kd = 3; if (winner === "A") dB = maxHP; else dA = maxHP; } // flash KO
      else { const s = W / (W + L), t = DMG.find((t) => s < t.max); kd = t.kd;
        if (winner === "A") { dB = t.loser; dA = t.chip; } else { dA = t.loser; dB = t.chip; } }
    }
    hpA -= dA; hpB -= dB;
    if (winner === "A" && hpA < 1) hpA = 1;                    // can't be KO'd in a round you won
    if (winner === "B" && hpB < 1) hpB = 1;
    hpA = Math.max(0, hpA); hpB = Math.max(0, hpB);
    if (winner && kd >= 1) kdAgainst[winner === "A" ? "B" : "A"] += 1;
    perRound.push({ round: i + 1, minigame, a, b, winner, dmgA: dA, dmgB: dB, kd, ko, hpA, hpB });
    hp.A.push(hpA); hp.B.push(hpB);
    const loser = winner === "A" ? "B" : winner === "B" ? "A" : null;
    if (loser && (loser === "A" ? hpA : hpB) === 0) {
      stoppage = { type: ko || kd >= 3 ? "KO" : "TKO", round: i + 1, winner }; contested = i + 1; break;
    }
  }

  let result;
  if (stoppage) result = { method: stoppage.type, winner: stoppage.winner, round: stoppage.round };
  else {                                                       // went the distance -> win on remaining HP
    const margin = Math.abs(hpA - hpB);
    if (hpA === hpB) result = { method: "Draw", winner: null, round: contested };
    else result = { method: margin > 25 ? "UD" : margin > 10 ? "MD" : "SD", winner: hpA > hpB ? "A" : "B", round: contested };
  }
  return { perRound, hp, finalHP: { A: hpA, B: hpB }, knockdownsAgainst: kdAgainst, stoppage, contested, result };
}
