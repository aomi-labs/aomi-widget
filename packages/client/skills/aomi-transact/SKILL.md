---
name: aomi-transact
description: >
  Interact with aomi AI transaction builder via CLI. Use when the user asks to
  swap tokens, send transactions, check token prices, sign transactions, manage
  wallet operations, or interact with DeFi protocols on-chain. Aomi's runtime
  builds generic EVM transactions with speed and security natively on Ethereum
  light client. Handles multi-step workflows: chat with the agent, review pending
  transactions, sign and broadcast, then verify results. Supports account
  abstraction (ERC-4337, EIP-7702) with Alchemy and Pimlico providers.
compatibility: "Requires @aomi-labs/client (`npm install -g @aomi-labs/client`). CLI executable is `aomi`. Requires viem for signing (`npm install viem`). Set PRIVATE_KEY and CHAIN_RPC_URL env vars for transaction signing."
license: MIT
allowed-tools: Bash
metadata:
  author: aomi-labs
  version: "0.2"
---

# Aomi On-Chain Agent

Build and execute EVM transactions through a conversational AI agent.

## Preflight

On first use in a session, check the user's state:

```bash
echo "PRIVATE_KEY=${PRIVATE_KEY:+set}${PRIVATE_KEY:-unset} CHAIN_RPC_URL=${CHAIN_RPC_URL:-unset}"; aomi status 2>/dev/null || echo "no session"
```

Key rules:
- If `PRIVATE_KEY` is set in env, do NOT also pass `--private-key` (flag overrides env -> wrong wallet).
- `--public-key` must match the address derived from the signing key. Mismatch = agent builds txs for wrong wallet.
- Private keys must start with `0x`. Add the prefix if missing.

## Core Workflow

The aomi CLI is **not** a long-running process. Each command starts, runs, and
exits. Conversation history lives on the backend. Local state (session ID,
pending/signed txs) is persisted to `~/.aomi/sessions/`.

The typical flow is:

1. **Chat** -- send a message, the agent responds (and may queue transactions)
2. **Review** -- list pending transactions
3. **Sign** -- sign and broadcast a pending transaction
4. **Verify** -- check signed transactions or continue chatting

## Commands

### Chat with the agent

```bash
aomi chat "<message>"
aomi chat "<message>" --verbose        # stream tool calls + responses live
aomi chat "<message>" --model <rig>    # use a specific model
```

Always quote the message. Use `--verbose` (or `-v`) to see real-time tool calls,
agent reasoning, and intermediate results.

If the agent builds a transaction, it prints a wallet request notice:

```
Wallet request queued: tx-1
   to:    0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD
   value: 1000000000000000000
   chain: 1
Run `aomi tx` to see pending transactions, `aomi sign <id>` to sign.
```

### Connect a wallet

Pass `--public-key` on the first chat so the agent knows the user's wallet
address. It is persisted -- subsequent commands in the same session don't need it.

```bash
aomi chat "swap 1 ETH for USDC" --public-key 0xYourAddress
```

### List transactions

```bash
aomi tx
```

Shows pending (unsigned) and signed (completed) transactions with IDs, targets,
values, and timestamps.

### Sign a transaction

```bash
aomi sign <tx-id> [<tx-id> ...] --private-key <hex-key> --rpc-url <rpc-url>
```

Signs one or more pending transactions, broadcasts on-chain, and notifies the
backend. Supports regular transactions and EIP-712 typed data signatures (e.g.
CoW Protocol orders, permit approvals).

By default, signing uses **account abstraction** (AA). To force plain EOA
execution, pass `--eoa`. See the Account Abstraction section below for details.

### App management

```bash
aomi app list              # list available apps
aomi app current           # show the current app
```

Apps scope sessions to different agent configurations on the backend.
The default app is `"default"`. Use `--app` to select one:

```bash
aomi chat "swap 1 ETH for USDC" --app defi
```

Or set via environment variable:

```bash
export AOMI_APP=defi
aomi chat "what tokens can I swap?"
```

Each app can have its own model configuration, tools, and behavior. Use
`--api-key` when connecting to apps that require authentication.

### Model management

```bash
aomi model list            # list available models from the backend
aomi model current         # show the active model (or "default backend model")
aomi model set <rig>       # set the model for the current session
```

The model can also be set per-message with `aomi chat --model <rig> "<message>"`.

### Chain management

```bash
aomi chain list            # list supported chains with AA mode info
```

### View conversation log

```bash
aomi log
```

Replays all messages with timestamps, tool results, and agent responses.

### Session management

```bash
aomi status                       # session info (ID, message count, pending/signed tx counts)
aomi events                       # system events from the backend
aomi session list                 # list all local sessions with metadata
aomi session resume <id>          # resume a session (session-id or session-N or N)
aomi session delete <id>          # delete a local session file
aomi close                        # wipe local state, start fresh on next chat
```

Sessions are stored in `~/.aomi/sessions/`. Each session gets a local ID
(`session-1`, `session-2`, ...) for quick reference. You can resume or delete
sessions by local ID, e.g. `aomi session resume 2`.

## Account Abstraction

The CLI supports account abstraction (AA) for transaction signing, enabling
smart account features like gas sponsorship and batched transactions.

### Execution modes

| Flag | Description |
|------|-------------|
| `--aa` | Use account abstraction (default) |
| `--eoa` | Force plain EOA execution -- direct wallet signing, no smart account |

### AA providers

Two providers are supported:

| Provider | Flag | Env Variable | Features |
|----------|------|-------------|----------|
| **Alchemy** | `--aa-provider alchemy` | `ALCHEMY_API_KEY` | Gas sponsorship (optional), ERC-4337, EIP-7702 |
| **Pimlico** | `--aa-provider pimlico` | `PIMLICO_API_KEY` | ERC-4337, EIP-7702 |

The provider is auto-detected from environment variables if not specified.

### AA modes

| Mode | Flag | Description |
|------|------|-------------|
| **ERC-4337** | `--aa-mode 4337` | Traditional smart account via bundler |
| **EIP-7702** | `--aa-mode 7702` | Delegated execution with authorization |

The default mode is chain-specific (e.g. Ethereum defaults to 7702, L2s default
to 4337).

### Gas sponsorship (Alchemy)

Set a gas policy ID to enable sponsored (gasless) transactions:

```bash
export ALCHEMY_API_KEY=your-key
export ALCHEMY_GAS_POLICY_ID=your-policy-id
aomi sign tx-1
```

If sponsorship limits are hit, the CLI automatically falls back to user-funded gas.

### Signing examples

```bash
# AA with Alchemy (default if ALCHEMY_API_KEY is set)
aomi sign tx-1

# AA with Pimlico, ERC-4337 mode
aomi sign tx-1 --aa-provider pimlico --aa-mode 4337

# Batch sign multiple transactions
aomi sign tx-1 tx-2 tx-3

# Plain EOA -- no smart account
aomi sign tx-1 --eoa
```

### Supported chains

| Chain | ID | Default AA Mode |
|-------|----|-----------------|
| Ethereum | 1 | 7702 |
| Polygon | 137 | 4337 |
| Arbitrum | 42161 | 4337 |
| Base | 8453 | 4337 |
| Optimism | 10 | 4337 |
| Sepolia (testnet) | 11155111 | 4337 |

## Configuration

All config can be passed as flags (priority) or env vars (fallback):

| Flag | Env Variable | Default | Description |
|------|-------------|---------|-------------|
| `--backend-url` | `AOMI_BASE_URL` | `https://api.aomi.dev` | Backend URL |
| `--api-key` | `AOMI_API_KEY` | -- | API key for non-default apps |
| `--app` | `AOMI_APP` | `default` | App name |
| `--model` | `AOMI_MODEL` | -- | Model rig |
| `--public-key` | `AOMI_PUBLIC_KEY` | -- | Wallet address |
| `--private-key` | `PRIVATE_KEY` | -- | Hex private key (for `aomi sign`) |
| `--rpc-url` | `CHAIN_RPC_URL` | -- | RPC URL (for `aomi sign`) |
| `--aa-provider` | `AOMI_AA_PROVIDER` | auto | AA provider: `alchemy` or `pimlico` |
| `--aa-mode` | `AOMI_AA_MODE` | chain default | AA mode: `4337` or `7702` |

**Additional AA environment variables:**

| Env Variable | Description |
|-------------|-------------|
| `ALCHEMY_API_KEY` | Alchemy API key for AA |
| `ALCHEMY_GAS_POLICY_ID` | Alchemy gas sponsorship policy ID (optional) |
| `PIMLICO_API_KEY` | Pimlico API key for AA |
| `AOMI_STATE_DIR` | Session state directory (default: `~/.aomi`) |

## Important Behavior

- **Session continuity**: After the first `aomi chat`, the session ID is saved.
  All subsequent commands operate on the same conversation until `aomi close`.
- **Transaction IDs**: Each wallet request gets a unique ID (`tx-1`, `tx-2`, ...).
  Use the exact ID shown in `aomi tx` when signing.
- **EIP-712**: The agent may request typed data signatures (e.g. `kind: eip712_sign`)
  for gasless swaps or permit approvals. `aomi sign` handles both kinds automatically.
- **Non-blocking**: `aomi chat` exits as soon as the agent finishes responding or
  a wallet request arrives. It does not wait for signing.
- **Verbose mode**: Always use `--verbose` when you need to see what tools the
  agent is calling or debug unexpected behavior.
- **AA is default**: When signing, account abstraction is used by default. Pass
  `--eoa` to use plain EOA signing instead.
- **Batch signing**: You can sign multiple transactions at once:
  `aomi sign tx-1 tx-2 tx-3`. EIP-712 requests cannot be batched.

## Example: Full Swap Flow

```bash
# 1. Start a session with wallet connected
aomi chat "swap 1 ETH for USDC on Uniswap" \
  --public-key 0xYourAddress

# 2. Agent builds the tx -- check what's pending
aomi tx

# 3. Sign and broadcast (uses AA by default)
aomi sign tx-1 \
  --private-key 0xYourPrivateKey \
  --rpc-url https://eth.llamarpc.com

# 4. Verify
aomi tx          # should show tx-1 under "Signed" with hash
aomi log         # full conversation replay

# 5. Clean up when done
aomi close
```

## Example: AA with Gas Sponsorship

```bash
# Set up Alchemy AA with gas sponsorship
export ALCHEMY_API_KEY=your-alchemy-key
export ALCHEMY_GAS_POLICY_ID=your-policy-id
export PRIVATE_KEY=0xYourPrivateKey
export CHAIN_RPC_URL=https://eth.llamarpc.com

# Chat and sign -- gas is sponsored
aomi chat "swap 100 USDC for ETH" --public-key 0xYourAddress
aomi sign tx-1   # uses Alchemy AA with sponsored gas
```

## Error Handling

- If `aomi chat` returns "(no response)", the agent may still be processing.
  Wait a moment and run `aomi status` to check.
- If a transaction fails on-chain, the error message from the RPC is printed.
  Check the RPC URL, gas, and account balance.
- If AA signing fails, the CLI may fall back to EOA if fallback is enabled.
- Run `aomi close` to reset if the session gets into a bad state.
