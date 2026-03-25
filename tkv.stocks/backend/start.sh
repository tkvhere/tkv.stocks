#!/bin/sh
# Fail on any error
set -eu
# Run migrations if psql is available (non-fatal)
if command -v psql >/dev/null 2>&1; then
  psql "$DATABASE_URL" -f /usr/src/app/migrations/create_tables.sql || true
fi
# Start Flask development server
export FLASK_APP=app.__init__
exec flask run --host=0.0.0.0 --port=5000
