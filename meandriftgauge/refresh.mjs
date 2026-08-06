// Rebuilds meandriftgauge/data.json from free daily-close sources.
// Run: node meandriftgauge/refresh.mjs   (Node 18+, no dependencies)
// Stooq is the primary source; Yahoo Finance's chart API is the fallback.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'data.json');
const LOOKBACK_DAYS = 700;            // calendar days; ~480 trading days
const MIN_ROWS = 420;                 // 200-day window + 200-day SMA lookback + slack

const SERIES = [
  { key: 'spx', label: 'S&P 500',      symbol: 'SPX', stooq: '^spx', yahoo: '^GSPC', dp: 2 },
  { key: 'ndx', label: 'NASDAQ 100',   symbol: 'NDX', stooq: '^ndx', yahoo: '^NDX',  dp: 2 },
  { key: 'dji', label: 'Dow Jones',    symbol: 'DJI', stooq: '^dji', yahoo: '^DJI',  dp: 2 },
  { key: 'rut', label: 'Russell 2000', symbol: 'IWM', stooq: 'iwm.us', yahoo: 'IWM', dp: 2 },
];

const ymd = d => d.toISOString().slice(0, 10);
const compact = s => s.replaceAll('-', '');

async function fromStooq(s) {
  const d2 = new Date();
  const d1 = new Date(d2.getTime() - LOOKBACK_DAYS * 86400e3);
  const url = `https://stooq.com/q/d/l/?s=${s.stooq}&i=d&d1=${compact(ymd(d1))}&d2=${compact(ymd(d2))}`;
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
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s.yahoo)}?range=2y&interval=1d`;
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
  const count = Object.keys(bars).length;
  console.log(`${s.key}: ${count} rows via ${source}`);
  if (count < MIN_ROWS) throw new Error(`${s.key}: only ${count} rows (< ${MIN_ROWS}) — refusing to write`);
  fetched[s.key] = bars;
}

const common = Object.values(fetched)
  .map(b => new Set(Object.keys(b)))
  .reduce((a, b) => new Set([...a].filter(d => b.has(d))));
const dates = [...common].sort();
if (dates.length < MIN_ROWS) throw new Error(`only ${dates.length} common trading days — refusing to write`);

const data = {
  updated: dates[dates.length - 1],
  dates,
  series: SERIES.map(s => ({
    key: s.key, label: s.label, symbol: s.symbol,
    closes: dates.map(d => Number(fetched[s.key][d].toFixed(s.dp))),
  })),
};
writeFileSync(OUT, JSON.stringify(data));
console.log(`wrote ${OUT}: ${dates.length} sessions, through ${data.updated}`);
