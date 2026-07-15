# Makers Deserve Glory

**A no-ads micro-learning feed of real makers — and how they make things.** You land on a
*random* maker, read a bite-sized card (what they make, how it's made, why it's interesting),
and scroll for another random maker. Endless. Every card links **straight back to the maker**.

Not a magazine with issues — a **collection of one-maker artifacts that grows over time**.

Live: **https://mattdanusergrant.com/makersdeserveglory/**

## How it works

A single self-contained page — `index.html`, no build step, no dependencies, no tracking, no
ads. It's a root folder in the `mattdanusergrant` repo, so the apex Pages project serves it at
`mattdanusergrant.com/makersdeserveglory/`.

- **Random infinite feed.** On load, the collection is shuffled (Fisher–Yates) and one card is
  shown; scrolling appends the next from a no-repeat "bag." When the bag empties it reshuffles,
  so you keep getting makers you haven't seen. **Shuffle** restarts with a fresh random order.
- **One maker per card** — the maker is the headline. Kicker (craft · place), the hook, a
  generative motif, a short "How it's made" list, and a **Visit ↗** button to their own site.
- **Two themes** — deep "jewel box" dark and "cool shell" light; the Theme button toggles and
  remembers, otherwise it follows the device.
- **No images to manage** — each card's plate is a generative CSS-gradient + inline-SVG motif
  tinted to that maker's material (`"scroll" | "wave" | "grain" | "facet" | "strings"`).
- **Type** — Fraunces (display) + Newsreader (body) + Archivo (labels), Google Fonts with
  Iowan/Palatino/Georgia fallbacks so it reads well offline too.

## Growing the collection

Everything is the `MAKERS` array near the bottom of `index.html`. Add a maker = add one object:

```js
{
  id:"pyzel",                         // unique slug
  maker:"Pyzel Surfboards",           // the headline — the maker is the star
  kicker:"Surfboards",                // the craft (shown in the eyebrow)
  where:"Waialua, North Shore",       // place / founded
  url:"https://pyzelsurfboards.com/", // THE LINK BACK — must be real, live, and theirs
  accent:"#2f8f9d",                   // material tint
  motif:"wave",                       // scroll | wave | grain | facet | strings
  hook:"The North Shore shaper behind John John Florence's world-title boards.",
  how:[                               // 3–4 bite-sized "how it's made" lines (this is the learning)
    "Jon Pyzel started in a backyard shaping bay in the mid-'90s.",
    "A board is carved from a foam blank with a wood stringer, then glassed in fiberglass and resin.",
    "The boards get tested on the heaviest waves on earth, minutes from the bay."
  ]
}
```

**The one rule: `url` must be a real, live, official link to that maker.** Linking back to real
makers is the entire point — verify it (a 2xx that's actually theirs) before you add it. Keep
`how` short — it's micro-learning, not an essay. Hedge origin stories the way the tradition tells
them, and for culturally protected crafts (e.g. Niʻihau) credit the community, not just a shop.

Adding makers is automated by the **`/add-maker` skill** (`ConductiveOS/.claude/skills/add-maker/`),
which researches a maker, verifies the link, writes the card, checks it renders, and opens a PR.
Candidate makers/crafts to research next live in the editorial plan's queue.
