# Domain Rules

## Architecture

**Single Sources of Truth:**

- User/wallet state → `contexts/user-context.tsx` via `useUser()` hook
- Thread state → `contexts/thread-context.tsx` via `useThreadContext()`
- Event dispatching → `contexts/event-context.tsx` via `useEventContext()`
- Backend API calls → `backend/client.ts` (BackendApi class)
- Message conversion → `runtime/utils.ts`

**Provider Hierarchy:**

```
ThreadContextProvider (external - must wrap AomiRuntimeProvider)
└── AomiRuntimeProvider (shell)
    └── NotificationContextProvider
        └── UserContextProvider
            └── EventContextProvider
                └── RuntimeActionsProvider
                    └── AomiRuntimeCore
                        └── AssistantRuntimeProvider
                            └── {children}
```

**Component Hierarchy:**

```
AomiFrame (apps/registry)
├── ThreadListSidebar (navigation)
├── Thread (message view)
└── WalletFooter slot (via render prop)
```

## Do / Don't

| Do                                        | Don't                               |
| ----------------------------------------- | ----------------------------------- |
| Use `useUser()` for wallet state          | Local wallet state in components    |
| Use `useThreadContext()` for thread state | Local state for thread data         |
| Use `useWalletHandler()` for tx requests  | Manual event subscription           |
| Let runtime auto-sync wallet changes      | Manual `sendSystemMessage()` calls  |
| Optimistic UI updates + backend confirm   | Wait for backend before updating UI |

## File Conventions

| Location         | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| `backend/*.ts`   | BackendApi HTTP client + API types                             |
| `contexts/*.tsx` | React contexts (User, Event, Thread, Notification)             |
| `handlers/*.ts`  | Event handler hooks (useWalletHandler, useNotificationHandler) |
| `runtime/*.tsx`  | Runtime orchestration (providers, controllers)                 |
| `state/*.ts`     | State stores (backend-state, thread-store, event-buffer)       |

## Key Types

| Type                              | Source                       |
| --------------------------------- | ---------------------------- |
| `ThreadMessageLike`               | `@assistant-ui/react`        |
| `AomiMessage`, `ApiStateResponse` | `backend/types.ts`           |
| `UserState`                       | `contexts/user-context.tsx`  |
| `InboundEvent`, `OutboundEvent`   | `state/event-buffer.ts`      |
| `WalletTxRequest`                 | `handlers/wallet-handler.ts` |

## Data Flows

**User message:**

```
Composer → onNew() → MessageController.outbound()
  → BackendApi.postChatMessage() → PollingController.start()
  → poll /api/state → MessageController.inbound() → re-render
```

**Thread switch:**

```
Click → threadListAdapter.onSwitchToThread()
  → setCurrentThreadId() → ensureInitialState()
  → fetchState() → apply messages
```

**Wallet state change:**

```
External wallet lib → setUser() → onUserStateChange callback
  → postSystemMessage("wallet:state_changed") → backend
```

**Inbound system event (e.g., wallet_tx_request):**

```
Backend → /api/state response → system_events[]
  → PollingController.handleState() → dispatchInboundSystem()
  → EventBuffer → dispatch() → useWalletHandler subscription
  → onTxRequest callback
```

## Backend Endpoints

| Endpoint                           | Purpose        | Response                  |
| ---------------------------------- | -------------- | ------------------------- |
| `POST /api/chat`                   | Send message   | `ApiChatResponse`         |
| `GET /api/state`                   | Poll session   | `ApiStateResponse`        |
| `POST /api/interrupt`              | Cancel         | `ApiInterruptResponse`    |
| `POST /api/system`                 | System message | `ApiSystemResponse`       |
| `GET /api/updates`                 | SSE stream     | `ApiSSEEvent`             |
| `POST /api/sessions`               | Create thread  | `ApiCreateThreadResponse` |
| `GET /api/sessions`                | List threads   | `ApiThread[]`             |
| `PATCH /api/sessions/:id`          | Rename         | -                         |
| `DELETE /api/sessions/:id`         | Delete         | 204                       |
| `POST /api/sessions/:id/archive`   | Archive        | 200                       |
| `POST /api/sessions/:id/unarchive` | Unarchive      | 200                       |

**ApiStateResponse:** `{ messages?, system_events?, is_processing?, title?, session_exists? }`

## Architecture Layers

```
UI Components (apps/registry - AomiFrame, Thread, etc.)
    ↓ uses hooks from lib
Contexts & Handlers (packages/react/contexts, handlers)
    ↓ uses
Runtime (packages/react/runtime - orchestrator, controllers)
    ↓ uses
BackendApi (packages/react/backend)
    ↓ HTTP/SSE
Backend Server
```

## Invariants

1. `ThreadContextProvider` must wrap `AomiRuntimeProvider`
2. All components with browser APIs have `"use client"`
3. Wallet state synced automatically via `onUserStateChange` subscription
4. Polling stops when `is_processing=false`
5. System events dispatched to EventBuffer for handler subscription

