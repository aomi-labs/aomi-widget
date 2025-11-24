# 🔍 Session Initialization Path Trace

**Date:** 2025-11-24 (Updated)
**Purpose:** Complete trace of how sessions are initialized when the app starts

---

## Overview

When the frontend app loads, there are **two parallel initialization flows**:

1. **Initial Thread State Load** - Fetches state for the current thread (UUID v4)
2. **Thread List Load** - Fetches all threads for the user (only if publicKey exists)

---

## Full Initialization Path

```
App Loads
    ↓
app/layout.tsx renders
    ↓
AomiFrame component mounts (aomi-frame.tsx)
    ↓
ThreadContextProvider initializes (thread-context.tsx:110-132)
    - Generates UUID v4 via crypto.randomUUID() (matches backend)
    - Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    - Log: "🔵 [ThreadContext] Initialized with thread ID: <uuid>"
    - currentThreadId = <generated-uuid>
    - threadMetadata = Map { <uuid> => { title: "Chat 1", status: "regular" } }
    - threads = Map { <uuid> => [] }
    ↓
AomiRuntimeProvider mounts (runtime.tsx:30)
    - Receives publicKey from useAppKitAccount (might be undefined)
    - Creates BackendApi instance with backendUrl
    ↓
[Flow splits into two parallel useEffects]
```

---

## Flow A: Initial Thread State Load

**Always runs, regardless of publicKey**

```
useEffect [line 119] triggers on mount
    ↓
fetchInitialState() called
    ↓
backendApiRef.current.fetchState(currentThreadId)
    - currentThreadId = <generated-uuid>
    - Log: "🔵 [fetchState] Called with sessionId: <uuid>"
    ↓
Frontend: GET /api/state?session_id=<uuid> (backend-api.ts:68-84)
    - Log: "🔵 [fetchState] URL: http://localhost:8080/api/state?session_id=<uuid>"
    ↓
Backend: state_endpoint (endpoint.rs:76-96)
    - session_manager.get_or_create_session(<uuid>, None, None)
    - If session doesn't exist, creates it
    - Returns SessionResponse { messages, is_processing, ... }
    ↓
Backend Log: "📝 Created new session: <uuid>"
    ↓
Frontend: applyMessages(state.messages) (runtime.tsx:123)
    - Log: "🟢 [fetchState] Success: <response data>"
    - Converts SessionMessage[] to ThreadMessageLike[]
    - Calls setThreadMessages(currentThreadId, threadMessages)
    ↓
Frontend: Updates thread state with messages
    - If is_processing = true, starts polling
    - If is_processing = false, sets isRunning = false
```

**Backend Endpoint:**
```rust
// endpoint.rs:76
async fn state_endpoint(
    State(session_manager): State<SharedSessionManager>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<SessionResponse>, StatusCode> {
    let session_id = match params.get("session_id").cloned() {
        Some(id) => id,
        None => return Err(StatusCode::BAD_REQUEST),
    };

    let session_state = match session_manager
        .get_or_create_session(&session_id, None, None)
        .await
    {
        Ok(state) => state,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    let mut state = session_state.lock().await;
    state.update_state().await;
    Ok(Json(state.get_state()))
}
```

---

## Flow B: Thread List Load

**Only runs if publicKey is provided**

```
useEffect [line 143] triggers on mount
    ↓
if (!publicKey) return;  // ⚠️ EXITS IF NO WALLET CONNECTED
    ↓
fetchThreadList() called
    ↓
backendApiRef.current.fetchThreads(publicKey)
    ↓
Frontend: GET /api/sessions?public_key=0x... (backend-api.ts:165)
    ↓
Backend: session_list_endpoint (endpoint.rs:235-252)
    - session_manager.get_history_sessions(&public_key, limit)
    - Returns Vec<HistorySession>
    ↓
Frontend: Builds newMetadata Map from threadList
    - For each thread:
        - Extract title from thread.title || "New Chat"
        - Parse "Chat N" pattern to find highest chat number
        - Set threadMetadata entry
    ↓
Frontend: Updates state
    - setThreadMetadata(newMetadata)
    - setThreadCnt(maxChatNum) if higher than current
```

**Backend Endpoint:**
```rust
// endpoint.rs:235
async fn session_list_endpoint(
    State(session_manager): State<SharedSessionManager>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<HistorySession>>, StatusCode> {
    let public_key = match params.get("public_key").cloned() {
        Some(pk) => pk,
        None => return Err(StatusCode::BAD_REQUEST),
    };
    let limit = params
        .get("limit")
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(usize::MAX);
    session_manager
        .get_history_sessions(&public_key, limit)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
```

---

## State After Initialization

### Scenario 1: No Wallet Connected (publicKey = undefined)

```javascript
// ThreadContext State
const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"  // Generated UUID

threadMetadata = Map {
  [uuid] => { title: "Chat 1", status: "regular" }
}

currentThreadId = uuid

threads = Map {
  [uuid] => []  // Empty messages array
}

threadCnt = 1

// Runtime State
isRunning = false
```

**Console Logs:**
```
🔵 [ThreadContext] Initialized with thread ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
🔵 [fetchState] Called with sessionId: a1b2c3d4-e5f6-7890-abcd-ef1234567890
🟢 [fetchState] Success: { messages: [], is_processing: false }
```

**What happens:**
- ✅ Flow A completes: UUID thread is created/loaded from backend
- ❌ Flow B skipped: No thread list loaded from backend
- User sees: "Chat 1" thread in sidebar

### Scenario 2: Wallet Connected (publicKey = "0x123...")

```javascript
// ThreadContext State
const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"  // Generated UUID

threadMetadata = Map {
  [uuid] => { title: "Chat 1", status: "regular" },
  "backend-uuid-1" => { title: "Chat 2", status: "regular" },
  "backend-uuid-2" => { title: "Chat 3", status: "archived" },
  // ... more threads from backend
}

currentThreadId = uuid

threads = Map {
  [uuid] => [],
  "backend-uuid-1" => [],
  "backend-uuid-2" => [],
  // ... more threads
}

threadCnt = 3  // Synced to highest "Chat N" number

// Runtime State
isRunning = false
```

**Console Logs:**
```
🔵 [ThreadContext] Initialized with thread ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
🔵 [fetchState] Called with sessionId: a1b2c3d4-e5f6-7890-abcd-ef1234567890
🔵 [fetchThreads] Called with publicKey: 0x123...
🟢 [fetchState] Success: { messages: [], is_processing: false }
🟢 [fetchThreads] Success: [{ session_id: "...", title: "Chat 2", ... }]
```

**What happens:**
- ✅ Flow A completes: UUID thread is created/loaded
- ✅ Flow B completes: All user's threads loaded from backend
- User sees: All their threads in sidebar, sorted newest first

---

## Chat Message Flow ("hello" message)

```
User types "hello" and presses Enter
    ↓
Composer component captures input
    ↓
onNew handler called (runtime.tsx:323)
    - Extracts text from message content
    - Creates userMessage: ThreadMessageLike
    ↓
Optimistic Update:
    setThreadMessages(currentThreadId, [...currentMessages, userMessage])
    - User sees their message immediately
    ↓
setIsRunning(true)
    ↓
backendApiRef.current.postChatMessage(currentThreadId, text)
    - currentThreadId = <uuid>
    - text = "hello"
    - Log: "🔵 [postChatMessage] Called with sessionId: <uuid>, message: hello"
    ↓
Frontend: POST /api/chat?session_id=<uuid>&message=hello (backend-api.ts:86-91)
    - Log: "🔵 [postState] URL: http://localhost:8080/api/chat?session_id=<uuid>&message=hello"
    ↓
Backend: chat_endpoint (endpoint.rs:44-74)
    - Extracts session_id and message from query params
    - session_manager.get_or_create_session(session_id, ...)
    - state.process_user_message(message)
    - Returns SessionResponse
    ↓
Backend Log: "📝 Processing message in session: <uuid>"
Backend Log: "DEBUG reqwest::connect: starting new connection: https://api.anthropic.com/"
    ↓
Frontend: Log: "🟢 [postChatMessage] Success: <response>"
    ↓
Backend: Sends message to Claude API
    - Waits for response
    - Updates session state with assistant response
    ↓
Frontend: startPolling() called (runtime.tsx:344)
    - Polls /api/state every 500ms
    - Log: "🔵 [fetchState] Called with sessionId: <uuid>" (every 500ms)
    - Updates UI with streaming/final response
```

**Backend Chat Endpoint:**
```rust
// endpoint.rs:44
async fn chat_endpoint(
    State(session_manager): State<SharedSessionManager>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<SessionResponse>, StatusCode> {
    let session_id = params
        .get("session_id")
        .cloned()
        .unwrap_or_else(generate_session_id);
    let public_key = params.get("public_key").cloned();
    let message = match params.get("message").cloned() {
        Some(m) => m,
        None => return Err(StatusCode::BAD_REQUEST),
    };
    session_manager
        .set_session_public_key(&session_id, public_key.clone())
        .await;

    let session_state = match session_manager
        .get_or_create_session(&session_id, get_backend_request(&message), None)
        .await
    {
        Ok(state) => state,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    let mut state = session_state.lock().await;
    if state.process_user_message(message).await.is_err() {
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    Ok(Json(state.get_state()))
}
```

---

## New Thread Creation Flow ("+ New Thread" button)

```
User clicks "+ New Thread" button
    ↓
ThreadListPrimitive.New onClick
    ↓
threadListAdapter.onSwitchToNewThread() (runtime.tsx:211)
    - Log: "onSwitchToNewThread Chat 2"
    ↓
Generate sequential title:
    - nextCount = threadCnt + 1
    - chatTitle = `Chat ${nextCount}`
    ↓
backendApiRef.current.createThread(publicKey, chatTitle)
    - publicKey might be undefined (backend accepts optional)
    - chatTitle = "Chat 2" (example)
    - Log: "🔵 [createThread] Called with publicKey: <pk>, title: Chat 2"
    ↓
Frontend: POST /api/sessions (backend-api.ts:205-234)
    Body: { "public_key": "0x..." (optional), "title": "Chat 2" }
    - Log: "🔵 [createThread] Request body: { title: 'Chat 2', public_key: '0x...' }"
    - Log: "🔵 [createThread] URL: http://localhost:8080/api/sessions"
    ↓
Backend: session_create_endpoint (endpoint.rs:261-289)
    - Generates new session_id via Uuid::new_v4()
    - Gets public_key and title from JSON payload
    - session_manager.set_session_public_key(session_id, public_key)
    - session_manager.get_or_create_session(session_id, None, title)
    - Returns { "session_id": "<uuid>", "title": "Chat 2" }
    ↓
Backend Log: "📝 Created new session: <uuid>"
    ↓
Frontend: Log: "🟢 [createThread] Success: { session_id: '<uuid>', title: 'Chat 2' }"
    ↓
Frontend: Updates state (runtime.tsx:222-227)
    - setThreadMetadata(backendId, { title, status: "regular" })
    - setThreadMessages(backendId, [])
    - setCurrentThreadId(backendId)
    - setThreadCnt(nextCount)
    ↓
Frontend: Sidebar updates with new thread
Frontend: Main area switches to new empty thread

--- FALLBACK PATH (if backend fails) ---

Backend Error (network, 500, etc.)
    ↓
Frontend: catch block (runtime.tsx:228-237)
    - Log: "⚠️ Backend createThread failed, creating local thread: <error>"
    - Generate local ID: `local-thread-${Date.now()}`
    - setThreadMetadata(localId, { title: chatTitle, status: "regular" })
    - setThreadMessages(localId, [])
    - setCurrentThreadId(localId)
    - setThreadCnt(nextCount)
    ↓
Frontend: Sidebar updates with local thread
Frontend: Thread works offline (won't sync to backend)
```

**Backend Create Endpoint:**
```rust
// endpoint.rs:254
async fn session_create_endpoint(
    State(session_manager): State<SharedSessionManager>,
    Json(payload): Json<HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let session_id = generate_session_id();
    let public_key = payload.get("public_key").cloned();

    // Get title from frontend, or use truncated session_id as fallback
    let title = payload.get("title").cloned().or_else(|| {
        let mut placeholder = session_id.clone();
        placeholder.truncate(6);
        Some(placeholder)
    });

    session_manager
        .set_session_public_key(&session_id, public_key.clone())
        .await;

    let session_state = session_manager
        .get_or_create_session(&session_id, None, title.clone())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Get actual title from session state
    let final_title = {
        let state = session_state.lock().await;
        state.get_title().map(|s| s.to_string())
    };

    Ok(Json(serde_json::json!({
        "session_id": session_id,
        "title": final_title.or(title),
    })))
}
```

---

## Key Code References

### 1. ThreadContext Initialization
**File:** `lib/thread-context.tsx:103-118`
```typescript
export function ThreadContextProvider({
  children,
  initialThreadId = "default-session",
}: ThreadContextProviderProps) {
  const [threadCnt, setThreadCnt] = useState<number>(1);

  const [threads, setThreads] = useState<Map<string, ThreadMessageLike[]>>(
    () => new Map([[initialThreadId, []]])
  );

  const [threadMetadata, setThreadMetadata] = useState<Map<string, ThreadMetadata>>(
    () => new Map([[initialThreadId, { title: "Chat 1", status: "regular" }]])
  );
  // ...
}
```

### 2. Initial State Load
**File:** `components/assistant-ui/runtime.tsx:119-140`
```typescript
useEffect(() => {
  const fetchInitialState = async () => {
    try {
      const state = await backendApiRef.current.fetchState(currentThreadId);
      applyMessages(state.messages);

      if (state.is_processing) {
        setIsRunning(true);
        startPolling();
      } else {
        setIsRunning(false);
      }
    } catch (error) {
      console.error("Failed to fetch initial state:", error);
    }
  };

  void fetchInitialState();
  return () => {
    stopPolling();
  };
}, [currentThreadId, applyMessages, startPolling, stopPolling]);
```

### 3. Thread List Load
**File:** `components/assistant-ui/runtime.tsx:143-182`
```typescript
useEffect(() => {
  if (!publicKey) return;  // ⚠️ Only runs if wallet connected

  const fetchThreadList = async () => {
    try {
      const threadList = await backendApiRef.current.fetchThreads(publicKey);
      const newMetadata = new Map(threadMetadata);

      let maxChatNum = threadCnt;

      for (const thread of threadList) {
        const title = thread.title || "New Chat";
        newMetadata.set(thread.session_id, {
          title,
          status: thread.is_archived ? "archived" : "regular",
        });

        // Extract chat number if title follows "Chat N" format
        const match = title.match(/^Chat (\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxChatNum) {
            maxChatNum = num;
          }
        }
      }

      setThreadMetadata(newMetadata);
      if (maxChatNum > threadCnt) {
        setThreadCnt(maxChatNum);
      }
    } catch (error) {
      console.error("Failed to fetch thread list:", error);
    }
  };

  void fetchThreadList();
}, [publicKey]); // Only runs on mount and when publicKey changes
```

### 4. Chat Message Handler
**File:** `components/assistant-ui/runtime.tsx:323-351`
```typescript
const onNew = useCallback(
  async (message: AppendMessage) => {
    const text = message.content
      .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
      .map((part: Extract<typeof message.content[number], { type: "text" }>) => part.text)
      .join("\n");

    if (!text) return;

    const userMessage: ThreadMessageLike = {
      role: "user",
      content: [{ type: "text", text }],
      createdAt: new Date(),
    };

    // Optimistic update
    setThreadMessages(currentThreadId, [...currentMessages, userMessage]);

    try {
      setIsRunning(true);
      await backendApiRef.current.postChatMessage(currentThreadId, text);
      startPolling();
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsRunning(false);
    }
  },
  [currentThreadId, currentMessages, setThreadMessages, startPolling]
);
```

---

## Issue Analysis

### Issue 1: "Agent does not respond to 'hello'"

**Symptoms:**
- User sends "hello" message
- Backend log shows connection to anthropic.com
- No response appears in UI

**Possible Causes:**
1. ✅ Chat endpoint is called correctly (`POST /api/chat?session_id=default-session&message=hello`)
2. ✅ Backend receives message and processes it
3. ❓ Backend is waiting for Claude API response (log shows connection starting)
4. ❓ Polling might not be working correctly
5. ❓ Message processing might be failing silently

**Debug Steps:**
- Check browser Network tab for `/api/state` polling requests
- Check browser Console for errors
- Verify polling is actually running (should see requests every 500ms)
- Check backend logs for full message processing flow

### Issue 2: "+ New Thread" button does nothing

**Symptoms:**
- User clicks "+ New Thread" button
- No new thread appears in sidebar
- No network request visible

**Possible Causes:**
1. ❓ `onSwitchToNewThread` handler not being called
2. ❓ `createThread` request failing silently
3. ❓ publicKey is undefined and request fails
4. ❓ Error caught but not displayed

**Debug Steps:**
- Add console.log in `onSwitchToNewThread` handler (runtime.tsx:212)
- Check browser Network tab for `POST /api/sessions` request
- Check browser Console for "Failed to create new thread" error
- Verify publicKey value (might be undefined if wallet not connected)

---

## Debugging Recommendations

### 1. Add console logs to initialization

```typescript
// runtime.tsx:119
useEffect(() => {
  console.log("🔵 Fetching initial state for thread:", currentThreadId);
  const fetchInitialState = async () => {
    try {
      const state = await backendApiRef.current.fetchState(currentThreadId);
      console.log("🟢 Initial state loaded:", state);
      // ...
```

### 2. Add console logs to chat handler

```typescript
// runtime.tsx:323
const onNew = useCallback(
  async (message: AppendMessage) => {
    console.log("🔵 onNew called with message:", message);
    const text = message.content
      .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
      .map((part: Extract<typeof message.content[number], { type: "text" }>) => part.text)
      .join("\n");

    console.log("🔵 Extracted text:", text);
    // ...
```

### 3. Add console logs to new thread handler

```typescript
// runtime.tsx:211
onSwitchToNewThread: async () => {
  console.log("🔵 onSwitchToNewThread called, publicKey:", publicKey);
  try {
    const nextCount = threadCnt + 1;
    const chatTitle = `Chat ${nextCount}`;
    console.log("🔵 Creating thread with title:", chatTitle);

    const newThread = await backendApiRef.current.createThread(publicKey, chatTitle);
    console.log("🟢 Thread created:", newThread);
    // ...
```

### 4. Check browser console and network tab

Open DevTools and look for:
- Console errors (red messages)
- Network requests to `/api/chat`, `/api/state`, `/api/sessions`
- Request/response payloads
- HTTP status codes

---

## Summary

**Initialization has 2 parallel flows:**
1. ✅ Initial state load (always runs) → Loads "default-session"
2. ⚠️ Thread list load (only if publicKey) → Loads user's threads

**Chat flow:**
- User message → onNew handler → POST /api/chat → Backend processes → Polling updates UI

**New thread flow:**
- Button click → onSwitchToNewThread → POST /api/sessions → Backend creates → Frontend updates

**Current issues suggest:**
1. Chat: Polling might not be working, or backend processing is slow/failing
2. New Thread: Handler might not be called, or request is failing silently

**Next steps:**
- Add debug logging to all handlers
- Check browser DevTools (Console + Network)
- Verify polling is running during chat
- Verify POST /api/sessions request is made when clicking button
