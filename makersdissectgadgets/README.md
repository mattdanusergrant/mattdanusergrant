# Makers Dissect Gadgets

**A no-ads digital magazine where makers take things apart to show how they're made.** Built
for a friend who wanted the *How It's Made* idea — the craft, the materials, the steps — but as
something you **read** instead of watch. The magazine is deliberately general; each **issue**
takes on one world.

- **Issue Nº 1 — Hawaiian Jewelry:** gold heirloom bracelets, Niʻihau shell lei, black coral,
  koa wood rings, and the sunrise shell.

Live once merged to `main`: **https://mattdanusergrant.com/makersdissectgadgets/**

> Name note: "Makers Dissect Gadgets" is an M·D·G name (like the rest of the family). It's in
> the claims ledger in `ConductiveOS/06_system/settings.md`. Registering it freed the G-word
> "Gadgets" from the homepage Tools section, which was renamed **Methodically Devised Gizmos**
> (trading its former "Gizmos" rotation phrase to "Gears" to keep the no-repeat rule intact).
> Heads-up: the site's *More Games* button still cycles playful microcopy that includes "More
> Decent Gadgets" — a rotating word-toy, not a ledger label, so it's left as-is.

## What it is

A single self-contained page — `index.html`, no build step, no dependencies, no tracking,
no ads. It works on Cloudflare Pages, opens straight off disk (`file://`), and can be saved
for offline reading. It's a root folder in the `mattdanusergrant` repo, so the apex Pages
project serves it at `mattdanusergrant.com/makersdissectgadgets/` automatically — no config,
no separate subdomain or Pages project needed.

- **Reader as an app** — a cover with a contents index, then hash-routed article pages
  (`#/heirloom`, `#/niihau`, …), a reading-progress bar, and prev/next navigation.
- **Two themes** — a deep-water "jewel box" dark theme and a "cool shell" light theme; a
  Theme button toggles and remembers the choice, otherwise it follows the device setting.
- **No images to manage** — every article "plate" is a generative CSS gradient + inline SVG
  line-motif tinted to that article's material (gold, coral, jet, koa amber, sunrise). This
  keeps the page tiny, fast, and free of any photo licensing.
- **Type** — Fraunces (display) + Newsreader (body) + Archivo (labels) from Google Fonts,
  with Iowan Old Style / Palatino / Georgia fallbacks so it still reads well offline.

## Editing the magazine

Everything lives in one place: the `ARTICLES` array near the bottom of `index.html`. To add
or change a story, edit that data — you don't touch the layout or CSS.

Each article is an object:

```js
{
  id:"koa",              // URL slug → #/koa  (keep it unique)
  folio:"04",            // the position number shown in the contents
  accent:"#b07d3f",      // this story's material tint (hero glow, rules, drop cap, steps)
  motif:"grain",         // plate art: "scroll" | "wave" | "grain" | "facet"
  readMin:5,             // shown as "5 min read"
  kicker:"From the Forest",
  hero:true,             // OPTIONAL — marks the cover story (set on exactly one article)
  title:"Rings from the Canoe Tree",
  dek:"One-line standfirst under the headline.",
  byline:["The Editors","Hilo"],
  spec:{ label:"Materials", rows:[ ["Wood","Koa (Acacia koa)"], ... ] },
  blocks:[ ...the article body, in order... ]
}
```

The `blocks` array is the article body, rendered top to bottom. Block types:

| Block | Shape | Renders as |
|---|---|---|
| Paragraph | `["p","text… (inline HTML allowed)"]` | body text; the first one gets a drop cap |
| Subhead | `["h2","Section title"]` | a section heading |
| Pull quote | `["pull","A line worth pulling out."]` | large italic quote with an accent rule |
| Process | `["steps",{label:"How it's made",items:[["Step name","what happens"], …]}]` | the numbered how-it's-made sequence |
| Aside | `["note","Label",[["p","aside text"]]]` | a bordered note box |

Article order on the cover follows the array order.

## Starting a new issue

Each issue is a new set of stories on a new subject (not just jewelry — anything makers build).
To publish the next issue:

1. Bump `ISSUE = { no, season, theme }` at the top of the script — e.g.
   `{ no:"Nº 2", season:"Fall 2026", theme:"Coffee" }`. The `theme` shows on the cover
   ("Issue Nº 2 · Coffee").
2. Replace the `ARTICLES` array with the new issue's stories (archive the old ones however
   you like — e.g. keep past issues in their own files later if this grows).

## Notes

- **Accuracy.** The articles are written from the well-documented public history and craft of
  each subject, in plain explainer voice. Origin stories (e.g. the heirloom bracelet) are told
  the way the tradition tells them and hedged as such.
- **Renaming.** The name appears in the masthead, the top bar, the page footer, and the
  `<title>`/social tags in `<head>`. If the folder slug changes, add a `_redirects` line so
  the old path 301s to the new one (Cloudflare Pages matches by path).
