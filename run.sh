#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$ROOT_DIR/nextjs-kanban"
MODE="${1:-docker}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

write_docker_env() {
  local env_file="$APP_DIR/.env.docker"

  if [[ -f "$env_file" ]]; then
    return
  fi

  cat >"$env_file" <<'EOF'
POSTGRES_USER=kanban
POSTGRES_PASSWORD=kanban
POSTGRES_DB=kanban
DATABASE_URL=postgresql://kanban:kanban@db:5432/kanban
NODE_ENV=development
# Optional AI providers:
# ANTHROPIC_API_KEY=
# OPENAI_API_KEY=
# GEMINI_API_KEY=
EOF

  echo "Created $env_file"
}

write_local_env() {
  local env_file="$APP_DIR/.env.local"

  if [[ -f "$env_file" ]]; then
    return
  fi

  cat >"$env_file" <<'EOF'
DATABASE_URL=postgresql://kanban:kanban@localhost:5432/kanban
NODE_ENV=development
# Optional AI providers:
# ANTHROPIC_API_KEY=
# OPENAI_API_KEY=
# GEMINI_API_KEY=
EOF

  echo "Created $env_file"
}

install_deps() {
  require_cmd npm

  if [[ ! -d "$APP_DIR/node_modules" ]]; then
    echo "Installing nextjs-kanban dependencies..."
    (cd "$APP_DIR" && npm install)
  fi
}

run_check() {
  install_deps
  echo "Running prisma generate..."
  (cd "$APP_DIR" && npm run db:generate)

  echo "Running Next.js build..."
  (
    cd "$APP_DIR"
    DATABASE_URL="${DATABASE_URL:-postgresql://kanban:kanban@localhost:5432/kanban}" npm run build
  )

  echo "Running ESLint..."
  (cd "$APP_DIR" && npm run lint)
}

run_docker() {
  require_cmd docker
  write_docker_env
  echo "Starting Docker Compose from $APP_DIR..."
  cd "$APP_DIR"
  docker compose up --build
}

run_local() {
  install_deps
  write_local_env

  echo "Generating Prisma client..."
  (cd "$APP_DIR" && npm run db:generate)

  echo "Starting Next.js locally from $APP_DIR..."
  echo "Expected local database: ${DATABASE_URL:-postgresql://kanban:kanban@localhost:5432/kanban}"
  cd "$APP_DIR"
  npm run dev
}

show_help() {
  cat <<'EOF'
Usage: ./run.sh [docker|local|check|install|help]

docker  Start the maintained app with Docker Compose (default)
local   Start the maintained app locally with npm
check   Run prisma generate, build, and lint
install Install npm dependencies for nextjs-kanban
help    Show this message
EOF
}

case "$MODE" in
  docker)
    run_docker
    ;;
  local)
    run_local
    ;;
  check)
    run_check
    ;;
  install)
    install_deps
    ;;
  help|-h|--help)
    show_help
    ;;
  *)
    echo "Unknown mode: $MODE" >&2
    show_help >&2
    exit 1
    ;;
esac
