#!/usr/bin/env bash
# =============================================================================
# dev-ngrok.sh — run `next dev` for the portal behind an ngrok tunnel.
# =============================================================================
#
# Required for the MCP/auth dev loop because:
#   - Claude Desktop / Codex needs an HTTPS URL to reach the MCP endpoint.
#   - OAuth providers (real ones, post-v1) require a public callback URL.
#   - The auth flow embeds `AOMI_PORTAL_BASE_URL` in auth_url responses; we
#     export the ngrok URL so the user can click through from anywhere.
#
# Usage:
#   AOMI_AUTH_TOKEN=... AOMI_BE_URL=http://localhost:8080 ./scripts/dev-ngrok.sh
#
# Adapted from apps/base/scripts/dev-ngrok.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

PORT="${PORT:-3000}"
HOST="${HOST:-127.0.0.1}"
NGROK_API_URL="${NGROK_API_URL:-http://127.0.0.1:4040/api/tunnels}"

APP_PID=""
NGROK_PID=""

cleanup() {
  local pids=()
  [[ -n "${APP_PID:-}" ]] && pids+=("$APP_PID")
  [[ -n "${NGROK_PID:-}" ]] && pids+=("$NGROK_PID")
  if [[ ${#pids[@]} -gt 0 ]]; then
    kill "${pids[@]}" 2>/dev/null || true
  fi
}

trap 'cleanup; exit 0' INT TERM EXIT

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok not found. Install it first: brew install ngrok"
  exit 1
fi

pkill -f "ngrok http ${PORT}" 2>/dev/null || true

port_pids="$(lsof -ti "tcp:${PORT}" 2>/dev/null || true)"
if [[ -n "$port_pids" ]]; then
  while IFS= read -r pid; do
    [[ -n "$pid" ]] && kill -9 "$pid"
  done <<<"$port_pids"
fi

# Start ngrok first so we can pin AOMI_PORTAL_BASE_URL before next dev boots.
ngrok http "${PORT}" --log=stdout --log-format=json >/dev/null &
NGROK_PID=$!

NGROK_URL=""
for _ in $(seq 1 20); do
  NGROK_URL="$(
    curl -s "$NGROK_API_URL" 2>/dev/null \
      | grep -o '"public_url":"https://[^"]*"' \
      | head -1 \
      | cut -d'"' -f4
  )" || true
  [[ -n "$NGROK_URL" ]] && break
  sleep 1
done

if [[ -z "$NGROK_URL" ]]; then
  echo "Failed to acquire ngrok public URL"
  exit 1
fi

export AOMI_PORTAL_BASE_URL="$NGROK_URL"
export AOMI_BE_URL="${AOMI_BE_URL:-http://localhost:8080}"
export AOMI_AUTH_TOKEN="${AOMI_AUTH_TOKEN:-dev-aomi-auth-token}"
export AOMI_DEV_USER_ID="${AOMI_DEV_USER_ID:-00000000-0000-0000-0000-000000000001}"

pushd "$PROJECT_ROOT" >/dev/null
pnpm run dev --port "$PORT" --hostname 0.0.0.0 &
APP_PID=$!
popd >/dev/null

echo "Starting portal on http://${HOST}:${PORT}"
for _ in $(seq 1 30); do
  if curl -sf "http://${HOST}:${PORT}" >/dev/null; then
    break
  fi
  sleep 1
done

cat <<EOF

Portal ready.
  Local:    http://${HOST}:${PORT}
  Public:   ${NGROK_URL}
  MCP URL:  ${NGROK_URL}/api/mcp/http
  ngrok UI: http://127.0.0.1:4040

Env in use:
  AOMI_BE_URL=${AOMI_BE_URL}
  AOMI_AUTH_TOKEN=${AOMI_AUTH_TOKEN}
  AOMI_PORTAL_BASE_URL=${AOMI_PORTAL_BASE_URL}
  AOMI_DEV_USER_ID=${AOMI_DEV_USER_ID}

Quick sanity check:
  curl -X POST ${NGROK_URL}/api/auth/begin \\
    -H 'Content-Type: application/json' \\
    -H "X-Aomi-Auth: ${AOMI_AUTH_TOKEN}" \\
    -d '{"user_id":"${AOMI_DEV_USER_ID}","provider":"dummy"}'

EOF

wait "$APP_PID"
