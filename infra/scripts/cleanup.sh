#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[cleanup] %s\n' "$*"
}

DRY_RUN="${DRY_RUN:-true}"
PRUNE_UNTIL="${PRUNE_UNTIL:-168h}"

if ! command -v docker >/dev/null 2>&1; then
  printf '[cleanup] ERROR: docker is required\n' >&2
  exit 1
fi

log "docker cleanup requested dry_run=${DRY_RUN} prune_until=${PRUNE_UNTIL}"

if [[ "$DRY_RUN" == "true" ]]; then
  log "dry run: images eligible for pruning"
  docker image ls --filter dangling=true
  log "set DRY_RUN=false to prune dangling images older than ${PRUNE_UNTIL}"
  exit 0
fi

docker image prune --force --filter "until=${PRUNE_UNTIL}"
docker builder prune --force --filter "until=${PRUNE_UNTIL}"
log "cleanup complete"
