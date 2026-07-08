// Jabber Jawbreaker v0.2 — front-end. Renders the shared seeded board and plays the
// thirteen mini-games, scoring via the backend engine. The front-end is interaction-
// driven: each game declares an `interaction` (trace / build / manip / anchors) plus a
// few flags, and the loop below routes input accordingly. Solo by default; fill CONFIG
// to submit to Supabase (uses ./online.mjs, which loads supabase-js from a CDN).  #LLM-generated
import { boardForMatch, subSeed, mulberry32 } from "./backend/engine/grid.mjs";
import { MINIGAMES } from "./backend/engine/minigames/index.mjs";
import { duelStandings } from "./backend/engine/standings.mjs";
import { swap, shiftRow, shiftCol, rotate2x2, collapse, letterStream } from "./backend/engine/manip.mjs";
import { resolveBout, boxingCard, describeResult } from "./backend/engine/boxing.mjs";
import * as online from "./online.mjs";
import * as feedbackSink from "./feedback.mjs";

// ----- config: leave blank for solo; fill all four to go online -----
const CONFIG = { supabaseUrl: "", supabaseAnonKey: "", matchId: "", seed: 20260613 };
const ONLINE = !!(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && CONFIG.matchId);
// ----- feedback sink: url + anonKey → auto-send playtest feedback to your Supabase "Games"
//       project (RLS allows anonymous insert; the 005 trigger pings Discord on each row) -----
const FEEDBACK = { url: "https://hprivaysbttdqgebbjio.supabase.co", anonKey: "sb_publishable_h6hAFRHUku9XNttKmde7MA_owVkO1Wc" };
const FB_ON = !!(FEEDBACK.url && FEEDBACK.anonKey);
const PROD = { minWords: 20, minMaxLen: 6, minLongest: 7 };

const $ = (id) => document.getElementById(id);
const S = { dict: null, prefixes: null, seed: CONFIG.seed, round: 0, board: null, live: null,
  game: null, prompt: {}, sel: [], words: [], score: 0, start: 0, timerId: null, ended: false,
  moves: 0, refill: null, combo: 1, sprintIdx: 0, arrange: false, axis: "row", dir: 1, firstTap: null,
  bag: [], modeCount: 0, feedback: [], mode: "menu", bout: null };

// ---------- boot ----------
(async function boot() {
  const res = await fetch("./backend/data/enable1.txt");
  const text = await res.text();
  const words = text.toUpperCase().split(/\r?\n/).filter((w) => w.length >= 3 && w.length <= 15 && /^[A-Z]+$/.test(w));
  S.dict = new Set(words);
  const { buildPrefixSet } = await import("./backend/engine/grid.mjs");
  S.prefixes = buildPrefixSet(S.dict);
  if (ONLINE) { try { await online.init(CONFIG); $("mode").textContent = "online"; } catch (e) { console.warn(e); } }
  if (FB_ON) { try { await feedbackSink.init(FEEDBACK); } catch (e) { console.warn("feedback sink off:", e); } }
  S.feedback = loadFeedback();
  $("load").style.display = "none";
  wire();
  showMenu();                          // Bout vs Playtest start screen
})();

// ---------- playtest harness ----------
const FB_KEY = "jj-feedback";
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function nextMode() { if (!S.bag.length) S.bag = shuffle(Object.keys(MINIGAMES)); return S.bag.pop(); }
function startNext() { S.modeCount++; newRound((Math.random() * 2 ** 31) | 0, S.modeCount, nextMode()); }
const loadFeedback = () => { try { return JSON.parse(localStorage.getItem(FB_KEY) || "[]"); } catch { return []; } };
const clientId = () => {
  let id = localStorage.getItem("jj-client");
  if (!id) { id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2); localStorage.setItem("jj-client", id); }
  return id;
};
function recordFeedback(rating) {
  const note = ($("note")?.value || "").trim();
  S.feedback.push({ mode: S.game.id, label: S.game.label, rating, note, score: S.score, seed: S.seed, ts: new Date().toISOString() });
  localStorage.setItem(FB_KEY, JSON.stringify(S.feedback));     // always keep a local copy
  if (FB_ON) {                                                  // ...and send straight to Supabase
    feedbackSink.submit({ minigame: S.game.id, label: S.game.label, rating, note, score: S.score,
      seed: S.seed, client_id: clientId(), user_agent: navigator.userAgent })
      .catch((e) => console.warn("feedback send failed (kept locally):", e));
  }
}
function exportFeedback() {
  if (!S.feedback.length) return toast("No feedback logged yet", true);
  const byMode = {};
  for (const f of S.feedback) (byMode[f.label] ||= []).push(f.rating);
  const summary = Object.fromEntries(Object.entries(byMode).map(([k, v]) => {
    const r = v.filter(Boolean);
    return [k, { n: v.length, avg: r.length ? +(r.reduce((a, b) => a + b, 0) / r.length).toFixed(2) : null }];
  }));
  const payload = JSON.stringify({ exported: new Date().toISOString(), count: S.feedback.length, summary, entries: S.feedback }, null, 2);
  navigator.clipboard?.writeText(payload);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  a.download = "jabber-jawbreaker-feedback.json"; a.click();
  toast("Feedback copied + downloaded (" + S.feedback.length + ")");
}

// ---------- bout (Slugfest: best-of-3, HP bars + KO; engine = boxing.mjs) ----------
const BOUT_SECS = 45, BOUT_ROUNDS = 3, MAX_HP = 100;
const SKILL = { word_hunt: "path", snake: "path", vowel_famine: "path", bingo_lines: "path", knockout: "path",
  longest_word: "vocab", ladder: "vocab", trivia_spell: "trivia", trivia_sprint: "trivia",
  jab_swap: "manip", roll_with_it: "manip", bob_weave: "manip", anagram_anchors: "manip" };
const BOTS = ["SPARRING BOT", "SOUTHPAW SAM", "COUNTERPUNCH KID", "THE JABBERWOCK", "IRON LEXICON"];
const shuffleSeeded = (a, rng) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

// seeded 3-game fight card, spread across skill classes so no one strength decides it
function fightCard(seed) {
  const rng = mulberry32(subSeed(seed, 0, 0xF16));
  const byClass = {};
  for (const [id, cls] of Object.entries(SKILL)) (byClass[cls] ||= []).push(id);
  return shuffleSeeded(Object.keys(byClass), rng).slice(0, BOUT_ROUNDS)
    .map((c) => byClass[c][(rng() * byClass[c].length) | 0]);
}
// solo "sparring partner": a deterministic opponent score that tracks the player's (keeps
// every game's scale fair). Real async PvP later swaps this for the opponent's actual rows.
function opponentScore(you, seed, roundIdx) {
  const rng = mulberry32(subSeed(seed, roundIdx, 0xB07));
  return Math.max(0, Math.round(Math.max(you, 1) * (0.6 + rng() * 0.85)));   // ~0.6–1.45×
}

function showMenu() {
  S.mode = "menu"; S.bout = null; clearInterval(S.timerId);
  $("bouthud").style.display = "none"; $("btmrow").style.display = "none";
  const ov = $("overlay");
  ov.innerHTML = `
    <img id="hero" src="./assets/logo.png" alt="Jabber Jawbreaker"
      style="max-width:min(82vw,360px);width:100%;height:auto;filter:drop-shadow(0 8px 22px rgba(0,0,0,.55))"
      onload="document.getElementById('heroword').style.display='none'" onerror="this.remove()">
    <div class="logo" id="heroword" style="font-size:30px">JABBER <b>JAWBREAKER</b></div>
    <div class="sub">A 3-round word-boxing bout: win rounds to drain your rival's health — or land a KO.</div>
    <button class="btn primary" id="mBout" style="max-width:260px">🥊 Start a Bout</button>
    <button class="btn ghost" id="mPlay" style="max-width:260px">🎯 Playtest the 13 modes</button>`;
  ov.classList.add("show");
  $("mBout").onclick = startBout;
  $("mPlay").onclick = () => { S.mode = "playtest"; ov.classList.remove("show"); $("btmrow").style.display = "flex"; startNext(); };
}
function startBout() {
  const seed = (Math.random() * 2 ** 31) | 0;
  const rng = mulberry32(subSeed(seed, 0, 0xB0B));
  S.mode = "bout";
  S.bout = { seed, card: fightCard(seed), roundIdx: 0, rounds: [], hpYou: MAX_HP, hpOpp: MAX_HP,
    botName: BOTS[(rng() * BOTS.length) | 0] };
  $("bouthud").style.display = "flex"; $("fnameB").textContent = S.bout.botName;
  renderBoutHud();
  beginBoutRound();
}
function beginBoutRound() {
  $("overlay").classList.remove("show");
  newRound(S.bout.seed, S.bout.roundIdx, S.bout.card[S.bout.roundIdx]);
}
function renderBoutHud() {
  const b = S.bout; if (!b) return;
  $("hpA").style.width = b.hpYou + "%"; $("hpB").style.width = b.hpOpp + "%";
  $("hpA").className = b.hpYou <= 25 ? "low" : ""; $("hpB").className = b.hpOpp <= 25 ? "low" : "";
  $("hpAnum").textContent = b.hpYou; $("hpBnum").textContent = b.hpOpp;
  $("boutround").textContent = "Rd " + Math.min(b.roundIdx + 1, BOUT_ROUNDS) + "/" + BOUT_ROUNDS;
}
function boutRoundEnd() {
  S.ended = true; clearInterval(S.timerId);
  const b = S.bout, you = S.score, opp = opponentScore(you, b.seed, b.roundIdx);
  b.rounds.push({ minigame: S.game.id, a: you, b: opp });
  const sim = resolveBout(b.rounds, { maxHP: MAX_HP });        // re-sim the cumulative bout
  const last = sim.perRound[sim.perRound.length - 1];
  b.hpYou = sim.finalHP.A; b.hpOpp = sim.finalHP.B;
  renderBoutHud();
  const koNow = !!(sim.stoppage && sim.stoppage.round === b.roundIdx + 1);
  const wonRound = last.winner === "A";
  let beat = "";
  if (koNow) beat = wonRound ? "KNOCKOUT! 🥊" : "You got KO'd 💫";
  else if (last.kd >= 1) beat = wonRound ? "KNOCKDOWN! 🥊" : "Down you go 💫";
  if (beat) toast(beat, !wonRound);
  const done = koNow || b.roundIdx >= BOUT_ROUNDS - 1;
  const ov = $("overlay");
  ov.innerHTML = `
    <h2>Round ${b.roundIdx + 1}${beat ? " — " + beat : ""}</h2>
    <div class="big" style="font-size:22px">${wonRound ? "You won the round" : last.winner ? "Round to " + b.botName : "Even round"}</div>
    <div class="sub">You <b>${you}</b> vs <b>${opp}</b> ${b.botName}<br>
      dealt ${last.dmgB} dmg · took ${last.dmgA}<br>❤️ You ${b.hpYou} — ${b.hpOpp} ${b.botName}</div>
    <button class="btn primary" id="ovNextR" style="max-width:240px">${done ? "See result →" : "Next round →"}</button>`;
  ov.classList.add("show");
  $("ovNextR").onclick = () => { if (done) return boutResult(sim); b.roundIdx++; beginBoutRound(); };
}
function boutResult(sim) {
  const b = S.bout;
  const youWon = sim.result.winner === "A", draw = sim.result.winner === null;
  const headline = draw ? "🤝 DRAW" : youWon ? "🏆 YOU WIN!" : "😵 YOU LOSE";
  let judges = "";
  if (!sim.stoppage) {                                          // went the distance → judges' reveal
    const c = boxingCard(b.rounds, { stoppage: false }).cards;
    judges = `<div class="sub">Judges' cards — Technician · Brawler · Stats:<br>
      ${c.technician.A}–${c.technician.B} · ${c.brawler.A}–${c.brawler.B} · ${c.statistician.A}–${c.statistician.B}</div>`;
  }
  const ov = $("overlay");
  ov.innerHTML = `
    <h2>${headline}</h2>
    <div class="sub" style="font-size:15px">${describeResult(sim, "You", b.botName)}</div>
    <div class="sub">❤️ You ${sim.finalHP.A} — ${sim.finalHP.B} ${b.botName}</div>
    ${judges}
    <button class="btn primary" id="ovRematch" style="max-width:240px">🥊 Rematch</button>
    <button class="btn ghost" id="ovMenu" style="max-width:240px">Main menu</button>`;
  ov.classList.add("show");
  $("ovRematch").onclick = startBout;
  $("ovMenu").onclick = showMenu;
}

// ---------- round lifecycle ----------
function newRound(seed, round, forcedMode) {
  S.seed = seed; S.round = round;
  S.board = boardForMatch(seed, round, S.dict, { ...PROD, prefixes: S.prefixes });
  if (forcedMode) S.board.minigame = forcedMode;     // playtest serves a chosen mode on a fertile board
  S.live = S.board.letters.slice();
  S.game = MINIGAMES[S.board.minigame];
  S.prompt = S.game.setup(S.board, seed) || {};
  S.sel = []; S.words = []; S.score = 0; S.ended = false; S.start = Date.now();
  S.moves = S.game.moves || 0; S.combo = 1; S.sprintIdx = 0; S.firstTap = null;
  S.arrange = S.game.interaction === "manip"; S.axis = "row"; S.dir = 1;
  S.refill = S.game.cascade ? letterStream(mulberry32(subSeed(seed, round, 0xC0FFEE))) : null;
  clearInterval(S.timerId); S.timerId = null;
  $("overlay").classList.remove("show");
  if (S.mode === "bout") startCountdown(BOUT_SECS);     // every bout round is a timed boxing round
  else if (S.game.id === "word_hunt" || S.game.cascade) startCountdown(60);
  else if (S.game.id === "trivia_spell" || S.game.sprint) {
    $("timer").textContent = "0s";
    S.timerId = setInterval(() => { if (!S.ended) $("timer").textContent = Math.round((Date.now() - S.start) / 1000) + "s"; }, 500);
  } else $("timer").textContent = "—";
  render();
}
function startCountdown(secs) {
  const end = Date.now() + secs * 1000;
  S.timerId = setInterval(() => {
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    $("timer").textContent = left + "s";
    if (left <= 0) { clearInterval(S.timerId); endRound(); }
  }, 250);
}
const curBoard = () => ({ ...S.board, letters: S.live });
const wordFromSel = () => S.sel.map((i) => S.live[i]).join("");

// ---------- rendering ----------
function render() {
  const g = S.game, it = g.interaction, isManip = it === "manip";
  $("gtitle").firstChild.textContent = g.label + " ";
  $("gpill").textContent = S.board.fertile ? "shared board" : "fallback";
  $("ginstr").textContent = g.instructions;
  if (S.mode === "bout") $("mode").textContent = "🥊 vs " + S.bout.botName;
  else if (!ONLINE) $("mode").textContent = "playtest · " + S.feedback.length + "✍" + (FB_ON ? " ↑live" : "");
  $("bouthud").style.display = S.mode === "bout" ? "flex" : "none";
  $("btmrow").style.display = S.mode === "bout" ? "none" : "flex";

  const showClue = g.id === "trivia_spell" || g.sprint;
  $("clue").style.display = showClue ? "block" : "none";
  if (showClue) {
    const c = g.sprint ? S.prompt.clues[Math.min(S.sprintIdx, S.prompt.clues.length - 1)] : S.prompt;
    $("clue").textContent = `“${c.clue}”  (${c.answerLen} letters)`;
  }

  $("score").textContent = S.score;
  let mv = "R" + (S.round + 1), ml = g.label;
  if (isManip) { mv = S.moves; ml = "moves left"; }
  else if (g.cascade) { mv = "×" + (1 + 0.5 * Math.max(0, S.combo - 1)).toFixed(1); ml = "combo"; }
  else if (g.chain) { mv = S.words.length; ml = "rungs"; }
  else if (g.sprint) { mv = Math.min(S.sprintIdx + 1, S.prompt.clues.length) + "/" + S.prompt.clues.length; ml = "clue"; }
  $("meta").textContent = mv; $("metaL").textContent = ml;

  // contextual manipulation controls
  $("controls").style.display = isManip ? "flex" : "none";
  if (isManip) {
    $("modeToggle").textContent = "Mode: " + (S.arrange ? "Arrange" : "Hunt");
    const k = g.manipKind;
    $("axisBtn").style.display = k === "shift" ? "block" : "none";
    $("dirBtn").style.display = (k === "shift" || k === "rotate") ? "block" : "none";
    $("axisBtn").textContent = S.axis === "row" ? "↔ Row" : "↕ Col";
    $("dirBtn").textContent = k === "rotate" ? (S.dir > 0 ? "⟳ CW" : "⟲ CCW") : (S.dir > 0 ? "▶ fwd" : "◀ back");
  }

  const arrangeHint = { swap: "tap two tiles to swap", shift: "tap a tile to slide its line", rotate: "tap a tile to rotate its 2×2 block" };
  $("current").textContent = (isManip && S.arrange) ? arrangeHint[g.manipKind] : wordFromSel();

  const b = $("board"); b.innerHTML = "";
  S.live.forEach((ch, i) => {
    const el = document.createElement("div");
    const ord = S.sel.indexOf(i);
    const hot = ord >= 0 || S.firstTap === i;
    el.className = "cell" + (hot ? " sel" : "");
    el.innerHTML = ch + (ord >= 0 ? `<span class="ord">${ord + 1}</span>` : "");
    el.onclick = () => tap(i);
    b.appendChild(el);
  });

  $("act").textContent = actLabel();
  const needsSel = it === "trace" || it === "build" || (isManip && !S.arrange);
  $("act").disabled = S.ended || (needsSel && S.sel.length === 0);
  $("clear").style.display = it === "anchors" ? "none" : "block";

  const f = $("found"); f.innerHTML = "";
  for (const w of [...S.words].reverse())
    f.appendChild(Object.assign(document.createElement("span"), { className: "chip", innerHTML: w }));
}
function actLabel() {
  const g = S.game;
  if (g.interaction === "manip" && S.arrange) return "Start hunting →";
  if (g.cascade) return "Knockout!";
  if (g.single) return "Submit snake";
  if (g.chain) return "Add rung";
  if (g.sprint || g.id === "trivia_spell") return "Submit answer";
  if (g.interaction === "anchors") return "Check rows";
  if (g.id === "longest_word") return "Submit";
  return "Submit word";
}

// ---------- interaction ----------
const adjacent = (a, b) => a !== b && Math.abs(((a / 5) | 0) - ((b / 5) | 0)) <= 1 && Math.abs((a % 5) - (b % 5)) <= 1;

function tap(i) {
  if (S.ended) return;
  const it = S.game.interaction;
  if (it === "trace") traceTap(i, true);
  else if (it === "build") traceTap(i, false);
  else if (it === "anchors") pairTap(i, true);
  else if (it === "manip") { if (S.arrange) manipTap(i); else traceTap(i, true); }
}
function traceTap(i, adj) {
  const pos = S.sel.indexOf(i);
  if (pos >= 0) { if (pos === S.sel.length - 1) S.sel.pop(); return render(); } // undo last
  if (adj && S.sel.length && !adjacent(S.sel[S.sel.length - 1], i)) return toast("Letters must be adjacent", true);
  S.sel.push(i); render();
}
function pairTap(i, sameRow) {                 // pick two tiles, swap them (anchors: same row only)
  if (S.firstTap === null) { S.firstTap = i; return render(); }
  if (S.firstTap === i) { S.firstTap = null; return render(); }
  if (sameRow && ((S.firstTap / 5) | 0) !== ((i / 5) | 0)) { toast("Same row only", true); S.firstTap = i; return render(); }
  S.live = swap(S.live, S.firstTap, i); S.firstTap = null; render();
}
function manipTap(i) {
  if (S.moves <= 0) { toast("No moves left — start hunting", true); S.arrange = false; return render(); }
  const k = S.game.manipKind;
  if (k === "swap") {
    if (S.firstTap === null) { S.firstTap = i; return render(); }
    if (S.firstTap === i) { S.firstTap = null; return render(); }
    S.live = swap(S.live, S.firstTap, i); S.firstTap = null; S.moves--;
  } else if (k === "rotate") {
    S.live = rotate2x2(S.live, i, S.dir); S.moves--;
  } else if (k === "shift") {
    const r = (i / 5) | 0, c = i % 5;
    S.live = S.axis === "row" ? shiftRow(S.live, r, S.dir) : shiftCol(S.live, c, S.dir); S.moves--;
  }
  if (S.moves <= 0) { S.arrange = false; toast("Out of moves — hunt!"); }
  render();
}

// ---------- submit ----------
function act() {
  if (S.ended) return;
  const g = S.game, it = g.interaction;
  if (it === "manip" && S.arrange) { S.arrange = false; S.sel = []; S.firstTap = null; toast("Hunt mode — trace words"); return render(); }
  if (it === "anchors") return anchorsSubmit();
  if (S.sel.length === 0) return;
  const word = wordFromSel();
  if (it === "trace" || (it === "manip" && !S.arrange)) {
    if (g.cascade) return knockoutSubmit(word);
    if (g.single) return singleSubmit(word);
    return huntSubmit(word);
  }
  if (it === "build") {
    if (g.chain) return ladderSubmit(word);
    if (g.sprint) return sprintSubmit(word);
    if (g.id === "trivia_spell") return triviaSubmit(word);
    return singleSubmit(word);                 // longest_word
  }
}
function huntSubmit(word) {                     // word_hunt, vowel_famine, bingo_lines, manip hunts
  if (S.words.includes(word)) { toast("Already found", true); S.sel = []; return render(); }
  const trial = S.game.score({ words: [...S.words, word] }, { board: curBoard(), dict: S.dict });
  const hit = trial.detail.found.find((x) => x.w === word);
  if (hit) {
    S.words.push(word); S.score = trial.points;
    toast("+" + hit.pts + (trial.detail.bonus ? ` (+${trial.detail.bonus} bingo!)` : ""));
  } else toast("Not valid here", true);
  S.sel = []; render();
}
function singleSubmit(word) {                   // snake, longest_word — one shot, ends round
  const sub = S.game.single ? { word } : { word };
  const r = S.game.score(sub, { board: curBoard(), dict: S.dict });
  if (!r.valid) { toast(r.detail.reason || "Not valid", true); S.sel = []; return render(); }
  S.score = r.points; endRound();
}
function knockoutSubmit(word) {
  const r = S.game.score({ word, combo: S.combo }, { board: curBoard(), dict: S.dict });
  if (!r.valid) { toast("No path — combo lost", true); S.combo = 1; S.sel = []; return render(); }
  S.score += r.points; S.words.push(word + " ×" + r.detail.mult);
  S.live = collapse(S.live, r.detail.path, S.refill);
  S.combo++; toast("+" + r.points + (S.combo > 2 ? ` — combo ${S.combo - 1}!` : ""));
  S.sel = []; render();
}
function ladderSubmit(word) {
  const trial = S.game.score({ words: [...S.words, word] }, { board: curBoard(), dict: S.dict });
  if (trial.detail.rungs.length > S.words.length) { S.words.push(word); S.score = trial.points; toast("Rung " + trial.detail.rungs.length + "!"); }
  else toast("Must be +1 longer and on the board", true);
  S.sel = []; render();
}
function sprintSubmit(word) {
  const r = S.game.score({ guess: word, idx: S.sprintIdx, timeMs: Date.now() - S.start }, { prompt: S.prompt });
  if (!r.valid) { toast("Not it — keep spelling!", true); S.sel = []; return render(); }
  S.score += r.points; S.sprintIdx++; S.sel = []; S.start = Date.now();
  if (S.sprintIdx >= S.prompt.clues.length) return endRound();
  toast("✓ next clue!"); render();
}
function triviaSubmit(word) {
  const r = S.game.score({ guess: word, timeMs: Date.now() - S.start }, { prompt: S.prompt });
  if (!r.valid) { toast("Not it — keep spelling!", true); S.sel = []; return render(); }
  S.score = r.points; endRound();
}
function anchorsSubmit() {
  const r = S.game.score({ letters: S.live }, { board: curBoard(), dict: S.dict });
  S.score = r.points;
  toast(r.detail.rows.length + "/5 rows" + (r.detail.perfect ? " — PERFECT!" : ""));
  if (r.detail.rows.length === 5) return endRound();
  render();
}

// ---------- end of round ----------
async function endRound() {
  if (S.ended) return;
  if (S.mode === "bout") return boutRoundEnd();
  S.ended = true; clearInterval(S.timerId);
  const best = Math.max(S.score, +(localStorage.getItem("jj-best-" + S.game.id) || 0));
  localStorage.setItem("jj-best-" + S.game.id, best);
  let standingsHtml = "";
  if (ONLINE) {
    try {
      await online.submit({ matchId: CONFIG.matchId, roundNo: S.round, minigame: S.game.id,
        score: S.score, detail: { words: S.words } });
      const rows = duelStandings(await online.standings(CONFIG.matchId));
      standingsHtml = `<div class="sub">Duel Ladder:<br>${rows.map((r, i) =>
        `${i + 1}. ${r.user_id.slice(0, 6)} — ${r.roundWins}W / ${r.points}pts`).join("<br>")}</div>`;
    } catch (e) { standingsHtml = `<div class="sub">（offline — score saved locally）</div>`; }
  }
  const ov = $("overlay");
  ov.innerHTML = `
    <h2>${S.game.label}</h2>
    <div class="big">${S.score}</div>
    <div class="sub">Best: ${best}</div>
    ${standingsHtml}
    <div class="sub">How was <b>${S.game.label}</b>?</div>
    <div class="rate" id="rate">
      <button data-r="4">🥊<small>love</small></button>
      <button data-r="3">👍<small>good</small></button>
      <button data-r="2">😐<small>meh</small></button>
      <button data-r="1">👎<small>nope</small></button>
    </div>
    <input id="note" class="note" placeholder="one line of feedback (optional)" autocomplete="off">
    <div class="row" style="max-width:300px">
      <button class="btn ghost" id="ovSkip">Skip →</button>
      <button class="btn ghost" id="ovExport">📋 Export (${S.feedback.length})</button>
    </div>
    <div class="sub">Rate it to log your feedback and get the next random mode.</div>`;
  ov.classList.add("show");
  document.querySelectorAll("#rate button").forEach((btn) =>
    (btn.onclick = () => { recordFeedback(+btn.dataset.r); startNext(); }));
  $("ovSkip").onclick = () => startNext();
  $("ovExport").onclick = exportFeedback;
  render();
}

// ---------- misc ----------
let tt = null;
function toast(msg, bad) {
  const el = $("toast"); el.textContent = msg; el.className = "toast show" + (bad ? " bad" : "");
  clearTimeout(tt); tt = setTimeout(() => (el.className = "toast"), 1100);
}
function wire() {
  $("act").onclick = act;
  $("clear").onclick = () => { S.sel = []; S.firstTap = null; render(); };
  $("next").onclick = () => startNext();            // skip to the next random mode
  $("newseed").onclick = () => exportFeedback();
  $("modeToggle").onclick = () => { S.arrange = !S.arrange; S.sel = []; S.firstTap = null; render(); };
  $("axisBtn").onclick = () => { S.axis = S.axis === "row" ? "col" : "row"; render(); };
  $("dirBtn").onclick = () => { S.dir = -S.dir; render(); };
}
