---
name: aomi-transact
description: >
  Use when the user wants to interact with the Aomi CLI to inspect sessions,
  check balances or prices, build wallet requests, confirm quotes or routes,
  sign transactions or EIP-712 payloads, switch apps or chains, or execute
  swaps, transfers, and DeFi actions on-chain. Covers Aomi chat, transaction
  review, AA-first signing with mode fallback, persistent AA configuration,
  session controls, and per-session secret ingestion.
compatibility: "Requires @aomi-labs/client (`npm install -g @aomi-labs/client`). CLI executable is `aomi`. Requires viem for signing (`npm install viem`). Use AOMI_APP / --app, AOMI_MODEL / --model, AOMI_CHAIN_ID / --chain, CHAIN_RPC_URL / --rpc-url, `aomi secret add` for session secret ingestion, and AOMI_STATE_DIR for local session storage."

license: MIT
allowed-tools: Bash
metadata:
  author: aomi-labs
  version: "0.6"
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

- Never print secrets verbatim in normal status, preflight, or confirmation output.
- Treat `PRIVATE_KEY`, `AOMI_API_KEY`, `ALCHEMY_API_KEY`, `PIMLICO_API_KEY`, and private RPC URLs as secrets.
- If the user provides a private key or API key, do not repeat it back unless they explicitly ask for that exact value to be reformatted.
- Prefer `aomi secret add NAME=value` over stuffing provider API keys into normal chat text.
- Do not sign anything unless the CLI has actually queued a wallet request and you can identify its `tx-N` ID.
- When starting work from a new Codex or assistant chat thread, default the first Aomi command to `--new-session` unless the user explicitly wants to continue an existing session.
- If `PRIVATE_KEY` is set in the environment, do not also pass `--private-key` unless you intentionally want to override the environment value.
- `--public-key` must match the address derived from the signing key. If they differ, `aomi tx sign` will update the session to the signer address.
- Private keys must start with `0x`. Add the prefix if missing.
- `CHAIN_RPC_URL` is only one default RPC URL. When switching chains, prefer passing `--rpc-url` on `aomi tx sign`.
- Switching the chat/session chain with `--chain` does not switch `CHAIN_RPC_URL`. The RPC used for `aomi tx sign` must match the pending transaction's chain.
- `--aa-provider` and `--aa-mode` are AA-only controls and cannot be used with `--eoa`.

## Command Structure

All commands follow a **noun-verb** pattern: `aomi <resource> <action>`.
There are no top-level aliases — use the full noun-verb form.

```
aomi chat <message>                 Send a message
aomi tx list                        List pending/signed transactions
aomi tx simulate <id>...            Simulate a batch
aomi tx sign <id>...                Sign and submit
aomi session list|new|resume|delete|status|log|events|close
aomi model list|set|current
aomi app list|current
aomi chain list
aomi secret list|clear|add
aomi aa status|set|test|reset
```

## Quick Start

Run this once at the start of the session:

```bash
aomi --version
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
- Default behavior (**auto-detect**): if an AA provider is configured (env vars, `~/.aomi/aa.json`, or flags), use AA automatically. If no AA provider is configured, use EOA. There is no silent fallback — AA either works or fails.
- **Mode fallback**: when AA is used, the CLI tries the preferred mode (default 7702). If it fails, it tries the alternative mode (4337). If both fail, it returns an error suggesting `--eoa`.
- `--eoa`: force direct EOA execution, skip AA entirely.
- `--aa-provider` or `--aa-mode`: AA-specific controls that also force AA mode. Cannot be used with `--eoa`.

Examples:

```bash
# Default: auto-detect. AA if configured, EOA if not.
aomi tx sign tx-1 --private-key 0xYourPrivateKey --rpc-url https://eth.llamarpc.com

# Force EOA only
aomi tx sign tx-1 --eoa --private-key 0xYourPrivateKey --rpc-url https://eth.llamarpc.com

# Explicit AA provider and mode
aomi tx sign tx-1 --aa-provider pimlico --aa-mode 4337 --private-key 0xYourPrivateKey
```

### Batch Simulation

Use `aomi simulate` to dry-run pending transactions before signing. Simulation
runs each tx sequentially on a forked chain so state-dependent flows (approve →
swap) are validated as a batch — the swap sees the approve's state changes.

```bash
# Simulate a single pending tx
aomi simulate tx-1

# Simulate a multi-step batch in order (approve then swap)
aomi simulate tx-1 tx-2
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
- If there are no pending transactions (`aomi tx` shows nothing).

Simulation and signing workflow:

```bash
# 1. Build the request
aomi chat "approve and swap 100 USDC for ETH on Uniswap" \
  --public-key 0xYourAddress --chain 1

# 2. Check what got queued
aomi tx

# 3. Simulate the batch
aomi simulate tx-1 tx-2

# 4. If simulation succeeds, sign
aomi sign tx-1 tx-2 --private-key 0xYourPrivateKey --rpc-url https://eth.llamarpc.com

# 5. Verify
aomi tx
```

### Account Abstraction

AA is the preferred signing path when the user wants smart-account behavior,
gas sponsorship, or the CLI's automated fallback handling.

Use AA when:

- The user wants the most hands-off signing flow and is fine with the CLI trying AA before EOA.
- The user wants sponsored or user-funded smart-account execution through Alchemy or Pimlico.
- The user explicitly asks for `4337` or `7702` account-abstraction mode.

How to choose:

- `aomi sign` with no AA flags: try AA first, then fall back to EOA automatically if AA is unavailable.
- `aomi sign --aa`: require AA only. Use this when the user does not want an EOA fallback.
- `aomi sign --eoa`: bypass AA entirely and sign directly with the wallet key.
- `aomi sign --aa-provider alchemy|pimlico`: force a specific AA provider.
- `aomi sign --aa-mode 4337|7702`: force the execution mode when the user wants a specific AA path.

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
aomi simulate <tx-id> [<tx-id> ...]
```

- Runs pending transactions sequentially on a forked chain (Anvil snapshot/revert).
- Each tx sees state changes from previous txs — validates state-dependent flows like approve → swap.
- Returns per-step success/failure, revert reasons, and `gas_used`.
- Returns `total_gas` for the entire batch.
- No on-chain state is modified — the fork is reverted after simulation.
- Requires pending transactions to exist in the session (`aomi tx` to check).

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

### Currently Integrated Apps

All apps share a common base toolset (`send_transaction_to_wallet`,
`encode_and_simulate`, `get_account_info`, `get_contract_abi`, etc.).
The tools listed below are the app-specific additions.

| App | Description | App-Specific Tools | Needs API Key |
|-----|-------------|-------------------|---------------|
| `default` | General-purpose on-chain agent with web search | `brave_search` | No |
| `binance` | Binance CEX — prices, order book, klines | `binance_get_price`, `binance_get_depth`, `binance_get_klines` | Yes (`BINANCE_API_KEY`, `BINANCE_SECRET_KEY`) |
| `bybit` | Bybit CEX — orders, positions, leverage | `brave_search` (no Bybit-specific tools yet) | Yes (`BYBIT_API_KEY`, `BYBIT_SECRET_KEY`) |
| `cow` | CoW Protocol — MEV-protected swaps via batch auctions | `get_cow_swap_quote`, `place_cow_order`, `get_cow_order`, `get_cow_order_status`, `get_cow_user_orders` | No |
| `defillama` | DefiLlama — TVL, yields, volumes, stablecoins | `get_token_price`, `get_yield_opportunities`, `get_defi_protocols`, `get_chain_tvl`, `get_protocol_detail`, `get_dex_volumes`, `get_fees_overview`, `get_protocol_fees`, `get_stablecoins`, `get_stablecoin_chains`, `get_historical_token_price`, `get_token_price_change`, `get_historical_chain_tvl`, `get_dex_protocol_volume`, `get_stablecoin_history`, `get_yield_pool_history` | No |
| `dune` | Dune Analytics — execute and fetch SQL queries | `execute_query`, `get_execution_status`, `get_execution_results`, `get_query_results` | Yes (`DUNE_API_KEY`) |
| `dydx` | dYdX perpetuals — markets, orderbook, candles, trades | `dydx_get_markets`, `dydx_get_orderbook`, `dydx_get_candles`, `dydx_get_trades`, `dydx_get_account` | No |
| `gmx` | GMX perpetuals — markets, positions, orders, prices | `get_gmx_prices`, `get_gmx_signed_prices`, `get_gmx_markets`, `get_gmx_positions`, `get_gmx_orders` | No |
| `hyperliquid` | Hyperliquid perps — mid prices, orderbook | `get_meta`, `get_all_mids` | No |
| `kaito` | Kaito — crypto social search, trending, mindshare | `kaito_search`, `kaito_get_trending`, `kaito_get_mindshare` | Yes (`KAITO_API_KEY`) |
| `kalshi` | Kalshi prediction markets via Simmer SDK | `simmer_register`, `simmer_status`, `simmer_briefing` | Yes (`SIMMER_API_KEY`) |
| `khalani` | Khalani cross-chain intents — quote, build, submit | `get_khalani_quote`, `build_khalani_order`, `submit_khalani_order`, `get_khalani_order_status`, `get_khalani_orders_by_address` | No |
| `lifi` | LI.FI aggregator — cross-chain swaps & bridges | `get_lifi_swap_quote`, `place_lifi_order`, `get_lifi_bridge_quote`, `get_lifi_transfer_status`, `get_lifi_chains` | No (optional `LIFI_API_KEY`) |
| `manifold` | Manifold prediction markets — search, bet, create | `list_markets`, `get_market`, `get_market_positions`, `search_markets`, `place_bet`, `create_market` | Yes (`MANIFOLD_API_KEY`) |
| `molinar` | Molinar on-chain world — move, explore, chat | `molinar_get_state`, `molinar_look`, `molinar_move`, `molinar_jump`, `molinar_chat`, `molinar_get_chat`, `molinar_get_new_messages`, `molinar_get_players`, `molinar_collect_coins`, `molinar_explore`, `molinar_create_object`, `molinar_customize`, `molinar_ping` | No |
| `morpho` | Morpho lending — markets, vaults, positions | `get_markets`, `get_vaults`, `get_user_positions` | No |
| `neynar` | Farcaster social — users, search | `get_user_by_username`, `search_users` | Yes (`NEYNAR_API_KEY`) |
| `okx` | OKX CEX — tickers, order book, candles | `okx_get_tickers`, `okx_get_order_book`, `okx_get_candles` | Yes (`OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE`) |
| `oneinch` | 1inch DEX aggregator — quotes, swaps, allowances | `get_oneinch_quote`, `get_oneinch_swap`, `get_oneinch_approve_transaction`, `get_oneinch_allowance`, `get_oneinch_liquidity_sources` | Yes (`ONEINCH_API_KEY`) |
| `polymarket` | Polymarket prediction markets — search, trade, CLOB | `search_polymarket`, `get_polymarket_details`, `get_polymarket_trades`, `resolve_polymarket_trade_intent`, `build_polymarket_order_preview` | No |
| `x` | X/Twitter — users, posts, search, trends | `get_x_user`, `get_x_user_posts`, `search_x`, `get_x_trends`, `get_x_post` | Yes (`X_API_KEY`) |
| `yearn` | Yearn Finance — vault discovery, details | `get_all_vaults`, `get_vault_detail`, `get_blacklisted_vaults` | No |
| `zerox` | 0x DEX aggregator — swaps, quotes, liquidity | `get_zerox_swap_quote`, `place_zerox_order`, `get_zerox_swap_chains`, `get_zerox_allowance_holder_price`, `get_zerox_liquidity_sources` | Yes (`ZEROX_API_KEY`) |

Some apps require API keys via `aomi secret add` (e.g. CEX apps need exchange credentials).
Use `--app <name>` or `AOMI_APP=<name>` to select an app.

To build a new app or update an existing one from an API spec, SDK, or product
docs, use the companion skill **aomi-build** (install with
`npx skills add aomi-labs/skills`). It scaffolds Aomi SDK crates with `lib.rs`,
`client.rs`, and `tool.rs` from OpenAPI specs, REST endpoints, or repository
examples.

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

### Persistent AA Configuration

AA settings can be persisted to `~/.aomi/aa.json` using the `aomi aa` commands,
eliminating the need to pass env vars or flags on every sign.

```bash
# Configure AA provider and credentials
aomi aa set provider alchemy
aomi aa set key <your-alchemy-key>
aomi aa set alchemy-key <your-alchemy-key>    # provider-specific key
aomi aa set pimlico-key <your-pimlico-key>     # provider-specific key
aomi aa set policy <gas-policy-id>
aomi aa set mode 7702
aomi aa set fallback eoa

# View resolved config (all layers merged)
aomi aa status

# Validate setup against a chain
aomi aa test --chain 8453

# Clear all persisted config
aomi aa reset
```

Priority chain for AA resolution: **flag > env var > `~/.aomi/aa.json` > defaults**.

### AA Providers

| Provider | Flag                    | Env Var           | Persistent Config         | Notes                            |
| -------- | ----------------------- | ----------------- | ------------------------- | -------------------------------- |
| Alchemy  | `--aa-provider alchemy` | `ALCHEMY_API_KEY` | `aomi aa set provider alchemy` | Supports sponsorship, 4337, 7702 |
| Pimlico  | `--aa-provider pimlico` | `PIMLICO_API_KEY` | `aomi aa set provider pimlico` | Supports 4337 and 7702           |

Provider selection rules:

- If the user explicitly selects a provider (flag or persistent config), use it.
- In auto-detect mode, the CLI uses the first configured AA provider.
- If no AA provider is configured, auto-detect uses EOA directly.

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
aomi tx sign tx-1
```

Or use persistent config:

```bash
aomi aa set provider alchemy
aomi aa set key your-key
aomi aa set policy your-policy-id
aomi tx sign tx-1
```

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
Environment variables override persistent config (`~/.aomi/aa.json`).

| Flag            | Env Var            | Default                | Purpose                                 |
| --------------- | ------------------ | ---------------------- | --------------------------------------- |
| `--backend-url` | `AOMI_BACKEND_URL` | `https://api.aomi.dev` | Backend URL                             |
| `--api-key`     | `AOMI_API_KEY`     | none                   | API key for non-default apps            |
| `--app`         | `AOMI_APP`         | `default`              | Backend app                             |
| `--model`       | `AOMI_MODEL`       | backend default        | Session model                           |
| `--public-key`  | `AOMI_PUBLIC_KEY`  | none                   | Wallet address for chat/session context |
| `--private-key` | `PRIVATE_KEY`      | none                   | Signing key for `aomi tx sign`          |
| `--rpc-url`     | `CHAIN_RPC_URL`    | chain RPC default      | RPC override for signing                |
| `--chain`       | `AOMI_CHAIN_ID`    | `1`                    | Active wallet chain                     |
| `--aa-provider` | `AOMI_AA_PROVIDER` | auto-detect            | AA provider override                    |
| `--aa-mode`     | `AOMI_AA_MODE`     | chain default          | AA mode override                        |

### AA Provider Credentials

| Env Var                  | Purpose                             |
| ------------------------ | ----------------------------------- |
| `ALCHEMY_API_KEY`        | Enables Alchemy AA                  |
| `ALCHEMY_GAS_POLICY_ID`  | Optional Alchemy sponsorship policy |
| `PIMLICO_API_KEY`        | Enables Pimlico AA                  |

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

| Env Var           | Default   | Purpose                                |
| ----------------- | --------- | -------------------------------------- |
| `AOMI_STATE_DIR`  | `~/.aomi` | Root directory for local session state |
| `AOMI_CONFIG_DIR` | `~/.aomi` | Root directory for persistent config   |

Storage layout by default:

- `~/.aomi/sessions/` stores per-session JSON files.
- `~/.aomi/active-session.txt` stores the active local session pointer.
- `~/.aomi/aa.json` stores persistent AA configuration.

### Important Config Rules

- `PRIVATE_KEY` should start with `0x`.
- If `PRIVATE_KEY` is already set in the environment, do not also pass `--private-key` unless you intentionally want to override it.
- `CHAIN_RPC_URL` is only one default RPC URL. For chain switching, prefer passing `--rpc-url` on `aomi tx sign`.
- If the user switches from Ethereum to Polygon, Arbitrum, Base, Optimism, or Sepolia, do not keep using an Ethereum `CHAIN_RPC_URL` for signing.
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
aomi tx sign tx-1 \
  --private-key 0xYourPrivateKey \
  --rpc-url https://eth.llamarpc.com

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
aomi tx

# 3. Simulate the batch — approve then swap
aomi simulate tx-1 tx-2

# 4. If simulation passes, sign the batch
aomi sign tx-1 tx-2 \
  --private-key 0xYourPrivateKey \
  --rpc-url https://eth.llamarpc.com

# 5. Verify
aomi tx
```

### Explicit EOA Flow

```bash
aomi tx sign tx-1 \
  --eoa \
  --private-key 0xYourPrivateKey \
  --rpc-url https://eth.llamarpc.com
```

### Explicit AA Flow

```bash
aomi tx sign tx-1 \
  --aa-provider pimlico \
  --aa-mode 4337 \
  --private-key 0xYourPrivateKey
```

### AA Setup With Persistent Config

```bash
# One-time setup
aomi aa set provider alchemy
aomi aa set key your-alchemy-key
aomi aa set policy your-gas-policy-id
aomi aa status

# Now all signs auto-use AA — no flags needed
aomi tx sign tx-1 --private-key 0xYourPrivateKey
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

# 4. Sign the transfer
aomi tx sign tx-1 --private-key 0xYourPrivateKey --rpc-url https://eth.llamarpc.com

# 5. Continue with the agent if a submit/finalize step is required
aomi chat "the transfer has been sent, continue"
```

### Cross-Chain RPC Example

```bash
# Build the request on Polygon
aomi chat "swap 0.1 USDC for WETH using Khalani on Polygon" --app khalani --chain 137
aomi tx list

# Sign with a Polygon RPC, even if CHAIN_RPC_URL is still set to Ethereum
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
- If AA is required and fails, check `ALCHEMY_API_KEY` or `PIMLICO_API_KEY`, the selected chain, and any requested `--aa-mode`. Use `aomi aa status` to see the resolved AA config.
- If a transaction fails on-chain, check the RPC URL, balance, and chain.
- `401`, `429`, and generic parameter errors during `aomi tx sign` are often RPC problems rather than transaction-construction problems. Try a reliable RPC for the correct chain.
- If `ALCHEMY_API_KEY` is set, construct the correct chain-specific Alchemy RPC before falling back to random public endpoints.
- If one or two public RPCs fail for the same chain, stop rotating through random endpoints and ask the user for a proper RPC URL for that chain.
- Use `aomi aa test --chain <id>` to validate AA setup for a specific chain before signing.
- If `aomi simulate` fails with a revert, read the revert reason. Common causes: expired quote or timestamp (re-chat to get a fresh quote), insufficient token balance, or missing prior approval. Do not sign transactions that failed simulation without understanding why.
- If `aomi simulate` returns `stateful: false`, the backend could not fork the chain — simulation ran each tx independently via `eth_call`, so state-dependent flows (approve → swap) may show false negatives. Retry or check that the backend's Anvil instance is running.
