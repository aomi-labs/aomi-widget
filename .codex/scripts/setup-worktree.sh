#!/usr/bin/env bash
set -euo pipefail

source_root="${AOMI_LOCAL_ROOT:-/Users/aronmegyeri/Documents/Work/Aomi/Work.nosync/aomi}"

copy_env_files() {
  if [[ "${PWD}" == "${source_root}" ]]; then
    return
  fi

  find "${source_root}" \
    -path "*/node_modules/*" -prune -o \
    -path "*/.next/*" -prune -o \
    -path "*/dist/*" -prune -o \
    -path "*/.turbo/*" -prune -o \
    -type f \( -name ".env" -o -name ".env.*" \) -print |
    while IFS= read -r source_file; do
      local relative_path="${source_file#"${source_root}/"}"
      mkdir -p "$(dirname "${relative_path}")"
      cp "${source_file}" "${relative_path}"
    done
}

copy_env_files

pnpm install --frozen-lockfile
pnpm run build:lib
