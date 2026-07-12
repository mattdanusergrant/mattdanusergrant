# Metropolis Dawn Grid — shared-world backend

A single Cloudflare Worker + KV namespace. The seed of MDG's online layer:
**cloud city saves** and a **persistent shared world** where real players' plot
claims are stored authoritatively and seen by everyone. The settlement adjacency
rule (a new city must border the connected megacity network) is enforced on the
**server** — the client can't cheat it.

The game degrades gracefully: if this backend is unreachable, play is fully local
(offline-first). Online is purely additive.

## API (`/v1`)

| Method | Path | Body / query | Purpose |
|---|---|---|---|
| `GET`  | `/v1/world` | — | All claimed plots + the hub seed network |
| `POST` | `/v1/claim` | `{token,name,lat,lon}` | Claim a plot (server checks: open + borders the network) |
| `PUT`  | `/v1/city` | `{token,slug,blob,ts}` | Cloud-save a city (the `MDG1.` blob) |
| `GET`  | `/v1/city` | `?token=&slug=` | Load a cloud save |
| `GET`  | `/v1/neighbors` | `?lat=&lon=&r=` | Nearby cities for trade discovery |

Identity (v1) is an opaque, client-generated **device token** — no accounts or
credentials yet (email + Stripe is a later phase). A token owns its cities and claims.

`worker.js` mirrors the world-grid math (`TS/PLOTS/plotOf/plotNbs`) from
`../world/index.html` verbatim so client and server agree on plot geometry.

## Test (no cloud, no deps)

```
node test.mjs
```

Mocks KV in memory and exercises every endpoint, the validation limits, and the
adjacency **chain rule** end-to-end.

## Deploy (one-time)

```
npx wrangler kv namespace create WORLD          # paste the id into wrangler.toml
npx wrangler kv namespace create WORLD --preview # paste the preview_id
npx wrangler deploy                              # → https://mdg-world.<subdomain>.workers.dev
```

Then point the game at it by setting `MDG_BACKEND` in the client (a single constant;
empty = offline-only). No DNS or site changes required — the Worker is its own
isolated deploy on `*.workers.dev`, and can be mapped to a custom subdomain later.
