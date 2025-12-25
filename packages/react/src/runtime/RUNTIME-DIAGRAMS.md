# Runtime Architecture Diagrams

## Type Structure & Relationships

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
    +Map~string,string~ tempToBackendId
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
    +messageController : MessageController
    +isRunning : boolean
    +setIsRunning(running)
    +syncThreadState(threadId)
    +backendApiRef : MutableRef~BackendApi~
  }

  class MessageController {
    +inbound(threadId, msgs)
    +outbound(message, threadId)
    +outboundSystem(threadId, text)
    +outboundSystemInner(threadId, text)
    +flushPendingSystem(threadId)
    +flushPendingChat(threadId)
    +cancel(threadId)
    -markRunning(threadId, running)
    -getThreadContextApi() ThreadContextApi
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
    +createThread(publicKey?, title?) CreateThreadResponse
    +fetchThreads(publicKey) BackendThreadMetadata[]
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
  useRuntimeOrchestrator --> MessageController
  useRuntimeOrchestrator --> PollingController
  useRuntimeOrchestrator --> BakendState : via backendStateRef
  useRuntimeOrchestrator --> BackendApi : via backendApiRef

  AomiRuntimeProvider --> ThreadContext : uses via useThreadContext
  AomiRuntimeProvider --> BakendState : uses via backendStateRef

  MessageController --> BakendState
  MessageController --> ThreadContext : via threadContextRef
  MessageController --> BackendApi
  MessageController --> PollingController

  PollingController --> BakendState
  PollingController --> BackendApi

  ThreadStore --> ThreadContext : creates snapshot
  ThreadContext --> ThreadMetadata
  AomiRuntimeProvider --> RuntimeActions : provides via context
  AomiRuntimeProvider --> AssistantRuntimeProvider : wraps
```

## Data Flow: User Message → Backend → UI Update

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant AU as Assistant-UI
  participant AR as AomiRuntimeProvider
  participant MC as MessageController
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
  
  MC->>BS: isThreadReady(threadId)?
  
  alt thread not ready (temp ID)
    MC->>BS: markRunning(threadId, true)
    MC->>BS: enqueuePendingChat(threadId, text)
    Note over MC: Returns early - no backend call
  else thread ready
    MC->>BS: resolveThreadId(threadId) → backendId
    MC->>BS: markRunning(threadId, true)
    MC->>API: postChatMessage(backendId, text)
    MC->>MC: flushPendingSystem(threadId)
    MC->>PC: start(threadId)
  end

  Note over U,API: Polling loop while processing

  loop every 500ms while is_processing
    PC->>BS: resolveThreadId(threadId)
    PC->>API: fetchState(backendThreadId)
    API-->>PC: SessionResponsePayload{messages,is_processing}
    PC->>MC: inbound(threadId, messages)
    
    MC->>BS: hasPendingChat(threadId)?
    alt has pending chat
      Note over MC: Skip to avoid overwriting optimistic UI
    else no pending chat
      MC->>MC: convert SessionMessage[] → ThreadMessageLike[]
      MC->>TC: setThreadMessages(threadId, threadMessages)
    end
    
    alt !is_processing or !session_exists
      PC->>BS: setThreadRunning(threadId, false)
      PC->>PC: stop(threadId)
      PC->>AR: onStop(threadId) → setIsRunning(false)
    end
  end
```

## Data Flow: System Message

```mermaid
sequenceDiagram
  autonumber
  participant U as User/Code
  participant AR as AomiRuntimeProvider
  participant MC as MessageController
  participant BS as BakendState
  participant TC as ThreadContext
  participant API as BackendApi
  participant PC as PollingController

  U->>AR: RuntimeActions.sendSystemMessage(text)
  AR->>MC: outboundSystem(currentThreadId, text)
  
  MC->>BS: isThreadReady(threadId)?
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
      MC->>BS: resolveThreadId(threadId)
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
  API-->>AR: CreateThreadResponse{session_id, title}
  
  AR->>BS: setBackendMapping(tempId, session_id)
  AR->>BS: markSkipInitialFetch(tempId)
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

```mermaid
graph TB
  subgraph "ThreadContext (UI State)"
    TC1[threads: Map~id, messages~]
    TC2[threadMetadata: Map~id, metadata~]
    TC3[currentThreadId]
    TC4[threadViewKey]
  end

  subgraph "BakendState (Runtime State)"
    BS1[tempToBackendId: Map~tempId, backendId~]
    BS2[pendingChat: Map~id, string[]~]
    BS3[pendingSystem: Map~id, string[]~]
    BS4[runningThreads: Set~id~]
    BS5[skipInitialFetch: Set~id~]
    BS6[creatingThreadId]
  end

  subgraph "Controllers"
    MC[MessageController]
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

2. **MessageController Method Renames:**
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
   - `isRunning` derived from `isThreadRunning(backendState, threadId)` per-thread
   - `ThreadStore` maintains a `snapshot` property updated on state changes

5. **Improved State Management:**
   - `markRunning` now checks if thread is current before updating global `isRunning`
   - `onStop` callback in PollingController checks current thread before stopping
   - Better cleanup of previous pending threads when creating new ones
