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
  issue:1,               // which issue this story belongs to (see ISSUES at top of script)
  folio:"04",            // the position number shown in that issue's contents
  accent:"#b07d3f",      // this story's material tint (hero glow, rules, drop cap, steps)
  motif:"grain",         // plate art: "scroll" | "wave" | "grain" | "facet" | "strings"
  readMin:5,             // shown as "5 min read"
  kicker:"From the Forest",
  hero:true,             // OPTIONAL — marks THIS ISSUE's cover story (one per issue)
  title:"Rings from the Canoe Tree",
  dek:"One-line standfirst under the headline.",
  byline:["The Editors","Hilo"],
  makers:[               // THE POINT — real makers, each linked back to
    {name:"Pono Woodworks", what:"Koa rings from dead or fallen trees.", url:"https://ponowoodworks.com/"}
  ],
  spec:{ label:"Materials", rows:[ ["Wood","Koa (Acacia koa)"], ... ] },
  blocks:[ ...the article body, in order... ]
}
```

**Makers are the point of this magazine.** The `makers` array renders a linked "The Makers"
block at the foot of every story, and every maker across every issue is collected on the
**`/#/makers` directory** (the "Makers" button in the top bar). Rules: name only *real* makers,
link a *real, current* homepage, and keep the `what` to one honest line. Verify a URL before
you ship it — a dead link is the one thing this magazine can't afford.

The `blocks` array is the article body, rendered top to bottom. Block types:

| Block | Shape | Renders as |
|---|---|---|
| Paragraph | `["p","text… (inline HTML allowed)"]` | body text; the first one gets a drop cap |
| Subhead | `["h2","Section title"]` | a section heading |
| Pull quote | `["pull","A line worth pulling out."]` | large italic quote with an accent rule |
| Process | `["steps",{label:"How it's made",items:[["Step name","what happens"], …]}]` | the numbered how-it's-made sequence |
| Aside | `["note","Label",[["p","aside text"]]]` | a bordered note box |

Article order on the cover follows the array order.

## Issues

The magazine holds many issues at once. The `ISSUES` array at the top of the script lists them:

```js
var ISSUES = [
  { n:1, no:"Nº 1", theme:"Hawaiian Jewelry", season:"Summer 2026" },
  { n:2, no:"Nº 2", theme:"The ʻUkulele",     season:"Fall 2026"   }
];
```

The cover opens on the **latest** issue; a tab row lets readers flip to any past issue
(`/#/issue/1`, `/#/issue/2`, …). To publish the next issue:

1. Add a row to `ISSUES` (e.g. `{ n:3, no:"Nº 3", theme:"Coffee", season:"Winter 2026" }`).
2. Add that issue's stories to `ARTICLES` with `issue:3` and a `hero:true` cover story.
   Nothing else moves — old issues stay live and browsable.

Live now: **Issue Nº 1 — Hawaiian Jewelry** (5 stories) · **Issue Nº 2 — The ʻUkulele** (2 stories).

## Notes

- **Accuracy.** The articles are written from the well-documented public history and craft of
  each subject, in plain explainer voice. Origin stories (e.g. the heirloom bracelet) are told
  the way the tradition tells them and hedged as such.
- **Renaming.** The name appears in the masthead, the top bar, the page footer, and the
  `<title>`/social tags in `<head>`. If the folder slug changes, add a `_redirects` line so
  the old path 301s to the new one (Cloudflare Pages matches by path).
