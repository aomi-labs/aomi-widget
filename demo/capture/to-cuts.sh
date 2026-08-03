#!/usr/bin/env bash
# Derive the short-form cuts from a recorded master using its markers —
# never by re-shooting (re-shooting is how demo libraries drift apart).
#
#   demo/capture/to-cuts.sh <scenario-id> [speed]
#
# Emits, alongside the existing BD cut (<id>-2x.mp4 from to-mp4.sh):
#   <id>-social-2x.mp4   the trailing turns that fit a 90s real-time
#                        window — the ask + payoff without the setup
#   <id>-turn<N>-2x.mp4  one segment per conversation turn, for docs
#
# Marker offsets are recorded in REAL time against the .webm master;
# cutting happens in real time FIRST, then the speed-up is applied, so
# the marker math never has to know about playback speed.
set -euo pipefail

SCENARIO="${1:?usage: to-cuts.sh <scenario-id> [speed]}"
SPEED="${2:-2}"
DIR="demo/out/${SCENARIO}"
MARKERS="${DIR}/markers.json"

SRC=$(ls "${DIR}"/*.webm 2>/dev/null | head -1)
if [[ -z "${SRC}" || ! -f "${MARKERS}" ]]; then
  echo "need both a .webm master and markers.json in ${DIR}" >&2
  exit 1
fi

# Turn windows + social window, computed from markers in one place.
# Prints lines:  social <start> <end>   /   turn <n> <start> <end>
PLAN=$(python3 - "$MARKERS" <<'EOF'
import json, sys

markers = json.load(open(sys.argv[1]))["markers"]
end_of_take = max(m["offsetMs"] for m in markers) / 1000 + 1.0

# Turns: prompt-typed .. response-complete pairs, in order. A turn's
# response-complete is the LAST one before the next prompt-typed (settle
# waits can emit several).
starts = [m["offsetMs"] / 1000 for m in markers if m["name"] == "prompt-typed"]
completes = [m["offsetMs"] / 1000 for m in markers if m["name"] == "response-complete"]
turns = []
for i, s in enumerate(starts):
    nxt = starts[i + 1] if i + 1 < len(starts) else float("inf")
    ends = [c for c in completes if s < c < nxt]
    if ends:
        turns.append((max(0.0, s - 1.0), min(end_of_take, max(ends) + 1.5)))

for n, (s, e) in enumerate(turns, 1):
    print(f"turn {n} {s:.2f} {e:.2f}")

# Social: trailing turns that fit 90s of real time — the payoff without
# the setup. If even the last turn alone overflows or is a stub (<15s),
# fall back to the final 90s of the take.
WINDOW, MIN_LEN = 90.0, 15.0
start = None
for s, e in reversed(turns):
    if end_of_take - s <= WINDOW:
        start = s
    else:
        break
if start is None or end_of_take - start < MIN_LEN:
    start = max(0.0, end_of_take - WINDOW)
print(f"social - {start:.2f} {end_of_take:.2f}")
EOF
)

cut() { # cut <start> <end> <out>
  local start="$1" end="$2" out="$3"
  # -nostdin: ffmpeg inside a `while read` loop otherwise slurps the
  # remaining plan lines as its own stdin and later cuts silently vanish.
  ffmpeg -nostdin -v error -ss "${start}" -to "${end}" -i "${SRC}" \
    -filter:v "setpts=PTS/${SPEED}" \
    -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -movflags +faststart \
    -an -y "${out}"
  local dur
  dur=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${out}")
  printf '%s  (%.1fs at %sx)\n' "${out}" "${dur}" "${SPEED}"
}

while read -r kind n start end; do
  case "${kind}" in
    turn) cut "${start}" "${end}" "${DIR}/${SCENARIO}-turn${n}-${SPEED}x.mp4" ;;
    social) cut "${start}" "${end}" "${DIR}/${SCENARIO}-social-${SPEED}x.mp4" ;;
  esac
done <<< "${PLAN}"
