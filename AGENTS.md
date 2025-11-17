# Repository Guidelines

Quick-reference playbook for contributing to this Next.js Assistant UI starter.

## Project Structure & Module Organization
- `app/`: Next.js App Router entry points; `layout.tsx` wraps global chrome, `page.tsx` renders the chat surface, and `assistant.tsx` hosts shared Assistant UI context; `app/api/` holds route handlers.
- `components/assistant-ui/`: Chat-specific building blocks (threads, markdown display, tool fallback, attachments).
- `components/ui/`: Reusable primitives.
- `hooks/`: Client-side state and helpers (e.g., Zustand stores).
- `lib/utils.ts`: Shared utilities such as `cn` for Tailwind-friendly class merging.
- `app/globals.css` plus root configs (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`) define styling and tooling.

## Setup & Environment
- Requires Node 18+; prefer `npm` to match `package-lock.json`.
- Create `.env.local` with `OPENAI_API_KEY=...` before running; never commit secrets.
- Restart `npm run dev` when env values change.

## Build, Test, and Development Commands
- `npm run dev`: Start the Turbopack dev server at `http://localhost:3000`.
- `npm run build`: Production build; use before deploys.
- `npm run start`: Serve the built app locally to sanity-check production output.
- `npm run lint`: ESLint with Next.js rules; fixes many best-practice issues.
- `npm run prettier` / `npm run prettier:fix`: Check or autoformat with Prettier + Tailwind plugin.

## Coding Style & Naming Conventions
- TypeScript-first; use PascalCase components and camelCase props/hooks in `.tsx`.
- Tailwind for styling; prefer `cn()` for conditional classes and keep class lists ordered logically.
- 2-space indentation (tooling enforces); avoid default exports except for Next.js pages/layouts.
- Run `npm run lint && npm run prettier` before pushing.

## Testing Guidelines
- No automated tests yet; add component tests alongside files as `*.test.tsx` (React Testing Library/Vitest recommended).
- Focus on rendering, assistant message flows, and tool fallback behavior; mock AI/network calls.
- Once added, wire tests into CI by extending `package.json` scripts (e.g., `test`, `test:watch`).

## Commit & Pull Request Guidelines
- Commits: short, imperative subjects (e.g., “Add thread list avatars”); keep related changes together.
- PRs: include what changed, why, and how to validate (commands run, screenshots for UI tweaks, env notes).
- Link issues when applicable; request reviews for UX or API surface changes; ensure lint/format passes before review.

## Security & Configuration Tips
- Keep API keys local; add expected variables to `.env.local.example` if sharing configs.
- Validate third-party additions for license compatibility; document new external calls or needed scopes.
