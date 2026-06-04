#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${HEALTHCHECK_MODE:-auto}"
PORT="${PORT:-5000}"
URL="${HEALTHCHECK_URL:-http://127.0.0.1:${PORT}/api/v1/health}"
CMDLINE="$(tr '\0' ' ' < /proc/1/cmdline 2>/dev/null || true)"

check_process() {
  [[ "$CMDLINE" == *"node"* ]] && [[ "$CMDLINE" == *"dist/src/"* ]]
}

check_http() {
  curl --fail --silent --show-error --max-time "${HEALTHCHECK_TIMEOUT_SECONDS:-3}" "$URL" >/dev/null
}

case "$MODE" in
  http)
    check_http
    ;;
  process)
    check_process
    ;;
  auto)
    if [[ "$CMDLINE" == *"dist/src/main.js"* ]]; then
      check_http
    else
      check_process
    fi
    ;;
  *)
    printf 'Unsupported HEALTHCHECK_MODE=%s\n' "$MODE" >&2
    exit 1
    ;;
esac
