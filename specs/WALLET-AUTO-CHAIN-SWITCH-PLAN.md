# Wallet auto chain-switch at tx approval (W2)

Status: planned, not started. Branch: `feat/wallet-auto-chain-switch`. This is the frontend workstream of the cross-chain continuity fix; the backend plan (child wallet context, bridge monitoring) lives at `product-mono/docs/plans/2026-08-12-cross-chain-orchestrator-continuity.md`. Bug 1 there is only fully fixed when both land — ship in the same release.

## Problem

When the agent stages a transaction on a chain other than the wallet's current chain (e.g. the Aave leg on Arbitrum after bridging from Base), the `transaction` approval branch sends it without switching the wallet's network, and the user is told to switch manually (or wagmi throws `ChainMismatchError`). The eip712 branch and the Solana path already auto-switch; plain EVM transactions are the one path that doesn't.

## Changes

### 1. `apps/shadcn-registry/src/components/runtime-tx-handler.tsx` — add `maybeSwitchEvmChain`

Define next to `maybeSwitchSolanaCluster` (~line 96), mirroring it and the eip712 branch (~405-415):

```ts
async function maybeSwitchEvmChain(targetChainId: number): Promise<void> {
  if (!targetChainId || targetChainId === currentChainId) return;
  const supported = adapter.supportedNetworks?.evm?.some(
    (n) => parseChainId(n.chainId) === targetChainId, // verify exact network entry shape
  );
  if (supported === false) {
    throw new Error(
      `This wallet does not support chain ${targetChainId}. Reconnect with a wallet that does.`,
    );
  }
  if (!adapter.switchChain) {
    throw new Error(
      `Cannot switch the wallet to chain ${targetChainId}. Switch networks manually and retry.`,
    );
  }
  await adapter.switchChain(targetChainId); // wallet popup — expected UX
}
```

Call it in the `transaction` branch immediately after `defaultChainId` is computed (~line 159-163) and **before** `simulateBatchTransactions` (~line 164), so simulation, fee injection, and send all run against the switched chain, and the user gets one "switch network" wallet prompt before the sign prompt. A thrown error (including user-rejected switch) flows to the existing catch → `rejectWalletRequest(req.id, message)`; staged txs stay staged backend-side so the orchestrator can re-request.

Optionally share the guard logic with the eip712 branch's existing switch (it currently switches without a supported-networks check); if not trivial, leave eip712 as-is for scope control.

**Do not switch back afterwards.** The `wallet:state_changed` sync (`packages/react/src/runtime/user-state-provider.tsx:157-159`) updates backend user state to the new chain — which is the desired state for the next leg of a cross-chain flow.

### 2. Fix latent skip-switch bug — `apps/shadcn-registry/src/lib/wallet-kit/execution/wallet-execution.ts:237`

`currentChainId: state.currentChainId ?? callList[0]?.chainId ?? 1` masks "wallet chain unknown" (embedded/Para/Privy lanes, right after connect) as "already on target", so the switch in `packages/client/src/aa/execute.ts:136-145` is silently skipped and wagmi throws `ChainMismatchError`.

- Change `executeWalletCalls`'s `currentChainId` param to `number | undefined`; switch when `currentChainId === undefined || currentChainId !== chainId`.
- Pass `state.currentChainId` through unmodified in `wallet-execution.ts`.
- Grep for other `executeWalletCalls` callers and update. Touches `packages/client` + `apps/shadcn-registry` — land as one PR.

### 3. Deferred (follow-up, not this branch)

`chain_id` hint on the `EvmTxApproval` wire payload. Hydration from user_state pending entries already supplies per-call `chainId` (`packages/client/src/wallet-utils.ts:371-449`) and the backend enforces single-chain batches, so `defaultChainId` is reliable today.

## Test cases

Vitest, mocked adapter with a `switchChain` spy (precedent for switch-mock tests: `apps/portal/src/lib/payment-fetch.test.ts` in the `aomi` repo history):

| # | Given | Expect |
|---|---|---|
| 1 | tx target chain ≠ wallet current chain, chain supported | `switchChain(target)` called **before** `sendTransaction`; send uses target chain |
| 2 | target === current | `switchChain` NOT called; send proceeds |
| 3 | target chain not in `adapter.supportedNetworks.evm` | request rejected with readable message; `sendTransaction` never called |
| 4 | adapter has no `switchChain` | request rejected with "switch manually" message; no send |
| 5 | user rejects the switch popup (switchChain throws) | request rejected via existing catch; no send; staged tx untouched |
| 6 | `executeWalletCalls` with `currentChainId: undefined` | switch IS attempted (regression for the :237 fallback bug) |
| 7 | `executeWalletCalls` with `currentChainId` = target | no switch (unchanged) |

## Risks / edge cases

- WalletConnect wallets may reject `wallet_switchEthereumChain` for chains not added to the wallet; wagmi's `switchChainAsync` handles add-then-switch for chains in the wagmi config — verify Arbitrum (42161) is in the configured chain list (`wallet-kit/config/AomiWalletKitProvider.tsx`, `routing.routedChains`).
- Privy/Para/Base Account lanes: confirm `selectNetwork`/`switchChain` multiplexing in `wallet-kit/runtime/evm/wallet-runtime.ts:580-600` covers each; adapters lacking it hit the readable-error path (case 4).
- Local-private-key executor builds a viem client per `call.chainId` and needs no switch (unchanged).

## Verification

- `pnpm lint` + targeted vitest runs.
- Manual: with wallet on Base, have the agent stage an Arbitrum tx → expect network-switch popup, then sign popup, no manual fiddling; joint e2e with the backend changes is described in the backend plan's verification gate.

After landing, update `specs/STATE.md` per repo convention.
