# Wallet Kit — Cleanup Sweep

> Executable, checkbox-driven cleanup backlog for `apps/registry/src/lib/wallet-kit/`
> after the big provider/runtime refactor landed. Companion to
> `WALLET-PROVIDER-PLUGIN-REFACTOR.md` (which is the architecture + migration
> spec; its Appendix A holds the full target structs). This doc is the
> **finish-line consistency pass**: EVM/SVM symmetry, dead code, duplication,
> layering, decomposition, and dead-dependency removal. Run the phases in order;
> each is independently green and committable. The last phase is a whole-sweep
> gate + manual landing matrix.

## Decisions locked (2026-06-15)

- **Unified wallet rows: wire them.** The picker (`control-bar/wallet-picker.tsx`)
  builds rows ad hoc from `accounts`/`evmWallets`/`solanaWallets` and never reads
  `walletModalRows`. Finish the intended model: picker consumes `mergeWalletRows`
  output; delete the ad-hoc assembly. (Not: delete `mergeWalletRows`.)
- **Scope: everything in one doc.** Includes the EVM/SVM symmetry finish.
- **Deprecated surface: delete the branch-only ones now** (`AomiBaseAccountProvider`,
  the duplicate `base-account` branch, `ParaPluginProvider.solanaConfig`). Keep
  `AomiWalletProvider` + `AomiPrivyProvider` (portal + `/privy` demo use them) and
  `AomiSessionIdentity.walletProvider`/`authProvider` (the `/api/state` wire).

## Already clean — do NOT churn

Registry core (`registry/reducer.ts`/`policy.ts`/`commands.ts`/`store.ts`), the
unified EVM execution factory (`execution/execution-runtime.ts`), the pure
registry sources (`runtime/{evm,svm}/registry-source.ts`), the SVM
`svm/connect`·`svm/disconnect` command plumbing, and the connector catalog are
in good shape. Touch them only where a phase below names a specific line.

## Verification toolbox

Run from repo root. Phases reference these by id.

| id | command | asserts |
| --- | --- | --- |
| `V-TYPE` | `pnpm run typecheck` (+ `pnpm typecheck:landing`) | registry + landing typecheck clean |
| `V-KIT` | `pnpm --filter @aomi-labs/widget-lib exec vitest run` | wallet-kit suite green |
| `V-PKG` | `pnpm exec vitest run packages/` | packages suite green |
| `V-LINT` | `pnpm run lint` | lint clean |
| `V-LIB` | `pnpm run build:lib` | library bundles |
| `V-ART` | `pnpm exec vitest run packages/client/test/registry-chain-artifacts.unit.test.ts` | pinned registry artifact paths green |
| `V-BUILD` | `pnpm run build:registry` then sync `apps/registry/dist` → `apps/landing/public/r` | registry artifacts rebuilt + synced |

Standing rule: any phase that **adds/moves/deletes** a file under `lib/wallet-kit/`
must update the file list in `apps/registry/src/registry.ts`, run `V-BUILD`, then
`V-ART`. Commit per phase.

---

## C1 — Account ownership: split the cross-family selector (root coupling)

The duplicate-Solana-row bug was a symptom: `registry/selectors.ts` `selectAccounts`
is family-agnostic (returns EVM **and** SVM), the EVM runtime returns it
unfiltered, and the SVM runtime returns the same selector `.filter(family==="svm")`.
So `evm.selectAccounts() ⊇ svm.accounts()`. The band-aid `dedupeAccounts` papers
over it and leaves `svm.accounts`/`activeAccount` half-dead.

- [x] Parametrize `selectAccounts(state, family, now, selectedChainId?)` in
  `registry/selectors.ts:113`; build only that family's rows.
- [x] `runtime/evm/wallet-runtime.ts:516` → `selectAccounts(state, "evm", …)`;
  `runtime/svm/wallet-runtime.ts:373` → `selectAccounts(state, "svm", …)` and drop
  the trailing `.filter`.
- [x] Composer (`composer/AomiWalletKitComposer.tsx:104`) concatenates
  `[...evm.accounts(now), ...(svm?.accounts(now) ?? [])]`.
- [x] Delete `dedupeAccounts` from `composer/build-accounts.ts` (each family now
  contributes disjoint rows; `accounts.ts` `buildAccounts` already dedupes within a
  family). Keep the regression test in `merge-wallet-rows.test.ts`.
- [ ] Verify: `V-KIT`, `V-TYPE`. Automated gates passed; manual pending:
  connect Phantom → exactly one SVM row (S4).

Done when: no runtime returns the other family's accounts; no `dedupeAccounts`.

## C2 — Shared `WalletRuntime<F>` + single SVM execution source

`EvmWalletRuntime` (`runtime/evm/wallet-runtime.ts:73`) and `SvmWalletRuntime`
(`composer/types.ts:50`) are two bespoke types with divergent names. SVM execution
has two sources (`ExecutionRuntime.svm` and `SvmWalletRuntime.execution`) → 6
`??` fallbacks in the composer (`AomiWalletKitComposer.tsx:271-285`).

- [x] Introduce `WalletRuntime<F>` in `composer/types.ts` (see Appendix A of the
  plugin spec) and make both runtimes satisfy it: rename `selectEvmIdentity→identity`,
  `selectAccounts→accounts`, `connectEvmWallet→connect`, `disconnectEvmAccount→disconnect`,
  `selectEvmAccount→selectAccount`, `switchEvmChain→selectNetwork`,
  `evmWalletOptions→options`; one `status: "ready"|"unavailable"` model (drop the
  EVM `registryEvmConnected`/`canDisconnectEvm` duality from the runtime surface,
  derive in the composer).
- [x] Pick ONE SVM execution source: drop `ExecutionRuntime.svm`; the composer reads
  only `svm.execution.*`. Remove the 6 `??` fallbacks.
- [x] Move the SVM connect/disconnect/network branches out of the composer
  (`AomiWalletKitComposer.tsx:188-254`) into the SVM runtime; delete the
  double-disconnect (composer `await svm.disconnect()` then dispatch — the runtime
  already dispatches `user/disconnect-family`).
- [ ] Verify: `V-KIT`, `V-TYPE`. Automated gates passed; manual pending: S1-S3, D1.

Done when: `EvmWalletRuntime`/`SvmWalletRuntime` are `WalletRuntime<"evm"|"svm">`;
SVM execution has one source; composer has no SVM control-flow.

## C3 — Wire the picker to the unified rows

`walletModalRows`/`mergeWalletRows` is produced but unread; the picker assembles
rows itself. Finish the model (decision above).

- [x] `control-bar/wallet-picker.tsx`: consume `adapter.walletModalRows` (live +
  stored + option rows already merged) instead of re-deriving from
  `accounts`/`evmWallets`/`solanaWallets`.
- [x] Map `WalletRowAction` kinds (`select`/`connect`/`authenticate`/`disconnect`/
  `manage`) to the picker's existing handlers; delete the ad-hoc row assembly.
- [x] Ensure `mergeWalletRows` covers every case the old assembly did (per-family
  options, generic browser-wallet fallback, social/auth rows). Extend
  `merge-wallet-rows.test.ts` for any newly-relied-on case.
- [ ] Verify: `V-KIT`, `V-LINT`. Automated gates passed; manual pending:
  E1–E7, S1, the picker renders identically.

Done when: `walletModalRows` has a consumer; the picker no longer reads
`accounts`/`evmWallets`/`solanaWallets` directly for row construction.

## C4 — Duplication consolidation

- [x] **`walletKey` helper.** Extract one `walletKey(family, address)` (the
  `${family}:${address.toLowerCase()}` shape) and reuse; it's duplicated in
  `composer/build-accounts.ts:78`, `composer/merge-wallet-rows.ts:94`, and inline in
  `accounts.ts`, `registry/selectors.ts`, `registry/persistence.ts`.
- [x] **Provider label maps.** Merge the private `formatProvider`
  (`composer/build-identity.ts:148`) into the exported `formatWalletProvider`
  (`identity.ts:56`) — two hardcoded `para/privy/baseAccount` label maps.
- [x] **AA resolvers.** Consolidate `resolveExternalWalletAAProviderState` and
  `resolveProviderSessionAAProviderState` (`execution/aa-provider-state.ts`, ~80%
  identical) into one owner-strategy-parameterized resolver; external-wallet callers
  already bypass the dispatcher's `external-wallet` branch (lines 213-219), so it's
  dead — remove it.
- [x] **Public→registry family mapping.** Replace the inline `solana→svm` ternary
  repeated 3× in the composer (lines ~200/222/247) with one
  `toRegistryFamily(publicFamily)` helper.
- [x] **`accounts.ts` ⊕ `composer/build-accounts.ts`.** Merge into one clearly-layered
  module (raw→accounts then accounts→presentation) now that `dedupeAccounts` is gone
  (C1); they share `walletKey` and sit confusingly split across folders.
- [x] **Name collisions.** Rename one `resolveNativeWalletExecutionPolicy`
  (`config/execution.ts` vs private one in `execution/wallet-execution.ts:162`).
  Resolve the `formatAddress` hazard — defined in both `identity.ts:51` and
  `@aomi-labs/react` `utils.ts:167` with different slicing; dedupe or rename.
- [x] Verify: `V-KIT`, `V-PKG`, `V-TYPE`, `V-LINT`.

Done when: no duplicated `walletKey`/provider-label/family-mapping logic; one AA
resolver; no same-name-different-function collisions in the kit.

## C5 — Dead code & dead dependencies

- [x] Delete `useSafeWagmiAccount` (`runtime/evm/safe-hooks.ts:52`, zero references).
- [x] Delete `isProviderInternalWalletLabel` (`runtime/evm/brands.ts:192`, a stub
  that always returns `false`) and simplify its always-true call site
  (`runtime/evm/wallet-runtime.ts:325`).
- [x] Un-export internal-only SVM helpers (`SVM_AUTOCONNECT_GRACE_MS`,
  `buildSvmWalletDescriptors`, `toSvmWalletOption` in `runtime/svm/wallet-runtime.ts`).
- [x] Drop zero-consumer public presets from the barrel: `EVM_PRESETS` and the
  `SVM_PRESETS as SVM_WALLET_PRESETS` alias (`index.ts:51`); `SVM_PRESETS` is already
  exported once from `catalog/svm-wallet-catalog`.
- [x] **Delete the dead Para Solana wrapper.** Remove `ParaSvmWrapper`,
  `ParaSolanaProvider` mount, `resolveParaSvmConfig`, `DEFAULT_SVM_WALLETS`,
  `ParaSvmOptions`, `ResolvedSvmConfig` from `providers/para/para-svm.tsx` (zero
  importers). Repoint `providers/para/ParaPluginProvider.tsx:31` to import
  `DEFAULT_SVM_ENDPOINT`/`useSafeSvmWallet` directly from `runtime/svm/wallet-runtime`
  (matching Privy); delete `para-svm.tsx` and its `para/index.ts:8` export.
- [x] **Drop the now-unused deps:** `@getpara/solana-wallet-connectors` and
  `@solana-mobile/mobile-wallet-adapter-protocol` from `apps/registry/package.json`,
  `apps/registry/src/registry.ts` dep list, and `vitest.config.ts` aliases.
- [x] **Delete the deprecated branch-only surface:** `AomiBaseAccountProvider` +
  `base-account/` folder, the duplicate `base-account` branch in
  `providers/index.tsx`, and `ParaPluginProvider.solanaConfig` + its `?? solanaConfig`
  fallback. (`baseAccount` stays as the catalog connector + `WalletId`.)
- [x] Verify: `V-TYPE`, `V-KIT`, `V-LIB`, `V-BUILD`, `V-ART`, `V-LINT`.

Done when: `grep -rn "ParaSvmWrapper\|AomiBaseAccountProvider\|useSafeWagmiAccount\|isProviderInternalWalletLabel"`
returns nothing; the two Para Solana deps are gone from package.json + manifest.

## C6 — Provider file symmetry (Privy mirrors Para)

Para is well-split; Privy crams the plugin composer, a standalone provider, auth
helpers, an SVM shim, and smart-wallet execution into one 658-line `privy.tsx`.
Both plugins implement the same `WalletProviderPlugin` (`wrap` + `renderComposer` +
`detectSugar`), so this is file organization + one contract drift.

- [x] Split `providers/privy/privy.tsx` to mirror `providers/para/`:
  `PrivyPluginProvider.tsx` (the `AomiPrivyPluginProvider` composer), `privy-auth.ts`
  (`useSafePrivy`/`useSafeSmartWallets`/`useSafeSvmWallets`/`inferPrivyAuthMethod`/
  `inferPrivyPrimaryLabel`/`privyLoginMethodsToOptions`), `privy-svm.ts`
  (`buildPrivySvmWalletState`), `privy-execution.ts` (`sendPrivySmartWalletTransaction`).
- [x] Keep the standalone `AomiPrivyProvider` (the `/privy` demo reaches it via
  `AomiWalletProvider provider="privy"`) but move it into its own `PrivyProvider.tsx`
  out of the plugin file; note it as a later candidate to route through the shared
  stack like Para (it duplicates the wagmi/query/preferences stack).
- [x] Align the plugin contract: add `isAvailable` to `paraPlugin` (or drop it from
  `privyPlugin`) so both expose identical `WalletProviderPlugin` fields.
- [x] Update `apps/registry/src/registry.ts` file lists for the new Privy files.
- [ ] Verify: `V-TYPE`, `V-KIT`, `V-LIB`, `V-BUILD`, `V-ART`, `V-LINT`. Automated
  gates passed; manual pending: P1.

Done when: `providers/privy/` mirrors `providers/para/`'s layout; `paraPlugin` and
`privyPlugin` expose identical fields.

## C7 — Layering & module placement

- [x] **Fix `registry → runtime`.** `registry/selectors.ts:3` imports
  `resolveGracefulEvmIdentity` from `runtime/evm/identity-grace`. Move
  `identity-grace.ts` (pure, own test) down into `registry/` so the core stops
  reaching up into runtime.
- [x] **`catalog → runtime` soft edge.** `catalog/svm-wallet-catalog.ts:7` imports
  pure helpers from `runtime/svm/networks`. Move `normalizeSvmNetworkOptions`/
  `resolveSelectedSvmNetwork` into `catalog/` (data-shaping), or document the edge.
- [x] **Fold `aa/owner.ts` into `execution/`.** Single importer
  (`execution/aa-provider-state.ts`); the standalone top-level `aa/` dir exists for
  one 46-line file. Move to `execution/aa-owner.ts`, drop `aa/`.
- [x] **Collapse the root `persistence.ts`.** Its `selectedFamily` field is dead
  (only `network-preferences.tsx` consumes `selectedEvmChainId`/`selectedSolanaNetworkId`).
  Merge the 2 helpers into `network-preferences.tsx`, drop `selectedFamily` + its
  `solana→svm` migration branch, trim `persistence.test.ts`.
- [x] **Delete `wallet-family.ts`.** `toWireWalletFamily` has zero callers;
  `fromWireWalletFamily`'s only caller dies with the step above. Remove both barrel
  exports (`index.ts:65`) and the manifest entry. (If a wire mapping is still needed
  for the backend payload, keep `fromWireWalletFamily` only and inline its one use.)
- [x] **Delete the root `wallet-execution.ts` shim.** Repoint its 4 importers
  (`config/execution.ts`, `composer/types.ts`, `execution/aa-provider-state.ts`,
  `runtime/evm/safe-hooks.ts`) to `execution/wallet-execution`; move
  `wallet-execution.test.ts` → `execution/wallet-execution.test.ts`; delete the shim
  + its manifest entries.
- [x] **Resolve `internal.ts`.** Nothing imports it (only the manifest); the
  "internals behind internal.ts" firewall isn't enforced. Either delete it, or make
  the ~16 deep imports of `wallet-debug`/`execution/*`/`catalog/evm-connector-catalog`
  route through it and add the `exports` subpath. Pick one.
- [x] Verify: `V-TYPE`, `V-KIT`, `V-LIB`, `V-BUILD`, `V-ART`, `V-LINT`.

Done when: no `registry→runtime` import; one persistence layer per concern; no dead
shim/barrel.

## C8 — Config & composer decomposition

- [ ] **Flatten the config ladder.** `config/AomiWalletKitProvider.tsx` (434 lines)
  still nests ~8 components. Merge the `AomiExternalWalletProvider` branch-selector
  into the entry; collapse the twin `EvmExternalWalletComposerProvider` /
  `SvmExternalWalletComposerProvider` wrappers into one (`disabled` flag); extract the
  15-prop `authPlugin.renderComposer` ternary in `AomiEvmExternalWalletProvider` into
  a named sub-component. Target ≤5 layers, honest names. Partial: the render-composer
  ternary is now `WalletKitComposerOutlet`; branch/twin-wrapper collapse remains.
- [x] **Extract composer actions.** The `adapter` `useMemo` in
  `AomiWalletKitComposer.tsx` (~220 lines) still inlines connect/disconnect/select/
  network handlers. Extract `composer/build-wallet-kit-actions.ts`, mirroring the
  existing `build-identity`/`build-accounts` decomposition.
- [x] **Split `full-testnet-wallet-routing.tsx`** into `full-testnet-config.ts`
  (`parseRpcOverrides`/`isFullTestnet`/`useFullTestnet`, pure) and the
  `FullTestnetWalletRouter.tsx` side-effect component. (Low priority.)
- [ ] Verify: `V-TYPE`, `V-KIT`, `V-LIB`, `V-BUILD`, `V-ART`, `V-LINT`. Automated
  gates passed for the completed C8 items; manual pending: all three presets still
  mount (E1, E4, P1).

Done when: config provider ≤5 layers with honest names; composer `useMemo` no longer
holds the action handlers.

## C9 — Identity struct naming polish

- [x] Uniform SVM prefix in `AomiSessionIdentity` (`types.ts`): `svmAddress` vs
  `solanaCluster`/`solanaWalletName`/`solanaTransport`/`solanaCapabilities` — pick one
  (`svm*` internally, map to `solana*` only at the public adapter edge + wire).
- [x] Name the EVM identity shape (`EvmIdentity`) and reference it directly instead
  of `EvmIdentityTransform = (id: ReturnType<EvmWalletRuntime["selectEvmIdentity"]>) …`
  (`composer/types.ts:116`).
- [x] Verify: `V-TYPE`, `V-KIT`. Update `context.tsx` `AomiWalletKitSync` field reads
  if any identity field is renamed.

Done when: SVM fields use one prefix; no public type defined via `ReturnType<runtime
method>`.

## C10 — Whole-sweep gate + manual landing matrix

Automated:

- [x] `V-TYPE` `V-KIT` `V-PKG` `V-LINT` `V-LIB` `V-ART` all green; `V-BUILD` run and
  `public/r` synced.

Invariant re-check (greps must be empty / hold):

- [x] `grep -rn "dedupeAccounts\|ParaSvmWrapper\|AomiBaseAccountProvider\|useSafeWagmiAccount\|isProviderInternalWalletLabel\|wallet-family" lib/wallet-kit` → empty.
- [x] `grep -rnE "execution\.svm\?\." lib/wallet-kit/composer` → empty (single SVM execution source).
- [x] No `registry/` file imports from `runtime/`.
- [x] `EvmWalletRuntime`/`SvmWalletRuntime` both satisfy `WalletRuntime<F>`; `selectAccounts` takes a `family`.
- [x] `walletModalRows` has a consumer (the picker); the ad-hoc assembly is gone.
- [x] `index.ts` ≈20 curated exports; no zero-consumer presets; no `wallet-family` export.
- [x] Para Solana deps absent from `package.json` + manifest.
- [x] `providers/privy/` mirrors `providers/para/` layout; `paraPlugin`/`privyPlugin` expose identical `WalletProviderPlugin` fields.

Manual landing matrix (`pnpm --filter landing dev`, extensions required):

| id | scenario | expected |
| --- | --- | --- |
| E1 | Para Google / email login | connects |
| E3 | Para + MetaMask, set active, refresh | stays MetaMask |
| E4 | WalletConnect connect, wallets-only | connects, no hosted modal |
| E5 | Send tx, external-wallet 4337, no session | succeeds |
| E6 | Sign typed data + message (EVM) | succeed |
| S1 | Phantom (SVM) connect | one row, connects |
| S4 | Phantom connect → account list | exactly one SVM row (the C1 fix) |
| S2 | SVM cluster switch | reconnects |
| S3 | SVM sign tx / message | succeed |
| D1 | Disconnect family, then all | family-selective then full clear |
| P1 | `/privy` route: auth + embedded + external | all work |

Done when: every box ticked; STATE.md records the completed cleanup sweep.

---

## Appendix — full findings inventory (traceability)

Grouped by phase, for review. Each maps to a checkbox above.

**Dead code:** `useSafeWagmiAccount` (safe-hooks.ts:52) · `isProviderInternalWalletLabel`
stub + dead call site (brands.ts:192, wallet-runtime.ts:325) · `toWireWalletFamily`
(wallet-family.ts:8) · `selectedFamily` field + migration (persistence.ts) · dead
Para Solana wrapper (para-svm.tsx) · `dedupeAccounts` band-aid (build-accounts.ts) ·
`internal.ts` barrel (no importers) · zero-consumer `EVM_PRESETS`/`SVM_WALLET_PRESETS`.

**Dead deps:** `@getpara/solana-wallet-connectors`, `@solana-mobile/mobile-wallet-adapter-protocol`.

**Duplication:** `walletKey` (×5 sites) · `formatProvider`≈`formatWalletProvider` ·
two AA resolvers (aa-provider-state.ts) · `solana→svm` mapping (×3 in composer) ·
`accounts.ts`⊕`build-accounts.ts` · `resolveNativeWalletExecutionPolicy` name clash ·
`formatAddress` ×2 (kit vs @aomi-labs/react).

**Layering:** `registry/selectors.ts`→`runtime/evm/identity-grace` (real) ·
`catalog/svm-wallet-catalog`→`runtime/svm/networks` (soft) · `aa/` one-file dir ·
root `wallet-execution.ts` shim + misplaced test.

**Symmetry/coupling:** family-agnostic `selectAccounts` (root) · bespoke
`EvmWalletRuntime`/`SvmWalletRuntime` (no `WalletRuntime<F>`) · dual SVM execution
source (6 `??`) · composer-resident SVM control-flow + double-disconnect.

**Decomposition:** config provider 8-component ladder (collapse never happened) ·
composer `adapter` useMemo ~220 lines · `full-testnet-wallet-routing.tsx` mixed
config+component.

**Provider symmetry (C6):** Privy monolith (658 lines) vs Para's split — split Privy
into `PrivyPluginProvider.tsx`/`privy-auth.ts`/`privy-svm.ts`/`privy-execution.ts` +
standalone `PrivyProvider.tsx`; align `isAvailable` (Privy has it, Para doesn't);
keep standalone `AomiPrivyProvider` (the `/privy` demo uses it via `AomiWalletProvider`).

**Naming:** `AomiSessionIdentity` `svm*` vs `solana*` mix · `EvmIdentityTransform`
via `ReturnType<…>`.
