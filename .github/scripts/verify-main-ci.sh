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
git cat-file -e "${CANDIDATE_SHA}^{commit}" 2>/dev/null || {
  echo "candidate_sha is not a commit in this repository" >&2
  exit 1
}
# A release candidate is deliberately frozen while main keeps moving (see
# release-policy.md, "Frontend Promotion"), so main HEAD has almost always
# advanced by the time production smoke finishes and npm publishing runs.
# Requiring HEAD equality here rejected exactly the SHA the release train is
# built around. Ancestry keeps the property that actually matters: the
# candidate is merged into main, reviewed, and immutable — while still
# refusing a branch tip, a fork, or a reverted commit.
git merge-base --is-ancestor "$CANDIDATE_SHA" origin/main || {
  echo "npm publishing only accepts a SHA merged into main" >&2
  exit 1
}
# Filter server-side on head_sha as well as branch: a candidate that has soaked
# for a while can otherwise fall outside the newest page of main's CI runs.
run_id="$(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/ci.yml/runs?branch=main&head_sha=$CANDIDATE_SHA&status=success&per_page=100" \
  --jq '.workflow_runs[].id' | head -n 1)"
test -n "$run_id" || {
  echo "No successful CI run exists for $CANDIDATE_SHA" >&2
  exit 1
}
echo "Verified successful CI run $run_id for $CANDIDATE_SHA"
