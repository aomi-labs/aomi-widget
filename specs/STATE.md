# Current State

## Last Updated

2025-01-30 - Control Context refactor for model/namespace selection

## Recent Changes

### Control Context Refactor (2025-01-30)

- Added `ControlContextProvider` for model/namespace/apiKey management
- Simplified `ControlState` to: `{ namespace, apiKey, availableModels, authorizedNamespaces }`
- Unified state updates via `setState({ namespace?, apiKey? })` instead of individual setters
- Model selection is backend-only via `onModelSelect(model)` - not stored in client state
- Auto-fetches namespaces on mount and when apiKey changes
- ApiKey persisted to localStorage automatically
- Added Control API to `BackendApi`: `getNamespaces()`, `getModels()`, `setModel()`
- Updated test mocks with control API methods

### Control Bar Components

- `ModelSelect` - fetches models on mount, calls `onModelSelect()` on selection
- `NamespaceSelect` - fetches namespaces on mount, calls `setState({ namespace })` on selection
- `ApiKeyInput` - uses `setState({ apiKey })` for updates
- `ControlBar` - simplified (no more backendUrl/sessionId props)

### Runtime Modularization

- Split `aomi-runtime.tsx` into shell (50 lines) + `core.tsx` (runtime logic)
- Extracted `threadlist-adapter.ts` for thread list operations
- `orchestrator.ts` now receives `backendApi` instance instead of URL
- `ControlContextProvider` nested inside `AomiRuntimeCore` (needs threadContext and user)

### Event System

- Added `EventContextProvider` for inbound/outbound system events
- Added `UserContextProvider` for wallet/user state (replaces local state)
- Wallet state changes auto-synced via `onUserStateChange` subscription
- Handler hooks: `useWalletHandler()`, `useNotificationHandler()`

### API Simplification

- Removed `publicKey` prop from `AomiRuntimeProvider`
- Removed `WalletSystemMessageEmitter` component
- Removed `AomiRuntimeProviderWithNotifications` (use `AomiRuntimeProvider`)
- User address obtained from `useUser().user.address` internally

### Backend Compatibility (merged from codex branch)

- Added `tool_stream` field to `AomiMessage`
- Added `rehydrated`, `state_source` fields to `ApiStateResponse`
- System events use tagged enum format: `{ InlineCall: { type, payload } }`

### Apps Updated

- `apps/registry/src/components/aomi-frame.tsx` - uses new API
- `apps/registry/src/components/aomi-frame-collapsible.tsx` - uses new API
- `apps/registry/src/components/control-bar/` - simplified for new ControlContext

## Provider Structure

```
ThreadContextProvider (external)
└── AomiRuntimeProvider
    └── NotificationContextProvider
        └── UserContextProvider
            └── EventContextProvider
                └── RuntimeActionsProvider
                    └── AomiRuntimeCore
                        └── ControlContextProvider
                            └── AssistantRuntimeProvider
```

## Pending

- End-to-end testing of wallet tx request flow
- SSE event handling verification (SystemNotice, AsyncCallback)
- E2E verification of control flow: apiKey → namespaces → model selection

## Notes

- `WalletFooterProps` still works - `wallet`/`setWallet` map to `user`/`setUser`
- `WalletButtonState` type alias kept for backwards compatibility
- Specs are designed for new agents to quickly understand the codebase
- `ControlState` does not include `modelId` - model selection is backend-only
- `useControl()` hook provides access to control state and actions
- Control bar components get all data from context (no props needed)
