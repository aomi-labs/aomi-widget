# Wallet Kit — Clean Architecture & Finish-Line Migration

> Single source of truth for finishing the wallet-kit refactor. Supersedes all
> prior revisions of this document. Written to be executed **sequentially** by an
> agent: every phase has a checklist, the files it touches, and the exact
> verification commands that must pass before moving on. The final phase is a
> whole-migration gate plus a manual landing matrix.

---

## 0. Where we are (re-baseline)

The wallet kit lives in `apps/registry/src/lib/wallet-kit/`. An earlier pass
(the "P3 cleanup sweep", tiers 1–3) already landed real structure, so **the
target folder layout mostly exists**:

- `config/` capability-shaped public config (`AomiWalletKitProvider.tsx`, `types.ts`, `execution.ts`).
- `composer/` one build path (`AomiWalletKitComposer.tsx`, `build-identity.ts`, `build-accounts.ts`, `merge-wallet-rows.ts`, `types.ts`).
- `catalog/` Aomi-owned connector catalog (`evm-connector-catalog.ts`, `svm-wallet-catalog.ts`, `wallet-branding.ts`, `wallet-ids.ts`).
- `runtime/evm/` + `runtime/svm/`, `registry/`, `execution/`, `account/`, `providers/{para,privy,base-account}/`, `providers/plugin-registry.ts`.

What is **good and stays**: the `registry/` core (pure reducer + policy +
`planCommands` + store; active-wallet-per-family as the single source of truth).
This is the part that earned its complexity.

What is **still wrong** (the four seams this plan closes):

1. **Two public entry points that disagree.** `config/AomiWalletKitProvider.tsx`
   (capability config + plugin registry, the additive `wrap`+`renderComposer`
   path) **and** `providers/index.tsx`'s `AomiWalletProvider` union (the
   `provider="..."` branch → `render` path). The landing Para demo uses the
   first; the Privy demo uses the second. `providers/para/para.tsx` (294 LOC) +
   `paraPlugin.render` are a **dead second mount path** reachable only from a dev
   driver. The capability provider also nests **8 provider components** with
   misleading names (`WalletsOnlyComposerProvider` is used even when auth is
   present; `EvmWalletsOnlyComposerProvider` wraps it).
2. **EVM is a real runtime; SVM is call-site glue.** `runtime/evm/wallet-runtime.ts`
   is a ~30-field hook (identity, accounts, connect/disconnect/switch, execution
   primitives). `SvmWalletRuntime` is a 5-field object literal hand-assembled at
   three call sites; SVM connect/disconnect/network/identity logic is smeared
   across `AomiWalletKitComposer.tsx` (~120 lines) plus free functions, and SVM
   connect is driven imperatively inside `runtime/svm/registry-source.ts`,
   bypassing `planCommands`. **Full symmetry is in scope.**
3. **Half-finished `svm`/`solana` rename.** Internal types are `Svm*`; the public
   adapter and the registry say `solana`; ~17 `Solana* = Svm*` deprecated aliases
   bridge the two, and the boundary runs through the middle of files. The
   composer still takes both `svm` and a deprecated `solana` prop side by side.
4. **Duplication, leaky surface, consumer foot-guns.** `providers/para/para-aa.ts`
   (218 LOC) is ~95% a copy of `execution/aa-provider-state.ts` (with a drifted
   Alchemy/Pimlico precedence). `index.ts` re-exports ~100 symbols via 13
   `export *` (debug, wire helpers, execution engine, AA internals). The consumer
   must call `registerAomiParaWalletProvider()` as a bare side effect or the
   provider **silently degrades** to wallets-only. Landing imports the kit via
   `../../../registry/src` relative paths and reaches into `providers/para` from
   dev drivers.

---

## 1. Target architecture

**Capability lanes.** Aomi core owns the registry, the connector catalog, the
chain runtimes, the composer, the `AomiWalletKit` adapter, the picker UI, and the
account merge. Providers supply optional lanes and nothing else: **auth**
(login/methods/credential), **embedded wallets**, an **AA signer/owner**, and an
optional **account UI**. Core consumes generic lane interfaces and never asks
"is this Para?" outside `providers/<id>/`.

### Layer ownership

| Layer | Owns | Must NOT contain |
| --- | --- | --- |
| `config/` | Public `AomiWalletKitProvider`, presets, config normalization | Provider SDK calls, wagmi/adapter mounts |
| `providers/<id>/` | Provider-specific auth, session, embedded wallet, AA signer, account UI | Execution orchestration, connector catalog, registry logic |
| `composer/` | Merge the lane runtimes into one `AomiWalletKit` adapter | Signing/execution implementation, provider names |
| `runtime/<family>/` | A symmetric `WalletRuntime<F>` hook per chain family | Provider names, the other family's logic |
| `registry/` | Active-wallet-per-family state machine (reducer/policy/commands/store) | Provider names, `Date.now()` in the reducer, effects outside `planCommands` |
| `execution/` | `executeWalletKitTransaction`, AA resolution, owner bridge | Provider names (Para supplies only a signer strategy) |
| `catalog/` | Aomi-owned wagmi config + Solana wallet list + presets | Provider names beyond `baseAccount` connector |
| `account/` | Account-runtime types + disabled stub (real runtime deferred) | — |

### The two extensibility seams (the whole point)

- **Add a provider** → drop a folder in `providers/<id>/`, implement the plugin
  contract, self-register on import. **Zero edits** to core config types, the
  composer, the runtimes, or the registry.
- **Add an ecosystem (new VM)** → implement one `WalletRuntime<F>` hook and add
  the family to the registry's family-keyed commands. The composer and registry
  are already family-keyed, so a third VM does not fork them.

### Architecture invariants (the end-state must satisfy ALL of these)

These are the anti-bloat / no-overlap rules. They are re-checked verbatim in the
final gate (Phase 8).

- [ ] **One public entry component.** `AomiWalletKitProvider` is the only mount
  path. `providers/index.tsx`'s union, if kept at all, is a ≤30-line `@deprecated`
  compat shim that forwards into `AomiWalletKitProvider`.
- [ ] **No dead second path.** `providers/para/para.tsx` and `paraPlugin.render`
  are deleted; Para mounts only through the one plugin contract.
- [ ] **Symmetric runtimes.** `useSvmWalletRuntime` exists and returns the same
  `WalletRuntime<"svm">` shape as `useEvmWalletRuntime` returns `WalletRuntime<"evm">`.
- [ ] **No family logic in the composer.** `grep -nE "publicKey|svm\.wallet\.(connect|disconnect|select)" composer/` returns nothing; the composer only merges runtimes.
- [ ] **Effects only via `planCommands`.** SVM connect/disconnect are registry
  commands (`svm/connect`, `svm/disconnect`); `runtime/svm/registry-source.ts` is
  a pure observer like the EVM source.
- [ ] **No provider names in core.** `grep -riE "\bpara\b|\bprivy\b" runtime/ composer/ registry/ catalog/ execution/` returns nothing.
- [ ] **One AA resolver.** `execution/` has a single `resolveAAProviderState({ ownerStrategy })`. `providers/para/para-aa.ts` is deleted or reduced to a ≤40-line session-owner contribution.
- [ ] **One execution path.** No "already-built vs `*Async` primitive" duality on
  `EvmExecutionRuntime`; the composer calls `execution.<family>.send/sign`, full stop.
- [ ] **One internal vocabulary.** Internal family discriminant is `"evm" | "svm"`
  everywhere (types, registry, runtime, composer); `solana` survives only as
  public adapter method names and the backend wire mapping. Zero `Solana* = Svm*`
  alias exports.
- [ ] **Curated barrel.** `index.ts` exports an explicit named list (~20 symbols);
  no `export *` of `wallet-debug`, `wallet-execution`, `aa/*`, `execution/aa-provider-state`, or `catalog/evm-connector-catalog`. Internals live behind a `wallet-kit/internal` subpath.
- [ ] **No registration foot-gun.** Plugins self-register on import; an
  unregistered `auth.provider` **throws** with a clear message. The consumer never
  calls `registerAomiParaWalletProvider()`.
- [ ] **Clean consumer.** `apps/landing` imports the kit only from
  `@aomi-labs/widget-lib`; no `../../../registry/src` paths and no `providers/para`
  reach in app code. Dev drivers live outside the reference surface.
- [ ] **File sanity.** `providers/para/` ≤ 8 files; no per-provider composer or
  per-provider wagmi config; no `*Only*Provider` ladder in `config/`.

---

## 2. Target folder structure

`(keep)` exists and stays · `(new)` created here · `(del)` deleted · `(merge)`
folded into another file · `(rework)` substantially rewritten.

```txt
lib/wallet-kit/
  index.ts                         (rework)  curated named exports only
  internal.ts                      (new)     subpath barrel for advanced/internal use
  types.ts                         (keep)    AomiWalletKit, AomiSessionIdentity, WalletAccount, WalletFamily="evm"|"svm"
  wallet-family.ts                 (keep)    svm↔solana wire mapping (the ONLY translation point)
  wallet-debug.ts                  (keep)    internal-only (no longer in index.ts)

  config/
    AomiWalletKitProvider.tsx      (rework)  single entry; the 8-provider ladder collapses to entry + one composer wrapper
    presets.ts                     (new)     preset="para"|"privy"|"wallets-only" → lane config
    types.ts                       (keep)    *Config structs (registry-driven provider slice)
    execution.ts                   (keep)    ExecutionConfig normalization

  composer/
    AomiWalletKitComposer.tsx      (rework)  merges runtimes only; SVM glue + EVM exec reassembly removed
    build-identity.ts              (keep)
    build-accounts.ts              (keep)
    merge-wallet-rows.ts           (keep)
    types.ts                       (keep)    AuthRuntime, WalletRuntime<F>, ExecutionRuntime

  catalog/
    evm-connector-catalog.ts       (keep)    createAomiEvmConfig, EVM_PRESETS, WC default
    svm-wallet-catalog.ts          (keep)    Aomi-owned Solana wallet list + presets
    wallet-branding.ts             (keep)    canonicalWalletKey + brand registry
    wallet-ids.ts                  (keep)

  runtime/
    evm/  provider.tsx wallet-runtime.ts brands.ts disconnect-plan.ts
          identity-grace.ts registry-source.ts safe-hooks.ts disabled-runtime.ts   (keep)
    svm/  wallet-runtime.ts        (rework)  becomes useSvmWalletRuntime → WalletRuntime<"svm">
          registry-source.ts       (rework)  pure observer; connect/disconnect become registry commands
          transactions.ts networks.ts                                              (keep)

  execution/
    execution-runtime.ts           (keep)    buildEvmExecutionRuntime + buildSvmExecutionRuntime
    aa-provider-state.ts           (rework)  single resolveAAProviderState({ ownerStrategy })
    wallet-execution.ts            (move)    moved here from root; re-export shim left at old path for registry installs

  aa/
    owner.ts                       (keep)    Aomi owner-input → @aomi-labs/client AAOwner bridge

  registry/
    reducer.ts policy.ts commands.ts store.ts                                       (keep, scar-cleanup)
    selectors.ts persistence.ts types.ts use-wallet-registry.ts                     (keep)
    connection-order.ts            (new)     extracted pure list-algebra from reducer.ts

  account/
    types.ts disabled-runtime.ts   (keep)
    (later) http-runtime.ts        deferred  Better-Auth fetch

  providers/
    plugin-registry.ts             (keep)    WalletProviderPlugin contract + registry
    index.tsx                      (rework)  ≤30-line @deprecated compat shim → AomiWalletKitProvider
    para/
      index.ts                     (rework)  self-registers paraPlugin on import
      para-plugin.tsx              (rework)  wrap + renderComposer only (render path deleted)
      ParaPluginProvider.tsx       (keep)    builds Auth/Execution runtimes
      para-auth.ts                 (keep)
      para-embedded-wallet.ts      (keep)
      para-brand.ts                (keep)
      para-svm.tsx                 (rework)  ParaSvmWrapper + config only; re-export aliases dropped
      sources/para-session-source.ts (keep)
      para.tsx                     (del)     dead second mount path
      para-aa.ts                   (merge)   → execution/aa-provider-state.ts (session-owner contribution only)
    privy/
      index.ts                     (rework)  self-registers privyPlugin on import
      privy-plugin.tsx             (keep)
      privy.tsx                    (rework)  builds lane runtimes; no hand-built adapter
    base-account/
      index.ts base-account.tsx    (keep)    thin @deprecated shim over wallets={evm:{wallets:["baseAccount"]}}
```

---

## 3. Canonical structs (target)

Internal family discriminant is **`WalletFamily = "evm" | "svm"`**. The public
`AomiWalletKit` adapter keeps its existing `solana*` **method names** for API
stability, and `wallet-family.ts` is the single place that maps `svm ↔ solana`
for the backend wire. No other duality.

### Public config (already shipped — keep)

`config/types.ts` stays capability-shaped:
`{ preset?, providers?, auth?, wallets?: { evm, solana, embedded }, execution?, account? }`
with `preset = "para" | "privy" | "wallets-only"`. The provider-named slices
(`providers.para`, `auth.provider:"para"`, etc.) become **registry-driven**: each
plugin contributes its config slice so adding a provider needs no edit here
(Phase 5).

### Symmetric runtime (the target shape both families implement)

```ts
// composer/types.ts
export type WalletRuntime<F extends WalletFamily> = {
  family: F;
  status: "ready" | "unavailable";
  // identity + accounts come from the registry (selectEvmIdentity / selectSvmIdentity)
  identity(now: number): ChainIdentity<F>;
  accounts(now: number): readonly WalletAccount[];
  activeAccount?: WalletAccount;
  options: readonly WalletOption[];                 // connectable wallets for this family
  supportedNetworks: readonly NetworkOption[];
  selectedNetwork?: NetworkOption;
  registryStore: WalletRegistryStore;               // shared store (EVM creates it; SVM is fed the same one)
  connect: (optionId?: string) => Promise<void>;
  disconnect: (accountId?: string) => Promise<void>;
  selectAccount: (accountId: string) => Promise<void>;
  selectNetwork: (networkId: string | number) => Promise<void>;
  execution: ExecutionMethods<F>;                   // { send, sign, signMessage } — AA hidden inside send
};
```

EVM additionally exposes its wagmi primitives behind `execution`; the composer
never re-implements them. SVM implements the same surface; its essential chain
differences (network switch = reconnect; two-step `select()`→`connect()`) live
**inside** `useSvmWalletRuntime`, not in the composer.

### Execution + AA

`ExecutionRuntime = { evm?: EvmExecutionRuntime; svm?: SvmExecutionRuntime; sponsorship }`.
Both expose `{ send, sign, signMessage }` (SVM adds `signAndSendTransaction`).
AA is Aomi's: `execution/wallet-execution.ts` orchestrates the 7702→4337 ladder;
`execution/aa-provider-state.ts` exposes **one** `resolveAAProviderState({ ownerStrategy })`
where `ownerStrategy ∈ { external-wallet, provider-session(session) }`; `aa/owner.ts`
bridges to `@aomi-labs/client`'s `AAOwner`. Para contributes only the
`provider-session` strategy.

### Plugin contract (self-registering)

```ts
// providers/plugin-registry.ts
export type WalletProviderPlugin = {
  id: AuthProviderId;                  // "para" | "privy" | ...
  authMode?: "additive" | "full";
  wrap?(ctx): ReactNode;               // mount the provider's auth context around the shared stack
  renderComposer?(ctx): ReactNode;     // build Auth/Execution runtimes + render the composer
  detectSugar?(input): props | null;   // normalize ergonomic shorthand
  configSlice?(): ProviderConfigSlice; // registry-driven config contribution
};
// Each provider's index.ts calls registerWalletProvider(plugin) as an import side effect.
// getWalletProvider(id) throws on an unknown id when auth.provider names it.
```

`render` is removed from the contract (it was Para's dead path). All providers
mount through the shared catalog stack + `wrap`/`renderComposer`.

---

## 4. Verification toolbox

Phases reference these by id. Run from repo root.

| id | command | asserts |
| --- | --- | --- |
| `V-TYPE` | `pnpm typecheck:landing` and `pnpm --dir apps/registry exec tsc --noEmit` | registry + landing typecheck clean |
| `V-PKG` | `pnpm exec vitest run packages/` | packages suite (≈363) green |
| `V-KIT` | `pnpm --filter @aomi-labs/widget-lib exec vitest run` | registry wallet-kit suite (≈128) green |
| `V-LINT` | `pnpm lint` | lint clean |
| `V-ART` | `pnpm exec vitest run packages/client/test/registry-chain-artifacts.unit.test.ts` | pinned registry artifact paths green |
| `V-BUILD` | `pnpm run build:registry` then sync `apps/registry/dist` → `apps/landing/public/r` | registry artifacts rebuilt + synced |

**Standing rule for every phase that adds/moves/deletes a file under
`lib/wallet-kit/`:** update the relevant item file list in
`apps/registry/src/registry.ts`, run `V-BUILD`, then `V-ART`. A moved file needs a
re-export shim at its old path if any registry item still lists it. Commit per
phase.

---

## 5. Migration phases

Each phase is independently green and committable. Tick the boxes as you go. Do
not start a phase until the previous phase's verification passes.

### Phase 1 — Finish the vocabulary (naming only, zero behavior change) · risk: low

Goal: one internal vocabulary (`svm`), public edge keeps `solana`. No structural
change — pure rename + alias deletion.

- [ ] Set internal `WalletFamily = "evm" | "svm"` in `types.ts`; update registry
  (`activeByFamily`, `RegistryConnection.kind/family`, `svm/changed` writing
  `family:"svm"`), runtime, composer, selectors, persistence to the internal value.
- [ ] Keep public `AomiWalletKit` adapter method names (`solanaWallets`,
  `connectSolanaWallet`, `signSolanaTransaction`, …) and route backend-wire family
  through `wallet-family.ts` (the only `svm↔solana` mapping).
- [ ] Delete the `Solana* = Svm*` alias blocks in
  `runtime/svm/{wallet-runtime,networks,transactions,registry-source}.ts` and the
  deprecated `solana?` prop in `composer/types.ts` / `AomiWalletKitComposer.tsx`
  (the `svmProp ?? solana` line). Remove `WireWalletFamily` duality if present.
- [ ] Keep only aliases that exist on `main`/published npm; drop branch-only ones.
- [ ] Verify: `V-TYPE`, `V-PKG`, `V-KIT`, `V-LINT`. Diff is rename-only.

Done when: `grep -rn "Solana.*= .*Svm\|@deprecated.*solana" lib/wallet-kit/` is empty.

### Phase 2 — Make SVM a real, symmetric runtime · risk: med-high (full symmetry)

Goal: `useSvmWalletRuntime` returns `WalletRuntime<"svm">`; SVM connect/disconnect
become registry commands; SVM identity flows through the registry.

- [ ] Add `svm/connect` and `svm/disconnect` to `RegistryCommand` and
  `CommandExecutors` (`registry/types.ts`, `registry/store.ts`); add a
  `planSvmConnect`/`planSvmDisconnect` path in `policy.ts` mirroring EVM.
- [ ] Add `selectSvmIdentity(now)` selector in `registry/selectors.ts` (mirror of
  `selectEvmIdentity`), reading `activeByFamily.svm`.
- [ ] Rewrite `runtime/svm/wallet-runtime.ts` into `useSvmWalletRuntime` that owns
  the two-step select→connect, the 400 ms autoconnect grace (move
  `SVM_AUTOCONNECT_GRACE_MS` next to the other timing constants), disconnect, and
  network-switch-by-reconnect, and returns the `WalletRuntime<"svm">` shape.
- [ ] Make `runtime/svm/registry-source.ts` a **pure observer** (dispatch
  `svm/changed` only); the connect state machine moves into the runtime/commands.
- [ ] Delete the SVM closures from `AomiWalletKitComposer.tsx`
  (`connectSolanaWallet`, the `disconnect`/`selectNetwork` SVM branches, the
  `svm.wallet.publicKey` identity reads). The composer reads SVM identity from
  `selectSvmIdentity`.
- [ ] Verify: `V-TYPE`, `V-PKG`, `V-KIT` (add/extend SVM runtime hook tests with
  mocked wallet-adapter), `V-LINT`. Manual: Phantom connect + SVM network switch
  still work (Phase 8 matrix rows S1–S3).

Done when: the composer contains no `svm.wallet.*` calls and SVM identity comes
from the registry; SVM connect fires through `planCommands`.

### Phase 3 — Unify execution behind `runtime.execution` · risk: med

Goal: one execution path per family; composer stops re-implementing EVM signing.

- [ ] Move `wallet-execution.ts` under `execution/`; leave a re-export shim at the
  old path for registry installs.
- [ ] Move the inline `executeWalletKitTransaction` wiring out of
  `AomiWalletKitComposer.tsx` (lines ~347–429) into `execution/execution-runtime.ts`
  so `buildEvmExecutionRuntime` returns a populated `send/sign/signMessage`.
- [ ] Delete the never-populated "already-built vs `*Async` primitive" optionality
  on `EvmExecutionRuntime`; the composer calls `execution.evm.send(payload)` etc.
- [ ] Add `buildSvmExecutionRuntime` symmetric `{ send, sign, signMessage,
  signAndSendTransaction }`; the composer calls `execution.svm.*`.
- [ ] Verify: `V-TYPE`, `V-PKG`, `V-KIT`, `V-LINT`. Manual: EVM send tx + sign
  message/typed data unchanged (matrix E5–E7).

Done when: `grep -n "executeWalletKitTransaction" composer/` is empty.

### Phase 4 — De-duplicate AA into one resolver · risk: med

Goal: single AA resolver; Para contributes only a signer strategy.

- [ ] Implement `resolveAAProviderState({ ownerStrategy, walletClient, address, … })`
  in `execution/aa-provider-state.ts` supporting `external-wallet` and
  `provider-session(session)`; one Alchemy/Pimlico precedence (fix the drift).
- [ ] Delete `providers/para/para-aa.ts`; Para passes
  `ownerStrategy: provider-session(paraSession)` into the shared resolver (a
  ≤40-line contribution in the Para plugin).
- [ ] Confirm `aa/owner.ts` still bridges both owner strategies to
  `@aomi-labs/client` `AAOwner`; add the `external-wallet` variant in
  `packages/client/src/aa/owner.ts` if not already present.
- [ ] Verify: `V-TYPE`, `V-PKG` (add "external-wallet 4337, no session" unit test),
  `V-KIT`, `V-ART`, `V-LINT`. Manual: wallets-only AA tx (matrix E5) and Para AA tx.

Done when: `grep -rin "para" execution/` is empty and only one AA resolver exists.

### Phase 5 — Collapse to one public entry + self-registering plugins · risk: med

Goal: one mount path; kill the dead Para path and the registration foot-gun.

- [ ] Delete `providers/para/para.tsx` and `paraPlugin.render`; remove `render`
  from the plugin contract.
- [ ] Make `providers/<id>/index.ts` self-register on import; `getWalletProvider`
  **throws** when `auth.provider` names an unregistered plugin (no silent
  wallets-only fallback). Consumers no longer call `registerAomiParaWalletProvider()`.
- [ ] Collapse the 8 nested providers in `config/AomiWalletKitProvider.tsx` to:
  entry → shared catalog stack (wagmi + SVM + testnet router) → one composer
  wrapper. Rename away `WalletsOnlyComposerProvider` / `EvmWalletsOnlyComposerProvider`.
- [ ] Make `providers/index.tsx`'s `AomiWalletProvider` a ≤30-line `@deprecated`
  shim forwarding into `AomiWalletKitProvider`. Move the SSR `mounted` gate into
  the kit so consumers stop hand-rolling it.
- [ ] Make config provider slices registry-driven (plugins contribute their
  config) so `config/types.ts` no longer hardcodes provider unions for new
  providers.
- [ ] Verify: `V-TYPE`, `V-PKG`, `V-KIT`, `V-ART`, `V-LINT`. Manual: all three
  presets mount (`para`, `privy`, `wallets-only`); forgetting nothing degrades
  silently.

Done when: one entry component; `para.tsx` gone; `grep -rn "registerAomiParaWalletProvider" apps/landing/app` is empty.

### Phase 6 — Registry scar cleanup (on the good core) · risk: low

Goal: consolidate the bug-fix scar tissue; structure unchanged.

- [ ] Single `SUPPRESSION_BYPASS_REASONS` source; remove the 3 hand-synced copies
  (`policy.ts`, `store.ts`, the type union).
- [ ] Merge the two near-duplicate heal-eligibility predicates into one
  parameterized function (`policy.ts`).
- [ ] Compute the heal budget once; remove the reducer↔commands double-accounting
  (`reducer.ts` `wagmi/settled` pre-spend + `commands.ts` reconstruction).
- [ ] Extract connection-order list-algebra (`reducer.ts`) into
  `registry/connection-order.ts`.
- [ ] Verify: `V-PKG`, `V-KIT` (reducer/policy/store suites), `V-LINT`. Manual:
  Para cancel-login no-wipe regression holds (matrix E8).

Done when: reducer is ~150 lines lighter and no suppression-reason list is duplicated.

### Phase 7 — Barrel hygiene + consumer DX + dev-driver relocation · risk: low

Goal: the reference consumer looks like a real consumer.

- [ ] Rewrite `index.ts` as ~20 explicit named exports; move `wallet-debug`,
  `wallet-execution`, `aa/*`, `execution/aa-provider-state`, `catalog/evm-connector-catalog`
  behind `wallet-kit/internal.ts` (a non-default subpath, added to
  `apps/registry/package.json` `exports` only if a subpath is truly needed).
- [ ] Ship a Solana-networks preset helper so consumers stop copy-pasting the
  30-line array (currently duplicated across landing providers).
- [ ] Switch `apps/landing` to import the kit only from `@aomi-labs/widget-lib`;
  remove `../../../registry/src` paths and any `providers/para` reach in app code.
- [ ] Relocate `apps/landing/app/dev/**` + `apps/landing/components/dev/**` out of
  the reference surface (fenced `apps/landing-dev` or a clearly-marked folder);
  delete the stale `NOTE.md` referencing the removed `LandingParaProvider` and the
  stray screenshot in `app/`.
- [ ] Verify: `V-TYPE`, `V-KIT`, `V-LINT`, `V-ART`, `V-BUILD`. Confirm landing
  builds and the hero demo renders.

Done when: `grep -rn "registry/src\|providers/para" apps/landing/app apps/landing/components` is empty (dev folder excluded) and `index.ts` has no `export *` of internals.

### Phase 8 — Whole-migration gate + manual landing matrix · risk: gate

Run the full suite, re-check every architecture invariant, rebuild artifacts,
then drive the manual matrix on landing.

Automated gate:

- [ ] `V-TYPE` `V-PKG` `V-KIT` `V-LINT` `V-ART` all green.
- [ ] `V-BUILD` run; `apps/registry/dist` synced to `apps/landing/public/r`; `V-ART` green after sync.

Architecture invariant re-check (Section 1 — all must pass):

- [ ] `grep -riE "\bpara\b|\bprivy\b" lib/wallet-kit/runtime lib/wallet-kit/composer lib/wallet-kit/registry lib/wallet-kit/catalog lib/wallet-kit/execution` → empty.
- [ ] `grep -rn "executeWalletKitTransaction\|svm\.wallet\." lib/wallet-kit/composer` → empty.
- [ ] No `Solana* = Svm*` alias exports; internal family is `"evm" | "svm"`.
- [ ] One entry component; `para.tsx` and `paraPlugin.render` deleted; one AA resolver; `index.ts` curated.
- [ ] `providers/para/` ≤ 8 files; no `*Only*Provider` ladder in `config/`.
- [ ] Unregistered provider throws (write a quick test or assert manually).

Manual landing matrix (extensions required — `pnpm --filter landing dev`):

| id | scenario | expected |
| --- | --- | --- |
| E1 | Para Google login | connects, identity shows Para |
| E2 | Para email login | connects |
| E3 | Para + MetaMask, set MetaMask active, refresh | stays MetaMask (registry-owned active) |
| E4 | WalletConnect connect in `wallets-only` (no hosted auth) | QR modal, connects as real account |
| E5 | Send tx, external-wallet 4337, no Para session | succeeds via shared AA resolver |
| E6 | Sign typed data + sign message (EVM) | succeed |
| E7 | Coinbase / installed injected wallet connect | connects |
| E8 | Open Para login with MetaMask connected, cancel | MetaMask survives (no wipe) |
| S1 | Phantom (SVM) connect | connects via `useSvmWalletRuntime` |
| S2 | SVM network switch (cluster) | reconnects to new cluster |
| S3 | SVM sign tx / sign message | succeed |
| D1 | Disconnect single family, then all | family-selective then full clear |
| P1 | `/privy` route: auth + embedded + external wallet | all work through the one composer path |

Done when: every box above is ticked and STATE.md records the completed migration.

---

## 6. Distribution & deferred

**Distribution constraints.** Two channels: npm (`@aomi-labs/widget-lib`,
`@aomi-labs/react`, `@aomi-labs/client`) and the shadcn-style registry
(`apps/registry/dist/*.json` → `apps/landing/public/r`). Every new/moved file
under `lib/wallet-kit/` updates `apps/registry/src/registry.ts`, rebuilds dist
(`V-BUILD`), syncs `public/r`, and keeps `V-ART` green. Public npm exports in
`apps/registry/src/index.ts` must expose the curated `AomiWalletKit*` surface plus
the `main`-shipped legacy aliases. The legacy `detached-para` persistence key and
`paraDetached` migration field stay as frozen core migration identifiers (moving
them would regress a wallets-only build opened after a Para session) — they are
the one tolerated provider-named token in `registry/persistence.ts`, documented as
such.

**Deferred (out of this migration):** real Account Runtime over Better Auth
(`account/http-runtime.ts`); `/api/state` payload migration for
`auth_provider`/`embedded_provider`; approval/capability enforcement; SIWE /
`kind:"wallet"` auth; two concurrent live embedded SDKs; host-owned `WagmiProvider`
adoption; optional `wallet-kit/ → aomi-wallet-kit/` folder rename.

---

## 7. Success criteria (one-line summary)

The kit has **one** public entry, **symmetric** EVM/SVM runtimes, **one** internal
family vocabulary, **one** AA resolver, **one** execution path, a **curated**
barrel, **self-registering** plugins that throw on misconfig, **no** provider names
in core, and a landing app that imports only `@aomi-labs/widget-lib` — with the
registry core intact and every box in Phase 8 ticked.

---

## Appendix A — Target structs & worked examples

Concrete end-state shapes so the result is reviewable before it is built. These
are **target** definitions; where a struct is unchanged from today it is marked
`(unchanged)`. Field names mirror the real current code so the diff stays small.

### A.1 — Vocabulary & value types

```ts
// types.ts — internal vocabulary is evm|svm; "solana" survives only at the
// public adapter edge + the backend wire (wallet-family.ts).
export type WalletFamily = "evm" | "svm";

// Per-family identity. EVM mirrors today's selectEvmIdentity return; SVM is the
// new symmetric mirror produced by selectSvmIdentity.
export type ChainIdentity<F extends WalletFamily> = F extends "evm"
  ? { address?: string; chainId?: number; connectorId?: string;
      walletName?: string; walletSource?: WalletSource }
  : { address?: string; walletName?: string; cluster?: SvmCluster;
      transport?: "extension" | "embedded" | "mwa";
      capabilities?: SvmSigningCapabilities };

// Per-family network option. EVM = viem Chain; SVM = SvmNetworkOption.
export type NetworkOption<F extends WalletFamily> =
  F extends "evm" ? Chain : SvmNetworkOption;

export type WalletAccount = AomiAccount;   // (unchanged) { id, family, address, walletName?, active, manageable?, linked?, ... }
export type WalletOption  = AomiWalletOption; // (unchanged) { id, connectorId?, label, family, kind, status, installed?, ready?, ... }
```

### A.2 — The symmetric runtime (the core of full symmetry)

Both families implement the **same** `WalletRuntime<F>`. Identity and accounts
come from the registry selectors; connect/disconnect go through `planCommands`;
execution is fully built (AA hidden inside `send`). Family-specific plumbing
(wagmi connectors, the SVM select→connect dance) lives **inside** the hook, never
in the composer.

```ts
// composer/types.ts (target)
export type WalletRuntime<F extends WalletFamily> = {
  family: F;
  status: "ready" | "unavailable";
  registryStore: WalletRegistryStore;          // EVM creates it; SVM is fed the same store
  identity: (now: number) => ChainIdentity<F>;  // from selectEvmIdentity / selectSvmIdentity
  accounts: (now: number) => readonly WalletAccount[];
  activeAccount?: WalletAccount;
  options: readonly WalletOption[];             // connectable wallets for this family
  supportedNetworks: readonly NetworkOption<F>[];
  selectedNetwork?: NetworkOption<F>;
  connect: (optionId?: string) => Promise<void>;
  disconnect: (accountId?: string) => Promise<void>;
  selectAccount: (accountId: string) => Promise<void>;
  selectNetwork: (network: string | number) => Promise<void>;
  execution: ExecutionMethods<F>;               // { send, sign, signMessage } — see A.3
};

export type EvmWalletRuntime = WalletRuntime<"evm">;
export type SvmWalletRuntime = WalletRuntime<"svm">;
```

EVM today already exposes ~all of this under different names — the rename map:

| today (`EvmWalletRuntime`) | target (`WalletRuntime<"evm">`) |
| --- | --- |
| `selectEvmIdentity(now)` | `identity(now)` |
| `selectAccounts(now)` | `accounts(now)` |
| `evmWalletOptions` | `options` |
| `connectEvmWallet(id)` | `connect(id)` |
| `disconnectEvmAccount(acc)` | `disconnect(acc.id)` |
| `selectEvmAccount(id)` | `selectAccount(id)` |
| `switchEvmChain(chainId)` | `selectNetwork(chainId)` |
| `supportedChains` | `supportedNetworks` |
| `walletClient`, `getWalletClientFor`, `*Async`, `capabilities`, `activeConnector`, `chainsById` | move behind `execution` (consumed by `buildEvmExecutionRuntime`, not the composer) |

SVM today (`SafeSvmWalletState` — a raw wallet-adapter passthrough assembled in 3
places) becomes a real hook that wraps that adapter:

```ts
// runtime/svm/wallet-runtime.ts (target)
export function useSvmWalletRuntime(opts: {
  registryStore: WalletRegistryStore;
  selectedNetwork?: SvmNetworkOption;
  supportedNetworks: readonly SvmNetworkOption[];
  setSelectedNetworkId: (id: string) => void;
}): WalletRuntime<"svm"> {
  const adapter = useSafeSvmWallet();          // existing thin passthrough
  useSvmRegistrySource(opts.registryStore, { adapter }); // now a PURE observer (dispatches svm/changed only)

  const connect = useCallback(async (walletName?: string) => {
    // the two-step select()->connect() + 400ms grace dance moves HERE,
    // and fires a registry command instead of calling adapter.connect() inline:
    opts.registryStore.dispatch({ type: "svm/connect-requested", walletName, now: Date.now() });
  }, [opts.registryStore]);

  const selectNetwork = useCallback(async (networkId: string) => {
    // SVM switches cluster by reconnect (essential chain difference, kept internal)
    if (adapter.publicKey && adapter.disconnect) await adapter.disconnect();
    opts.setSelectedNetworkId(String(networkId));
  }, [adapter, opts]);

  return useMemo<WalletRuntime<"svm">>(() => ({
    family: "svm",
    status: adapter ? "ready" : "unavailable",
    registryStore: opts.registryStore,
    identity: (now) => selectSvmIdentity(opts.registryStore.getState(), now),
    accounts: (now) => selectAccounts(opts.registryStore.getState(), now)
                        .filter((a) => a.family === "svm"),
    options: buildSvmWalletOptions(adapter),
    supportedNetworks: opts.supportedNetworks,
    selectedNetwork: opts.selectedNetwork,
    connect,
    disconnect: async () => { adapter.disconnect && (await adapter.disconnect());
      opts.registryStore.dispatch({ type: "user/disconnect-family", family: "svm", now: Date.now() }); },
    selectAccount: async () => {},               // single SVM account per wallet today
    selectNetwork,
    execution: buildSvmExecutionRuntime(adapter, opts.selectedNetwork),
  }), [adapter, connect, selectNetwork, opts]);
}
```

### A.3 — Execution + AA

```ts
// composer/types.ts (target) — symmetric per family
export type ExecutionMethods<F extends WalletFamily> = F extends "evm"
  ? {
      send:        (p: WalletTxPayload) => Promise<AomiTxResult>;        // AA ladder hidden inside
      sign:        (p: WalletEip712Payload) => Promise<{ signature: string }>;
      signMessage: (p: WalletEip712Payload) => Promise<{ signature: string }>;
    }
  : {
      send:                (p: WalletSolanaSignPayload) => Promise<{ signature: string; signedTx?: string }>;
      sign:                (p: WalletSolanaSignPayload) => Promise<{ signedTx: string }>;
      signMessage:         (p: WalletSolanaSignMessagePayload) => Promise<{ signature: string }>;
      signAndSendTransaction?: (p: WalletSolanaSignPayload) => Promise<{ signature: string; signedTx?: string }>;
    };

export type ExecutionRuntime = {
  evm?: ExecutionMethods<"evm">;
  svm?: ExecutionMethods<"svm">;
  sponsorship: SponsorshipState;     // (unchanged) sponsored / sponsorProvider / sponsorAccount
};
```

One AA resolver replaces the `aa-provider-state.ts` ⊕ `para-aa.ts` duplication.
The provider contributes only the **owner strategy**:

```ts
// execution/aa-provider-state.ts (target) — ONE function
export type AAOwnerStrategy =
  | { kind: "external-wallet" }                       // wallets-only / Privy / Base
  | { kind: "provider-session"; session: unknown };   // Para supplies this

export function resolveAAProviderState(args: {
  ownerStrategy: AAOwnerStrategy;
  requestedMode: "4337" | "7702";
  walletClient?: WalletClient;
  address?: Hex;
  // ...env-driven Alchemy/Pimlico selection (ONE precedence — fix the drift)
}): Promise<AAProviderState>;

// providers/para/ParaPluginProvider.tsx — Para's ENTIRE AA contribution (~10 lines)
const aaOwner: AAOwnerStrategy = paraSession
  ? { kind: "provider-session", session: paraSession }
  : { kind: "external-wallet" };
// ...passed into buildEvmExecutionRuntime; everything else is shared.
```

### A.4 — Registry deltas (make SVM first-class)

```ts
// registry/types.ts (target) — two new commands
export type RegistryCommand =
  | { kind: "wagmi/reconnect"; stableIds: string[] }
  | { kind: "wagmi/connect"; stableId: string }
  | { kind: "wagmi/disconnect"; uid: string }
  | { kind: "svm/connect"; walletName: string }     // NEW
  | { kind: "svm/disconnect" }                       // NEW
  | { kind: "provider/logout" }
  | { kind: "persist" }
  | { kind: "debug"; event: string; data?: Record<string, unknown> };

// registry/store.ts (target) — executors gain SVM verbs
export type CommandExecutors = {
  wagmiReconnect: (stableIds: string[]) => Promise<void> | void;
  wagmiConnect:   (stableId: string) => Promise<void> | void;
  wagmiDisconnect:(uid: string) => Promise<void> | void;
  svmConnect:     (walletName: string) => Promise<void> | void;   // NEW
  svmDisconnect:  () => Promise<void> | void;                      // NEW
  providerLogout: () => Promise<void> | void;
};

// registry/selectors.ts (target) — mirror of selectEvmIdentity
export function selectSvmIdentity(
  state: WalletRegistryState, now: number,
): { address?: string; walletName?: string; cluster?: SvmCluster;
     transport?: "extension" | "embedded" | "mwa"; capabilities?: SvmSigningCapabilities } {
  const active = findActiveConnection(state, "svm");
  return active
    ? { address: active.address, walletName: active.walletName, /* ...transport/caps */ }
    : {};
}
```

`policy.ts` consumes the existing `svm/connect-requested` intent and emits a
`svm/connect` command (today the SVM source calls `adapter.connect()` itself —
that imperative call is deleted). `svm/registry-source.ts` becomes a pure observer
that only dispatches `svm/changed`, exactly like `useWagmiRegistrySource`.

### A.5 — Plugin contract (final) + Para example

```ts
// providers/plugin-registry.ts (target) — `render` removed; configSlice added
export type WalletProviderPlugin = {
  id: string;                                   // "para" | "privy" | ...
  authMode?: "additive" | "full";
  wrap?: (ctx: { auth?: AuthConfig; providers?: ProvidersConfig; children: ReactNode }) => ReactNode;
  renderComposer?: (ctx: RenderComposerCtx) => ReactNode;
  detectSugar?: (input: AomiWalletKitProviderInput) => AomiWalletKitProviderProps | null;
  configSlice?: () => ProviderConfigSlice;      // registry-driven config contribution
};

export function requireWalletProvider(id: string): WalletProviderPlugin {
  const plugin = registry.get(id);
  if (!plugin) {
    throw new Error(
      `[aomi-wallet-kit] auth.provider "${id}" is not registered. ` +
      `Add \`import "@aomi-labs/widget-lib/providers/${id}"\` (it self-registers), ` +
      `or use a preset that bundles it.`,
    );
  }
  return plugin;
}
```

```tsx
// providers/para/para-plugin.tsx (target) — wrap + renderComposer only; render block deleted
export const paraPlugin: WalletProviderPlugin = {
  id: "para",
  authMode: "additive",
  wrap: (props) => <ParaAuthLayer {...props} />,
  renderComposer: (ctx) => <AomiParaPluginProvider {...ctx} />, // builds Auth + Execution(owner=session) runtimes
  detectSugar: (input) => /* unchanged */ null,
};

// providers/para/index.ts (target) — SELF-REGISTERS on import; no exported register fn for consumers
import { registerWalletProvider } from "../plugin-registry";
import { paraPlugin } from "./para-plugin";
registerWalletProvider(paraPlugin);
export { /* public Para types only */ };
```

Consumers register a provider by **importing** it (discoverable, tree-shakeable):
`import "@aomi-labs/widget-lib/providers/para"`. Presets pull the matching import
internally. A forgotten provider now **throws** (via `requireWalletProvider`)
instead of silently degrading.

### A.6 — Single entry point: before → after

```tsx
// BEFORE — config/AomiWalletKitProvider.tsx: 8 nested components, names that lie
AomiWalletKitProvider
  └─ AomiWalletsOnlyProvider
       └─ AomiEvmWalletsOnlyProvider            // mounts wagmi + SVM + testnet router
            └─ MaybeSvmWalletProvider
                 └─ FullTestnetWalletRouter
                      └─ paraPlugin.wrap → ParaAuthLayer
                           └─ paraPlugin.renderComposer → AomiParaPluginProvider
                                └─ AomiWalletKitComposer
// + a SECOND path: providers/index.tsx AomiWalletProvider union → AomiParaProvider (para.tsx, DEAD)

// AFTER — one path, honest names
AomiWalletKitProvider
  └─ WalletKitStack            // wagmi catalog + SVM adapters + testnet router + SSR gate (kit-owned)
       └─ <plugin.wrap>        // provider auth context (or pass-through for wallets-only)
            └─ <plugin.renderComposer>  // builds auth + execution lanes
                 └─ AomiWalletKitComposer
// providers/index.tsx is a ≤30-line @deprecated shim → AomiWalletKitProvider
```

### A.7 — The composer: before → after (the headline win)

```tsx
// BEFORE — AomiWalletKitComposer.tsx: ~280-line useMemo that RE-IMPLEMENTS execution
const adapter = useMemo<AomiWalletKit>(() => {
  // ...reads svm.wallet.publicKey directly for identity
  // ...hand-builds connectSolanaWallet via svm.wallet.select!/connect
  // ...sendTransaction: re-assembles executeWalletKitTransaction({ state:{ sendCallsSyncAsync,
  //     sendTransactionAsync, switchChainAsync, resolveAAProviderState, forceAA, aaModes... }})
  // ...signTypedData / signMessage: re-derive viem args + inject activeConnector
}, [/* 18 deps */]);

// AFTER — pure merge of two symmetric runtimes; zero execution logic
const adapter = useMemo<AomiWalletKit>(() => {
  const evmId = evm.identity(now);
  const svmId = svm?.identity(now);
  return {
    identity: buildWalletKitIdentity({ auth, evm: evmId, svm: svmId, execution }),
    accounts: [...evm.accounts(now), ...(svm?.accounts(now) ?? [])],
    walletModalRows: mergeWalletRows({ evm, svm, auth, account }),
    connect:    (o) => (o?.family === "svm" ? svm! : evm).connect(),
    disconnect: (o) => routeDisconnect(o, evm, svm, auth),
    selectAccount: (id) => runtimeFor(id, evm, svm).selectAccount(id),
    selectNetwork: (t)  => (t.family === "svm" ? svm! : evm).selectNetwork(networkOf(t)),
    // public solana-named methods map straight onto the runtimes:
    sendTransaction:  execution.evm?.send,
    signTypedData:    execution.evm?.sign,
    signMessage:      execution.evm?.signMessage,
    signSolanaTransaction:     execution.svm?.sign,
    signSolanaMessage:         execution.svm?.signMessage,
    sendSolanaTransaction:     execution.svm?.send,
    signAndSendSolanaTransaction: execution.svm?.signAndSendTransaction,
    // ...canConnect/canDisconnect/supportedNetworks derived from the runtimes
  };
}, [auth, evm, svm, execution, account]);
```

### A.8 — Consumer (landing): before → after

```tsx
// BEFORE — apps/landing/app/components/landing-wallet-kit-provider.tsx
import { AomiWalletKitProvider, registerAomiParaWalletProvider }
  from "../../../registry/src";          // deep relative path into the package source
registerAomiParaWalletProvider();         // bare side effect; forget it → silent wallets-only
const [mounted, setMounted] = useState(false);   // hand-rolled SSR gate
useEffect(() => setMounted(true), []);
if (!mounted) return null;
// ...30-line solanaNetworks array copy-pasted from the Privy provider

// AFTER
import { AomiWalletKitProvider, solanaPreset } from "@aomi-labs/widget-lib";
import "@aomi-labs/widget-lib/providers/para";   // discoverable, self-registers, tree-shakeable
// no mounted gate (kit owns SSR), no registration call, no copy-pasted network array
<AomiWalletKitProvider
  preset="wallets-only"
  auth={{ provider: "para", methods: ["google", "email", "wallet"] }}
  providers={{ para: { apiKey, environment, appName: "Aomi Labs" } }}
  wallets={{ evm: { preset: "popular", chains, walletConnectProjectId },
             solana: solanaPreset("mainnet", "devnet") }}
  execution={{ aa: "optional", owner: "external-wallet" }}
/>
```

### A.9 — Worked example: add a new auth provider (seam #1)

Everything is contained in one folder; **no core edit**:

```txt
providers/dynamic/
  index.ts              registerWalletProvider(dynamicPlugin)   // self-register on import
  dynamic-plugin.tsx    { id:"dynamic", authMode, wrap, renderComposer, detectSugar }
  dynamic-auth.ts       login/methods/credential (provider-specific)
  dynamic-embedded.ts   embedded wallet → WalletAccount[] (source:"embedded")
```

```tsx
export const dynamicPlugin: WalletProviderPlugin = {
  id: "dynamic",
  authMode: "additive",
  wrap: ({ children, providers }) => <DynamicAuthContext {...providers?.dynamic}>{children}</DynamicAuthContext>,
  renderComposer: (ctx) => (
    <AomiWalletKitComposer
      auth={buildDynamicAuthRuntime()}            // the lane it fills
      evm={ctx.evm} svm={ctx.svm}                 // shared runtimes — unchanged
      execution={buildEvmExecutionRuntime(ctx.evm, { aaOwner: { kind: "external-wallet" } })}
      supportedChains={ctx.supportedChains}
    >{ctx.children}</AomiWalletKitComposer>
  ),
};
```

Consumer: `import "@aomi-labs/widget-lib/providers/dynamic"` + `auth={{ provider:"dynamic" }}`.
The registry, catalog, composer, runtimes, execution, and config types are untouched.

### A.10 — Worked example: add a new ecosystem / VM (seam #2)

Add `"tvm"` to `WalletFamily`, implement one runtime + family-keyed commands:

```txt
runtime/tvm/
  wallet-runtime.ts     useTvmWalletRuntime(): WalletRuntime<"tvm">   // same shape as EVM/SVM
  registry-source.ts    pure observer → dispatch tvm/changed
  networks.ts transactions.ts
catalog/tvm-wallet-catalog.ts
```

Registry additions mirror SVM exactly: `tvm/connect` / `tvm/disconnect` commands,
`tvmConnect` / `tvmDisconnect` executors, `selectTvmIdentity` selector,
`activeByFamily.tvm`. The composer already merges "all runtimes" generically
(A.7), so it does not change; the picker renders the new family from
`accounts`/`walletModalRows` with no special-casing. This is the payoff of
symmetry: a third VM is additive, not a fork.
