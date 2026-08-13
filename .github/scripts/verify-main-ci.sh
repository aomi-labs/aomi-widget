#!/usr/bin/env bash
set -euo pipefail

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${CANDIDATE_SHA:?CANDIDATE_SHA is required}"

[[ "$CANDIDATE_SHA" =~ ^[0-9a-f]{40}$ ]] || {
  echo "candidate_sha must be a full lowercase commit SHA" >&2
  exit 1
}
git fetch origin main --quiet
test "$CANDIDATE_SHA" = "$(git rev-parse origin/main)" || {
  echo "npm publishing only accepts the current main SHA" >&2
  exit 1
}
run_id="$(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/ci.yml/runs?branch=main&status=success&per_page=100" \
  --jq ".workflow_runs[] | select(.head_sha == \"$CANDIDATE_SHA\") | .id" | head -n 1)"
test -n "$run_id" || {
  echo "No successful CI run exists for $CANDIDATE_SHA" >&2
  exit 1
}
echo "Verified successful CI run $run_id for $CANDIDATE_SHA"
