# Metropolis Dawn Grid — headless economy simulator

A command-line tool that runs **the real game logic** (`../index.html`) as AI-built
cities, headless, across parameter combinations, and prints stats. No graphics, no UI —
just numbers, for **balance analysis**.

It drives the actual shipped `index.html` in a headless browser via its `?e2e=1` debug
hooks and `?ai=1` city planner. There is **no reimplementation of the economy**, so the
results can't drift from the real game — whatever the sim reports is what a player gets.

## Setup

```bash
npm i -D playwright
npx playwright install chromium
```

## Run

```bash
node sim/simulate.mjs                      # default: tiers 0–5 × 3 regions, 200 ticks each
node sim/simulate.mjs --ticks 400          # run each city longer (nearer steady state)
node sim/simulate.mjs --tiers 3,4,5        # only these AI city sizes
node sim/simulate.mjs --regions 5          # more spawn points (more terrain variety)
node sim/simulate.mjs --tune tradeRate=4,elecPrice=5   # override any TUNE knob for the whole run
node sim/simulate.mjs --elec 0.5           # set 50% of factories to the Electronics recipe
node sim/simulate.mjs --partners ore,stone # give every city rail trade partners
node sim/simulate.mjs --samples 8          # also record a trajectory (8 points) per city
node sim/simulate.mjs --concurrency 8      # run 8 cities in parallel (default 4)
node sim/simulate.mjs --json out/run.json  # write full per-city results
```

Flags combine freely (e.g. `--tune tradeRate=4 --partners ore --elec 0.4 --ticks 400`).

## What each column means

| column | meaning |
|--------|---------|
| `reg(spec)` | spawn region + its richest (near) resource |
| `built→` / `reached` | the AI tier it was *built* at → the tier it *grew to* over the run |
| `pop` | population |
| `cash` / `net/mo` | treasury and net income per month (tick) — **negative net or `solv=NO` is the money-balance signal** |
| `tp.avg` | sustained throughput (finished output/tick) — the endgame score |
| `cong` | congestion % (100% = gridlock) |
| `worstSup` | the tightest resource supply — the bottleneck that's throttling growth |
| `buildings` | the top building types placed |

The summary line reports how many cities went **insolvent**, and per-tier averages
(pop, net, throughput, congestion).

## What it's for

- **Find where the economy breaks.** Does an AI city go insolvent? At which tier? Is
  throughput zero because Works land on the wrong terrain for their Factories? Is every
  city gridlocked? These jump out of the table without playing a single city by hand.
- **A/B a tuning change.** Run the default sweep, then re-run with `--tune …` and compare —
  before you bake a number into `TUNE_DEFAULTS`.
- **Exercise the new systems.** `--elec` and `--partners` turn on Electronics and two-way
  trade so you can see their effect at scale.

## How it works (for maintainers)

- `simulate.mjs` serves the game folder over localhost, opens
  `index.html?e2e=1&ai=1&tier=N&lat&lon[&tune=…]` per city, runs N ticks via
  `window.__dbg.tick()`, and reads `window.__dbg.stats()`.
- The debug hooks it relies on (`stats`, `setPartners`, `setRecipes`, `tick`, `tune`, …)
  live in `index.html`, gated behind `?e2e=1` — inert in normal play.
- One browser is reused; each city runs in its own page for clean isolation.
