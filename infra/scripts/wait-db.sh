#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[wait-db] %s\n' "$*"
}

warn() {
  printf '[wait-db] WARN: %s\n' "$*" >&2
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf '[wait-db] ERROR: missing required command: %s\n' "$1" >&2
    exit 1
  }
}

WAIT_RETRIES="${WAIT_RETRIES:-30}"
WAIT_SLEEP_SECONDS="${WAIT_SLEEP_SECONDS:-2}"
DATABASE_PORT="${DATABASE_PORT:-5432}"
REDIS_PORT="${REDIS_PORT:-6379}"

wait_for_postgres() {
  require_command pg_isready

  if [[ -n "${DATABASE_HOST:-}" ]]; then
    for attempt in $(seq 1 "$WAIT_RETRIES"); do
      if PGPASSWORD="${DATABASE_PASSWORD:-}" pg_isready \
        --host "$DATABASE_HOST" \
        --port "$DATABASE_PORT" \
        --username "${DATABASE_USER:-postgres}" \
        --dbname "${DATABASE_NAME:-postgres}" >/dev/null 2>&1; then
        log "PostgreSQL is ready at ${DATABASE_HOST}:${DATABASE_PORT}"
        return 0
      fi

      log "waiting for PostgreSQL (${attempt}/${WAIT_RETRIES})"
      sleep "$WAIT_SLEEP_SECONDS"
    done

    printf '[wait-db] ERROR: PostgreSQL did not become ready at %s:%s\n' "$DATABASE_HOST" "$DATABASE_PORT" >&2
    return 1
  fi

  if [[ -n "${DATABASE_URL:-}" ]]; then
    for attempt in $(seq 1 "$WAIT_RETRIES"); do
      if pg_isready --dbname "$DATABASE_URL" >/dev/null 2>&1; then
        log "PostgreSQL is ready from DATABASE_URL"
        return 0
      fi

      log "waiting for PostgreSQL from DATABASE_URL (${attempt}/${WAIT_RETRIES})"
      sleep "$WAIT_SLEEP_SECONDS"
    done

    printf '[wait-db] ERROR: PostgreSQL did not become ready from DATABASE_URL\n' >&2
    return 1
  fi

  warn "DATABASE_HOST and DATABASE_URL are unset; skipping PostgreSQL readiness"
}

wait_for_redis() {
  require_command redis-cli

  if [[ -z "${REDIS_HOST:-}" ]]; then
    warn "REDIS_HOST is unset; skipping Redis readiness"
    return 0
  fi

  local redis_args=(--no-auth-warning -h "$REDIS_HOST" -p "$REDIS_PORT")

  if [[ -n "${REDIS_PASSWORD:-}" ]]; then
    redis_args+=(-a "$REDIS_PASSWORD")
  fi

  if [[ "${REDIS_TLS:-false}" == "true" ]]; then
    redis_args+=(--tls)
  fi

  for attempt in $(seq 1 "$WAIT_RETRIES"); do
    if redis-cli "${redis_args[@]}" ping 2>/dev/null | grep -q '^PONG$'; then
      log "Redis is ready at ${REDIS_HOST}:${REDIS_PORT}"
      return 0
    fi

    log "waiting for Redis (${attempt}/${WAIT_RETRIES})"
    sleep "$WAIT_SLEEP_SECONDS"
  done

  printf '[wait-db] ERROR: Redis did not become ready at %s:%s\n' "$REDIS_HOST" "$REDIS_PORT" >&2
  return 1
}

wait_for_postgres
wait_for_redis
