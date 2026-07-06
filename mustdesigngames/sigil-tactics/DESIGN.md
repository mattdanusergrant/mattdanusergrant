# Sigil Tactics — Design

Mobile-web tactical card-battler. Two sides, three heroes each, on a small grid. Play proceeds in **rounds**; within a round, every living unit gets one turn in **Speed order**. Cards add sidekicks, spells, and battlefield effects. Win by eliminating all three enemy heroes.

Current build: **v0.20** (`index.html`).

## Modes

- **Campaign** (PvE) — the primary mode. Start with Knight, Ranger, Mage. Beat each of 6 boss heroes to add them to your roster (Paladin → Druid → Scout → Berserker → Warlock → Assassin, locked in that order). Progress persists in `localStorage` under key `sigil-progress`.
- **Skirmish** — single match against the random-AI; full 9-hero pool is available to both sides.

Mode is chosen from the title screen at app open. The "New" button on the play HUD returns to the title (skirmish) or the mission list (campaign).

### Campaign mission table

| # | Title | Boss unlock | AI priority pool |
|---|---|---|---|
| 1 | The Sworn Oath | 🛡️ Paladin | Paladin, Knight, Mage, Ranger |
| 2 | The Wild Heart | 🌿 Druid | Druid, Mage, Ranger, Paladin |
| 3 | The Quick Shadow | 👁️ Scout | Scout, Ranger, Knight, Druid |
| 4 | The Wild Rage | 🪓 Berserker | Berserker, Knight, Mage, Paladin |
| 5 | The Pact of Shadows | 🩸 Warlock | Warlock, Mage, Druid, Ranger |
| 6 | The Silent Blade | 🗡️ Assassin | Assassin, Scout, Ranger, Berserker |

Missions are linear: mission *N* unlocks once mission *N-1* is complete. Replaying a completed mission re-unlocks the boss (no-op if already unlocked) and is otherwise harmless.

### Campaign draft behavior

The snake-draft phase runs as in skirmish, but with two filters:
- The player's pickable roster is restricted to **unlocked heroes**.
- The AI walks the mission's `aiPool` list in order, picking the first hero not already drafted. If every entry on the list is taken (e.g., the player snake-picked something the AI wanted), the AI falls back to any random unpicked active hero.

This guarantees the boss always shows up on the AI's side in their unlock mission (since the player can't yet pick them), and gives missions a thematic enemy composition without sacrificing the draft phase's tension.

---

## Board

- 5 columns × 4 rows. No neutral middle row — each side owns two rows.
- Player A (blue, human) owns rows 2–3; Player B (red, AI) owns rows 0–1.
- Deploy zone for cards: each side's own two rows.
- Tiles can hold one unit. Tiles can also carry a **High Ground** terrain marker (+1 ATK to the unit standing on it).

## Sides

Each side fields **3 heroes** drafted from a **9-hero active roster**. Three additional classes (Sentinel, Necromancer, Crusader) remain defined in code under a `hidden:true` flag and are excluded from the draft for now. HP must come from the polyhedral dice set `{4, 6, 8, 10, 12, 20}`.

### Active roster (9)

| Glyph | Hero | HP | ATK | Move | Range | Speed | Passive |
|---|---|---|---|---|---|---|---|
| 🏰 | Sentinel  | 12 | 1 | 1 | 1 | 2 | **Anchor** — Sentinel and orthogonally adjacent allies cannot be pushed or pulled |
| 🛡️ | Paladin   | 10 | 1 | 1 | 1 | 2 | **Guardian** — after you play a heal card, Paladin restores +1 HP on your most-wounded ally |
| ⚔️ | Knight    | 10 | 1 | 1 | 1 | 3 | **Steadfast** — cannot be pushed or pulled by any effect |
| 🩸 | Warlock   | 6  | 1 | 1 | 3 | 3 | **Soul Drain** — heals 2 HP whenever any enemy dies anywhere on the board |
| 🌿 | Druid     | 8  | 1 | 1 | 2 | 3 | **Symbiosis** — after you play a heal card, Druid heals 1 HP |
| 🔮 | Mage      | 6  | 1 | 1 | 2 | 3 | **Resonance** — your AoE cards (`dmg-adj`, `push-adj`) gain +1 splash / +1 kb |
| 🪓 | Berserker | 8  | 2 | 1 | 1 | 3 | **Bloodthirst** — heals 1 HP whenever he damages an enemy (attack, damage card, or assist strike) |
| 💀 | Necromancer | 6 | 1 | 1 | 2 | 3 | **Death Touch** — enemies orthogonally adjacent take +1 damage from all sources |
| 🏹 | Ranger    | 8  | 1 | 1 | 2 | 4 | **Spotter** — your damage / push / pull cards have +1 range while Ranger is alive |
| 👁️ | Scout     | 4  | 1 | 2 | 2 | 4 | **Pathfinder** — your dash cards have +1 range while Scout is alive |
| 🗡️ | Assassin  | 6  | 2 | 2 | 1 | 4 | **Shadow Step** — any time Assassin moves, her next attack counts as rear-arc (×3) regardless of facing |

Active-roster speeds form a contiguous `{1, 2, 3, 4, 5, 6, 7, 8, 9}` — all unique. Combined with the snake draft (no class duplicates within a match), initiative ties between heroes never occur. Hidden-roster speeds (Sentinel 1, Necromancer 4, Crusader 8) currently collide with active speeds; if any of those are un-hidden later, the active roster will need to be re-numbered accordingly.

### Hidden roster (3, not in draft)

| Glyph | Hero | HP | ATK | Move | Range | Speed | Tags |
|---|---|---|---|---|---|---|---|
| 🏰 | Sentinel    | 12 | 1 | 1 | 1 | 1 | —    |
| 💀 | Necromancer | 6  | 1 | 1 | 2 | 4 | —    |
| ✝️ | Crusader    | 10 | 1 | 1 | 1 | 8 | —    |

Heroes never appear in the deck. They are gold-bordered on the board.

## Draft & deploy

Each match begins with a draft phase, followed by a deploy phase, then play.

### Draft (1-2-2-1 snake)

| Pick | Player |
|---|---|
| 1 | P1 |
| 2 | P2 |
| 3 | P2 |
| 4 | P1 |
| 5 | P1 |
| 6 | P2 |

Each side ends with 3 heroes from the 12-hero roster. A pick removes the hero from the pool — no duplicates across sides.

### Deploy (alternating, face-down)

Placement mimics tabletop play: players alternate placing one unit at a time, each token going down **face-down**. You see *where* the opponent placed their unit but not *which* hero is in each tile — identities are concealed until play begins, at which point all units flip face-up.

**Placement order is the reverse of the draft** to keep things fair — whoever picked first in the draft places last in the deploy phase:

| Place | Player |
|---|---|
| 1 | P2 |
| 2 | P1 |
| 3 | P1 |
| 4 | P2 |
| 5 | P2 |
| 6 | P1 |

Each turn, the active player picks one of their unplaced heroes from a tray, then taps a tile in their half of the board (rows 0–1 for P2, rows 2–3 for P1). The AI uses a simple heuristic (ranged units to the back row, melee to the front, centered).

An **Auto** button lets the human burn through their remaining placements in a default formation; the deploy sequence then skips any consecutive P1 slots and the AI resumes.

### Decks

For v0.10 the deck is the fixed 30-card Knight/Ranger/Mage suite, used by both sides regardless of who they drafted. Suites for the other 9 heroes are not yet authored — a future task.

## Round structure

Play proceeds in numbered rounds.

1. **Start of round**
   - Both sides gain +1 max aether (cap 10) and refill to full.
   - Both sides draw 1 card (hand cap 8).
   - All units lose their `hasMoved` / `hasActed` flags.
2. **Initiative pass**
   - Repeatedly pick the next unit to activate per the Initiative System (below) until no unacted units remain.
3. **Next round** — back to step 1.

The initiative ribbon above the board shows the current Initiative token holder (◆) plus current and upcoming activations (acted units are faded).

## Initiative System

Activation order is **strictly by Speed**, ties broken by the Initiative token.

**Game start.** The unit with the highest Speed acts first. If multiple units are tied for highest Speed, randomly pick which one. The player who is **not** taking that first action gains the **Initiative token**.

**Speed ties during play.** Whenever multiple pending units share the same top Speed and they belong to different sides, the units belonging to the token-holder go first (in id order), then the opponent's tied units. The token then transfers to the opponent.

**Within-side ties.** Units of the same side at the same Speed activate in id order (older units / heroes first).

**Tie-bracket semantics.** A "tie" is resolved per *bracket* (a single Speed value with both sides represented). All token-holder units in the bracket act, then all opponent units, and the token transfers once at the end of the bracket.

**Persistence.** Token state persists between rounds. Each cross-side tie consumed during a round flips it.

**Summons mid-round.** A summoned sidekick is inserted into the remaining initiative at its Speed using the live token state. If it joins an already-active cross-tie bracket, its side's order within the bracket follows the token-holder rule.

## A unit's turn

When a unit is the active one, its owner gets up to **one move and one action**, and may take them in **either order**:

- **Move** — up to the unit's `move` value of tiles, once per turn.
- **Action** — one of: attack any enemy in range; heal an adjacent ally (heal-tagged units only); or play a card from hand.
- **Pass** — end the turn with no effect (the END TURN button).

After an action, the turn auto-ends only if the unit also moved already, died, or has no reachable tiles. Otherwise the turn stays live and the player can reposition before ending it. This enables hit-and-run tactics: attack first, then back off.

Movement updates facing toward the destination; attacks update facing toward the target. A Mage may attack instead of healing.

## Cards

Each hero suite contributes **6 cards** — 3 Common, 2 Epic, 1 Legendary — themed to their identity. On top of that, every deck includes the universal **10-card Sigil pool**: generic action cards that any unit can cast on its own turn. After the draft, each player's **match deck is 40 cards**: the union of their 5 drafted heroes' suites (5 × 6 = 30) plus the 10 sigils, shuffled. Both players draw from their own deck independently.

### Card economy

- **Starting hand:** 3 cards.
- **Max hand size:** none.
- **Draw timing:** at the end of every turn — yours or the AI's — the active unit's owner draws 1 card from their deck.
- **No aether / no costs.** Cards have no resource gate. A card's price is paid in **opportunity cost**: a card takes the active unit's *action slot* for the turn — the unit may still move before playing it, but cannot also attack or heal that turn.
- **Any unit may cast any card.** The active unit casts; for hero cards, the *owner* (the hero whose suite contributed the card) fires a small **assist** after the main effect resolves. The owner must be alive and on the board for the assist to fire. Range and self-target effects always resolve on the caster, not the owner.
- **Instant effects only.** The card pool has no buffs, counters, or lingering modifiers (no `+ATK this round`, no `shield`, no `vulnerable`). Every effect resolves entirely this turn. The mechanics in play are: direct damage (single / splash / lifesteal), heal, **push** (shove target away from caster, knockback impact damage if blocked), **pull** (drag target toward caster, kb damage if blocked), **push-adj** (AoE push of all enemies adjacent to caster), **dash** (caster teleports to any empty tile within range — ignores blockers), and **swap** (caster swaps places with a target ally).
- **Assist kinds.** Per-card bespoke bonuses: `ownerStep` (owner auto-steps N tiles toward nearest enemy as a free out-of-turn move), `ownerHeal` (owner heals N), `ownerStrike` (owner deals N to its weakest adjacent enemy), `ownerDrain` (owner deals N to its weakest adjacent enemy AND heals N). Sigils have no owner and no assist.
- **Sigils** (`card.hero === "sigil"`, 10 cards shared across every deck) have no owner. Any unit may cast any sigil. **Sigils are FREE — they consume neither the action nor the move slot**, so multiple sigils can chain into a combo turn (sigil + sigil + hero card + move). They lock once the unit has used **both** its move and action — the turn auto-ends when both are spent. To balance, sigil effects are intentionally small (single pushes/pulls, dmg 1–2, dash 1–2, heal 2). They are still **removed from the game** on use — limited supply (10 per deck) is the only meaningful cost.
- **Dash and swap consume movement.** Both are themselves movement actions, so they also burn the caster's move slot in addition to the action slot. Push, pull, push-adj, and all damage/heal cards leave the caster's movement intact.
- **Range.** Damage / push / pull cards target enemies within the *casting unit's* normal attack range. Heal and swap cards reach any of your allies anywhere on the board. Group cards (`heal-all`) don't need a target tile.
- **Design target:** a card should be tuned so that, in the moment, it is the *best play* the active unit could make this turn. The intended loop is: play 1 of your 2 cards → draw 1 → consider the new card next turn → repeat. If most cards are weaker than a normal attack, players will just attack and the system breaks down.

### Card-value baselines

A "normal turn" from a unit moves up to its `move` and deals roughly **1–2 damage** to one enemy (with the relevant arc multiplier on top). Cards must clear that bar. Working baselines:

| Effect shape | Threshold value to feel "worth a turn" |
|---|---|
| Single-target damage | ≥ 3 |
| Single-target heal | ≥ 4 |
| Single-target shield | ≥ 4 |
| Single-target buff (this round) | +2 ATK on a unit that will attack this round |
| Single-target charge (move) | +3 move, or +2 move that enables a kill/flank |
| Area / all-allies effect | ≥ ~2 per affected unit (so ≥ 6 total expected value) |
| Multi-target damage | total damage ≥ 4 across all hit enemies |

Below those thresholds the card is dead weight; well above them it warps the game.

**Categories:**
- **Equipment** — one each of: Weapon, Armor, Helmet, Boots, Artifact.
- **Action** — moves, attacks, and effects performed by a hero.
- **Spell** — a *subtype of action*. Mechanically identical to a non-spell action; distinguished by flavor (and shown with a purple stripe and `SPL` tag in-game).

Every card is a **one-shot consumable** with no resource cost — playing it consumes the active unit's turn. Mechanically a card resolves as one of these **kinds**:

**Design principle (v0.17):** every card causes something to happen *this turn*. There are no pure buff/debuff cards. Many cards carry a primary instant effect plus a lasting secondary effect.

| Kind | Primary (instant) | Secondary (lasting) |
|---|---|---|
| `dmg` | N damage to target enemy | — |
| `dmg-adj` | N damage + S splash to orthogonal adjacent enemies | — |
| `dmg-vuln` | N damage to target enemy | target gains V *vulnerable* (next attack does +V) |
| `dmg-self-buff` | N damage to target enemy | caster +B ATK this round |
| `dmg-self-charge` | N damage to target enemy | caster +M move this turn |
| `dmg-self-heal` | N damage to target enemy | caster heals H HP (lifesteal) |
| `dmg-team-buff` | N damage to target enemy | every ally +B ATK this round |
| `heal` | restore N HP to target ally | — |
| `heal-all` | restore N HP to every ally | — |
| `heal-shield` | restore N HP to target ally | target gains S shield |
| `heal-buff` | restore N HP to target ally | target +B ATK this round |
| `heal-all-buff` | restore N HP to every ally | every ally +B ATK this round |
| `shield` | add N shield to target ally | — |
| `shield-all` | add N shield to every ally | — |
| `charge` | target ally gets +N move this turn | — |

State decay:
- **Shield** persists until consumed.
- **Vulnerable** is consumed by the next attack on the target, and also clears at round start.
- **ATK buffs** clear at round start.
- **Move buffs** clear at end of the buffed unit's turn.

### Pool composition (v0.17)

| Kind | Count |
|---|---|
| dmg | 27 |
| dmg-adj | 18 |
| dmg-vuln | 8 |
| dmg-self-buff | 2 |
| dmg-self-charge | 3 |
| dmg-self-heal | 1 |
| dmg-team-buff | 6 |
| heal | 0 |
| heal-all | 3 |
| heal-shield | 2 |
| heal-buff | 1 |
| heal-all-buff | 2 |
| shield | 2 |
| shield-all | 1 |
| charge | 14 |

Pure healing (`heal`) was previously a category — now zero pure heals exist; every heal-class card carries a secondary effect. The `heal-all` and `shield`/`shield-all` survivors are the cleanest "support" plays.

| Kind | Count | Notes |
|---|---|---|
| `dmg` | 25 | Single-target damage |
| `dmg-adj` | 15 | Target + splash to orthogonal adjacents |
| `charge` | 16 | Mobility |
| `buff-atk` | 11 | Single-target ATK buff |
| `buff-atk-all` | 10 | Group ATK buff |
| `heal` | 5 | Mage / Paladin / Druid / Warlock-drain identity |
| `heal-all` | 4 | Group sustain |
| `shield` | 3 | Only Knight / Mage / Paladin |
| `shield-all` | 1 | Knight's Shield Wall — the only group-shield card in the pool |

### Knight suite (10)

Captain. Big single shield + group heal + compound rally and bash cards.

| # | Slot/Type | Name | Kind | Effect |
|---|---|---|---|---|
| 1 | Weapon | Greatsword | dmg 4 | 4 dmg to enemy |
| 2 | Armor | Plate Mail | shield 5 | +5 shield to ally |
| 3 | Helmet | Iron Helm | dmg 4 | 4 dmg to enemy (heavy headbutt) |
| 4 | Boots | Steel Greaves | charge 3 | Ally +3 move this turn |
| 5 | Artifact | War Banner | heal-all-buff | Heal all allies +2, all allies +1 ATK this round |
| 6 | Action | Cleave | dmg-adj 3 (+1) | 3 dmg + 1 splash to adjacent enemies |
| 7 | Action | Shield Bash | dmg-vuln 4+2 | 4 dmg + mark target vulnerable (+2 next hit) |
| 8 | Action | Rally | heal-all 2 | Heal all allies +2 |
| 9 | Action | Shield Wall | shield-all 3 | +3 shield to all allies (only group shield in pool) |
| 10 | Action · Spell | Battle Cry | dmg-team-buff 3+2 | 3 dmg + all allies +2 ATK this round |

### Ranger suite (10)

Sniper. Mark-and-pierce; mobility.

| # | Slot/Type | Name | Kind | Effect |
|---|---|---|---|---|
| 1 | Weapon | Longbow | dmg 4 | 4 dmg to enemy |
| 2 | Armor | Quiver of Sharps | dmg-adj 3 (+1) | 3 dmg + 1 splash to adjacent enemies |
| 3 | Helmet | Hawk Hood | charge 2 | Ally +2 move this turn |
| 4 | Boots | Swift Boots | charge 4 | Ally +4 move this turn |
| 5 | Artifact | Hunter's Mark | dmg-vuln 3+3 | 3 dmg + mark target vulnerable (+3 next hit) |
| 6 | Action | Quick Shot | dmg 3 | 3 dmg to enemy |
| 7 | Action | Volley | dmg-adj 2 (+1) | 2 dmg + 1 splash to adjacent enemies |
| 8 | Action | Reposition | charge 3 | Ally +3 move this turn |
| 9 | Action · Spell | Piercing Arrow | dmg 5 | 5 dmg to enemy |
| 10 | Action · Spell | Eagle's Eye | dmg-team-buff 2+1 | 2 dmg + all allies +1 ATK this round |

### Mage suite (10) — PYROMANCER REWORK

Arcane/elemental damage caster. No healing — Mage no longer has the heal-tag adjacent-heal action either.

| # | Slot/Type | Name | Kind | Effect |
|---|---|---|---|---|
| 1 | Weapon | Staff | dmg 3 | 3 dmg to enemy |
| 2 | Armor | Robe of Sparks | dmg-adj 2 (+1) | 2 dmg + 1 splash (sparks fly) |
| 3 | Helmet | Crown of Light | dmg 4 | 4 dmg (radiant beam) |
| 4 | Boots | Ember Sandals | charge 2 | Ally +2 move this turn |
| 5 | Artifact | Sunflame Orb | dmg-adj 4 (+2) | 4 dmg + 2 splash (huge AoE) |
| 6 | Action · Spell | Fireball | dmg-adj 3 (+2) | 3 dmg + 2 splash to adjacent enemies |
| 7 | Action · Spell | Frostbolt | dmg-vuln 4+2 | 4 dmg + mark target vulnerable (+2 next hit) |
| 8 | Action · Spell | Lightning Strike | dmg 5 | 5 dmg to enemy |
| 9 | Action · Spell | Arcane Blast | dmg-vuln 3+3 | 3 dmg + mark target vulnerable (+3 next hit) |
| 10 | Action · Spell | Meteor | dmg 6 | 6 dmg to enemy (signature) |

### Paladin suite (10)

Holy fighter. Big shield + compound heals + AoE smiting.

| # | Slot/Type | Name | Kind | Effect |
|---|---|---|---|---|
| 1 | Weapon | Warhammer | dmg 4 | 4 dmg to enemy |
| 2 | Armor | Holy Plate | shield 6 | +6 shield to ally (biggest single shield in pool) |
| 3 | Helmet | Helm of Faith | heal-all-buff | Heal all allies +1, all allies +1 ATK this round |
| 4 | Boots | Sabatons | charge 2 | Ally +2 move this turn |
| 5 | Artifact | Holy Symbol | heal-all 3 | Heal all allies +3 |
| 6 | Action | Lay on Hands | heal-shield 5+3 | Heal ally +5 + add 3 shield to them |
| 7 | Action | Smite Evil | dmg 4 | 4 dmg to enemy |
| 8 | Action · Spell | Divine Wrath | dmg-adj 4 (+1) | 4 dmg + 1 splash to adjacent enemies |
| 9 | Action · Spell | Consecration | dmg-adj 3 (+1) | 3 dmg + 1 splash to adjacent enemies |
| 10 | Action · Spell | Sanctuary | dmg 5 | 5 dmg to enemy |

### Warlock suite (10)

Dark caster. Vulnerability marks + lifesteal + AoE curses.

| # | Slot/Type | Name | Kind | Effect |
|---|---|---|---|---|
| 1 | Weapon | Athame | dmg 3 | 3 dmg to enemy |
| 2 | Armor | Shadow Veil | dmg-adj 2 (+1) | 2 dmg + 1 splash to adjacent enemies |
| 3 | Helmet | Hood of Shadows | charge 2 | Ally +2 move this turn |
| 4 | Boots | Boots of Misdirection | charge 3 | Ally +3 move this turn |
| 5 | Artifact | Cursed Skull | dmg-vuln 3+3 | 3 dmg + mark target vulnerable (+3 next hit) |
| 6 | Action | Hex | dmg 4 | 4 dmg to enemy |
| 7 | Action · Spell | Eldritch Blast | dmg 5 | 5 dmg to enemy |
| 8 | Action · Spell | Pulse of Decay | dmg-adj 3 (+1) | 3 dmg + 1 splash to adjacent enemies |
| 9 | Action · Spell | Drain Soul | dmg-self-heal 3+3 | 3 dmg to enemy + caster heals 3 HP (lifesteal) |
| 10 | Action · Spell | Curse of Weakness | dmg-adj 2 (+2) | 2 dmg + 2 splash to adjacent enemies |

### Druid suite (10)

Nature support. Compound heal+shield, heal+buff; AoE damage.

| # | Slot/Type | Name | Kind | Effect |
|---|---|---|---|---|
| 1 | Weapon | Sickle | dmg-adj 2 (+1) | 2 dmg + 1 splash to adjacent enemies |
| 2 | Armor | Bark Skin | heal-shield 2+2 | Heal ally +2 + 2 shield |
| 3 | Helmet | Antlered Crown | dmg-team-buff 2+1 | 2 dmg + all allies +1 ATK this round |
| 4 | Boots | Mossy Wraps | charge 3 | Ally +3 move this turn |
| 5 | Artifact | Living Wood | heal-all 4 | Heal all allies +4 (biggest group heal) |
| 6 | Action | Thorns | dmg 4 | 4 dmg to enemy |
| 7 | Action · Spell | Regrowth | heal-buff 4+2 | Heal ally +4 + ally +2 ATK this round |
| 8 | Action · Spell | Entangle | dmg-adj 3 (+1) | 3 dmg + 1 splash to adjacent enemies |
| 9 | Action · Spell | Lightning Bolt | dmg 5 | 5 dmg to enemy |
| 10 | Action · Spell | Sunbeam | dmg-adj 3 (+1) | 3 dmg + 1 splash to adjacent enemies |

### Berserker suite (10)

Rage. Compound strikes that pump the caster's ATK/move; team rally on hit.

| # | Slot/Type | Name | Kind | Effect |
|---|---|---|---|---|
| 1 | Weapon | Battle Axe | dmg 5 | 5 dmg to enemy |
| 2 | Armor | Spiked Pauldrons | dmg 4 | 4 dmg to enemy |
| 3 | Helmet | Horned Helm | dmg-self-buff 3+2 | 3 dmg + caster +2 ATK this round |
| 4 | Boots | War Boots | charge 3 | Ally +3 move this turn |
| 5 | Artifact | Bloodthirster | dmg 6 | 6 dmg to enemy |
| 6 | Action | Frenzy | dmg-team-buff 3+2 | 3 dmg + all allies +2 ATK this round |
| 7 | Action | Reckless Charge | dmg-self-charge 3+3 | 3 dmg + caster +3 move this turn |
| 8 | Action | Whirlwind | dmg-adj 3 (+1) | 3 dmg + 1 splash to adjacent enemies |
| 9 | Action | Rend | dmg-adj 4 (+1) | 4 dmg + 1 splash to adjacent enemies |
| 10 | Action · Spell | Battle Trance | dmg-self-buff 4+3 | 4 dmg + caster +3 ATK this round |

### Scout suite (10)

Hit-and-run. Vuln-mark + dash-after-strike + team support.

| # | Slot/Type | Name | Kind | Effect |
|---|---|---|---|---|
| 1 | Weapon | Shortbow | dmg 3 | 3 dmg to enemy |
| 2 | Armor | Studded Cloak | dmg 4 | 4 dmg to enemy |
| 3 | Helmet | Spyglass | dmg-vuln 3+2 | 3 dmg + mark target vulnerable (+2 next hit) |
| 4 | Boots | Cat's Boots | charge 3 | Ally +3 move this turn |
| 5 | Artifact | Trap | dmg-adj 3 (+1) | 3 dmg + 1 splash to adjacent enemies |
| 6 | Action | Snipe | dmg 5 | 5 dmg to enemy |
| 7 | Action | Dash | charge 5 | Ally +5 move this turn |
| 8 | Action | Vanish | dmg-self-charge 3+3 | 3 dmg + caster +3 move this turn |
| 9 | Action | Mark Target | dmg-team-buff 2+1 | 2 dmg + all allies +1 ATK this round |
| 10 | Action · Spell | Shadow Step | charge 4 | Ally +4 move this turn |

### Assassin suite (10)

Spike damage. Heavy vuln-stacking + strike-and-vanish.

| # | Slot/Type | Name | Kind | Effect |
|---|---|---|---|---|
| 1 | Weapon | Dagger | dmg 4 | 4 dmg to enemy |
| 2 | Armor | Razor Leathers | dmg 3 | 3 dmg to enemy |
| 3 | Helmet | Mask | dmg-vuln 4+2 | 4 dmg + mark target vulnerable (+2 next hit) |
| 4 | Boots | Shadow Boots | charge 4 | Ally +4 move this turn |
| 5 | Artifact | Death Mark | dmg-vuln 3+5 | 3 dmg + mark target vulnerable (+5 next hit, biggest in pool) |
| 6 | Action | Backstab | dmg 5 | 5 dmg to enemy |
| 7 | Action | Garrote | dmg-adj 2 (+2) | 2 dmg + 2 splash to adjacent enemies |
| 8 | Action | Smoke Bomb | dmg-team-buff 2+1 | 2 dmg + all allies +1 ATK this round |
| 9 | Action · Spell | Shadow Strike | dmg 7 | 7 dmg to enemy (biggest single hit in pool) |
| 10 | Action · Spell | Veil | dmg-self-charge 3+5 | 3 dmg + caster +5 move this turn (strike-and-vanish) |

## HP & dice tracking

**Rule:** every unit's max HP equals the face count of a classic polyhedral die — one of `{4, 6, 8, 10, 12, 20}`. New unit classes must pick from this set.

For tabletop play, place the matching die next to each minifig showing its current HP; rotate it down as damage is taken; the unit dies when the die would go below 1.

| Die | Heroes |
|---|---|
| d4  | Scout |
| d6  | Mage, Assassin, Warlock, Necromancer |
| d8  | Ranger, Berserker, Druid |
| d10 | Knight, Paladin, Crusader |
| d12 | Sentinel |
| d20 | *(reserved for future heavyweights)* |

Healing rotates the die back up (capped at max).

## Combat

- **Facing**: each unit has a cardinal facing. Moving or attacking re-faces toward the destination/target.
- **Arc multipliers**: front ×1, side ×1.5, rear ×2. Assassin (flank tag): side ×2, rear ×2.5.
- **High ground**: attacker on `terrain="high"` gets +1 ATK before the arc multiplier.
- **Damage**: `round((ATK + highground) × arc)`. Shield absorbs before HP.
- **Range**: Manhattan distance. No line-of-sight blocking currently.

## Win condition

A side loses when all three of its heroes are at 0 HP.

## AI sketch

For each AI-owned unit on its turn:

1. Score the best possible card play *with* this unit's turn (heal a wounded hero, bolt a hero or finishable target, deploy a sidekick, place terrain).
2. Score the unit's best normal action (best attack arc-adjusted damage; small baseline for "advance toward enemy").
3. Choose whichever scores higher. If acting normally, Mage heals first if adjacent ally is wounded, then attacks/advances.
4. Targets prefer heroes, low-HP enemies, and finishing blows.

---

## Open questions / next up

- **Hero variety**: only one hero set right now (V/W/A) shared by both sides. Drafting or asymmetric rosters would add identity.
- **Speed counter-play**: nothing currently modifies Speed mid-match. Haste / Slow effects, initiative-swap spells, or wait-actions (delay your slot) would deepen the layer. A card that steals or pre-spends the Initiative token would also be interesting.
- **Card play during enemy turns**: currently disallowed (instant/reaction cards would be a separate system).
- **Items vs spells**: currently mechanically identical (one-shot). If equippable items return, need card category, slot model, and removal rules.
- **More spells**: Smoke (skip a unit's next turn), Charge (+ATK this turn), Knockback, AoE — design space is wide open.
- **Line of sight / cover**: Ranger is currently unblocked, which lets it sit in the back row safely.
- **Win-condition variants**: "kill any 2" as a faster mode; objective tiles as an alternative axis.
- **Mobile UX**: initiative ribbon may need horizontal scroll affordance; consider tap-and-hold for card details.
