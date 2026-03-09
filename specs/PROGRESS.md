# Progress Tracker

## Current Sprint Goal

Documentation restructure: Full navigation overhaul of `apps/landing/content/guides/` to improve audience orientation, introduce key concepts as standalone pages, and reorganize Build/Reference/Advanced sections.

## Branch Status

- **Current Branch:** `sync-fe-shadcn`
- **Focus:** Docs structure and content for the landing site

### Recent Commits

| Hash    | Description                                          |
| ------- | ---------------------------------------------------- |
| cdef6ce | chore: remove leftover build-with-aomi directory     |
| 41ae270 | Merge branch 'claude/cool-tharp' into sync-fe-shadcn |
| edadac1 | Restructure docs                                     |
| e1d205f | docs: dedup references, update links/redirects       |
| edf2195 | docs: create Use Aomi end-user pages                 |
| 8fc5931 | docs: edit building-apps and create telegram-bot     |
| fa3f484 | docs: create merged build/quickstart.mdx             |

## New Navigation Structure

```
Introduction                        ← Audience routing + key concept links
── Key Concepts ──
  Namespace                         ← Standalone concept page
  Non-Custodial Wallet              ← Standalone concept page (simulation guardrail)
── Transact with Aomi ──            ← renamed from "Use Aomi"
  ── Web Chat ──  (overview, web-chat, faq)
  ── Telegram ──  (overview, commands, panels, wallet)
── Build with Aomi ──
  Overview / Getting Started / Integration Guide
  ── UI ──        (widget/* + headless/*)
  ── Services ──  (sessions, building-apps, api-reference, wallet-integration, telegram-bot)
── Reference ──
  Simulation / Account Abstraction / Runtime
── Advanced ──
  Evals / SDK / CLI
```

## Recently Completed Work

| Task | Description | Key Changes |
| ---- | ----------- | ----------- |
| Root meta.json restructure | Full navigation rebuild | `content/guides/meta.json` - new sections, new page order, added Introduction + Key Concepts |
| use-aomi/meta.json rename | "Use Aomi" → "Transact with Aomi" + Web Chat/Telegram subcategory separators | `content/guides/use-aomi/meta.json` |
| build/meta.json restructure | Getting Started, Integration Guide, UI + Services subcategories | `content/guides/build/meta.json` |
| reference/meta.json slim | Replaced with Simulation, Account Abstraction, Runtime only | `content/guides/reference/meta.json` |
| advanced/meta.json update | Now contains Evals, SDK, CLI | `content/guides/advanced/meta.json` |
| introduction.mdx | New top-level page: audience routing + key concept links | `content/guides/introduction.mdx` |
| namespace.mdx | Standalone concept page explaining namespaces for users and builders | `content/guides/namespace.mdx` |
| non-custodial-wallet.mdx | Standalone concept page: non-custodial signing + simulation guardrail | `content/guides/non-custodial-wallet.mdx` |
| getting-started.mdx | Install/setup quickstart ported from quickstart.mdx | `content/guides/build/getting-started.mdx` |
| integration-guide.mdx | Platform pipeline doc renamed from how-it-works, + Examples links (Polymarket, DeFi, X) | `content/guides/build/integration-guide.mdx` |
| simulation.mdx | New reference page extracted from execution.mdx, focused on Anvil + pre-signing simulation | `content/guides/reference/simulation.mdx` |
| account-abstraction.mdx | Empty placeholder for upcoming AA content | `content/guides/reference/account-abstraction.mdx` |
| sdk.mdx (advanced) | Moved from reference/sdk.mdx → advanced/sdk.mdx | `content/guides/advanced/sdk.mdx` |
| cli.mdx (advanced) | Moved from reference/cli.mdx → advanced/cli.mdx | `content/guides/advanced/cli.mdx` |

## Files Modified This Sprint

### New Files Created

- `apps/landing/content/guides/introduction.mdx` — Top-level orientation page
- `apps/landing/content/guides/namespace.mdx` — Namespace concept page
- `apps/landing/content/guides/non-custodial-wallet.mdx` — Wallet safety + simulation concept page
- `apps/landing/content/guides/build/getting-started.mdx` — Install & setup guide
- `apps/landing/content/guides/build/integration-guide.mdx` — API integration guide (replaces how-it-works)
- `apps/landing/content/guides/reference/simulation.mdx` — Simulation + Anvil reference
- `apps/landing/content/guides/reference/account-abstraction.mdx` — Empty placeholder
- `apps/landing/content/guides/advanced/sdk.mdx` — Rust SDK reference (moved from reference/)
- `apps/landing/content/guides/advanced/cli.mdx` — CLI reference (moved from reference/)

### Updated Files

- `apps/landing/content/guides/meta.json` — Complete restructure
- `apps/landing/content/guides/use-aomi/meta.json` — Title + Web Chat/Telegram sections
- `apps/landing/content/guides/build/meta.json` — Getting Started, Integration Guide, UI, Services
- `apps/landing/content/guides/reference/meta.json` — Slim to 3 pages
- `apps/landing/content/guides/advanced/meta.json` — Evals, SDK, CLI

### Files Removed from Navigation (still on disk)

- `start-here.mdx` — replaced by `introduction.mdx`
- `build/quickstart.mdx` — replaced by `build/getting-started.mdx`
- `build/how-it-works.mdx` — replaced by `build/integration-guide.mdx`
- `build/namespaces.mdx` — concept now in `namespace.mdx`
- `reference/architecture.mdx` — dropped from new structure
- `reference/sdk.mdx` — moved to `advanced/sdk.mdx`
- `reference/cli.mdx` — moved to `advanced/cli.mdx`
- `advanced/execution.mdx` — content used in `reference/simulation.mdx`
- `advanced/script-generation.mdx` — dropped from new structure
- `use-aomi/quickstart.mdx` — covered by `introduction.mdx`

## Pending Tasks

### Documentation

- [ ] Verify dev server renders new nav correctly (`pnpm --filter landing dev`)
- [ ] Check all internal cross-links in new/updated pages resolve correctly
- [ ] Fill in `reference/account-abstraction.mdx` when AA content is ready
- [ ] Review `non-custodial-wallet.mdx` and `namespace.mdx` copy with product team
- [ ] Consider updating `build/overview.mdx` to reference the new introduction page

### Code (carry-over from component-improve sprint)

- [ ] E2E test: apiKey → namespaces fetch → model selection flow
- [ ] Add loading states to ModelSelect and NamespaceSelect
- [ ] Add unit tests for useWalletHandler / useNotificationHandler
- [ ] Add integration tests for event flow

## Known Issues

None currently.

## Notes for Next Agent

### Docs Location

All docs are at `apps/landing/content/guides/`. The Fumadocs navigation is controlled entirely by `meta.json` files at each directory level.

### Files NOT deleted (just excluded from nav)

The old files (`quickstart.mdx`, `how-it-works.mdx`, `namespaces.mdx`, `start-here.mdx`, `reference/architecture.mdx`, `reference/sdk.mdx`, `reference/cli.mdx`, `advanced/execution.mdx`, `advanced/script-generation.mdx`, `use-aomi/quickstart.mdx`) still exist on disk but are no longer listed in any `meta.json`. They are effectively orphaned — safe to delete in a follow-up cleanup commit if desired.

### Key Concept Pages

`namespace.mdx` and `non-custodial-wallet.mdx` are at the root of `content/guides/` (not inside any subfolder). They appear in the nav under the `---Key Concepts---` separator defined in root `meta.json`.

### Build Commands

```bash
pnpm --filter landing dev    # Run landing at localhost:3000
pnpm --filter landing build  # Build check
pnpm lint                    # Lint check
```

### Code Architecture (from prior sprint — still valid)

The runtime uses an event-driven architecture with a Control Context for model/namespace management:

```
Provider Layer:
ThreadContextProvider → AomiRuntimeProvider → EventContextProvider → RuntimeActionsProvider
  → AomiRuntimeCore → ControlContextProvider → AssistantRuntimeProvider

Key State:
- ThreadContext (reactive) - UI-facing thread/message data
- BackendState (mutable ref) - Backend sync coordination
- EventBuffer (mutable ref) - Inbound/outbound event queues
- ControlState (reactive) - namespace, apiKey, availableModels, authorizedNamespaces
```
