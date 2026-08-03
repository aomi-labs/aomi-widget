#!/usr/bin/env bash
# Convert a recorded master .webm to a shareable .mp4, optionally sped up.
#
#   demo/capture/to-mp4.sh <scenario-id> [speed]
#   demo/capture/to-mp4.sh aave-borrow-against-usdc 2
#
# Speed defaults to 2 — an agent turn that is gripping to watch live is slow on
# a landing page, and 2x keeps the reasoning legible while halving the runtime.
# Pass 1 for the true-time master.
#
# NOTE: markers.json offsets are recorded in REAL time against the .webm. For a
# sped-up mp4, divide marker offsets by the speed factor to locate the same
# beat. The written `*-2x.mp4` name carries the factor so this can't be lost.
set -euo pipefail

SCENARIO="${1:?usage: to-mp4.sh <scenario-id> [speed]}"
SPEED="${2:-2}"
DIR="demo/out/${SCENARIO}"

# markers.json records the exact video the passing take produced. Prefer it:
# `ls | head -1` is ALPHABETICAL, and Playwright names videos by hash, so with
# more than one .webm present that silently converts an arbitrary file.
SRC=""
if [[ -f "${DIR}/markers.json" ]]; then
  SRC=$(python3 -c "import json,sys;print(json.load(open('${DIR}/markers.json')).get('videoPath',''))" 2>/dev/null || true)
fi
if [[ -z "${SRC}" || ! -f "${SRC}" ]]; then
  # Fall back to the NEWEST webm, not the first one alphabetically.
  SRC=$(ls -t "${DIR}"/*.webm 2>/dev/null | head -1)
fi
if [[ -z "${SRC}" ]]; then
  echo "no .webm in ${DIR} — was the take recorded?" >&2
  exit 1
fi

if [[ "${SPEED}" == "1" ]]; then
  OUT="${DIR}/${SCENARIO}-master.mp4"
  FILTER="null"
else
  OUT="${DIR}/${SCENARIO}-${SPEED}x.mp4"
  # setpts scales presentation timestamps: 2x speed = half the PTS.
  FILTER="setpts=PTS/${SPEED}"
fi

ffmpeg -v error -i "${SRC}" -filter:v "${FILTER}" \
  -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -movflags +faststart \
  -an -y "${OUT}"

DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${OUT}")
printf '%s  (%.1fs at %sx)\n' "${OUT}" "${DUR}" "${SPEED}"
