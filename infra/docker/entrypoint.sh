#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[entrypoint] %s\n' "$*"
}

warn() {
  printf '[entrypoint] WARN: %s\n' "$*" >&2
}

fail() {
  printf '[entrypoint] ERROR: %s\n' "$*" >&2
  exit 1
}

mask_value() {
  local value="${1:-}"
  if [[ -z "$value" ]]; then
    printf '<empty>'
  elif (( ${#value} <= 6 )); then
    printf '******'
  else
    printf '%s******%s' "${value:0:2}" "${value: -2}"
  fi
}

log "starting service command: $*"
log "node_env=${NODE_ENV:-unset} port=${PORT:-unset}"

if [[ -n "${DATABASE_HOST:-}" ]]; then
  log "database_host=${DATABASE_HOST} database_port=${DATABASE_PORT:-5432}"
elif [[ -n "${DATABASE_URL:-}" ]]; then
  log "database_url=$(mask_value "$DATABASE_URL")"
else
  warn "DATABASE_URL or DATABASE_HOST is not set"
fi

if [[ -n "${REDIS_HOST:-}" ]]; then
  log "redis_host=${REDIS_HOST} redis_port=${REDIS_PORT:-6379} redis_tls=${REDIS_TLS:-false}"
else
  warn "REDIS_HOST is not set"
fi

if [[ "${WAIT_FOR_SERVICES:-true}" == "true" ]]; then
  /usr/local/bin/wait-db.sh
fi

if [[ "${RUN_MIGRATIONS:-false}" == "true" ]]; then
  log "RUN_MIGRATIONS=true; applying Prisma migrations"
  pnpm prisma migrate deploy
else
  log "RUN_MIGRATIONS=${RUN_MIGRATIONS:-false}; skipping Prisma migrations"
fi

exec "$@"
