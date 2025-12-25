# Progress Tracker

## Current Sprint Goal
Migrate aomi-widget into monorepo: logic as npm package (`@aomi-labs/react`), UI as shadcn registry (`@aomi-labs/widget-lib`)

## Branch Status
- **Current Branch:** `codex/implement-migration-plan-claude`
- **Recent Commits:**
  - 208acbe Merge pull request #11 (runtime compatibility tests)
  - e284338 Add runtime compatibility tests
  - e159be9 move css from react to widget
  - 1c49f43 next.config.ts resolves
  - 97158ca most thing compiles
  - b439e0c fix imports
  - 9457112 remove repetition
  - 369ab28 @aomi-labs/widget-lib → @aomi-labs/react

## Migration Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Workspace + skeleton | ✅ Complete |
| Phase 2 | Extract logic to `packages/react` | ✅ Complete |
| Phase 3 | Isolate registry UI | ✅ Complete |
| Phase 4 | Docs integration | ✅ Complete |
| Phase 5 | Tooling, release, verification | ⏳ Pending |

## Recently Completed Work

| Task | Description | Key Files |
|------|-------------|-----------|
| Monorepo setup | Created pnpm workspace with packages/react and apps/registry | `pnpm-workspace.yaml` |
| Logic extraction | Moved runtime, API, state, utils to @aomi-labs/react | `packages/react/src/` |
| UI isolation | Moved components to apps/registry with shadcn structure | `apps/registry/src/components/` |
| Registry build | JSON files generated for shadcn consumption | `apps/registry/dist/*.json` |
| Path alias config | Configured @/ imports across landing/docs | `next.config.ts`, `tsconfig.json` |
| Style separation | Moved styles.css + themes from react to widget-lib | `apps/registry/src/styles.css` |
| Runtime tests | Added compatibility tests for runtime behavior | `packages/react/src/runtime/__tests__/` |

## Current Architecture

```
aomi/
├─ packages/react/                # @aomi-labs/react (npm package)
│  └─ src/
│     ├─ api/ (client.ts, types.ts)
│     ├─ runtime/ (aomi-runtime, polling, message-controller, hooks)
│     ├─ state/ (thread-context, thread-store, types)
│     └─ utils/ (conversion, wallet)
├─ apps/registry/                 # @aomi-labs/widget-lib (shadcn registry)
│  ├─ src/
│  │  ├─ components/ (aomi-frame, assistant-ui/*, ui/*)
│  │  ├─ themes/ (default.css, tokens.config.ts)
│  │  └─ styles.css
│  └─ dist/*.json                 # Built registry files
├─ apps/landing/                  # Demo app
├─ apps/docs/                     # Documentation site
└─ pnpm-workspace.yaml
```

## Files Modified This Sprint

### packages/react
- `package.json` - npm package config with peer deps
- `tsup.config.ts` - Build config (esm/cjs/dts)
- `src/index.ts` - Public exports
- `src/api/` - Backend API client
- `src/runtime/` - AomiRuntimeProvider, polling, message handling
- `src/state/` - Thread context and store
- `src/utils/` - Conversion and wallet utilities

### apps/registry
- `package.json` - @aomi-labs/widget-lib with exports
- `src/registry.ts` - Registry definition
- `scripts/build-registry.js` - JSON generator
- `src/components/` - All UI components
- `src/styles.css` - Theme imports
- `src/themes/` - CSS variables and tokens

### apps/landing & apps/docs
- `package.json` - Updated dependencies
- `next.config.ts` - Webpack aliases for @/, @aomi-labs/react
- `tsconfig.json` - Path aliases
- `app/globals.css` - Import from @aomi-labs/widget-lib/styles.css

## Pending Tasks

### Phase 5 - Release
- [ ] Configure changesets for versioning
- [ ] Publish @aomi-labs/react to npm
- [ ] Deploy registry dist/ to hosting
- [ ] Fresh consumer install test

### Optional Improvements
- [ ] Add more comprehensive tests
- [ ] Document public API
- [ ] Set up CI/CD for publishing

## Known Issues
None blocking. Both landing and docs compile successfully.

## Notes for Next Agent
- **Styles are in widget-lib**: `@aomi-labs/react` is purely logic, no CSS
- **Path aliases**: Both `./src/*` and `../registry/src/*` are mapped to `@/*` in apps
- **Webpack aliases required**: Next.js needs explicit aliases in `next.config.ts` for @/ and @aomi-labs/react
- **Registry builds 6 JSON files**: aomi-frame, assistant-thread, assistant-thread-list, assistant-threadlist-sidebar, assistant-tool-fallback, index
- **Runtime tested**: Compatibility tests exist in `packages/react/src/runtime/__tests__/`
