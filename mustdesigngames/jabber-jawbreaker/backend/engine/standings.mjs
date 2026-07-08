// Jabber Jawbreaker v0.2 — meta-game standings (pure, testable; no Supabase).

// Duel Ladder: each round, the highest score wins that round (ties split). Standings
// rank by round-wins, then total points. Works for 2 players or a small group.
export function duelStandings(scores) {
  const byRound = {};
  for (const s of scores) (byRound[s.round_no] ||= []).push(s);
  const tally = {};
  for (const round of Object.values(byRound)) {
    const max = Math.max(...round.map(r => r.score));
    const winners = round.filter(r => r.score === max);
    for (const s of round) {
      tally[s.user_id] ||= { roundWins: 0, points: 0 };
      tally[s.user_id].points += s.score;
    }
    for (const w of winners) tally[w.user_id].roundWins += 1 / winners.length;
  }
  return Object.entries(tally)
    .map(([user_id, t]) => ({ user_id, ...t }))
    .sort((a, b) => b.roundWins - a.roundWins || b.points - a.points);
}
