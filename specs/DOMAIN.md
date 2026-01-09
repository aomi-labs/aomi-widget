# Domain Rules

## Architecture

**Single Sources of Truth:**
- Session operations → `services/session-service.ts` only (via `useSessionService` hook)
- Backend API calls → `api/client.ts` (BackendApi class) - used by services only
- Thread state → `state/thread-context.tsx` only
- Message conversion → `utils/conversion.ts` only
- Wallet events → `utils/wallet.ts` → `sendSystemMessage()` only

**Component Hierarchy:**
```
AomiFrame (shell)
├── ThreadListSidebar (navigation)
├── AomiRuntimeProvider (backend wiring)
│   └── ThreadContextProvider (state)
│       └── Thread (message view)
└── WalletFooter slot (optional)
```

## Do / Don't

| Do | Don't |
|----|-------|
| Use `SessionService` for session operations | Direct `BackendApi` calls in runtime/components |
| Use `useSessionService()` hook to get service | Instantiate `SessionService` directly |
| Use `useThreadContext()` for thread state | Local state for thread data |
| Use `sendSystemMessage()` for wallet events | Push wallet text into message arrays |
| Optimistic UI updates + backend confirm | Wait for backend before updating UI |
| Call `ensureThreadExists()` before switch | Switch to thread without metadata |

## File Conventions

| Location | Purpose |
|----------|---------|
| `components/assistant-ui/*.tsx` | Assistant-specific UI (runtime, thread, attachments) |
| `components/ui/*.tsx` | Shadcn-style primitives (button, dialog, card) |
| `api/*.ts` | Backend API client (BackendApi class) - low-level HTTP |
| `services/*.ts` | Service layer (SessionService) - business logic abstraction |
| `state/*.tsx` | State management (thread context, stores) |
| `utils/*.ts` | Helpers (wallet formatting, conversion) |
| `hooks/*.ts` | Cross-cutting React hooks (useSessionService, etc.) |
| `runtime/*.tsx` | Runtime orchestration (AomiRuntimeProvider) |

## Key Types

| Type | Source |
|------|--------|
| `ThreadMessageLike` | `@assistant-ui/react` |
| `SessionMessage`, `SessionResponsePayload` | `api/types.ts` |
| `BackendThreadMetadata`, `CreateThreadResponse` | `api/types.ts` |
| `ThreadMetadata`, `ThreadContextValue` | `state/types.ts` |
| `SessionService` | `services/session-service.ts` |

## Data Flows

**User message:** Composer → `onNew()` → `BackendApi.postChatMessage()` → polling `/api/state` → update context → re-render

**Thread switch:** Click → `setCurrentThreadId()` → `ensureThreadExists()` → fetch state → apply messages

**Session operations:** Runtime → `useSessionService()` → `SessionService` → `BackendApi` → HTTP → backend

**Wallet connect:** State change → `WalletSystemMessageEmitter` → `sendSystemMessage()` → backend

## Backend Endpoints

| Endpoint | Query Params | Response |
|----------|--------------|----------|
| `POST /api/chat` | `session_id`, `message`, `public_key?` | `SessionResponse` |
| `GET /api/state` | `session_id` | `SessionResponse` |
| `POST /api/interrupt` | `session_id` | `SessionResponse` |
| `POST /api/system` | `session_id`, `message` | `SystemResponse` |
| `GET /api/updates` | `session_id` | SSE stream (`SystemUpdate`) |
| `POST /api/sessions` | — | `{ session_id, title? }` |
| `GET /api/sessions` | — | `ThreadMetadata[]` |
| `GET /api/sessions/:id` | — | `ThreadMetadata` |
| `PATCH /api/sessions/:id` | `title` | `ThreadMetadata` |
| `DELETE /api/sessions/:id` | — | 204 |
| `POST /api/sessions/:id/archive` | — | 200 |
| `POST /api/sessions/:id/unarchive` | — | 200 |

`SessionResponse`: `{ messages?, is_processing?, pending_wallet_tx?, title? }`

## Architecture Layers

```
UI Components (apps/registry)
    ↓ uses hooks/context
Session Service (packages/react/services)
    ↓ uses
BackendApi (packages/react/api)
    ↓ HTTP calls
Backend Server
```

**Decoupling Rules:**
- UI components (`apps/registry`) never directly import or use `BackendApi`
- Runtime layer uses `SessionService` via `useSessionService()` hook
- `SessionService` encapsulates all session operations (list, get, create, delete, rename, archive, unarchive)
- `BackendApi` is only used by service layer, not by components or runtime directly

## Invariants

1. Every thread has metadata + message array before use
2. All components with browser APIs have `"use client"`
3. Thread titles follow "Chat N" pattern unless backend provides title
4. Polling stops when `is_processing=false`
5. Session operations must go through `SessionService`, never direct `BackendApi` calls
