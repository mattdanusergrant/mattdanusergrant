#!/usr/bin/env node
/* Apply a Copy Desk changeset to the site's HTML files.
 *
 * The copy editor works at /copyedit.html and exports copy-edits-<date>.json;
 * this script applies that file to the repo, then you review `git diff` and push.
 *
 * Usage:  node tools/apply-copy-edits.mjs copy-edits-2026-07-11.json [--dry-run]
 *
 * Matching: each element edit is located as the Nth occurrence of `>original<`
 * in the page source (N recorded at export time); titles match <title>…</title>.
 * Anything that doesn't match exactly is SKIPPED and reported — nothing fuzzy.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2];
const dry = process.argv.includes('--dry-run');
if (!file) { console.error('usage: node tools/apply-copy-edits.mjs <copy-edits.json> [--dry-run]'); process.exit(2); }

const changeset = JSON.parse(readFileSync(file, 'utf8'));
if (changeset.tool !== 'copy-desk') { console.error('not a Copy Desk changeset'); process.exit(2); }

/* The DOM normalizes named entities (&mdash; -> —), so exported originals carry literal
   characters while page source may spell them as entities. Match either form.
   Mirrored in copyedit.html — keep the two lists in sync. */
const TYPO = [['—','mdash'],['–','ndash'],['’','rsquo'],['‘','lsquo'],
              ['“','ldquo'],['”','rdquo'],['…','hellip'],
              ['←','larr'],['→','rarr'],['·','middot']];
function patternToRegex(pat) {
  let s = pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [ch, name] of TYPO) s = s.split(ch).join(`(?:${ch}|&${name};)`);
  return new RegExp(s, 'g');
}
function nthMatch(haystack, pattern, n) {
  const re = patternToRegex(pattern);
  let m, k = 0;
  while ((m = re.exec(haystack))) { if (k === n) return { at: m.index, len: m[0].length }; k++; }
  return null;
}

const byPage = {};
for (const e of changeset.edits) (byPage[e.page] = byPage[e.page] || []).push(e);

let applied = 0, skipped = [];
for (const [page, edits] of Object.entries(byPage)) {
  const path = join(ROOT, page.replace(/^\//, ''));
  let src;
  try { src = readFileSync(path, 'utf8'); }
  catch { edits.forEach(e => skipped.push({ ...e, reason: 'page file not found' })); continue; }

  // Same-pattern edits applied in descending occurrence order so earlier
  // replacements don't shift later occurrence numbering.
  edits.sort((a, b) => (a.original === b.original ? b.occurrence - a.occurrence : 0));

  for (const e of edits) {
    let pat, rep;
    if (e.type === 'title') { pat = `<title>${e.original}</title>`; rep = `<title>${e.edited}</title>`; }
    else { pat = `>${e.original}<`; rep = `>${e.edited}<`; }
    const hit = nthMatch(src, pat, e.type === 'title' ? 0 : (e.occurrence || 0));
    if (!hit) { skipped.push({ ...e, reason: 'original text not found (page changed since export?)' }); continue; }
    src = src.slice(0, hit.at) + rep + src.slice(hit.at + hit.len);
    applied++;
    console.log(`OK   ${page}  [${e.tag}] ${String(e.edited).replace(/<[^>]+>/g, '').slice(0, 60)}`);
  }
  if (!dry) writeFileSync(path, src);
}

console.log(`\n${applied} applied${dry ? ' (dry run — nothing written)' : ''}, ${skipped.length} skipped.`);
for (const s of skipped) {
  console.log(`SKIP ${s.page}  [${s.tag}] ${s.reason}\n     original: ${String(s.original).slice(0, 80)}`);
}
if (skipped.length) process.exit(1);
