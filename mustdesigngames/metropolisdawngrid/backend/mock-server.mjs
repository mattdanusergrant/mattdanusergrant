// Local HTTP wrapper around the real worker.js handle() with a persistent in-memory
// KV, so the browser clients (globe + hub console) can be driven end-to-end without
// deploying to Cloudflare. NOT for production. Usage: node mock-server.mjs [port]
import { createServer } from 'node:http';
import { handle } from './worker.js';

const PORT = parseInt(process.argv[2] || '8977', 10);
const ADMIN_KEY = process.env.ADMIN_KEY || 'local-admin-key';
const INVITE_ONLY = process.env.WORLD_INVITE_ONLY || 'true';

const m = new Map();
const KV = {
  get: async (k, type) => { const v = m.get(k); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; },
  put: async (k, v) => { m.set(k, v); },
  list: async ({ prefix = '', limit = 1000, cursor = null } = {}) => ({
    keys: [...m.keys()].filter((k) => k.startsWith(prefix)).slice(0, limit).map((name) => ({ name })),
    list_complete: true, cursor: null
  })
};
const env = { WORLD: KV, ADMIN_KEY, WORLD_INVITE_ONLY: INVITE_ONLY };

createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request('http://localhost' + req.url, {
    method: req.method,
    headers: req.headers,
    body: (req.method === 'GET' || req.method === 'HEAD') ? undefined : body
  });
  let resp;
  try { resp = await handle(request, env); }
  catch (e) { resp = new Response(JSON.stringify({ error: 'server error', detail: String(e) }), { status: 500 }); }
  const text = await resp.text();
  const headers = {}; resp.headers.forEach((v, k) => { headers[k] = v; });
  res.writeHead(resp.status, headers);
  res.end(text);
}).listen(PORT, () => console.log('mdg mock backend on http://127.0.0.1:' + PORT + ' (admin=' + ADMIN_KEY + ', inviteOnly=' + INVITE_ONLY + ')'));
