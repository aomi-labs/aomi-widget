# @aomi-labs/client

TypeScript client for the Aomi on-chain agent backend. Works in Node.js and browsers.

## Install

```bash
npm install @aomi-labs/client
# or
pnpm add @aomi-labs/client
```

## Quick Start

### Low-level client

Direct HTTP/SSE access to all backend endpoints.

```ts
import { AomiClient } from "@aomi-labs/client";

const client = new AomiClient({ baseUrl: "https://api.aomi.dev" });

const threadId = crypto.randomUUID();
await client.createThread(threadId);

const response = await client.sendMessage(threadId, "What's the price of ETH?");
console.log(response.messages);
```

### Session (high-level)

Handles polling, event dispatch, and wallet request management automatically.

```ts
import { Session } from "@aomi-labs/client";

const session = new Session(
  { baseUrl: "https://api.aomi.dev" },
  { namespace: "default" },
);

// Blocking send — polls until the agent finishes responding
const result = await session.send("Swap 1 ETH for USDC on Uniswap");
console.log(result.messages);

// Listen for wallet signing requests
session.on("wallet_tx_request", async (req) => {
  const signed = await mySigner.signTransaction(req.payload);
  await session.resolve(req.id, { txHash: signed.hash });
});

session.close();
```

## Session API

### Constructor

```ts
new Session(clientOptions: AomiClientOptions, sessionOptions?: SessionOptions)
// or pass an existing AomiClient instance:
new Session(client: AomiClient, sessionOptions?: SessionOptions)
```

| Option | Default | Description |
|--------|---------|-------------|
| `sessionId` | `crypto.randomUUID()` | Thread/session ID |
| `namespace` | `"default"` | Backend namespace |
| `publicKey` | — | Wallet address |
| `apiKey` | — | API key for private namespaces |
| `userState` | — | Arbitrary user state sent with requests |
| `pollIntervalMs` | `500` | Polling interval in ms |
| `logger` | — | Pass `console` for debug output |

### Methods

| Method | Description |
|--------|-------------|
| `send(message)` | Send a message, wait for completion, return `{ messages, title }` |
| `sendAsync(message)` | Send without waiting — poll in background, listen via events |
| `resolve(id, result)` | Resolve a pending wallet request |
| `reject(id, reason?)` | Reject a pending wallet request |
| `interrupt()` | Cancel current processing |
| `close()` | Stop polling, unsubscribe SSE, clean up |
| `getMessages()` | Current messages |
| `getTitle()` | Current session title |
| `getPendingRequests()` | Pending wallet requests |
| `getIsProcessing()` | Whether the agent is processing |

### Events

```ts
session.on("wallet_tx_request", (req) => { ... });
session.on("wallet_eip712_request", (req) => { ... });
session.on("messages", (msgs) => { ... });
session.on("processing_start", () => { ... });
session.on("processing_end", () => { ... });
session.on("title_changed", ({ title }) => { ... });
session.on("tool_update", (event) => { ... });
session.on("tool_complete", (event) => { ... });
session.on("system_notice", ({ message }) => { ... });
session.on("system_error", ({ message }) => { ... });
session.on("error", ({ error }) => { ... });
session.on("*", ({ type, payload }) => { ... }); // wildcard
```

`.on()` returns an unsubscribe function:

```ts
const unsub = session.on("messages", handler);
unsub(); // stop listening
```

## CLI

The package includes an `aomi` CLI for scripting and Claude Code skills.

```bash
npx aomi chat "What's the gas price on Ethereum?"
npx aomi status
npx aomi events
npx aomi sign      # requires --private-key or PRIVATE_KEY env var + viem
npx aomi close
```

### Options

All config can be passed as flags (which take priority over env vars):

| Flag | Env Variable | Default | Description |
|------|-------------|---------|-------------|
| `--backend-url` | `AOMI_BASE_URL` | `https://api.aomi.dev` | Backend URL |
| `--api-key` | `AOMI_API_KEY` | — | API key for non-default namespaces |
| `--namespace` | `AOMI_NAMESPACE` | `default` | Namespace |
| `--private-key` | `PRIVATE_KEY` | — | Hex private key for `aomi sign` |
| `--rpc-url` | `CHAIN_RPC_URL` | — | RPC URL for transaction submission |

```bash
# Use a custom backend
npx aomi chat "hello" --backend-url https://my-backend.example.com

# Pass API key inline
npx aomi chat "swap 1 ETH" --api-key sk-abc123 --namespace my-agent
```

### How state works

The CLI is **not** a long-running process — each command starts, runs, and exits. Conversation history lives entirely on the backend (`api.aomi.dev`). Between invocations, the CLI saves a small pointer file at `$TMPDIR/aomi-session.json` containing just the `sessionId`, `baseUrl`, and `namespace` so it knows which conversation to continue.

```
# First call — no state file, creates a new session
$ npx aomi chat "hello"

# Second call — reads state file, reuses the same session (multi-turn)
$ npx aomi chat "what did I just say?"

# Check current session info
$ npx aomi status

# Clean up — deletes the state file (starts fresh next time)
$ npx aomi close
```

The state file is stored in your OS temp directory and gets cleaned up on reboot.

## Low-level Client API

```ts
const client = new AomiClient({ baseUrl, apiKey?, logger? });

// Chat
client.sendMessage(sessionId, message, opts?)   // → AomiChatResponse
client.fetchState(sessionId, userState?)         // → AomiStateResponse
client.sendSystemMessage(sessionId, message)     // → AomiSystemResponse
client.interrupt(sessionId)                      // → AomiInterruptResponse

// SSE
client.subscribeSSE(sessionId, onUpdate, onError?) // → unsubscribe fn

// Threads
client.createThread(threadId, publicKey?)
client.listThreads(publicKey)
client.getThread(sessionId)
client.deleteThread(sessionId)
client.renameThread(sessionId, title)
client.archiveThread(sessionId)
client.unarchiveThread(sessionId)

// System Events
client.getSystemEvents(sessionId, count?)

// Control
client.getNamespaces(sessionId, opts?)
client.getModels(sessionId)
client.setModel(sessionId, rig, opts?)
```

## Utilities

Exported for advanced use cases:

```ts
import {
  unwrapSystemEvent,       // AomiSystemEvent → { type, payload }
  normalizeTxPayload,      // raw payload → { to, value, data, chainId }
  normalizeEip712Payload,  // raw payload → { typed_data, description }
  TypedEventEmitter,       // generic typed event emitter class
} from "@aomi-labs/client";
```
