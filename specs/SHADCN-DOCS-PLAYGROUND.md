# Docs Playground (Phase 2) Plan

## Objectives
- Replace `example/` with a production-quality docs/playground app under `apps/docs` (keep `example/` as a smoke-test workspace until docs cover all demos + a new regression gate exists).
- Provide live previews + copyable code for every export from `src/index.ts` (frame, assistant UI, UI primitives, wallet utils).
- Host conceptual guides (environment setup, theming, templates) and marketing landing content in the same app.
- Keep the docs app tightly coupled to source (hot reloads use local `src/`) so regressions surface immediately.

## Information Architecture
1. **Landing / Overview**
   - Hero section (reuse content from `example/app/page.tsx`).
   - CTA buttons (npm install, GitHub) and video/screenshot slots.

2. **Docs Sections**
   - **Getting Started**: installation, peer deps, environment variables, wallet wiring.
   - **Theming**: explain `src/themes/`, how to override `--font-*`, create new packs.
   - **Runtime**: architecture diagrams, how `ThreadContextProvider` + `AomiRuntimeProvider` work, SSE future notes.
   - **Components**: auto-generated pages per component grouping (`assistant-ui`, `ui`, `utils`). Each page includes usage snippet + props table (MDX frontmatter).
   - **Templates**: quick-start instructions linking to `templates/*` once available.

3. **Examples / Blocks**
   - Full-frame demos (desktop vs mobile toggle, wallet footer variants).
   - Tooling example showcasing `ExampleTool` integration.
   - Wallet states (connected, disconnected) using mock data.

4. **API Reference**
   - `ThreadContext` hook docs, helper functions, types.
   - Backend API expectations (webhooks, SSE endpoints) referencing `src/lib/backend-api.ts`.

## Technical Plan
- **Workspace Setup**
  - Create `apps/docs` Next.js (App Router) workspace managed via plain pnpm (no Turborepo yet); update `pnpm-workspace.yaml`, root scripts, and TS path aliases accordingly.
  - Shared ESLint/TS config extends root settings.
  - Tailwind v4: add a docs entry stylesheet that imports `@aomi-labs/widget-lib/styles.css` (or `../../src/styles.css` in dev). Avoid parallel Tailwind pipelines; share tokens via the existing `src/themes/` files.

- **MDX & Content Layer**
  - Use Next 15 MDX (app router) or Contentlayer with RSC-safe config; avoid `next-mdx-remote` (pages-only defaults).
  - Store MDX files under `apps/docs/content/**`, load via a small loader (e.g., Contentlayer or custom file reader).

- **Preview Components**
  - Build `components/playground/Preview.tsx` that renders live component + code tabs.
  - Implement `CopyButton`, `ComponentTabs`, `ResponsiveFrameToggle` using existing example UI pieces.

- **Data Sources**
  - Generate component metadata from `src/index.ts` with a script that classifies UI vs hooks/utils and reads TS props (e.g., `ts-morph`/`react-docgen-typescript`); keep manual overrides for non-visual exports.
  - Use `src/themes/tokens.config.ts` to render theme cards in docs.

- **Dev UX**
  - Add scripts: `pnpm --filter docs dev`, `pnpm --filter docs build`. Update README and AGENTS once ready.
  - Provide guidance on running docs + library concurrently (Turbopack or `pnpm run build:lib -- --watch`).

## Migration Checklist
- [x] Scaffold `apps/docs` workspace (fonts/assets still to migrate from `example/public`).
- [x] Port landing page layout from `example/app/page.tsx` into React components.
- [x] Create docs sidebar/nav structure (Getting Started, Guides, Theming).
- [x] Implement preview infrastructure + copy button.
- [ ] Write initial pages: Overview, Install, Providers, Wallet Footer, Theme Packs. (Getting started, Providers, and Theming drafted.)
- [ ] Point README to docs site, deprecate `example/` instructions.
- [ ] Eventually remove `example/` workspace once docs cover demo needs and a replacement smoke-test (docs previews or CI build) is in place.

## Open Questions
- Should docs host interactive sandboxes (iframe vs in-page) for embedding third-party tools? (Default: in-page previews only.)
- Will docs deploy to Vercel using the same project as the library landing page? Need env strategy for backend URLs when demos fetch real data.
