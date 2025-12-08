# Domain Rules

## Architecture

**Single Sources of Truth:**
- Backend calls → `lib/backend-api.ts` only
- Thread state → `lib/thread-context.tsx` only
- Message conversion → `lib/conversion.ts` only
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
| Use `BackendApi` methods for all fetches | Direct `fetch()` calls in components |
| Use `useThreadContext()` for thread state | Local state for thread data |
| Use `sendSystemMessage()` for wallet events | Push wallet text into message arrays |
| Optimistic UI updates + backend confirm | Wait for backend before updating UI |
| Call `ensureThreadExists()` before switch | Switch to thread without metadata |

## File Conventions

| Location | Purpose |
|----------|---------|
| `components/assistant-ui/*.tsx` | Assistant-specific UI (runtime, thread, attachments) |
| `components/ui/*.tsx` | Shadcn-style primitives (button, dialog, card) |
| `lib/*.ts` | Core logic (API, context, conversion, utils) |
| `utils/*.ts` | Helpers (wallet formatting) |
| `hooks/*.ts` | Cross-cutting React hooks |

## Key Types

| Type | Source |
|------|--------|
| `ThreadMessageLike` | `@assistant-ui/react` |
| `SessionMessage`, `SessionResponsePayload` | `lib/backend-api.ts` |
| `ThreadMetadata`, `ThreadContextValue` | `lib/thread-context.tsx` |

## Data Flows

**User message:** Composer → `onNew()` → `BackendApi.postChatMessage()` → polling `/api/state` → update context → re-render

**Thread switch:** Click → `setCurrentThreadId()` → `ensureThreadExists()` → fetch state → apply messages

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

## Invariants

1. Every thread has metadata + message array before use
2. All components with browser APIs have `"use client"`
3. Thread titles follow "Chat N" pattern unless backend provides title
4. Polling stops when `is_processing=false`
