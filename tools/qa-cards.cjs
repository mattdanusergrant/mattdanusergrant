#!/usr/bin/env node
/**
 * QA — homepage card overflow check (mattdanusergrant.com).
 *
 * The homepage shelves use fixed-height .tile cards (unified height, no in-card
 * scroll). A card overflows if its content is taller than the card, which clips
 * text and — worse — can push the CTA button past the card's edge.
 *
 * This is font- and width-sensitive: Fraunces (titles) + Inter (body) render
 * taller than fallback fonts, and column width changes how titles/descriptions
 * wrap. Headless Chromium can't fetch Google Fonts through the sandbox proxy, so
 * we inject the REAL font files (bundled in tools/qa-fonts/, refreshed via
 * tools/qa-fonts/refresh.sh) to make measurements match production, and we sweep
 * a range of viewport widths.
 *
 * Pass = every .tile fits (content <= card height AND button inside the card) at
 * every width. Exit 1 on any overflow.
 *
 *   node tools/qa-cards.cjs [file-or-url]   # defaults to ../index.html
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const target = process.argv[2] || 'file://' + path.resolve(__dirname, '..', 'index.html');
const FONT_DIR = path.join(__dirname, 'qa-fonts');
const FONT_CSS = path.join(FONT_DIR, 'fonts.local.css');
const WIDTHS = [360, 390, 414, 480, 560, 640, 720, 820, 900, 960, 1024, 1200, 1440];

(async () => {
  const haveFonts = fs.existsSync(FONT_CSS);
  if (!haveFonts) {
    console.log('❌ tools/qa-fonts/fonts.local.css is missing.\n' +
      '   The card layout is font-metric-sensitive; measuring with fallback fonts\n' +
      '   under-reports height and would produce a FALSE PASS. Generate the bundle:\n' +
      '       tools/qa-fonts/refresh.sh\n' +
      '   (downloads the site\'s Fraunces + Inter and inlines them for offline QA).');
    process.exit(2);
  }

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext();
  // Serve bundled real fonts in place of the network Google Fonts requests.
  await ctx.route('**/*', route => {
    const url = route.request().url();
    if (/fonts\.googleapis\.com/.test(url)) {
      return haveFonts ? route.fulfill({ contentType: 'text/css', body: fs.readFileSync(FONT_CSS, 'utf8') }) : route.abort();
    }
    if (/fonts\.gstatic\.com/.test(url)) return route.abort(); // localized css already points at local files
    return route.continue();
  });

  const problems = [];
  for (const w of WIDTHS) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: w, height: 1000 });
    await p.goto(target, { waitUntil: 'load', timeout: 20000 }).catch(() => {});
    await p.evaluate(() => ['intro','intro-backdrop','intro-canvas'].forEach(id => document.getElementById(id)?.remove()));
    await p.evaluate(() => document.fonts.ready).catch(() => {});
    await p.waitForTimeout(120);
    const fontsOk = await p.evaluate(() => document.fonts.size > 0 && document.fonts.check('500 19px Fraunces'));
    if (haveFonts && !fontsOk) {
      console.log(`❌ QA ERROR — real fonts failed to apply at ${w}px (loaded faces: ${await p.evaluate(()=>document.fonts.size)}). Measurement would be wrong; aborting.`);
      await b.close(); process.exit(2);
    }
    const bad = await p.$$eval('.tile', els => els.map(e => {
      const r = e.getBoundingClientRect();
      const btn = e.querySelector('.btn-row');
      const desc = e.querySelector('p');
      const btnBottom = btn ? Math.round(btn.getBoundingClientRect().bottom - r.top) : 0;
      // clipped: card content taller than card, OR button pushed past the card
      // edge, OR the description itself is clipped by its own overflow:hidden.
      const cardOverflow = e.scrollHeight > e.clientHeight + 1;
      const btnEscaped = btnBottom > Math.round(r.height) + 1;
      const descClipped = desc ? desc.scrollHeight > desc.clientHeight + 1 : false;
      return {
        title: e.querySelector('h3')?.innerText.replace(/\n/g,' ').trim(),
        clientH: e.clientHeight, scrollH: e.scrollHeight,
        cardH: Math.round(r.height), btnBottom, descClipped, cardOverflow, btnEscaped,
      };
    }).filter(t => t.cardOverflow || t.btnEscaped || t.descClipped));
    for (const t of bad) problems.push({ w, fontsOk, ...t });
    await p.close();
  }
  await b.close();

  if (!problems.length) {
    console.log(`✅ QA PASS — no card overflows across ${WIDTHS.length} widths (${WIDTHS[0]}–${WIDTHS[WIDTHS.length-1]}px), real fonts ${haveFonts ? 'ON' : 'OFF'}.`);
    process.exit(0);
  }
  console.log(`❌ QA FAIL — ${problems.length} overflow(s):`);
  const seen = new Set();
  for (const p of problems) {
    const k = p.title + p.w;
    if (seen.has(k)) continue; seen.add(k);
    const why = [p.cardOverflow && 'card-overflow', p.btnEscaped && 'button-escaped', p.descClipped && 'text-clipped'].filter(Boolean).join('+');
    console.log(`  [${p.w}px] "${p.title}" (${why}): content ${p.scrollH}px vs card ${p.clientH}px; button bottom ${p.btnBottom}px (card ${p.cardH}px)${p.fontsOk ? '' : '  [fallback fonts]'}`);
  }
  process.exit(1);
})();
