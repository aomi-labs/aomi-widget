# Runtime Architecture

This document explains how the Aomi runtime system works, including component structure, state management, and message flow.

## Overview

The runtime is built on `@assistant-ui/react`'s external store pattern. It bridges React UI components with a backend chat API through a layered architecture of controllers and state managers.

---

## Component Structure

```mermaid
graph TB
    subgraph "Provider Layer"
        TCP[ThreadContextProvider]
        ARP[AomiRuntimeProvider]
        RAP[RuntimeActionsProvider]
        ASRP[AssistantRuntimeProvider]
    end

    subgraph "Controllers"
        RO[RuntimeOrchestrator]
        MC[MessageController]
        PC[PollingController]
        EC[EventController]
    end

    subgraph "State"
        BS[BackendState]
        TS[ThreadStore]
        EB[EventBuffer]
    end

    subgraph "Hooks"
        WH[WalletHandler]
    end

    subgraph "External"
        API[BackendApi]
        SSE[BackendSSE]
        BE[Backend Server]
    end

    TCP --> ARP
    ARP --> RAP
    RAP --> ASRP

    ARP --> RO
    RO --> MC
    RO --> PC
    RO --> EC
    RO --> BS

    MC --> API
    PC --> API
    API --> BE

    EC --> SSE
    EC --> EB
    SSE --> BE

    WH --> EC
    WH --> EB

    ARP --> TS
    MC --> TS
```

---

## State Architecture

```mermaid
graph LR
    subgraph "ThreadContext (React State)"
        CTI[currentThreadId]
        TM[threadMetadata<br/>Map&lt;id, metadata&gt;]
        THR[threads<br/>Map&lt;id, messages&gt;]
        TC[threadCnt]
        TVK[threadViewKey]
    end

    subgraph "BackendState (Mutable Ref)"
        TTB[tempToBackendId<br/>Map&lt;temp, backend&gt;]
        SIF[skipInitialFetch<br/>Set&lt;id&gt;]
        PCH[pendingChat<br/>Map&lt;id, texts&gt;]
        PSY[pendingSystem<br/>Map&lt;id, texts&gt;]
        RT[runningThreads<br/>Set&lt;id&gt;]
        CTD[creatingThreadId]
        CTP[createThreadPromise]
    end

    subgraph "EventBuffer (Mutable Ref)"
        IBQ[inboundQueue<br/>Event array]
        OBQ[outboundQueue<br/>Event array]
        SSS[sseStatus<br/>connected or disconnected]
        LID[lastEventId<br/>string]
    end

    CTI --> TTB
    THR --> PCH
    IBQ -.->|notifications| THR
    OBQ -.->|wallet events| TTB
```

### State Responsibilities

| State | Purpose | Reactivity |
|-------|---------|------------|
| `ThreadContext` | UI-facing thread/message data | Reactive (triggers re-renders) |
| `BackendState` | Backend sync coordination | Non-reactive (mutable ref) |
| `EventBuffer` | Inbound/outbound event queues | Non-reactive (mutable ref) |

---

## Message Flow - Outbound (User Sends Message)

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant RT as Runtime
    participant MC as MessageController
    participant BS as BackendState
    participant TC as ThreadContext
    participant API as BackendApi
    participant PC as PollingController
    participant BE as Backend

    UI->>RT: onNew(message)
    RT->>MC: outbound(message, threadId)

    MC->>TC: Add optimistic user message
    MC->>TC: Update lastActiveAt

    alt Thread not ready (temp ID, no backend mapping)
        MC->>BS: enqueuePendingChat(threadId, text)
        MC->>BS: setThreadRunning(true)
        Note over MC: Wait for thread creation
    else Thread ready
        MC->>BS: setThreadRunning(true)
        MC->>API: postChatMessage(backendId, text)
        API->>BE: POST /chat
        BE-->>API: Response
        MC->>MC: flushPendingSystem()
        MC->>PC: start(threadId)
    end
```

---

## Message Flow - Inbound (Polling for Response)

```mermaid
sequenceDiagram
    participant PC as PollingController
    participant API as BackendApi
    participant BE as Backend
    participant MC as MessageController
    participant BS as BackendState
    participant TC as ThreadContext
    participant UI as User Interface

    loop Every 500ms while processing
        PC->>API: fetchState(backendId)
        API->>BE: GET /state
        BE-->>API: {messages, is_processing}
        API-->>PC: SessionResponsePayload

        alt is_processing = true
            PC->>MC: applyMessages(threadId, messages)
            MC->>TC: setThreadMessages(threadId, converted)
            TC->>UI: Re-render with new messages
        else is_processing = false
            PC->>MC: applyMessages(threadId, messages)
            PC->>PC: stop(threadId)
            PC->>BS: setThreadRunning(false)
            Note over UI: Assistant response complete
        end
    end
```

---

## Thread Creation Flow

```mermaid
sequenceDiagram
    participant UI as Thread List
    participant TLA as ThreadListAdapter
    participant BS as BackendState
    participant TC as ThreadContext
    participant API as BackendApi
    participant BE as Backend
    participant MC as MessageController

    UI->>TLA: onSwitchToNewThread()

    alt Existing pending thread
        TLA->>TLA: preparePendingThread(existingId)
        TLA->>TC: Switch to pending thread
    else No pending thread
        TLA->>TLA: Generate temp-{uuid}
        TLA->>BS: Set creatingThreadId
        TLA->>TC: Create metadata (status: pending)
        TLA->>TC: setCurrentThreadId(tempId)

        TLA->>API: createThread(publicKey)
        API->>BE: POST /threads
        BE-->>API: {session_id, title}

        TLA->>BS: setBackendMapping(tempId, backendId)
        TLA->>BS: markSkipInitialFetch(tempId)
        TLA->>TC: Update metadata with backend title

        alt Has pending chat messages
            loop For each pending message
                TLA->>API: postChatMessage(backendId, text)
            end
            TLA->>MC: Start polling
        end
    end
```

---

## Thread Switch Flow

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant TLA as ThreadListAdapter
    participant TC as ThreadContext
    participant RO as RuntimeOrchestrator
    participant BS as BackendState
    participant API as BackendApi
    participant PC as PollingController

    UI->>TLA: onSwitchToThread(threadId)
    TLA->>TC: setCurrentThreadId(threadId)

    Note over RO: useEffect triggers
    RO->>RO: ensureInitialState(threadId)

    alt Should skip initial fetch
        RO->>BS: clearSkipInitialFetch()
        RO->>RO: setIsRunning(false)
    else Thread not ready (temp ID)
        RO->>RO: setIsRunning(false)
    else Thread ready
        RO->>API: fetchState(backendId)
        API-->>RO: {messages, is_processing}
        RO->>TC: Apply messages via inbound()

        alt is_processing = true
            RO->>RO: setIsRunning(true)
            RO->>PC: start(threadId)
        else is_processing = false
            RO->>RO: setIsRunning(false)
        end
    end
```

---


## Event Flow - Inbound Notification (SSE)

```mermaid
sequenceDiagram
    participant BE as Backend Server
    participant SSE as BackendSSE
    participant EC as EventController
    participant EB as EventBuffer
    participant UI as Notification Component

    Note over BE: System triggers notification
    BE->>SSE: SSE push: "You have a notification"
    SSE->>EC: onEvent({type: notification, id})
    EC->>EB: enqueueInbound(event)

    Note over EB: Buffer stores event

    EC->>EB: dequeueInbound()
    EB-->>EC: event
    EC->>EC: processNotification(event)

    alt Needs full payload
        EC->>BE: GET /notifications/{id}
        BE-->>EC: Full notification data
    end

    EC->>UI: dispatch(notification)
    UI->>UI: Render notification toast/panel
```

---

## Event Flow - Outbound Wallet Event

```mermaid
sequenceDiagram
    participant Wallet as Wallet Provider
    participant WH as WalletHandler
    participant EC as EventController
    participant EB as EventBuffer
    participant API as BackendApi
    participant BE as Backend Server

    Note over Wallet: Transaction completes
    Wallet-->>WH: onTransactionConfirmed(tx)

    WH->>WH: Build event payload
    WH->>EC: enqueueOutbound({<br/>  type: wallet:tx_complete,<br/>  txHash, amount, token<br/>})
    EC->>EB: outboundQueue.push(event)

    Note over EB: Buffer batches events

    alt Immediate flush (high priority)
        EC->>EC: flushOutbound()
    else Batched flush
        Note over EC: Flush timer triggers
        EC->>EC: flushOutbound()
    end

    EC->>EB: drain outboundQueue
    EB-->>EC: events[]
    EC->>API: POST /events [events]
    API->>BE: Store/process events
    BE-->>API: 200 OK
```

---

## SSE Connection Lifecycle

```mermaid
sequenceDiagram
    participant RO as RuntimeOrchestrator
    participant EC as EventController
    participant SSE as BackendSSE
    participant EB as EventBuffer
    participant BE as Backend Server

    Note over RO: Runtime mounts
    RO->>EC: initialize()
    EC->>SSE: connect(publicKey, lastEventId)
    SSE->>BE: EventSource(/events/subscribe)
    BE-->>SSE: Connection established
    SSE->>EC: onConnected()
    EC->>EB: sseStatus = connected

    loop While connected
        BE-->>SSE: event: ping
        SSE->>SSE: Reset timeout
    end

    alt Connection lost
        BE--xSSE: Connection dropped
        SSE->>EC: onDisconnected()
        EC->>EB: sseStatus = disconnected

        loop Exponential backoff (1s, 2s, 4s...)
            SSE->>BE: Reconnect attempt
            alt Success
                BE-->>SSE: Connected
                SSE->>EC: onConnected()
                EC->>EB: sseStatus = connected
            else Fail
                SSE->>SSE: Increase backoff
            end
        end
    end

    Note over RO: Runtime unmounts
    RO->>EC: cleanup()
    EC->>SSE: disconnect()
    EC->>EB: flush remaining outbound
```

---

## Key Components

### AomiRuntimeProvider

Main provider component that:
- Initializes the runtime orchestrator
- Connects to `@assistant-ui/react` via `useExternalStoreRuntime`
- Manages thread list operations (create, switch, rename, archive, delete)
- Subscribes to backend title updates

### RuntimeOrchestrator

Hook that creates and coordinates:
- `BackendApi` instance
- `BackendState` ref
- `MessageController` instance
- `PollingController` instance
- `ensureInitialState()` for loading thread data on switch

### MessageController

Handles all message operations:
- `outbound()` - Send user messages
- `outboundSystem()` - Send system messages
- `inbound()` - Process messages from backend
- `flushPendingChat()` / `flushPendingSystem()` - Send queued messages
- `cancel()` - Interrupt processing

### PollingController

Manages backend polling:
- `start(threadId)` - Begin polling at 500ms intervals
- `stop(threadId)` - Stop polling for a thread
- `stopAll()` - Stop all active polls
- Auto-stops when `is_processing` becomes false

### EventController

Manages bidirectional event streaming:
- `connect()` - Establish SSE connection to backend
- `disconnect()` - Close SSE connection
- `enqueueOutbound(event)` - Add event to outbound queue
- `flushOutbound()` - Send queued events to backend
- `processInbound()` - Dequeue and handle inbound events
- Handles auto-reconnect with exponential backoff

### WalletHandler

Hook for wallet integration:
- Listens to wallet provider events (tx confirm, connect, disconnect)
- Converts wallet events to outbound event format
- Enqueues events to EventBuffer via EventController

### BackendSSE

SSE client for real-time server events:
- Maintains persistent connection to `/events/subscribe`
- Parses SSE event types (notification, title_changed, etc.)
- Forwards events to EventController for buffering
- Supports `lastEventId` for resuming missed events

### EventBuffer

Non-reactive state for event streaming:

| Field | Type | Purpose |
|-------|------|---------|
| `inboundQueue` | Event[] | Buffered events from SSE |
| `outboundQueue` | Event[] | Buffered events to send |
| `sseStatus` | string | Connection status |
| `lastEventId` | string | For SSE resume |

### BackendState

Non-reactive state for backend coordination:

| Field | Type | Purpose |
|-------|------|---------|
| `tempToBackendId` | Map | Maps temporary UI IDs to real backend IDs |
| `skipInitialFetch` | Set | Threads that shouldn't fetch on switch |
| `pendingChat` | Map | User messages queued before thread ready |
| `pendingSystem` | Map | System messages queued before user message |
| `runningThreads` | Set | Threads currently processing |
| `creatingThreadId` | string | Thread being created |
| `createThreadPromise` | Promise | Active thread creation promise |

### ThreadContext

Reactive state for UI:

| Field | Type | Purpose |
|-------|------|---------|
| `currentThreadId` | string | Active thread |
| `threadMetadata` | Map | Title, status, lastActiveAt per thread |
| `threads` | Map | Messages per thread |
| `threadCnt` | number | Counter for "Chat N" naming |
| `threadViewKey` | number | Force re-render key |

---

## ID Resolution

The runtime uses temporary IDs (`temp-{uuid}`) for optimistic UI during thread creation:

```mermaid
graph LR
    subgraph "Before Backend Response"
        T1[temp-abc123] --> UI1[UI renders immediately]
    end

    subgraph "After Backend Response"
        T2[temp-abc123] --> MAP[tempToBackendId]
        MAP --> B1[backend-xyz789]
        B1 --> API[All API calls]
    end
```

The `resolveThreadId()` function always checks `tempToBackendId` first, allowing the UI to work with stable IDs while the backend uses its own IDs.

---

## Cleanup

On unmount, the runtime:
1. Calls `polling.stopAll()` to clear all intervals
2. Calls `eventController.cleanup()` to close SSE and flush outbound
3. React handles cleanup of refs and state

On thread delete:
1. Removes from `threadMetadata` and `threads`
2. Clears all backend state entries for that thread
3. Switches to another thread or creates a default
