# Micro Discovery Guide

**A no-ads micro-learning feed about how the world works.** You land on a *random* card, read a
bite-sized nugget — how something works, how it's made, or who makes it — and scroll for another
random card. Endless. Cards about real makers link **straight back to the maker**, and most cards
carry a **"connects to →"** thread hinting at how ideas link up.

A **collection that grows over time** — from atomic clocks to koa ʻukulele to Roman concrete.

Live: **https://mattdanusergrant.com/microdiscoveryguide/**

> Name: **Micro Discovery Guide** (Micro · Discovery · Guide) is an M·D·G name in the vault ledger.
> The app was *Makers Dissect Gadgets* → *Makers Deserve Glory* earlier; both old paths 301 here via
> the repo-root `_redirects`.

## How it works

A single self-contained page — `index.html`, no build step, no dependencies, no tracking, no
ads. It's a root folder in the `mattdanusergrant` repo, so the apex Pages project serves it at
`mattdanusergrant.com/microdiscoveryguide/`.

- **Random infinite feed.** On load the collection is shuffled (Fisher–Yates); scrolling appends
  the next card from a no-repeat "bag," topping up so you're always ~2 screens ahead. When the bag
  empties it reshuffles. **Shuffle** restarts with a fresh order.
- **Each card is a collectible you flip.** Tap (or Enter/Space) to flip the card in 3-D. The
  **front** is the card face — category, collection number (`Nº 03 / 65`), generative art, title,
  and a one-line flavor hook. The **back** holds the real story: a paragraph of prose (`back`), the
  key points (`facts`), the **connects-to** thread, and — for makers — a **Visit ↗** link.
- **Sets.** Every card belongs to a named **Series** (Hawaiʻi, Time, Navigation, Materials,
  Signals, Cosmos, Life & Medicine, Earth & Elements, Civilization) and shows a per-set collector
  number (`HAWAIʻI · 03 / 17`). The set is derived from the card's `cat` via the `CAT_SERIES` map in
  the script — **add a new category to that map** so new cards land in a set.
- **Foil tier (cosmetic).** When a card is dealt it has ~a 1-in-6 chance to come up **foil** — a
  holographic rainbow frame, a shifting sheen, and a "✦ Foil" chip. Same card, random pull, re-rolled
  on Shuffle. Reduced-motion disables the shimmer.
- **Random infinite deck.** The order is shuffled; scrolling deals the next card.
- **Two themes** (dark "jewel box" / light "cool shell"), remembered; otherwise follows the device.
- **No images** — each plate is a generative CSS-gradient + inline-SVG motif
  (`scroll · wave · grain · facet · strings · orbit · grid · pulse`) tinted per card.

## Growing the collection

Everything is the `CARDS` array near the bottom of `index.html`. Add a card = add one object.

**A "how it works" card** (a concept — no link required):
```js
{
  id:"atomic-clocks",           // unique slug
  cat:"Time",                   // category (shown in the eyebrow)
  where:"1700s",                // OPTIONAL era/place
  accent:"#2f8f9d",             // tint
  motif:"pulse",                // scroll|wave|grain|facet|strings|orbit|grid|pulse
  title:"Atomic Clocks",        // FRONT: the headline (the concept)
  hook:"The most precise machines ever built keep time by counting an atom's buzz.", // FRONT: flavor line
  back:"An atomic clock keeps time with the rock-steady rhythm of an atom … (2–4 sentence chunk).", // BACK: the story
  facts:[ "…", "…", "…" ],      // BACK: 3–4 bite-sized key points
  connects:"Atomic clocks → GPS → the internet"   // BACK: OPTIONAL "→" thread
}
```

**A "how it's made" / maker card** adds a verified link back (shown on the back):
```js
{
  id:"kamaka", cat:"ʻUkulele", where:"Honolulu · since 1916", accent:"#b5732f", motif:"strings",
  title:"Kamaka Hawaii", lead:"How it’s made",
  url:"https://kamakahawaii.com/", link:"Visit Kamaka",   // url = the link back; must be real & live
  hook:"…", back:"… the maker's story …", facts:[ "…", "…", "…" ]
}
```

Every card needs a **`back`** — the "nice chunk of text" the flip reveals (a real 2–4 sentence
paragraph, not just the facts restated).

Rules:
- **Facts must be accurate.** These are real science/history/craft. Hedge origin stories the way the
  tradition tells them; when unsure of a specific, cut it.
- **`url` (maker cards) must be a real, live, official link** to that maker — verify a 2xx that's
  actually theirs before adding. Concept cards usually carry no link (the card is the learning).
- **Keep it bite-sized** — 3–4 short facts. It's micro-learning, not an essay.
- For culturally protected crafts (e.g. Niʻihau), credit the community, not just a shop.

The **`/add-card` skill** (`ConductiveOS/.claude/skills/add-card/`) automates this: research a
concept or a maker, verify any link, write the card, check it renders, and open a PR. Candidate
topics/makers to add next live in the editorial plan's queue.
