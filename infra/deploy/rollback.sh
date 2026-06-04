#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[rollback] %s\n' "$*"
}

fail() {
  printf '[rollback] ERROR: %s\n' "$*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "docker is required"
command -v curl >/dev/null 2>&1 || fail "curl is required"

APP_DIR="${APP_DIR:-$(pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-infra/compose/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"
DEPLOY_STATE_DIR="${DEPLOY_STATE_DIR:-.deploy}"
PREVIOUS_IMAGE_FILE="${PREVIOUS_IMAGE_FILE:-${DEPLOY_STATE_DIR}/previous_image}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${API_HOST_PORT:-5000}/api/v1/health}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_SLEEP_SECONDS="${HEALTH_SLEEP_SECONDS:-2}"

cd "$APP_DIR"

[[ -f "$PREVIOUS_IMAGE_FILE" ]] || fail "no previous image recorded at ${PREVIOUS_IMAGE_FILE}"
IMAGE_REF="$(tr -d '[:space:]' < "$PREVIOUS_IMAGE_FILE")"
[[ -n "$IMAGE_REF" ]] || fail "previous image file is empty"

log "rolling back to ${IMAGE_REF}"
docker pull "$IMAGE_REF"

export IMAGE_REF
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans

for attempt in $(seq 1 "$HEALTH_RETRIES"); do
  if curl --fail --silent --show-error --max-time 5 "$HEALTH_URL" >/dev/null; then
    printf '%s\n' "$IMAGE_REF" > "${DEPLOY_STATE_DIR}/current_image"
    date -u +"%Y-%m-%dT%H:%M:%SZ" > "${DEPLOY_STATE_DIR}/last_successful_rollback_at"
    log "rollback successful"
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
    exit 0
  fi

  log "health check pending (${attempt}/${HEALTH_RETRIES})"
  sleep "$HEALTH_SLEEP_SECONDS"
done

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
fail "rollback image did not become healthy"
