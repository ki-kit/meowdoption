#!/bin/sh
# Production entrypoint: migrate, then serve.
set -eu

# The DB may still be starting (compose starts containers in parallel).
attempt=1
until alembic upgrade head; do
  if [ "$attempt" -ge 30 ]; then
    echo "Database not reachable after $attempt attempts, giving up." >&2
    exit 1
  fi
  # Usually the DB is still starting; the error above says if it's something else.
  echo "Migrations failed (attempt $attempt), retrying in 2 s..." >&2
  attempt=$((attempt + 1))
  sleep 2
done

# --proxy-headers: trust X-Forwarded-* from nginx. Safe with "*" because the
# API port is only reachable on the internal compose network, never published.
exec uvicorn app.main:app \
  --host 0.0.0.0 --port 8000 \
  --workers "${WEB_CONCURRENCY:-2}" \
  --proxy-headers --forwarded-allow-ips="*"
