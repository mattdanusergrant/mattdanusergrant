# Improvement Plan — mattdanusergrant

> Generated 2026-07-02 from a full 12-repo portfolio audit (Claude Code session).
> Companion career report: ConductiveOS vault, `09_personal/2026-07-02-life-audit-and-career-plan.md`.

**What this is:** Hand-built static portfolio site (live at mattdanusergrant.com via GitHub Pages) that packages Matt's 17+ years of AAA mobile game design plus his new AI-native full-stack work into a designed brand: playable games, apps, tools, a print-perfect resume, consulting funnel, and (hidden) case studies.

**Stack:** Vanilla JavaScript (no framework, no build step), HTML5 / CSS3 with custom design system (CSS variables, light/dark theming), Canvas 2D generative art (Barnsley fern IFS, Lorenz attractor, Fourier epicycles, Conway's Game of Life), Web Audio API synthesis (ES modules, TR-808-style DSP), GitHub Pages + custom domain (CNAME), Buttondown (newsletter embed), Print CSS / PDF generation via window.print() · **Maturity:** shipped-live · **Live:** https://mattdanusergrant.com
**Size:** ~33k lines total; ~5k hand-authored site HTML/CSS/JS + ~26k vendored stable game builds (games/keeprippingpacks alone is 9.2k lines)

## What's genuinely good here

- Coherent, genuinely tasteful design system (Fraunces/Inter, cream-and-ink palette, dark mode with sunrise/sunset transition FX) applied consistently across all 10+ pages — reads as a designed product, not a template
- The index.html intro is a standout: an interactive MDG glitch-text puzzle backed by six real math sketches, ending with a Conway's Game of Life that dissolves into a persistent living page background — with real accessibility care (prefers-reduced-motion fallback, Escape/Enter keyboard paths, sessionStorage skip, throttled ~11fps background)
- resume.html is print-engineered (@media print page-break control, orphans/widows, ATS-clean output) with a one-click Save-as-PDF button — plus a public resume-builder.html tool spun off from it
- Two genuinely strong case studies already written: case-studies/living-atlas-fantasy-rpg.html (anonymized AAA licensing-pitch design test) and case-studies/building-with-ai.html (the career-pivot narrative) — excellent hiring-manager material
- make-dope-grooves/synth.js is clean, commented ES-module Web Audio DSP (sine+noise+envelope drum synthesis, note-to-frequency math) — real code, not copy-paste
- 8 playable games shipped as stable builds plus 'Experimental' links to bleeding-edge monorepo versions — a smart stable/canary split
- tool.html frames toolbox apps in the site shell with a whitelisted ?app param (no open-redirect/iframe injection)
- Active, disciplined commit history: 51 commits in ~2 weeks (Jun 19–Jul 1), small surgical commits with clear '[Avatar]: description' messages
- Working lead-gen funnel: consulting page with a two-column AI + game design offer, receipts section, and a Buttondown newsletter with a skills lead magnet


## Issues found

- The two best career artifacts are invisible: case-studies.html says 'Under construction' with meta robots noindex, both case studies (case-studies/building-with-ai.html, case-studies/living-atlas-fantasy-rpg.html) are noindex and unlinked from any nav (commit 77cbc52 hid them) — a hiring manager cannot find them
- resume.html ends at Quadrant4 AI (Aug 2025); as of July 2026 that is an unexplained ~11-month gap — the AI-native independent work (this site, ConductiveOS, 8 shipped games, consulting) is nowhere on the resume itself
- Zero CI: no .github/workflows, no HTML validation, no link checker, no Lighthouse budget — weak signal for someone marketing themselves as 'now full-stack with AI'
- Heavy copy-paste architecture: the ~150-line theme system (CSS vars + toggle markup + sunrise/sunset FX script) is duplicated verbatim in every page; no shared site.css/site.js, so drift is inevitable (experience.html already lacks the toggle)
- Game builds are hand-vendored wholesale from the mustdesigngames monorepo (9.2k-line games/keeprippingpacks/index.html) with no sync mechanism — stable copies will silently diverge
- shots/README.md documents a screenshot system ('drop <slug>.png and it appears on design-lab.html') but no screenshots exist and design-lab.html cards are text-only — stale doc, and the lab has no visual proof of the games
- No robots.txt, sitemap.xml, custom 404.html, or JSON-LD structured data; one shared og.png for every page — weak SEO/link-preview story for a personal-brand site
- Consulting page conversion friction: mailto-only CTA, no scheduling link, no pricing/engagement structure — leads must write a cold email
- README.md references nothing about local dev; .gitignore excludes edit-server.js (a local editing tool) that is otherwise undocumented


## Ranked improvements

### 1. Ship the case studies (un-hide the best hiring evidence)  `impact 5/5 · effort S`

**Why:** case-studies/building-with-ai.html and case-studies/living-atlas-fantasy-rpg.html are the two most persuasive artifacts on the whole domain for both design and AI-engineering roles, and they are currently noindex, unlinked, and fronted by an 'Under construction' page. This is finished work being withheld.

**How:** Remove <meta name="robots" content="noindex"> from case-studies.html and both files in case-studies/; replace the 'Under construction' header and placeholder entry in case-studies.html with two real .entry cards linking the studies; add 'Case Studies' back to the .nav links block on index.html, resume.html, design-lab.html, and consulting.html; link 'Building with AI' from the consulting receipts list.

**Career angle:** Directly increases interview conversion — these pages answer 'how do you think' and 'what did you do during the gap' before anyone asks.

### 2. Close the resume gap with a 2025–present entry  `impact 5/5 · effort S`

**Why:** resume.html's last dated role ends Aug 2025; recruiters screening in mid-2026 will read 11 blank months, when in reality this period produced a multi-agent personal OS, 8 shipped games, and a live consulting practice.

**How:** Add a new .job block at the top of the Experience section in resume.html: 'Independent — AI-Native Design & Engineering, Aug 2025 – Present' with 3 bullets (shipped an 11-game web arcade + tools at mattdanusergrant.com; built a multi-agent personal OS (Conductive) on a Markdown knowledge graph; AI + game-design consulting). Mirror it in README.md and the og/meta descriptions that still say only 'Principal Game Designer'.

**Career angle:** Removes the single biggest screening objection; reframes the gap as a deliberate, productive pivot.

### 3. Extract shared site.css / site.js (kill the 10x duplication)  `impact 4/5 · effort M`

**Why:** The theme variables, toggle widget, sunrise/sunset FX, nav, and footer are pasted into every page (~1,500 duplicated lines). Any palette or nav change must be made 10+ times; experience.html already drifted (no toggle).

**How:** Create /assets/site.css (the :root/[data-theme] blocks, .nav, .theme-toggle, .fx-* rules shared verbatim across index.html, resume.html, consulting.html, design-lab.html, case-studies.html, tools.html, more-games.html, tool.html, resume-builder.html) and /assets/site.js (the theme-toggle IIFE that is byte-identical on every page); keep the tiny head-blocking theme-init inline; refactor pages to link both. Page-specific styles stay inline.

**Career angle:** Turns 'I copy-pasted a site' into 'I maintain a small design system' — a talking point for front-end/product roles.

### 4. Wire real screenshots into Design Lab (the system already exists)  `impact 4/5 · effort M`

**Why:** design-lab.html sells 8 games with text-only cards while shots/README.md documents an image system that was never populated — visual proof is the difference between 'claims to have games' and 'obviously has games'.

**How:** Capture 800×500 screenshots of each game (ronin-survivor's ?expose=1 hatch supports headless capture) into shots/<slug>.png per the table in shots/README.md, then add the 16:10 object-fit:cover image slot to the .card component in design-lab.html and the .tile component in index.html; generate per-page og:image from the same shots.

**Career angle:** Recruiters skim; images make the 10-second version of the portfolio land.

### 5. Add CI: HTML validation + link check + deploy badge  `impact 3/5 · effort S`

**Why:** A repo that is the public proof of 'full-stack with AI' has no .github directory at all. A green check on every push is cheap credibility, and a link checker would catch dead Experimental/Play links when repos move (which already happened once — commits 6550e67/e1d980c).

**How:** Add .github/workflows/check.yml running html-validate (or tidy) over *.html and lychee/linkinator against the built tree on push/PR; add the workflow badge to README.md. Follow the pattern already proven in the ronin-survivor repo's .github/workflows/test.yml.

**Career angle:** Engineering-hygiene signal hiring managers explicitly look for in portfolio repos.

### 6. SEO + polish pack: robots.txt, sitemap.xml, 404.html, JSON-LD  `impact 3/5 · effort S`

**Why:** A personal-brand domain with zero structured data and no sitemap under-ranks for its own name searches; the default GitHub Pages 404 breaks the otherwise immaculate brand.

**How:** Add robots.txt (pointing at sitemap), sitemap.xml listing the ~10 public pages, a site-styled 404.html (reuse the case-studies.html shell), and a JSON-LD Person block (name, jobTitle, url, sameAs: GitHub/LinkedIn) in index.html and resume.html heads.

**Career angle:** Owns the Google results page for 'Matt Danuser-Grant' — the first thing every recruiter types.

### 7. Lower consulting friction: scheduling link + engagement tiers  `impact 3/5 · effort S`

**Why:** consulting.html is well-written but ends in a bare mailto:. Every serious solo consultant converts better with a calendar link and named engagement shapes; right now the page generates admiration, not bookings.

**How:** Add a Cal.com/Calendly 'Book a 30-min intro' button next to the 'Say hello' CTA in the .hero-cta and .cta sections of consulting.html; give the three .offer-card entries (Advisory / Design reviews / AI builds) a starting-at price or duration; consider a second lead magnet tied to the resume-builder.

**Career angle:** Directly monetizes the site while job-searching; consulting receipts also strengthen full-time negotiations.

### 8. Automate stable-build sync from the games monorepo  `impact 2/5 · effort M`

**Why:** games/* are hand-copied snapshots of mustdesigngames and ronin-survivor ('ship real stable builds for all 8 games', commit 850050a). Manual vendoring of 9k-line files guarantees drift and makes updates a chore that will stop happening.

**How:** Add a scripts/sync-games.sh (or a workflow_dispatch GitHub Action) that pulls tagged/stable builds from mustdesigngames and ronin-survivor into games/, and record the source commit SHA in a games/VERSIONS.md so each stable build is traceable.

**Career angle:** Demonstrates release-management thinking across a multi-repo estate.


## Skills this repo proves (for hiring managers)

- Visual/brand design at professional polish level — a cohesive custom design system (type scale, palette, dark mode, motion language) built from scratch without frameworks
- Creative front-end engineering: Canvas 2D generative art (IFS fractals, Lorenz attractor, Fourier epicycles, Game of Life) integrated into UX as a narrative intro with crossfades and performance throttling
- Accessibility literacy: prefers-reduced-motion honored everywhere, keyboard escape hatches for the intro, aria-labels, noscript-safe theme init
- Web Audio API / DSP: procedural TR-808-style drum and synth voices with envelopes, waveshaping, and equal-temperament math (make-dope-grooves/synth.js)
- Print/PDF engineering: page-break control, ATS-safe resume output, and a reusable resume-builder product
- Product thinking and copywriting: clear positioning ('AI + game design, one overlap'), lead magnet funnel, stable/experimental release channels for games
- Security-aware small decisions: whitelisted iframe loader in tool.html, no-secrets .gitignore discipline
- AI-directed development at scale: 51 clean, surgical, well-messaged commits in two weeks, all authored through a Claude Code workflow he designed and supervises
- Quantified game-design track record (from resume.html): character/combat design on Marvel Strike Force ($300M+ rev), SW:GOH ($2B+ player spend), Disney Sorcerer's Arena ($22M launch quarter), plus lead systems design (GoT: Beyond the Wall) and 26-framework combat balance (Champions Online)


## Career signals

- Shipped-ness: live on a custom domain, 200 OK, 10+ interlinked pages, 8 playable games, working newsletter signup — this is a finished product, not a WIP
- Polish level is top-decile for personal sites; the intro sequence alone is a portfolio piece a design-tools or creative-coding team would notice
- Docs are thin but honest (README is accurate; shots/README.md documents an unused system — minor smell); no CONTRIBUTING/dev docs needed for a solo static site but no CI is a real gap
- Work history (experience.html → resume.html): EA QA 2005-06 → Konami QA Lead 2006-07 → Namco QA 2007-08 → Cryptic Combat Designer 2008-12 → Gazillion Game Designer 2012-15 → EA Capital Games Sr GD 2016-18 → Behaviour Lead GD 2018-19 → MZ Sr GD 2019-20 → Glu Sr GD 2020-21 → Scopely Principal GD 2021-Jan 2025 → Quadrant4 AI Head of Game Design Apr-Aug 2025 → (unlisted) independent AI-native building
- Red flag a recruiter will see: resume stops Aug 2025 (~11-month visible gap as of Jul 2026) and the strongest rebuttal (the Building with AI case study) is noindexed and unlinked
- Commit hygiene is excellent but all commits are authored 'Claude' — pair this with the Building-with-AI narrative or it can read oddly to a hiring manager scanning the repo; owning it explicitly ('I direct AI like an engineering team, here are the receipts') turns it into the differentiator
- Positioning is currently 'Principal Game Designer' everywhere (title tags, og:description); the higher-paying market (AI/agent engineering, AI-native product) is only hinted at in one hero line — the site under-sells the pivot it embodies


## Monetization angles

- Consulting funnel is already built (consulting.html) — add scheduling + priced tiers (Advisory retainer / fixed-fee design review / AI build sprint) to convert visitors into paid engagements
- Buttondown newsletter with the two-skill lead magnet is wired — grow it into a paid tier or productized 'AI operating system setup' offer
- resume-builder.html as a standalone free tool with optional paid templates/domains — high-intent SEO traffic (job seekers) that doubles as consulting leads
- Games shelf: add itch.io mirrors / 'support this' links; Keep Ripping Packs' collector loop is the most monetizable prototype
- Dank Omphalos commissions (already open) — the portfolio is its top-of-funnel; feature commissioned work as case studies
- Sell the 'Conductive setup' as a fixed-price productized service for other designers/knowledge workers displaced by AI — the consulting page's 'Operating systems' card is already the pitch


## Standout artifacts to show off

- index.html (lines ~380-745): the MDG intro — glitch-text word puzzle over six live Canvas math sketches (Barnsley fern, oscilloscope waves, phyllotaxis, Lorenz, Metatron's cube, Fourier epicycles) resolving into a Conway's Game of Life that becomes the site's persistent background, with reduced-motion and keyboard fallbacks
- case-studies/living-atlas-fantasy-rpg.html: anonymized AAA licensing-pitch design test — constraint-driven systems design (living-atlas framing, death-as-legacy mechanic, monetization values call) written like a senior designer talks in interviews
- case-studies/building-with-ai.html: the career-pivot narrative — 'designer directs AI as the engineering team', with the personal OS, 11-game arcade, and multi-cloud control plane as evidence
- resume.html: print-engineered resume with @media print page-break control and one-click PDF — plus resume-builder.html, the generalized ATS-safe builder tool spun off from it
- make-dope-grooves/synth.js: sample-free TR-808-style Web Audio synthesis in a clean ES module — kick/snare/hats/clap/cowbell from oscillators, noise buffers, and envelopes
- tool.html: minimal whitelisted iframe shell that frames toolbox apps inside the site chrome without open-redirect risk
- The consulting page (consulting.html): a complete positioning + funnel page (two-column offer, overlap pitch, receipts, lead-magnet newsletter) that most senior ICs never manage to write


## Cross-repo connections

- mustdesigngames (monorepo) is the upstream for 7 of the 8 vendored games and all 'Experimental' links — a sync script/Action between it and games/ closes the drift risk and demonstrates multi-repo release management
- ronin-survivor already has the CI + headless smoke-test pattern (.github/workflows/test.yml, test/smoke.js) — copy that discipline here; its stable build ships from this repo while its dev build lives on its own Pages site
- ConductiveOS is the substance behind both the consulting 'receipts' section and the Building with AI case study — a sanitized public writeup or repo would let the site link to proof instead of description
- The vault's case-study-forge skill generates site-styled case studies directly into this repo — use it to turn other completed design tests (and each shipped app) into more case-studies/ pages
- invisible-ink and keepingcadence are featured as Apps cards — each deserves a short case-study page here (problem → one idea → shipped), turning app links into design-thinking evidence
- dankomphalos is linked as an arthouse with 'commissions open' — the only revenue-bearing external property; cross-promote from the consulting page's receipts
- resume-builder.html is a spin-off-able micro-product (own domain or repo, SEO around 'free ATS resume builder') that would drive organic traffic back to the portfolio
- jabberjawbreaker / cartomancy / fortkickass / mdgarage are future Design Lab or Toolbox entries — the more-games.html and tools.html shelves are built to absorb them
- daily-dividend-lab's income-planning angle could become a 'Tools' entry or a case study demonstrating non-game product range


#LLM-generated
