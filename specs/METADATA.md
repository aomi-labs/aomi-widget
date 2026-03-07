# Project Metadata

## Package

- Name: `@aomi-labs/react`
- Purpose: AI assistant widget for onchain apps (React component wrapping Assistant UI)

## Stack

- React 19 / Next.js 15 / TypeScript
- `@assistant-ui/react` for chat primitives
- Radix UI + Tailwind CSS 4 for styling
- `tsup` for library bundling

## Visual Layout Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AomiFrame.Root                                   │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────────┐ │
│  │  ThreadListSidebar   │  │              SidebarInset                    │ │
│  │  ┌────────────────┐  │  │  ┌────────────────────────────────────────┐  │ │
│  │  │ SidebarHeader  │  │  │  │           AomiFrame.Header             │  │ │
│  │  │ ┌────────────┐ │  │  │  │ ┌─────┐ ┌───────────────────┐ ┌─────┐  │  │ │
│  │  │ │    Logo    │ │  │  │  │ │ ☰   │ │    ControlBar     │ │Title│  │  │ │
│  │  │ └────────────┘ │  │  │  │ └─────┘ │ Model│Agent│🔑│👛 │ └─────┘  │  │ │
│  │  │ [WalletConnect]│  │  │  │         └───────────────────┘          │  │ │
│  │  └────────────────┘  │  │  └────────────────────────────────────────┘  │ │
│  │  ┌────────────────┐  │  │  ┌────────────────────────────────────────┐  │ │
│  │  │  ThreadList    │  │  │  │          AomiFrame.Composer            │  │ │
│  │  │  ┌──────────┐  │  │  │  │  ┌──────────────────────────────────┐  │  │ │
│  │  │  │ Thread 1 │  │  │  │  │  │                                  │  │  │ │
│  │  │  ├──────────┤  │  │  │  │  │           Message List           │  │  │ │
│  │  │  │ Thread 2 │  │  │  │  │  │         (Thread component)       │  │  │ │
│  │  │  ├──────────┤  │  │  │  │  │                                  │  │  │ │
│  │  │  │ Thread 3 │  │  │  │  │  │    ┌─────────────────────────┐   │  │  │ │
│  │  │  └──────────┘  │  │  │  │  │    │     User Message        │   │  │  │ │
│  │  └────────────────┘  │  │  │  │    └─────────────────────────┘   │  │  │ │
│  │  ┌────────────────┐  │  │  │  │    ┌─────────────────────────┐   │  │  │ │
│  │  │ SidebarFooter  │  │  │  │  │    │   Assistant Message     │   │  │  │ │
│  │  │ [WalletConnect]│  │  │  │  │    └─────────────────────────┘   │  │  │ │
│  │  └────────────────┘  │  │  │  │                                  │  │  │ │
│  └──────────────────────┘  │  │  │  ┌──────────────────────────────────┐  │ │
│                            │  │  │  │           Composer               │  │ │
│                            │  │  │  │  ┌────────────────────────┐ ┌──┐ │  │ │
│                            │  │  │  │  │  Type a message...     │ │➤ │ │  │ │
│                            │  │  │  │  └────────────────────────┘ └──┘ │  │ │
│                            │  │  │  └──────────────────────────────────┘  │ │
│                            │  │  └────────────────────────────────────┘  │ │
│                            │  └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

ControlBar Components:
┌───────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────┐  ┌─────────────┐  ┌────┐  ┌─────────────────┐            │
│  │ ModelSelect │  │NamespaceSelect│  │ 🔑 │  │  WalletConnect │ {children} │
│  │  (dropdown) │  │  (dropdown)   │  │    │  │   (button)     │            │
│  └─────────────┘  └───────────────┘  └────┘  └─────────────────┘            │
│                                      ApiKey                                │
│                                      Input                                 │
└───────────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
AomiFrame (DefaultLayout)
├── AomiFrame.Root
│   ├── AomiRuntimeProvider (context)
│   ├── SidebarProvider (context)
│   ├── ThreadListSidebar
│   │   ├── SidebarHeader (Logo + optional WalletConnect)
│   │   ├── ThreadList
│   │   └── SidebarFooter (optional WalletConnect)
│   └── SidebarInset
│       ├── AomiFrame.Header
│       │   ├── SidebarTrigger (hamburger menu)
│       │   ├── ControlBar
│       │   │   ├── ModelSelect
│       │   │   ├── NamespaceSelect
│       │   │   ├── ApiKeyInput
│       │   │   └── WalletConnect
│       │   └── Breadcrumb (thread title)
│       └── AomiFrame.Composer
│           └── Thread (messages + composer input)
```

## Directory Structure

```
packages/react/src/
├── index.ts                      # Public exports
├── interface.tsx                 # AomiRuntimeApi type and useAomiRuntime hook
├── backend/
│   ├── client.ts                 # AomiClient HTTP client
│   └── types.ts                  # API response types
├── contexts/
│   ├── control-context.tsx       # Model/namespace/apiKey state (per-thread)
│   ├── event-context.tsx         # Event system (SSE + system events)
│   ├── user-context.tsx          # User/wallet state
│   ├── thread-context.tsx        # Thread state management
│   └── notification-context.tsx  # Toast notifications
├── handlers/
│   ├── wallet-handler.ts         # useWalletHandler hook
│   └── notification-handler.ts   # useNotificationHandler hook
├── runtime/
│   ├── aomi-runtime.tsx          # Provider shell (contexts)
│   ├── core.tsx                  # Runtime logic (syncs isRunning → threadMetadata)
│   ├── threadlist-adapter.ts     # Thread list adapter builder
│   ├── orchestrator.ts           # Coordinates polling + messages
│   ├── polling-controller.ts     # Polling state machine
│   ├── message-controller.ts     # Message send/receive
│   └── utils.ts                  # Message conversion, wallet helpers
├── state/
│   ├── backend-state.ts          # Backend sync state
│   ├── thread-store.ts           # ThreadStore class, ThreadMetadata, ThreadControlState
│   └── event-buffer.ts           # Event queue

apps/registry/src/                # UI components (AomiFrame, Thread, etc.)
├── components/control-bar/       # ModelSelect, NamespaceSelect, ApiKeyInput, WalletConnect
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

## Key Types

### ThreadMetadata (per-thread state)

```typescript
type ThreadMetadata = {
  title: string;
  status: "regular" | "archived" | "pending";
  lastActiveAt?: string | number;
  control: ThreadControlState; // Per-thread control configuration
};
```

### ThreadControlState (control configuration per thread)

```typescript
type ThreadControlState = {
  model: string | null; // Selected model label
  namespace: string | null; // Selected namespace/agent
  controlDirty: boolean; // Changed but chat hasn't started
  isProcessing: boolean; // Assistant generating (disables controls)
};
```

### ControlState (global control state)

```typescript
type ControlState = {
  apiKey: string | null; // Persisted to localStorage
  availableModels: string[]; // From GET /api/control/models
  authorizedNamespaces: string[]; // From GET /api/control/namespaces
  defaultModel: string | null; // First available model
  defaultNamespace: string | null; // "default" or first namespace
};
```

### ControlContextApi (useControl() return type)

```typescript
type ControlContextApi = {
  state: ControlState;
  setApiKey: (apiKey: string | null) => void;
  getAvailableModels: () => Promise<string[]>;
  getAuthorizedNamespaces: () => Promise<string[]>;
  getCurrentThreadControl: () => ThreadControlState;
  onModelSelect: (model: string) => Promise<void>;
  onNamespaceSelect: (namespace: string) => void;
  isProcessing: boolean; // Derived from thread metadata
  markControlSynced: () => void;
  // ... other methods
};
```

## Backend API Endpoints

```
GET  /api/control/models              # List available models
GET  /api/control/namespaces          # List authorized namespaces
POST /api/control/model?rig=X&namespace=Y  # Set model for session
GET  /api/state                       # Get thread state
POST /api/chat?message=X&namespace=Y  # Send chat message
```

All endpoints require `X-Session-Id` header.
