# Polling and SSE Workflow Documentation

This document describes the workflow for polling messages and subscribing to Server-Sent Events (SSE) updates for each chat thread in the Aomi widget runtime.

## Overview

The runtime uses two complementary mechanisms to keep chat threads synchronized with the backend:

1. **Polling**: Periodic HTTP requests to fetch state updates when a thread is actively processing
2. **SSE (Server-Sent Events)**: Long-lived streaming connection for real-time updates (title changes, tool completions, etc.)

Both mechanisms operate per-thread and are managed by the runtime orchestrator.

## Architecture Components

- **PollingController**: Manages interval-based polling for active threads
- **MessageController**: Handles inbound/outbound message processing
- **BackendApi**: Provides HTTP and SSE client methods
- **EventContextProvider**: Manages SSE subscriptions and event buffering
- **Orchestrator**: Coordinates polling and message handling

---

## Sequence Diagram: Polling Workflow

### Starting Polling

```mermaid
sequenceDiagram
    participant User
    participant MessageController
    participant PollingController
    participant BackendApi
    participant Backend

    User->>MessageController: Send message (outbound)
    MessageController->>BackendApi: postChatMessage(sessionId, text)
    BackendApi->>Backend: POST /api/chat
    Backend-->>BackendApi: ApiChatResponse {is_processing: true}
    BackendApi-->>MessageController: Response with messages
    
    alt Response has messages
        MessageController->>MessageController: inbound(threadId, messages)
        MessageController->>ThreadContext: setThreadMessages()
    end
    
    alt is_processing === true
        MessageController->>PollingController: start(threadId)
        PollingController->>BackendState: setThreadRunning(threadId, true)
        PollingController->>PollingController: setInterval(tick, 500ms)
        Note over PollingController: Polling started
    end
```

### Polling Loop

```mermaid
sequenceDiagram
    participant PollingController
    participant BackendApi
    participant Backend
    participant MessageController
    participant EventContext

    loop Every 500ms while polling
        PollingController->>BackendApi: fetchState(backendThreadId)
        BackendApi->>Backend: GET /api/state (X-Session-Id header)
        Backend-->>BackendApi: ApiStateResponse
        BackendApi-->>PollingController: State response
        
        alt session_exists === false
            PollingController->>PollingController: stop(threadId)
            Note over PollingController: Session deleted, stop polling
        else Has system_events
            PollingController->>EventContext: dispatchInboundSystem(sessionId, events)
            EventContext->>EventBuffer: enqueueInbound() + dispatch()
        end
        
        alt Has messages
            PollingController->>MessageController: applyMessages(threadId, messages)
            MessageController->>MessageController: inbound(threadId, messages)
            MessageController->>ThreadContext: setThreadMessages()
        end
        
        alt is_processing === false
            PollingController->>PollingController: stop(threadId)
            PollingController->>BackendState: setThreadRunning(threadId, false)
            Note over PollingController: Processing complete, stop polling
        end
    end
```

### Stopping Polling

```mermaid
sequenceDiagram
    participant User
    participant MessageController
    participant PollingController
    participant BackendApi
    participant Backend

    User->>MessageController: Cancel/interrupt
    MessageController->>PollingController: stop(threadId)
    PollingController->>PollingController: clearInterval(intervalId)
    PollingController->>BackendState: setThreadRunning(threadId, false)
    MessageController->>BackendApi: postInterrupt(backendThreadId)
    BackendApi->>Backend: POST /api/interrupt
    Backend-->>BackendApi: ApiInterruptResponse
    BackendApi-->>MessageController: Response
    MessageController->>BackendState: setThreadRunning(threadId, false)
```

---

## Sequence Diagram: SSE Subscription Workflow

### Establishing SSE Connection

```mermaid
sequenceDiagram
    participant EventContextProvider
    participant BackendApi
    participant Backend
    participant EventBuffer

    Note over EventContextProvider: sessionId changes or component mounts
    
    alt isTempThreadId(sessionId)
        EventContextProvider->>EventBuffer: setSSEStatus("disconnected")
        Note over EventContextProvider: Skip SSE for temp IDs
    else Valid sessionId
        EventContextProvider->>EventBuffer: setSSEStatus("connecting")
        EventContextProvider->>BackendApi: subscribeSSE(sessionId, onUpdate, onError)
        
        BackendApi->>BackendApi: Close existing connection for sessionId
        BackendApi->>Backend: GET /api/updates (Accept: text/event-stream)
        Note over Backend: Long-lived HTTP stream
        
        Backend-->>BackendApi: SSE stream opened
        BackendApi->>EventBuffer: setSSEStatus("connected")
        EventContextProvider->>EventContextProvider: setSseStatus("connected")
        
        loop While stream is open
            Backend-->>BackendApi: SSE event (data: {...})
            BackendApi->>BackendApi: readSseStream() parses event
            BackendApi->>EventContextProvider: onUpdate(ApiSSEEvent)
            EventContextProvider->>EventBuffer: enqueueInbound(event)
            EventContextProvider->>EventBuffer: dispatch(inboundEvent)
        end
    end
```

### SSE Event Processing

```mermaid
sequenceDiagram
    participant Backend
    participant BackendApi
    participant EventContextProvider
    participant EventBuffer
    participant Subscribers

    Backend-->>BackendApi: SSE event: {"type": "title_changed", "session_id": "...", "new_title": "..."}
    BackendApi->>BackendApi: extractSseData() + JSON.parse()
    BackendApi->>EventContextProvider: onUpdate(ApiSSEEvent)
    
    EventContextProvider->>EventBuffer: enqueueInbound({type, sessionId, payload})
    EventContextProvider->>EventBuffer: dispatch(inboundEvent)
    
    EventBuffer->>Subscribers: Notify all subscribers for event type
    Note over Subscribers: Components subscribed via useEventContext().subscribe()
```

### SSE Reconnection Logic

```mermaid
sequenceDiagram
    participant BackendApi
    participant Backend
    participant EventBuffer

    Note over BackendApi: Connection lost or error occurs
    
    BackendApi->>EventBuffer: setSSEStatus("disconnected")
    BackendApi->>BackendApi: scheduleRetry()
    
    Note over BackendApi: Exponential backoff: min(500 * 2^(retries-1), 10000)ms
    
    BackendApi->>BackendApi: setTimeout(() => open(), delayMs)
    
    alt Not stopped
        BackendApi->>Backend: GET /api/updates (retry)
        alt Success
            Backend-->>BackendApi: SSE stream reconnected
            BackendApi->>BackendApi: retries = 0 (reset)
            BackendApi->>EventBuffer: setSSEStatus("connected")
        else Failure
            BackendApi->>BackendApi: scheduleRetry() (increment retries)
        end
    end
```

### Unsubscribing from SSE

```mermaid
sequenceDiagram
    participant User
    participant ThreadContext
    participant EventContextProvider
    participant BackendApi
    participant Backend
    participant EventBuffer

    Note over User,EventBuffer: SSE unsubscribe is triggered by useEffect cleanup
    
    alt User switches threads
        User->>ThreadContext: setCurrentThreadId(newThreadId)
        ThreadContext->>EventContextProvider: sessionId prop changes
        Note over EventContextProvider: useEffect dependency [sessionId] triggers cleanup
    else Component unmounts
        Note over EventContextProvider: Component removed from tree
    else backendApi changes
        Note over EventContextProvider: backendApi dependency changes (rare)
    end
    
    EventContextProvider->>BackendApi: unsubscribe() (returned from subscribeSSE)
    BackendApi->>BackendApi: subscription.stop()
    BackendApi->>BackendApi: abortController.abort()
    BackendApi->>Backend: Abort fetch request
    BackendApi->>BackendApi: clearTimeout(retryTimer)
    BackendApi->>EventBuffer: setSSEStatus("disconnected")
    BackendApi->>BackendApi: sseConnections.delete(sessionId)
    
    alt New sessionId is valid
        EventContextProvider->>BackendApi: subscribeSSE(newSessionId, ...)
        Note over EventContextProvider: New SSE connection established
    end
```

**When Unsubscribe is Called:**

The SSE `unsubscribe()` function is called automatically by React's `useEffect` cleanup function in `EventContextProvider`. Specifically, it's triggered when:

1. **User switches threads** (most common):
   - User calls `threadContext.setCurrentThreadId(newThreadId)`
   - This changes the `sessionId` prop passed to `EventContextProvider`
   - The `useEffect` dependency array includes `sessionId`, so React runs the cleanup function
   - Cleanup calls `unsubscribe()` for the old session, then sets up a new SSE connection for the new session

2. **Component unmounts**:
   - When `EventContextProvider` is removed from the React tree
   - React runs the cleanup function, which calls `unsubscribe()`

3. **backendApi changes** (rare):
   - If the `backendApi` instance changes (dependency in `useEffect`)
   - Cleanup runs and re-establishes connection with new API instance

4. **buffer changes** (rare):
   - If the event buffer reference changes (dependency in `useEffect`)
   - Cleanup runs and re-establishes connection

**Important Notes:**
- The unsubscribe happens **before** the new subscription is established (when switching threads)
- This ensures only one SSE connection exists per session at a time
- The cleanup function is guaranteed to run by React before the effect runs again or the component unmounts

---

## Sequence Diagram: Combined Workflow (Polling + SSE)

### Thread Lifecycle: From Message Send to Completion

```mermaid
sequenceDiagram
    participant User
    participant MessageController
    participant PollingController
    participant EventContextProvider
    participant BackendApi
    participant Backend

    Note over User,Backend: User sends a message in an active thread
    
    User->>MessageController: outbound(message, threadId)
    MessageController->>BackendApi: postChatMessage(sessionId, text)
    BackendApi->>Backend: POST /api/chat
    Backend-->>BackendApi: {messages: [...], is_processing: true}
    BackendApi-->>MessageController: Response
    
    MessageController->>MessageController: inbound(threadId, messages)
    MessageController->>PollingController: start(threadId)
    
    Note over PollingController: Polling starts (500ms interval)
    
    loop Polling while is_processing
        PollingController->>BackendApi: fetchState(sessionId)
        BackendApi->>Backend: GET /api/state
        Backend-->>BackendApi: {messages: [...], system_events: [...], is_processing: true}
        
        alt Has system_events
            PollingController->>EventContextProvider: dispatchInboundSystem(sessionId, events)
        end
        
        PollingController->>MessageController: applyMessages(threadId, messages)
    end
    
    Note over EventContextProvider: SSE connection active in parallel
    
    Backend-->>EventContextProvider: SSE: {"type": "title_changed", "new_title": "..."}
    EventContextProvider->>EventContextProvider: Process SSE event
    
    Backend-->>PollingController: {is_processing: false}
    PollingController->>PollingController: stop(threadId)
    Note over PollingController: Polling stops automatically
```

### Initial Thread State Fetch

```mermaid
sequenceDiagram
    participant Orchestrator
    participant BackendApi
    participant Backend
    participant MessageController
    participant PollingController
    participant EventContextProvider

    Note over Orchestrator: Thread becomes active (user switches to thread)
    
    Orchestrator->>Orchestrator: ensureInitialState(threadId)
    
    alt shouldSkipInitialFetch(threadId)
        Orchestrator->>Orchestrator: Skip fetch (already loaded)
    else isThreadReady(threadId)
        Orchestrator->>BackendApi: fetchState(backendThreadId)
        BackendApi->>Backend: GET /api/state
        Backend-->>BackendApi: ApiStateResponse
        BackendApi-->>Orchestrator: State response
        
        Orchestrator->>MessageController: inbound(threadId, state.messages)
        MessageController->>ThreadContext: setThreadMessages()
        
        alt state.is_processing === true
            Orchestrator->>PollingController: start(threadId)
            Note over PollingController: Begin polling
        else
            Orchestrator->>Orchestrator: setIsRunning(false)
        end
    end
    
    Note over EventContextProvider: SSE subscription managed separately<br/>via EventContextProvider useEffect
```

### Thread Creation and First Message

```mermaid
sequenceDiagram
    participant User
    participant ThreadListAdapter
    participant BackendApi
    participant Backend
    participant MessageController
    participant PollingController
    participant EventContextProvider

    User->>ThreadListAdapter: onSwitchToNewThread()
    ThreadListAdapter->>ThreadListAdapter: Create temp thread ID
    ThreadListAdapter->>BackendApi: createThread(publicKey)
    BackendApi->>Backend: POST /api/sessions
    Backend-->>BackendApi: {session_id: "...", title: "..."}
    BackendApi-->>ThreadListAdapter: New thread response
    
    ThreadListAdapter->>BackendState: setBackendMapping(tempId, backendId)
    ThreadListAdapter->>BackendState: markSkipInitialFetch(tempId)
    
    Note over EventContextProvider: SSE subscription starts when<br/>sessionId resolves to backend ID
    
    User->>MessageController: Send first message
    MessageController->>BackendApi: postChatMessage(backendId, text)
    BackendApi->>Backend: POST /api/chat
    Backend-->>BackendApi: {is_processing: true}
    
    MessageController->>PollingController: start(tempId)
    PollingController->>BackendApi: fetchState(backendId) [every 500ms]
    
    Note over EventContextProvider: SSE events arrive in parallel
    Backend-->>EventContextProvider: SSE: title_changed, tool_completion, etc.
```

---

## Key Behaviors

### Polling Behavior

1. **Automatic Start**: Polling starts automatically when:
   - A message is sent and `is_processing === true`
   - Initial state fetch shows `is_processing === true`
   - Pending messages are flushed after thread creation

2. **Automatic Stop**: Polling stops automatically when:
   - `is_processing === false` in state response
   - `session_exists === false` (session deleted)
   - Polling error occurs
   - User cancels/interrupts the thread

3. **Polling Interval**: Default 500ms (configurable via `PollingController` constructor)

4. **Per-Thread**: Each thread has its own polling interval, managed independently

### SSE Behavior

1. **Per-Session**: One SSE connection per `sessionId` (backend thread ID)

2. **Automatic Reconnection**: Exponential backoff on disconnect:
   - Initial delay: 500ms
   - Max delay: 10s
   - Formula: `min(500 * 2^(retries-1), 10000)`

3. **Event Types**: Handles various SSE event types:
   - `title_changed`: Thread title updates
   - `tool_completion`: Tool execution completion
   - Custom event types as needed

4. **Temp Thread Handling**: SSE connections are skipped for temporary thread IDs until they resolve to backend session IDs

5. **Event Buffering**: All SSE events are buffered in `EventBuffer` and dispatched to subscribers

6. **Automatic Unsubscribe**: SSE connections are automatically unsubscribed when:
   - User switches to a different thread (`sessionId` prop changes)
   - `EventContextProvider` component unmounts
   - `backendApi` or `buffer` dependencies change (rare)
   - The cleanup function in `useEffect` ensures proper cleanup before new connections are established

### Coordination

- **Polling** handles message synchronization and system events during active processing
- **SSE** handles real-time updates (title changes, tool completions) regardless of processing state
- Both mechanisms can operate simultaneously for the same thread
- System events can arrive via both polling (`system_events` array) and SSE (as `ApiSSEEvent`)

---

## State Management

### BackendState

Tracks per-thread state:
- `runningThreads`: Set of thread IDs currently being polled
- `tempToBackendId`: Mapping from UI thread IDs to backend session IDs
- `pendingChat`: Queue of messages waiting for thread creation
- `skipInitialFetch`: Set of thread IDs that should skip initial state fetch

### ThreadContext

Manages UI state:
- `threads`: Map of thread ID → messages
- `threadMetadata`: Map of thread ID → metadata (title, status, lastActiveAt)
- `currentThreadId`: Currently active thread

### EventBuffer

Manages event flow:
- Inbound events from polling and SSE
- Outbound events to backend
- Subscriber notifications
- SSE connection status

---

## Error Handling

### Polling Errors

- On polling error: Polling stops automatically, thread marked as not running
- Network errors: Logged, polling stops
- Invalid session: Polling stops when `session_exists === false`

### SSE Errors

- Connection errors: Logged, reconnection scheduled with exponential backoff
- Parse errors: Logged, event skipped
- Abort errors: Ignored (expected during unsubscribe)

---

## Performance Considerations

1. **Polling Frequency**: 500ms interval balances responsiveness with server load
2. **SSE Reconnection**: Exponential backoff prevents connection storms
3. **Per-Thread Isolation**: Each thread's polling/SSE is independent, preventing cross-thread interference
4. **Event Buffering**: Centralized event buffer prevents duplicate processing
5. **Skip Initial Fetch**: Avoids redundant fetches when thread state is already known

---

## API Endpoints

### Polling Endpoints

- `GET /api/state` - Fetch current thread state (messages, system_events, is_processing)
- `POST /api/chat` - Send message and get immediate response
- `POST /api/interrupt` - Cancel current processing

### SSE Endpoints

- `GET /api/updates` - Server-Sent Events stream (requires `X-Session-Id` header)

### Event Endpoints

- `GET /api/events` - Fetch system events for a session
- `GET /api/events?after_id=X&limit=Y` - Fetch events after a specific ID
- `POST /api/system` - Send outbound system message
