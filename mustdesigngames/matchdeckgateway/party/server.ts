import type * as Party from "partykit/server";

/**
 * Multiplayer Deck Gateway — authoritative room server.
 *
 * One PartyKit room per 4-letter game code. The room is the durable, always-on
 * authority for *connectivity and state*: it owns the roster, relays messages,
 * caches the latest authoritative snapshot, and survives hibernation. Game
 * *rules* still run in the elected host browser (the shared client engine), so
 * adding a game needs zero server changes — the server never parses gameplay.
 *
 * This replaces the old PeerJS peer-to-peer path: every player holds one
 * reliable WebSocket to the edge, so there is no signalling broker to flake and
 * no NAT/TURN traversal to fail. Late-joiners and reconnectors are handed the
 * cached snapshot immediately.
 *
 * Protocol (JSON strings both ways)
 *   client → server
 *     connect ?host=1     claim the host role for this room
 *     {type:'state',state} host only: new authoritative snapshot (cached + fanned out)
 *     {t:...}              client only: a game intent (relayed to the host, tagged __from)
 *   server → client
 *     {type:'welcome',role,code}   sent on connect
 *     {type:'state',state}         snapshot (to clients; on join and on every host push)
 *     {type:'join',id}             to host: a client connected
 *     {type:'leave',id}            to host: a client disconnected
 */

const CONTROL = new Set(["welcome", "state", "join", "leave"]);

type Role = "host" | "client";

export default class DeckRoom implements Party.Server {
  // Snapshot is persisted so a hibernated/evicted room can rehydrate late joiners.
  lastState: unknown = null;

  constructor(readonly room: Party.Room) {}

  async onStart() {
    this.lastState = (await this.room.storage.get("state")) ?? null;
  }

  // Host is derived from live connection state, so it stays correct across
  // hibernation (connection attachments persist; an in-memory ref would not).
  private host(): Party.Connection | undefined {
    for (const c of this.room.getConnections()) {
      if ((c.state as { role?: Role } | undefined)?.role === "host") return c;
    }
    return undefined;
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const wantsHost =
      new URL(ctx.request.url).searchParams.get("host") === "1";
    // First host-claimer while no live host exists wins the seat; a reconnecting
    // host (its old socket already closed) re-claims cleanly.
    const isHost = wantsHost && !this.host();

    if (isHost) {
      conn.setState({ role: "host" });
      conn.send(reply("welcome", { role: "host", code: this.room.id }));
      // Replay the current roster so a reconnected host re-learns its clients.
      for (const c of this.room.getConnections()) {
        if (c.id !== conn.id && role(c) === "client") {
          conn.send(reply("join", { id: c.id }));
        }
      }
      return;
    }

    conn.setState({ role: "client" });
    conn.send(reply("welcome", { role: "client", code: this.room.id }));
    if (this.lastState != null) {
      conn.send(reply("state", { state: this.lastState }));
    }
    this.host()?.send(reply("join", { id: conn.id }));
  }

  onMessage(raw: string, sender: Party.Connection) {
    let msg: { type?: string; [k: string]: unknown };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === "state" && role(sender) === "host") {
      // Authoritative snapshot: cache, persist, fan out to every other socket.
      this.lastState = msg.state;
      this.room.storage.put("state", msg.state);
      const out = reply("state", { state: msg.state });
      for (const c of this.room.getConnections()) {
        if (c.id !== sender.id) c.send(out);
      }
      return;
    }

    if (role(sender) === "client" && !(msg.type && CONTROL.has(msg.type))) {
      // Any non-control client message is a game intent → relay to the host,
      // tagged with the sender so the host can attribute it.
      this.host()?.send(JSON.stringify({ ...msg, __from: sender.id }));
    }
  }

  onClose(conn: Party.Connection) {
    if (role(conn) === "client") {
      this.host()?.send(reply("leave", { id: conn.id }));
    }
    // If the host closed, the seat is simply vacant until it reconnects (?host=1)
    // or another socket claims it. Cached state keeps clients whole meanwhile.
  }
}

function role(c: Party.Connection): Role | undefined {
  return (c.state as { role?: Role } | undefined)?.role;
}

function reply(type: string, body: Record<string, unknown>): string {
  return JSON.stringify({ type, ...body });
}
