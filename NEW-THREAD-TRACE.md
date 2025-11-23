# 🔍 "+ New Thread" Button Click Path Trace

**Date:** 2025-11-24
**Purpose:** Complete trace of what happens when user clicks "+ New Thread" button

---

## Full Click Path

```
User clicks "+ New Thread" button
    ↓
ThreadListPrimitive.New (thread-list.tsx:24)
    ↓
@assistant-ui/react framework
    ↓
AssistantApi.threadList.switchToNewThread()
    ↓
threadListAdapter.onSwitchToNewThread() (runtime.tsx:190)
    ↓
[Flow splits into two paths]
```

---

## Step-by-Step Breakdown

### Step 1: Button Render
**File:** `components/assistant-ui/thread-list.tsx`
**Lines:** 22-34

```typescript
const ThreadListNew: FC = () => {
  return (
    <ThreadListPrimitive.New asChild>
      <Button
        className="aui-thread-list-new flex items-center justify-start gap-1..."
        variant="ghost"
      >
        <PlusIcon />
        New Thread
      </Button>
    </ThreadListPrimitive.New>
  );
};
```

**Component:** `ThreadListPrimitive.New`
- From: `@assistant-ui/react`
- Purpose: Wraps button with click handler that calls the adapter's `onSwitchToNewThread`

### Step 2: Framework Layer
**Framework:** `@assistant-ui/react`
**Internal Flow:**

```
ThreadListPrimitive.New onClick
    ↓
useAssistantContext()
    ↓
api.threadList.switchToNewThread()
    ↓
Calls adapter's onSwitchToNewThread
```

This happens inside the framework's internal implementation.

### Step 3: Adapter Handler Invoked
**File:** `components/assistant-ui/runtime.tsx`
**Lines:** 190-222

```typescript
onSwitchToNewThread: async () => {
  // 1️⃣ Check publicKey
  if (!publicKey) {
    console.warn("Cannot create thread: publicKey not provided");
    return;
  }

  try {
    const newId = `local-thread-${Date.now()}`;

    // 2️⃣ Try backend first
    try {
      const newThread = await backendApiRef.current.createThread(publicKey, "New Chat");
      const backendId = newThread.session_id;

      // 3️⃣ Success: Create backend thread
      setThreadMetadata((prev) =>
        new Map(prev).set(backendId, { title: "New Chat", status: "regular" })
      );
      setThreadMessages(backendId, []);
      setCurrentThreadId(backendId);

    } catch (error) {
      // 4️⃣ Fallback: Create local thread
      console.warn("Backend createThread failed, creating locally:", error);
      setThreadMetadata((prev) =>
        new Map(prev).set(newId, { title: "New Chat", status: "regular" })
      );
      setThreadMessages(newId, []);
      setCurrentThreadId(newId);
    }
  } catch (error) {
    console.error("Failed to create new thread:", error);
  }
}
```

---

## Two Possible Paths

### Path A: Backend Success ✅

```
onSwitchToNewThread()
    ↓
Check publicKey exists
    ↓
backendApiRef.current.createThread(publicKey, "New Chat")
    ↓
POST /api/sessions (backend-api.ts:108)
    {
      public_key: "0x...",
      main_topic: "New Chat"
    }
    ↓
Backend responds:
    {
      session_id: "backend-generated-id",
      main_topic: "New Chat"
    }
    ↓
setThreadMetadata(backendId, { title: "New Chat", status: "regular" })
    ↓
setThreadMessages(backendId, [])
    ↓
setCurrentThreadId(backendId)
    ↓
ThreadContext updates
    ↓
threadListAdapter rebuilds with new thread
    ↓
useExternalStoreRuntime notifies AssistantApi
    ↓
ThreadList re-renders with new thread
    ↓
User sees new thread in sidebar!
```

### Path B: Backend Failure (Fallback) ⚠️

```
onSwitchToNewThread()
    ↓
Check publicKey exists
    ↓
backendApiRef.current.createThread(publicKey, "New Chat")
    ↓
POST /api/sessions
    ↓
❌ Backend error (network, 500, etc.)
    ↓
Catch error
    ↓
console.warn("Backend createThread failed, creating locally:", error)
    ↓
Generate local ID: `local-thread-${Date.now()}`
    ↓
setThreadMetadata(newId, { title: "New Chat", status: "regular" })
    ↓
setThreadMessages(newId, [])
    ↓
setCurrentThreadId(newId)
    ↓
ThreadContext updates
    ↓
threadListAdapter rebuilds with new thread
    ↓
useExternalStoreRuntime notifies AssistantApi
    ↓
ThreadList re-renders with new thread
    ↓
User sees new thread in sidebar (with local-thread-* ID)
```

---

## Code References

### 1. Button Component
**File:** `components/assistant-ui/thread-list.tsx:22-34`

### 2. Backend API Call
**File:** `lib/backend-api.ts:108-121`

```typescript
async createThread(publicKey: string, title?: string): Promise<CreateThreadResponse> {
  const url = `${this.baseUrl}/api/sessions`;
  const body = {
    public_key: publicKey,
    main_topic: title || "New Chat",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Failed to create thread: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as CreateThreadResponse;
}
```

### 3. Thread Context State Update
**File:** `lib/thread-context.tsx:117-145`

```typescript
// ensureThreadExists is called by setCurrentThreadId
const ensureThreadExists = useCallback((threadId: string) => {
  setThreadMetadata((prev) => {
    if (prev.has(threadId)) return prev;
    const next = new Map(prev);
    next.set(threadId, { title: "New Chat", status: "regular" });
    return next;
  });

  setThreads((prev) => {
    if (prev.has(threadId)) return prev;
    const next = new Map(prev);
    next.set(threadId, []);
    return next;
  });
}, []);

const setCurrentThreadId = useCallback((threadId: string) => {
  ensureThreadExists(threadId);
  _setCurrentThreadId(threadId);
}, [ensureThreadExists]);
```

### 4. Adapter Rebuild
**File:** `components/assistant-ui/runtime.tsx:166-188`

```typescript
const threadListAdapter: ExternalStoreThreadListAdapter = (() => {
  // Rebuild arrays from threadMetadata
  const regularThreads = Array.from(threadMetadata.entries())
    .filter(([_, meta]) => meta.status === "regular")
    .map(([id, meta]): ExternalStoreThreadData<"regular"> => ({
      id,
      title: meta.title,
      status: "regular",
    }));

  const archivedThreadsArray = Array.from(threadMetadata.entries())
    .filter(([_, meta]) => meta.status === "archived")
    .map(([id]): ExternalStoreThreadData<"archived"> => ({
      id,
      title: id, // Display session_id as title for now
      status: "archived",
    }));

  return {
    threadId: currentThreadId,
    threads: regularThreads,
    archivedThreads: archivedThreadsArray,
    // ... handlers
  };
})();
```

---

## State Changes

### Before Click

```javascript
threadMetadata = Map {
  "default-session" => { title: "New Chat", status: "regular" }
}

currentThreadId = "default-session"

threads = Map {
  "default-session" => []
}
```

### After Click (Backend Success)

```javascript
threadMetadata = Map {
  "default-session" => { title: "New Chat", status: "regular" },
  "backend-xyz-123" => { title: "New Chat", status: "regular" }  // ← NEW
}

currentThreadId = "backend-xyz-123"  // ← CHANGED

threads = Map {
  "default-session" => [],
  "backend-xyz-123" => []  // ← NEW
}
```

### After Click (Fallback)

```javascript
threadMetadata = Map {
  "default-session" => { title: "New Chat", status: "regular" },
  "local-thread-1732470123456" => { title: "New Chat", status: "regular" }  // ← NEW
}

currentThreadId = "local-thread-1732470123456"  // ← CHANGED

threads = Map {
  "default-session" => [],
  "local-thread-1732470123456" => []  // ← NEW
}
```

---

## Network Request (Backend Path)

### Request

```http
POST http://localhost:8080/api/sessions
Content-Type: application/json

{
  "public_key": "0x1234567890abcdef...",
  "main_topic": "New Chat"
}
```

### Response (Success)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "session_id": "backend-generated-uuid-here",
  "main_topic": "New Chat"
}
```

### Response (Error)

```http
HTTP/1.1 500 Internal Server Error

{
  "error": "Database connection failed"
}
```

---

## UI Updates

### 1. Sidebar Thread List

**Before:**
```
┌─────────────────────┐
│ + New Thread        │
├─────────────────────┤
│ New Chat            │ ← default-session (active)
└─────────────────────┘
```

**After (user clicks "+ New Thread"):**
```
┌─────────────────────┐
│ + New Thread        │
├─────────────────────┤
│ New Chat            │ ← backend-xyz-123 (active)
│ New Chat            │ ← default-session
└─────────────────────┘
```

### 2. Main Chat Area

Switches to the new empty thread (no messages).

---

## Error Handling

### Error 1: No publicKey

```typescript
if (!publicKey) {
  console.warn("Cannot create thread: publicKey not provided");
  return;
}
```

**Result:** Nothing happens, warning in console

### Error 2: Backend createThread fails

```typescript
catch (error) {
  console.warn("Backend createThread failed, creating locally:", error);
  // Creates local thread instead
}
```

**Result:** Local thread created with ID `local-thread-${Date.now()}`

### Error 3: Complete failure

```typescript
catch (error) {
  console.error("Failed to create new thread:", error);
}
```

**Result:** No new thread created, error logged

---

## Debugging Tips

### 1. Check if button is rendered

```typescript
// In thread-list.tsx:22
const ThreadListNew: FC = () => {
  console.log("🔵 ThreadListNew rendering");
  return <ThreadListPrimitive.New asChild>...</ThreadListPrimitive.New>;
};
```

### 2. Check if handler is called

```typescript
// In runtime.tsx:190
onSwitchToNewThread: async () => {
  console.log("🟢 onSwitchToNewThread called, publicKey:", publicKey);
  // ...
}
```

### 3. Check backend call

```typescript
// In runtime.tsx:202
try {
  console.log("🔵 Calling backend createThread...");
  const newThread = await backendApiRef.current.createThread(publicKey, "New Chat");
  console.log("🟢 Backend response:", newThread);
  // ...
} catch (error) {
  console.log("🔴 Backend error:", error);
  // ...
}
```

### 4. Check state updates

```typescript
// In runtime.tsx:209
setCurrentThreadId(backendId);
console.log("🟢 Current thread switched to:", backendId);
```

### 5. Monitor Network Tab

Open DevTools → Network → Filter "sessions" → Look for POST request

---

## Summary

**Click Path:** Button → Framework → Adapter → Backend/Fallback → State Update → UI Re-render

**Key Files:**
1. `thread-list.tsx:24` - Button component
2. `runtime.tsx:190` - Handler implementation
3. `backend-api.ts:108` - Backend API call
4. `thread-context.tsx:139` - State management

**Two Outcomes:**
- ✅ Backend success → Thread with backend-generated ID
- ⚠️ Backend failure → Thread with `local-thread-${timestamp}` ID

**State Updates:**
- `threadMetadata` gets new entry
- `threads` gets new empty array
- `currentThreadId` switches to new thread
- UI re-renders with new thread list
