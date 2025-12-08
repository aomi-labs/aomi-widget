#!/usr/bin/env bash
set -euo pipefail

# This script finds summary files across multiple worktrees and combines them
# Usage: sync.sh [SOURCE_PROJECT_DIR] [DATE]

TEAMSPACE_DIR="/Users/aomi/Code/aomi-teamspace/updates/cecilia"
REPO_ROOT="/Users/aomi/Code/aomi-teamspace"

# Accept source project directory as first argument, default to current script's project
if [ $# -gt 0 ]; then
  SOURCE_PROJECT_DIR="$1"
else
  # Default to the directory where this script is located (go up 2 levels from .claude/scripts/)
  SOURCE_PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi

# Accept date as second argument, default to today
if [ $# -gt 1 ]; then
  DATE="$2"
else
  DATE="$(date +%F)"                             # e.g., 2025-09-22
fi

OUTFILE="${TEAMSPACE_DIR}/${DATE}.md"
mkdir -p "$TEAMSPACE_DIR"

# Find all worktrees for this repository
cd "$SOURCE_PROJECT_DIR"
WORKTREES=($(git worktree list --porcelain | grep "worktree " | cut -d' ' -f2-))

# If no worktrees found, fall back to current directory
if [ ${#WORKTREES[@]} -eq 0 ]; then
  WORKTREES=("$SOURCE_PROJECT_DIR")
fi

SUMMARY_FILES=()

# Find summary files across all worktrees
for worktree in "${WORKTREES[@]}"; do
  SUMMARY_FILE="${worktree}/.claude/history/${DATE}-summary.md"
  if [ -f "$SUMMARY_FILE" ]; then
    SUMMARY_FILES+=("$SUMMARY_FILE")
  fi
done

# Check if any summary files exist
if [ ${#SUMMARY_FILES[@]} -eq 0 ]; then
  echo "Error: No summary files found for date $DATE across any worktrees" >&2
  echo "Searched worktrees:" >&2
  printf "%s\n" "${WORKTREES[@]}" >&2
  exit 1
fi

# Get today's git activity from the source repository
cd "$SOURCE_PROJECT_DIR"

# Get today's date in git format
TODAY_DATE=$(date +%Y-%m-%d)

# Collect git activity information
GIT_ACTIVITY=$(cat <<EOF

## Repository Activities & Active Branches

### Today's Commits ($TODAY_DATE)
$(git log --oneline --since="$TODAY_DATE 00:00:00" --until="$TODAY_DATE 23:59:59" --all --pretty=format:"- %h %s (%an, %ar)" 2>/dev/null || echo "No commits found for today")

### Branches Worked On
$(git for-each-ref --format='- %(refname:short) (last commit: %(committerdate:relative))' refs/heads/ 2>/dev/null | head -10)

### Current Branch Status
- Current branch: $(git branch --show-current 2>/dev/null || echo "unknown")
- Working directory status: $(git status --porcelain 2>/dev/null | wc -l | xargs echo) files with changes

EOF
)

# Combine all summary files with worktree divisors
echo "# Combined Daily Summary for $DATE" > "$OUTFILE"
echo "" >> "$OUTFILE"

for i in "${!SUMMARY_FILES[@]}"; do
  SUMMARY_FILE="${SUMMARY_FILES[$i]}"

  # Extract worktree path and get branch name
  WORKTREE_PATH=$(dirname $(dirname $(dirname "$SUMMARY_FILE")))
  cd "$WORKTREE_PATH"
  BRANCH_NAME=$(git branch --show-current 2>/dev/null || echo "unknown")
  WORKTREE_NAME=$(basename "$WORKTREE_PATH")

  # Add worktree divisor
  if [ $i -gt 0 ]; then
    echo "" >> "$OUTFILE"
    echo "---" >> "$OUTFILE"
    echo "" >> "$OUTFILE"
  fi

  echo "## Worktree: $WORKTREE_NAME (branch: $BRANCH_NAME)" >> "$OUTFILE"
  echo "_Path: ${WORKTREE_PATH}_" >> "$OUTFILE"
  echo "" >> "$OUTFILE"

  # Append the summary content (skip the first line if it's a title to avoid duplicate titles)
  tail -n +2 "$SUMMARY_FILE" >> "$OUTFILE"
done

# Append git activity from the main worktree
echo "" >> "$OUTFILE"
echo "---" >> "$OUTFILE"
echo "$GIT_ACTIVITY" >> "$OUTFILE"

cd "$REPO_ROOT"

# Pull latest changes from main branch
git pull origin main

# Stage the updated file
git add "$OUTFILE"

# Commit if there are staged changes
if ! git diff --cached --quiet; then
  git commit -m "update: daily summary for ${DATE} by cecilia"
  git push origin main
else
  echo "No changes to commit. Skipping push."
fi

echo "Combined ${#SUMMARY_FILES[@]} summary file(s) from worktrees and synced to: $OUTFILE"
echo "Worktrees processed:"
for summary_file in "${SUMMARY_FILES[@]}"; do
  worktree_path=$(dirname $(dirname $(dirname "$summary_file")))
  echo "  - $(basename "$worktree_path"): $summary_file"
done

