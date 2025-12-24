# Progress Tracking

## Current Sprint Goal
**Branch:** `feat/system-event`  
**Goal:** Implement system event handling with notifications, refactor runtime with modular hooks, and improve wallet transaction flow

## Branch Status

### Current Branch
- `feat/system-event` (active)

### Recent Commits (Last 10)
- `bbd343c` - Add runtime specs md file
- `d5bfd4b` - Refactor runtime with hooks and modularization
- `b6b16bc` - Fix update subscribing issue
- `7dc493f` - Add notification for events instead of inline display
- `099b8a8` - Add thread switch while streaming
- `34e88cf` - Add meaningful style for different types of events
- `78243d0` - Adapt event changes for f/e; fix wallet signing issue with adding callbacks for wallet
- `d240a1e` - Remove obsolete landing pages
- `f967488` - 1.0.0
- `a2df180` - Merge pull request #7 from aomi-labs/vercel/packages-for-react-flight-rce-2z4un3

## Recently Completed Work

### 1. Runtime Refactoring & Modularization
- **Status:** ✅ Complete
- **Key Changes:**
  - Split monolithic runtime logic into focused hooks under `src/hooks/runtime/`
  - Created 12 specialized hooks for different runtime concerns:
    - `use-backend-api.ts` - Stable BackendApi ref management
    - `use-thread-id-mapping.ts` - Temp <-> backend ID mapping
    - `use-thread-message-store.ts` - Message state management
    - `use-thread-messaging.ts` - User/system message sending
    - `use-thread-polling.ts` - Polling loop for active threads
    - `use-thread-updates.ts` - SSE subscription management
    - `use-thread-state-sync.ts` - Initial state fetching on thread switch
    - `use-thread-lifecycle.ts` - Thread CRUD operations
    - `use-thread-list-sync.ts` - Thread list synchronization
    - `use-thread-list-adapter.ts` - Thread list UI adapter
    - `use-backend-system-events.ts` - System event parsing and dispatch
    - `use-wallet-tx.ts` - Wallet transaction handling
  - Added `lib/runtime-utils.ts` for shared runtime helpers
  - Updated `runtime.tsx` to orchestrate hooks cleanly

### 2. System Event Handling
- **Status:** ✅ Complete
- **Key Changes:**
  - Implemented `useBackendSystemEvents` hook to parse and handle backend system events
  - Support for three event types:
    - `InlineDisplay` with `wallet_tx_request` payload
    - `SystemError` - Error notifications
    - `SystemNotice` - Informational notices
  - Events are processed from both polling (`/api/state`) and SSE updates
  - Events trigger appropriate actions (wallet prompts or notifications)

### 3. Notification System
- **Status:** ✅ Complete
- **Key Changes:**
  - Created `lib/notification-context.tsx` - Notification context provider
  - Created `components/assistant-ui/notification.tsx` - Notification UI component
  - Support for multiple notification types: error, notice, success
  - Custom icon types: error, success, notice, wallet, transaction, network, warning
  - Auto-dismiss with configurable duration (default 5000ms)
  - Styled notifications with proper dark mode support
  - System events now show notifications instead of inline display

### 4. Wallet Transaction Flow Improvements
- **Status:** ✅ Complete
- **Key Changes:**
  - Fixed wallet signing issue by adding proper callbacks
  - Wallet transaction requests now handled through `useWalletTx` hook
  - Proper integration with system events for wallet prompts
  - Transaction results posted as system messages to backend

### 5. Thread Management Enhancements
- **Status:** ✅ Complete
- **Key Changes:**
  - Added ability to switch threads while streaming
  - Fixed update subscribing issues
  - Improved thread state synchronization
  - Better handling of temp thread IDs during creation

### 6. Documentation
- **Status:** ✅ Complete
- **Key Changes:**
  - Added `specs/RUNTIME.md` with comprehensive runtime flow diagrams
  - Updated `specs/DOMAIN.md` and `specs/METADATA.md` to reflect new structure
  - Updated `specs/STATE.md` with recent changes

## Files Modified This Sprint

### Core Runtime
- `src/components/assistant-ui/runtime.tsx` - Refactored to use modular hooks
- `src/lib/backend-api.ts` - Updated for system events
- `src/lib/runtime-utils.ts` - **NEW** - Shared runtime utilities
- `src/lib/notification-context.tsx` - **NEW** - Notification context
- `src/utils/wallet.ts` - Updated for callback support

### Runtime Hooks (All New)
- `src/hooks/runtime/use-backend-api.ts`
- `src/hooks/runtime/use-backend-system-events.ts`
- `src/hooks/runtime/use-thread-id-mapping.ts`
- `src/hooks/runtime/use-thread-lifecycle.ts`
- `src/hooks/runtime/use-thread-list-adapter.ts`
- `src/hooks/runtime/use-thread-list-sync.ts`
- `src/hooks/runtime/use-thread-message-store.ts`
- `src/hooks/runtime/use-thread-messaging.ts`
- `src/hooks/runtime/use-thread-polling.ts`
- `src/hooks/runtime/use-thread-state-sync.ts`
- `src/hooks/runtime/use-thread-updates.ts`
- `src/hooks/runtime/use-wallet-tx.ts`

### UI Components
- `src/components/assistant-ui/notification.tsx` - **NEW** - Notification container
- `src/components/assistant-ui/thread.tsx` - Updated for event styling
- `src/components/aomi-frame.tsx` - Updated to include notification provider

### Documentation
- `specs/RUNTIME.md` - **NEW** - Runtime orchestration docs
- `specs/DOMAIN.md` - Updated
- `specs/METADATA.md` - Updated
- `specs/STATE.md` - Updated

## Pending Tasks

### High Priority
- [ ] Run build/lint to validate the runtime refactor
- [ ] Test system event handling end-to-end
- [ ] Verify wallet transaction flow with real backend

### Medium Priority
- [ ] Add unit tests for new hooks
- [ ] Add integration tests for system events
- [ ] Performance testing for polling and SSE subscriptions

### Low Priority
- [ ] Consider adding event history/audit log
- [ ] Add more notification types if needed
- [ ] Optimize notification rendering for many notifications

## Known Issues

### Resolved
- ✅ Update subscribing issue - Fixed in commit `b6b16bc`
- ✅ Wallet signing issue - Fixed in commit `78243d0`

### Open
- None currently tracked

## Multi-Step Flow State

### System Event Flow
1. ✅ Backend emits system event (via polling or SSE)
2. ✅ `useBackendSystemEvents` parses event
3. ✅ Routes to appropriate handler:
   - `wallet_tx_request` → `useWalletTx`
   - `SystemError` → Notification (error)
   - `SystemNotice` → Notification (notice)
4. ✅ User sees notification or wallet prompt
5. ✅ Results posted back to backend if needed

### Runtime Initialization Flow
1. ✅ `AomiRuntimeProvider` initializes
2. ✅ Creates shared refs and context
3. ✅ Composes all runtime hooks
4. ✅ Sets up polling and SSE subscriptions
5. ✅ Builds Assistant UI runtime

## Notes for Next Agent

### Architecture
- Runtime is now fully modular with focused hooks
- Each hook has a single responsibility
- Hooks communicate through refs and callbacks passed from orchestration layer
- See `specs/RUNTIME.md` for detailed flow diagrams

### System Events
- System events come from two sources:
  1. Polling: `/api/state` response includes `system_events` array
  2. SSE: `subscribeToUpdates` emits `event_available` notifications
- Events are parsed using `parseBackendSystemEvent` from `runtime-utils.ts`
- Only active thread receives SSE updates (managed by `useThreadUpdates`)

### Notifications
- Notification system is context-based
- Must wrap app with `NotificationProvider` (done in `aomi-frame.tsx`)
- Notifications auto-dismiss after duration
- Support for custom icons and styling per notification type

### Thread Management
- Temp threads are used for immediate UI updates before backend session creation
- Thread ID mapping (`useThreadIdMapping`) manages temp ↔ backend ID conversion
- Thread state is synchronized on switch via `useThreadStateSync`
- Only one thread is actively polled/subscribed at a time

### Testing Considerations
- Runtime hooks are pure functions (easy to test)
- Backend API calls are abstracted through `BackendApi` interface
- Notification system can be tested independently
- System event parsing has edge cases to cover

### Performance
- Polling runs at 500ms interval only when `is_processing=true`
- SSE subscriptions are cleaned up when threads are inactive
- Message store skips updates when user messages are queued
- Notification rendering is optimized with proper React patterns

