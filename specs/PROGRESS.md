# Progress Tracker

## Current Sprint Goal

Runtime architecture refactor: Event-driven system with EventBuffer, handler hooks, and controller-based message flow

## Branch Status

- **Current Branch:** `event-buff-redo`
- **Recent Commits:**
  - 7d6a6c3 landing compatibility
  - 586b99e merge codex compatibility changes
  - c3e225a use UserContext as primitive
  - cb732a9 codex made compatible
  - 059be7c merged main
  - fc1f5f2 compile
  - 3223bba new runtime-controller-handler arch
  - c0a4c51 remove legacy system events
  - cf9f0dd Merge pull request #19 from aomi-labs/sys-event-buff
  - ca8e264 pnpm lint

## Recently Completed Work

| Task                          | Description                                                              | Key Changes                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Runtime Architecture Refactor | New controller-handler architecture with EventBuffer for event streaming | Complete rewrite of runtime layer with clear separation of concerns                                       |
| EventBuffer Implementation    | Mutable ref-based event queue for inbound/outbound events                | `packages/react/src/state/event-buffer.ts` - Queues, subscribers, SSE status tracking                     |
| EventContextProvider          | React context for event management and SSE subscription                  | `packages/react/src/contexts/event-context.tsx` - Wraps EventBuffer with React context                    |
| Wallet Handler Hook           | Hook for wallet integration via event system                             | `packages/react/src/handlers/wallet-handler.ts` - sendTxComplete, sendConnectionChange, pendingTxRequests |
| Notification Handler Hook     | Hook for notification display via event system                           | `packages/react/src/handlers/notification-handler.ts` - notifications, unhandledCount, markHandled        |
| UserContext Primitive         | Refactored user context as a core primitive                              | `packages/react/src/contexts/user-context.tsx` - User identity and wallet state                           |
| Directory Restructure         | Moved files to logical locations                                         | api/ → backend/, hooks.ts → contexts/runtime-actions.ts, state/thread-context.tsx → contexts/             |
| Legacy Cleanup                | Removed old system event handling                                        | Deleted: api/types.ts, utils/conversion.ts, utils/wallet.ts, lib/utils.ts, state/types.ts                 |
| RuntimeOrchestrator Refactor  | Simplified orchestration with controller pattern                         | Uses MessageController + PollingController                                                                |
| ThreadListAdapter             | New adapter for thread list operations                                   | `packages/react/src/runtime/threadlist-adapter.ts`                                                        |
| Core Runtime Module           | Extracted core runtime utilities                                         | `packages/react/src/runtime/core.tsx`                                                                     |
| Landing Compatibility         | Updated AomiFrame components for new architecture                        | apps/registry components updated for new context providers                                                |

## Files Modified This Sprint

### New Files

- `packages/react/src/contexts/event-context.tsx` - EventContextProvider and hooks
- `packages/react/src/contexts/notification-context.tsx` - NotificationContext
- `packages/react/src/contexts/user-context.tsx` - UserContext primitive
- `packages/react/src/handlers/wallet-handler.ts` - useWalletHandler hook
- `packages/react/src/handlers/notification-handler.ts` - useNotificationHandler hook
- `packages/react/src/state/event-buffer.ts` - EventBuffer class
- `packages/react/src/runtime/threadlist-adapter.ts` - ThreadListAdapter
- `packages/react/src/runtime/core.tsx` - Core runtime utilities
- `specs/RUNTIME-ARCH.md` - Comprehensive architecture documentation

### Refactored Files

- `packages/react/src/backend/client.ts` - Renamed from api/client.ts
- `packages/react/src/backend/types.ts` - Renamed from api/types.ts, expanded types
- `packages/react/src/contexts/runtime-actions.ts` - Renamed from runtime/hooks.ts
- `packages/react/src/contexts/thread-context.tsx` - Moved from state/
- `packages/react/src/runtime/aomi-runtime.tsx` - Major refactor, now uses controller pattern
- `packages/react/src/runtime/orchestrator.ts` - Simplified coordination
- `packages/react/src/runtime/polling-controller.ts` - Updated for new architecture
- `packages/react/src/runtime/message-controller.ts` - Updated for new architecture
- `packages/react/src/runtime/utils.ts` - Expanded utility functions
- `packages/react/src/state/backend-state.ts` - Moved from runtime/
- `packages/react/src/state/thread-store.ts` - Updated for new types
- `packages/react/src/index.ts` - Updated exports

### Deleted Files

- `packages/react/src/api/client.ts` - Moved to backend/
- `packages/react/src/api/types.ts` - Merged into backend/types.ts
- `packages/react/src/lib/utils.ts` - Removed
- `packages/react/src/runtime/event-controller.ts` - Replaced by EventContext
- `packages/react/src/runtime/wallet-handler.ts` - Replaced by handlers/wallet-handler.ts
- `packages/react/src/services/session-service.ts` - Removed (simplified architecture)
- `packages/react/src/hooks/use-session-service.ts` - Removed
- `packages/react/src/state/types.ts` - Merged elsewhere
- `packages/react/src/utils/conversion.ts` - Merged into runtime/utils.ts
- `packages/react/src/utils/wallet.ts` - Replaced by handlers

### UI Components

- `apps/registry/src/components/aomi-frame.tsx` - Updated for new providers
- `apps/registry/src/components/aomi-frame-collapsible.tsx` - Updated for new providers

## Pending Tasks

### Event System

- [ ] Add SSE reconnection status indicator to UI
- [ ] Test high-priority event flushing behavior
- [ ] Add event deduplication if needed

### Handler Hooks

- [ ] Add unit tests for useWalletHandler
- [ ] Add unit tests for useNotificationHandler
- [ ] Document handler hook usage in README

### Testing

- [ ] Update existing tests for new architecture
- [ ] Add integration tests for event flow
- [ ] Test wallet transaction flow end-to-end
- [ ] Test notification flow end-to-end

### Documentation

- [ ] Update DOMAIN.md with new architecture patterns
- [ ] Add code examples to RUNTIME-ARCH.md

## Known Issues

None currently - build and dev server working correctly after landing compatibility updates.

## Notes for Next Agent

### Architecture Overview

The runtime was completely refactored to an event-driven architecture:

```
Provider Layer:
ThreadContextProvider → AomiRuntimeProvider → EventContextProvider → RuntimeActionsProvider → AssistantRuntimeProvider

Controllers:
RuntimeOrchestrator → MessageController + PollingController

State:
- ThreadContext (reactive) - UI-facing thread/message data
- BackendState (mutable ref) - Backend sync coordination
- EventBuffer (mutable ref) - Inbound/outbound event queues
```

### Key Patterns

1. **Event Handlers as Hooks**: Wallet and notification handling are now React hooks (`useWalletHandler`, `useNotificationHandler`) that subscribe to EventBuffer via EventContext.

2. **Outbound Events**: Use `enqueueOutbound()` from EventContext. High priority events flush immediately, normal priority batch on timer.

3. **Inbound Events**: SSE events go to EventBuffer → dispatch to subscribers → handler hooks process them.

4. **ID Resolution**: Temp IDs (`temp-{uuid}`) are used for optimistic UI. `resolveThreadId()` in BackendState maps to backend IDs.

### Key Commands

```bash
pnpm run build:lib              # Build library to dist/
pnpm --filter landing dev       # Run demo at localhost:3000
pnpm lint                       # Lint check
```

### File Locations Changed

- Backend API: `packages/react/src/backend/` (was `api/`)
- Thread context: `packages/react/src/contexts/` (was `state/`)
- Event handlers: `packages/react/src/handlers/`
- Event state: `packages/react/src/state/event-buffer.ts`
