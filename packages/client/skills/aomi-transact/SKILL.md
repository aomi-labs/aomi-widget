---
name: aomi-transact
description: >
  Interact with aomi AI transaction builder via CLI. Use when the user asks to
  swap tokens, send transactions, check token prices, sign transactions, manage
  wallet operations, or interact with DeFi protocols on-chain. Aomi's runtime
  builds generic EVM transactions with speed and security natively on Ethereum
  light client. Handles multi-step workflows: chat with the agent, review pending
  transactions, sign and broadcast, then verify results.
compatibility: "Requires @aomi-labs/client (`npm install -g @aomi-labs/client`). CLI executable is `aomi`. Requires viem for signing (`npm install viem`). Set PRIVATE_KEY and CHAIN_RPC_URL env vars for transaction signing."
license: MIT
allowed-tools: Bash
metadata:
  author: aomi-labs
  version: "0.1"
---

# Aomi On-Chain Agent

Build and execute EVM transactions through a conversational AI agent.

## Preflight

On first use in a session, check the user's state:

```bash
echo "PRIVATE_KEY=${PRIVATE_KEY:+set}${PRIVATE_KEY:-unset} CHAIN_RPC_URL=${CHAIN_RPC_URL:-unset}"; aomi status 2>/dev/null || echo "no session"
```

Key rules:
- If `PRIVATE_KEY` is set in env, do NOT also pass `--private-key` (flag overrides env → wrong wallet).
- `--public-key` must match the address derived from the signing key. Mismatch = agent builds txs for wrong wallet.
- Private keys must start with `0x`. Add the prefix if missing.

## Core Workflow

The aomi CLI is **not** a long-running process. Each command starts, runs, and
exits. Conversation history lives on the backend. Local state (session ID,
pending/signed txs) is persisted to `$TMPDIR/aomi-session.json`.

The typical flow is:

1. **Chat** — send a message, the agent responds (and may queue transactions)
2. **Review** — list pending transactions
3. **Sign** — sign and broadcast a pending transaction
4. **Verify** — check signed transactions or continue chatting

## Commands

### Chat with the agent

```bash
aomi chat "<message>"
aomi chat "<message>" --verbose        # stream tool calls + responses live
```

Always quote the message. Use `--verbose` (or `-v`) to see real-time tool calls,
agent reasoning, and intermediate results.

If the agent builds a transaction, it prints a wallet request notice:

```
⚡ Wallet request queued: tx-1
   to:    0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD
   value: 1000000000000000000
   chain: 1
Run `aomi tx` to see pending transactions, `aomi sign <id>` to sign.
```

### Connect a wallet

Pass `--public-key` on the first chat so the agent knows the user's wallet
address. It is persisted — subsequent commands in the same session don't need it.

```bash
aomi chat "swap 1 ETH for USDC" --public-key 0xYourAddress --chain 1
```

### List transactions

```bash
aomi tx
```

Shows pending (unsigned) and signed (completed) transactions with IDs, targets,
values, and timestamps.

### Sign a transaction

```bash
aomi sign <tx-id> --private-key <hex-key> --rpc-url <rpc-url>
```

Signs the pending transaction, broadcasts it on-chain, and notifies the backend.
Supports both regular transactions and EIP-712 typed data signatures (e.g. for
CoW Protocol orders, permit approvals).

### View conversation log

```bash
aomi log
```

Replays all messages with timestamps, tool results, and agent responses.

### Session management

```bash
aomi status    # session info (ID, message count, pending/signed tx counts)
aomi events    # system events from the backend
aomi close     # wipe local state, start fresh on next chat
```

## Configuration

All config can be passed as flags (priority) or env vars (fallback):

| Flag | Env Variable | Default | Description |
|------|-------------|---------|-------------|
| `--backend-url` | `AOMI_BASE_URL` | `https://api.aomi.dev` | Backend URL |
| `--api-key` | `AOMI_API_KEY` | — | API key for non-default namespaces |
| `--namespace` | `AOMI_NAMESPACE` | `default` | Namespace |
| `--public-key` | `AOMI_PUBLIC_KEY` | — | Wallet address |
| `--private-key` | `PRIVATE_KEY` | — | Hex private key (for `aomi sign`) |
| `--rpc-url` | `CHAIN_RPC_URL` | — | RPC URL (for `aomi sign`) |
| `--chain` | `AOMI_CHAIN_ID` | `1` | Chain ID (1, 137, 42161, 8453, 10, 11155111) |

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

## Example: Full Swap Flow

```bash
# 1. Start a session with wallet connected
aomi chat "swap 1 ETH for USDC on Uniswap" \
  --public-key 0xYourAddress \
  --chain 1

# 2. Agent builds the tx — check what's pending
aomi tx

# 3. Sign and broadcast
aomi sign tx-1 \
  --private-key 0xYourPrivateKey \
  --rpc-url https://eth.llamarpc.com

# 4. Verify
aomi tx          # should show tx-1 under "Signed" with hash
aomi log         # full conversation replay

# 5. Clean up when done
aomi close
```

## Error Handling

- If `aomi chat` returns "(no response)", the agent may still be processing.
  Wait a moment and run `aomi status` to check.
- If a transaction fails on-chain, the error message from the RPC is printed.
  Check the RPC URL, gas, and account balance.
- Run `aomi close` to reset if the session gets into a bad state.
