# Runtime Architecture Diagrams

## Type Structure & Relationships

This diagram shows the class structure and relationships between the core runtime components. `ThreadStore` manages UI state through snapshots exposed as `ThreadContext`, while `BakendState` tracks runtime coordination state like pending messages and thread mappings. `AomiRuntimeProvider` orchestrates `MessageConverter` and `PollingController` to coordinate between the UI state, backend API, and polling mechanisms.

```mermaid
classDiagram
  direction TB

  class ThreadStore {
    -ThreadStoreState state
    -ThreadContext snapshot
    -Set~()=>void~ listeners
    +subscribe(listener) unsubscribe
    +getSnapshot() ThreadContext
    -createSnapshot() ThreadContext
    -emit()
    -updateState(partial)
    +setCurrentThreadId(id)
    +setThreadMessages(id, msgs)
    +setThreads(updater)
    +setThreadMetadata(updater)
    +getThreadMessages(id) ThreadMessageLike[]
    +getThreadMetadata(id) ThreadMetadata
    +updateThreadMetadata(id, updates)
  }

  class ThreadContext {
    +string currentThreadId
    +setCurrentThreadId(id)
    +number threadViewKey
    +bumpThreadViewKey()
    +Map~string,ThreadMessageLike[]~ threads
    +setThreads(updater)
    +Map~string,ThreadMetadata~ threadMetadata
    +setThreadMetadata(updater)
    +number threadCnt
    +setThreadCnt(updater)
    +getThreadMessages(id) ThreadMessageLike[]
    +setThreadMessages(id, msgs)
    +getThreadMetadata(id) ThreadMetadata
    +updateThreadMetadata(id, updates)
  }

  class ThreadMetadata {
    +string title
    +ThreadStatus status
    +string|number lastActiveAt
  }

  class BakendState {
    +Map~string,string~ tempToSessionId
    +Set~string~ skipInitialFetch
    +Map~string,string[]~ pendingChat
    +Map~string,string[]~ pendingSystem
    +Set~string~ runningThreads
    +string|null creatingThreadId
    +Promise~void~|null createThreadPromise
  }

  class AomiRuntimeProvider {
    +backendUrl
    +publicKey
    +children
  }

  class useRuntimeOrchestrator {
    +backendStateRef : MutableRef~BakendState~
    +polling : PollingController
    +messageConverter : MessageConverter
    +isRunning : boolean
    +setIsRunning(running)
    +syncThreadState(threadId)
    +backendApiRef : MutableRef~BackendApi~
  }

  class MessageConverter {
    +inbound(threadId, msgs)
    +outbound(message, threadId)
    +outboundSystem(threadId, text)
    +outboundSystemInner(threadId, text)
    +flushPendingSystem(threadId)
    +flushPendingSession(threadId)
    +cancel(threadId)
    -markRunning(threadId, running)
  }

  class PollingController {
    -Map~string,Interval~ intervals
    +start(threadId)
    +stop(threadId)
    +stopAll()
    -handleState(threadId, state)
  }

  class BackendApi {
    +fetchState(sessionId) SessionResponsePayload
    +postChatMessage(sessionId, text) SessionResponsePayload
    +postSystemMessage(sessionId, text) SystemResponsePayload
    +postInterrupt(sessionId) SessionResponsePayload
    +createThread(publicKey?, title?) CreateSessionResponse
    +fetchThreads(publicKey) SessionMetadata[]
    +renameThread(sessionId, title)
    +archiveThread(sessionId)
    +unarchiveThread(sessionId)
    +deleteThread(sessionId)
    +subscribeToUpdates(cb) unsubscribe
    +connectSSE(sessionId, publicKey?)
    +disconnectSSE()
  }

  class RuntimeActions {
    +sendSystemMessage(message)
  }

  class AssistantRuntimeProvider {
    +runtime
  }

  %% Relationships
  AomiRuntimeProvider --> useRuntimeOrchestrator
  useRuntimeOrchestrator --> MessageConverter
  useRuntimeOrchestrator --> PollingController
  useRuntimeOrchestrator --> BakendState : via backendStateRef
  useRuntimeOrchestrator --> BackendApi : via backendApiRef

  AomiRuntimeProvider --> ThreadContext : uses via useThreadContext
  AomiRuntimeProvider --> BakendState : uses via backendStateRef

  MessageConverter --> BakendState
  MessageConverter --> ThreadContext : via threadContextRef
  MessageConverter --> BackendApi
  MessageConverter --> PollingController

  PollingController --> BakendState
  PollingController --> BackendApi

  ThreadStore --> ThreadContext : creates snapshot
  ThreadContext --> ThreadMetadata
  AomiRuntimeProvider --> RuntimeActions : provides via context
  AomiRuntimeProvider --> AssistantRuntimeProvider : wraps
```

## Data Flow: User Message → Backend → UI Update

This sequence diagram illustrates the complete flow when a user sends a chat message. The message flows from the UI through `AomiRuntimeProvider` to `MessageConverter`, which optimistically updates the UI state. If the thread is ready (has a backend ID), it immediately posts to the backend API and starts polling. If the thread is still pending (temp ID), the message is queued. The `PollingController` then continuously fetches updates from the backend and applies them to the UI state until processing completes.

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant AU as Assistant-UI
  participant AR as AomiRuntimeProvider
  participant MC as MessageConverter
  participant PC as PollingController
  participant BS as BakendState
  participant TC as ThreadContext (ThreadStore)
  participant API as BackendApi

  Note over U,API: User sends chat message

  U->>AU: type & send message
  AU->>AR: onNew(AppendMessage)
  AR->>MC: outbound(message, currentThreadId)
  
  MC->>TC: getThreadMessages(threadId)
  MC->>TC: setThreadMessages(threadId, [...existing, userMessage])
  MC->>TC: updateThreadMetadata(threadId, {lastActiveAt})
  
  MC->>BS: isSessionReady(threadId)?
  
  alt thread not ready (temp ID)
    MC->>BS: markRunning(threadId, true)
    MC->>BS: enqueuePendingSession(threadId, text)
    Note over MC: Returns early - no backend call
  else thread ready
    MC->>BS: resolveSessionId(threadId) → backendId
    MC->>BS: markRunning(threadId, true)
    MC->>API: postChatMessage(backendId, text)
    MC->>MC: flushPendingSystem(threadId)
    MC->>PC: start(threadId)
  end

  Note over U,API: Polling loop while processing

  loop every 500ms while is_processing
    PC->>BS: resolveSessionId(threadId)
    PC->>API: fetchState(sessionId)
    API-->>PC: SessionResponsePayload{messages,is_processing}
    PC->>MC: inbound(threadId, messages)
    
    MC->>BS: hasPendingSession(threadId)?
    alt has pending chat
      Note over MC: Skip to avoid overwriting optimistic UI
    else no pending chat
      MC->>MC: convert SessionMessage[] → ThreadMessageLike[]
      MC->>TC: setThreadMessages(threadId, threadMessages)
    end
    
    alt !is_processing or !session_exists
      PC->>BS: setSessionRunning(threadId, false)
      PC->>PC: stop(threadId)
      PC->>AR: onStop(threadId) → setIsRunning(false)
    end
  end
```

## Data Flow: System Message

This sequence diagram shows how system messages (like wallet transactions) are handled. System messages require an existing user message in the thread before they can be sent. If no user messages exist yet, the system message is queued in `BakendState.pendingSystem`. Once a user message is present, the system message is sent to the backend, the response is converted and added to the thread, and any queued system messages are flushed.

```mermaid
sequenceDiagram
  autonumber
  participant U as User/Code
  participant AR as AomiRuntimeProvider
  participant MC as MessageConverter
  participant BS as BakendState
  participant TC as ThreadContext
  participant API as BackendApi
  participant PC as PollingController

  U->>AR: RuntimeActions.sendSystemMessage(text)
  AR->>MC: outboundSystem(currentThreadId, text)
  
  MC->>BS: isSessionReady(threadId)?
  alt not ready
    Note over MC: Returns early
  else ready
    MC->>TC: getThreadMessages(threadId)
    MC->>MC: hasUserMessages = messages.some(m => m.role === "user")
    
    alt no user messages yet
      MC->>BS: enqueuePendingSystem(threadId, text)
      Note over MC: Queued until user message exists
    else has user messages
      MC->>MC: outboundSystemInner(threadId, text)
      MC->>BS: resolveSessionId(threadId)
      MC->>BS: markRunning(threadId, true)
      MC->>API: postSystemMessage(backendId, text)
      API-->>MC: SystemResponsePayload{res: SessionMessage}
      MC->>MC: toInboundSystem(response.res)
      MC->>TC: setThreadMessages(threadId, [...existing, systemMessage])
      MC->>MC: flushPendingSystem(threadId)
      MC->>PC: start(threadId)
    end
  end
```

## Data Flow: Thread Creation

This sequence diagram demonstrates the thread creation process when a user starts a new chat. A temporary thread ID is created immediately for optimistic UI updates, and the thread is marked as "pending" in the UI state. The backend API is called to create the actual thread, and once the backend responds with a session ID, the temporary ID is mapped to the backend ID. Any pending messages that were queued during creation are then sent to the backend.

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant AR as AomiRuntimeProvider
  participant BS as BakendState
  participant TC as ThreadContext
  participant API as BackendApi
  participant PC as PollingController

  U->>AR: onSwitchToNewThread()
  AR->>BS: findPendingThreadId() or create temp-{uuid}
  AR->>BS: preparePendingThread(tempId)
  
  Note over AR,BS: Cleanup previous pending if exists
  AR->>BS: creatingThreadId = tempId
  AR->>BS: pendingChat.delete(tempId)
  AR->>BS: pendingSystem.delete(tempId)
  
  AR->>TC: setThreadMetadata(tempId, {status: "pending", title: "New Chat"})
  AR->>TC: setThreadMessages(tempId, [])
  AR->>TC: setCurrentThreadId(tempId)
  AR->>TC: bumpThreadViewKey()
  
  AR->>API: createThread(publicKey, undefined)
  API-->>AR: CreateSessionResponse{session_id, title}
  
  AR->>BS: setBackendMapping(tempId, session_id)
  AR->>BS: skipFirstFetch(tempId)
  AR->>BS: creatingThreadId = null
  
  alt backend title is valid
    AR->>TC: updateThreadMetadata(tempId, {title, status: "regular"})
  end
  
  alt has pendingChat messages
    AR->>BS: pendingChat.get(tempId)
    loop for each pending text
      AR->>API: postChatMessage(session_id, text)
    end
    AR->>BS: pendingChat.delete(tempId)
    AR->>PC: start(tempId)
  end
```

## ThreadContext ↔ BakendState Interaction Patterns

This graph shows the interaction patterns between `ThreadContext` (UI state) and `BakendState` (runtime coordination state). `ThreadContext` holds the user-facing data like messages and thread metadata, while `BakendState` manages internal coordination like pending message queues, thread ID mappings, and running state. The controllers (`MessageConverter`, `PollingController`, and `AomiRuntimeProvider`) coordinate reads and writes between these two state layers to keep the UI in sync with backend operations.

```mermaid
graph TB
  subgraph "ThreadContext (UI State)"
    TC1[threads: Map~id, messages~]
    TC2[threadMetadata: Map~id, metadata~]
    TC3[currentThreadId]
    TC4[threadViewKey]
  end

  subgraph "BakendState (Runtime State)"
    BS1[tempToSessionId: Map~tempId, backendId~]
    BS2[pendingChat: Map~id, Array~]
    BS3[pendingSystem: Map~id, Array~]
    BS4[runningThreads: Set~id~]
    BS5[skipInitialFetch: Set~id~]
    BS6[creatingThreadId]
  end

  subgraph "Controllers"
    MC[MessageConverter]
    PC[PollingController]
    AR[AomiRuntimeProvider]
  end

  MC -->|reads/writes| TC1
  MC -->|reads/writes| TC2
  MC -->|reads/writes| BS1
  MC -->|reads/writes| BS2
  MC -->|reads/writes| BS3
  MC -->|reads/writes| BS4

  PC -->|reads| BS1
  PC -->|reads/writes| BS4
  PC -->|triggers| MC

  AR -->|reads/writes| TC1
  AR -->|reads/writes| TC2
  AR -->|reads/writes| TC3
  AR -->|reads/writes| BS1
  AR -->|reads/writes| BS2
  AR -->|reads/writes| BS3
  AR -->|reads/writes| BS5
  AR -->|reads/writes| BS6

  style TC1 fill:#e1f5ff
  style TC2 fill:#e1f5ff
  style TC3 fill:#e1f5ff
  style BS1 fill:#fff4e1
  style BS2 fill:#fff4e1
  style BS3 fill:#fff4e1
  style BS4 fill:#fff4e1
```

## Key Changes from Previous Version

1. **Renamed Types:**
   - `ThreadRuntimeState` → `BakendState` (note: typo in codebase)
   - `ThreadContextValue` → `ThreadContext`
   - `runtimeStateRef` → `backendStateRef`

2. **MessageConverter Method Renames:**
   - `applyBackendMessages` → `inbound`
   - `sendChat` → `outbound`
   - `sendSystemMessage` → `outboundSystem`
   - `sendSystemMessageNow` → `outboundSystemInner`

3. **Conversion Functions:**
   - `constructSystemMessage` → `toInboundSystem`
   - `constructThreadMessage` → `toInboundMessage`

4. **New Features:**
   - `fetchThreads(publicKey)` - syncs thread list from backend
   - `setMessages` callback in runtime config for direct message updates
   - `isRunning` derived from `isSessionRunning(backendState, threadId)` per-thread
   - `ThreadStore` maintains a `snapshot` property updated on state changes

5. **Improved State Management:**
   - `markRunning` now checks if thread is current before updating global `isRunning`
   - `onStop` callback in PollingController checks current thread before stopping
   - Better cleanup of previous pending threads when creating new ones
