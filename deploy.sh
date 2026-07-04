#!/usr/bin/env bash
set -euo pipefail

APP_NAME="eicholtz"
DEFAULT_REMOTE="dev2@94.131.93.142"
DEFAULT_REMOTE_DIR="~/eicholtz"
APP_PORT="${APP_PORT:-3000}"

usage() {
  cat <<EOF
Usage:
  ./deploy.sh                 Deploy on this machine (run on server in project dir)
  ./deploy.sh --remote        Deploy to default server (${DEFAULT_REMOTE})
  ./deploy.sh --remote USER@HOST [REMOTE_DIR]

Examples:
  ./deploy.sh
  ./deploy.sh --remote
  ./deploy.sh --remote dev2@94.131.93.142
  ./deploy.sh --remote dev2@94.131.93.142 ~/apps/eicholtz

Environment:
  APP_PORT       Port exposed on host (default: 3000)
  SKIP_BUILD=1   Skip "docker compose build"
EOF
}

log() {
  printf '==> %s\n' "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

require_docker() {
  command -v docker >/dev/null 2>&1 || fail "Docker not found"
  docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin not found"
}

deploy_local() {
  local app_dir
  app_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$app_dir"

  require_docker
  log "Deploy directory: $app_dir"

  if [[ ! -f .env ]]; then
    log "Creating .env from .env.example"
    cp .env.example .env
    log "Edit .env before production use (passwords, JWT_SECRET)"
  fi

  mkdir -p public/images/products public/images/news public/images/seasons public/images/collections

  if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
    log "Building containers..."
    docker compose build
  else
    log "Skipping build (SKIP_BUILD=1)"
  fi

  log "Starting containers..."
  docker compose up -d

  log "Waiting for health check..."
  ready=0
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 2
  done

  if [[ "$ready" -ne 1 ]]; then
    log "Health check failed. Recent logs:"
    docker compose logs --tail=50 app || true
    fail "App did not become healthy on port ${APP_PORT}"
  fi

  log "Containers:"
  docker compose ps

  health="$(curl -fsS "http://127.0.0.1:${APP_PORT}/api/health")"
  log "Health: $health"
  log "Site:  http://127.0.0.1:${APP_PORT}"
  log "Admin: http://127.0.0.1:${APP_PORT}/admin/login"
  log "Done."
}

deploy_remote() {
  local remote="${1:-$DEFAULT_REMOTE}"
  local remote_dir="${2:-$DEFAULT_REMOTE_DIR}"
  local local_dir
  local_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  command -v rsync >/dev/null 2>&1 || fail "rsync not found (install: sudo apt install rsync)"
  command -v ssh >/dev/null 2>&1 || fail "ssh not found"

  log "Syncing project to ${remote}:${remote_dir}"
  ssh "$remote" "mkdir -p ${remote_dir}"

  rsync -avz --delete \
    --exclude node_modules \
    --exclude dist \
    --exclude .git \
    --exclude .env \
    --exclude pgdata \
    "${local_dir}/" "${remote}:${remote_dir}/"

  log "Running deploy on server..."
  ssh "$remote" "cd ${remote_dir} && chmod +x deploy.sh && APP_PORT=${APP_PORT} ./deploy.sh"

  log "Remote deploy finished."
  log "Open: http://94.131.93.142:${APP_PORT} (if port ${APP_PORT} is open in security group)"
}

case "${1:-}" in
  -h|--help)
    usage
    exit 0
    ;;
  --remote)
    deploy_remote "${2:-$DEFAULT_REMOTE}" "${3:-$DEFAULT_REMOTE_DIR}"
    ;;
  "")
    deploy_local
    ;;
  *)
    fail "Unknown argument: $1 (use --help)"
    ;;
esac
