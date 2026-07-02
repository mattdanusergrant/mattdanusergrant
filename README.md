# Matt Danuser-Grant

[![Checks](https://github.com/mattdanusergrant/mattdanusergrant/actions/workflows/check.yml/badge.svg)](https://github.com/mattdanusergrant/mattdanusergrant/actions/workflows/check.yml)

**Principal Game Designer** — 10+ years in mobile F2P, now building full-stack with AI.

Character, combat, and systems design on some of mobile's biggest games — *Marvel Strike Force*,
*Star Wars: Galaxy of Heroes*, *Disney Sorcerer's Arena* — and, since 2025, an independent
AI-native practice: a multi-agent personal OS, a browser games arcade, and full-stack apps
built end to end.

### Find me

- 🌐 **Site:** [mattdanusergrant.com](https://mattdanusergrant.com)
- 🎮 **Games** — playable prototypes: [mattdanusergrant.com/more-games.html](https://mattdanusergrant.com/more-games.html)
- 📓 **Case Studies** — how I think: [mattdanusergrant.com/case-studies.html](https://mattdanusergrant.com/case-studies.html)
- 📄 **Resume:** [mattdanusergrant.com/resume.html](https://mattdanusergrant.com/resume.html)
- 🤝 **Consulting:** [mattdanusergrant.com/consulting.html](https://mattdanusergrant.com/consulting.html)
- 💼 **LinkedIn:** [linkedin.com/in/mattdanusergrant](https://linkedin.com/in/mattdanusergrant)

### Develop

No build step — open any `.html` directly, or serve the root with `python3 -m http.server`.
CI (`.github/workflows/check.yml`) runs on every push/PR; run the same checks locally:

```bash
npx html-validate@11.5.5 "*.html" "case-studies/*.html"   # HTML validation
node tools/check-links.mjs .                               # internal link/asset check
```

---

<sub>This repository is the source for [mattdanusergrant.com](https://mattdanusergrant.com), a
hand-built static site served via GitHub Pages.</sub>
