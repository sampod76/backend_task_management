#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

require_command docker
require_command curl

APP_DIR="${APP_DIR:-$(pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-infra/compose/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"
DEPLOY_STATE_DIR="${DEPLOY_STATE_DIR:-.deploy}"
GHCR_IMAGE="${GHCR_IMAGE:-ghcr.io/example/automation-service}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_REF="${IMAGE_REF:-${GHCR_IMAGE}:${IMAGE_TAG}}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${API_HOST_PORT:-5000}/api/v1/health}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_SLEEP_SECONDS="${HEALTH_SLEEP_SECONDS:-2}"

cd "$APP_DIR"
mkdir -p "$DEPLOY_STATE_DIR"

[[ -f "$COMPOSE_FILE" ]] || fail "compose file not found: $COMPOSE_FILE"
[[ -f "$ENV_FILE" ]] || fail "env file not found: $ENV_FILE"

log "deploying image ${IMAGE_REF}"
log "compose_file=${COMPOSE_FILE} env_file=${ENV_FILE}"

if [[ -n "${GHCR_USERNAME:-}" && -n "${GHCR_TOKEN:-}" ]]; then
  log "logging in to GHCR as ${GHCR_USERNAME}"
  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin >/dev/null
else
  log "GHCR credentials not provided; assuming image is public or docker is already logged in"
fi

if [[ -f "${DEPLOY_STATE_DIR}/current_image" ]]; then
  cp "${DEPLOY_STATE_DIR}/current_image" "${DEPLOY_STATE_DIR}/previous_image"
fi

printf '%s\n' "$IMAGE_REF" > "${DEPLOY_STATE_DIR}/pending_image"

log "pulling image on VPS"
docker pull "$IMAGE_REF"

export IMAGE_REF

log "restarting services"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans

log "waiting for API health at ${HEALTH_URL}"
for attempt in $(seq 1 "$HEALTH_RETRIES"); do
  if curl --fail --silent --show-error --max-time 5 "$HEALTH_URL" >/dev/null; then
    printf '%s\n' "$IMAGE_REF" > "${DEPLOY_STATE_DIR}/current_image"
    rm -f "${DEPLOY_STATE_DIR}/pending_image"
    date -u +"%Y-%m-%dT%H:%M:%SZ" > "${DEPLOY_STATE_DIR}/last_successful_deploy_at"
    log "deployment successful"
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
    exit 0
  fi

  log "health check pending (${attempt}/${HEALTH_RETRIES})"
  sleep "$HEALTH_SLEEP_SECONDS"
done

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
fail "deployment failed health check; run infra/deploy/rollback.sh to restore previous image"
