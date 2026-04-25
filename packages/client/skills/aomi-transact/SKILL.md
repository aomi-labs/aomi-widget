---
name: aomi-transact
description: >
  Drive the Aomi CLI to chat with the Aomi agent, inspect sessions, simulate
  pending wallet requests on a forked chain, and sign queued transactions or
  EIP-712 payloads with account-abstraction-first execution. MUST NOT fabricate,
  guess, echo, or log credential values on the skill's own initiative;
  credential values may pass to the CLI only when the user has explicitly
  supplied them for a specific setup step they asked for.
compatibility: "Requires @aomi-labs/client (`npm install -g @aomi-labs/client`). CLI executable is `aomi`. Configuration is via the aomi CLI's own flags and environment — run `aomi --help` to see what the CLI accepts."

license: MIT
allowed-tools: Bash(aomi:*)
metadata:
  author: aomi-labs
  version: "0.10"
---

# Aomi Transact

Use the CLI as an agent operating procedure, not as a long-running shell.
Each `aomi` command starts, runs, and exits. Conversation history lives on the
backend. Local session data lives under `AOMI_STATE_DIR` or `~/.aomi`.

## Use This Skill When

- The user wants to chat with the Aomi agent from the terminal.
- The user wants balances, prices, routes, quotes, or transaction status.
- The user wants to build, simulate, confirm, sign, or broadcast wallet requests.
- The user wants to simulate a batch of pending transactions before signing.
- The user wants to inspect or switch apps, models, chains, or sessions.
- The user wants to inspect which secrets or providers are already configured for the current session, or explicitly asks to add or clear one.
- The user wants to inspect or change Account Abstraction settings.

## Hard Rules

- Never invent, guess, or derive a credential value. The skill only ever passes through a value the user has explicitly given for a specific action in this turn.
- Never echo a credential value back to the user after it has been used. Confirm the action ("wallet set", "secret `<HANDLE_NAME>` added") without restating the value.
- Setup commands that take a credential (`aomi wallet set <key>`, `aomi secret add NAME=value`, flags like `--private-key`) are only run when the user has explicitly asked for that specific setup in this turn and has supplied the value themselves. Do not run them on your own initiative to "prepare" or "fix" something.
- Before running a credential-setup command the user asked for, briefly confirm what will be persisted and where (local CLI state vs. the aomi backend — see "Secret Ingestion" for the transmission note), so the user can abort if that is not what they intended.
- Only call `aomi tx sign` after `aomi tx list` shows a pending `tx-N` the user asked for.
- When starting a new assistant thread, default the first aomi command to `--new-session` unless the user wants to continue an existing session.
- The signing RPC must match the pending transaction's chain. `--chain` (session context) and `--rpc-url` (signing transport) are independent — keep them aligned.
- `--aa-provider` and `--aa-mode` are AA-only controls and cannot be used with `--eoa`.

## Security Model

This skill is scoped to the `aomi` CLI. It does not install software, read files outside the aomi state directory, or execute code it generates.

- **Credentials are opaque pass-through.** The skill never fabricates, guesses, or derives a credential value. Values only reach the CLI when the user has handed them over for a specific command in this turn, and they are not echoed or retained afterwards.
- **No unsolicited setup.** The skill does not run credential-persisting setup (`aomi wallet set`, `aomi secret add NAME=value`) to "prepare" for a task on its own. It runs those commands only when the user explicitly asked, with the value the user supplied.
- **No blind signing.** Multi-step flows (approve → swap, approve → deposit) go through `aomi tx simulate` on a forked chain before `aomi tx sign`. Single-step read operations do not require simulation.
- **User-directed batches only.** `aomi tx sign` can take multiple ids; that is for batches the user has reviewed, not for sweeping a queue.
- **Read-only by default.** Chat, simulation, session inspection, and app/model/chain introspection do not move funds. Signing is a separate, explicit step the user must ask for.

## Command Structure

The CLI now has two entry shapes:

- **Root chat mode** aligned with the Rust backend CLI:
  - `aomi` starts the interactive REPL (user-driven; the skill uses one-shot commands instead).
  - `aomi --prompt "<message>"` sends one prompt and exits.
- **Operator subcommands** for durable session and wallet workflows:
  - `aomi <resource> <action>`

```
aomi --prompt "<message>"          Send one prompt and exit
aomi chat <message>                 Send a message
aomi tx list                        List pending/signed transactions
aomi tx simulate <id>...            Simulate a batch
aomi tx sign <id>...                Sign and submit
aomi session list|new|resume|delete|status|log|events|close
aomi model list|current
aomi app list|current
aomi chain list
aomi secret list|clear|add
```

## Quick Start

Run this once at the start of the session:

```bash
aomi --version
aomi --prompt "hello" --new-session
aomi session status 2>/dev/null || echo "no session"
```

If the user is asking for a read-only result, that may be enough. If they want
to build or sign a transaction, continue with the workflow below.

## Default Workflow

1. Chat with the agent.
2. If the agent asks whether to proceed, send a short confirmation in the same session.
3. Review pending requests with `aomi tx list`.
4. Sign the queued request with `aomi tx sign <id>`.
5. Verify with `aomi tx list`, `aomi session log`, or `aomi session status`.

The CLI output is the source of truth. If you do not see `Wallet request queued:
tx-N`, there is nothing to sign yet.

## Workflow Details

### Read-Only Requests

Use these when the user does not need signing:

```bash
aomi --prompt "<message>" --new-session
aomi
aomi chat "<message>" --new-session
aomi chat "<message>" --verbose
aomi tx list
aomi session log
aomi session status
aomi session events
aomi --version
aomi app list
aomi app current
aomi model list
aomi model current
aomi chain list
aomi session list
aomi session resume <id>
```

Notes:

- `aomi --prompt "<message>"` is the shortest one-shot path and mirrors the Rust CLI.
- `aomi` enters a REPL that reuses the active session and exposes `/app`, `/model`, and `/key`.
- Quote the chat message.
- On the first command in a new Codex or assistant thread, prefer `--new-session` so old local/backend state does not bleed into the new task.
- Use `--verbose` when debugging tool calls or streaming behavior.
- Pass `--public-key` on the first wallet-aware chat if the backend needs the user's address.
- For chain-specific requests, prefer `--chain <id>` on the command itself. Use `AOMI_CHAIN_ID=<id>` only when multiple consecutive commands should stay on the same chain.
- Use `aomi secret list` to inspect configured secret handles for the active session.
- `aomi session close` wipes the active local session pointer and starts a fresh thread next time.

### Secret Ingestion

Two paths, depending on who is driving:

**Inspect (skill-driven, always safe):**

```bash
aomi secret list     # handle names only, never raw values
aomi secret clear    # drop all configured secrets for the active session
```

`aomi secret list` prints handle names only, no values. `aomi secret clear` removes a set — no credential ever crosses the skill's hands.

**Add (user-driven):** if the user explicitly asks to configure a credential and supplies the value in this turn, the skill may run:

```bash
aomi secret add NAME=value [NAME=value ...]
```

Before doing so, warn the user about the trust boundary (below) so they can abort. Do not initiate ingestion on your own. Do not paraphrase the user's request into a new credential value. Do not repeat the credential value back in chat after the command runs — confirm with the handle name only.

**Trust-boundary note.** `aomi secret add` transmits each credential value to the aomi backend and stores a handle locally. The backend — not just the user's machine — becomes a trust boundary for that credential. If the user prefers the value to stay entirely local, advise them to export it in their own shell environment instead and let the CLI read it from there.

### Building Wallet Requests

Use the first chat turn to give the agent the task and, if relevant, the wallet address and chain:

```bash
aomi chat "swap 1 ETH for USDC" --new-session --public-key 0xUserAddress --chain 1
aomi chat "swap 1 POL for USDC on Polygon" --app khalani --chain 137
```

Important behavior:

- A chat response does not always queue a transaction immediately. The agent may return a quote, route, or deposit method and ask whether to proceed. Keep the same session and reply with a short confirmation message.
- Only move to `aomi tx sign` after a wallet request is queued. Confirm with `aomi tx list` first.
- For per-app conventions and first-turn examples (Khalani transfer routes, 0x cross-chain, Polymarket, Binance, Neynar, etc.), see [references/apps.md](references/apps.md#usage-examples).

Queued request looks like:

```
⚡ Wallet request queued: tx-1
   to:    0x...
   value: 1000000000000000000
   chain: 1
Run `aomi tx list` to see pending transactions, `aomi tx sign <id>` to sign.
```

### Signing Policy

Use these rules exactly:

- Default command: `aomi tx sign <tx-id> [<tx-id> ...]`
- Default behavior (**auto-detect**): if an AA provider is configured (env vars or flags), use AA automatically. If no AA provider is configured, use EOA. There is no silent fallback — AA either works or fails.
- **Mode fallback**: when AA is used, the CLI tries the preferred mode (default 7702). If it fails, it tries the alternative mode (4337). If both fail, it returns an error suggesting `--eoa`.
- `--eoa`: force direct EOA execution, skip AA entirely.
- `--aa-provider` or `--aa-mode`: AA-specific controls that also force AA mode. Cannot be used with `--eoa`.

Examples (the user's environment is assumed already configured — the skill does not set it):

```bash
# Default: auto-detect.
aomi tx sign tx-1

# Force EOA only
aomi tx sign tx-1 --eoa

# Explicit AA provider and mode
aomi tx sign tx-1 --aa-provider pimlico --aa-mode 4337
```

If `aomi tx sign` fails because credentials are missing, stop and ask the user to configure them — do not try to set them from the skill.

### Batch Simulation

Use `aomi tx simulate` to dry-run pending transactions before signing. Simulation
runs each tx sequentially on a forked chain so state-dependent flows (approve →
swap) are validated as a batch — the swap sees the approve's state changes.

```bash
# Simulate a single pending tx
aomi tx simulate tx-1

# Simulate a multi-step batch in order (approve then swap)
aomi tx simulate tx-1 tx-2
```

The response includes per-step success/failure, revert reasons, and gas usage:

```
Simulation result:
  Batch success: true
  Stateful: true
  Total gas: 147821

  Step 1 — approve USDC
    success: true
    gas_used: 46000

  Step 2 — swap on Uniswap
    success: true
    gas_used: 101821
```

When to simulate:

- **Always simulate multi-step flows** (approve → swap, approve → deposit, etc.) before signing. These are state-dependent — the second tx will revert if submitted independently.
- **Optional for single independent txs** like a simple ETH transfer or a standalone swap with no prior approval needed.
- If simulation fails at step N, read the revert reason before retrying. Common causes: insufficient balance, expired quote/timestamp, wrong calldata. Do not blindly re-sign after a simulation failure.

When not to simulate:

- Read-only operations (balances, prices, quotes).
- If there are no pending transactions (`aomi tx list` shows nothing).

For the full simulation-and-signing workflow on a multi-step batch, see [references/examples.md](references/examples.md#1-approve--swap).

### Account Abstraction (operational notes)

The default signing path is AA. Most invocations need no AA flags — `aomi tx sign tx-1` is enough. Use `--eoa` only when the user explicitly asks to skip AA. Use `--aa-provider`/`--aa-mode` only when the user wants to force a specific path.

For deeper details (execution model, mode fallback, providers, modes, sponsorship, chain defaults, RPC guidance per chain), read [references/account-abstraction.md](references/account-abstraction.md).

A few signing rules that always apply:

- `aomi tx sign` handles both transaction requests and EIP-712 typed-data signatures. Batch signing is supported for transactions only, not EIP-712.
- A single `--rpc-url` override cannot be used for a mixed-chain multi-sign request.
- The pending transaction already contains its target chain — pass `--rpc-url` matching that chain if the default RPC is wrong.

### Session And Storage Notes

- Active session, app, model, chain, pending txs, and signed txs are stored locally under `AOMI_STATE_DIR` or `~/.aomi`.
- Session files live under `~/.aomi/sessions/` by default and get local IDs like `session-1`.
- Useful commands:

```bash
aomi session list
aomi session resume <id>
aomi session delete <id>
aomi session close
```

## Reference: Commands

### Chat

```bash
aomi chat "<message>" --new-session
aomi chat "<message>" --verbose
aomi chat "<message>" --model <rig>
aomi chat "<message>" --public-key 0xYourAddress --chain 1
aomi chat "<message>" --app khalani --chain 137
```

- Quote the message.
- On the first command in a new Codex or assistant thread, prefer `--new-session`.
- Use `--verbose` to stream tool calls and agent output.
- Use `--public-key` on the first wallet-aware message.
- Use `--app`, `--model`, and `--chain` to change the active context for the next request.
- Prefer `--chain <id>` for one-off chain-specific requests. Use `AOMI_CHAIN_ID=<id>` when several consecutive commands should share the same chain context.

### Transaction Commands

```bash
aomi tx list
aomi tx simulate <id> [<id> ...]
aomi tx sign <id> [<id> ...]
```

- `aomi tx list` inspects pending and signed requests.
- `aomi tx simulate` runs a simulation batch for the given tx IDs.
- `aomi tx sign` signs and submits one or more queued requests.

### Session Commands

```bash
aomi session list
aomi session new
aomi session resume <id>
aomi session delete <id>
aomi session status
aomi session log
aomi session events
aomi session close
```

- `aomi session status` shows the current session summary.
- `aomi session log` replays conversation and tool output.
- `aomi session events` shows raw backend system events.
- `aomi session close` clears the active local session pointer. The next chat starts fresh.
- Session selectors accept the backend session ID, `session-N`, or `N`.

### Secret Commands

```bash
aomi secret list                       # skill-driven; handle names only, no values
aomi secret clear                      # skill-driven when the user asks to reset
aomi secret add NAME=value [NAME=...]  # user-directed only (see "Secret Ingestion")
```

- `aomi secret list` shows configured secret handles for the active session (no values).
- `aomi secret clear` removes all configured secrets for the active session.
- `aomi secret add` is run only when the user explicitly asked and supplied the value in this turn; see "Secret Ingestion" for the trust-boundary note the skill must surface before running it.

### App And Model Commands

The skill invokes the read forms freely. `set` forms mutate persistent state and should only be run when the user has explicitly asked for a change.

```bash
aomi app list
aomi app current
aomi model list
aomi model current
aomi model set <rig>       # only when the user asked to change the model
```

- `aomi app list` shows available backend apps.
- `aomi app current` shows the active app from local session state.
- `aomi model set <rig>` persists the selected model for the current session.
- `aomi chat --model <rig> "<message>"` applies a model for one turn without persisting it.

### Apps

Select an app for a chat turn with `--app <name>` or `AOMI_APP=<name>`. The set of installed apps is dynamic — confirm with `aomi app list` / `aomi app current`. For the full catalog, app-specific tools, credential requirements, and per-category usage examples (solver networks, cross-chain, prediction markets, CEX, social), read [references/apps.md](references/apps.md).

To build a new app from an API spec or SDK, use the companion skill **aomi-build**.

### Chain Commands

The skill invokes the read forms freely. `aomi chain set` persists a new default chain and should only be run when the user has asked for that change.

```bash
aomi chain list
aomi chain current
aomi chain set <id>        # only when the user asked to change the default chain
```

### Wallet And Config Commands

These persist state, so they are only run when the user explicitly asks and — for `wallet set` — supplies the value in this turn.

```bash
aomi wallet current             # skill-driven; safe to run freely
aomi wallet set <key>           # user-directed only; the user supplies <key>
aomi config current             # skill-driven; safe to run freely
aomi config set-backend <url>   # user-directed only; changes where the CLI talks to
```

- `aomi wallet current` shows the configured wallet address only, no credential.
- `aomi wallet set` persists a signing key locally under `AOMI_STATE_DIR`. The skill may run it **only** when the user asked to configure a wallet and provided the key in this turn. After running, confirm with the derived address — do not repeat the key value back.
- `aomi config current` shows the backend URL.
- `aomi config set-backend` repoints the CLI at a different backend. The skill runs it only when the user explicitly asked for that change.

## Reference: Account Abstraction

The CLI is AA-first: by default it signs via AA (zero-config Alchemy proxy if the user has nothing configured) and only falls back to EOA when `--eoa` is passed.

For execution-model details, mode fallback rules, provider/mode flags, sponsorship, default chain modes, supported chains, and RPC guidance, read [references/account-abstraction.md](references/account-abstraction.md).

## Reference: Configuration

### Flags And Env Vars

All config can be passed as flags. Flags override environment variables.

| Flag            | Default                | Purpose                                                   |
| --------------- | ---------------------- | --------------------------------------------------------- |
| `--backend-url` | `https://api.aomi.dev` | Backend URL                                               |
| `--app`         | `default`              | Backend app                                               |
| `--model`       | backend default        | Session model                                             |
| `--new-session` | off                    | Create a fresh active session for this command            |
| `--public-key`  | none                   | Wallet address for chat/session context                   |
| `--rpc-url`     | chain RPC default      | RPC override for signing                                  |
| `--chain`       | none                   | Active wallet chain (inherits session chain if unset)     |
| `--eoa`         | off                    | Force plain EOA, skip AA even if configured (sign-only)   |
| `--aa`          | off                    | Force AA, error if provider not configured (sign-only)    |
| `--aa-provider` | auto-detect            | AA provider override: `alchemy` \| `pimlico` (sign-only)  |
| `--aa-mode`     | chain default          | AA mode override: `4337` \| `7702` (sign-only)            |

The aomi CLI also resolves credentials on its own from the user's environment. The skill treats this as opaque — it does not read those values, echo them, set them, or ask the user to paste them into chat. If the CLI reports a missing credential, ask the user to configure it themselves and re-run.

### Storage

| Env Var           | Default   | Purpose                                |
| ----------------- | --------- | -------------------------------------- |
| `AOMI_STATE_DIR`  | `~/.aomi` | Root directory for local session state |
| `AOMI_CONFIG_DIR` | `~/.aomi` | Root directory for persistent config   |

Storage layout by default:

- `~/.aomi/sessions/` stores per-session JSON files.
- `~/.aomi/active-session.txt` stores the active local session pointer.

AA configuration is supplied per-invocation via flags or environment variables (no persistent `aa.json` file).

### Important Config Rules

- Signing keys must be 0x-prefixed hex. Configuring them is a user action, not a skill action.
- The default signing RPC is one URL. For chain switching, pass `--rpc-url` on `aomi tx sign` with a chain-matching public RPC.
- If the user switches from Ethereum to Polygon, Arbitrum, Base, Optimism, or Sepolia, use a chain-matching RPC for signing.
- `--aa-provider` and `--aa-mode` cannot be used with `--eoa`.
- In auto-detect mode, the CLI falls back to a zero-config AA path when no provider is configured on the user's side — signing still works without any user-supplied credentials.

## Reference: Examples

For four canonical end-to-end flow examples — **approve + swap, lending, bridging, staking** — read [references/examples.md](references/examples.md). For per-app first-turn examples (Khalani, 0x, Polymarket, Binance, Neynar), see [references/apps.md](references/apps.md#usage-examples).

Quick read-only sanity check:

```bash
aomi chat "what is the price of ETH?" --verbose
aomi session log
```

## Troubleshooting

When a command fails unexpectedly (no response, AA error, RPC `401`/`429`, simulation revert, `stateful: false`), read [references/troubleshooting.md](references/troubleshooting.md).
