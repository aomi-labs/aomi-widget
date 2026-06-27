# Multi-wallet per-family connection + hybrid picker — Design

**Date:** 2026-05-29
**Branch:** `codex/para-solana-support-wip` (canonical base)
**Status:** Approved design, pending implementation plan

## Goal

Make the widget's multi-wallet connection stable and let a user manage
multiple connected wallets, each tagged EVM or Solana, with one **active**
wallet per family. Adopt the polished modal UI from the remote
`multiple-wallet-providers` branch as the picker shell, while implementing
the per-family multi-account model (which that branch does **not** have).

No backend changes: the backend envelope / `useUser()` carries exactly one
`evm.address` + one `svm.address`, which map to the active account of each
family.

## Background / why

Two sibling branches forked from `dcca76c` (PR #148) and both rewrote
`apps/registry/src/lib/aomi-auth-adapter/`:

- **Ours** (`codex/para-solana-support-wip`) — deep Solana/dual-family
  support (`para-sol.tsx`, `solana-networks.ts`, `network-preferences.tsx`,
  `dual-wallet-bar.tsx`, `wallet-family-slot.tsx`, `runtime-user-sync.tsx`).
- **Remote** (`origin/multiple-wallet-providers`) — a polished modal picker
  (`wallet-picker.tsx`, `wallet-picker-context.tsx`) that is **provider-centric**
  (rows = auth providers Para/Base/Privy) and **single-active** (shows one
  `identity.address ?? svmAddress`). Leaner `para.tsx`/`types.ts`, no Solana
  depth files, user-sync relocated to `packages/react/user-state-provider.tsx`.

Decision: **ours is the base.** Do NOT `git merge` (both rewrote
`para.tsx`/`types.ts` → semantic conflicts; remote deleted files we depend
on). Instead **surgically port** the picker's shell/visual language onto our
adapter and extend it with per-family account sections.

### Constraints discovered

- Wallet state is **derived, not stored** by us. `identity` (a `useMemo` in
  `providers/para.tsx`) merges four independent sources: wagmi
  (`useSafeWagmiAccount`, single active EVM), Para account
  (`useSafeParaAccount`), Solana wallet-adapter (`useSafeSolanaWallet`), and
  `network-preferences.tsx` (`selectedFamily`/chain/network — plain
  `useState`, **not persisted**). Pushed to backend via
  `runtime-user-sync.tsx`.
- **Solana wallet-adapter (`useWallet()`) is single-active** — cannot hold N
  live Solana connections at once. wagmi v2 CAN hold multiple connections
  (`useConnections()`) but surfaces one current account.
- Therefore the model is **"many known accounts, one active per family"**
  (Model A), not N simultaneous live sessions.
- Family tagging needs **no heuristics** — it is intrinsic: wagmi connectors
  = EVM, solana-adapter wallets = Solana. A dual-chain wallet (e.g. Phantom)
  correctly appears as two accounts (its EVM connector + its Solana entry).

### Bugs being fixed

1. SOL→EVM switch makes EVM look "lost" — it is still in `identity.address`,
   just not displayed (`DualWalletBar` showed only `activeFamily`).
2. "Connect EVM" is hardwired to open the Para AUTH modal even when already
   connected (`para.tsx` `connect()` for EVM always calls
   `paraModal.openModal`).
3. No selection persistence — family/chain/network reset on reload.
4. **(Already fixed this session)** Default Solana cluster was devnet;
   flipped to mainnet in `landing-para-provider.tsx`,
   `landing-privy-provider.tsx`, `portal/wallet-providers.tsx`.

## Architecture & boundaries

Four units, each with one job:

1. **`network-preferences.tsx`** (exists) — gains **persistence**
   (`localStorage`) for `selectedFamily`, `selectedEvmChainId`,
   `selectedSolanaNetworkId`, and a new `activeAccountId` per family. Source
   of truth for _selection/view_ state.
2. **`providers/para.tsx`** (exists) — builds the `accounts` registry from
   its sources (wagmi `useConnections()` for EVM, `useSafeSolanaWallet` for
   Solana), implements `selectAccount` / per-account `disconnect`, and
   applies the SOL→EVM and connect-guard fixes. Source of truth for
   _connections_.
3. **`wallet-picker.tsx` + `wallet-picker-context.tsx`** (ported, adapted) —
   the polished modal shell. Top: provider rows (Para live; Base/Privy
   disabled placeholders). Below: two **family sections** (EVM / Solana)
   listing `accounts` filtered by family.
4. **`dual-wallet-bar.tsx`** (exists) — becomes the **trigger**: collapsed
   button showing active EVM + active SOL summary, opens the picker.

`wallet-family-slot.tsx`'s connect/disconnect logic is absorbed into the
family sections; delete it once the picker covers its role.
`runtime-user-sync.tsx` is **untouched** — it keeps reading
`identity.address`/`svmAddress` (now "active per family"), so the backend
contract is unchanged.

## Adapter interface (`types.ts`)

New on `AomiAuthAdapter`, alongside the existing single-active fields (which
stay):

```ts
type AomiAccount = {
  id: string;            // wagmi connector uid, or solana wallet name
  family: "evm" | "solana";
  address: string;
  label?: string;        // wallet name / formatted address
  walletName?: string;   // "MetaMask", "Phantom", "Para", …
  active: boolean;       // the live account for its family
};

// on AomiAuthAdapter:
accounts: readonly AomiAccount[];
selectAccount: (id: string) => Promise<void>;     // make active for its family
disconnect?: (options?: {
  family?: WalletFamily | "all";
  accountId?: string;                              // NEW: per-account disconnect
}) => Promise<void>;
```

Semantics:

- `identity.address` / `svmAddress` become _derived_ = the `active` account
  of each family. Nothing downstream changes.
- **EVM:** `accounts` from wagmi `useConnections()`; `selectAccount` →
  `switchAccount({ connector })`; per-account `disconnect` →
  `disconnect({ connector })`. "Connect another" → Para modal.
- **Solana:** single-active by library constraint — the Solana section shows
  the connected wallet (if any) as one `active` account plus the installable
  wallet rows (existing `solanaWallets` descriptors) to connect/switch via
  `select()+connect()`. `selectAccount` on a different Solana wallet =
  re-select.
- **Identity field gap:** the ported picker reads
  `identity.walletProvider` / `identity.authMethod`; map those to our
  `authProvider` (rename in the ported file). Do **not** add fields to our
  identity.
- **Disconnect granularity:** per-account within family sections (disconnect
  Rabby, keep MetaMask), plus the provider row's **Manage** opens Para's
  account modal for its own logout. `{family:"all"}` stays the "clear
  everything" path.

## Behavior fixes

- **EVM-connect guard:** `connect({family:"evm"})` opens the Para modal only
  when there is no active EVM account. When EVM is already connected the
  picker shows the connected row (manage/disconnect/switch) and never
  re-pops Para.
- **SOL→EVM "loss":** display fix — the picker renders both family sections
  simultaneously, so switching family never hides a connected wallet. Stop
  nudging `selectedFamily` away from EVM on Solana actions.
- **Persistence:** `selectedFamily`, `selectedEvmChainId`,
  `selectedSolanaNetworkId`, and `activeAccountId` per family persist to
  `localStorage` (keyed per provider). On reload, last view + active
  accounts restore.

## Picker UI structure

Single modal (ported shell), top to bottom:

1. **Header** — "Wallets" / "Connect a wallet".
2. **Provider rows** — Para (active/configured); Base Account + Privy as
   disabled placeholders. Provider switching future-proofed; only Para live.
3. **EVM section** — heading + rows from `accounts.filter(evm)`: address +
   chain, active check, click-to-select, per-row disconnect; a "Connect EVM
   wallet" row → Para modal.
4. **Solana section** — heading + connected account row (if any) +
   installable wallet rows (Phantom/Solflare/…) to connect/switch; cluster
   shown (defaults to mainnet).

**Family gating:** when the active network family is Solana, the EVM section
rows are visible but **greyed/non-selectable** (and vice versa). To avoid a
dead-end, the disabled section header offers a "Switch to EVM/Solana"
affordance that flips the active family (`setSelectedFamily`), after which
its rows go live.

Trigger: the collapsed `dual-wallet-bar` button (active EVM + SOL summary)
opens this modal.

## Testing

Following existing patterns (`network-select.test.tsx`,
`wallet-execution.test.ts`, `solana-networks.test.ts`):

- **Pure helpers extracted from the component and unit-tested:**
  - `buildAccounts(connections, solanaWallet, activeIds)` → `AomiAccount[]`
    with family tagging + `active` flags. Cases: EVM-only, SOL-only, dual,
    multiple EVM connectors, dual-chain wallet appears twice.
  - persistence read/write helper → round-trips selection + `activeAccountId`;
    ignores malformed JSON.
  - family-gating predicate → inactive-family rows non-selectable.
- **Picker component test** — renders provider rows + both family sections;
  inactive-family rows disabled; active row shows manage/disconnect; select
  calls `adapter.selectAccount`.
- **Verification:** `pnpm lint` + `pnpm run build:lib`; run demo
  (`pnpm --filter landing dev`) — picker opens, both families shown, mainnet
  default, no Para re-popup when EVM connected.

## Out of scope

- Branch merge of `origin/multiple-wallet-providers` (porting only).
- Remote's non-UI divergences: relocated user-sync
  (`packages/react/user-state-provider.tsx`), leaner `para.tsx`,
  `full-testnet-wallet-routing.tsx`.
- N simultaneous live connections (Solana adapter can't; backend can't
  report).
- Provider switching beyond Para (Base/Privy remain disabled placeholders).

```

```
