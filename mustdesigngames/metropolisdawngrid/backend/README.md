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
| `GET`  | `/v1/world` | — | All claimed plots + hubs (seed + human), each tagged with `hubId`; reports `inviteOnly` |
| `POST` | `/v1/claim` | `{token,name,lat,lon}` | Claim a plot (server checks: open + borders **your hub's** territory) |
| `POST` | `/v1/redeem` | `{token,code}` | Redeem an invite code → join that hub |
| `GET`  | `/v1/me` | `?token=` | Your hub membership (client bootstrap, cross-device) |
| `GET`  | `/v1/hubs` | — | Public hub directory (names, Patreon, member/city counts) |
| `GET`  | `/v1/hub/<hubId>` | — | Public info for one hub (for the join card) |
| `POST` | `/v1/hub/code` | `{hubId,ownerToken?,kind,max?,code?,note?}` | Mint an invite code (admin **or** the hub owner) |
| `PUT`  | `/v1/city` | `{token,slug,blob,ts}` | Cloud-save a city (the `MDG1.` blob) |
| `GET`  | `/v1/city` | `?token=&slug=` | Load a cloud save |
| `GET`  | `/v1/neighbors` | `?lat=&lon=&r=` | Nearby cities for trade discovery |

### Admin (require `Authorization: Bearer $ADMIN_KEY`)

| Method | Path | Body | Purpose |
|---|---|---|---|
| `POST` | `/v1/admin/hub` | `{name,lat,lon,tier?,patreonUrl?,handle?,url?}` | Mint a hub for an influencer → returns its **owner token** |
| `GET`  | `/v1/admin/hubs` | — | List all hubs with owner tokens + counts |

Identity (v1) is an opaque, client-generated **device token** — no accounts or
credentials yet (email + Stripe is a later phase). A token owns its cities and claims.

## Hub players (invite-only communities)

A **hub player** is a real influencer (e.g. City Planner Plays) whose community grows
out of *their* hub. The Operator mints a hub (`/v1/admin/hub`) and hands the returned
**owner token** to the creator. The owner (or Operator) mints invite **codes**
(`kind: open | patron`); a player **redeems** a code to join the hub, and can then
claim plots that border the hub's own growing territory — so each hub is a distinct,
contiguous cluster on the globe. **Patron** codes are simply shared behind the
influencer's Patreon paywall (a patrons-only post) — there is no Patreon API in v1.

Manage all of this from **`../hub-console.html`** (operator + hub-owner UI).

## Config (env vars / secrets)

| Var | Default | Meaning |
|---|---|---|
| `ADMIN_KEY` | *(unset → admin disabled)* | Operator secret; Bearer token for `/v1/admin/*` |
| `WORLD_INVITE_ONLY` | `true` | `true` gates world claims behind hub membership; `false` = open affiliation-layer play |

```
npx wrangler secret put ADMIN_KEY                       # operator secret
npx wrangler deploy --var WORLD_INVITE_ONLY:true        # or set [vars] in wrangler.toml
```

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
