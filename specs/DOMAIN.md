# Domain Rules

## Architecture

**Single Sources of Truth:**

- User/wallet state → `contexts/user-context.tsx` via `useUser()` hook
- Thread state → `contexts/thread-context.tsx` via `useThreadContext()`
- Event dispatching → `contexts/event-context.tsx` via `useEventContext()`
- Control state (model/namespace/apiKey) → `contexts/control-context.tsx` via `useControl()`
- Backend API calls → `backend/client.ts` (AomiClient class)
- Message conversion → `runtime/utils.ts`

**Provider Hierarchy:**

```
ThreadContextProvider (external - must wrap AomiRuntimeProvider)
└── AomiRuntimeProvider (shell)
    └── NotificationContextProvider
        └── UserContextProvider
            └── EventContextProvider
                └── RuntimeActionsProvider
                    └── AomiRuntimeCore
                        └── ControlContextProvider
                            └── AssistantRuntimeProvider
                                └── {children}
```

**Component Hierarchy:**

```
AomiFrame (apps/registry)
├── ThreadListSidebar (navigation)
├── Thread (message view)
├── ControlBar (model/namespace selection)
│   ├── ModelSelect
│   ├── NamespaceSelect
│   └── ApiKeyInput
└── WalletFooter slot (via render prop)
```

## Do / Don't

| Do                                        | Don't                               |
| ----------------------------------------- | ----------------------------------- |
| Use `useUser()` for wallet state          | Local wallet state in components    |
| Use `useThreadContext()` for thread state | Local state for thread data         |
| Use `useWalletHandler()` for tx requests  | Manual event subscription           |
| Let runtime auto-sync wallet changes      | Manual `sendSystemMessage()` calls  |
| Optimistic UI updates + backend confirm   | Wait for backend before updating UI |

## File Conventions

| Location         | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| `backend/*.ts`   | AomiClient HTTP client + API types                             |
| `contexts/*.tsx` | React contexts (User, Event, Thread, Notification, Control)    |
| `handlers/*.ts`  | Event handler hooks (useWalletHandler, useNotificationHandler) |
| `runtime/*.tsx`  | Runtime orchestration (providers, controllers)                 |
| `state/*.ts`     | State stores (backend-state, thread-store, event-buffer)       |

## Key Types

| Type                                | Source                         |
| ----------------------------------- | ------------------------------ |
| `ThreadMessageLike`                 | `@assistant-ui/react`          |
| `AomiMessage`, `ApiStateResponse`   | `backend/types.ts`             |
| `UserState`                         | `contexts/user-context.tsx`    |
| `ControlState`, `ControlContextApi` | `contexts/control-context.tsx` |
| `InboundEvent`, `OutboundEvent`     | `state/event-buffer.ts`        |
| `WalletTxRequest`                   | `handlers/wallet-handler.ts`   |

## Data Flows

**User message:**

```
Composer → onNew() → MessageController.outbound()
  → AomiClient.postChatMessage() → PollingController.start()
  → poll /api/state → MessageController.inbound() → re-render
```

**Thread switch:**

```
Click → threadListAdapter.onSwitchToThread()
  → setCurrentThreadId() → ensureInitialState()
  → fetchState() → apply messages
```

**Wallet state change:**

```
External wallet lib → setUser() → onUserStateChange callback
  → postSystemMessage("wallet:state_changed") → backend
```

**Inbound system event (e.g., wallet_tx_request):**

```
Backend → /api/state response → system_events[]
  → PollingController.handleState() → dispatchInboundSystem()
  → EventBuffer → dispatch() → useWalletHandler subscription
  → onTxRequest callback
```

**Namespace fetch (on mount or apiKey change):**

```
ControlContextProvider mounts (or apiKey changes)
  → useEffect() → aomiClient.getNamespaces(sessionId, publicKey, apiKey)
  → GET /api/control/apps → string[]
  → setStateInternal({ authorizedNamespaces, namespace })
```

**Model selection:**

```
User selects model in ModelSelect
  → onModelSelect(model) → aomiClient.setModel(sessionId, rig, namespace)
  → POST /api/control/model → { success, rig, baml, created }
```

## Backend Endpoints

| Endpoint                           | Purpose        | Response                  |
| ---------------------------------- | -------------- | ------------------------- |
| `POST /api/chat`                   | Send message   | `ApiChatResponse`         |
| `GET /api/state`                   | Poll session   | `ApiStateResponse`        |
| `POST /api/interrupt`              | Cancel         | `ApiInterruptResponse`    |
| `POST /api/system`                 | System message | `ApiSystemResponse`       |
| `GET /api/updates`                 | SSE stream     | `ApiSSEEvent`             |
| `POST /api/sessions`               | Create thread  | `ApiCreateThreadResponse` |
| `GET /api/sessions`                | List threads   | `ApiThread[]`             |
| `PATCH /api/sessions/:id`          | Rename         | -                         |
| `DELETE /api/sessions/:id`         | Delete         | 204                       |
| `POST /api/sessions/:id/archive`   | Archive        | 200                       |
| `POST /api/sessions/:id/unarchive` | Unarchive      | 200                       |
| `GET /api/control/apps`      | Get namespaces | `string[]`                |
| `GET /api/control/models`          | Get models     | `string[]`                |
| `POST /api/control/model`          | Set model      | `{ success, rig, baml }`  |

**ApiStateResponse:** `{ messages?, system_events?, is_processing?, title?, session_exists? }`

## Architecture Layers

```
UI Components (apps/registry - AomiFrame, Thread, etc.)
    ↓ uses hooks from lib
Contexts & Handlers (packages/react/contexts, handlers)
    ↓ uses
Runtime (packages/react/runtime - orchestrator, controllers)
    ↓ uses
AomiClient (packages/react/backend)
    ↓ HTTP/SSE
Backend Server
```

## Payment Methods

`paymentMethod` is **per-thread** state on `ThreadControlState` (`null = backend default`). Set via `useControl().onPaymentMethodSelect`; orchestrator propagates it into `ClientSession.sendMessage`. Backend selects via `?payment_method=` on `/api/chat`.

| Method     | Value      | Transport requirement                          |
| ---------- | ---------- | ---------------------------------------------- |
| Auto       | `null`     | none — backend runs the default chain          |
| Aomi       | `"null"`   | none (uses included credits)                   |
| BYOK       | `"byok"`   | provider key in vault (managed via `useControl`) |
| MPP/Tempo  | `"tempo"`  | host installs payment-aware `fetch` + wallet   |
| x402       | `"coinbase"` | host installs payment-aware `fetch` + wallet |

The widget does **not** ship MPP/x402 transport. Hosts pass a wallet-bound `fetch` via `<AomiFrame.Root clientOptions={{ fetch }}>` (see `apps/portal/src/lib/payment-client-options.ts` for the reference impl using `mppx` + `@x402/fetch`). Per `specs/portal-widget-lib-unification.md`, this stays portal-local and must not become default widget-lib behavior.

`<PaymentSelect>` accepts an optional `getStatus(method)` prop returning `{ tone, label, connect? }`. `connect` is optional; portal's adapter intentionally omits it because wallet-method handshakes (MPP/x402) happen automatically on the next chat turn via the response-header dispatcher (see "Payment auth dispatcher" below). Hosts MAY attach `connect` for their own payment methods if they need an explicit setup step.

`<PaymentSettings>` is an opt-in settings panel exported from widget-lib, props-driven (host supplies `status` + `toggles`). Layout is Aomi-credits-first: hero card with a fallback chain visualizer (`Aomi credits → BYOK → MPP → x402`), then MPP and x402 cards, then BYOK. Renders `<ProviderKeysSettings />` by default; pass `providerKeys={false}` to skip BYOK and drop the `ControlContextProvider` requirement. `toggles.preferredPaymentMethod` is optional and unused by the new layout (back-compat only — per-thread method selection lives in `<PaymentSelect>` in the composer).

### Payment auth dispatcher

Backend's default chain (verified at `product-mono/aomi/bin/backend/src/endpoint/chat.rs:31`) is `null → byok → tempo → coinbase`. When the chain reaches a wallet step (tempo or coinbase), the backend returns 402 with a method-specific challenge header:

| Scheme | Challenge header             | Success header     |
| ------ | ---------------------------- | ------------------ |
| x402   | `Payment-Required` (base64)  | `Payment-Response` |
| MPP    | `WWW-Authenticate: Payment`  | `Payment-Receipt`  |

These two formats are **mutually exclusive** — `mppx` rejects 402s without `WWW-Authenticate`; `@x402/core` rejects 402s without `Payment-Required`. Wrapping one fetch in the other (`x402(mppx(...))`) breaks because the inner wrapper sees ALL 402s. The portal `paymentAwareFetch` instead:

1. **Narrows Auto** when MPP is off and x402 is on — appends `?payment_method=coinbase` to skip past the disabled tempo step in the backend chain. Other toggle combinations are no-ops.
2. **Short-circuits explicit method requests** — if the URL already carries `payment_method=tempo|coinbase`, hand the request directly to the matching wrapper. The wrapper's own probe→sign→retry runs once (one 402 then 200). Without this short-circuit the explicit path would pay two 402 round-trips (dispatcher probe + wrapper probe).
3. **Probes for Auto** — issues the request through plain `globalThis.fetch` (cloning `Request` inputs first to preserve the body for replay).
4. **Dispatches by response header** on the probe's 402: `Payment-Required` → x402Fetch; `WWW-Authenticate` → mppFetch. The chosen wrapper then runs its own probe→sign→retry, so Auto's wallet-fallback path costs **two** 402s plus the signed 200 (dispatcher probe + wrapper probe + signed retry). Acceptable for a boundary that only fires once, after credits and BYOK have already missed.

This handles both explicit-method requests (per-thread `<PaymentSelect>` choice) and Auto-mode wallet fallback (chain falls through to a wallet step on its own). Future agents: do **not** chain `wrapFetchWithPayment` and `Mppx.create({...}).fetch` together. They are dispatch targets, not composable transports.

**MPP two-shot handshake.** The Tempo gate (`product-mono/aomi/crates/payment/src/tempo.rs:198`) returns a *management response* on the first signed credential — typically the channel-opening confirmation from the on-chain escrow. That response sets `payment_method=tempo, status=200` but does NOT proceed to the LLM. The actual chat runs on the *second* request from the same `Mppx` instance, because the channel state is now cached in memory. The portal's `Mppx.create({...})` lives inside a `useMemo([wagmiConfig])` so a single React tree reuses the channel across messages — only a page reload (or wagmi config change) re-opens. `tempo({ maxDeposit: "0.5" })` is required so mppx can auto-open the channel; without it the first request throws `Error: No 'action' in context …`.

## Invariants

1. `ThreadContextProvider` must wrap `AomiRuntimeProvider`
2. All components with browser APIs have `"use client"`
3. Wallet state synced automatically via `onUserStateChange` subscription
4. Polling stops when `is_processing=false`
5. System events dispatched to EventBuffer for handler subscription
6. Control state (apiKey) persisted to localStorage automatically
7. Namespaces auto-fetched when apiKey changes
8. Model selection is backend-only (not stored in ControlState)
