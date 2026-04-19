# @aomi-labs/react

React runtime, hooks, and utilities for building UIs on top of the Aomi on-chain agent backend.

## Install

```bash
npm install @aomi-labs/react @assistant-ui/react react react-dom
# or
pnpm add @aomi-labs/react @assistant-ui/react react react-dom
```

Optional dependencies when building custom auth adapters or host-side wallet
bridges:

```bash
pnpm add wagmi viem
```

If you use the registry-installed `AomiFrame` from `@aomi-labs/widget-lib`,
wallet behavior comes from a host-supplied `AomiAuthAdapterProvider` bridge.
`@aomi-labs/react` does not ship a built-in Para adapter.

## Quick Start

Wrap your app with `AomiRuntimeProvider`, then use `useAomiRuntime()` anywhere inside:

```tsx
import { AomiRuntimeProvider, useAomiRuntime } from "@aomi-labs/react";

function App() {
  return (
    <AomiRuntimeProvider backendUrl="https://api.aomi.dev">
      <Chat />
    </AomiRuntimeProvider>
  );
}

function Chat() {
  const { sendMessage, isRunning, getMessages } = useAomiRuntime();

  return (
    <div>
      <button onClick={() => sendMessage("What's the price of ETH?")}>
        Ask
      </button>
      {isRunning && <p>Thinking...</p>}
    </div>
  );
}
```

## Provider

### `<AomiRuntimeProvider>`

Root provider that composes thread, user, event, notification, and control contexts.

| Prop | Default | Description |
|------|---------|-------------|
| `backendUrl` | `"http://localhost:8080"` | Aomi backend URL |
| `children` | — | React children |

## Hooks

### `useAomiRuntime()`

Unified hook providing access to all runtime APIs. Must be used inside `<AomiRuntimeProvider>`.

Returns an `AomiRuntimeApi` object with:

**User API**

| Property | Description |
|----------|-------------|
| `user` | Current user state (wallet address, chain, etc.) |
| `setUser(data)` | Update user state (partial merge) |
| `onUserStateChange(cb)` | Subscribe to user state changes |

**Thread API**

| Property | Description |
|----------|-------------|
| `currentThreadId` | Active thread ID |
| `threadMetadata` | Map of all thread metadata |
| `createThread()` | Create a new thread |
| `deleteThread(id)` | Delete a thread |
| `renameThread(id, title)` | Rename a thread |
| `selectThread(id)` | Switch to a thread |

**Chat API**

| Property | Description |
|----------|-------------|
| `isRunning` | Whether the agent is generating |
| `getMessages(threadId?)` | Get messages for a thread |
| `sendMessage(text)` | Send a message |
| `cancelGeneration()` | Cancel current generation |

**Wallet API**

| Property | Description |
|----------|-------------|
| `pendingWalletRequests` | Queued wallet requests |
| `resolveWalletRequest(id, result)` | Complete a wallet request |
| `rejectWalletRequest(id, error?)` | Reject a wallet request |

**Event API**

| Property | Description |
|----------|-------------|
| `subscribe(type, cb)` | Subscribe to backend events |
| `sendSystemCommand(event)` | Send a system command |
| `sseStatus` | SSE connection status |

### Other Hooks

| Hook | Description |
|------|-------------|
| `useUser()` | User/wallet state context |
| `useThreadContext()` | Thread management context |
| `useControl()` | Model/namespace/API key state |
| `useNotification()` | Toast notification context |
| `useEventContext()` | Raw event system access |
| `useWalletHandler()` | Wallet request handler for custom adapter implementations |
| `useNotificationHandler()` | Notification event handler |

## Utilities

```ts
import {
  cn,                // clsx + tailwind-merge
  formatAddress,     // 0x1234...5678
  getNetworkName,    // chainId → "Ethereum", "Polygon", etc.
  getChainInfo,      // chainId → { name, symbol, explorer }
  SUPPORTED_CHAINS,  // supported chain info map
} from "@aomi-labs/react";
```

## Re-exports

`AomiClient` and all core types are re-exported from `@aomi-labs/client`:

```ts
import { AomiClient } from "@aomi-labs/react";
import type { AomiMessage, AomiChatResponse } from "@aomi-labs/react";
```
