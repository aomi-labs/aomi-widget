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
npx aomi chat "swap 1 ETH for USDC"        # talk to the agent
npx aomi chat "swap 1 ETH" --verbose        # stream tool calls + responses live
npx aomi log                                # show full conversation history
npx aomi tx                                 # list pending + signed txs
npx aomi sign tx-1                          # sign a specific pending tx
npx aomi status                             # session info
npx aomi events                             # system events
npx aomi close                              # clear session
```

### Transaction flow

The backend builds transactions; the CLI persists and signs them:

```
$ npx aomi chat "swap 1 ETH for USDC on Uniswap"
# Agent plans the swap, backend emits a wallet_tx_request
# ⚡ Wallet request queued: tx-1
#    to:    0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD
#    value: 1000000000000000000
#    chain: 1
# Run `aomi tx` to see pending transactions, `aomi sign <id>` to sign.

$ npx aomi tx
# Pending (1):
#   ⏳ tx-1  to: 0x3fC9...7FAD  value: 1000000000000000000  chain: 1

$ npx aomi sign tx-1 --private-key 0xac0974...
# Signer:  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
# Tx:      tx-1
# To:      0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD
# Value:   1000000000000000000
# ✅ Sent! Hash: 0xabc123...
# Backend notified.

$ npx aomi tx
# Signed (1):
#   ✅ tx-1  hash: 0xabc123...  to: 0x3fC9...7FAD  value: 1000000000000000000
```

Pending and signed transactions are persisted in `$TMPDIR/aomi-session.json` alongside the session pointer, so they survive between CLI invocations.

### Verbose mode & conversation log

Use `--verbose` (or `-v`) to see tool calls and agent responses in real-time:

```
$ npx aomi chat "what's the price of ETH?" --verbose
⏳ Processing…
🔧 [tool] get_token_price: running
✔ [tool] get_token_price → {"price": 3245.67, "symbol": "ETH"}
🤖 ETH is currently trading at $3,245.67.
✅ Done
```

Use `aomi log` to replay the full conversation including tool results:

```
$ npx aomi log
10:30:15 AM 👤 You: what's the price of ETH?
10:30:16 AM 🔧 [get_token_price] {"price": 3245.67, "symbol": "ETH"}
10:30:16 AM 🤖 Agent: ETH is currently trading at $3,245.67.

— 3 messages —
```

### Options

All config can be passed as flags (which take priority over env vars):

| Flag | Env Variable | Default | Description |
|------|-------------|---------|-------------|
| `--backend-url` | `AOMI_BASE_URL` | `https://api.aomi.dev` | Backend URL |
| `--api-key` | `AOMI_API_KEY` | — | API key for non-default namespaces |
| `--namespace` | `AOMI_NAMESPACE` | `default` | Namespace |
| `--public-key` | `AOMI_PUBLIC_KEY` | — | Wallet address (tells agent your wallet) |
| `--private-key` | `PRIVATE_KEY` | — | Hex private key for `aomi sign` |
| `--rpc-url` | `CHAIN_RPC_URL` | — | RPC URL for transaction submission |
| `--verbose`, `-v` | — | — | Stream tool calls and agent responses live |

```bash
# Use a custom backend
npx aomi chat "hello" --backend-url https://my-backend.example.com

# Pass API key inline
npx aomi chat "swap 1 ETH" --api-key sk-abc123 --namespace my-agent
```

### How state works

The CLI is **not** a long-running process — each command starts, runs, and exits. Conversation history lives on the backend. Between invocations, the CLI persists to `$TMPDIR/aomi-session.json`:

- **`sessionId`** — which conversation to continue
- **`pendingTxs`** — unsigned transactions waiting for `aomi sign <id>`
- **`signedTxs`** — completed transactions with hashes

```
$ npx aomi chat "hello"           # creates session, saves sessionId
$ npx aomi chat "swap 1 ETH"     # reuses session, queues tx-1 if wallet request arrives
$ npx aomi sign tx-1              # signs tx-1, moves to signedTxs, notifies backend
$ npx aomi tx                     # shows all txs
$ npx aomi close                  # wipes state file
```

The state file lives in your OS temp directory and gets cleaned up on reboot.

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
