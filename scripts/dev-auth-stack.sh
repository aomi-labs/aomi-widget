#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="$(cd "$ROOT_DIR/.." && pwd)"
PRODUCT_MONO_DIR="${PRODUCT_MONO_DIR:-$WORK_DIR/product-mono}"
PRODUCT_BACKEND_LAUNCHER="${PRODUCT_BACKEND_LAUNCHER:-$PRODUCT_MONO_DIR/run-local-backend.sh}"
PORTAL_DIR="$ROOT_DIR/apps/portal"

LOCAL_DB_URL="${AOMI_LOCAL_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/aomi_local}"
LOCAL_ADMIN_DB_URL="${AOMI_LOCAL_ADMIN_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
BACKEND_URL="${AOMI_LOCAL_BACKEND_URL:-http://127.0.0.1:8080}"
PORTAL_URL="${AOMI_LOCAL_PORTAL_URL:-http://127.0.0.1:3000}"

BACKEND_SESSION="${AOMI_BACKEND_TMUX_SESSION:-aomi-backend}"
PORTAL_SESSION="${AOMI_PORTAL_TMUX_SESSION:-aomi-portal}"
BACKEND_LOG="${AOMI_BACKEND_LOG:-/tmp/aomi-backend.log}"
PORTAL_LOG="${AOMI_PORTAL_LOG:-/tmp/aomi-portal.log}"

usage() {
  cat <<EOF
Usage: $0 [start|restart|stop|status|db]

Starts the merged BFF/BetterAuth local stack:
  backend  $BACKEND_URL  via product-mono/run-local-backend.sh
  portal   $PORTAL_URL   from this repo's apps/portal
  db       $LOCAL_DB_URL

Environment overrides:
  PRODUCT_MONO_DIR, PRODUCT_BACKEND_LAUNCHER, AOMI_LOCAL_DB_URL,
  AOMI_LOCAL_ADMIN_DB_URL, AOMI_BACKEND_LOG, AOMI_PORTAL_LOG
EOF
}

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

wait_for_url() {
  local label="$1"
  local url="$2"
  local max="${3:-90}"
  local code

  for _ in $(seq 1 "$max"); do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
    if [ "$code" = "200" ]; then
      echo "$label ready: $url"
      return 0
    fi
    sleep 2
  done

  echo "$label did not become ready: $url" >&2
  return 1
}

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti "tcp:$port" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "Stopping listener(s) on :$port: $pids"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 1
    pids="$(lsof -ti "tcp:$port" 2>/dev/null || true)"
    if [ -n "$pids" ]; then
      # shellcheck disable=SC2086
      kill -9 $pids 2>/dev/null || true
    fi
  fi
}

stop_stack() {
  tmux kill-session -t "$PORTAL_SESSION" 2>/dev/null || true
  tmux kill-session -t "$BACKEND_SESSION" 2>/dev/null || true
  kill_port 3000
  kill_port 8080
}

ensure_db_exists() {
  need psql

  if ! psql "$LOCAL_ADMIN_DB_URL" -tAc "select 1" >/dev/null 2>&1; then
    cat >&2 <<EOF
Cannot connect to local Postgres at 127.0.0.1:54322.
Start the local Supabase/OrbStack stack that exposes supabase_db_aomi-api-e2e-supabase.
EOF
    exit 1
  fi

  if ! psql "$LOCAL_ADMIN_DB_URL" -tAc "select 1 from pg_database where datname = 'aomi_local'" | grep -q 1; then
    echo "Creating local database aomi_local"
    psql "$LOCAL_ADMIN_DB_URL" -v ON_ERROR_STOP=1 -c "create database aomi_local"
  fi
}

ensure_backend_schema() {
  if psql "$LOCAL_DB_URL" -tAc "select to_regclass('public.users')" | grep -q users; then
    return 0
  fi

  if [ ! -d "$PRODUCT_MONO_DIR/supabase/migrations" ]; then
    echo "Missing product-mono migrations: $PRODUCT_MONO_DIR/supabase/migrations" >&2
    exit 1
  fi

  echo "Applying product-mono migrations into aomi_local"
  for migration in "$PRODUCT_MONO_DIR"/supabase/migrations/*.sql; do
    psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -q -f "$migration"
  done
}

ensure_auth_schema() {
  if [ ! -f "$ROOT_DIR/packages/auth/src/db/schema.sql" ]; then
    echo "Missing Aomi auth schema.sql" >&2
    exit 1
  fi

  echo "Ensuring Aomi auth tables"
  psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -q -f "$ROOT_DIR/packages/auth/src/db/schema.sql"

  if [ ! -x "$ROOT_DIR/node_modules/.bin/tsx" ]; then
    echo "Missing node_modules/.bin/tsx. Run pnpm install in $ROOT_DIR first." >&2
    exit 1
  fi

  local tmp_ts
  tmp_ts="$(mktemp /tmp/aomi-better-auth-migrate.XXXXXX.ts)"
  cat > "$tmp_ts" <<'TS'
import { pathToFileURL } from "node:url";
import { getMigrations } from "better-auth/db/migration";

(async () => {
  const root = process.cwd();
  const authModule = await import(
    pathToFileURL(`${root}/packages/auth/src/better-auth/auth.ts`).href
  );
  const migrations = await getMigrations(authModule.auth.options);
  await migrations.runMigrations();
  const created = migrations.toBeCreated.map((table) => table.table).join(", ");
  const added = migrations.toBeAdded.map((table) => table.table).join(", ");
  console.log(
    `BetterAuth schema ready: created=[${created || "none"}] added=[${added || "none"}]`,
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
TS

  (
    cd "$ROOT_DIR"
    set -a
    # shellcheck source=/dev/null
    source "$PORTAL_DIR/.env.local"
    set +a
    export DATABASE_URL="$LOCAL_DB_URL"
    "$ROOT_DIR/node_modules/.bin/tsx" "$tmp_ts"
  )
  rm -f "$tmp_ts"
}

ensure_db() {
  ensure_db_exists
  ensure_backend_schema
  ensure_auth_schema
}

start_backend() {
  if [ ! -f "$PRODUCT_BACKEND_LAUNCHER" ]; then
    cat >&2 <<EOF
Missing backend launcher: $PRODUCT_BACKEND_LAUNCHER
Expected the sibling product-mono helper described in docs/local-dev-stack.md.
EOF
    exit 1
  fi

  echo "Starting backend tmux session: $BACKEND_SESSION"
  rm -f "$BACKEND_LOG"
  tmux new-session -d -s "$BACKEND_SESSION" \
    "cd '$WORK_DIR' && bash '$PRODUCT_BACKEND_LAUNCHER' 2>&1 | tee '$BACKEND_LOG'"
  wait_for_url "backend" "$BACKEND_URL/health" 120
}

start_portal() {
  if [ ! -x "$PORTAL_DIR/node_modules/.bin/next" ]; then
    echo "Missing apps/portal/node_modules/.bin/next. Run pnpm install first." >&2
    exit 1
  fi

  echo "Starting merged portal tmux session: $PORTAL_SESSION"
  rm -f "$PORTAL_LOG"
  tmux new-session -d -s "$PORTAL_SESSION" \
    "cd '$PORTAL_DIR' && set -a && source .env.local && set +a && export DATABASE_URL='$LOCAL_DB_URL' && ./node_modules/.bin/next dev -H 127.0.0.1 -p 3000 2>&1 | tee '$PORTAL_LOG'"
  wait_for_url "portal" "$PORTAL_URL/" 90
}

status_stack() {
  echo "Health:"
  printf "  backend: "
  curl -s -o /dev/null -w "%{http_code} $BACKEND_URL/health\n" "$BACKEND_URL/health" || true
  printf "  portal:  "
  curl -s -o /dev/null -w "%{http_code} $PORTAL_URL/\n" "$PORTAL_URL/" || true

  echo
  echo "Listeners:"
  lsof -nP -iTCP:8080 -sTCP:LISTEN 2>/dev/null || true
  lsof -nP -iTCP:3000 -sTCP:LISTEN 2>/dev/null || true

  echo
  echo "Tmux:"
  tmux list-sessions 2>/dev/null | grep -E "($BACKEND_SESSION|$PORTAL_SESSION)" || true

  echo
  echo "Logs:"
  echo "  backend: $BACKEND_LOG"
  echo "  portal:  $PORTAL_LOG"
}

main() {
  local action="${1:-start}"
  need tmux
  need curl
  need lsof

  case "$action" in
    start|restart)
      stop_stack
      ensure_db
      start_backend
      start_portal
      status_stack
      ;;
    db)
      ensure_db
      ;;
    stop)
      stop_stack
      ;;
    status)
      status_stack
      ;;
    -h|--help|help)
      usage
      ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"
