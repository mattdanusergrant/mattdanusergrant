#!/usr/bin/env node
/* Network-free internal link & asset checker for the static site.
   Scans the site's own pages and verifies every internal href/src resolves to a
   real file in the repo — catches dead Play/Experimental links when a game or
   asset moves. External links (http/https/mailto/tel/about), pure #anchors, and
   data: URIs are skipped, as are href/src strings built inside <script> blocks.
   Exit 1 on any broken internal reference. */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(process.argv[2] || '.');
const OWNED = [
  'index.html', '404.html', 'design-lab.html', 'consulting.html', 'resume.html', 'resume-builder.html',
  'case-studies.html', 'more-games.html', 'tools.html', 'tool.html', 'experience.html',
  'case-studies/building-with-ai.html',
  'case-studies/living-atlas-fantasy-rpg.html',
];

const attrRe = /(?:href|src)\s*=\s*"([^"]*)"/gi;
let broken = [], checked = 0;

function targetExists(p) {
  if (!existsSync(p)) return false;
  try { if (statSync(p).isDirectory()) return existsSync(join(p, 'index.html')); } catch { return false; }
  return true;
}

for (const rel of OWNED) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) { broken.push([rel, '(page listed but missing)', rel]); continue; }
  const html = readFileSync(file, 'utf8')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  let m;
  while ((m = attrRe.exec(html))) {
    let url = m[1].trim();
    if (!url) continue;
    if (/^(https?:|mailto:|tel:|data:|javascript:|about:|#)/i.test(url)) continue;
    url = url.split('#')[0].split('?')[0];
    if (!url) continue;
    const abs = url.startsWith('/') ? join(ROOT, url) : resolve(dirname(file), url);
    checked++;
    if (!targetExists(abs)) broken.push([rel, url, abs.replace(ROOT + '/', '')]);
  }
}

console.log(`Checked ${checked} internal references across ${OWNED.length} pages.`);
if (broken.length) {
  console.error(`\n✗ ${broken.length} broken internal link(s):`);
  for (const [page, url, resolved] of broken) console.error(`  ${page}  →  ${url}   (missing: ${resolved})`);
  process.exit(1);
}
console.log('✓ all internal links resolve.');
