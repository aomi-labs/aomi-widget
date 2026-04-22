---
name: aomi-transact
description: >
  Drive the Aomi CLI to chat with the Aomi agent, inspect sessions, simulate
  pending wallet requests on a forked chain, and sign queued transactions or
  EIP-712 payloads with account-abstraction-first execution. The skill only
  invokes the `aomi` CLI; it does not run arbitrary shell commands.
compatibility: "Requires @aomi-labs/client (`npm install -g @aomi-labs/client`). CLI executable is `aomi`. Configuration is via the aomi CLI's own flags and environment variables — see `aomi --help` for the full list."

license: MIT
allowed-tools: Bash(aomi:*)
metadata:
  author: aomi-labs
  version: "0.8"
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
- The user wants to inject API keys or other backend secrets for the current session.
- The user wants to configure or inspect Account Abstraction settings.

## Hard Rules

- Never echo user-supplied secret values back into chat output.
- Provider credentials belong in the shell environment or in aomi's session secret store (`aomi secret add NAME=value`). Do not pass them as command-line flags.
- Only call `aomi tx sign` after `aomi tx list` shows a pending `tx-N` the user asked for.
- When starting a new assistant thread, default the first aomi command to `--new-session` unless the user wants to continue an existing session.
- The signing RPC must match the pending transaction's chain. `--chain` (session context) and `--rpc-url` (signing transport) are independent — keep them aligned.
- `--aa-provider` and `--aa-mode` are AA-only controls and cannot be used with `--eoa`.

## Security Model

This skill is narrowly scoped: `allowed-tools: Bash(aomi:*)` restricts it to invoking the `aomi` CLI only. It cannot run arbitrary shell commands, install software, read files outside the aomi state directory, or execute code it generates.

- **Secrets flow through aomi, not argv.** The CLI reads credentials from the shell environment or from its own session-scoped secret store. This skill never constructs shell command lines that embed secret values.
- **No blind signing.** Multi-step flows (approve → swap, approve → deposit) go through `aomi tx simulate` on a forked chain before `aomi tx sign`. Single-step read operations do not require simulation.
- **User-directed batches only.** `aomi tx sign` can take multiple ids; that is for batches the user has reviewed, not for sweeping a queue.
- **Read-only by default.** Chat, simulation, session inspection, and app/model/chain introspection do not move funds. Signing is a separate, explicit step the user must ask for.

## Command Structure

The CLI now has two entry shapes:

- **Root chat mode** aligned with the Rust backend CLI:
  - `aomi` starts the interactive REPL.
  - `aomi --prompt "<message>"` sends one prompt and exits.
  - The REPL supports `/heap`, `/app <name>`, `/model <rig>|list|show`, `/key <provider:key>|show|clear`, and `:exit`.
- **Operator subcommands** for durable session and wallet workflows:
  - `aomi <resource> <action>`

```
aomi --prompt "<message>"          Send one prompt and exit
aomi                               Start the interactive REPL
aomi chat <message>                 Send a message
aomi tx list                        List pending/signed transactions
aomi tx simulate <id>...            Simulate a batch
aomi tx sign <id>...                Sign and submit
aomi session list|new|resume|delete|status|log|events|close
aomi model list|set|current
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

Use this when the backend or selected app needs API keys, provider tokens, or
other named secrets for the current session:

```bash
aomi secret add ALCHEMY_API_KEY=sk_live_123 --new-session
aomi chat "simulate a swap on Base" --new-session
aomi secret list
aomi secret clear
aomi secret add NAME=value [NAME=value ...]
```

Important behavior:

- `aomi secret add NAME=value [NAME=value ...]` ingests one or more secrets into the active session.
- `aomi secret list` prints secret handle names, not raw values.
- `aomi secret clear` removes all secrets for the active session.

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
- Only move to `aomi tx sign` after a wallet request is queued.
- For Khalani, prefer a `TRANSFER` deposit method when available. The intended flow is quote -> sign transfer -> submit/continue after the transfer settles.
- Avoid Khalani `CONTRACT_CALL` routes that require ERC-20 approval unless the user explicitly wants that path or no transfer route is available.

Queued request example:

```
⚡ Wallet request queued: tx-1
   to:    0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD
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

Examples (export secrets once per shell, then invoke):

```bash
export PRIVATE_KEY=0xYourPrivateKey
export CHAIN_RPC_URL=https://eth.llamarpc.com

# Default: auto-detect. AA if configured, EOA if not.
aomi tx sign tx-1

# Force EOA only
aomi tx sign tx-1 --eoa

# Explicit AA provider and mode (credentials still come from env)
aomi tx sign tx-1 --aa-provider pimlico --aa-mode 4337
```

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

Simulation and signing workflow:

```bash
# 1. Build the request
aomi chat "approve and swap 100 USDC for ETH on Uniswap" \
  --public-key 0xYourAddress --chain 1

# 2. Check what got queued
aomi tx list

# 3. Simulate the batch
aomi tx simulate tx-1 tx-2

# 4. If simulation succeeds, sign (credentials from env)
export PRIVATE_KEY=0xYourPrivateKey
export CHAIN_RPC_URL=https://eth.llamarpc.com
aomi tx sign tx-1 tx-2

# 5. Verify
aomi tx list
```

### Account Abstraction

AA is the preferred signing path when the user wants smart-account behavior,
gas sponsorship, or the CLI's automated fallback handling.

Use AA when:

- The user wants the most hands-off signing flow and is fine with the CLI trying AA before EOA.
- The user wants sponsored or user-funded smart-account execution through Alchemy or Pimlico.
- The user explicitly asks for `4337` or `7702` account-abstraction mode.

How to choose:

- `aomi tx sign` with no AA flags: try AA first, then fall back to EOA automatically if AA is unavailable.
- `aomi tx sign --aa`: require AA only. Use this when the user does not want an EOA fallback.
- `aomi tx sign --eoa`: bypass AA entirely and sign directly with the wallet key.
- `aomi tx sign --aa-provider alchemy|pimlico`: force a specific AA provider.
- `aomi tx sign --aa-mode 4337|7702`: force the execution mode when the user wants a specific AA path.

More signing notes:

- `aomi tx sign` handles both transaction requests and EIP-712 typed data signatures.
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
aomi secret list
aomi secret clear
aomi secret add NAME=value [NAME=value ...]
```

- `aomi secret list` shows configured secret handles for the active session.
- `aomi secret clear` removes all configured secrets for the active session.
- `aomi secret add` ingests one or more NAME=value secrets.

### Batch Simulation

```bash
aomi tx simulate <tx-id> [<tx-id> ...]
```

- Runs pending transactions sequentially on a forked chain (Anvil snapshot/revert).
- Each tx sees state changes from previous txs — validates state-dependent flows like approve → swap.
- Returns per-step success/failure, revert reasons, and `gas_used`.
- Returns `total_gas` for the entire batch.
- No on-chain state is modified — the fork is reverted after simulation.
- Requires pending transactions to exist in the session (`aomi tx list` to check).

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

### Discovering Available Apps

The set of installed apps is dynamic. Use the CLI to enumerate what is available
in the current environment:

```bash
aomi app list       # enumerate apps exposed by the backend
aomi app current    # show the currently active app
```

Select an app for a chat turn with `--app <name>` or the `AOMI_APP` environment
variable. When an app needs provider credentials, the aomi CLI reports the exact
variable names at runtime; the user supplies them via `aomi secret add`. This
skill does not hard-code any specific credential name.

### Currently Integrated Apps

All apps share a common base toolset (`send_transaction_to_wallet`,
`encode_and_simulate`, `get_account_info`, `get_contract_abi`, etc.). The tools
listed below are the app-specific additions. For the exact credential variable
names any given app expects, run `aomi app list` and `aomi secret add` — the CLI
is the source of truth.

| App | Description | App-Specific Tools | Credentials |
|-----|-------------|-------------------|-------------|
| `default` | General-purpose on-chain agent with web search | `brave_search` | None |
| `binance` | Binance CEX — prices, order book, klines | `binance_get_price`, `binance_get_depth`, `binance_get_klines` | Exchange credentials |
| `bybit` | Bybit CEX — orders, positions, leverage | `brave_search` (no Bybit-specific tools yet) | Exchange credentials |
| `cow` | CoW Protocol — MEV-protected swaps via batch auctions | `get_cow_swap_quote`, `place_cow_order`, `get_cow_order`, `get_cow_order_status`, `get_cow_user_orders` | None |
| `defillama` | DefiLlama — TVL, yields, volumes, stablecoins | `get_token_price`, `get_yield_opportunities`, `get_defi_protocols`, `get_chain_tvl`, `get_protocol_detail`, `get_dex_volumes`, `get_fees_overview`, `get_protocol_fees`, `get_stablecoins`, `get_stablecoin_chains`, `get_historical_token_price`, `get_token_price_change`, `get_historical_chain_tvl`, `get_dex_protocol_volume`, `get_stablecoin_history`, `get_yield_pool_history` | None |
| `dune` | Dune Analytics — execute and fetch SQL queries | `execute_query`, `get_execution_status`, `get_execution_results`, `get_query_results` | Provider token |
| `dydx` | dYdX perpetuals — markets, orderbook, candles, trades | `dydx_get_markets`, `dydx_get_orderbook`, `dydx_get_candles`, `dydx_get_trades`, `dydx_get_account` | None |
| `gmx` | GMX perpetuals — markets, positions, orders, prices | `get_gmx_prices`, `get_gmx_signed_prices`, `get_gmx_markets`, `get_gmx_positions`, `get_gmx_orders` | None |
| `hyperliquid` | Hyperliquid perps — mid prices, orderbook | `get_meta`, `get_all_mids` | None |
| `kaito` | Kaito — crypto social search, trending, mindshare | `kaito_search`, `kaito_get_trending`, `kaito_get_mindshare` | Provider token |
| `kalshi` | Kalshi prediction markets via Simmer SDK | `simmer_register`, `simmer_status`, `simmer_briefing` | SDK token |
| `khalani` | Khalani cross-chain intents — quote, build, submit | `get_khalani_quote`, `build_khalani_order`, `submit_khalani_order`, `get_khalani_order_status`, `get_khalani_orders_by_address` | None |
| `lifi` | LI.FI aggregator — cross-chain swaps & bridges | `get_lifi_swap_quote`, `place_lifi_order`, `get_lifi_bridge_quote`, `get_lifi_transfer_status`, `get_lifi_chains` | Optional provider token |
| `manifold` | Manifold prediction markets — search, bet, create | `list_markets`, `get_market`, `get_market_positions`, `search_markets`, `place_bet`, `create_market` | Provider token |
| `molinar` | Molinar on-chain world — move, explore, chat | `molinar_get_state`, `molinar_look`, `molinar_move`, `molinar_jump`, `molinar_chat`, `molinar_get_chat`, `molinar_get_new_messages`, `molinar_get_players`, `molinar_collect_coins`, `molinar_explore`, `molinar_create_object`, `molinar_customize`, `molinar_ping` | None |
| `morpho` | Morpho lending — markets, vaults, positions | `get_markets`, `get_vaults`, `get_user_positions` | None |
| `neynar` | Farcaster social — users, search | `get_user_by_username`, `search_users` | Provider token |
| `okx` | OKX CEX — tickers, order book, candles | `okx_get_tickers`, `okx_get_order_book`, `okx_get_candles` | Exchange credentials |
| `oneinch` | 1inch DEX aggregator — quotes, swaps, allowances | `get_oneinch_quote`, `get_oneinch_swap`, `get_oneinch_approve_transaction`, `get_oneinch_allowance`, `get_oneinch_liquidity_sources` | Provider token |
| `polymarket` | Polymarket prediction markets — search, trade, CLOB | `search_polymarket`, `get_polymarket_details`, `get_polymarket_trades`, `resolve_polymarket_trade_intent`, `build_polymarket_order_preview` | None |
| `x` | X/Twitter — users, posts, search, trends | `get_x_user`, `get_x_user_posts`, `search_x`, `get_x_trends`, `get_x_post` | Provider token |
| `yearn` | Yearn Finance — vault discovery, details | `get_all_vaults`, `get_vault_detail`, `get_blacklisted_vaults` | None |
| `zerox` | 0x DEX aggregator — swaps, quotes, liquidity | `get_zerox_swap_quote`, `place_zerox_order`, `get_zerox_swap_chains`, `get_zerox_allowance_holder_price`, `get_zerox_liquidity_sources` | Provider token |

When a "Credentials" entry says *Exchange credentials*, *Provider token*, or *SDK token*, run `aomi secret add` without arguments or consult `aomi app list` — the CLI reports the exact variable names that particular app expects. The skill does not reproduce those names inline.

To build a new app from an API spec or SDK, use the companion skill
**aomi-build**.

### Chain Commands

```bash
aomi chain list
```

## Reference: Account Abstraction

### Execution Model

The CLI uses **auto-detect** by default:

| AA configured? | Flag | Result |
|---|---|---|
| Yes | (none) | **AA automatically** (preferred mode → alternative mode fallback) |
| Yes | `--aa-provider`/`--aa-mode` | AA with explicit settings |
| Yes | `--eoa` | EOA, skip AA |
| No | (none) | EOA |
| No | `--aa-provider` | Error: "AA requires provider credentials" |

There is **no silent EOA fallback**. If AA is selected (explicitly or by auto-detect) and both AA modes fail, the CLI returns a hard error suggesting `--eoa`.

### Mode Fallback

When using AA, the CLI tries modes in order:

1. Try preferred mode (default: 7702 for Ethereum, 4337 for L2s).
2. If preferred mode fails, try the alternative mode (7702 ↔ 4337).
3. If both modes fail, return error with suggestion: use `--eoa` to sign without AA.

### AA Configuration

AA is configured per-invocation via flags or environment variables. There is
no persistent AA config file — export the relevant env vars in your shell, or
pass `--aa-*` flags directly on `aomi tx sign`.

Priority chain for AA resolution: **flag > env var > defaults**.

### AA Providers

| Provider | Flag                    | Env Var           | Notes                            |
| -------- | ----------------------- | ----------------- | -------------------------------- |
| Alchemy  | `--aa-provider alchemy` | `ALCHEMY_API_KEY` | 4337 (sponsored via gas policy), 7702 (EOA pays gas) |
| Pimlico  | `--aa-provider pimlico` | `PIMLICO_API_KEY` | 4337 (sponsored via dashboard policy). Direct private key supported. |

Provider selection rules:

- If the user explicitly selects a provider via flag, use it.
- In auto-detect mode, the CLI uses the first configured AA provider (whichever env var is set).
- If no AA provider is configured, auto-detect uses EOA directly.

### AA Modes

| Mode   | Flag             | Meaning                          | Gas |
| ------ | ---------------- | -------------------------------- | --- |
| `4337` | `--aa-mode 4337` | Bundler + paymaster UserOperation via smart account. Gas sponsored by paymaster. | Paymaster pays |
| `7702` | `--aa-mode 7702` | Native EIP-7702 type-4 transaction with delegation. EOA signs authorization + sends tx to self. | EOA pays |

Important: **7702 requires the signing EOA to have native gas tokens** (ETH, MATIC, etc.). There is no paymaster/sponsorship for 7702. Use 4337 for gasless execution.

### Default Chain Modes

| Chain    | ID    | Default AA Mode |
| -------- | ----- | --------------- |
| Ethereum | 1     | 7702            |
| Polygon  | 137   | 4337            |
| Arbitrum | 42161 | 4337            |
| Base     | 8453  | 4337            |
| Optimism | 10    | 4337            |

### Sponsorship

Sponsorship is available for **4337 mode only**. 7702 does not support sponsorship.

**Alchemy** (optional gas policy):

```bash
export ALCHEMY_API_KEY=your-key
export ALCHEMY_GAS_POLICY_ID=your-policy-id
aomi tx sign tx-1
```

**Pimlico** (sponsorship via dashboard policy):

```bash
export PIMLICO_API_KEY=your-key
aomi tx sign tx-1 --aa-provider pimlico --aa-mode 4337
```

Pimlico sponsorship is configured on the Pimlico dashboard (sponsorship policies). The API key automatically picks up the active policy — no separate policy ID env var needed.

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
- `--rpc-url` affects where `aomi tx sign` estimates and submits the transaction.
- Treat them as separate controls and keep them aligned with the transaction you are signing.

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

The aomi CLI also reads credentials from the shell environment — see `aomi --help` for the full list. Skill authors and agents should treat those names as opaque: set them in the shell, let the CLI read them, never echo their values.

### AA Provider Credentials

Account-abstraction signing requires provider credentials in the environment. The CLI supports Alchemy (4337 + 7702) and Pimlico (4337 sponsored). Exact variable names are documented by `aomi --help` and the aomi CLI itself; this skill does not hard-code them.

When constructing a signing RPC URL from an Alchemy credential, use the chain-specific Alchemy host pattern (one URL per chain). Treat the full URL as a secret and never log it.

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

- Signing keys must start with `0x`. Add the prefix if missing before setting the env var.
- The default signing RPC is one URL. For chain switching, prefer `--rpc-url` on `aomi tx sign` or export the chain-matching RPC before signing.
- If the user switches from Ethereum to Polygon, Arbitrum, Base, Optimism, or Sepolia, use a chain-matching RPC for signing.
- `--aa-provider` and `--aa-mode` cannot be used with `--eoa`.
- In auto-detect mode, missing AA credentials cause the CLI to use EOA directly (no error).

## Reference: Examples

### Read-Only Chat

```bash
aomi chat "what is the price of ETH?" --verbose
aomi session log
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
aomi tx list

# 4. Sign — auto-detects AA if configured, otherwise uses EOA
export PRIVATE_KEY=0xYourPrivateKey
export CHAIN_RPC_URL=https://eth.llamarpc.com
aomi tx sign tx-1

# 5. Verify
aomi tx list
aomi session log
```

### Approve + Swap With Simulation

```bash
# 1. Build a multi-step request
aomi chat "approve and swap 500 USDC for ETH on Uniswap" \
  --public-key 0xYourAddress --chain 1

# 2. Check queued requests
aomi tx list

# 3. Simulate the batch — approve then swap
aomi tx simulate tx-1 tx-2

# 4. If simulation passes, sign the batch
export PRIVATE_KEY=0xYourPrivateKey
export CHAIN_RPC_URL=https://eth.llamarpc.com
aomi tx sign tx-1 tx-2

# 5. Verify
aomi tx list
```

### Explicit EOA Flow

```bash
export PRIVATE_KEY=0xYourPrivateKey
export CHAIN_RPC_URL=https://eth.llamarpc.com
aomi tx sign tx-1 --eoa
```

### Explicit AA Flow

```bash
export PRIVATE_KEY=0xYourPrivateKey
export PIMLICO_API_KEY=your-pimlico-key
aomi tx sign tx-1 --aa-provider pimlico --aa-mode 4337
```

### AA Setup With Environment Variables

```bash
# Export once per shell — auto-detected by `aomi tx sign`
export ALCHEMY_API_KEY=your-alchemy-key
export ALCHEMY_GAS_POLICY_ID=your-gas-policy-id
export PRIVATE_KEY=0xYourPrivateKey

# All subsequent signs auto-use AA — no flags, no argv-exposed keys
aomi tx sign tx-1
```

### Alchemy Sponsorship Flow

```bash
export ALCHEMY_API_KEY=your-alchemy-key
export ALCHEMY_GAS_POLICY_ID=your-policy-id
export PRIVATE_KEY=0xYourPrivateKey
export CHAIN_RPC_URL=https://eth.llamarpc.com

aomi chat "swap 100 USDC for ETH" --public-key 0xYourAddress --chain 1
aomi tx sign tx-1
```

### Switching App And Chain

```bash
aomi chat "show my balances" --app khalani
aomi chat "swap 1 POL for USDC on Polygon" --app khalani --chain 137
aomi tx list
```

### Khalani Transfer Flow

```bash
# 1. Ask for a quote and prefer a transfer-based deposit route
aomi chat "swap 0.1 USDC for WETH using Khalani. Prefer a TRANSFER deposit method over CONTRACT_CALL if available." --app khalani --chain 1

# 2. If the agent asks for confirmation, confirm in the same session
aomi chat "proceed with the transfer route"

# 3. Review the queued transfer request
aomi tx list

# 4. Sign the transfer (credentials from env)
export PRIVATE_KEY=0xYourPrivateKey
export CHAIN_RPC_URL=https://eth.llamarpc.com
aomi tx sign tx-1

# 5. Continue with the agent if a submit/finalize step is required
aomi chat "the transfer has been sent, continue"
```

### Cross-Chain RPC Example

```bash
# Build the request on Polygon
aomi chat "swap 0.1 USDC for WETH using Khalani on Polygon" --app khalani --chain 137
aomi tx list

# Sign with a Polygon RPC, even if CHAIN_RPC_URL is still set to Ethereum.
# PRIVATE_KEY must already be exported; --rpc-url override is fine
# because a public RPC is not a secret (unlike provider-keyed URLs).
aomi tx sign tx-8 --rpc-url https://polygon.drpc.org --chain 137
```

### Session Control

```bash
aomi session list
aomi session resume 2
aomi session status
aomi session close
```

## Troubleshooting

- If `aomi chat` returns `(no response)`, wait briefly and run `aomi session status`.
- If AA signing fails, the CLI tries the alternative AA mode automatically. If both modes fail, it returns an error suggesting `--eoa`. Read the console output before retrying manually.
- If AA is required and fails, check `ALCHEMY_API_KEY` or `PIMLICO_API_KEY`, the selected chain, and any requested `--aa-mode`.
- If a transaction fails on-chain, check the RPC URL, balance, and chain.
- `401`, `429`, and generic parameter errors during `aomi tx sign` are often RPC problems rather than transaction-construction problems. Try a reliable RPC for the correct chain.
- If `ALCHEMY_API_KEY` is set, construct the correct chain-specific Alchemy RPC before falling back to random public endpoints.
- If one or two public RPCs fail for the same chain, stop rotating through random endpoints and ask the user for a proper RPC URL for that chain.
- If `aomi tx simulate` fails with a revert, read the revert reason. Common causes: expired quote or timestamp (re-chat to get a fresh quote), insufficient token balance, or missing prior approval. Do not sign transactions that failed simulation without understanding why.
- If `aomi tx simulate` returns `stateful: false`, the backend could not fork the chain — simulation ran each tx independently via `eth_call`, so state-dependent flows (approve → swap) may show false negatives. Retry or check that the backend's Anvil instance is running.
