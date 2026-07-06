# Improvement Plan — mustdesigngames

> Generated 2026-07-02 from a full 12-repo portfolio audit (Claude Code session).
> Companion career report: ConductiveOS vault, `09_personal/2026-07-02-life-audit-and-career-plan.md`.

**What this is:** A live GitHub Pages monorepo of 19 self-contained vanilla-JS/Canvas web game prototypes — one folder per game — spanning an idle pack-ripping economy sim, tactical card-battler, tower defense, a generic card-game engine with P2P multiplayer, a virtual pet, 3D action, and party word games.

**Stack:** Vanilla JavaScript (ES2020+, zero build step), HTML5 Canvas 2D, CSS (custom properties, responsive/mobile-first layouts), Three.js / WebGL (vendored, grand-theft-apples), WebAudio API (procedural SFX + generative ambient music in mosslings), PeerJS / WebRTC P2P (card-workshop online mode), localStorage persistence with save-schema migrations, Node.js vm-based headless smoke tests (dependency-free DOM stub), GitHub Actions + GitHub Pages deploy · **Maturity:** shipped-live · **Live:** https://mattdanusergrant.github.io/mustdesigngames/
**Size:** ~27.5k lines hand-authored HTML/JS/CSS across 19 games (largest: keeprippingpacks at 9,247 lines; plus 1.3MB vendored three.module.js and 20MB of sigil-tactics PNG assets)

## What's genuinely good here

- Genuinely shipped: live Pages site with auto-deploy on every push to main (.github/workflows/pages.yml), .nojekyll, relative-path discipline so every game works at its sub-path
- keeprippingpacks is a legitimately sophisticated idle/economy sim: per-rarity print-sheet drop-rate model with an auditPrintSheets() invariant checker, live drifting market prices, an upgrade DAG (purchaseNode/eff()), a localStorage-persisted in-browser design tuner (def()/_designOverrides) for live balance tuning, save migrations (_migrateOldPrintSheets), reduced-motion accessibility mode, and a debug mode
- card-workshop has a real engineering core: a pure card engine (makeDeck/score5/best7/cmpScore poker evaluator), a host-authoritative PeerJS NET transport with lazy-load and graceful degradation to hotseat, 6 mountable games on one shell, and a passing dependency-free headless smoke test (test/smoke.js runs the inline <script> in Node vm behind a hand-rolled DOM stub — verified passing, 14/14)
- sigil-tactics/DESIGN.md is a 461-line versioned game design document with hero stat tables, card-value balance baselines ('a card must beat a normal attack'), campaign unlock tables, and honest open-questions — hiring-manager-grade design writing
- Exceptional comment quality across sampled games: comments explain design intent and tuning rationale, not just mechanics (e.g. keeprippingpacks' four documented sorting-interaction prototypes, sigil-tactics' initiative state machine)
- High iteration velocity with clean commit hygiene: 55 descriptive commits in 8 days (Jun 24–Jul 1), visible design iteration loops (Bramblewake redesigned ~10 times: FreeCell -> pair-matching -> pyramid solitaire)
- Consistent cross-game polish patterns: mobile touch controls (floating joysticks, tap targets), OG meta tags, theme-color, mute toggles, pass-the-phone hotseat overlays (sigil-tactics showPassOverlay), localStorage saves everywhere


## Issues found

- README.md game table is out of sync with the gallery: index.html lists 19 games but README lists 16 — Airwolf, Berm Burner, and Honk Beach are missing from README.md despite being live
- The only CI workflow is the Pages deploy — card-workshop/test/smoke.js exists and passes but is never run in CI, so a broken commit deploys straight to production; 18 of 19 games have zero automated coverage
- The root index.html gallery is a wall of 19 undifferentiated name-only cards ('play ->') — no blurbs, no screenshots, no genre tags, no mobile/desktop badges, no curation hierarchy, no link to author site or GitHub; as a portfolio front door it undersells the work badly
- sigil-tactics/assets ships 20MB of unoptimized PNGs (12 hero portraits at ~1.5–1.7MB each) — bloats every clone and page load for a mobile-web game
- sigil-tactics/DESIGN.md contradicts the implementation: the doc specifies a Speed-order initiative system with token brackets, but index.html (line ~1121) implements 'strict alternation'; the doc also contains two conflicting card-pool composition tables (v0.17 remnants)
- keeprippingpacks hard-gates mobile users out of gameplay entirely (#mobile-gate shows only a drop-rate calculator) — the flagship 9.2k-line game is unplayable on phones
- No LICENSE file anywhere in the repo
- Provenance labeling is inconsistent: 4 of 19 games carry an #LLM-generated header tag (bloom-again, eat-monkey-eat, groundwork, mosslings), the rest don't, though git shows 46 of 55 commits authored by Claude


## Ranked improvements

### 1. Turn the gallery index into a real portfolio page  `impact 5/5 · effort M`

**Why:** This is the front door to 19 games and currently shows only names. A hiring manager or player gets no signal about which games are deep (keeprippingpacks, sigil-tactics, card-workshop) vs. toys. Curation IS the portfolio skill on display for a collection repo.

**How:** Rework the root index.html card grid: add a one-line blurb, genre tag, and mobile/desktop badge per card (reuse each game's existing <meta name="description"> text — e.g. keeprippingpacks already has 'Rip booster packs, sort the spill, craft Sets, sell on a live market'). Add a 'Featured' row for the 5 flagship games and an 'Experiments' section for the rest. Add static screenshot thumbnails (one PNG per game, ~50KB each). Footer: link to mattdanusergrant.com and the GitHub repo.

**Career angle:** Highest-leverage career change in the repo — this URL is what goes on a resume/portfolio; right now it reads as a link dump, after this it reads as a curated body of work.

### 2. Run the smoke test in CI and gate deploys on it  `impact 4/5 · effort S`

**Why:** test/smoke.js exists, passes, and mirrors the ronin-survivor harness, but pages.yml deploys every push untested — a SyntaxError in card-workshop would ship to prod silently.

**How:** Add .github/workflows/test.yml running `node card-workshop/test/smoke.js` on push/PR (copy ronin-survivor's test.yml). Better: make pages.yml's deploy job `needs: test`. Add a root package.json with `"test"` so `npm test` works at repo root.

**Career angle:** Deploy-gated CI on a personal repo is a strong engineering-maturity signal; it also makes the ronin-survivor harness pattern look deliberate and reusable rather than one-off.

### 3. Extend the headless-harness pattern to keeprippingpacks and sigil-tactics  `impact 4/5 · effort M`

**Why:** keeprippingpacks already has invariant machinery (auditPrintSheets(), specificCardRatePerPack(), computeCardOffsets()) that is pure and trivially assertable; sigil-tactics' initiative/round state machine (startRound/advance/endActiveTurn) is deterministic. These are the two biggest games and have zero coverage.

**How:** Expose a `window.__krp` / `window.__st` dev hatch (same pattern as card-workshop's window.__cw), then add test/smoke.js per game asserting: print-sheet slots always total 144, slot weights sum to ~1.0, cardFullId uniqueness, save round-trip through _migrateOldPrintSheets; for sigil-tactics, a full simulated match between two random AIs ends without throwing and with a winner.

**Career angle:** Demonstrates testing DOM-coupled single-file code at scale — a distinctive, interview-ready technique ('how do you test a 9,000-line inline script with no build step?').

### 4. Generate README table and gallery from a single games manifest  `impact 3/5 · effort S`

**Why:** README.md (16 games) and index.html (19 games) have already drifted — Airwolf, Berm Burner, Honk Beach are live but undocumented. With a game added roughly every other day, drift will keep recurring.

**How:** Add games.json at repo root ({slug, title, blurb, tags, mobile, featured}); a ~40-line Node script (scripts/build-index.js) regenerates the gallery card grid in index.html and the README table. Run it in the test workflow and fail CI if output differs from committed files (drift check).

**Career angle:** Shows docs-as-code discipline; also makes improvement #1 maintainable.

### 5. Compress sigil-tactics art to WebP  `impact 3/5 · effort S`

**Why:** 20MB of hero PNGs (~1.6MB each) dominate a 44MB repo and cripple first load of a mobile-web game on cellular.

**How:** Batch-convert sigil-tactics/assets/heroes/*.png and ui/*.png to WebP at display resolution (`cwebp -q 80` or sharp); update the asset references in sigil-tactics/index.html and assets/README.md. Target <2MB total. Optionally note original-res masters live outside the repo (per the ConductiveOS assets-are-gitignored convention).

**Career angle:** Web performance fundamentals — small but visible signal, and it makes the live demo actually load fast in an interview.

### 6. Reconcile sigil-tactics DESIGN.md with the shipped build  `impact 3/5 · effort S`

**Why:** The doc's headline initiative system (Speed order + token brackets) is not what the code does (strict alternation, index.html ~line 1121), and the doc carries two contradictory pool-composition tables. A reviewer who reads both will conclude the docs can't be trusted — which poisons the repo's best artifact.

**How:** Update the Initiative System section to describe strict alternation (move the speed-token design to an 'earlier designs / future work' appendix), delete the stale v0.17 duplicate pool table, and bump the version header to match the build.

**Career angle:** DESIGN.md is the single best game-design writing sample across all 12 repos — worth keeping honest since it will be linked from portfolio/case studies.

### 7. Give keeprippingpacks a playable mobile mode  `impact 3/5 · effort L`

**Why:** The deepest game in the collection (9.2k lines) locks phones out entirely via #mobile-gate — most casual sharing (Discord, Twitter, texting a friend) lands on mobile and hits a wall.

**How:** Start narrow: the hover_and_pulse sort mode already maps naturally to touch (finger = cursor). Enable a reduced layout under the existing max-width:760px media query — header chips, sand canvas, rip button, market list stacked — and route touchmove into the existing cursorPos handler. Keep the tuner desktop-only.

**Career angle:** Turns the flagship into a shareable demo; idle games are also the most portal-monetizable genre here.

### 8. Add LICENSE and normalize provenance labels  `impact 2/5 · effort S`

**Why:** No LICENSE means nobody can legally reuse anything; and the honest #LLM-generated tags on 4 games are a differentiator only if applied consistently (git history shows 46/55 commits are Claude-authored across all games).

**How:** Add MIT LICENSE at root. Add a short 'How these are built' section to README.md describing the AI-pair-development workflow (Claude sessions + human design direction, per the ConductiveOS Builder pattern) instead of ad-hoc per-file tags.

**Career angle:** Turns the AI-assisted authorship from a thing a reviewer discovers in git blame into a deliberate, owned story about agentic development velocity — directly relevant to AI-lab and agent-engineering roles.


## Skills this repo proves (for hiring managers)

- Rapid game prototyping across genres: idle/economy sim, grid tactics, tower defense, card engines, virtual pet, 3D third-person action, physics racer, word/party games — 19 shipped playables
- Deep vanilla-JS engineering without frameworks or build tooling: 9.2k-line single-file app with upgrade DAGs, save migrations, and a live in-browser balance tuner (keeprippingpacks def()/_designOverrides system)
- Systems/economy design made executable: probabilistic drop-rate models with invariant audits (auditPrintSheets, specificCardRatePerPack), market price simulation, documented card-balance baselines (DESIGN.md value thresholds)
- P2P networking: host-authoritative state sync over WebRTC/PeerJS with lazy loading and graceful degradation to hotseat (card-workshop NET object)
- Testing untestable-looking code: dependency-free Node vm + hand-rolled DOM stub harness that smoke-tests an inline <script> game (card-workshop/test/smoke.js), a reusable pattern shared with ronin-survivor
- Canvas 2D and WebGL rendering, WebAudio procedural sound design (generative chord/arpeggio ambient system in mosslings startAmbient/setChord/arpNote)
- Mobile-web UX craft: touch joysticks, pass-the-phone hotseat overlays, safe-area insets, reduced-motion accessibility modes
- AI-augmented development at high velocity: 46/55 commits Claude-authored under human design direction, producing ~27k reviewed lines in days — a working agentic-development pipeline, not a claim
- Game design documentation: versioned GDDs with stat tables, balance math, and explicit open questions (sigil-tactics/DESIGN.md)


## Career signals

- Ships and it's live: real deployed product URL with CI auto-deploy — rare among portfolio repos, most of which never leave localhost
- Monorepo curation with a written contribution convention (README 'Add a new prototype' section) — shows platform thinking, not just game hacking
- One game has a passing test suite in the exact style of his other repo (ronin-survivor) — evidence of deliberately transferring engineering patterns between projects; but tests are not wired into CI, which a senior reviewer will notice in 30 seconds
- Commit messages are consistently descriptive and design-intent-oriented ('room-gated single draw + stackable same-suit hollows') — reads like a designer's changelog, strong for design-adjacent roles
- Velocity signal: 55 commits, 19 games, 8 days of repo history — with git blame showing a disciplined human-directs/agent-builds workflow; this is a live demonstration of the AI-engineering productivity story every AI lab and startup wants operationalized
- Polish is deep but uneven: flagship games have accessibility modes, OG tags, and save migrations, while the portfolio front door (root index.html) has zero curation — signals a builder who needs (or needs to fake) a marketing pass
- Docs quality is bimodal: DESIGN.md is exceptional, README has already drifted from reality — consistency is the gap, not capability
- No LICENSE, no per-game screenshots, inconsistent provenance tags — small hygiene gaps that are cheap to fix and disproportionately affect first impressions


## Monetization angles

- Submit keeprippingpacks (after the mobile pass) to web-game portals — CrazyGames, Poki, itch.io — where idle/pack-opening games are a proven ad-revenue genre; it is already the right shape (session loop, upgrades, no backend)
- Sigil Tactics is deliberately tabletop-ready (polyhedral-dice HP rule, minifig framing in DESIGN.md) — package as a print-and-play on itch.io/PNP Arcade with the digital build as the free demo
- Card Game Workshop as a tool, not a game: card-game designers need a fast prototyping sandbox with online playtesting (PeerJS rooms already work) — free tier + paid custom-deck/export tier is a plausible micro-SaaS
- The collection itself as content: a devlog/YouTube/newsletter series on 'building 19 games with an AI agent pipeline' monetizes the workflow (sponsorships, consulting leads) better than the games monetize directly
- Consulting/contracting credential: the repo demonstrates fast disposable-prototype delivery — sellable as a fixed-price 'playable prototype in a week' service to indie studios and startups


## Standout artifacts to show off

- keeprippingpacks/index.html — 9,247-line self-contained idle economy sim: print-sheet drop-rate model with auditPrintSheets() invariant checker, live market, upgrade node tree (purchaseNode/eff), localStorage design-tuner overrides (def/_designOverrides), save migration (_migrateOldPrintSheets), reduced-motion mode
- card-workshop/test/smoke.js — dependency-free headless test harness: runs an inline <script> game in Node vm behind a hand-rolled DOM stub; verified passing 14/14, covers the poker evaluator, deck builder, and mounts all 6 games
- card-workshop/index.html (NET object, ~line 246) — host-authoritative PeerJS multiplayer transport with lazy CDN load, room codes, and graceful degradation to hotseat
- sigil-tactics/DESIGN.md — 461-line versioned GDD with hero stat tables, card-value balance thresholds, campaign/draft/deploy specs, and honest open-questions section
- mosslings/index.html — generative WebAudio ambient music system (startAmbient/setChord/arpNote) plus real-time need-decay pet sim with save migration
- .github/workflows/pages.yml + README.md monorepo convention — the whole one-folder-per-game, push-to-deploy platform design


## Cross-repo connections

- ronin-survivor: card-workshop/test/smoke.js literally says 'Mirrors the Ronin Survivor smoke-test approach' — extract the Node-vm + DOM-stub headless harness into a tiny shared package (or a documented pattern repo) and it becomes a bloggable, interview-ready artifact spanning both repos; also feature ronin-survivor as a flagship card on the mustdesigngames gallery since it's the most polished single game
- ConductiveOS: mosslings' header comment references its GDD at 03_creating/game-ideas/mossling.md in the vault — the vault->prototype->live-site pipeline (idea filed by Archivist, built by Builder, deployed via Pages) is itself the strongest career story across all 12 repos; write it up as a case study on the agentic workflow
- mattdanusergrant (MDG.com personal site): the gallery should be cross-linked both ways — site features 4-5 flagship games with screenshots, gallery footer links back to the site; the case-study-forge skill already exists in the vault for producing matching-style writeups
- cartomancy: card-workshop's pure engine (makeDeck/score5/best7/cmpScore, deck-spec options, PeerJS NET transport) is a drop-in foundation for any card project — if cartomancy is card-based, lift the engine rather than rebuilding
- jabberjawbreaker / fortkickass / dankomphalos: if these are standalone game prototypes, the README's 'one repo, one folder per game' convention argues for consolidating or at least cross-linking them from the gallery so the body of work reads as one portfolio, not scattered repos
- daily-dividend-lab: keeprippingpacks' drifting-market price simulation (marketKey per-ID live prices) shares mechanics DNA with a dividend/market lab — a shared 'toy market simulator' write-up or module would connect the game-design and finance-tooling threads
- keepingcadence: rhythm-rpg (Rolls Per Groove) is the natural crossover if keepingcadence is music/rhythm-related — shared beat-timing/input-window code or a combined demo


#LLM-generated
