# Makers Deserve Glory

**A no-ads micro-learning feed about how the world works.** You land on a *random* card, read a
bite-sized nugget — how something works, how it's made, or who makes it — and scroll for another
random card. Endless. Cards about real makers link **straight back to the maker**, and most cards
carry a **"connects to →"** thread hinting at how ideas link up.

A **collection that grows over time** — from atomic clocks to koa ʻukulele to Roman concrete.

Live: **https://mattdanusergrant.com/makersdeserveglory/**

## How it works

A single self-contained page — `index.html`, no build step, no dependencies, no tracking, no
ads. It's a root folder in the `mattdanusergrant` repo, so the apex Pages project serves it at
`mattdanusergrant.com/makersdeserveglory/`.

- **Random infinite feed.** On load the collection is shuffled (Fisher–Yates); scrolling appends
  the next card from a no-repeat "bag," topping up so you're always ~2 screens ahead. When the bag
  empties it reshuffles. **Shuffle** restarts with a fresh order.
- **One idea per card** — an eyebrow (category · place/era), the title, a hook, a generative motif,
  a short list of facts, an optional **connects-to** thread, and — for makers — a **Visit ↗** link.
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
  title:"Atomic Clocks",        // the headline (the concept)
  hook:"The most precise machines ever built keep time by counting an atom's buzz.",
  facts:[ "…", "…", "…" ],      // 3–4 bite-sized lines (this is the learning)
  connects:"Atomic clocks → GPS → the internet"   // OPTIONAL "→" thread
}
```

**A "how it's made" / maker card** adds a verified link back:
```js
{
  id:"kamaka", cat:"ʻUkulele", where:"Honolulu · since 1916", accent:"#b5732f", motif:"strings",
  title:"Kamaka Hawaii", lead:"How it’s made",
  url:"https://kamakahawaii.com/", link:"Visit Kamaka",   // url = the link back; must be real & live
  hook:"…", facts:[ "…", "…", "…" ]
}
```

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
