# Site QA tooling

## `qa-cards.cjs` — homepage card overflow check

The homepage (`index.html`) lays out its four shelves as fixed-height `.tile`
cards: every card is the same height, with no in-card scrolling. That layout can
break in two ways when copy is edited:

- a description grows too long and gets **clipped**, or
- the content pushes the **CTA button past the card's edge**.

Whether it breaks is sensitive to **font metrics** (the site uses Fraunces for
titles + Inter for body — both render taller than fallback fonts) and to
**column width** (narrower columns wrap titles to more lines). A naive headless
check measures with fallback fonts and misses real overflow.

This script renders with the **real fonts** (bundled offline, see below) and
sweeps 13 viewport widths from 360→1440px. It flags any tile whose content
overflows the card, whose button escapes the card, or whose description text is
clipped.

```sh
node tools/qa-cards.cjs                 # checks ./index.html
node tools/qa-cards.cjs https://mattdanusergrant.com/   # or a live URL
```

Exit 0 = all cards fit at every width. Exit 1 = overflow(s), listed with the
width, card, and reason. Run it after editing any card title/description, or any
`.tile` CSS, before pushing (a push to `main` deploys live).

Belt-and-suspenders: `.tile p` also uses `flex:1 1 0; min-height:0;
overflow:hidden`, so even if an edge case slips past QA the button can never be
pushed out of the card — worst case a description loses its last line, which QA
is designed to catch.

### `qa-fonts/`

`fonts.local.css` is the site's Google Fonts CSS with the woff2 files inlined as
base64 `data:` URIs, so QA renders production-accurate metrics with no network
at test time. It's generated — regenerate it if the site's font stack changes:

```sh
tools/qa-fonts/refresh.sh
```
