# The Game Design Deck — rulebook & spec

A 60-card deck that is three things at once: a **universal randomiser**, a
**designer's ideation tool**, and a **portfolio you can shuffle**. This is the
pack-in booklet: the deck spec, the functional card back, the ways card
*orientation* carries information, and five original games.

The deck lives digitally in the **Match Deck Gateway**
(`/matchdeckgateway/` → *Game Design Deck*, *Elemental Gambit*, *Vault Run*).
Everything below is playable there; the workshop is the deck's digital twin.

---

## 1. The deck — 60 cards

| Group | Count | Notes |
|---|---:|---|
| Standard ranks A–K × ♠♥♦♣ | 52 | the familiar deck |
| Suited Jokers (one per suit) | 4 | wild, but they keep a suit |
| Aces-low "1"s (one per suit) | 4 | rank **1**, below the 2; can't be topped by an Ace |
| **Total** | **60** | |

**Why 60?** It's the most-divisible small number (2²·3·5 — the reason clocks
and compasses use it). Its divisors are exactly 1, 2, 3, 4, 5, 6, 10, 12, 15,
20, 30, 60 — and **every one carries a balanced system** (each value appears
`60 ÷ d` times):

| `d` | each appears | System |
|---:|---:|---|
| 2 | ×30 | red / black |
| 3 | ×20 | **elements** — Fire ▸ Earth ▸ Water ▸ Fire (a fast triangle) |
| 4 | ×15 | suits |
| 5 | ×12 | **design pillars** — Actions / Balance / Craft / Drama / Experience (A–E; each card a one-sentence lesson) |
| 6 | ×10 | d6 |
| 10 | ×6 | d10 |
| 12 | ×5 | 12-point bearing (also a d12 / scatter die) |
| 15 | ×4 | ranks (1, A, 2–10, J, Q, K, ★) |
| 20 | ×3 | d20 |
| 30 | ×2 | **twin-pairs** (each card's same-rank, same-colour partner; also a d30) |
| 60 | ×1 | **unique id + a 1–60 "seconds" stamp** (also a minute/second timer, d60) |

So one deck is a whole dice bag: draw for a **d6/d10/d12/d20/d30/d60**, two draws
for **percentile (d100)**, and clean subsets for d2/d3/d4/d5/d15. The deck is laid
out as an **authored grid** — every system runs as a clean repeating cycle down
the canonical suit → rank order (Earth ▸ Fire ▸ Water, d6 1–6, pillars A–E, …),
which stays perfectly balanced because 60 is the LCM of the periods. (Shuffling
the physical deck randomises play; the tidy layout is for the reference sheet.)
(Non-divisors like 8 and 13 **can't** be balanced on 60 — that's why the compass
is 12-point, not 8-way, and why the deck runs 15 ranks, not the standard 13.)

**Per-card contents**
- **Poker index** (rank + suit) — the card still shuffles into any normal game.
- **d6, d20, d10** — the randomiser core.
- **Element** (the 3-slot) — Fire, Water, Earth. A fast triangle where each beats
  exactly one and loses to one: **Fire** scorches Earth, **Earth** dams Water,
  **Water** douses Fire (a same-element pairing is a mirror).
- **Design pillar** (the 5-slot) — every card belongs to one of five A–E pillars —
  **A 🎬 Actions, B ⚖️ Balance, C ✨ Craft, D 🎭 Drama, E 🎯 Experience** — and
  carries a **one-sentence lesson** on it. The letters are ordinal (**A–E = 1–5**),
  so the pillar also doubles as a **d5**. Twelve distinct lessons per pillar → 60.
  This is the deck's designer-signature axis: shuffle it and you've got a
  60-card deck of game-design wisdom, sorted five ways.
- **Bearing** — a 12-point compass / clock direction (doubles as a scatter die).
- **Twin** — every card's same-rank, same-colour partner (30 pairs → memory games
  and a d30).
- **Seconds** — a unique **1–60** stamp: a serial number, and a way to use the
  deck as a minute / second timer or turn-order.
- **Mau rule** — one of 60 unique house rules (see §4's *Mau Mixer*).
- **Design lens** — on the 40 pip cards, a probing question to interrogate a design.

---

## 2. The card back — a functional tool

The back is not decoration. Printed true at **63.5 × 88.9 mm (2.5 × 3.5 in)**,
it carries a **ruler on every edge** and an **orientation dial** in the middle.

| Edge | Scale | Range |
|---|---|---|
| Top (long) | millimetres | 0–88 mm |
| Right (short) | inches | 0–3.5 in (¼-in subticks) |
| Bottom (long) | centimetres | 0–8 cm (½-cm subticks) |
| Left (short) | picas | 0–21 pc (typographer's scale; 6 pc = 1 in) |

Centre: a **12-point compass rose** with a clear **▲ UP** mark and a **④-corner
d4** (one number per corner). Print the deck **at 100% / actual size** or the
rulers drift.

> Design note: rulers live on the *back* so the face stays legible. The corner
> pips and the ▲ mark make the back's orientation unambiguous — which is what
> makes the tricks in §3 work.

---

## 3. Orientation as information — five ways

A card has four rotations and two faces (upright / reversed). Use them to *track
state* without extra components:

1. **4-state counter / phase.** Rotate 0° / 90° / 180° / 270° and read the corner
   pip (①–④) now at top-left. One card tracks a value 0–3, a turn phase, or a
   "tapped" level.
2. **Upright vs Reversed.** The ▲UP mark gives every card two readings — e.g. a
   lens question and its inverse, an element's two modes, or a scoring value that
   halves when reversed (tarot-style).
3. **The bearing points.** Lay a card so its arrow aims at the player, pile, or
   number it targets — a physical "this affects *you*" pointer.
4. **The rose is a dial.** Spin the back's 12-point rose to log a 1–12 value: the
   round number, a running score, a countdown.
5. **Rotate to the ruler you need.** Turn the card so mm / in / cm / pica sits
   along the edge you're measuring — one card, four scales.

---

## 4. Five games

Each names the systems it leans on. **★ = playable now in the Card Game Workshop.**

### ★ Elemental Gambit — 1v1 duel (element triangle + d6)
Twenty life each. Both reveal a card. If your **element beats** the opponent's
(Fire ▸ Earth ▸ Water ▸ Fire), you deal its **d6**; a same-element **mirror** is
settled by the **d6 gap** (higher wins the difference; a tie deals nothing).
Draw back up to five. First to drop the other to **0 life** wins. *The clean
showcase for the element triangle — two of three match-ups are decisive.*

### ★ Vault Run — 1v1 press-your-luck (dice + bearing)
Flip cards to pile up **loot** — each adds its **d6**. A flip only **busts**
(loot lost) when its **bearing is not "clear skies"** (the North band 10–2) **and**
its **d20 ≤ your current loot** — so the bigger the pile, the more each flip
risks. **Bank** to keep it. Play in rounds (both players get equal turns); the
higher score **≥ 50** wins, a tie plays on. *Dice tension with the bearing as a
lifeline.*

### Wayfarer's Compass — 2–4p, no components but the deck (bearing + orientation)
Deal each player a face-up **home** card; the rest is the draw pile. On your turn,
draw one and **lay it so its bearing points from the last card toward open table**
— you're building a shared trail of arrows. Score a card by **playing onto it a
card whose rank is within the d6 of the one it points at** (chain-claims). Track
each player's claimed length by **rotating your home card** on the rose (§3.4).
First to a **12-card trail** wins. *A spatial game literally steered by the
bearings.*

### The Critique — 3+ players, party / pitch (design lenses)
One player is the **Maker** and names any game (real, imagined, or a prior
round's). Everyone else draws a **pip card** and must critique or defend the game
**through its design lens** (the italic question). The Maker awards the card to
the sharpest take; that player becomes the next Maker. First to **five lenses**
wins. *Turns the 40 lenses into a real ideation/party tool — the "proof of
acumen" made playable.* Reversed (§3.2): read the lens as its opposite for a
harder round.

### Rulers & Realms — 2–4p, dexterity + estimation (the back's ruler + d20)
Flick or slide a card across the table toward a target line. Before it stops, the
thrower **calls a distance in cm**; measure with the **card-back ruler**. Score
the **d20** of the thrown card **minus the error in cm** (min 0). Deal 3 throws
each; highest total wins. *The only game that uses the deck as a measuring
instrument — pure showcase for the ruler edges.*

**More system hooks** (drop into any game): the **element** triangle settles
quick clashes; the **pillars** turn the deck into a study aid — draw one for a
daily design lesson, or a 12-card pillar deck to drill a single skill;
**twins** power a 30-pair memory/concentration game; **seconds**
turn the deck into a timer (flip until you hit a called value) or a turn-order
(low seconds goes first); **red/black** is a coin-flip that's always in hand.

### Mau Mixer — the deck as a rule randomiser (Mau rules)
Every card carries one of **60 unique Mau rules**. To build a Mau/Mao variant,
**deal a face-up row of N cards** (start with 5) and play with exactly those
rules — nobody may explain them; new players learn by penalty. Add a card to
raise the chaos, swap one to tune it. Or just mine the rules for ideas. *60 rules,
no repeats — an endless house-rule generator.*

---

## 5. Print & production notes

- **Print at 100% / actual size**, no "fit to page", or the rulers lose calibration.
- Keep the **poker index in the corners sacred**; the extra systems ride as a quiet
  icon band so the deck still plays every standard card game.
- Card stock: standard poker size, blue-core linen finish recommended; the ruler
  ticks want a matte edge to read against.

*Generated and verified in the Card Game Workshop — see `test/smoke.js` for the
even-partition, unique-Mau-rule, and wheel-integrity checks.*
