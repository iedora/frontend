#!/usr/bin/env bash
# HTTP smoke check — polls a URL until it returns 200 or the budget expires.
# Usage: smoke-check.sh [url]
# Defaults to SMOKE_URL env var or https://menu.iedora.com/up.
set -euo pipefail

URL="${1:-${SMOKE_URL:-https://menu.iedora.com/up}}"

for i in 1 2 3 4 5 6; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "$URL" || echo 000)
  if [ "$CODE" = "200" ]; then
    echo "[deploy] OK $URL returned 200"
    exit 0
  fi
  echo "[deploy] $URL returned $CODE; retry $i/6 in 5s"
  sleep 5
done

echo "[deploy] FAIL $URL never returned 200 after 30s" >&2
exit 1
