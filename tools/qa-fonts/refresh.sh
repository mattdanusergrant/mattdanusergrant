#!/usr/bin/env bash
# Re-download the site's Google Fonts (Fraunces + Inter) and inline them as
# base64 data: URIs into fonts.local.css, so tools/qa-cards.cjs renders with
# production-accurate metrics fully offline (no proxy/network at test time).
set -euo pipefail
cd "$(dirname "$0")"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
URL="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap"
curl -s -A "$UA" "$URL" -o fonts.css
cp fonts.css fonts.local.css
rm -f f*.woff2
i=0
for u in $(grep -oE 'https://fonts.gstatic.com/[^)]+\.woff2' fonts.css | sort -u); do
  curl -s -A "$UA" "$u" -o "f${i}.woff2"
  b64=$(base64 -w0 "f${i}.woff2")
  python3 - "$u" "$b64" <<'PY'
import sys
url, b64 = sys.argv[1], sys.argv[2]
css = open('fonts.local.css').read().replace(url, "data:font/woff2;base64,"+b64)
open('fonts.local.css','w').write(css)
PY
  i=$((i+1))
done
rm -f f*.woff2   # bytes now inlined; keep only the css
echo "refreshed: $i font faces inlined into fonts.local.css"
