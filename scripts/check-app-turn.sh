#!/usr/bin/env bash
# Drive one full chat turn against a deployed app and report what came back.
#
# Reading thread state alone is not enough to tell a healthy app from a broken
# one: a thread that was never sent a message looks identical to a thread whose
# every turn is refused by the provider. So this creates a thread, sends a turn,
# polls to completion, and then asserts on the result.
#
# Usage:
#   scripts/check-app-turn.sh <app> <application_id> [message] [backend]
#
# Example (the app whose `get_risk_snapshot` schema broke every turn):
#   scripts/check-app-turn.sh somm-agent 2937568
#
# Exit codes: 0 the app answered, 1 it did not.

set -euo pipefail

APP="${1:?usage: check-app-turn.sh <app> <application_id> [message] [backend]}"
APPLICATION_ID="${2:?missing application_id}"
MESSAGE="${3:-hi}"
BACKEND="${4:-https://api-staging.aomi.dev}"

THREAD_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
CLIENT_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
USER_STATE='{"connection":{"is_connected":false},"ext":{"client_type":"web_ui"}}'
COMMON="app=${APP}&application_id=${APPLICATION_ID}&client_id=${CLIENT_ID}"
HDR=(-H "X-Thread-Id: ${THREAD_ID}" -H "X-Session-Id: ${THREAD_ID}")

say() { printf '%s\n' "$*" >&2; }

say "thread ${THREAD_ID} · app ${APP} (${APPLICATION_ID}) · ${BACKEND}"

# A cold app 503s at the edge until an origin loads its artifact. That is the
# warm-up race the client now retries through, so retry here too rather than
# reporting a transient 503 as a broken app.
for attempt in 1 2 3 4 5; do
  create_status="$(curl -s -o /tmp/aomi-create.$$ -w '%{http_code}' -X POST \
    "${BACKEND}/api/threads?${COMMON}" "${HDR[@]}")"
  [ "$create_status" = "503" ] || break
  say "  create → 503 (app warming), retry ${attempt}"
  sleep 2
done

if [ "$create_status" != "200" ]; then
  say "FAIL: could not create thread (HTTP ${create_status})"
  cat /tmp/aomi-create.$$ >&2 || true
  rm -f /tmp/aomi-create.$$
  exit 1
fi
rm -f /tmp/aomi-create.$$
say "  create → 200"

chat_status="$(curl -s -o /dev/null -w '%{http_code}' -X POST \
  "${BACKEND}/api/thread/chat?${COMMON}&message=$(printf %s "$MESSAGE" | jq -sRr @uri)&user_state=$(printf %s "$USER_STATE" | jq -sRr @uri)" \
  "${HDR[@]}")"
say "  chat   → ${chat_status}"

STATE_FILE="$(mktemp)"
trap 'rm -f "$STATE_FILE"' EXIT

for _ in $(seq 1 30); do
  curl -s "${BACKEND}/api/thread/state?${COMMON}&user_state=$(printf %s "$USER_STATE" | jq -sRr @uri)" \
    "${HDR[@]}" >"$STATE_FILE"
  if [ "$(jq -r '.is_processing' <"$STATE_FILE")" = "false" ] &&
    [ "$(jq -r '(.messages | length) > 1 or ((.system_events // []) | length) > 0' <"$STATE_FILE")" = "true" ]; then
    break
  fi
  sleep 2
done

say ""
say "── transcript ──"
jq -r '.messages[]? | "  \(.sender): \(.content | .[0:120])"' <"$STATE_FILE" >&2
events="$(jq -r '(.system_events // [])[] | tostring' <"$STATE_FILE")"
if [ -n "$events" ]; then
  say "── system events ──"
  printf '  %s\n' "$events" >&2
fi
say ""

fail=0

if jq -e '[.messages[]? | select(.sender == "agent" and (.content | length) > 0)] | length > 0' <"$STATE_FILE" >/dev/null; then
  say "PASS: the app answered"
else
  say "FAIL: no assistant message — the app accepted the turn and said nothing"
  fail=1
fi

# The specific defect this check exists for: one tool schema the provider
# rejects makes it refuse the whole completion, so every turn dies.
if grep -q 'invalid_function_parameters' "$STATE_FILE"; then
  say "FAIL: provider rejected a tool schema (invalid_function_parameters)"
  say "      the offending tool should have been repaired or dropped before the call"
  fail=1
fi

# A dropped tool is the intended fallback, not a failure: the app still answers.
if jq -e '[.messages[]? | select(.sender == "notice")] | length > 0' <"$STATE_FILE" >/dev/null; then
  say "note: a durable failure notice is present in the transcript"
fi

exit "$fail"
