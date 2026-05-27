#!/usr/bin/env bash
# Polls GHCR for the `migrate:latest` container tag.
# Requires IAC_BOOTSTRAP_GHCR_TOKEN in environment (hydrated by bin/iedora-env).
set -euo pipefail

[ -n "${IAC_BOOTSTRAP_GHCR_TOKEN:-}" ] || { echo "IAC_BOOTSTRAP_GHCR_TOKEN missing in BWS" >&2; exit 1; }
export GH_TOKEN="$IAC_BOOTSTRAP_GHCR_TOKEN"

deadline=$(( $(date +%s) + 1800 ))   # 30 min budget
while true; do
  if gh api -H "Accept: application/vnd.github+json" \
       /user/packages/container/migrate/versions \
       --jq ".[].metadata.container.tags[]" 2>/dev/null \
       | grep -qx "latest"; then
    echo "✓ ghcr.io/eduvhc/migrate:latest is available"
    exit 0
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "✗ ghcr.io/eduvhc/migrate:latest still missing after 30 min — abort"
    exit 1
  fi
  echo "ghcr.io/eduvhc/migrate:latest not yet pushed — waiting 30s"
  sleep 30
done
