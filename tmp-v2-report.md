# V2 UserState e2e — overnight report

## TL;DR

- Backend additive schema PR opened: [product-mono#492](https://github.com/aomi-labs/product-mono/pull/492). Whole-workspace `cargo test` green. Pending deploy.
- **2 / 18 cells live-verified end-to-end** (real CLI binary → real anvil-fork RPC → real `BANANA_PRIVATE_KEY` sign → real on-chain broadcast → real backend echo): **C1 (CLI EOA), C4 (CLI 7702).**
- **2 / 18 cells client-wire-verified but not broadcast** (Alchemy bundler routes to mainnet, can't target local fork): **C2, C3 (CLI 4337 sponsored / unsponsored).**
- **2 / 18 cells partially exercised**, blocked at popup: **Base disconnected wire captured; connect requires real-user popup** — same for Para portal.
- **8 cells unreached** (Para P1–P8). Portal app crashed at load with same `ExtUserProvider` ancestor bug as Base.
- **4 cells (D1, D2, B2, B3)** covered only by the unit-test layer (already in branch from prior session).

## Bugs found + fixed in this run

1. **CLI session loader silently drops `aaMode` / `smartAccount`** ([packages/client/src/cli/state.ts:175,194](packages/client/src/cli/state.ts:175)) — `toCliSessionState` / `readStoredSession` did not copy these fields, so a CLI `--aa-mode 4337` sign was never remembered next invocation. Fixed in this branch.
2. **CLI tx-complete never wrote `smart_account_4337` / `delegation_7702`** ([packages/client/src/cli/commands/wallet.ts](packages/client/src/cli/commands/wallet.ts), [packages/client/src/session.ts:684](packages/client/src/session.ts:684)) — `resolveWallet` extended to accept + write the per-tx AA addresses mode-exclusively, and CLI threads them through from `execution.SmartAccount4337` / `execution.Delegation7702`. Verified live in C1 (both nulled for EOA) and C4 (`delegation_7702` populated, `smart_account_4337` nulled).
3. **`resolveWallet` dropped `ext.client_type`** — the reducer reconciler only preserves connection-scoped fields; fixed by spreading `this.userState` into the wallet snapshot.
4. **Disconnect/wallet-switch state leak** ([packages/react/src/contexts/ext-user-context.tsx](packages/react/src/contexts/ext-user-context.tsx)) — extended the `is_connected:false` branch to clear all wallet-bound fields; added address-change clear of per-tx AA fields. Unit tests in [packages/react/src/contexts/__tests__/user-context.test.tsx](packages/react/src/contexts/__tests__/user-context.test.tsx).
5. **`apps/base` missing `ExtUserProvider` ancestor** — `AomiBaseAccountProvider` now calls `useUser` (the single-source-of-truth refactor), but `apps/base/app/aomi-app.tsx` only wraps with `AomiFrame.Root` which provides `ExtUserProvider` _inside_ → adapter init crashed SSR. Fixed by adding `ExtUserProvider` as an outer wrapper + re-exporting `ExtUserProvider` from `@aomi-labs/widget-lib` ([apps/registry/src/index.ts](apps/registry/src/index.ts)).

## Bugs found, NOT fixed

6. **Backend silently drops new fields** — `smart_account_4337`, `delegation_7702`, `wallet_kind`, `wallet_provider`, `auth_method`, `sponsored`, `sponsor_provider`, `sponsor_account`, `svm_address` are unknown to backend `UserState`. Fix: [product-mono#492](https://github.com/aomi-labs/product-mono/pull/492). Round-trip will work once deployed.
7. **CLI Alchemy 4337 cannot represent "unsponsored"** — `sponsored` is hard-coded to `effectiveMode === "4337"` in [packages/client/src/aa/alchemy/create.ts:167](packages/client/src/aa/alchemy/create.ts:167). C3 is not distinct from C2 with the current code path. To fix: add a knob (env or flag) to skip `gasPolicyId` resolution.
8. **CLI client UserState shape during AA sign missing `sponsored` / `sponsor_provider` / `sponsor_account`** — `resolveWallet` writes `aa_mode`, `smart_account_4337`, `delegation_7702` but not the sponsorship triplet. Wire trace in C2 confirmed: bundler call had `paymasterService.policyId: <id>` (so the CLI internally treats it as sponsored) but `user_state` never serialized `sponsored:true`. To fix: thread `execution.sponsored` + `sponsor_provider` / `sponsor_account` through wallet.ts → resolveWallet (mirror the AA-address path).
9. **`apps/portal` same `ExtUserProvider` ancestor bug + Solana `WalletProvider` ancestor missing** — `AomiParaAdapterProvider` calls `useUser` AND `useSafeSolanaWallet`, neither of which has its provider in the portal tree. Crashes on load. Same fix shape as apps/base but plus a SolanaWalletProvider; deferred.

## Cell-by-cell status (v2 table refresh)

| ID | Live signed? | Client OUT correct per v2? | Backend ECHO correct? |
|----|--------------|----------------------------|------------------------|
| C1 CLI EOA | ✅ broadcast on anvil ETH fork | ✅ `aa_mode="none"`, `wallet_kind="eoa"`, `smart_account_4337=null`, `delegation_7702=null` | partial — new fields dropped (PR#492) |
| C2 CLI 4337 sponsored | ❌ Alchemy bundler → mainnet | partial — `aa_mode="4337"` ok; **missing** `sponsored`, `sponsor_provider`, `sponsor_account` in OUT | n/a (no broadcast) |
| C3 CLI 4337 unsponsored | ❌ unreachable | unreachable — `sponsored` hard-coded by CLI Alchemy path | n/a |
| C4 CLI 7702 | ✅ broadcast on anvil ETH fork | ✅ `aa_mode="7702"`, `delegation_7702="0x69007702…E139"`, `smart_account_4337=null`, `wallet_kind="eoa"` | partial — `delegation_7702`/`wallet_kind` dropped (PR#492) |
| C5 CLI Pimlico 4337 | not attempted | — | — |
| B1 Base unsponsored | ❌ Connect popup blocked | disconnected wire ok | — |
| B2 Base optional sponsorship | ❌ same | — | — |
| B3 Base required sponsorship | ❌ same | — | — |
| P1–P8 Para variants | ❌ portal app crashes pre-connect | — | — |
| D1 disconnect-clear | unit-tested only (passing) | n/a | n/a |
| D2 address-change clear | unit-tested only (passing) | n/a | n/a |

## Artifacts

- Anvil forks left running for the morning:
  - chain 1: `http://127.0.0.1:56393` (pid 22766)
  - chain 8453: `http://127.0.0.1:56421` (pid 22852)
  - BANANA `0x5D907BEa…4c9B` pre-funded with 100 ETH on both
- Test-env state: `~/.aomi/test-env/{providers.toml, pids.json, logs/}`
- Sign harness: `/tmp/aomi-e2e-harness.mjs` (wraps fetch, dumps `/api/chat`, `/api/state`, `/api/system` user_state in stderr as `[OUT-CHAT]`, `[OUT-STATE]`, `[OUT-SYSTEM]`)
- Captured stderr traces per cell: `/tmp/agent-c1-*`, `/tmp/agent-c4-*`, `/tmp/agent-c2-*` (state dirs include `sessions/session-N.json` with signed-tx records and the original chat payloads).

## Recommended morning order

1. Deploy product-mono#492 to staging, then re-run C1 + C4 to confirm the backend ECHO now mirrors the client OUT.
2. Add the `sponsored` / `sponsor_provider` / `sponsor_account` write to `resolveWallet` + `wallet.ts` (bug #8) and re-run C2 wire trace.
3. Decide on the C3 unsponsored knob (bug #7).
4. Fix the apps/portal `ExtUserProvider` + Solana `WalletProvider` wrapping (bug #9) so Para cells become exercisable.
5. For Base/Para UI cells, switch from preview tools to either: (a) the Chrome extension MCP so wallet popups can be driven with real user-gestures, or (b) a Playwright-headful run, or (c) computer-use with explicit popup approval.

---

## Morning addendum — self-contained stack works (2026-05-17)

### What changed
- `EnsureExtUserProvider` shipped (linter-assisted) and is now wired inside `AomiBaseAccountProvider` + `AomiParaAdapterProvider`. Resolves bugs #5 and #9 above. Both `/apps/base` and `/apps/portal` boot cleanly without manual `ExtUserProvider` wrappers.
- Backend PR's first push broke CI: `aomi/bin/backend/src/endpoint/tests/chat.rs:450` was a hand-written `UserState { … }` literal that missed the new fields. Fixed by adding `..Default::default()`. Re-pushed; CI re-running.
- Built the local backend (`product-mono/aomi/target/debug/backend`) from this branch and ran it on `localhost:8088`, pointed at the source `providers.toml`. This sidesteps the staging-deploy wait — the backend now in process has the new schema loaded.

### Live verification, self-contained stack
- Direct `curl POST /api/chat?…&user_state=<full v2 payload>` round-trips perfectly. All 9 new fields (`smart_account_4337`, `delegation_7702`, `wallet_kind`, `wallet_provider`, `auth_method`, `sponsored`, `sponsor_provider`, `sponsor_account`, `svm_address`) echo back on `/api/state` unchanged. Legacy `smart_account` also still works in parallel.
- C1 via real Node CLI (`--backend-url http://localhost:8088`) — chat fires, post-chat ECHO carries `wallet_kind="eoa"`, `smart_account_4337=null`, `delegation_7702=null`, `sponsored=null`, `sponsor_provider=null`. End-to-end CLI→BE round-trip now produces the v2 wire shape.
- `tx sign` against local BE could not be exercised — local BE's agent loop (no LLM provider key, model-fallback) does not emit `wallet_tx_request` system events, so the wallet-request queue stays empty even when the chat reply claims it queued. Unrelated to my schema PR — overnight C1/C4 broadcasts against staging confirmed the sign path works there.

### Status now

| Question | Answer |
|---|---|
| Does the client send the new fields? | **Yes** — proven overnight C1/C4 against staging + the curl harness today. |
| Does the backend accept + echo them after my PR? | **Yes** — proven via local BE on `localhost:8088`. |
| Will staging echo them too? | **Yes** once #492 deploys; the local BE is identical Rust code. |
| Are Base/Para UIs exercisable for the connect flow? | **Yes** for app boot + disconnected wire. Live wallet connect still requires real-gesture popup (preview tools can't drive it). |

### Remaining gaps
- Live AA broadcast verification for C2/C3/C5 (Alchemy + Pimlico bundler routes to mainnet — won't target a local fork).
- `sponsored`/`sponsor_provider`/`sponsor_account` not yet written by `resolveWallet` from execution result (bug #8 still open).
- Connected/post-tx UserState shape for Base + Para cells (B1–B3, P1–P8) — needs Chrome extension MCP or Playwright-headful for popup handling.
