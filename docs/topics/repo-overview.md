---
title: Repo Overview
owner: platform
status: authoritative
area: repo-overview
review_after_days: 30
sources_of_truth:
  - package.json
  - pnpm-workspace.yaml
  - apps/landing/package.json
  - apps/registry/package.json
  - packages/client/package.json
  - packages/react/package.json
---

# Repo Overview

`aomi-widget` is a pnpm workspace that ships multiple Aomi entry points from one TypeScript repo.

## Workspace Shape

- The root package drives shared scripts for building, linting, typechecking, and running app surfaces.
- `packages/react` publishes `@aomi-labs/react`, the headless runtime and context layer.
- `packages/client` publishes `@aomi-labs/client`, the platform-agnostic client plus the `aomi` CLI binary.
- `apps/registry` publishes `@aomi-labs/widget-lib`, the UI layer and shadcn-style registry surface.
- `apps/landing`, `apps/base`, `apps/portal`, and `apps/telegram` are validation and integration apps that consume the workspace packages.

## Common Build Flows

- `pnpm run build:lib` builds the client package and the root widget bundle.
- `pnpm run build:packages` builds the client, react runtime, and registry packages.
- `pnpm run build:apps` builds the main app surfaces after the shared packages are ready.
- `pnpm run dev:landing:live` is the quickest end-to-end loop for widget changes because it watches the library while serving the landing app.

## Operational Notes

- The repo is package-oriented: core runtime logic lives under `packages/`, while UI and app shells live under `apps/`.
- The root package exposes the `repowiki` wrapper, but the actual CLI implementation stays in neighboring `product-mono`.
- `pnpm-workspace.yaml` keeps the root, `apps/*`, and `packages/*` in the same workspace graph.

## Related Topics

- [widget-frame.md](widget-frame.md)
- [runtime-react.md](runtime-react.md)
- [ts-client.md](ts-client.md)
- [demo-apps.md](demo-apps.md)
