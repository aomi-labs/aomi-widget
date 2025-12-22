# Migration Plan — Consolidated (Claude + Codex)

Migrate the single `aomi-widget` package into a monorepo split: logic as an npm package, UI as a shadcn registry, docs as the playground/validator.

## Targets
- `packages/react` → `@aomi-labs/react` (logic: runtime, hooks, API, state, utils).
- `apps/registry` → shadcn-compatible registry (UI components + JSON build).
- `apps/docs` → consumes both to validate integration.
- Workspace: `pnpm-workspace.yaml` covers `packages/*`, `apps/*`.

## Architecture (goal state)
```
aomi/
├─ packages/react/                # npm package
│  ├─ src/
│  │  ├─ api/ (client, types)
│  │  ├─ runtime/ (aomi-runtime, polling, thread-list-adapter, message-handlers, hooks)
│  │  ├─ state/ (thread-context, types)
│  │  ├─ utils/ (conversion, wallet)
│  │  └─ index.ts (exports)
│  ├─ package.json
│  └─ tsup.config.ts
├─ apps/registry/                 # shadcn registry
│  ├─ src/registry.ts
│  ├─ src/components/
│  │  ├─ aomi-frame.tsx
│  │  └─ assistant-ui/{thread.tsx,thread-list.tsx,threadlist-sidebar.tsx,tool-fallback.tsx}
│  ├─ components.json
│  ├─ scripts/build-registry.ts
│  └─ dist/*.json
├─ apps/docs/                     # docs playground
└─ pnpm-workspace.yaml
```

## Phased Plan
### Phase 1 — Workspace + skeleton
- Add `pnpm-workspace.yaml` (`apps/*`, `packages/*`), root scripts (`build`, `lint`, `typecheck`).
- Create folders for `packages/react` and `apps/registry`; add minimal `package.json` and tsconfig/tsup stubs.

### Phase 2 — Extract logic to `packages/react`
- Move logic files: `lib/backend-api.ts` → `src/api/client.ts`; `lib/types.ts` → `src/api/types.ts` and `src/state/types.ts`; `lib/thread-context.tsx` → `src/state/thread-context.tsx`; `lib/conversion.ts` → `src/utils/conversion.ts`; `utils/wallet.ts` → `src/utils/wallet.ts`.
- Split `components/assistant-ui/runtime.tsx` into:
  - `src/runtime/aomi-runtime.tsx` (orchestration)
  - `src/runtime/polling.ts` (poller)
  - `src/runtime/thread-list-adapter.ts` (thread list adapter)
  - `src/runtime/message-handlers.ts` (onNew/onCancel/system)
  - `src/runtime/hooks.ts` (context for runtime actions)
- Create `src/index.ts` exporting API, runtime, state, utils; set `package.json` exports (esm/cjs/types) and peer deps (`react`, `@assistant-ui/react`).
- Build config: `tsup` with dts, esm/cjs, external peer deps.

### Phase 3 — Isolate registry UI
- Move UI files to `apps/registry/src/components` (aomi-frame + assistant-ui set).
- Registry definition (`src/registry.ts`): list publishable files only; add `dependencies` (`@aomi-labs/react`, `@assistant-ui/react`, `motion`) and `registryDependencies` (shadcn primitives: button, sidebar, sheet, tooltip, avatar, dialog, separator, input, skeleton, breadcrumb; assistant-ui: tooltip-icon-button, attachment, markdown-text URLs).
- `components.json` aligned with shadcn (style new-york, aliases).
- `scripts/build-registry.ts`: read listed files, embed content, write `dist/<name>.json` + `index.json`.
- Update imports in UI to pull logic from `@aomi-labs/react`.

### Phase 4 — Docs integration
- Point docs to local package via alias (next/tsconfig) and import library styles.
- Optionally consume registry source/dist to mirror consumer setup.
- Smoke test core flows: thread list, popovers/charts, wallet footer render, theme overrides.

### Phase 5 — Tooling, release, verification
- Lint/typecheck: `pnpm lint`, `pnpm typecheck`.
- Build: `pnpm build` (package + registry; ensure themes/styles copied).
- Changesets: add user-facing changes, run `pnpm changeset version`.
- Publish: `pnpm publish --access public` (or `changeset publish`) for `@aomi-labs/react`; deploy registry `dist/` to hosting.
- Post-publish: fresh install test (`npx shadcn add <registry-url>` + `pnpm add @aomi-labs/react@X.Y.Z`), verify CSS import and UI rendering.

## File Mapping (detailed)
| Source (aomi-widget) | Destination |
| --- | --- |
| `lib/backend-api.ts` | `packages/react/src/api/client.ts` |
| `lib/types.ts` (API/state) | `packages/react/src/api/types.ts`, `packages/react/src/state/types.ts` |
| `lib/thread-context.tsx` | `packages/react/src/state/thread-context.tsx` |
| `lib/conversion.ts` | `packages/react/src/utils/conversion.ts` |
| `utils/wallet.ts` | `packages/react/src/utils/wallet.ts` |
| `components/assistant-ui/runtime.tsx` | split into runtime files listed above |
| `components/aomi-frame.tsx` | `apps/registry/src/components/aomi-frame.tsx` |
| `components/assistant-ui/{thread,thread-list,threadlist-sidebar,tool-fallback}.tsx` | `apps/registry/src/components/assistant-ui/` |
| Not published (via registryDependencies) | shadcn primitives (button, sidebar, sheet, tooltip, avatar, dialog, separator, input, skeleton, breadcrumb); assistant-ui primitives (tooltip-icon-button, attachment, markdown-text) |

## Commands (baseline)
- Root: `pnpm lint`, `pnpm typecheck`, `pnpm build`.
- Registry: `pnpm --filter registry build`.
- Docs smoke: `pnpm --filter docs dev` (manual check).
- Release: `pnpm changeset version` → commit → `pnpm build` → tag → `pnpm publish --access public` (or `changeset publish`) + deploy registry.

## Risks & Mitigations
- **Missing CSS vars/tokens**: keep `src/themes/default.css` parity; verify popovers/charts in docs.
- **Alias drift**: lock tsconfig/next aliases; add lint/ts checks for unresolved imports.
- **Registry dependency drift**: maintain a single `registryDependencies` list; pin versions as needed.
- **Packaging gaps**: ensure exports include types and esm/cjs (or module-only) and mark peers external.

## Validation Checklist
- Logic package builds and types ok (`packages/react/dist` present, correct exports).
- Registry `dist/*.json` includes file contents and correct dependency lists.
- Docs render sidebar/thread/wallet footer; popover/chart tokens resolved; theme overrides work.
- Fresh consumer install via `shadcn add <registry-url>` + `pnpm add @aomi-labs/react@X.Y.Z` succeeds.
