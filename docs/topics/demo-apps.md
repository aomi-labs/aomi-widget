---
title: Demo Apps
owner: frontend
status: authoritative
area: demo-apps
review_after_days: 30
sources_of_truth:
  - package.json
  - apps/base/package.json
  - apps/landing/package.json
  - apps/portal/package.json
  - apps/telegram/package.json
---

# Demo Apps

The app surfaces in `apps/` are the main validation targets for package changes.

## Main Surfaces

- `apps/landing` is the primary marketing and docs surface, and the root `dev` workflow points at it.
- `apps/base` is a small Next.js app for direct local widget integration checks.
- `apps/portal` is a fuller Next.js consumer with its own lint, type-check, and test commands.
- `apps/telegram` is the Telegram-focused consumer and includes a unit-test path.

## Common Workflows

- `pnpm --filter landing dev` runs the main demo app.
- `pnpm run dev:landing:live` watches the shared library while serving the landing app.
- `pnpm run check:apps` is the cross-app validation path wired at the root package level.

## Operational Notes

- These app surfaces depend on workspace packages instead of published versions.
- Changes in `packages/react`, `packages/client`, or `apps/registry` should generally be checked in at least one app surface before release.

## Related Topics

- [repo-overview.md](repo-overview.md)
- [widget-frame.md](widget-frame.md)
