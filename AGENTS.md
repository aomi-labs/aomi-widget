# Repository Guidelines

## Project Structure & Module Organization
Authoritative source files live under `src/`. `DefaultAomiWidget` in `src/core/AomiChatWidget.ts` orchestrates `ChatManager` and `WalletManager`, while `utils/` hosts shared helpers and `types/` exports contracts plus constants. Browser demos stay in `examples/` (e.g., `basic.html`, `react-example.tsx`); use them for manual smoke tests. Bundled artifacts in `dist/` are generated via Rollup—never hand-edit them. Any configuration tweaks should go through `rollup.config.js`, `vite.config.ts`, or `tsconfig.json` rather than `node_modules/`.

## Build, Test, and Development Commands
Run `npm run dev` for a watch-mode Rollup build while iterating on the widget. `npm run build` emits the production bundle and `.d.ts` files, and `npm run preview` serves the built assets. Keep `npm run clean` handy when cache artifacts get stale. Execute `npm test` (or `npm run test:ui` for focused Vitest debugging) for fast feedback, `npm run typecheck` to ensure the declarations stay sound, and `npm run lint`/`npm run lint:fix` to enforce formatting.

## Coding Style & Naming Conventions
The codebase is TypeScript-first with strict ES modules. Follow two-space indentation, group external imports before internal ones, and prefer named exports. Classes use `PascalCase`, variables and functions use `camelCase`, and exported consts use `UPPER_SNAKE_CASE`. The widget now ships with a single light-neutral theme baked into `DefaultAomiWidget`; avoid reintroducing palette-specific conditionals unless design requirements change. ESLint and `tsc` are the source of truth before committing.

## Testing Guidelines
Vitest powers unit and integration tests. Co-locate specs beside implementations (`*.test.ts`) or under `__tests__/`. Focus coverage on chat session flows, wallet lifecycle events, reconnection paths, and DOM helpers. Mock network calls with the utilities under `src/utils/`. Every behavioral change should extend or adjust tests, and PRs must cite the `npm test` output (add `npm run test:ui` details if you debugged visually).

## Commit & Pull Request Guidelines
Use short, imperative commit subjects (for example, `simplify widget theme`). PR descriptions should summarize intent, enumerate code changes, and list validation commands (`npm test`, `npm run lint`, etc.). Include screenshots or GIFs whenever the examples change, link related issues, and outline follow-up work if scope was deferred so reviewers can prioritize.

## Security & Configuration Tips
Never commit secrets; rely on `.env.local` or mock providers while developing. Wallet-facing code sits in `WalletManager`—double-check chain IDs and signing logic before shipping. When adding dependencies, document the rationale in the PR and verify licensing remains compatible with the project’s MIT distribution.
