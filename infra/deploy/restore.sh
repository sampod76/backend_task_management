#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[restore] %s\n' "$*"
}

fail() {
  printf '[restore] ERROR: %s\n' "$*" >&2
  exit 1
}

command -v pg_restore >/dev/null 2>&1 || fail "pg_restore is required on the VPS"

APP_DIR="${APP_DIR:-$(pwd)}"
ENV_FILE="${ENV_FILE:-.env}"
RESTORE_FILE="${RESTORE_FILE:-${1:-}}"
CONFIRM_RESTORE="${CONFIRM_RESTORE:-false}"

cd "$APP_DIR"

[[ -n "$RESTORE_FILE" ]] || fail "set RESTORE_FILE or pass the backup path as the first argument"
[[ -f "$RESTORE_FILE" ]] || fail "restore file not found: $RESTORE_FILE"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

[[ -n "${DATABASE_URL:-}" ]] || fail "DATABASE_URL is required"

if [[ "$CONFIRM_RESTORE" != "true" ]]; then
  printf 'This will restore %s into the configured database.\n' "$RESTORE_FILE"
  printf 'Type RESTORE to continue: '
  read -r answer
  [[ "$answer" == "RESTORE" ]] || fail "restore cancelled"
fi

log "restoring PostgreSQL backup from ${RESTORE_FILE}"
pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DATABASE_URL" "$RESTORE_FILE"
log "restore complete"
