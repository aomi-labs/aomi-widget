# Project Metadata

## Package
- Name: `@aomi-labs/react`
- Purpose: AI assistant widget for onchain apps (React component wrapping Assistant UI)

## Stack
- React 19.2 / Next.js 15.5 / TypeScript
- `@assistant-ui/react` for chat primitives
- Radix UI + Tailwind CSS 4 for styling
- `tsup` for library bundling

## Directory Structure
```
packages/react/src/
├── index.ts                     # Public exports
├── api/
│   ├── client.ts               # BackendApi HTTP client
│   └── types.ts                # API types
├── services/
│   └── session-service.ts      # SessionService - session operations abstraction
├── hooks/
│   └── use-session-service.ts  # useSessionService hook
├── runtime/
│   └── aomi-runtime.tsx       # AomiRuntimeProvider
├── state/
│   ├── thread-context.tsx      # Thread state management
│   └── types.ts                # State types
├── utils/
│   ├── conversion.ts           # Message transforms
│   └── wallet.ts               # Wallet helpers
└── lib/
    └── notification-context.tsx # Notification system

apps/registry/src/               # UI components (decoupled from backend)
apps/landing/                    # Demo Next.js app
dist/                           # Build output
```

## Commands
```bash
pnpm install              # Install deps
pnpm run build:lib        # Build → dist/
pnpm --filter landing dev # Demo at :3000
pnpm lint                 # Lint check
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
