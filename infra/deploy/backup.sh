#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[backup] %s\n' "$*"
}

fail() {
  printf '[backup] ERROR: %s\n' "$*" >&2
  exit 1
}

command -v pg_dump >/dev/null 2>&1 || fail "pg_dump is required on the VPS"

APP_DIR="${APP_DIR:-$(pwd)}"
ENV_FILE="${ENV_FILE:-.env}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

cd "$APP_DIR"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

[[ -n "${DATABASE_URL:-}" ]] || fail "DATABASE_URL is required"

mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
backup_file="${BACKUP_DIR}/automation-db-${timestamp}.dump"
metadata_file="${BACKUP_DIR}/automation-db-${timestamp}.metadata"

log "creating PostgreSQL backup at ${backup_file}"
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file "$backup_file"

{
  printf 'created_at=%s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  printf 'app_dir=%s\n' "$APP_DIR"
  printf 'current_image=%s\n' "$(cat .deploy/current_image 2>/dev/null || true)"
  printf 'database_url_present=true\n'
} > "$metadata_file"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$backup_file" > "${backup_file}.sha256"
fi

find "$BACKUP_DIR" -type f -name 'automation-db-*' -mtime "+${KEEP_DAYS}" -print -delete

log "backup complete"
