# Flow Examples

Read this when:

- The user asks for a concrete end-to-end example of a DeFi operation.
- You're constructing a new flow and want a template to pattern-match against.

Each example shows the full lifecycle: **chat → list → simulate (if multi-step) → sign → verify**. Substitute apps and chains as appropriate; the structural shape stays the same.

> **Stub status.** These examples are skeletons that capture the *shape* of each flow, not specific protocol contracts. Adjust the protocol/app per the user's request — the simulate-then-sign pattern is what matters.

## 1. Approve + Swap

The canonical state-dependent multi-step flow: an ERC-20 approval followed by a swap that consumes that allowance. **Always simulate before signing** — the swap will revert if submitted independently.

```bash
# 1. Build a multi-step request. The agent should queue both the approve and the swap.
aomi chat "approve and swap 500 USDC for ETH on 1inch" \
  --app oneinch --chain 1 --public-key 0xUserAddress --new-session

# 2. Confirm the agent queued two requests
aomi tx list
# expected: tx-1 (approve USDC), tx-2 (swap on 1inch)

# 3. Simulate the batch — tx-2 sees tx-1's allowance change
aomi tx simulate tx-1 tx-2
# expected: Batch success: true, Stateful: true

# 4. Sign the batch (user environment already configured)
aomi tx sign tx-1 tx-2

# 5. Verify
aomi tx list
```

Pattern notes:

- If `aomi tx list` only shows one tx, ask the agent to include the approval explicitly.
- If simulation fails at step 2 with "insufficient allowance", the approve in step 1 may have been built with a smaller amount — re-chat to confirm the agent set the allowance to ≥ swap amount.
- Swap apps you can use here: `oneinch`, `zerox`, `cow` (CoW Protocol uses an off-chain order, may queue a single signature instead of a tx batch).

## 2. Lending — Deposit Into a Vault

Supply collateral or stablecoins into a lending market or vault and start earning yield. Often a two-step flow: approve the asset, then deposit.

```bash
# 1. Identify the right market/vault first (read-only)
aomi chat "what are the highest-yield USDC markets on Morpho on Base?" \
  --app morpho --chain 8453 --new-session

# 2. Build the deposit request
aomi chat "deposit 1000 USDC into <market-or-vault-name> on Morpho" \
  --app morpho --chain 8453 --public-key 0xUserAddress

# 3. Review what was queued
aomi tx list
# expected: tx-1 (approve USDC for the vault), tx-2 (deposit into vault)

# 4. Simulate the batch
aomi tx simulate tx-1 tx-2

# 5. Sign
aomi tx sign tx-1 tx-2

# 6. Verify the position was opened
aomi chat "show my Morpho positions" --app morpho
```

Pattern notes:

- Lending apps available today: `morpho`, `yearn`. Pick whichever the user names; otherwise ask before defaulting.
- Withdrawal flows are usually single-step (no approval) — skip simulation if it's read-only-of-state safe, otherwise simulate as a single-tx batch (`aomi tx simulate tx-1`).

## 3. Bridging — Move Assets Across Chains

Move tokens from one chain to another via a bridge aggregator. Source-chain approval (if ERC-20) plus a bridge call. Settlement on the destination chain happens out-of-band.

```bash
# 1. Get a bridge quote first
aomi chat "quote bridging 250 USDC from Polygon to Base via LI.FI" \
  --app lifi --chain 137 --public-key 0xUserAddress --new-session

# 2. If the agent returned a quote, confirm to queue the wallet request(s)
aomi chat "proceed with the LI.FI bridge"

# 3. Inspect what was queued
aomi tx list
# expected: tx-1 (approve, if ERC-20), tx-2 (bridge call on the source chain)

# 4. Simulate the source-chain steps
aomi tx simulate tx-1 tx-2

# 5. Sign — note the chain on tx-2 must match --rpc-url
aomi tx sign tx-1 tx-2 --rpc-url https://polygon.drpc.org --chain 137

# 6. Track destination-chain settlement (off-chain bookkeeping)
aomi chat "track the LI.FI transfer status for the order I just submitted"
```

Pattern notes:

- Bridge apps available: `lifi` (direct bridges), `khalani` (intent-based, see [apps.md](apps.md#solver-networks--khalani)).
- Destination-chain settlement is **not** a `tx-N` — it's a status the agent polls via the bridge's API. Continue the conversation in the same session to follow up.
- The signing RPC must match the source chain. If `--chain` was set to a different chain in the original chat, override with `--rpc-url` matching the queued tx.

## 4. Staking — Stake Into a Vault or Validator

Stake an asset into a validator, vault, or restaking protocol to earn rewards. Usually approve + stake.

```bash
# 1. Pick a destination
aomi chat "what staking options are available for ETH on Yearn?" \
  --app yearn --chain 1 --new-session

# 2. Build the stake request
aomi chat "stake 0.5 ETH into <vault-name> on Yearn" \
  --app yearn --chain 1 --public-key 0xUserAddress

# 3. Inspect
aomi tx list
# expected: tx-1 (approve, if needed), tx-2 (stake/deposit)

# 4. Simulate
aomi tx simulate tx-1 tx-2

# 5. Sign
aomi tx sign tx-1 tx-2

# 6. Confirm position
aomi chat "show my Yearn positions" --app yearn
```

Pattern notes:

- Native ETH staking sometimes skips the approve step (no ERC-20 allowance needed). If `aomi tx list` shows only one tx, simulate it standalone: `aomi tx simulate tx-1`.
- Unstaking and reward-claim flows follow the same shape; just adjust the chat prompt.

## What All Four Flows Have in Common

- **Always start a wallet-aware session** with `--public-key 0xUserAddress` and the right `--chain`.
- **Always read `aomi tx list`** between chat and signing — never guess what's queued.
- **Always simulate multi-step batches** before signing. Single-tx flows are simulation-optional but never wrong to simulate.
- **Always confirm** with the user before `aomi tx sign` for any flow that moves funds.
