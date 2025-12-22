# Shadcn-style Migration Plan

## Phase 0 – Inventory & Alignment
- Map current directories (`src/`, `apps/landing/`, `public/`, `specs/`) against the target layout. Note which files stay versus move (e.g., example app → `apps/docs`).
- Capture build/lint/test commands that reference `apps/landing/` or `src/styles.css` so they can be updated after refactors.
- Audit component exports (`src/components/**`) to ensure each one can be demoed in isolation for the upcoming docs playground.

## Phase 1 – Theme & Token System
1. Split `src/styles.css` into `src/themes/<theme>.css` (e.g., `default.css`, `neon.css`). Each file holds Tailwind tokens + CSS variables only.
2. Add `src/themes/tokens.config.ts` describing theme metadata (name, colors, accent order). Export helpers for tooling.
3. Create `scripts/generate-theme.ts` to scaffold a new theme file from a minimal JSON prompt (name, primary/secondary colors).
4. Update `tsup.config.ts` and `package.json` scripts so builds copy the selected theme CSS (no hard-coded `styles.css`). Document how to switch themes prepublish.
5. Write docs in `specs/THEMES.md` (or similar) explaining naming conventions, token layering, and expected overrides.

## Phase 2 – Docs Playground (`apps/docs`)
1. Bootstrap a new Next.js App Router project under `apps/docs` (or replace `apps/landing/`). Install MDX, shadcn-style preview wrappers, and Tailwind.
2. Port existing marketing/demo content into structured pages: overview landing, component reference, guides (env setup, theming), and full flows.
3. Build reusable preview components (code tabs, copy button, live preview shell) so every widget export has a demo + source snippet.
4. Wire docs to import directly from `src/` components; ensure hot reload works when editing library code.
5. Add scripts (`pnpm --filter=docs dev`) and CI steps to build/test the docs app.

## Phase 3 – Template Bootstraps
1. Create `templates/next-widget`, `templates/vite-widget`, and optional marketing `templates/landing`. Each template includes README, env samples, and references the theme tokens.
2. Write a scaffolding script (e.g., `scripts/create-template.ts`) or package (`packages/create-aomi-widget`) that copies templates into a target directory, installs deps, and injects selected theme name.
3. Add integration tests that run each template’s dev/build commands to ensure compatibility with the library.
4. Document template usage in the docs site (quick start page) with copyable commands and screenshots.

## Phase 4 – Cleanup & Launch
- Remove deprecated `apps/landing/` paths once docs/templates cover the same functionality.
- Update README + AGENTS.md to describe the new structure, theme workflow, docs app, and templates.
- Announce migration steps for downstream consumers (blog post, changelog, pinned issue).
- Monitor feedback and iterate on theme packs or templates as needed.

## Risks & Mitigations
- Style breakage for current consumers if `styles.css` path changes → keep a legacy alias or compatibility copy during transition and document the new import path.
- Build/publish drift when adding theme copying to `tsup`/scripts → wire CI to run `pnpm run build:lib` plus a docs/demo smoke check so missing assets fail fast.
- Docs playground and templates drifting from the library API or tokens → add a simple integration step (linking `src/` into docs/templates) and a short checklist before release to ensure parity.
- Registry/primitive parity gaps when porting shadcn components → prioritize a component inventory and resolve blockers before deleting the old `apps/landing/` so demo coverage remains.
