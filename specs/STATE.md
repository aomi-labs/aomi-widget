# Current State

## Last Updated

2026-02-02 - Thread-scoped control state (model/namespace per thread)

## Recent Changes

### Thread-Scoped Control State (2026-02-02)

- **`ThreadMetadata`** now includes a `control` field with `ThreadControlState`
- **`ThreadControlState`** stores per-thread control configuration:
  - `model: string | null` - selected model for this thread
  - `namespace: string | null` - selected namespace for this thread
  - `controlDirty: boolean` - whether control changed but chat hasn't started
  - `isProcessing: boolean` - whether thread is currently generating (disables controls)
- Model/namespace selections are now **thread-scoped** - switching threads restores previous selections
- `isProcessing` wired from orchestrator → thread metadata → control context → UI components
- Control dropdowns disabled while assistant is generating

### Control Context API Updates

- Removed `isProcessing` prop (now derived from thread metadata)
- Added `getCurrentThreadControl()` to get current thread's control state
- Added `onNamespaceSelect(namespace)` for per-thread namespace changes
- `onModelSelect(model)` now updates thread metadata + calls backend
- Added `markControlSynced()` to clear dirty flag after chat starts
- Global state: `apiKey`, `availableModels`, `authorizedNamespaces`, `defaultModel`, `defaultNamespace`
- Per-thread state: `model`, `namespace`, `controlDirty`, `isProcessing` (in ThreadMetadata)

### Control Context Refactor (2025-01-30)

- Added `ControlContextProvider` for model/namespace/apiKey management
- Model selection is backend-only via `onModelSelect(model)` - not stored in global client state
- Auto-fetches namespaces on mount and when apiKey changes
- ApiKey persisted to localStorage automatically
- Added Control API to `BackendApi`: `getNamespaces()`, `getModels()`, `setModel()`

### Control Bar Components

- `ModelSelect` - reads model from thread control state, calls `onModelSelect()` on selection
- `NamespaceSelect` - reads namespace from thread control state, calls `onNamespaceSelect()` on selection
- `ApiKeyInput` - uses `setApiKey()` for updates
- Both disabled when `isProcessing` is true

### Runtime Modularization

- Split `aomi-runtime.tsx` into shell (50 lines) + `core.tsx` (runtime logic)
- Extracted `threadlist-adapter.ts` for thread list operations
- `orchestrator.ts` now receives `backendApi` instance instead of URL
- `ControlContextProvider` receives `getThreadMetadata` and `updateThreadMetadata` from thread context
- Core syncs `isRunning` → `threadMetadata.control.isProcessing`

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
- `apps/registry/src/components/control-bar/` - uses thread-scoped control state

## Provider Structure

```
AomiRuntimeProvider
└── ThreadContextProvider
    └── NotificationContextProvider
        └── UserContextProvider
            └── ControlContextProvider (receives getThreadMetadata, updateThreadMetadata)
                └── EventContextProvider
                    └── AomiRuntimeCore (syncs isRunning → threadMetadata.control.isProcessing)
                        └── AssistantRuntimeProvider
```

## Data Flow

### Thread Control State Flow

```
User selects model/namespace
        ↓
ModelSelect/NamespaceSelect onClick
        ↓
onModelSelect(model) / onNamespaceSelect(namespace)
        ↓
updateThreadMetadata(threadId, { control: { ...control, model/namespace, controlDirty: true } })
        ↓
(for model) backendApi.setModel(sessionId, model, namespace)
        ↓
Backend stores model selection for session
```

### isProcessing Flow

```
Backend responds / assistant generating
        ↓
orchestrator detects isRunning change
        ↓
core.tsx useEffect syncs to threadMetadata.control.isProcessing
        ↓
ControlContextProvider reads from getThreadMetadata(sessionId).control.isProcessing
        ↓
ModelSelect/NamespaceSelect get isProcessing from useControl()
        ↓
Controls disabled while isProcessing === true
```

## Pending

- End-to-end testing of wallet tx request flow
- SSE event handling verification (SystemNotice, AsyncCallback)
- E2E verification of control flow: apiKey → namespaces → model selection
- Thread list should show model/namespace per thread (optional enhancement)

## Notes

- `WalletFooterProps` still works - `wallet`/`setWallet` map to `user`/`setUser`
- `WalletButtonState` type alias kept for backwards compatibility
- Specs are designed for new agents to quickly understand the codebase
- `useControl()` hook provides access to control state and actions
- Control bar components get all data from context (no props needed)
- New threads initialize with `createDefaultControlState()` (null model/namespace)
- Thread switching restores the thread's previous model/namespace selection
