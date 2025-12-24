# Runtime Orchestration

This document explains how `AomiRuntimeProvider` composes runtime hooks and how the main flows work.

## Overview

`src/components/assistant-ui/runtime.tsx` is the orchestration layer. It:
- Pulls thread state from `useThreadContext()`.
- Creates shared refs (current thread id, pending queues, temp thread flags).
- Composes focused hooks in `src/hooks/runtime/`.
- Builds the Assistant UI runtime via `useExternalStoreRuntime()`.

## Hook Responsibilities

- `useBackendApi`: stable `BackendApi` ref, swapped on backend URL change.
- `useThreadIdMapping`: temp <-> backend id mapping and readiness checks.
- `useThreadMessageStore`: apply backend messages into thread state, skipping when user messages are queued.
- `useWalletTx`: wallet tx queue + notifications + post system updates.
- `useBackendSystemEvents`: parse backend system events and dispatch wallet tx or notifications.
- `useThreadPolling`: polling loop for `/api/state` when backend is processing.
- `useThreadUpdates`: SSE subscription + event drain for the active session.
- `useThreadMessaging`: send user/system messages, ensure backend session creation for temp threads.
- `useThreadStateSync`: fetch initial state on thread switch and set active subscription.
- `useThreadListSync`: fetch thread list for the current public key.
- `useThreadLifecycle`: thread list actions (new, switch, rename, archive, delete).
- `useThreadListAdapter`: data adapter for the thread list UI.

## Main Flow: New Chat -> First Message -> Backend Session

```mermaid
sequenceDiagram
  participant U as User
  participant TL as ThreadList UI
  participant RT as AomiRuntimeProvider
  participant MSG as useThreadMessaging
  participant API as BackendApi
  participant UP as useThreadUpdates (SSE)
  participant PL as useThreadPolling
  participant SYNC as useThreadStateSync

  U->>TL: Click "New Chat"
  TL->>RT: onSwitchToNewThread()
  RT->>RT: Create temp thread + set currentThreadId

  U->>RT: Send first message
  RT->>MSG: onNew(message)
  MSG->>MSG: Queue message (temp thread)
  MSG->>API: createThread()
  API-->>MSG: session_id
  MSG->>RT: bind temp -> backend id
  MSG->>UP: setSubscribableSessionId()
  UP->>API: subscribeToUpdates(session_id)

  MSG->>API: postChatMessage(session_id)
  MSG->>PL: startPolling()
  PL->>API: fetchState() loop
  SYNC->>API: fetchState() on thread switch
  API-->>PL: state (messages, is_processing)
  PL->>RT: applyMessagesForThread()
  PL-->>PL: stop when is_processing false
```

## Other Key Flows (Short Form)

**Thread switch**
1. User clicks a thread in the list.
2. `useThreadStateSync` fetches `/api/state` for that thread.
3. `useThreadUpdates` subscribes to SSE for that session.
4. `useThreadPolling` starts only if backend is processing.

**Wallet tx request**
1. Backend emits system event (`InlineDisplay` wallet_tx_request).
2. `useBackendSystemEvents` forwards to `useWalletTx`.
3. `useWalletTx` prompts wallet, posts system message with result, and refreshes state.

## Notes

- Temp threads allow immediate UI updates before backend session creation.
- Only the active thread is subscribed to SSE updates.
- Polling is used only while the backend reports `is_processing=true`.
