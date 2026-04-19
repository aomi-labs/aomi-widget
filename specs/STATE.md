# Current State

## Last Updated

2026-04-12 - AA Proxy: Delete client-side complexity

## Recent Changes

### CLI root-shape alignment with Rust CLI (2026-04-19)

- **Added root chat mode** to `packages/client/src/cli/root.ts` + new `src/cli/repl.ts`:
  - `aomi` now starts an interactive REPL by default
  - `aomi --prompt "<message>"` sends a single prompt and exits
- **Added REPL commands** matching the backend CLI shape: `/heap`, `/app`, `/model`, `/key`, and `:exit`
- **Added provider-key support** to the TS CLI:
  - new `src/cli/commands/provider-keys.ts`
  - new `AomiClient` methods for `GET/POST/DELETE /api/control/provider-keys`
- **Kept noun-verb operator subcommands** (`tx`, `session`, `secret`, `model`, `app`, `chain`) for wallet/session workflows instead of removing them
- **Added unit coverage** in `test/cli/cli-provider-keys.unit.test.ts` and `test/cli/cli-repl.unit.test.ts`

### AA Proxy: Delete client-side complexity (2026-04-12)

- **Deleted 8 source files (~871 lines):** `cli/aa-config.ts`, `cli/commands/aa.ts`, `cli/commands/defs/aa.ts`, `aa/env.ts`, `aa/alchemy/env.ts`, `aa/pimlico/env.ts`, `aa/alchemy/resolve.ts`, `aa/resolve.ts`
- **Deleted 3 test files:** `aa-env.unit.test.ts`, `aa-resolve.unit.test.ts`, `cli-aa-config.unit.test.ts`
- **Rewrote `cli/execution.ts`** (285→170 lines) — removed `getCliAAApiKey()`, `getCliAlchemyGasPolicyId()`, `isCliProviderConfigured()`, `resolveAAProvider()`, `resolveAAMode()`, all `readAAConfig()` calls. New 3-way decision: `--eoa` → EOA, `PIMLICO_API_KEY` + pimlico → Pimlico BYOK, `ALCHEMY_API_KEY` → Alchemy BYOK, else → Alchemy proxy (zero-config default)
- **Added proxy transport to `aa/alchemy/create.ts`** — `proxyBaseUrl` param threaded through `CreateAlchemyAAStateOptions` → `createAlchemyWalletApisState`. Transport selection: `proxyBaseUrl ? alchemyWalletTransport({ url }) : alchemyWalletTransport({ apiKey })`
- **Threaded `proxyBaseUrl` through `aa/create.ts`** — `CreateAAStateOptions` and `createAAProviderState` pass through to Alchemy creator
- **Moved `AAProvider` type** from deleted `aa/env.ts` to `aa/types.ts`
- **Inlined env reads** — `pimlico/resolve.ts` uses `process.env.PIMLICO_API_KEY` directly (was `readEnv(PIMLICO_API_KEY_ENVS)`)
- **Inlined `alchemy/provider.ts`** — replaced `resolveAlchemyConfig` dependency with local `resolveForHook()` using `getAAChainConfig` + `buildAAExecutionPlan` + `NEXT_PUBLIC_*` env vars
- **Added `ALCHEMY_CHAIN_SLUGS`** to `src/chains.ts` — maps chain IDs to Alchemy network slugs for proxy URL construction
- **Deleted `parseAAConfig()`** (~75 lines) from `aa/types.ts` — along with `assertChainConfig()` and `isObject()` helpers
- **Removed `aomi aa` subcommand** from `cli/root.ts` — no more `aomi aa status/set/test/reset` commands
- **Updated `src/index.ts`** — removed exports for deleted symbols (`parseAAConfig`, `readEnv`, `isProviderConfigured`, `resolveDefaultProvider`, `resolveAlchemyConfig`, `AlchemyResolveOptions`, `AlchemyResolvedConfig`)
- **Updated barrel files** — `aa/index.ts`, `aa/alchemy/index.ts`, `aa/pimlico/index.ts` trimmed to match remaining modules
- **Rewrote `test/cli-execution.unit.test.ts`** — removed persisted-config tests, added proxy-mode tests (zero-config → `proxy: true`), added BYOK tests, added proxy URL assertion
- **Updated `test/aa-create.unit.test.ts`** — pass `apiKey` explicitly (no longer read from env by create function)
- All 155 tests pass, build clean, lint clean

#### New execution model
| Env vars | Flag | Result |
|---|---|---|
| (none) | (none) | **AA proxy** (zero-config, via backend) |
| `ALCHEMY_API_KEY` | (none) | AA BYOK (Alchemy direct) |
| `PIMLICO_API_KEY` | `--aa-provider pimlico` | AA BYOK (Pimlico direct) |
| any | `--eoa` | EOA |

### Phase 5: Cleanup legacy code (2026-04-12)

- **Deleted `src/cli/args.ts`** — hand-rolled `parseArgs()` + `getConfig()` parser fully replaced
- **Removed `ParsedArgs` and `CliRuntime` types** from `types.ts` — `CliConfig` is the single config type
- **`buildCliConfig(args)` in `shared.ts`** — single source of truth for CLI config, reads citty's typed args + env vars directly (no re-parsing `process.argv`)
- **Extracted `src/chains.ts`** — `SUPPORTED_CHAIN_IDS`, `CHAIN_NAMES` (from deleted `args.ts`)
- **Extracted `src/cli/validation.ts`** — `parseChainId`, `normalizePrivateKey`, `parseAAProvider`, `parseAAMode` (from deleted `args.ts`)
- **All handler functions** take `CliConfig` directly (no more `runtime.config` destructuring)
- **All def files** use `buildCliConfig(args)` instead of `toCliRuntime()`
- **Updated `commands/aa.ts`** import — `CHAIN_NAMES`/`SUPPORTED_CHAIN_IDS` from `../chains` (was `../args`)
- **Updated test files** — `cli-execution.unit.test.ts` uses `buildCliConfig()`, `cli-session.unit.test.ts` passes `CliConfig` directly, `cli-wallet-sign.unit.test.ts` passes `(config, txIds)` signature
- All 188 tests pass, build clean

### Phase 4: Flatten AA execution (2026-04-12)

- **Removed `"auto"` execution mode** from `CliExecutionMode` — now `"aa" | "eoa"` only
- **Removed `fallbackToEoa`** from `CliExecutionDecision` — AA either works or fails, no silent cascading
- **Deleted `executeTransactionWithFallback()`** (~100 lines) from `wallet.ts` — the 3-layer sponsored→unsponsored→EOA cascade
- **Simplified `resolveCliExecutionDecision()`** from ~80 lines to ~15 lines — just checks if provider is configured
- **Simplified `resolveAAProvider()`** — removed `required` parameter, always throws on missing config when AA requested
- **Removed `sponsored` parameter** from `createCliProviderState()` — no more sponsorship retry logic
- **Removed `isAlchemySponsorshipLimitError` re-export** from `execution.ts` — no longer needed by CLI
- **Updated `resolveExecutionMode()` in `args.ts`** — default is `"eoa"`, `--aa`/`--aa-provider`/`--aa-mode` set `"aa"`
- **Removed sign-flag command guard** from `getConfig()` — citty handles command routing now
- **Exported `CliExecutionDecision` type** from `execution.ts` for external use
- **Updated `tx.ts` defs** — refreshed flag descriptions for `--aa` and `--eoa`
- **Fixed `cli-session.unit.test.ts`** — updated to use `newSessionCommand` (pre-existing break from umbrella removal)
- **Updated all test expectations** — removed `fallbackToEoa`, changed `"auto"` to `"aa"`/`"eoa"`, fixed `sponsored` params
- **Updated `specs/AA-ARCH.md`** — CLI flow, decision type, single-shot sign, `fallback` field vs signing, `--aa-provider` / `--aa-mode` as AA triggers, `executeWalletCalls` + `fallbackToEoa` note for widget vs CLI
- **Made `execution` optional in `CliConfig`** — `undefined` means auto-detect (AA if configured, else EOA)
- **`resolveExecutionMode` returns `undefined`** when no `--aa`/`--eoa` flag (was returning `"eoa"`)
- **`resolveCliExecutionDecision` handles `undefined`** — checks if provider configured, uses AA automatically
- **Added `getAlternativeAAMode()`** — returns the other mode (7702↔4337) for fallback
- **Added mode fallback in `signCommand`** — tries preferred mode, if fails tries alternative, if both fail: hard error with `--eoa` suggestion
- All 189 tests pass, build clean

#### Execution model
| AA configured? | Flag | Result |
|---|---|---|
| Yes | (none) | **AA automatically** (7702 → 4337 fallback) |
| Yes | `--aa` | AA required, same fallback |
| Yes | `--eoa` | EOA, skip AA |
| No | (none) | EOA |
| No | `--aa` | Error: "configure AA first" |

### Spec: AA-ARCH.md refresh (2026-04-11)

- **Updated `specs/AA-ARCH.md`** to match current `packages/client/src/aa/` layout (`alchemy/` and `pimlico/` subpackages, `owner.ts`, dynamic SDK imports in provider `create.ts` files), CLI persistence (`~/.aomi/aa.json`, `aomi aa`, `aomi tx sign`), `AAState` naming, ERC-20 + 4337 mode override, and flattened CLI sign path (no sponsorship/EOA cascade).

### CLI Refactor: citty + noun-verb + AA config (2026-04-11)

- **Adopted citty** as CLI framework, replacing hand-rolled `switch` dispatcher
- **New file `src/cli/root.ts`** — root `defineCommand` with noun-verb subcommands tree
- **New directory `src/cli/commands/defs/`** — citty `defineCommand` wrappers for each noun:
  - `chat.ts`, `tx.ts` (list/simulate/sign), `session.ts` (list/new/resume/delete/status/log/events/close), `model.ts` (list/set/current), `app.ts` (list/current), `chain.ts` (list), `secret.ts` (list/clear/add), `aa.ts` (status/set/test/reset)
- **New file `src/cli/commands/defs/shared.ts`** — global args definition + `toCliRuntime()` bridge adapter
- **New file `src/cli/aa-config.ts`** — persistent AA config in `~/.aomi/aa.json`
- **New file `src/cli/commands/aa.ts`** — AA config command handlers
- **Modified `src/cli/main.ts`** — replaced `main()` switch + `printUsage()` with `runMain(root)` from citty
- **Removed legacy aliases** — no more `aomi sign`, `aomi log`, etc. at top level; use `aomi tx sign`, `aomi session log`
- **Removed umbrella routing** — deleted `sessionCommand`, `modelCommand`, `appCommand`, `chainCommand`, `secretCommand`; defs call leaf handlers directly
- **Extracted leaf handlers** — `newSessionCommand`, `resumeSessionCommand`, `deleteSessionCommand`, `currentAppCommand`, `currentModelCommand`, `setModelCommand`, `listSecretsCommand`, `clearSecretsCommand`
- **Deleted `createRuntime`** from `args.ts`

#### Command surface
```
aomi chat <message>                 Send a message
aomi tx list                        List transactions
aomi tx simulate <id>...            Simulate batch
aomi tx sign <id>...                Sign and submit
aomi session list|new|resume|delete|status|log|events|close
aomi model list|set|current
aomi app list|current
aomi chain list
aomi secret list|clear|add
aomi aa status|set|test|reset
```

### Landing `content/components` + resolve aliases (2026-04-03)

- **Moved** interactive docs-only UI from `apps/landing/src/components/` to **`apps/landing/content/components/`** (playground, samples, **`examples/`** (API consoles + collapsible demos), layout). Collapsible demo, playground, and widget demo use **`backendUrl = "/"`** (same-origin proxy).
- **`app/mdx-components.tsx`** — playground/samples from `@/content/components/...`; sessions/system consoles from **`@/components/examples/...`**.
- **`apps/landing/next.config.ts`** — `@/components` → **`apps/registry/src/components`**; **`@/components/examples`** → **`content/components/examples`** (must precede `@/components` in alias maps); **`@/content`** → `./content`.
- **`apps/landing/tsconfig.json`** — **`@/components/examples/*`** → `./content/components/examples/*` (before `@/*`); **`@/content/*`** → `./content/*`.
- **`content/examples/*.mdx`** — API console imports use **`@/components/examples/...`** (former `api-console/` folder removed; files live next to `aomi-frame-collapsible`, etc.).
- **Guide MDX** uses `@/components/...` for widget UI → **registry**, except **`@/components/examples/*`** → **content** examples.
- **Deleted `apps/landing/src/mdx-provider.tsx`** — unused stub; MDX uses **`app/mdx-components.tsx`**.

### Aomi wallet adapter rename (2026-04-03)

- **`apps/registry/src/lib/wallet-adapter.ts` → `aomi-auth-adapter.ts`** — auth adapter exports now use the `AomiAuth*` naming surface consistently.
- **Registry** — item `wallet-adapter` renamed to **`aomi-auth-adapter`**; install URL is now `https://aomi.dev/r/aomi-auth-adapter.json` (rebuilt `apps/registry/dist/` → `apps/landing/public/r/`).
- **`apps/registry/scripts/build-registry.js`** — clears `dist/` before writing so renamed/removed registry items do not leave stale `*.json` artifacts.

### Landing cleanup (2026-04-03)

- **Deleted `apps/landing/src/components/wallet-providers.tsx`** — unused; hero uses `LandingParaProvider` instead.
- **Deleted `apps/landing/src/components/config.tsx`** — only imported by the removed wallet providers file.

### Registry file renames (2026-04-03)

- **`control-bar/wallet-connect.tsx` → `connect-button.tsx`** — public surface is now `ConnectButton` / `ConnectButtonProps`.
- **`wallet-tx-handler.tsx` → `runtime-tx-handler.tsx`** — public surface is now `RuntimeTxHandler`. Registry item slug **`wallet-tx-handler` → `runtime-tx-handler`** (shadcn URL is now `https://aomi.dev/r/runtime-tx-handler.json`).
- **`apps/registry/src/registry.ts`** — updated `control-bar` file list, `aomi-frame` registry dependency, and runtime handler entry.
- **Rebuilt `apps/registry/dist/`** and synced to `apps/landing/public/r/`.

### Wallet Bridge Architecture (2026-04-03)

- **New file `apps/registry/src/lib/aomi-auth-adapter.ts`** — extracted `AomiAuthAdapter`, `AomiAuthAdapterContext`, `AOMI_AUTH_DISCONNECTED_ADAPTER`, `AomiAuthAdapterProvider`, and `useAomiAuthAdapter()`.
- **New file `apps/landing/app/components/landing-aomi-auth-bridge.tsx`** — `LandingAomiAuthBridge` runs inside the Para provider tree, reads wagmi + Para auth hooks, and writes `AomiAuthAdapterContext`.
- **New file `apps/landing/app/components/landing-para-provider.tsx`** — `LandingParaProvider` wraps `ParaProvider` + `LandingAomiAuthBridge` with all Para SDK config (apiKey, env, chains, wallets, oAuth).
- **Modified `apps/registry/src/components/aomi-frame.tsx`** — removed `AomiAuthAdapterProvider` wrapper and `adapter` prop from `Root`. Widget now reads from `AomiAuthAdapterContext` provided by an ancestor bridge.
- **Modified `apps/landing/app/sections/hero.tsx`** — wrapped `AomiFrame.Root` with `LandingParaProvider`.
- **Modified consumer imports** — `connect-button.tsx`, `runtime-tx-handler.tsx`, `network-select.tsx`, `account-identity.ts` now import from `lib/aomi-auth-adapter` (relative paths).
- **Updated `apps/registry/src/index.ts`** — exports the `AomiAuth*` auth adapter and identity surface.
- **Updated `apps/registry/src/registry.ts`** — replaced `aomi-adapter-provider` entry with `aomi-auth-adapter` + `aomi-auth-sync-bridge` entries.
- **Deleted `apps/registry/src/components/aomi-adapter-provider.tsx`** — replaced by `lib/aomi-auth-adapter.ts`.
- **Deleted `apps/registry/src/components/para-adapter-provider.tsx`** (564 lines) — replaced by the host-side `LandingAomiAuthBridge` + `LandingParaProvider`.
- **Modified `apps/registry/package.json`** — removed `@getpara/react-sdk`, `@getpara/react-core`, `@getpara/evm-wallet-connectors` from deps; added `@getpara/react-sdk` as optional peer dep.
- **Fixed Para modal not opening** — `ParaProviderMin` gates both children AND `ParaModal` behind `isReady` (which never fires due to Zustand store duplication). Fix: render `ParaModal` outside `ParaProviderMin` wrapped in `ParaProviderCore` (from `@getpara/react-core/internal`) with `waitForReady: false` + `AuthProvider` (from `@getpara/react-sdk-lite` internal dist, accessed via turbopack alias `@para-internal/auth-provider`). This provides both `CoreStoreContext` and `AuthContext` that `ParaModal` requires for OAuth/phone/wallet auth flows. Added corresponding turbopack + webpack aliases in `next.config.ts`.

### AA Consolidation (2026-03-22)

- **New files in `packages/client/src/aa/`:**
  - `env.ts` — unified env var reading (`readEnv`, `readGasPolicyEnv`, `isProviderConfigured`, `resolveDefaultProvider`) with `publicOnly` flag for browser-safe vs CLI usage
  - `adapt.ts` — `adaptSmartAccount()` (bridges `@getpara/aa-*` SDK shapes to `AALike`), `isAlchemySponsorshipLimitError()`, `ParaSmartAccountLike` type
  - `resolve.ts` — `resolveAlchemyConfig()` and `resolvePimlicoConfig()` with `modeOverride`, `publicOnly`, `throwOnMissingConfig` options
  - `create.ts` — `createAAProviderState()` async smart account creation (only file importing `@getpara/aa-alchemy`/`@getpara/aa-pimlico`)
- **Refactored `src/aa/alchemy.ts`** — removed private `resolveAlchemyProviderConfig()` and `readPublicEnv()`, now delegates to `resolveAlchemyConfig({ publicOnly: true })`
- **Refactored `src/aa/pimlico.ts`** — same treatment, delegates to `resolvePimlicoConfig({ publicOnly: true })`
- **Simplified `src/cli/execution.ts`** — deleted ~200 lines of duplicated AA logic (`ParaSmartAccountLike`, `readFirstEnv`, `isProviderConfigured`, `resolveDefaultProvider`, `resolveAAProvider`, `resolveAAPlan`, `adaptSmartAccount`, `createAlchemyProviderState`, `createPimlicoProviderState`, `isAlchemySponsorshipLimitError`). Now delegates to `../aa` for all AA operations.
- **Updated `src/aa/index.ts`** — added exports for env, adapt, resolve, create modules
- **Updated `src/index.ts`** — added public API exports for new AA symbols
- **New test files:** `aa-env.unit.test.ts`, `aa-adapt.unit.test.ts`, `aa-resolve.unit.test.ts`, `aa-create.unit.test.ts`
- All 79 tests pass, library builds, lint clean

### Docs Directory Restructure Phase 7 (2026-03-04)

- **Sub-task A: Dedup reference pages**
  - Removed `### Message Processing` sequence diagram section from `reference/architecture.mdx` (duplicates `build/how-it-works.mdx`)
  - Removed `ChatAppBuilder` flowchart mermaid block from `reference/sdk.mdx` (duplicates `build/building-apps.mdx`)
- **Sub-task B: Updated routing and nav files**
  - Changed default redirect in `app/docs/[[...slug]]/page.tsx` from `/docs/getting-started/overview` to `/docs/build/overview`
  - Updated all 16 legacy redirects to point to new `/docs/build/` and `/docs/use-aomi/` paths
  - Added 19 new redirects for restructured paths (getting-started/*, core-concepts/*, integration/*, telegram/*)
  - Updated both `navLinks` and `navTabs` in `layout-config.tsx` to `/docs/build/overview`
- **Sub-task C: Updated internal links across all documentation pages**
  - Updated links in 8 persistent `.mdx` files: namespaces, api-reference, sessions, widget/configuration, reference/runtime, headless/runtime-provider, headless/install, widget/aomi-frame
  - All `/docs/core-concepts/*` links → `/docs/build/*`
  - All `/docs/getting-started/*` links → `/docs/build/*`
  - All `/docs/integration/*` links → `/docs/build/*`
  - All `/docs/guides/integration/*` links → `/docs/build/*`
  - All `/docs/guides/telegram/*` links → `/docs/use-aomi/telegram/*`
- **Sub-task D: Deleted old directories and files**
  - Deleted 13 files via `git rm`: getting-started/{overview,for-businesses,quickstart,meta.json}, core-concepts/{how-it-works,meta.json}, integration/{overview,meta.json,widget/install,widget/meta.json,headless/meta.json}, telegram/{overview,meta.json}
  - Removed 6 empty directories: getting-started/, core-concepts/, integration/widget/, integration/headless/, integration/, telegram/

### Docs Directory Restructure Phase 6 (2026-03-04)

- Created `apps/landing/content/guides/use-aomi/overview.mdx` -- Getting Started page for end users (what Aomi assistants are, chat experience, threads, wallet, where to use)
- Created `apps/landing/content/guides/use-aomi/web-chat.mdx` -- Web Chat guide (sending messages, streaming, tool calls, thread management, control bar, wallet connection, tips)
- Created `apps/landing/content/guides/use-aomi/telegram/overview.mdx` -- Telegram Bot overview rewrite (rewrote existing `telegram/overview.mdx` for end users, removed architecture diagram and panel router internals, added Getting Started section, links to sub-pages)
- Created `apps/landing/content/guides/use-aomi/faq.mdx` -- FAQ page (8 questions: tool calls, wallet safety, wallet-optional usage, models, threads, refusals, reporting problems, data access)
- All 4 pages already listed in existing `use-aomi/meta.json` from Phase 1

### Docs Directory Restructure Phase 5 (2026-03-04)

- Moved `core-concepts/building-apps.mdx` to `build/building-apps.mdx` via `git mv`
- Edited `building-apps.mdx`: removed AomiTool trait table and AomiBackend trait code block/paragraph (SDK overlap)
- Added SDK Reference callout notes where trait details were removed
- Updated Next Steps links to `/docs/build/` and `/docs/reference/` paths
- Moved `telegram/admin.mdx` to `build/telegram-bot.mdx` via `git mv`
- Reframed as "Telegram Bot Setup" for developers deploying the bot for their product
- Updated frontmatter (title: "Telegram Bot Setup", description: "Configure and deploy the Telegram bot for your product.")
- Reframed intro, section headers (Development/Production), added Next Steps with `/docs/build/` links
- Already listed in `build/meta.json` at correct positions

### Docs Directory Restructure Phase 4 (2026-03-04)

- Created `apps/landing/content/guides/build/how-it-works.mdx` by merging:
  - `core-concepts/how-it-works.mdx` (technical pipeline: mermaid diagrams, endpoint table, sequence diagram, SSE format, step-by-step walkthrough, "What Aomi Manages" table)
  - `getting-started/for-businesses.mdx` (narrative tone, "What MyCoinDex Gets" summary table, integration code snippets)
- Structural base: `how-it-works.mdx` (better technical flow with pipeline + sequence diagrams)
- Absorbed from `for-businesses.mdx`: narrative opening tone, capability summary table
- Merged "What MyCoinDex Gets" and "What Aomi Manages" into single "What You Get" table with Capability/Details/Managed By columns
- Removed: Step 6 "Integrate Into Your Product" (covered by quickstart and widget/headless pages), duplicated 4-endpoint API table (kept 5-endpoint version), duplicated preamble/model sections
- Added SSE event types table alongside the existing stream format code block
- All Next Steps links updated to `/docs/build/` paths
- Already listed in `build/meta.json` at position 3

### Docs Directory Restructure Phase 3 (2026-03-04)

- Created `apps/landing/content/guides/build/quickstart.mdx` by merging:
  - `getting-started/quickstart.mdx` (end-to-end quickstart flow: prereqs, install, env vars, add to page, configure API key, run, customizing layout)
  - `integration/widget/install.mdx` (what gets installed file tree, registry architecture, namespace configuration, updating components)
- Absorbed "What Gets Installed" (npm packages + file tree), "Registry Architecture" (three sources table + diagram), "Namespace Configuration" (shorthand via components.json), "Updating Components" (--overwrite + git diff)
- Collapsed "Philosophy" section into single sentence in Registry Architecture section
- Merged "Run Your App" and "What You Should See" into one section
- All Next Steps links updated to `/docs/build/` paths
- Already listed in `build/meta.json` at position 2

### Docs Directory Restructure Phase 2 (2026-03-04)

- Created `apps/landing/content/guides/build/overview.mdx` by merging:
  - `getting-started/overview.mdx` (What is Aomi framing, How It Works diagram, Key Features, Platform Support)
  - `integration/overview.mdx` (Widget vs Headless comparison, Shared Foundation, Choosing a Path)
- Merged two separate integration path tables into a single comprehensive 3-column comparison (Widget, Headless, Telegram)
- Developer-focused tone, removed end-user-facing language
- All links updated to new `/docs/build/` paths

### Docs Directory Restructure Phase 1 (2026-03-04)

- Created new directory structure under `apps/landing/content/guides/`:
  - `use-aomi/` and `use-aomi/telegram/`
  - `build/`, `build/widget/`, `build/headless/`
- Moved 15 unchanged pages via `git mv`:
  - 4 widget files: `integration/widget/` -> `build/widget/`
  - 4 headless files: `integration/headless/` -> `build/headless/`
  - 3 core-concepts files: `core-concepts/{namespaces,sessions,api-reference}.mdx` -> `build/`
  - 1 integration file: `integration/wallet-integration.mdx` -> `build/`
  - 3 telegram files: `telegram/{commands,panels,wallet}.mdx` -> `use-aomi/telegram/`
- Created 5 new `meta.json` files: `use-aomi/`, `use-aomi/telegram/`, `build/`, `build/widget/`, `build/headless/`
- Updated root `meta.json` with new two-section layout (Use Aomi / Build with Aomi)
- Old directories preserved (remaining files handled in later phases)
- No file content modified (link updates happen in later phases)

### Playground Theme Customizer & Radius Unification (2026-03-03)

- **Theme customizer** added to `/playground/configurator` as a "Theme" tab alongside "Layout"
  - 12 curated presets (Default, Modern Minimal, Violet Bloom, Ocean Breeze, Claude, Cyberpunk, Midnight Bloom, Catppuccin, Nature, Amber Minimal, Supabase, Mono)
  - Light/dark mode toggle (scoped to preview only via `.dark` class)
  - Radius slider (0–2rem) controlling all widget border-radius tokens
  - Collapsible color overrides with native color pickers
  - Generated Theme CSS export (`:root` + `.dark` blocks with OKLCH values)
- **New files**: `lib/color-convert.ts`, `lib/theme-presets.ts`, `lib/theme-utils.ts`, `src/components/playground/ThemeCustomizer.tsx`
- **Modified**: `PlaygroundConfigurator.tsx` — tabbed config (Layout|Theme) + tabbed code output (JSX|CSS)

#### Radius unification refactor
- **`default.css`** — extended `@theme inline` with `--radius-2xl`, `--radius-3xl`, `--radius-4xl` tokens (calc offsets from `--radius`)
- **`theme-utils.ts`** — `themeToStyleObject` now sets all 7 radius tokens (`sm` through `4xl`) as inline style overrides
- **`thread-list.tsx`** — "New Chat" button and thread list items changed from `rounded-full` → `rounded-3xl`
- **`connect-button.tsx`** — account connect button changed from `rounded-full` → `rounded-3xl`
- **`attachment.tsx`** — attachment tiles changed from `rounded-[14px]` → `rounded-xl`
- Components using `rounded-3xl`/`rounded-4xl` (suggestion cards, composer, frame wrapper) now automatically use the new tokens
- `rounded-full` kept on intentionally circular elements (send/cancel buttons, avatars, control bar pills)

### Landing Page — DeFi & X API Consoles (2026-03-01)

- **`DefiConsole.tsx`** — 9 accordion endpoints covering DefiLlama (prices, yields, protocols, chain TVL, bridges), 0x swap quotes, LI.FI cross-chain quotes, and CoW Protocol (quote + order submission)
- **`XConsole.tsx`** — 5 accordion endpoints for X API v2: user lookup, user posts, search, trends, and single post retrieval. All require Bearer token auth.
- **`defi-aggregators.mdx`** — replaced stub with intro text + `<DefiConsole />`
- **`x-apis.mdx`** — replaced stub with intro text + `<XConsole />`
- **`app/api/proxy/route.ts`** — expanded CORS proxy allowlist with DefiLlama hosts (`coins.llama.fi`, `yields.llama.fi`, `api.llama.fi`, `bridges.llama.fi`), aggregator hosts (`api.0x.org`, `li.quest`, `api.cow.fi`), and X API (`api.x.com`)
- **`ApiDrawer.tsx`** — normalized vertical padding (`py-3`) across description, URL bar, and response header sections

### Thread-Scoped Control State (2026-02-02)

- **`ThreadMetadata`** now includes a `control` field with `ThreadControlState`
- **`ThreadControlState`** stores per-thread control configuration:
  - `model: string | null` - selected model for this thread
  - `namespace: string | null` - selected namespace for this thread
  - `controlDirty: boolean` - whether control changed but chat hasn't started
  - `isProcessing: boolean` - whether thread is currently generating (disables controls)
- Model/namespace selections are now **thread-scoped** - switching threads restores previous selections
- `isProcessing` wired from orchestrator → thread metadata → control context → UI components
- Control dropdowns disabled while assistant is generating

### Control Context API Updates

- Removed `isProcessing` prop (now derived from thread metadata)
- Added `getCurrentThreadControl()` to get current thread's control state
- Added `onNamespaceSelect(namespace)` for per-thread namespace changes
- `onModelSelect(model)` now updates thread metadata + calls backend
- Added `markControlSynced()` to clear dirty flag after chat starts
- Global state: `apiKey`, `availableModels`, `authorizedNamespaces`, `defaultModel`, `defaultNamespace`
- Per-thread state: `model`, `namespace`, `controlDirty`, `isProcessing` (in ThreadMetadata)

### Control Context Refactor (2025-01-30)

- Added `ControlContextProvider` for model/namespace/apiKey management
- Model selection is backend-only via `onModelSelect(model)` - not stored in global client state
- Auto-fetches namespaces on mount and when apiKey changes
- ApiKey persisted to localStorage automatically
- Added Control API to `AomiClient`: `getNamespaces()`, `getModels()`, `setModel()`

### Control Bar Components

- `ModelSelect` - reads model from thread control state, calls `onModelSelect()` on selection
- `NamespaceSelect` - reads namespace from thread control state, calls `onNamespaceSelect()` on selection
- `ApiKeyInput` - uses `setApiKey()` for updates
- Both disabled when `isProcessing` is true

### Runtime Modularization

- Split `aomi-runtime.tsx` into shell (50 lines) + `core.tsx` (runtime logic)
- Extracted `threadlist-adapter.ts` for thread list operations
- `orchestrator.ts` now receives `aomiClient` instance instead of URL
- `ControlContextProvider` receives `getThreadMetadata` and `updateThreadMetadata` from thread context
- Core syncs `isRunning` → `threadMetadata.control.isProcessing`

### Event System

- Added `EventContextProvider` for inbound/outbound system events
- Added `UserContextProvider` for wallet/user state (replaces local state)
- Wallet state changes auto-synced via `onUserStateChange` subscription
- Handler hooks: `useWalletHandler()`, `useNotificationHandler()`

### API Simplification

- Removed `publicKey` prop from `AomiRuntimeProvider`
- Removed `WalletSystemMessageEmitter` component
- Removed `AomiRuntimeProviderWithNotifications` (use `AomiRuntimeProvider`)
- User address obtained from `useUser().user.address` internally

### Backend Compatibility (merged from codex branch)

- Added `tool_stream` field to `AomiMessage`
- Added `rehydrated`, `state_source` fields to `ApiStateResponse`
- System events use tagged enum format: `{ InlineCall: { type, payload } }`

### Apps Updated

- `apps/registry/src/components/aomi-frame.tsx` - uses new API
- `apps/registry/src/components/aomi-frame-collapsible.tsx` - uses new API
- `apps/registry/src/components/control-bar/` - uses thread-scoped control state

## Provider Structure

```
AomiRuntimeProvider
└── ThreadContextProvider
    └── NotificationContextProvider
        └── UserContextProvider
            └── ControlContextProvider (receives getThreadMetadata, updateThreadMetadata)
                └── EventContextProvider
                    └── AomiRuntimeCore (syncs isRunning → threadMetadata.control.isProcessing)
                        └── AssistantRuntimeProvider
```

## Data Flow

### Thread Control State Flow

```
User selects model/namespace
        ↓
ModelSelect/NamespaceSelect onClick
        ↓
onModelSelect(model) / onNamespaceSelect(namespace)
        ↓
updateThreadMetadata(threadId, { control: { ...control, model/namespace, controlDirty: true } })
        ↓
(for model) aomiClient.setModel(sessionId, model, namespace)
        ↓
Backend stores model selection for session
```

### isProcessing Flow

```
Backend responds / assistant generating
        ↓
orchestrator detects isRunning change
        ↓
core.tsx useEffect syncs to threadMetadata.control.isProcessing
        ↓
ControlContextProvider reads from getThreadMetadata(sessionId).control.isProcessing
        ↓
ModelSelect/NamespaceSelect get isProcessing from useControl()
        ↓
Controls disabled while isProcessing === true
```

## Pending

- End-to-end testing of wallet tx request flow
- SSE event handling verification (SystemNotice, AsyncCallback)
- E2E verification of control flow: apiKey → namespaces → model selection
- Thread list should show model/namespace per thread (optional enhancement)

## Notes

- `WalletFooterProps` still works - `wallet`/`setWallet` map to `user`/`setUser`
- `WalletButtonState` type alias kept for backwards compatibility
- Specs are designed for new agents to quickly understand the codebase
- `useControl()` hook provides access to control state and actions
- Control bar components get all data from context (no props needed)
- New threads initialize with `createDefaultControlState()` (null model/namespace)
- Thread switching restores the thread's previous model/namespace selection
