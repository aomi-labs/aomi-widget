# Project Metadata

## Package

- Name: `@aomi-labs/react`
- Purpose: AI assistant widget for onchain apps (React component wrapping Assistant UI)

## Stack

- React 19 / Next.js 15 / TypeScript
- `@assistant-ui/react` for chat primitives
- Radix UI + Tailwind CSS 4 for styling
- `tsup` for library bundling

## Directory Structure

```
packages/react/src/
├── index.ts                      # Public exports
├── backend/
│   ├── client.ts                 # BackendApi HTTP client
│   └── types.ts                  # API response types
├── contexts/
│   ├── event-context.tsx         # Event system (SSE + system events)
│   ├── user-context.tsx          # User/wallet state
│   ├── thread-context.tsx        # Thread state management
│   ├── notification-context.tsx  # Toast notifications
│   └── runtime-actions.ts        # Legacy runtime actions (deprecated)
├── handlers/
│   ├── wallet-handler.ts         # useWalletHandler hook
│   └── notification-handler.ts   # useNotificationHandler hook
├── runtime/
│   ├── aomi-runtime.tsx          # Provider shell (contexts)
│   ├── core.tsx                  # Runtime logic (uses hooks)
│   ├── threadlist-adapter.ts     # Thread list adapter builder
│   ├── orchestrator.ts           # Coordinates polling + messages
│   ├── polling-controller.ts     # Polling state machine
│   ├── message-controller.ts     # Message send/receive
│   └── utils.ts                  # Message conversion, wallet helpers
├── state/
│   ├── backend-state.ts          # Backend sync state
│   ├── thread-store.ts           # Thread metadata store
│   └── event-buffer.ts           # Event queue

apps/registry/src/                # UI components (AomiFrame, Thread, etc.)
apps/landing/                     # Demo Next.js app
dist/                             # Build output
```

## Commands

```bash
pnpm install                 # Install deps
pnpm run build:lib           # Build → dist/
pnpm --filter landing dev    # Demo at :3000
pnpm run dev:landing:live    # Watch lib + landing together
pnpm lint                    # Lint check
```

## Environment

```
NEXT_PUBLIC_BACKEND_URL   # API base (default: localhost:8080)
NEXT_PUBLIC_PROJECT_ID    # Reown Web3 project ID
```

## Ports

- 3000: Demo app (Next.js dev)
- 8080: Backend API (expected)

## Build Output

```
dist/
├── index.js      # ESM
├── index.cjs     # CommonJS
├── index.d.ts    # Types
└── styles.css    # Styles
```
