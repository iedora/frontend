#!/usr/bin/env bash
# Dispatches app-state.yml and follows the resulting run to completion.
# Requires: GH_TOKEN, REPO, GITHUB_SHA in environment.
set -euo pipefail

# Snapshot the most recent app-state run ID BEFORE dispatch,
# so we can identify the new one we just kicked off
# (gh workflow run doesn't return the run-id directly).
before=$(gh run list \
           --repo "$REPO" \
           --workflow=app-state.yml \
           --branch=main \
           --limit 1 \
           --json databaseId -q '.[0].databaseId // "0"')

echo "→ dispatching app-state.yml on main with image_sha=${GITHUB_SHA}"
gh workflow run app-state.yml --repo "$REPO" --ref main \
  -f image_sha="${GITHUB_SHA}"

# Poll for a new run created AFTER our snapshot. GHA can take
# a few seconds to register a workflow_dispatch run.
run_id=""
for _ in $(seq 1 20); do
  sleep 3
  latest=$(gh run list \
             --repo "$REPO" \
             --workflow=app-state.yml \
             --branch=main \
             --limit 1 \
             --json databaseId,event -q '.[0]')
  id=$(echo "$latest" | jq -r '.databaseId // "0"')
  event=$(echo "$latest" | jq -r '.event // ""')
  if [ "$id" != "$before" ] && [ "$event" = "workflow_dispatch" ]; then
    run_id="$id"
    break
  fi
done

if [ -z "$run_id" ]; then
  echo "✗ app-state.yml didn't register a new run after dispatch"
  exit 1
fi

echo "→ following run #$run_id"

# Poll the SPECIFIC run for completion. Deterministic — no
# ambiguity about which run we're tracking.
deadline=$(( $(date +%s) + 1700 ))   # ~28 min, below job timeout
while true; do
  view=$(gh run view "$run_id" --repo "$REPO" --json status,conclusion 2>/dev/null || echo '{}')
  status=$(echo "$view" | jq -r '.status // "absent"')
  conclusion=$(echo "$view" | jq -r '.conclusion // ""')

  if [ "$status" = "completed" ]; then
    if [ "$conclusion" = "success" ]; then
      echo "→ app-state run #$run_id succeeded"
      exit 0
    fi
    echo "✗ app-state run #$run_id $conclusion — refusing to deploy"
    exit 1
  fi

  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "✗ app-state run #$run_id didn't finish within budget — abort"
    exit 1
  fi

  echo "  $status — waiting 30s"
  sleep 30
done
