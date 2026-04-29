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

### Session API

#### Constructor

```ts
new Session(clientOptions: AomiClientOptions, sessionOptions?: SessionOptions)
// or pass an existing AomiClient instance:
new Session(client: AomiClient, sessionOptions?: SessionOptions)
```

| Option           | Default               | Description                             |
| ---------------- | --------------------- | --------------------------------------- |
| `sessionId`      | `crypto.randomUUID()` | Thread/session ID                       |
| `namespace`      | `"default"`           | Backend namespace                       |
| `publicKey`      | —                     | Wallet address                          |
| `apiKey`         | —                     | API key for private namespaces          |
| `userState`      | —                     | Arbitrary user state sent with requests |
| `pollIntervalMs` | `500`                 | Polling interval in ms                  |
| `logger`         | —                     | Pass `console` for debug output         |

#### Methods

| Method                 | Description                                                       |
| ---------------------- | ----------------------------------------------------------------- |
| `send(message)`        | Send a message, wait for completion, return `{ messages, title }` |
| `sendAsync(message)`   | Send without waiting — poll in background, listen via events      |
| `resolve(id, result)`  | Resolve a pending wallet request                                  |
| `reject(id, reason?)`  | Reject a pending wallet request                                   |
| `interrupt()`          | Cancel current processing                                         |
| `close()`              | Stop polling, unsubscribe SSE, clean up                           |
| `getMessages()`        | Current messages                                                  |
| `getTitle()`           | Current session title                                             |
| `getPendingRequests()` | Pending wallet requests                                           |
| `getIsProcessing()`    | Whether the agent is processing                                   |

#### Events

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

The package includes an `aomi` CLI for scripting. When installed globally or
in a project, the executable name is `aomi`. For one-off usage, run commands
via `npx @aomi-labs/client ...`.

Claude Code / Codex skills that drive this CLI live in the separate
[`aomi-labs/skills`](https://github.com/aomi-labs/skills) repository — that
repo is the single source of truth for skill content.

```bash
npx @aomi-labs/client --version                         # print installed CLI version
npx @aomi-labs/client                                    # start the interactive REPL
npx @aomi-labs/client --prompt "swap 1 ETH for USDC"    # one-shot prompt mode
npx @aomi-labs/client chat "swap 1 ETH for USDC"        # explicit chat subcommand
npx @aomi-labs/client chat "swap 1 ETH for USDC" --model claude-sonnet-4
npx @aomi-labs/client chat "swap 1 ETH" --verbose        # stream tool calls + responses live
npx @aomi-labs/client --provider-key anthropic:sk-ant-... --prompt "hello"
npx @aomi-labs/client app list                           # list available apps
npx @aomi-labs/client model list                         # list available models
npx @aomi-labs/client model set claude-sonnet-4          # switch the current session model
npx @aomi-labs/client session new                        # create a fresh active session
npx @aomi-labs/client secret list                        # list configured secret handles
npx @aomi-labs/client secret add ALCHEMY_API_KEY=...     # ingest a secret for the active session
npx @aomi-labs/client session log                        # show full conversation history
npx @aomi-labs/client tx list                            # list pending + signed txs
npx @aomi-labs/client tx sign tx-1                       # sign a specific pending tx
npx @aomi-labs/client session status                     # session info
npx @aomi-labs/client session events                     # system events
npx @aomi-labs/client session close                      # clear session
```

The root command now mirrors the Rust CLI shape:

- `aomi` starts an interactive REPL with `/app`, `/model`, `/key`, and `:exit`.
- `aomi --prompt "..."` sends a single prompt and exits.
- The noun-verb subcommands remain available for transaction, session, secret, and control flows.

### Wallet connection

Pass `--public-key` so the agent knows your wallet address. This lets it build
transactions and check your balances:

```bash
npx @aomi-labs/client chat "send 0 ETH to myself" \
  --public-key 0x5D907BEa404e6F821d467314a9cA07663CF64c9B
```

The address is persisted in the state file, so subsequent commands in the same
session don't need it again.

### Chain selection

Use `--chain <id>` for the current command when the task is chain-specific:

```bash
$ npx @aomi-labs/client chat "swap 1 POL for USDC on Polygon" --chain 137
```

Use `AOMI_CHAIN_ID` when several consecutive commands should share the same
chain context.

### Fresh sessions

Use `--new-session` when you want a command to start a fresh backend/local
session instead of reusing the currently active one:

```bash
$ npx @aomi-labs/client chat "show my balances" --new-session
$ npx @aomi-labs/client secret add ALCHEMY_API_KEY=... --new-session
$ npx @aomi-labs/client session new
```

This is useful when starting a new operator flow or a new external chat thread
and you do not want stale session state to bleed into the next run.

### Model selection

The CLI can discover and switch backend models for the active session:

```bash
$ npx @aomi-labs/client model list
claude-sonnet-4
gpt-5

$ npx @aomi-labs/client model set gpt-5
Model set to gpt-5

$ npx @aomi-labs/client chat "hello" --model claude-sonnet-4
```

`aomi model set` persists the selected model in the local session state after a
successful backend update. `aomi chat --model ...` applies the requested model
before sending the message and updates that persisted state as well.

### Secret management

The CLI supports per-session secret ingestion. This lets the backend use opaque
handles instead of raw secret values:

```bash
$ npx @aomi-labs/client secret add ALCHEMY_API_KEY=sk_live_123
Configured 1 secret for session 7f8a...
ALCHEMY_API_KEY  $SECRET:ALCHEMY_API_KEY

$ npx @aomi-labs/client secret add ALCHEMY_API_KEY=sk_live_123 --new-session
$ npx @aomi-labs/client --prompt "simulate a swap on Base"
```

You can inspect or clear the current session's secret handles:

```bash
$ npx @aomi-labs/client secret list
ALCHEMY_API_KEY  $SECRET:ALCHEMY_API_KEY

$ npx @aomi-labs/client secret clear
Cleared all secrets for the active session.
```

### Transaction flow

The backend builds transactions; the CLI persists and signs them:

```
$ npx @aomi-labs/client chat "swap 1 ETH for USDC on Uniswap" --public-key 0xYourAddr --chain 1
⚡ Wallet request queued: tx-1
   to:    0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD
   value: 1000000000000000000
   chain: 1
Run `aomi tx list` to see pending transactions, `aomi tx sign <id>` to sign.

$ npx @aomi-labs/client tx list
Pending (1):
  ⏳ tx-1  to: 0x3fC9...7FAD  value: 1000000000000000000  chain: 1

$ npx @aomi-labs/client tx sign tx-1 --private-key 0xac0974...
Signer:  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
IDs:     tx-1
Kind:    transaction
Tx:      tx-1 -> 0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD
Value:   1000000000000000000
Chain:   1
Exec:    aa (alchemy, 7702; fallback: eoa)
✅ Sent! Hash: 0xabc123...
Backend notified.

$ npx @aomi-labs/client tx list
Signed (1):
  ✅ tx-1  hash: 0xabc123...  to: 0x3fC9...7FAD  value: 1000000000000000000
```

**EIP-712 signing** is also supported. When the backend requests a typed data
signature (e.g. for CoW Protocol orders or permit approvals), it shows up as a
pending tx with `kind: eip712_sign`. `aomi tx sign` handles both kinds
automatically:

```
$ npx @aomi-labs/client tx list
Pending (1):
  ⏳ tx-2  eip712  Sign CoW swap order  (2:15:30 PM)

$ npx @aomi-labs/client tx sign tx-2 --private-key 0xac0974...
Signer:  0xf39Fd...92266
IDs:     tx-2
Kind:    eip712_sign
Desc:    Sign CoW swap order
Type:    Order
✅ Signed! Signature: 0x1a2b3c4d5e6f...
Backend notified.
```

By default, `aomi tx sign` tries account abstraction first. In default mode the CLI
retries unsponsored Alchemy AA when sponsorship is unavailable, then falls back
to direct EOA signing automatically if AA still fails. Use `--aa` to require AA
only, or `--eoa` to force EOA only.

### Verbose mode & conversation log

Use `--verbose` (or `-v`) to see tool calls and agent responses in real-time:

```
$ npx @aomi-labs/client chat "what's the price of ETH?" --verbose
⏳ Processing…
🔧 [tool] get_token_price: running
✔ [tool] get_token_price → {"price": 2045.67, "symbol": "ETH"}
🤖 ETH is currently trading at $2,045.67.
✅ Done
```

Without `--verbose`, only the final agent message is printed.

Use `aomi session log` to replay the full conversation with all messages and tool results:

```
$ npx @aomi-labs/client session log
10:30:15 AM 👤 You: what's the price of ETH?
10:30:16 AM 🤖 Agent: Let me check the current on-chain context for you.
10:30:16 AM 🔧 [Current ETH price] {"price": 2045.67, "symbol": "ETH"}
10:30:17 AM 🤖 Agent: ETH is currently trading at $2,045.67.

— 4 messages —
```

### Options

All config can be passed as flags (which take priority over env vars):

| Flag                    | Env Variable      | Default                | Description                                  |
| ----------------------- | ----------------- | ---------------------- | -------------------------------------------- |
| `--backend-url`         | `AOMI_BACKEND_URL`   | `https://api.aomi.dev` | Backend URL                                  |
| `--api-key`             | `AOMI_API_KEY`    | —                      | API key for non-default apps                 |
| `--app`                 | `AOMI_APP`        | `default`              | App                                          |
| `--model`               | `AOMI_MODEL`      | —                      | Model rig to apply before chat               |
| `--prompt`, `-p`        | —                 | —                      | Send a single prompt and exit                |
| `--show-tool`           | —                 | —                      | Show tool output in root prompt/REPL mode    |
| `--provider-key`        | —                 | —                      | Save a BYOK provider key as `PROVIDER:KEY`   |
| `--public-key`          | `AOMI_PUBLIC_KEY` | —                      | Wallet address (tells agent your wallet)     |
| `--private-key`         | `PRIVATE_KEY`     | —                      | Hex private key for `aomi tx sign`           |
| `--rpc-url`             | `CHAIN_RPC_URL`   | —                      | RPC URL for transaction submission           |
| `--chain`               | `AOMI_CHAIN_ID`   | `1`                    | Chain ID (1, 137, 42161, 8453, 10, 11155111) |
| `--verbose`, `-v`       | —                 | —                      | Stream tool calls and agent responses live   |
| `--version`, `-V`       | —                 | —                      | Print the installed CLI version              |

```bash
# Use a custom backend
npx @aomi-labs/client chat "hello" --backend-url https://my-backend.example.com

# Full signing flow with all flags
npx @aomi-labs/client chat "send 0.1 ETH to vitalik.eth" \
  --public-key 0xYourAddress \
  --api-key sk-abc123 \
  --app my-agent \
  --model claude-sonnet-4
npx @aomi-labs/client tx sign tx-1 \
  --private-key 0xYourPrivateKey \
  --rpc-url https://eth.llamarpc.com
```

### Signing modes

`aomi tx sign` supports three practical modes:

- Default: AA first, then automatic EOA fallback if AA is unavailable or fails
- `--aa`: require AA and do not fall back to EOA
- `--eoa`: force direct EOA execution

### How state works

The CLI is **not** a long-running process — each command starts, runs, and
exits. Conversation history lives on the backend. Between invocations, the CLI
persists local state under `AOMI_STATE_DIR` or `~/.aomi` by default:

| Field           | Purpose                                                |
| --------------- | ------------------------------------------------------ |
| `sessionId`     | Which conversation to continue                         |
| `clientId`      | Stable client identity used for session secret handles |
| `model`         | Last successfully applied model for the session        |
| `publicKey`     | Wallet address (from `--public-key`)                   |
| `chainId`       | Active chain ID (from `--chain`)                       |
| `secretHandles` | Opaque handles returned for ingested secrets           |
| `pendingTxs`    | Unsigned transactions waiting for `aomi tx sign <id>`  |
| `signedTxs`     | Completed transactions with hashes/signatures          |

```
$ npx @aomi-labs/client chat "hello"           # creates session, saves sessionId
$ npx @aomi-labs/client chat "swap 1 ETH"     # reuses session, queues tx-1 if wallet request arrives
$ npx @aomi-labs/client tx sign tx-1           # signs tx-1, moves to signedTxs, notifies backend
$ npx @aomi-labs/client tx list                # shows all txs
$ npx @aomi-labs/client close                  # clears the active local session pointer
```

Session files live under `~/.aomi/sessions/` by default, with an active session
pointer stored in the state root.
