# Plan: UI Speed Fixes & Widget Cleanup

Branch: `codex/ui-speed-fixes-widget`

---

## 1. Speed up opening chats (sidebar-first, background prefetch)

**Problem**: Switching threads blocks on `warmThread()` + `ensureInitialState()` sequentially in `core.tsx`. Every thread switch hits the backend before showing anything.

**Current flow** (`core.tsx` useEffect on `currentThreadId`):
```
warmThread(threadId)        // POST /api/sessions (create/warm)
ensureInitialState(threadId) // session.fetchCurrentState() (GET /api/state)
```

**Fix**:
- Populate sidebar from thread metadata returned by `listThreads()` immediately (already mostly works).
- After sidebar renders, fire non-blocking background prefetch for recent threads: fetch latest ~10 messages per thread, cap to ~5 threads concurrently.
- Use `requestIdleCallback` or `queueMicrotask` so prefetch never blocks initial render.
- Store prefetched messages in `ThreadStore` so switching to a prefetched thread is instant.

**Files**:
- `packages/react/src/runtime/core.tsx` - add background prefetch after `listThreads`
- `packages/react/src/runtime/orchestrator.ts` - `ensureInitialState` should check if messages already cached

### Checklist
- [ ] After `listThreads()` resolves, kick off non-blocking prefetch loop for top N threads
- [ ] In `ensureInitialState()`, skip fetch if thread already has cached messages
- [ ] Cap prefetch concurrency (e.g., 2-3 at a time) and message count (~10 per thread)
- [ ] Verify sidebar populates from metadata before any prefetch completes

---

## 2. Avoid duplicate warm/fetch calls

**Problem**: `warmThread()` and `ensureInitialState()` can fire multiple times for the same thread (thread switch, wallet connect, re-render). `fetchApps()` re-runs on every `sessionId` change (which changes per thread).

**Current dedup**:
- `warmedThreadIdsRef` prevents re-warming, but cleared on wallet disconnect
- `orchestrator.pendingFetches` set prevents concurrent fetches for same thread
- No dedup for `fetchApps` across thread switches

**Fix**:
- Add an in-flight promise cache for warm calls keyed by threadId: if a warm is in progress, return the existing promise instead of starting another.
- Same pattern for `ensureInitialState` - the `pendingFetches` set already exists but doesn't deduplicate the promise itself.
- Remove `sessionId` from `fetchApps` dependency array (apps don't change per-thread).

**Files**:
- `packages/react/src/runtime/core.tsx` - warm promise cache, fetchApps deps cleanup
- `packages/react/src/runtime/orchestrator.ts` - return cached promise from `ensureInitialState`

### Checklist
- [ ] Create `warmPromises: Map<string, Promise>` ref; reuse in-flight promises
- [ ] Make `ensureInitialState` return and cache its promise; skip if already resolved
- [ ] Remove `sessionId` from `fetchApps` useEffect dependency array
- [ ] Verify no double-warm on wallet connect + thread switch combo

---

## 3. Stop creating empty threads

**Problem**: `onSwitchToNewThread()` in `threadlist-adapter.ts` creates local metadata immediately. Then `core.tsx` useEffect calls `warmThread()` which calls `aomiClient.createThread()` on the backend -- even if user never sends a message.

**Current flow**:
```
"New Chat" click → onSwitchToNewThread() → local metadata added
  → useEffect → warmThread(threadId) → POST /api/sessions (backend thread created)
```

**Fix**:
- Keep "New Chat" purely client-side: add metadata locally, but skip `warmThread()` for threads not in `remoteThreadIds`.
- Only call `createThread()` on first message submit (in `orchestratorSendMessage` or `syncCurrentThreadControl`).
- Delete empty threads from backend: add a cleanup check - if a thread has 0 messages and user switches away, remove local metadata (don't persist empties).

**Files**:
- `packages/react/src/runtime/core.tsx` - skip `warmThread` for local-only threads
- `packages/react/src/runtime/orchestrator.ts` - create backend thread on first send
- `packages/react/src/runtime/threadlist-adapter.ts` - cleanup empties on switch-away

### Checklist
- [ ] Guard `warmThread()` to skip threads not in `remoteThreadIds`
- [ ] In message send path, create backend thread if not yet created
- [ ] On `onSwitchToThread()`, remove previous thread from local state if it has 0 messages and is not remote
- [ ] Verify "New Chat" → type → send still works end-to-end
- [ ] Verify "New Chat" → switch away without typing → no backend thread created

---

## 4. Clear private chat state on disconnect

**Problem**: When wallet disconnects, `remoteThreadIdsRef` and `warmedThreadIdsRef` are cleared, but `ThreadStore` still holds all thread metadata and messages. Previously loaded wallet threads remain visible and clickable in sidebar.

**Current disconnect flow** (`core.tsx`):
```
setUser({is_connected: false})
  → clears remoteThreadIds, warmedThreadIds
  → sends wallet:state_changed
  → does NOT clear ThreadStore
```

**Fix**:
- On disconnect: clear all remote thread metadata, cached messages, and session cache from ThreadStore.
- Reset to a single local empty "New Chat" thread.
- Close all sessions in SessionManager.
- Prevent clicks on stale threads while disconnected (threads without messages should be unclickable or hidden).

**Files**:
- `packages/react/src/runtime/core.tsx` - clear state on disconnect
- `packages/react/src/state/thread-store.ts` - add `resetToEmpty()` or `clearAllThreads()` method
- `packages/react/src/runtime/session-manager.ts` - `closeAll()` already exists, wire it up

### Checklist
- [ ] Add `resetToDefault()` to ThreadStore that clears all threads and creates one empty "New Chat"
- [ ] Call `resetToDefault()` + `sessionManager.closeAll()` on wallet disconnect
- [ ] Verify sidebar shows only "New Chat" after disconnect
- [ ] Verify reconnecting same wallet re-fetches thread list fresh
- [ ] Verify reconnecting different wallet shows that wallet's threads

---

## 5. Show loading state consistently

**Problem**: No unified loading state for thread list or thread messages. Sidebar has no skeleton while `listThreads()` is in-flight. Switching to an unloaded thread shows empty chat with no indicator.

**Current state tracking**:
- `isRunning` (generation in progress) is tracked
- `pendingFetches` in orchestrator is internal, not exposed to UI
- No thread-list-level loading flag

**Fix**:
- Add `isThreadListLoading` flag to ThreadContext, set true while `listThreads()` is in flight.
- Add `isThreadLoading(threadId)` derived from `pendingFetches` - expose to UI.
- Show existing skeleton/spinner in sidebar when `isThreadListLoading`.
- Show spinner in message area when current thread is loading messages.
- Per CeciliaZ030's note: keep it simple - only add spinner where it maps to an existing pending state, don't add new complex state machines.

**Files**:
- `packages/react/src/contexts/thread-context.tsx` - add `isThreadListLoading` state
- `packages/react/src/runtime/core.tsx` - set loading flags around `listThreads()` and expose `pendingFetches`
- `apps/registry/src/components/` - wire existing skeleton to loading state

### Checklist
- [ ] Add `isThreadListLoading` boolean to ThreadContext
- [ ] Set it true before `listThreads()`, false after
- [ ] Expose whether current thread is loading (from orchestrator `pendingFetches`)
- [ ] Wire sidebar skeleton to `isThreadListLoading`
- [ ] Wire message area spinner to current thread loading state
- [ ] Verify skeleton shows on initial load, disappears when threads arrive

---

## 6. Make title updates more reliable

**Problem**: Title comes from `title_changed` SSE event only. If SSE misses, title stays as "New Chat". The `/api/state` and `/api/chat` responses also contain `title` field but it's not used to update local metadata.

**Current title flow**:
```
SSE "title_changed" → orchestrator listener → updateThreadMetadata({title})
```

**Fix**:
- In orchestrator's state/message handlers, check for `title` field in `/api/state` and `/api/chat` responses.
- If present and different from current metadata title, update local metadata.
- Keep SSE listener as primary path; API response is fallback.

**Files**:
- `packages/react/src/runtime/orchestrator.ts` - extract title from state/chat responses
- Possibly `@aomi-labs/client` ClientSession if title is in parsed response

### Checklist
- [ ] In state fetch response handler, check for `title` field and update metadata if changed
- [ ] In chat response handler, same check
- [ ] Verify SSE title update still works as primary
- [ ] Verify title updates even if SSE connection drops

---

## 7. Improve pending-send UX

**Problem**: When user hits send, the composer clears immediately but there's no feedback until the backend accepts and first message appears. If network is slow, user sees empty chat.

**Fix** (optimistic bubble approach):
- On send, immediately add a user message bubble with "sending" status to the thread.
- Keep composer cleared (standard chat UX).
- When `/api/chat` accepts (2xx): transition bubble to normal state.
- On failure: show error state on bubble with retry/remove options.
- This aligns with the DOMAIN.md rule: "Optimistic UI updates + backend confirm".

**Files**:
- `packages/react/src/runtime/orchestrator.ts` - add optimistic message on send
- `packages/react/src/runtime/message-controller.ts` - handle send failure state
- `apps/registry/src/components/` - render "sending" state on message bubble

### Checklist
- [ ] On `orchestratorSendMessage`, add user message to ThreadStore immediately with `status: "sending"`
- [ ] On successful `/api/chat` response, update status to `"sent"`
- [ ] On failure, update status to `"failed"` with retry action
- [ ] Add subtle visual indicator for "sending" state (opacity or spinner)
- [ ] Verify retry works after failure
- [ ] Verify no duplicate messages on success

---

## Implementation Order (suggested)

Independent fixes that can be done in any order, grouped by risk/complexity:

**Low risk, high impact** (do first):
1. Fix 3 - Stop creating empty threads
2. Fix 4 - Clear state on disconnect
3. Fix 6 - Reliable title updates

**Medium risk**:
4. Fix 2 - Deduplicate warm/fetch calls
5. Fix 5 - Loading states
6. Fix 1 - Background prefetch

**Higher complexity**:
7. Fix 7 - Pending-send UX
