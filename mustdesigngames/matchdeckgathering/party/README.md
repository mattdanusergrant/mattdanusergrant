# Match Deck Gathering — room server

> Renamed to Match Deck Gathering (2026-07-14; orig. Multiplayer Deck Gateway, 2026-07-09); the PartyKit project is now
> `matchdeckgathering` (see `partykit.json`). This has no live impact: `PARTY_HOST`
> in `../index.html` is empty, so online play uses the PeerJS fallback and no
> room server is deployed yet. On the next `npm run deploy` the server publishes
> under the new name — wire that host into `PARTY_HOST` (below) to switch online
> play over to it.

The authoritative backend for online play. It's a single PartyKit room server
(`server.ts`) that runs on Cloudflare's edge. The game (`../index.html`) still
ships as one no-build file; this folder is the *only* part with tooling, and it
deploys separately.

## What it does

- **One room per game code.** The 4-letter room code is the PartyKit room id.
- **Reliable transport.** Every player holds one WebSocket to the edge — no
  peer-to-peer, so there's no signalling broker to flake and no NAT/TURN
  traversal to fail (the two failure modes of the old PeerJS path).
- **Host-authoritative, server-durable.** Game *rules* run in the elected host
  browser (the shared client engine); the server owns the roster, relays
  intents to the host, fans the host's snapshots out to everyone, and **caches
  the latest snapshot** (persisted through hibernation) so late-joiners and
  reconnectors are made whole instantly.
- **Zero per-game work.** The server never parses gameplay — adding a game to
  the Gathering needs no server change.

## Deploy (one time)

```bash
cd matchdeckgathering/party
npm install
npx partykit login        # opens a browser; authorises against your Cloudflare-backed PartyKit account
npm run deploy            # → prints your room-server host, e.g. matchdeckgathering.<your-user>.partykit.dev
```

Then copy that host into the game so online play routes through it:

- Open `../index.html`, find `const PARTY_HOST = ''` near the `NET` block, and
  set it to the printed host (no scheme):
  `const PARTY_HOST = 'matchdeckgathering.<your-user>.partykit.dev'`.
- Commit + push. GitHub Pages redeploys the game; online now uses the backend.

Leaving `PARTY_HOST` empty (or if the server is unreachable) makes online play
fall back to the legacy PeerJS peer-to-peer path — so nothing breaks before you
deploy.

## Local dev

```bash
npm run dev              # serves the room server at http://127.0.0.1:1999
```

Point the game at it by setting `PARTY_HOST = '127.0.0.1:1999'` (the client uses
`ws://` for localhost automatically).

## Custom domain (optional)

To serve the rooms from your own domain instead of `*.partykit.dev`, add a
`domain` to `partykit.json` and follow PartyKit's custom-domain setup on
Cloudflare, then set `PARTY_HOST` to that domain.
