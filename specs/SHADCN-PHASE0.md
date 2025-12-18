# Phase 0 Inventory — Shadcn-style Migration

## 1. Directory & Asset Map
| Path | Current contents | Planned destination | Notes |
| --- | --- | --- | --- |
| `src/` | Main library entry point plus helpers. | Remains `src/`. | Will gain `themes/` + provider/docs annotations. |
| `src/components/assistant-ui/` | Frame, thread surfaces, tool UI. | Stay in `src/components/assistant-ui/`. | Each export requires individual docs demos. |
| `src/components/ui/` | Shadcn-derived primitives (Button, Dialog, Sidebar, etc.). | Stay put; source-first registry analog. | Compose docs examples per primitive. |
| `src/hooks/` | Shared hooks (`useIsMobile`). | Stay put. | Document SSR constraints (uses `window`). |
| `src/lib/` | Thread context, backend API, conversions. | Stay; consider moving docs to providers section. | Contains console-heavy utilities to trim later. |
| `src/utils/` | Wallet helpers/state. | Stay. | Should receive dedicated docs + template integration. |
| `src/styles.css` | Single Tailwind/token sheet shipping with package. | Becomes `src/themes/<theme>.css` + legacy alias. | Current build copies this exact file (see section 2). |
| `src/public/` | SVGs/images (currently unused by code). | Decide: remove or move into docs/static packs. | Not shipped (`files` only include `dist`), so safe to prune or relocate. |
| `example/` | Next.js demo/landing page. | Will morph into `apps/docs`. | Houses wallet providers, marketing copy, fonts. |
| `example/app/*` | App Router pages/layout. | Become docs routes (component pages, guides). | Contains global import of `@aomi-labs/widget-lib/styles.css`. |
| `example/src/components/` | Wallet footer + providers. | Move into docs/examples + templates. | Provide as snippets in docs. |
| `example/public/` | Fonts/images for landing page. | Move under `apps/docs/public` or template assets. | Inventory fonts before moving. |
| `public/` | Static assets for root Next app (if deployed). | Move to `apps/docs/public` (or keep if still needed). | Mirror across docs + template. |
| `specs/` | Planning + product docs. | Stay. | Add future theme/template specs here. |
| `dist/` | Built artifacts. | Generated; no change. | Keep `.gitignore` enforcement. |
| `components.json` | Next.js registry config. | Update after docs migration. | Ensure new docs app references correct registry. |

## 2. Commands & References to `example/` or `styles.css`
- `package.json` scripts (`dev:example:live`, `vercel-build`) run `pnpm --filter example ...` and must be updated once docs app exists. (`package.json:18-34`)
- README quickstart mentions `example/` workflows and URLs. (`README.md:28-34`)
- `pnpm-workspace.yaml` lists `example` workspace (line 2); replace with `apps/docs` later.
- `example/app/globals.css` imports `@aomi-labs/widget-lib/styles.css`; templates/docs must continue to do so until theme packs land.
- `tsup.config.ts` uses an esbuild plugin to copy `src/styles.css` verbatim into `dist/styles.css` (lines 1-17). Build logic must change once themes split.
- Package export `./styles.css` points to `dist/styles.css` (package.json:18-24). Maintain compatibility alias.
- `example` fonts/assets referenced via `next.config.ts`, `public/` images—need relocation plan.

## 3. Export Audit (for future docs/playground coverage)
From `src/index.ts`:
- **Top-level frame/runtime**: `AomiFrame`, `AomiRuntimeProvider`, `ThreadContextProvider`, hooks (`useRuntimeActions`, `useThreadContext`, `useThreadContext` derivatives).
- **Assistant UI**: `Thread`, `ThreadList`, `BaseSidebar`, `ThreadListSidebar`, `MarkdownText`, `ToolFallback`, `TooltipIconButton`, attachment components.
- **UI primitives (shadcn-style)**: `Button` (+ `buttonVariants`), `Card` family, `Dialog` family, `Avatar`, `Tooltip`, `Badge` (+ `badgeVariants`), `Input`, `Label`, `Separator`, `Skeleton`, `Breadcrumb` family, `Sheet`, `Sidebar` suite (`SidebarProvider`, `useSidebar`, menu components), etc.
- **Wallet utilities**: types (`WalletButtonState`, `WalletFooterProps`) and helpers (`formatAddress`, `getNetworkName`).
- **Utilities**: `cn`.

Every item above needs:
1. Source ownership (so templates/docs import the same files).
2. Dedicated docs preview blocks (live example + code) once `apps/docs` is live.
3. Notes on dependencies (Radix, assistant-ui, wallet libs) to surface in docs and template scaffolds.

## Outstanding Questions
- Which assets inside `src/public/` must ship with the package vs. moving to docs/templates?
- Do we need to preserve the existing landing page design within `apps/docs`, or should templates own marketing content?

This inventory completes Phase 0 prerequisites and sets the stage for Phase 1 (themes/tokens).
