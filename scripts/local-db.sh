#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.local.yml"
ENV_FILE="$ROOT_DIR/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT_DIR/.env.local.example" "$ENV_FILE"
  echo "Created $ENV_FILE from .env.local.example; review local values before continuing."
fi

set -a
source "$ENV_FILE"
set +a

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

case "${1:-start}" in
  start)
    compose up -d postgres
    compose run --rm migrate
    compose up -d backend
    compose ps
    ;;
  stop)
    compose stop backend postgres
    ;;
  down)
    compose down
    ;;
  logs)
    compose logs -f --tail=200 "${2:-backend}"
    ;;
  migrate)
    compose run --rm migrate
    ;;
  reset)
    compose down -v
    compose up -d postgres
    compose run --rm migrate
    compose up -d backend
    compose ps
    ;;
  status)
    compose ps
    ;;
  *)
    echo "Usage: $0 {start|stop|down|logs [service]|migrate|reset|status}" >&2
    exit 2
    ;;
esac
