# Micro Discovery Gacha

**A no-ads collectible card game about how the world works.** Spend a **Pack Token** every day,
pull knowledge cards from sets like **Makers of Hawaii**, **Time**, and **Cosmos**, chase rare
**foils**, and fill your **binder**. Each card teaches one thing — how it works, how it's made, or
who makes it — and flips over for the full story (maker cards link straight back to the maker).

Live: **https://mattdanusergrant.com/microdiscoverygacha/**

## The game loop

A single self-contained page — `index.html`, no build step, no backend, no ads. Progress is saved
in the browser (`localStorage`, key `mdg-collection-v1`).

- **Pack Tokens.** Packs aren't owned directly — you hold **tokens**. Spending a token deals you
  **3 random packs (distinct sets)** and you **pick 1** to rip open.
- **Booster packs.** A pack contains **3 random cards from its set**, and each slot has a low
  (~1-in-12) chance to be **foil** — so an all-foil pack is possible but insanely rare. Foil cards
  wear a holo **✦ Foil** pill in the card's bottom-right corner.
- **New player** starts with **0 packs and 3 Pack Tokens**.
- **Daily token.** You get **+1 token each day** (up to 7 accrue if you're away). Old saves migrate:
  any unopened packs convert 1:1 into tokens.
- **The binder IS the landing page.** There are no separate views: you land on your collection
  (series tabs → set tabs → the card grid), and a small floating gold **✦ Open a pack** button
  (bottom-right, with your token count) is always in reach. Owned cards show their art, unowned
  show a locked slot, foils get a holo star. Tap a card to read it and flip for the back.
- **Two themes** (dark / light), remembered; otherwise follows the device.

## Series → Sets

The collection is organized in two levels: a **Series** groups **Sets**, and every card belongs to
one set (derived from its `cat` via the `CAT_SET` map in the script). **Target: 20 cards per set**
(the binder shows progress toward 20; sets fill over time).

- **Makers Series** — sets full of real makers, each card linking back to them with a verified
  **Visit ↗** button: `Makers of Hawaii` · `Makers of Thailand` (Makers of Japan, Italy, etc. can
  follow).
- **Encyclopedia Series** — how-the-world-works concept sets: `Time` · `Navigation` · `Materials` ·
  `Signals` · `Cosmos` · `Life & Medicine` · `Earth & Elements` · `Civilization`.

## Growing the collection

Cards live in the `CARDS` array near the bottom of `index.html`. Add a card = add one object; its
set is derived from `cat`. Each card:

```js
{
  id:"kamaka", cat:"ʻUkulele", where:"Honolulu · since 1916", accent:"#b5732f", motif:"strings",
  title:"Kamaka Hawaii",
  hook:"one flavor line (front)",
  back:"a real 2–4 sentence paragraph (the back — REQUIRED)",
  facts:[ "…", "…", "…" ],           // key points (back)
  connects:"A → B → C",              // OPTIONAL thread (back)
  url:"https://kamakahawaii.com/", link:"Visit Kamaka"   // maker cards only; must be real & live
}
```

Rules: accurate facts, a real live `url` for maker cards, keep it bite-sized. If you add a new
`cat`, map it in `CAT_SET` so the card lands in a set. Motifs:
`scroll · wave · grain · facet · strings · orbit · grid · pulse`.

**Filling every set to 20** (currently: Makers of Hawaii 17, Makers of Thailand 10, Materials 8, Time 7, Signals 7,
Navigation 6, Life & Medicine 5, Earth & Elements 4, Cosmos 3, Civilization 8 = 75) is an ongoing
content effort, done in batches via the `/add-card` skill.
