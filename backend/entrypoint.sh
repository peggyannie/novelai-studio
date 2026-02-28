#!/usr/bin/env sh
set -eu

echo "Waiting for PostgreSQL at ${POSTGRES_SERVER:-db}:${POSTGRES_PORT:-5432}..."
while ! nc -z "${POSTGRES_SERVER:-db}" "${POSTGRES_PORT:-5432}"; do
  sleep 1
done

echo "Running database migrations..."
alembic upgrade head

echo "Starting backend service..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
