# Project Metadata

## Package
- Name: `@aomi-labs/react`
- Purpose: Runtime/state package for the AI assistant widget (paired with shadcn registry components)

## Stack
- React 19.2 / Next.js 15.5 / TypeScript
- `@assistant-ui/react` for chat primitives
- Radix UI + Tailwind CSS 4 for styling
- `tsup` for library bundling

## Directory Structure
```
packages/react/
└── src/
    ├── api/                    # HTTP client + types
    ├── runtime/                # Aomi runtime, polling, thread list adapter
    ├── state/                  # Thread context + types
    ├── utils/                  # Conversion + wallet helpers
    ├── themes/                 # Default theme tokens
    └── index.ts                # Public exports

apps/registry/                  # Shadcn registry (UI components + build script)
apps/landing/                   # Demo Next.js app
apps/docs/                      # Docs + playground
```

## Commands
```bash
pnpm install              # Install deps
pnpm run build:react      # Build → packages/react/dist
pnpm --filter registry build # Generate registry dist JSON
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
