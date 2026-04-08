---
name: aomi-transact
description: >
  Use when the user wants to interact with the Aomi CLI to inspect sessions,
  check balances or prices, build wallet requests, confirm quotes or routes,
  sign transactions or EIP-712 payloads, switch apps or chains, or execute
  swaps, transfers, and DeFi actions on-chain. Covers Aomi chat, transaction
  review, AA-first signing with automatic EOA fallback, session controls, and
  per-session secret ingestion.
compatibility: "Requires @aomi-labs/client (`npm install -g @aomi-labs/client`). CLI executable is `aomi`. Requires viem for signing (`npm install viem`). Use AOMI_APP / --app, AOMI_MODEL / --model, AOMI_CHAIN_ID / --chain, CHAIN_RPC_URL / --rpc-url, optional --secret NAME=value ingestion, and AOMI_STATE_DIR for local session storage."
license: MIT
allowed-tools: Bash
metadata:
  author: aomi-labs
  version: "0.5"
---

# Aomi Transact

Use the CLI as an agent operating procedure, not as a long-running shell.
Each `aomi` command starts, runs, and exits. Conversation history lives on the
backend. Local session data lives under `AOMI_STATE_DIR` or `~/.aomi`.

## Use This Skill When

- The user wants to chat with the Aomi agent from the terminal.
- The user wants balances, prices, routes, quotes, or transaction status.
- The user wants to build, confirm, sign, or broadcast wallet requests.
- The user wants to inspect or switch apps, models, chains, or sessions.
- The user wants to inject API keys or other backend secrets for the current session.

## Hard Rules

- Never print secrets verbatim in normal status, preflight, or confirmation output.
- Treat `PRIVATE_KEY`, `AOMI_API_KEY`, `ALCHEMY_API_KEY`, `PIMLICO_API_KEY`, and private RPC URLs as secrets.
- If the user provides a private key or API key, do not repeat it back unless they explicitly ask for that exact value to be reformatted.
- Prefer `aomi --secret NAME=value ...` over stuffing provider API keys into normal chat text.
- Do not sign anything unless the CLI has actually queued a wallet request and you can identify its `tx-N` ID.
- When starting work from a new Codex or assistant chat thread, default the first Aomi command to `--new-session` unless the user explicitly wants to continue an existing session.
- If `PRIVATE_KEY` is set in the environment, do not also pass `--private-key` unless you intentionally want to override the environment value.
- `--public-key` must match the address derived from the signing key. If they differ, `aomi sign` will update the session to the signer address.
- Private keys must start with `0x`. Add the prefix if missing.
- `CHAIN_RPC_URL` is only one default RPC URL. When switching chains, prefer passing `--rpc-url` on `aomi sign`.
- Switching the chat/session chain with `--chain` does not switch `CHAIN_RPC_URL`. The RPC used for `aomi sign` must match the pending transaction's chain.
- `--aa-provider` and `--aa-mode` are AA-only controls and cannot be used with `--eoa`.

## Quick Start

Run this once at the start of the session:

```bash
aomi --version
aomi status 2>/dev/null || echo "no session"
```

If the user is asking for a read-only result, that may be enough. If they want
to build or sign a transaction, continue with the workflow below.

## Default Workflow

1. Chat with the agent.
2. If the agent asks whether to proceed, send a short confirmation in the same session.
3. Review pending requests with `aomi tx`.
4. Sign the queued request.
5. Verify with `aomi tx`, `aomi log`, or `aomi status`.

The CLI output is the source of truth. If you do not see `Wallet request queued:
tx-N`, there is nothing to sign yet.

## Workflow Details

### Read-Only Requests

Use these when the user does not need signing:

```bash
aomi chat "<message>" --new-session
aomi chat "<message>" --verbose
aomi tx
aomi log
aomi status
aomi events
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

- Quote the chat message.
- On the first command in a new Codex or assistant thread, prefer `--new-session` so old local/backend state does not bleed into the new task.
- Use `--verbose` when debugging tool calls or streaming behavior.
- Pass `--public-key` on the first wallet-aware chat if the backend needs the user's address.
- For chain-specific requests, prefer `--chain <id>` on the command itself. Use `AOMI_CHAIN_ID=<id>` only when multiple consecutive commands should stay on the same chain.
- Use `aomi secret list` to inspect configured secret handles for the active session.
- `aomi close` wipes the active local session pointer and starts a fresh thread next time.

### Secret Ingestion

Use this when the backend or selected app needs API keys, provider tokens, or
other named secrets for the current session:

```bash
aomi --secret ALCHEMY_API_KEY=sk_live_123 --new-session
aomi --secret ALCHEMY_API_KEY=sk_live_123 chat "simulate a swap on Base" --new-session
aomi secret list
aomi secret clear
```

Important behavior:

- `aomi --secret NAME=value` with no command ingests secrets into the active session and exits.
- `aomi --secret NAME=value chat "..."` ingests first, then runs the command.
- `aomi secret list` prints secret handle names, not raw values.
- `aomi secret clear` removes all secrets for the active session.
- Do not combine `--secret` with `aomi secret clear`.

### Building Wallet Requests

Use the first chat turn to give the agent the task and, if relevant, the wallet
address and chain:

```bash
aomi chat "swap 1 ETH for USDC" --new-session --public-key 0xYourAddress --chain 1
```

If the user wants a different backend app or chain, pass them explicitly on the
next command:

```bash
aomi chat "show my balances" --app khalani
aomi chat "swap 1 POL for USDC on Polygon" --chain 137
aomi chat "swap 1 POL for USDC on Polygon" --app khalani --chain 137
```

Important behavior:

- A chat response does not always queue a transaction immediately.
- The agent may return a quote, route, timing estimate, or deposit method and ask whether to proceed.
- When that happens, keep the same session and reply with a short confirmation message.
- Only move to `aomi sign` after a wallet request is queued.
- For Khalani, prefer a `TRANSFER` deposit method when available. The intended flow is quote -> sign transfer -> submit/continue after the transfer settles.
- Avoid Khalani `CONTRACT_CALL` routes that require ERC-20 approval unless the user explicitly wants that path or no transfer route is available.

Queued request example:

```
⚡ Wallet request queued: tx-1
   to:    0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD
   value: 1000000000000000000
   chain: 1
Run `aomi tx` to see pending transactions, `aomi sign <id>` to sign.
```

### Signing Policy

Use these rules exactly:

- Default command: `aomi sign <tx-id> [<tx-id> ...]`
- Default behavior: try AA first, retry unsponsored AA when Alchemy sponsorship is unavailable, then fall back to EOA automatically if AA still fails.
- `--aa`: require AA with no EOA fallback.
- `--eoa`: force direct EOA execution.
- `--aa-provider` or `--aa-mode`: AA-specific controls. Use them only when the user explicitly wants a provider or mode.

Examples:

```bash
# Default: AA first, automatic EOA fallback if needed
aomi sign tx-1 --private-key 0xYourPrivateKey --rpc-url https://eth.llamarpc.com

# Require AA only
aomi sign tx-1 --aa --private-key 0xYourPrivateKey

# Force EOA only
aomi sign tx-1 --eoa --private-key 0xYourPrivateKey --rpc-url https://eth.llamarpc.com

# Explicit AA provider and mode
aomi sign tx-1 --aa-provider pimlico --aa-mode 4337 --private-key 0xYourPrivateKey
```

More signing notes:

- `aomi sign` handles both transaction requests and EIP-712 typed data signatures.
- Batch signing is supported for transaction requests only, not EIP-712 requests.
- A single `--rpc-url` override cannot be used for a mixed-chain multi-sign request.
- If the signer address differs from the stored session public key, the CLI updates the session to the signer address.
- The pending transaction already contains its target chain. Use a signing RPC for that same chain.
- If `CHAIN_RPC_URL` points to Ethereum but the pending transaction is on Polygon, Arbitrum, Base, Optimism, or Sepolia, override it with a matching `--rpc-url`.
- Prefer a reliable chain-specific RPC over generic public RPCs, which may return `401`, `429`, or generic parameter errors.
- If `ALCHEMY_API_KEY` is available, prefer constructing the matching chain-specific Alchemy RPC before trying generic public RPCs.
- If the available RPC looks unreliable, try at most one or two reasonable chain-specific public RPCs, then ask the user for a proper provider-backed RPC URL for that chain instead of continuing to guess.

### Session And Storage Notes

- Active session, app, model, chain, pending txs, and signed txs are stored locally under `AOMI_STATE_DIR` or `~/.aomi`.
- Session files live under `~/.aomi/sessions/` by default and get local IDs like `session-1`.
- Useful commands:

```bash
aomi session list
aomi session resume <id>
aomi session delete <id>
aomi close
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

### Transaction Inspection

```bash
aomi tx
aomi log
aomi status
aomi events
aomi secret list
aomi secret clear
```

- `aomi tx` inspects pending and signed requests.
- `aomi log` replays conversation and tool output.
- `aomi status` shows the current session summary.
- `aomi events` shows raw backend system events.
- `aomi secret list` shows configured secret handles for the active session.
- `aomi secret clear` removes all configured secrets for the active session.

### App And Model Commands

```bash
aomi app list
aomi app current
aomi model list
aomi model current
aomi model set <rig>
```

- `aomi app list` shows available backend apps.
- `aomi app current` shows the active app from local session state.
- `aomi model set <rig>` persists the selected model for the current session.
- `aomi chat --model <rig> "<message>"` also applies a model for the session.

### Chain Commands

```bash
aomi chain list
```

### Session Commands

```bash
aomi session list
aomi session new
aomi session resume <id>
aomi session delete <id>
aomi close
```

- Session selectors accept the backend session ID, `session-N`, or `N`.
- `aomi close` clears the active local session pointer. The next chat starts fresh.

## Reference: Account Abstraction

### Signing Modes

- Default `aomi sign ...`: try AA first, retry unsponsored Alchemy AA when sponsorship is unavailable, then fall back to EOA automatically.
- `aomi sign ... --aa`: require AA only. Do not fall back to EOA.
- `aomi sign ... --eoa`: force direct EOA signing.

### AA Providers

| Provider | Flag                    | Env Var           | Notes                            |
| -------- | ----------------------- | ----------------- | -------------------------------- |
| Alchemy  | `--aa-provider alchemy` | `ALCHEMY_API_KEY` | Supports sponsorship, 4337, 7702 |
| Pimlico  | `--aa-provider pimlico` | `PIMLICO_API_KEY` | Supports 4337 and 7702           |

Provider selection rules:

- If the user explicitly selects a provider, use it.
- In default mode, the CLI prefers the first configured AA provider.
- If no AA provider is configured, default mode uses EOA directly.

### AA Modes

| Mode   | Flag             | Meaning                          |
| ------ | ---------------- | -------------------------------- |
| `4337` | `--aa-mode 4337` | Bundler-based smart account flow |
| `7702` | `--aa-mode 7702` | Delegated execution flow         |

### Default Chain Modes

| Chain    | ID    | Default AA Mode |
| -------- | ----- | --------------- |
| Ethereum | 1     | 7702            |
| Polygon  | 137   | 4337            |
| Arbitrum | 42161 | 4337            |
| Base     | 8453  | 4337            |
| Optimism | 10    | 4337            |

### Sponsorship

Alchemy sponsorship is optional.

```bash
export ALCHEMY_API_KEY=your-key
export ALCHEMY_GAS_POLICY_ID=your-policy-id
aomi sign tx-1
```

Default signing behavior for Alchemy:

1. Try sponsored AA.
2. If sponsorship is unavailable, retry AA with user-funded gas.
3. If AA still fails and the mode is default auto mode, fall back to EOA.

### Supported Chains

| Chain        | ID       |
| ------------ | -------- |
| Ethereum     | 1        |
| Polygon      | 137      |
| Arbitrum One | 42161    |
| Base         | 8453     |
| Optimism     | 10       |
| Sepolia      | 11155111 |

### RPC Guidance By Chain

Use an RPC that matches the pending transaction's chain:

- Ethereum txs -> Ethereum RPC
- Polygon txs -> Polygon RPC
- Arbitrum txs -> Arbitrum RPC
- Base txs -> Base RPC
- Optimism txs -> Optimism RPC
- Sepolia txs -> Sepolia RPC

Practical rule:

- `--chain` affects the wallet/session context for chat and request building.
- `--rpc-url` affects where `aomi sign` estimates and submits the transaction.
- Treat them as separate controls and keep them aligned with the transaction you are signing.

## Reference: Configuration

### Flags And Env Vars

All config can be passed as flags. Flags override environment variables.

| Flag            | Env Var            | Default                | Purpose                                 |
| --------------- | ------------------ | ---------------------- | --------------------------------------- |
| `--backend-url` | `AOMI_BASE_URL`    | `https://api.aomi.dev` | Backend URL                             |
| `--api-key`     | `AOMI_API_KEY`     | none                   | API key for non-default apps            |
| `--app`         | `AOMI_APP`         | `default`              | Backend app                             |
| `--model`       | `AOMI_MODEL`       | backend default        | Session model                           |
| `--public-key`  | `AOMI_PUBLIC_KEY`  | none                   | Wallet address for chat/session context |
| `--private-key` | `PRIVATE_KEY`      | none                   | Signing key for `aomi sign`             |
| `--rpc-url`     | `CHAIN_RPC_URL`    | chain RPC default      | RPC override for signing                |
| `--chain`       | `AOMI_CHAIN_ID`    | `1`                    | Active wallet chain                     |
| `--aa-provider` | `AOMI_AA_PROVIDER` | auto                   | AA provider override                    |
| `--aa-mode`     | `AOMI_AA_MODE`     | chain default          | AA mode override                        |

### AA Provider Credentials

| Env Var                 | Purpose                             |
| ----------------------- | ----------------------------------- |
| `ALCHEMY_API_KEY`       | Enables Alchemy AA                  |
| `ALCHEMY_GAS_POLICY_ID` | Optional Alchemy sponsorship policy |
| `PIMLICO_API_KEY`       | Enables Pimlico AA                  |

`ALCHEMY_API_KEY` can also be used to construct chain-specific signing RPCs:

| Chain    | Example Alchemy RPC                                          |
| -------- | ------------------------------------------------------------ |
| Ethereum | `https://eth-mainnet.g.alchemy.com/v2/<ALCHEMY_API_KEY>`     |
| Polygon  | `https://polygon-mainnet.g.alchemy.com/v2/<ALCHEMY_API_KEY>` |
| Arbitrum | `https://arb-mainnet.g.alchemy.com/v2/<ALCHEMY_API_KEY>`     |
| Base     | `https://base-mainnet.g.alchemy.com/v2/<ALCHEMY_API_KEY>`    |
| Optimism | `https://opt-mainnet.g.alchemy.com/v2/<ALCHEMY_API_KEY>`     |
| Sepolia  | `https://eth-sepolia.g.alchemy.com/v2/<ALCHEMY_API_KEY>`     |

### Storage

| Env Var          | Default   | Purpose                                |
| ---------------- | --------- | -------------------------------------- |
| `AOMI_STATE_DIR` | `~/.aomi` | Root directory for local session state |

Storage layout by default:

- `~/.aomi/sessions/` stores per-session JSON files.
- `~/.aomi/active-session.txt` stores the active local session pointer.

### Important Config Rules

- `PRIVATE_KEY` should start with `0x`.
- If `PRIVATE_KEY` is already set in the environment, do not also pass `--private-key` unless you intentionally want to override it.
- `CHAIN_RPC_URL` is only one default RPC URL. For chain switching, prefer passing `--rpc-url` on `aomi sign`.
- If the user switches from Ethereum to Polygon, Arbitrum, Base, Optimism, or Sepolia, do not keep using an Ethereum `CHAIN_RPC_URL` for signing.
- `--aa-provider` and `--aa-mode` cannot be used with `--eoa`.
- In default signing mode, missing AA credentials cause the CLI to use EOA directly.

## Reference: Examples

### Read-Only Chat

```bash
aomi chat "what is the price of ETH?" --verbose
aomi log
```

### Basic Swap Flow

```bash
# 1. Start a wallet-aware session on Ethereum
aomi chat "swap 1 ETH for USDC on Uniswap" \
  --public-key 0xYourAddress \
  --chain 1

# 2. If the agent only returns a quote, confirm in the same session
aomi chat "proceed"

# 3. Review the queued request
aomi tx

# 4. Sign with default behavior: AA first, then automatic EOA fallback if needed
aomi sign tx-1 \
  --private-key 0xYourPrivateKey \
  --rpc-url https://eth.llamarpc.com

# 5. Verify
aomi tx
aomi log
```

### Explicit EOA Flow

```bash
aomi sign tx-1 \
  --eoa \
  --private-key 0xYourPrivateKey \
  --rpc-url https://eth.llamarpc.com
```

### Explicit AA Flow

```bash
aomi sign tx-1 \
  --aa \
  --aa-provider pimlico \
  --aa-mode 4337 \
  --private-key 0xYourPrivateKey
```

### Alchemy Sponsorship Flow

```bash
export ALCHEMY_API_KEY=your-alchemy-key
export ALCHEMY_GAS_POLICY_ID=your-policy-id
export PRIVATE_KEY=0xYourPrivateKey
export CHAIN_RPC_URL=https://eth.llamarpc.com

aomi chat "swap 100 USDC for ETH" --public-key 0xYourAddress --chain 1
aomi sign tx-1
```

### Switching App And Chain

```bash
aomi chat "show my balances" --app khalani
aomi chat "swap 1 POL for USDC on Polygon" --app khalani --chain 137
aomi tx
```

### Khalani Transfer Flow

```bash
# 1. Ask for a quote and prefer a transfer-based deposit route
aomi chat "swap 0.1 USDC for WETH using Khalani. Prefer a TRANSFER deposit method over CONTRACT_CALL if available." --app khalani --chain 1

# 2. If the agent asks for confirmation, confirm in the same session
aomi chat "proceed with the transfer route"

# 3. Review the queued transfer request
aomi tx

# 4. Sign the transfer
aomi sign tx-1 --private-key 0xYourPrivateKey --rpc-url https://eth.llamarpc.com

# 5. Continue with the agent if a submit/finalize step is required
aomi chat "the transfer has been sent, continue"
```

### Cross-Chain RPC Example

```bash
# Build the request on Polygon
aomi chat "swap 0.1 USDC for WETH using Khalani on Polygon" --app khalani --chain 137
aomi tx

# Sign with a Polygon RPC, even if CHAIN_RPC_URL is still set to Ethereum
aomi sign tx-8 --rpc-url https://polygon.drpc.org --chain 137
```

### Session Control

```bash
aomi session list
aomi session resume 2
aomi status
aomi close
```

## Troubleshooting

- If `aomi chat` returns `(no response)`, wait briefly and run `aomi status`.
- If signing fails in default mode, the CLI may already retry with unsponsored AA and then EOA. Read the console output before retrying manually.
- If AA is required and fails, check `ALCHEMY_API_KEY` or `PIMLICO_API_KEY`, the selected chain, and any requested `--aa-mode`.
- If a transaction fails on-chain, check the RPC URL, balance, and chain.
- `401`, `429`, and generic parameter errors during `aomi sign` are often RPC problems rather than transaction-construction problems. Try a reliable RPC for the correct chain.
- If `ALCHEMY_API_KEY` is set, construct the correct chain-specific Alchemy RPC before falling back to random public endpoints.
- If one or two public RPCs fail for the same chain, stop rotating through random endpoints and ask the user for a proper RPC URL for that chain.
