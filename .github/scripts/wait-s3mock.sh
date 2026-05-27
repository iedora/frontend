#!/usr/bin/env bash
# Waits for the S3Mock service and creates the menu-test bucket.
set -euo pipefail

for _ in $(seq 1 30); do
  if curl -fsS http://localhost:9090/ >/dev/null 2>&1; then
    echo "S3Mock ready"; break
  fi
  sleep 1
done

curl -fsS -X PUT http://localhost:9090/menu-test
echo "menu-test bucket ready"
