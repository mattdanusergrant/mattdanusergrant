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
  **2 random packs (distinct sets)**; each is a single info tile (title, blurb, your set progress,
  "5 cards") — **tap the one you want to open it** (no flip, no separate button).
- **Booster packs.** A pack contains **5 cards from its set** (sets with fewer than 5 unique cards
  fill the rest with repeats — which just feed sparks/levels), and each slot has a low (~1-in-12)
  chance to be **foil** — so an all-foil pack is possible but insanely rare. Foil cards wear a holo
  **✦ Foil** pill in the card's bottom-right corner. Opening a pack plays as a **vertical
  scroll-feed** (one card per screen, tap to flip, swipe up). The two
  choice buttons get random flavor labels each time (Rip This/Rip That, Rip Left/Rip Right, …).
- **Infinite ripping.** The feed ends on a **"Rip another pack?"** slot: if you still hold tokens,
  **keep scrolling past it** and you drop straight into the normal **1-of-2 pack pick** for your
  next pull — choose one, rip it, land on a fresh feed, repeat — so you can chain packs without
  returning to the binder. You snap onto that slot first (with a bobbing ⌄ and an **I'm done**
  button) so continuing is always a deliberate extra scroll, never a surprise, and no token is
  spent until you actually pick. When your tokens run out the slot becomes the final **Done** summary.
- **Affordance cues (subtle).** The forward page arrow gently pulses whenever another page can be
  turned, and a small bobbing **⌄** appears at the bottom of any vertical feed while another card
  sits below the fold — both honour `prefers-reduced-motion`.
- **Onboarding (first run).** New players get a short **wonder-first** intro: a curated starter
  card to flip and read, then a one-screen rules explainer, then a **guided first pack** — so you
  land on a binder that already has cards (the starter gift + your first 3), not an empty grid.
  Skippable; runs once (`S.onboarded`), and existing players never see it.
- **New player** starts with **0 packs and 3 Pack Tokens** (plus the starter card gift).
- **Daily token.** You get **+1 token each day** (up to 7 accrue if you're away). Old saves migrate:
  any unopened packs convert 1:1 into tokens.
- **Sparks (dupe pity).** Every duplicate pulled melts into a **✧ spark = 1/100 Pack Token**;
  at 100 sparks a token is granted automatically (foil-upgrades on owned cards count too).
- **Cards are swipeable flip-books.** Every card is: a **front cover** → **inner pages** (the
  magazine article, one paragraph per page — starts at 1 and grows as you collect duplicates) → a
  **back cover**. **Swipe/tap right to page forward, left to page back** (arrow keys too); the card
  physically flips around on each turn via a two-face alternating buffer, so it can hold any number
  of pages. In the feeds, **up/down changes cards, left/right changes page**. A dot indicator shows
  your position, with ghost dots for inner pages still locked and the back-cover dot always lit.
- **The back cover is the link hub.** Front and back covers are always present; only the inner
  article pages are dupe-gated. The back cover holds the maker's **Visit ↗** link (maker cards) and
  a **"Connects to"** list of related cards: a card you **own** links straight to it; one you
  **don't** shows **"???"** and tapping it drops you into **pack opening** to go hunt it. The graph
  lives in the `LINKS` map (`id → [related ids]`) near the `CARDS` array; a card may also carry its
  own `links:[...]`, which wins. Grown over time like the feed.
- **Depth levels = unlocked inner pages.** A duplicate **unlocks the next inner page** — copy 2
  reveals article page 2, copy 3 page 3, …. **Level = copies owned**, capped at the number of
  article paragraphs (front/back covers don't need copies). The binder mini still shows `Lv N`.
- **No scrolling on cards, ever.** Each page auto-fits its face: a `--ps` scale is stepped down (by
  `fitFace`) until the page fits without a scrollbar, on every page and card size.
- **The binder IS the landing page.** There are no separate views: you land on your collection
  (series tabs → set tabs → the card grid), with a gold **✦ Open a pack** button in the header
  opposite the "Your Binder" title (token count included; wraps under the title on phones). Owned
  cards show their art, unowned show a locked slot, foils get a holo star. Tap a card to read it
  and flip for the back.
- **Scroll Mode.** A **↕ Scroll Mode** button in the header opens an endless full-screen feed of
  the cards you own — one random card per screen (vertical scroll-snap, TikTok-style), tap to flip,
  swipe for the next. A shuffle-bag cycles through your whole collection before repeating; the feed
  appends forever and prunes offscreen cards to stay light. Shown only once you own a card.
- **Two themes** (dark / light), remembered; otherwise follows the device.

## Series → Sets

The collection is organized in two levels: a **Series** groups **Sets**, and every card belongs to
one set (derived from its `cat` via the `CAT_SET` map in the script). **A set holds exactly 18
cards** — in the binder it displays as **two 3×3 pages side by side**, like an open card binder.

- **Makers Series** — sets full of real makers, each card linking back to them with a verified
  **Visit ↗** button: `Makers of Hawaii` · `Makers of Thailand` (Makers of Japan, Italy, etc. can
  follow).
- **Science Series** — `Time` · `Materials`
- **Technology Series** — `Navigation` · `Signals`
- **Nature Series** — `Life` · `Earth`
- **Cosmos Series** — `Cosmos`
- **History Series** — `Civilization`

Every booster tile shows the **Series** as an eyebrow (e.g. "Makers Series") above the **Set**
title, so both levels read at a glance. The title uses the set's short label (a `Makers of X` set
shows just "X" under the "Makers Series" eyebrow), so a pack name never wraps. New sets launch into
an existing series (or open a new one) over time, like TCG blocks.

## Growing the collection

Cards live in the `CARDS` array near the bottom of `index.html`. Add a card = add one object; its
set is derived from `cat`. Each card:

```js
{
  id:"kamaka", cat:"ʻUkulele", where:"Honolulu · since 1916", accent:"#b5732f", motif:"strings",
  title:"Kamaka Hawaii",
  hook:"one flavor line (the cover teaser)",
  article:[                          // REQUIRED — a mini-magazine article, one paragraph per page
    "Paragraph 1 — opens with a hook.",
    "Paragraph 2 — develops it.",
    "Paragraph 3 — goes deeper.",
    "Paragraph 4 — lands a resonant conclusion."
  ],
  links:["koaloha","kanilea"],       // OPTIONAL back-cover "Connects to" cards (or add to the LINKS map)
  url:"https://kamakahawaii.com/", link:"Visit Kamaka"   // maker cards only; must be real & live
}
```

**Card = front cover → article pages → back cover.** Each card is: a **front cover** (art + title +
hook), then **one `article` paragraph per page** (page 1 is a headline + drop-cap lede, unlocked by
duplicates), then a **back cover** — the link hub carrying the maker's **Visit ↗** link and the
`links` "Connects to" cards (owned → direct link, unowned → **???** → pack opening). Card-to-card
links come from either the card's own `links:[...]` or the central `LINKS` map, keyed by id.
Copies owned unlock the pages one at a time (level = copies).

Rules for `article`: **4 paragraphs** is the house standard; each must be **self-contained** (a
complete thought ending on a satisfying beat or a hook to the next) and **≤ ~440 characters** so it
fits one card at full size with no shrink. Facts must be accurate; maker cards keep only real,
sourced details and a live `url`. If you add a new `cat`, map it in `CAT_SET`. Motifs:
`scroll · wave · grain · facet · strings · orbit · grid · pulse`.

*(Legacy `back` + `facts` fields still render as a fallback if a card has no `article`, but new
cards should use `article`.)*

**Filling every set to 18** (currently: Makers of Hawaii 17, Makers of Thailand 10, Materials 8, Time 7, Signals 7,
Navigation 6, Life 5, Earth 4, Cosmos 3, Civilization 8 = 75; Makers of Hawaii is 1 short of full) is an ongoing
content effort, done in batches via the `/add-card` skill.
