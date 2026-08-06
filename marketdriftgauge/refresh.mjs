// Rebuilds marketdriftgauge/data.json from free daily-close sources — full available history.
// Run: node marketdriftgauge/refresh.mjs   (Node 18+, no dependencies)
// Stooq is the primary source; Yahoo Finance's chart API is the fallback.
//
// Schema (v2): {updated, dates:[union of trading days], series:[{key,label,symbol,offset,closes}]}
// closes[i] pairs with dates[offset+i]; a series' interior gaps are forward-filled.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'data.json');
const MIN_ROWS = 420;        // per series: 200-day window + 200-day SMA lookback + slack
const MIN_UNION = 5000;      // sanity floor for the combined timeline

const SERIES = [
  { key: 'spx', label: 'S&P 500',      symbol: 'SPX', stooq: '^spx', yahoo: '^GSPC' },
  { key: 'ndx', label: 'NASDAQ 100',   symbol: 'NDX', stooq: '^ndx', yahoo: '^NDX'  },
  { key: 'dji', label: 'Dow Jones',    symbol: 'DJI', stooq: '^dji', yahoo: '^DJI'  },
  { key: 'rut', label: 'Russell 2000', symbol: 'IWM', stooq: 'iwm.us', yahoo: 'IWM' },
];

const ymd = d => d.toISOString().slice(0, 10);

async function fromStooq(s) {
  const url = `https://stooq.com/q/d/l/?s=${s.stooq}&i=d&d1=19000101&d2=${ymd(new Date()).replaceAll('-', '')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`stooq ${s.stooq}: HTTP ${res.status}`);
  const text = await res.text();
  const rows = text.trim().split('\n');
  if (!/^Date,/.test(rows[0])) throw new Error(`stooq ${s.stooq}: unexpected payload "${rows[0]?.slice(0, 40)}"`);
  const out = {};
  for (const row of rows.slice(1)) {
    const [date, , , , close] = row.split(',');
    const v = Number(close);
    if (date && Number.isFinite(v)) out[date] = v;
  }
  return out;
}

async function fromYahoo(s) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s.yahoo)}?range=max&interval=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`yahoo ${s.yahoo}: HTTP ${res.status}`);
  const doc = await res.json();
  const r = doc?.chart?.result?.[0];
  const stamps = r?.timestamp ?? [];
  const closes = r?.indicators?.quote?.[0]?.close ?? [];
  const out = {};
  stamps.forEach((t, i) => {
    const v = closes[i];
    if (Number.isFinite(v)) out[ymd(new Date(t * 1000))] = v;
  });
  return out;
}

const fetched = {};
for (const s of SERIES) {
  let bars, source;
  try { bars = await fromStooq(s); source = 'stooq'; }
  catch (e) {
    console.warn(`${s.key}: ${e.message} — falling back to yahoo`);
    bars = await fromYahoo(s); source = 'yahoo';
  }
  const dates = Object.keys(bars).sort();
  console.log(`${s.key}: ${dates.length} rows via ${source} (${dates[0]} → ${dates[dates.length - 1]})`);
  if (dates.length < MIN_ROWS) throw new Error(`${s.key}: only ${dates.length} rows (< ${MIN_ROWS}) — refusing to write`);
  fetched[s.key] = bars;
}

const dates = [...new Set(Object.values(fetched).flatMap(b => Object.keys(b)))].sort();
if (dates.length < MIN_UNION) throw new Error(`only ${dates.length} union trading days (< ${MIN_UNION}) — refusing to write`);

const series = SERIES.map(s => {
  const bars = fetched[s.key];
  const first = Object.keys(bars).sort()[0];
  const offset = dates.indexOf(first);
  const closes = [];
  let last = null, gaps = 0;
  for (const d of dates.slice(offset)) {
    if (d in bars) last = bars[d]; else gaps++;
    closes.push(Number(last.toFixed(2)));
  }
  if (gaps) console.log(`${s.key}: ${gaps} forward-filled gaps`);
  return { key: s.key, label: s.label, symbol: s.symbol, offset, closes };
});

const data = { updated: dates[dates.length - 1], dates, series };
writeFileSync(OUT, JSON.stringify(data));
console.log(`wrote ${OUT}: ${dates.length} union sessions, through ${data.updated}`);
