#!/bin/sh
# Regenerate the frontend's API types from the backend's OpenAPI schema.
#   scripts/gen-api-types.sh            regenerate (after changing API schemas)
#   scripts/gen-api-types.sh --check    fail if the committed types are stale (CI)
set -eu
cd "$(dirname "$0")/.."

podman-compose run --rm -T api python -m app.export_openapi > frontend/openapi.json
podman-compose run --rm -T web npm run -s gen:api

if [ "${1:-}" = "--check" ]; then
  if ! git diff --quiet -- frontend/openapi.json frontend/src/api/schema.d.ts; then
    echo "API types are out of date: run scripts/gen-api-types.sh and commit the result." >&2
    git --no-pager diff --stat -- frontend/openapi.json frontend/src/api/schema.d.ts >&2
    exit 1
  fi
  echo "API types are up to date."
fi
