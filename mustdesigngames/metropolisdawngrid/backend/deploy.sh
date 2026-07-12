#!/usr/bin/env bash
# One-shot deploy of the MDG shared-world Worker to your Cloudflare account.
# Prereqs: authenticate first with EITHER
#   export CLOUDFLARE_API_TOKEN=...   (a token with Workers Scripts:Edit + Workers KV:Edit)
#   or  npx wrangler login            (interactive, opens a browser)
#
# Run from this directory:  bash deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "→ creating KV namespaces (idempotent-ish; skip if they already exist)…"
PROD=$(npx --yes wrangler kv namespace create WORLD 2>&1 | grep -oE '"?id"?[ =:]+"?[a-f0-9]{32}' | grep -oE '[a-f0-9]{32}' | head -1 || true)
PREV=$(npx --yes wrangler kv namespace create WORLD --preview 2>&1 | grep -oE '[a-f0-9]{32}' | head -1 || true)

if [ -n "${PROD:-}" ]; then
  echo "→ writing namespace ids into wrangler.toml"
  sed -i "s/REPLACE_WITH_KV_NAMESPACE_ID/${PROD}/" wrangler.toml
  [ -n "${PREV:-}" ] && sed -i "s/REPLACE_WITH_KV_PREVIEW_ID/${PREV}/" wrangler.toml || sed -i "s/REPLACE_WITH_KV_PREVIEW_ID/${PROD}/" wrangler.toml
else
  echo "!! Could not auto-detect a new namespace id."
  echo "   If WORLD already exists, run 'npx wrangler kv namespace list', paste the id into"
  echo "   wrangler.toml, and re-run — or just run 'npx wrangler deploy' directly."
fi

echo "→ deploying the Worker…"
npx --yes wrangler deploy

echo
echo "✅ Deployed. Copy the printed https://mdg-world.<subdomain>.workers.dev URL, then set it"
echo "   as MDG_BACKEND in ../index.html and ../world/index.html (the empty-string default),"
echo "   commit, and push — the game goes online. (Until then, ?backend=<url> works for testing.)"
