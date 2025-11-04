# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`, with `core/` housing managers (`ChatManager.ts`, `ThemeManager.ts`, `WalletManager.ts`), `utils/` for shared helpers, and `types/` for all exported TypeScript contracts and constants. The bundle emitted by Rollup lands in `dist/` and should never be edited manually. Example integrations sit in `examples/` (`basic.html`, `react-example.tsx`) and are ideal for quick manual validation. Build configuration is centralized in `rollup.config.js`, `vite.config.ts`, and `tsconfig.json`; adjust these before touching generated artifacts or node_modules.

## Build, Test, and Development Commands
Use `npm run dev` for an incremental Rollup build while editing the library. `npm run build` produces the production bundle and type definitions. Run fast feedback tests with `npm test`; open the Vitest UI via `npm run test:ui` if you need focused debugging. `npm run typecheck` and `npm run lint` must pass before opening a PR; `npm run lint:fix` will apply safe formatting fixes. Serve the built package with `npm run preview`, and clean stale outputs via `npm run clean`.

## Coding Style & Naming Conventions
This codebase is TypeScript-first with ESM modules. Follow the existing two-space indentation, keep imports sorted logically (external before internal), and prefer named exports. Classes and types use `PascalCase`, functions and variables use `camelCase`, and constants intended for export use `UPPER_SNAKE_CASE`. ESLint (`npm run lint`) and the TypeScript compiler (`npm run typecheck`) enforce style—run them locally before committing.

## Testing Guidelines
Vitest is the unit-test framework. Co-locate specs beside the code they exercise as `*.test.ts` files (e.g., `src/core/ChatManager.test.ts`) or under a local `__tests__` directory. Target core flows—session lifecycle, theme selection, wallet interactions—and stub network calls via the existing utility helpers. Every PR should add or update tests when behavior changes; at minimum run `npm test` and capture failures in the PR description.

## Commit & Pull Request Guidelines
Existing history uses short, imperative summaries (e.g., `init`); continue that style and keep subject lines under ~72 characters. Reference affected modules in the body when context is helpful. PRs should include: a concise summary, bullet list of changes, testing evidence (`npm test`, `npm run lint`, etc.), and screenshots or GIFs if the `examples/` demos changed. Link related issues and call out follow-up work so reviewers can prioritize effectively.
