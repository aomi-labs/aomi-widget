# Apps Reference

Read this when:

- The user asks "what apps are available?" or names a category (CEX, lending, perps, prediction, social).
- You need to pick `--app` for a request and want to see the catalog.
- You need a usage example for a specific app.

## Discovering Apps

The set of installed apps is dynamic — the catalog below is a snapshot. Always confirm against the live CLI:

```bash
aomi app list       # enumerate apps exposed by the backend
aomi app current    # show the currently active app
```

Select an app for a chat turn with `--app <name>` or set `AOMI_APP=<name>` for a multi-command shell. When an app needs provider credentials, the aomi CLI reports at runtime what is missing. The user configures those credentials themselves; the skill does not perform that setup unless the user explicitly asks (see SKILL.md "Secret Ingestion").

## App Catalog

All apps share a common base toolset (`send_transaction_to_wallet`, `encode_and_simulate`, `get_account_info`, `get_contract_abi`, etc.). The tools listed below are the app-specific additions. The "Credentials" column indicates whether an app needs user-configured credentials at all; the CLI reports the specific names at runtime when something is missing.

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

When a "Credentials" entry says *Exchange credentials*, *Provider token*, or *SDK token*, ask the user to configure that app's credentials in their own terminal (or — only if they explicitly ask — run `aomi secret add` with the value they supply).

To build a new app from an API spec or SDK, use the companion skill **aomi-build**.

## Usage Examples

Each example shows the canonical first chat turn for that category. Follow the standard workflow afterwards: `aomi tx list` → (`aomi tx simulate` for multi-step) → `aomi tx sign`.

### Solver Networks — `khalani`

Cross-chain intents executed by a solver network. Prefer transfer-based deposit routes when offered.

```bash
# Single-chain intent
aomi chat "swap 0.1 USDC for WETH using Khalani. Prefer a TRANSFER deposit method over CONTRACT_CALL if available." \
  --app khalani --chain 1 --new-session

# Cross-chain intent — request and target chains differ
aomi chat "bridge 50 USDC from Polygon to Base using Khalani" \
  --app khalani --chain 137

# Inspect open orders for an address
aomi chat "list my open Khalani orders" --app khalani
```

Notes:

- The agent typically returns a quote first. Confirm with a short `aomi chat "proceed"` in the same session before a wallet request is queued.
- Avoid `CONTRACT_CALL` routes that require ERC-20 approval unless the user explicitly wants that path or no transfer route is available.
- If a submit/finalize step is required after the transfer settles, the agent will prompt for it — continue the conversation in the same session.

### Cross-Chain — `zerox`

0x aggregator for swaps and cross-chain liquidity. Good for "best-price" single-chain swaps and for swaps spanning chains where 0x has coverage.

```bash
# Best-price swap on Base
aomi chat "best price to swap 1 ETH for USDC on Base via 0x" \
  --app zerox --chain 8453 --new-session

# Cross-chain swap — let the aggregator pick the route
aomi chat "swap 100 USDC on Arbitrum for ETH on Optimism via 0x" \
  --app zerox

# List supported chains
aomi chat "which chains does 0x support today?" --app zerox
```

Notes:

- `zerox` requires a provider token. If `aomi tx sign` fails because credentials are missing, ask the user to configure their 0x credentials (do not invent or paste them on the user's behalf).
- For approve-and-swap on a single chain, simulate the batch with `aomi tx simulate tx-1 tx-2` before signing.

### Prediction Markets — `polymarket`

Search markets, inspect details, and build trade previews on Polymarket's CLOB.

```bash
# Find a market
aomi chat "find the most active Polymarket markets about the next US election" \
  --app polymarket --new-session

# Get a market's details and recent trades
aomi chat "show me details and recent trades for market <slug-or-id>" \
  --app polymarket

# Build a buy preview (does not place the order until you confirm)
aomi chat "build a YES buy preview for $25 on market <slug-or-id>" \
  --app polymarket
```

Notes:

- `build_polymarket_order_preview` returns an unsigned order for review. `aomi tx list` and `aomi tx sign` apply only once the user confirms and the agent queues a wallet request.
- `resolve_polymarket_trade_intent` is useful when the user describes a trade in plain English — the agent maps it to a concrete market + side + size before the preview step.

### CEX — `binance`

Read-only market data from Binance. No on-chain signing involved.

```bash
# Spot price snapshot
aomi chat "what is BTCUSDT trading at on Binance?" \
  --app binance --new-session

# Top-of-book depth
aomi chat "show me top 5 levels of the ETHUSDT order book on Binance" \
  --app binance

# Recent klines
aomi chat "1h klines for SOLUSDT for the last 24 hours from Binance" \
  --app binance
```

Notes:

- `binance` needs Exchange credentials. The skill never invents these. If `aomi chat` fails because credentials are missing, ask the user to configure them on their side.
- This is a data app — no `tx-N` will be queued from these commands. `aomi tx list` is not part of this flow.

### Social — `neynar`

Farcaster user lookup and search via Neynar.

```bash
# Look up a user
aomi chat "look up the Farcaster user 'dwr.eth' via Neynar" \
  --app neynar --new-session

# Search by handle
aomi chat "search Farcaster for users matching 'aomi'" --app neynar
```

Notes:

- `neynar` requires a provider token. Same rule as the other token-gated apps: ask the user to configure it.
- Like `binance`, this is a read-only data app — no wallet requests are queued.
