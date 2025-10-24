# Repository Guidelines

## Project Structure & Module Organization
The widget source sits under `src/`: `src/core/` hosts runtime managers (`AomiChatWidget`, `ChatManager`, `ThemeManager`, `WalletManager`), `src/utils/` contains shared helpers, and `src/types/` centralises exported types. `src/index.ts` is the public entry bundled by Rollup into `dist/`. Root-level configs (`rollup.config.js`, `vite.config.ts`, `tsconfig.json`) drive builds and previews. Use the HTML samples in `examples/` and `test-build.html` for manual smoke checks while keeping generated files out of version control.

## Build, Test, and Development Commands
- `npm run dev` — watch-mode Rollup build for iterative development.
- `npm run build` — production bundle plus declaration output.
- `npm run preview` — serve the last build over Vite.
- `npm run test` / `npm run test:ui` — run Vitest in CLI or browser.
- `npm run lint` / `npm run lint:fix` — apply ESLint rules, auto-fix when safe.
- `npm run typecheck` — TypeScript project validation without emit.
- `npm run clean` — remove `dist/` before regenerating artifacts.

## Coding Style & Naming Conventions
TypeScript is the default. ESLint enforces 2-space indentation, single quotes, semicolons, trailing commas on multiline collections, and 120-character lines. Use `camelCase` for variables and functions, `PascalCase` for classes, and `kebab-case` for filenames (`wallet-manager.ts`). Share constants through `src/types/constants.ts` and error classes via `src/types/errors.ts`. Run `npm run lint` and address warnings prior to review.

## Testing Guidelines
Vitest drives unit and integration coverage. Co-locate specs with implementation files (`*.test.ts` or `*.spec.ts`) and mock DOM or wallet providers as needed. Prioritise coverage on the exported API in `src/index.ts` and high-risk flows in `src/core/ChatManager.ts` and `src/core/WalletManager.ts`. Require a passing `npm run test` before opening PRs; use the HTML examples to sanity-check UI interactions not covered by Vitest.

## Commit & Pull Request Guidelines
Follow short, imperative commit subjects (e.g., `init`). Reference issue IDs when relevant and keep each commit focused on a single concern. PRs should include a summary, testing evidence (`npm run build`, `npm run test`), and visuals when UI or theming shifts. Call out breaking API changes and update README-style docs when behaviour changes.

## Security & Configuration Tips
Never commit secrets or private keys. Treat wallet connections from `WalletManager` as untrusted: verify provider capabilities and handle rejections gracefully. Introduce configuration through host applications or build-time flags rather than bundling sensitive defaults.
