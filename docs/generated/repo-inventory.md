---
owner: platform
status: authoritative
area: repo-inventory
sources_of_truth:
  - repowiki.toml
  - pnpm-workspace.yaml
review_after_days: 7
---

# Repository Inventory

## Top-Level Directories
- `apps`
- `docs`
- `memory`
- `node_modules`
- `output`
- `packages`
- `public`
- `scripts`
- `specs`
- `src`

## PNPM Workspace Packages
- `.`
- `apps/base`
- `apps/landing`
- `apps/portal`
- `apps/registry`
- `apps/telegram`
- `packages/client`
- `packages/react`

## Area Maps
- `repo-overview` owners: platform, frontend | code globs: package.json, pnpm-workspace.yaml, apps/landing/package.json, apps/registry/package.json, packages/client/package.json, packages/react/package.json | docs globs: docs/topics/repo-overview.md
- `widget-frame` owners: frontend | code globs: apps/registry/src/components/aomi-frame.tsx, apps/registry/src/components/assistant-ui/**, apps/registry/src/components/control-bar/**, apps/registry/src/index.ts, src/components/assistant-ui/runtime.tsx | docs globs: docs/topics/widget-frame.md
- `runtime-react` owners: frontend | code globs: packages/react/src/contexts/**, packages/react/src/handlers/**, packages/react/src/interface.tsx, packages/react/src/runtime/**, packages/react/src/state/**, packages/react/src/utils/** | docs globs: docs/topics/runtime-react.md
- `ts-client` owners: sdk | code globs: packages/client/src/client.ts, packages/client/src/event.ts, packages/client/src/index.ts, packages/client/src/session.ts, packages/client/src/sse.ts, packages/client/src/types.ts | docs globs: docs/topics/ts-client.md
- `cli` owners: sdk | code globs: packages/client/bin/**, packages/client/src/cli.ts, packages/client/src/cli/** | docs globs: docs/topics/cli.md
- `auth-adapter` owners: frontend | code globs: apps/registry/src/lib/aomi-auth-adapter/**, packages/react/src/runtime/user-state-provider.tsx | docs globs: docs/topics/auth-adapter.md
- `demo-apps` owners: frontend | code globs: apps/base/**, apps/landing/**, apps/portal/**, apps/telegram/** | docs globs: docs/topics/demo-apps.md
