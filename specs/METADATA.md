# Project Metadata

## Package
- Name: `@aomi-labs/widget-lib`
- Purpose: AI assistant widget for onchain apps (React component wrapping Assistant UI)

## Stack
- React 19.2 / Next.js 15.5 / TypeScript
- `@assistant-ui/react` for chat primitives
- Radix UI + Tailwind CSS 4 for styling
- `tsup` for library bundling

## Directory Structure
```
src/
├── index.ts                     # Public exports
├── styles.css                   # Widget styles
├── components/
│   ├── aomi-frame.tsx          # Main widget shell
│   ├── assistant-ui/           # Chat UI (runtime, thread, attachments)
│   └── ui/                     # Primitives (button, dialog, sidebar)
├── lib/
│   ├── backend-api.ts          # HTTP client
│   ├── runtime-utils.ts # Runtime helpers
│   ├── thread-context.tsx      # State management
│   └── conversion.ts           # Message transforms
├── utils/wallet.ts             # Wallet helpers
├── hooks/use-mobile.ts         # Mobile detection
└── hooks/runtime/     # Runtime hooks (polling, updates, lifecycle)

example/                         # Demo Next.js app
dist/                           # Build output
```

## Commands
```bash
pnpm install              # Install deps
pnpm run build:lib        # Build → dist/
pnpm --filter example dev # Demo at :3000
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
