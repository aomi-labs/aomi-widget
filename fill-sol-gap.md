# Solana E2E Fill Gap

This branch contains the widget/client-side work needed to get the TypeScript
CLI onto the builtin SVM app path instead of the old Para-specific path.

## What is working

- The local TS CLI can now target the builtin Solana app with `--app svm` or
  `--app solana`.
- The CLI now seeds Solana-shaped `userState` on first turn when the active app
  is `svm` / `solana`, instead of always sending EVM-shaped wallet state.
- Against a patched local backend, `aomi chat ... --app svm --public-key ...`
  reaches the Solana tools:
  - `svm_get_context`
  - `svm_stage_tx`
  - `svm_commit_txs`

## Widget/CLI changes on this branch

- `packages/client/src/cli/user-state.ts`
  - `buildCliUserState()` now emits `connection.primary_family = "solana"` and
    `solana.address` when the active app is `svm` / `solana`.
- `packages/client/src/cli/cli-session.ts`
  - The initial `ClientSession` state now passes the active app into
    `buildCliUserState()`.
- `packages/client/src/cli/commands/chat.ts`
  - Pre-chat user-state sync now also passes the active app into
    `buildCliUserState()`.
- `packages/client/test/cli/cli-user-state.unit.test.ts`
- `packages/client/test/cli/cli-chat.unit.test.ts`
- `packages/client/dist/cli.js`
  - rebuilt from the updated sources

## Backend assumptions used during local verification

These backend changes were made locally in `product-mono` to exercise the
builtin SVM path:

- load both builtin apps by default: EVM + Solana
- treat builtin `solana` as public without requiring an app key
- canonicalize builtin aliases so `svm` resolves to `solana`
- use a sane local plugin marker:
  - `aomi/plugins/.version = apps-v0.1.21-aarch64-apple-darwin`
  - or run with `APP_RELEASE_TAG=apps-v0.1.21`

Without those backend changes, the builtin Solana path does not come up cleanly.

## How to run locally

### 1. Build the widget client

```bash
cd /Users/cecilia/.codex/worktrees/7ff2/aomi-widget
pnpm --filter @aomi-labs/client build
```

### 2. Start the backend on port 8080

This assumes the local `product-mono` backend includes the builtin Solana
startup/auth fixes described above.

```bash
cd /Users/cecilia/.codex/worktrees/2a6c/product-mono/aomi
DATABASE_URL="$SUPABASE_DB_URL" \
BACKEND_HOST=127.0.0.1 \
BACKEND_PORT=8080 \
APP_RELEASE_TAG=apps-v0.1.21 \
cargo run -p backend
```

### 3. Verify the builtin Solana app is visible

```bash
AOMI_STATE_DIR=/tmp/aomi-svm-repro \
node /Users/cecilia/.codex/worktrees/7ff2/aomi-widget/packages/client/dist/cli.js \
app list --backend-url http://127.0.0.1:8080
```

Expected:

- `solana` appears in the app list

### 4. Run the TS CLI against builtin SVM

Normal prompt:

```bash
AOMI_STATE_DIR=/tmp/aomi-svm-repro \
node /Users/cecilia/.codex/worktrees/7ff2/aomi-widget/packages/client/dist/cli.js \
chat "prepare a basic Solana devnet transfer of 0.000001 SOL from my connected wallet to itself; stop after creating the wallet request" \
--backend-url http://127.0.0.1:8080 \
--app svm \
--new-session \
--public-key <your-devnet-pubkey>
```

No-simulation prompt:

```bash
AOMI_STATE_DIR=/tmp/aomi-svm-nosim \
node /Users/cecilia/.codex/worktrees/7ff2/aomi-widget/packages/client/dist/cli.js \
chat "Without simulation or balance checks, prepare a basic Solana devnet self-transfer of 0.000001 SOL from my connected wallet to itself and immediately queue the wallet approval request. Stop once the wallet request is queued." \
--backend-url http://127.0.0.1:8080 \
--app svm \
--new-session \
--public-key <your-devnet-pubkey>
```

## Observed current gap

There are two distinct states:

### A. Normal prompt with an unfunded devnet account

- The agent stages and simulates the Solana transfer.
- Simulation fails with `AccountNotFound` / zero balance.
- This is expected chain state, not a widget contract bug.

### B. No-simulation prompt

- The agent calls `svm_commit_txs`.
- The tool result comes back as:
  - `status = "pending_approval"`
  - `chain_kind = "svm"`
  - `svm_tx_ids = [1]`
- The assistant then says it queued `tx-1`.
- But the TS CLI local session still has:
  - `pendingTxs = []`
  - `pendingSolTxs = []`
- `aomi tx list` prints `No transactions.`
- `aomi tx sign tx-1 ...` fails with:
  - `Transaction "tx-1" not found.`

In short:

- `svm_commit_txs` succeeds at the tool-result level
- but the pending approval never arrives as a signable wallet request in the
  TS CLI session

## Why that matters

The widget/client side already knows how to queue Solana requests when it
receives either of these:

- a `wallet_tx_request` system event with `chain_kind: "svm"`
- authoritative pending state under `userState.pending.solana_txs`

That did **not** happen in this local run.

The CLI session log showed:

- tool call count: 3
- `svm_get_context`
- `svm_stage_tx`
- `svm_commit_txs`
- `transactions: 0 (0 pending, 0 signed)`

The session events output only showed:

- `App connected`
- `usage_event`

No wallet request event was delivered.

## Where to continue

The likely backend-side continuation points are:

- `product-mono/aomi/crates/core/src/call_consumer.rs`
  - `emit_svm_tx_event()`
  - confirms `TxApproval::Svm` is being created from `pending_approval`
- `product-mono/aomi/crates/runtime/src/session.rs`
  - `format_session_response()`
  - `advance_http_events()`
  - verify the inline wallet event is actually preserved into the HTTP chat response
- `product-mono/aomi/crates/core/src/events.rs`
  - confirm `TxApproval::Svm -> WalletRequest -> SystemEvent::InlineCall`
    stays `wallet_tx_request`
- `aomi-widget/packages/client/src/session.ts`
  - current client behavior only enqueues local pending requests from:
    - delivered `wallet_tx_request` system events
    - rebuilt pending state from `user_state`

## Suggested next debugging pass

1. Log the `system_events` returned by `/api/chat` for the no-simulation SVM flow.
2. Confirm whether the backend response contains an inline `wallet_tx_request`.
3. If the backend response does contain it:
   - debug `packages/client/src/session.ts` event dispatch
4. If the backend response does **not** contain it:
   - debug the path between `emit_svm_tx_event()` and
     `SessionResponse.system_events`
5. Only after `tx list` shows `tx-1` should `aomi tx sign tx-1 --solana-private-key ...`
   be considered the real end-to-end sign test.

## Minimal acceptance target

The E2E Solana path is complete when this exact sequence works from the TS CLI:

1. `aomi chat ... --app svm --public-key <solana pubkey>`
2. `aomi tx list`
   - shows a queued `tx-1`
3. `aomi tx sign tx-1 --solana-private-key <secret>`
4. local CLI state moves the request from pending to signed
5. backend/session state reflects the signed completion
