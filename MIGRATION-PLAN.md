# Migration Plan: AssistantApi Integration

> **Goal:** Migrate from basic `useExternalStoreRuntime` to full `AssistantApi` integration with complete thread management, archive, rename, delete, and multi-thread support.

---

## Table of Contents

1. [Current State](#current-state)
2. [Target State](#target-state)
3. [Migration Phases](#migration-phases)
4. [Rollback Strategy](#rollback-strategy)
5. [Testing Checklist](#testing-checklist)

---

## Current State

### Architecture
```
User → AomiRuntimeProvider (useExternalStoreRuntime)
     → AssistantRuntimeProvider
     → ThreadList (basic display only)
     → Single thread support
```

### Files Involved
- ✅ `components/assistant-ui/runtime.tsx` - Basic runtime with polling
- ✅ `components/assistant-ui/thread-list.tsx` - UI components
- ✅ `components/assistant-ui/threadlist-sidebar.tsx` - Sidebar with manual session fetching
- ✅ `lib/backend-api.ts` - Backend API client
- ⚠️ **Missing:** Thread context management
- ⚠️ **Missing:** Thread list adapter
- ⚠️ **Missing:** Backend endpoints for thread operations

### Current Capabilities
- ✅ Single thread message display
- ✅ Message polling from backend
- ✅ Send messages
- ✅ System messages
- ❌ Archive threads
- ❌ Delete threads
- ❌ Rename threads
- ❌ Switch between threads
- ❌ Create new threads

---

## Target State

### Architecture
```
User → ThreadContextProvider (global thread state)
     → AomiRuntimeProvider (useExternalStoreRuntime + threadListAdapter)
     → AssistantRuntimeProvider → AssistantApi
     → ThreadList (full thread management)
     → Multi-thread support with archive/rename/delete
```

### New Capabilities
- ✅ Multi-thread support
- ✅ Archive/unarchive threads
- ✅ Delete threads
- ✅ Rename threads
- ✅ Switch between threads
- ✅ Create new threads
- ✅ Persist thread metadata to backend
- ✅ Automatic thread list sync

---

## Migration Phases

### Phase 1: Backend API Extension (Day 1)
**Duration:** 2-3 hours
**Risk Level:** Low (backend only)

#### Tasks

1. **Extend `BackendApi` class**
   ```typescript
   // lib/backend-api.ts

   export type ThreadMetadata = {
     session_id: string;
     main_topic: string;
     is_archived?: boolean;
     created_at?: string;
   };

   export class BackendApi {
     // ... existing methods ...

     // NEW: Thread list management
     async fetchThreads(publicKey: string): Promise<ThreadMetadata[]> {
       const response = await fetch(
         `${this.baseUrl}/api/sessions?public_key=${encodeURIComponent(publicKey)}`
       );
       if (!response.ok) throw new Error('Failed to fetch threads');
       return response.json();
     }

     async createThread(publicKey: string, title?: string): Promise<{ session_id: string }> {
       const response = await fetch(`${this.baseUrl}/api/sessions`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ public_key: publicKey, title }),
       });
       if (!response.ok) throw new Error('Failed to create thread');
       return response.json();
     }

     async archiveThread(sessionId: string): Promise<void> {
       const response = await fetch(
         `${this.baseUrl}/api/sessions/${sessionId}/archive`,
         { method: 'POST' }
       );
       if (!response.ok) throw new Error('Failed to archive thread');
     }

     async unarchiveThread(sessionId: string): Promise<void> {
       const response = await fetch(
         `${this.baseUrl}/api/sessions/${sessionId}/unarchive`,
         { method: 'POST' }
       );
       if (!response.ok) throw new Error('Failed to unarchive thread');
     }

     async deleteThread(sessionId: string): Promise<void> {
       const response = await fetch(
         `${this.baseUrl}/api/sessions/${sessionId}`,
         { method: 'DELETE' }
       );
       if (!response.ok) throw new Error('Failed to delete thread');
     }

     async renameThread(sessionId: string, newTitle: string): Promise<void> {
       const response = await fetch(
         `${this.baseUrl}/api/sessions/${sessionId}`,
         {
           method: 'PATCH',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ title: newTitle }),
         }
       );
       if (!response.ok) throw new Error('Failed to rename thread');
     }
   }
   ```

2. **Test Backend API Methods**
   ```bash
   # Test in browser console or create a test file
   const api = new BackendApi('http://localhost:8080');
   await api.fetchThreads('0x...');
   await api.createThread('0x...', 'Test Thread');
   await api.archiveThread('session-id');
   ```

#### Acceptance Criteria
- [ ] All new methods added to `BackendApi`
- [ ] Type definitions for `ThreadMetadata` added
- [ ] Backend endpoints verified to work
- [ ] Error handling implemented

---

### Phase 2: Thread Context Layer (Day 1-2)
**Duration:** 1-2 hours
**Risk Level:** Low (new code, no breaking changes)

#### Tasks

1. **Create Thread Context Provider**
   ```typescript
   // lib/thread-context.tsx
   "use client";

   import { createContext, useContext, useState, ReactNode } from "react";
   import type { ThreadMessageLike } from "@assistant-ui/react";

   type ThreadContextValue = {
     currentThreadId: string;
     setCurrentThreadId: (id: string) => void;
     threads: Map<string, ThreadMessageLike[]>;
     setThreads: React.Dispatch<React.SetStateAction<Map<string, ThreadMessageLike[]>>>;
     threadMetadata: Map<string, { title: string; status: "regular" | "archived" }>;
     setThreadMetadata: React.Dispatch<
       React.SetStateAction<Map<string, { title: string; status: "regular" | "archived" }>>
     >;
   };

   const ThreadContext = createContext<ThreadContextValue | null>(null);

   export function useThreadContext() {
     const context = useContext(ThreadContext);
     if (!context) {
       throw new Error("useThreadContext must be used within ThreadContextProvider");
     }
     return context;
   }

   export function ThreadContextProvider({
     children,
     initialThreadId = "default-session"
   }: {
     children: ReactNode;
     initialThreadId?: string;
   }) {
     const [currentThreadId, setCurrentThreadId] = useState(initialThreadId);
     const [threads, setThreads] = useState<Map<string, ThreadMessageLike[]>>(
       new Map([[initialThreadId, []]])
     );
     const [threadMetadata, setThreadMetadata] = useState<
       Map<string, { title: string; status: "regular" | "archived" }>
     >(new Map([[initialThreadId, { title: "New Chat", status: "regular" }]]));

     return (
       <ThreadContext.Provider
         value={{
           currentThreadId,
           setCurrentThreadId,
           threads,
           setThreads,
           threadMetadata,
           setThreadMetadata,
         }}
       >
         {children}
       </ThreadContext.Provider>
     );
   }
   ```

2. **Add Context to App Layout**
   ```typescript
   // app/layout.tsx (or wherever your root layout is)
   import { ThreadContextProvider } from "@/lib/thread-context";

   export default function Layout({ children }) {
     return (
       <ThreadContextProvider>
         {/* Rest of your app */}
         {children}
       </ThreadContextProvider>
     );
   }
   ```

#### Acceptance Criteria
- [ ] `ThreadContextProvider` created in `lib/thread-context.tsx`
- [ ] Context wraps the app at the root level
- [ ] `useThreadContext` hook works in components
- [ ] No console errors or warnings

---

### Phase 3: Runtime Provider Enhancement (Day 2)
**Duration:** 3-4 hours
**Risk Level:** Medium (modifying existing code)

#### Tasks

1. **Backup Current Runtime**
   ```bash
   cp components/assistant-ui/runtime.tsx components/assistant-ui/runtime.backup.tsx
   ```

2. **Update Runtime Provider with Thread List Adapter**
   ```typescript
   // components/assistant-ui/runtime.tsx
   "use client";

   import { useCallback, useEffect, useRef, useState } from "react";
   import {
     AssistantRuntimeProvider,
     useExternalStoreRuntime,
     type AppendMessage,
     type ThreadMessageLike,
     type ExternalStoreThreadListAdapter,
     type ExternalStoreThreadData,
   } from "@assistant-ui/react";
   import { BackendApi } from "@/lib/backend-api";
   import { constructSystemMessage, constructThreadMessage } from "@/lib/conversion";
   import { useThreadContext } from "@/lib/thread-context";

   export function AomiRuntimeProvider({
     children,
     backendUrl = "http://localhost:8080",
     publicKey,
   }: {
     children: React.ReactNode;
     backendUrl?: string;
     publicKey?: string;
   }) {
     const {
       currentThreadId,
       setCurrentThreadId,
       threads,
       setThreads,
       threadMetadata,
       setThreadMetadata,
     } = useThreadContext();

     const [isRunning, setIsRunning] = useState(false);
     const backendApiRef = useRef(new BackendApi(backendUrl));
     const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

     // Get messages for current thread
     const currentMessages = threads.get(currentThreadId) || [];

     // ... (rest of polling logic - see full implementation in previous message)

     // Thread List Adapter - THE KEY PIECE!
     const threadListAdapter: ExternalStoreThreadListAdapter = {
       threadId: currentThreadId,
       threads: Array.from(threadMetadata.entries())
         .filter(([_, meta]) => meta.status === "regular")
         .map(([id, meta]): ExternalStoreThreadData => ({
           threadId: id,
           title: meta.title,
           status: "regular",
         })),
       archivedThreads: Array.from(threadMetadata.entries())
         .filter(([_, meta]) => meta.status === "archived")
         .map(([id, meta]): ExternalStoreThreadData => ({
           threadId: id,
           title: meta.title,
           status: "archived",
         })),

       onSwitchToNewThread: async () => {
         if (!publicKey) return;
         const newThread = await backendApiRef.current.createThread(publicKey);
         const newId = newThread.session_id;
         setThreadMetadata((prev) =>
           new Map(prev).set(newId, { title: "New Chat", status: "regular" })
         );
         setThreads((prev) => new Map(prev).set(newId, []));
         setCurrentThreadId(newId);
       },

       onSwitchToThread: (threadId: string) => {
         setCurrentThreadId(threadId);
       },

       onRename: async (threadId: string, newTitle: string) => {
         await backendApiRef.current.renameThread(threadId, newTitle);
         setThreadMetadata((prev) => {
           const meta = prev.get(threadId);
           if (!meta) return prev;
           return new Map(prev).set(threadId, { ...meta, title: newTitle });
         });
       },

       onArchive: async (threadId: string) => {
         await backendApiRef.current.archiveThread(threadId);
         setThreadMetadata((prev) => {
           const meta = prev.get(threadId);
           if (!meta) return prev;
           return new Map(prev).set(threadId, { ...meta, status: "archived" });
         });
       },

       onUnarchive: async (threadId: string) => {
         await backendApiRef.current.unarchiveThread(threadId);
         setThreadMetadata((prev) => {
           const meta = prev.get(threadId);
           if (!meta) return prev;
           return new Map(prev).set(threadId, { ...meta, status: "regular" });
         });
       },

       onDelete: async (threadId: string) => {
         await backendApiRef.current.deleteThread(threadId);
         setThreadMetadata((prev) => {
           const next = new Map(prev);
           next.delete(threadId);
           return next;
         });
         setThreads((prev) => {
           const next = new Map(prev);
           next.delete(threadId);
           return next;
         });
         if (currentThreadId === threadId) {
           const firstRegularThread = Array.from(threadMetadata.entries())
             .find(([id, meta]) => meta.status === "regular" && id !== threadId);
           setCurrentThreadId(firstRegularThread?.[0] || "default-session");
         }
       },
     };

     const runtime = useExternalStoreRuntime({
       messages: currentMessages,
       setMessages: (msgs) => setThreads((prev) => new Map(prev).set(currentThreadId, msgs)),
       isRunning,
       onNew,
       onCancel,
       convertMessage: (msg) => msg,
       adapters: {
         threadList: threadListAdapter, // 🎯 This enables all thread operations!
       },
     });

     return (
       <AssistantRuntimeProvider runtime={runtime}>
         {children}
       </AssistantRuntimeProvider>
     );
   }
   ```

3. **Add Initial Thread List Loading**
   ```typescript
   // Add this useEffect to AomiRuntimeProvider

   // Load thread list from backend on mount
   useEffect(() => {
     if (!publicKey) return;

     const fetchThreadList = async () => {
       try {
         const threadList = await backendApiRef.current.fetchThreads(publicKey);
         const newMetadata = new Map<string, { title: string; status: "regular" | "archived" }>();

         for (const thread of threadList) {
           newMetadata.set(thread.session_id, {
             title: thread.main_topic || "New Chat",
             status: thread.is_archived ? "archived" : "regular",
           });
         }

         setThreadMetadata(newMetadata);
       } catch (error) {
         console.error("Failed to fetch thread list:", error);
       }
     };

     void fetchThreadList();
   }, [publicKey, setThreadMetadata]);
   ```

#### Acceptance Criteria
- [ ] Runtime provider updated with thread list adapter
- [ ] All 6 adapter methods implemented (archive, unarchive, delete, rename, switch, create)
- [ ] Thread context properly integrated
- [ ] Messages still load correctly for current thread
- [ ] No breaking changes to existing functionality

---

### Phase 4: Update Sidebar Integration (Day 2-3)
**Duration:** 1-2 hours
**Risk Level:** Low (simplifying existing code)

#### Tasks

1. **Simplify ThreadListSidebar**
   ```typescript
   // components/assistant-ui/threadlist-sidebar.tsx

   // REMOVE manual session fetching - now handled by runtime
   // DELETE these lines:
   // const [historySessions, setHistorySessions] = useState<HistorySession[]>([]);
   // const [isLoadingSessions, setIsLoadingSessions] = useState(false);
   // useEffect(() => { fetchSessions()... }, [address]);

   // The ThreadList component now automatically manages threads via AssistantApi!
   ```

2. **Use AssistantApi for Thread State**
   ```typescript
   // components/assistant-ui/threadlist-sidebar.tsx
   import { useAssistantState } from "@assistant-ui/react";

   export function ThreadListSidebar({ ...props }) {
     const { open } = useAppKit();
     const { address, isConnected } = useAppKitAccount();

     // Access thread state from AssistantApi
     const isLoadingThreads = useAssistantState(({ threads }) => threads.isLoading);
     const threadCount = useAssistantState(({ threads }) => threads.threadIds.length);

     return (
       <Sidebar {...props}>
         <SidebarHeader>
           {/* Header content */}
         </SidebarHeader>

         <SidebarContent>
           {/* ThreadList component handles everything now! */}
           <ThreadList />
         </SidebarContent>

         <SidebarFooter>
           {/* Footer content */}
         </SidebarFooter>
       </Sidebar>
     );
   }
   ```

#### Acceptance Criteria
- [ ] Duplicate session fetching removed from sidebar
- [ ] ThreadList component works without manual session management
- [ ] Sidebar displays threads from AssistantApi
- [ ] Loading states work correctly

---

### Phase 5: Testing & Validation (Day 3)
**Duration:** 2-3 hours
**Risk Level:** Low (testing only)

#### Manual Testing Checklist

```markdown
## Thread Operations

### Create New Thread
- [ ] Click "New Thread" button
- [ ] Verify new thread appears in list
- [ ] Verify backend creates new session
- [ ] Verify thread is selected automatically

### Switch Threads
- [ ] Create 2+ threads
- [ ] Click different threads in the list
- [ ] Verify messages load for selected thread
- [ ] Verify correct thread is highlighted

### Archive Thread
- [ ] Click archive button on a thread
- [ ] Verify thread moves to archived section
- [ ] Verify backend marks session as archived
- [ ] Verify archived threads are hidden from main list

### Unarchive Thread
- [ ] Click unarchive on an archived thread
- [ ] Verify thread returns to main list
- [ ] Verify backend updates session status

### Rename Thread
- [ ] Right-click thread → Rename (or use rename UI)
- [ ] Enter new title
- [ ] Verify title updates in list
- [ ] Verify backend persists new title

### Delete Thread
- [ ] Click delete button on a thread
- [ ] Verify thread is removed from list
- [ ] Verify backend deletes session
- [ ] Verify switching to another thread if current was deleted

## Message Operations

### Send Messages
- [ ] Send message in current thread
- [ ] Verify message appears immediately
- [ ] Verify backend processes message
- [ ] Verify response appears

### Multi-Thread Messages
- [ ] Send message in Thread A
- [ ] Switch to Thread B
- [ ] Send message in Thread B
- [ ] Switch back to Thread A
- [ ] Verify Thread A messages are intact
- [ ] Verify Thread B messages are intact

## Edge Cases

### No Wallet Connected
- [ ] Verify graceful handling when wallet not connected
- [ ] Verify default thread works

### Backend Errors
- [ ] Simulate backend error (network offline)
- [ ] Verify error messages display
- [ ] Verify app doesn't crash

### Concurrent Operations
- [ ] Archive thread while message is sending
- [ ] Switch threads rapidly
- [ ] Verify no race conditions

### Empty States
- [ ] Delete all threads
- [ ] Verify "No threads" message
- [ ] Verify can create new thread from empty state
```

---

### Phase 6: Optimization & Polish (Day 3-4)
**Duration:** 2-3 hours
**Risk Level:** Low (improvements only)

#### Tasks

1. **Add Loading States**
   ```typescript
   // components/assistant-ui/thread-list.tsx

   const ThreadListItems: FC = () => {
     const isLoading = useAssistantState(({ threads }) => threads.isLoading);

     if (isLoading) {
       return <ThreadListSkeleton />;
     }

     return <ThreadListPrimitive.Items components={{ ThreadListItem }} />;
   };
   ```

2. **Add Optimistic Updates**
   ```typescript
   // In threadListAdapter.onArchive
   onArchive: async (threadId: string) => {
     // Optimistic update
     setThreadMetadata((prev) => {
       const meta = prev.get(threadId);
       if (!meta) return prev;
       return new Map(prev).set(threadId, { ...meta, status: "archived" });
     });

     try {
       await backendApiRef.current.archiveThread(threadId);
     } catch (error) {
       // Rollback on error
       setThreadMetadata((prev) => {
         const meta = prev.get(threadId);
         if (!meta) return prev;
         return new Map(prev).set(threadId, { ...meta, status: "regular" });
       });
       throw error;
     }
   },
   ```

3. **Add Error Boundaries**
   ```typescript
   // components/ErrorBoundary.tsx
   "use client";

   import { Component, ReactNode } from "react";

   export class ErrorBoundary extends Component<
     { children: ReactNode; fallback?: ReactNode },
     { hasError: boolean }
   > {
     constructor(props: any) {
       super(props);
       this.state = { hasError: false };
     }

     static getDerivedStateFromError() {
       return { hasError: true };
     }

     componentDidCatch(error: Error, errorInfo: any) {
       console.error("ErrorBoundary caught:", error, errorInfo);
     }

     render() {
       if (this.state.hasError) {
         return this.props.fallback || <div>Something went wrong</div>;
       }
       return this.props.children;
     }
   }
   ```

4. **Add Persistence Sync**
   ```typescript
   // Auto-save thread metadata to backend periodically
   useEffect(() => {
     if (!publicKey) return;

     const syncInterval = setInterval(async () => {
       // Sync any pending changes to backend
       // This ensures data consistency
     }, 30000); // Every 30 seconds

     return () => clearInterval(syncInterval);
   }, [publicKey]);
   ```

#### Acceptance Criteria
- [ ] Loading states show during operations
- [ ] Optimistic updates provide instant feedback
- [ ] Errors are caught and displayed gracefully
- [ ] Thread metadata syncs periodically

---

## Rollback Strategy

### If Something Goes Wrong

1. **Immediate Rollback (< 1 hour)**
   ```bash
   # Restore backup
   mv components/assistant-ui/runtime.backup.tsx components/assistant-ui/runtime.tsx

   # Remove new files
   rm lib/thread-context.tsx

   # Revert git changes
   git checkout components/assistant-ui/runtime.tsx
   ```

2. **Partial Rollback**
   - Keep backend API changes (they don't affect frontend)
   - Remove thread list adapter
   - Keep using single thread mode

3. **Feature Flags**
   ```typescript
   // Add feature flag to enable/disable new features
   const ENABLE_MULTI_THREAD = process.env.NEXT_PUBLIC_ENABLE_MULTI_THREAD === 'true';

   const threadListAdapter = ENABLE_MULTI_THREAD ? {
     // ... adapter implementation
   } : undefined;
   ```

---

## Testing Checklist

### Automated Tests (Optional but Recommended)

```typescript
// __tests__/thread-context.test.tsx
import { renderHook, act } from '@testing-library/react';
import { ThreadContextProvider, useThreadContext } from '@/lib/thread-context';

describe('ThreadContext', () => {
  it('should initialize with default thread', () => {
    const { result } = renderHook(() => useThreadContext(), {
      wrapper: ThreadContextProvider,
    });

    expect(result.current.currentThreadId).toBe('default-session');
  });

  it('should switch threads', () => {
    const { result } = renderHook(() => useThreadContext(), {
      wrapper: ThreadContextProvider,
    });

    act(() => {
      result.current.setCurrentThreadId('new-thread');
    });

    expect(result.current.currentThreadId).toBe('new-thread');
  });
});
```

### Manual Testing

See [Phase 5: Testing & Validation](#phase-5-testing--validation-day-3)

---

## Success Metrics

### Phase Completion
- [ ] Phase 1: Backend API Extended
- [ ] Phase 2: Thread Context Created
- [ ] Phase 3: Runtime Enhanced
- [ ] Phase 4: Sidebar Simplified
- [ ] Phase 5: Testing Passed
- [ ] Phase 6: Optimizations Added

### Feature Completeness
- [ ] Create thread works
- [ ] Switch thread works
- [ ] Archive thread works
- [ ] Unarchive thread works
- [ ] Rename thread works
- [ ] Delete thread works
- [ ] Multi-thread state management works
- [ ] Backend persistence works

### Quality Metrics
- [ ] No console errors
- [ ] No memory leaks
- [ ] Responsive UI (< 100ms for local operations)
- [ ] Backend sync (< 2s for remote operations)
- [ ] Error recovery works
- [ ] All tests pass

---

## Timeline Summary

| Phase | Duration | Dependencies | Risk |
|-------|----------|--------------|------|
| 1. Backend API | 2-3 hours | None | Low |
| 2. Thread Context | 1-2 hours | Phase 1 | Low |
| 3. Runtime Enhancement | 3-4 hours | Phase 1, 2 | Medium |
| 4. Sidebar Update | 1-2 hours | Phase 3 | Low |
| 5. Testing | 2-3 hours | Phase 4 | Low |
| 6. Optimization | 2-3 hours | Phase 5 | Low |

**Total Estimated Time:** 11-17 hours (1.5-2 days)

---

## Next Steps

1. **Review this plan** with your team
2. **Set up feature branch**
   ```bash
   git checkout -b feature/assistant-api-migration
   ```
3. **Start with Phase 1** (lowest risk)
4. **Test after each phase** before moving to the next
5. **Document any deviations** from this plan
6. **Update this document** as you progress

---

## Resources

- [AssistantApi Documentation](https://www.assistant-ui.com/docs/api-reference/overview)
- [ExternalStoreRuntime Guide](https://www.assistant-ui.com/docs/runtimes/custom/external-store)
- [Thread List Management](https://www.assistant-ui.com/docs/runtimes/custom/custom-thread-list)
- [Migration Guide v0.12](https://www.assistant-ui.com/docs/migrations/v0-12)

---

## Notes

- Keep `runtime.backup.tsx` until migration is verified in production
- Monitor backend API performance after launch
- Consider adding telemetry for thread operations
- Plan for backend API versioning if needed

---

**Last Updated:** 2025-11-23
**Status:** 📝 Planning
**Next Review:** After Phase 3 completion
