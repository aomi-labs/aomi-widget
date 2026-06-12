# Wallet Registry Refactor — Execution Plan

> Written 2026-06-11, branch `polish-multi-wallet`. This is the executable companion to
> **`WALLET-ARCHITECTURE.md`** (read it first — especially §4, §9, §12). That document is
> the *why*; this one is the *how*, phase by phase, for an executor agent.
>
> **Mission:** replace the derived/fought-over wallet state in
> `apps/registry/src/lib/aomi-auth-adapter/providers/para/` with a single owned
> `WalletRegistry` store (pure reducer + event sources + explicit-connector signing),
> **preserving all existing functionality**: Para social sign-in/sign-out, external EVM
> wallets (MetaMask/Rabby/Phantom-EVM/Coinbase/Rainbow/WalletConnect), Solana wallets,
> account abstraction (7702/4337, sponsorship), network switching, the picker UI, the
> backend contract, and the CLI.

---

## Confirmed scope decisions (user, 2026-06-11)

These are settled — the executor must not re-open them:

1. **PR scope = full core path: Phases 0–7 + 9 in this PR.** Not the 0–4 short version.
2. **Phase 8 (Privy demo route) IS in scope**, as a stretch at the end — the `/privy` route
   + manual rows against it. The optional "Privy on the registry" sub-step (8.3) remains
   skip-unless-cheap.
3. **AA policy unchanged**: AA only with a Para session present (embedded → 7702/4337,
   external + session → 4337, no session → EOA). No Para-free AA work in this PR.
4. **Connector plumbing unchanged**: keep the Para-branded external wallet list as-is; no
   EIP-6963 consolidation spike. The registry makes duplicate connectors harmless; revisit
   consolidation in a later PR with shadow data.

## 0. How to use this plan

- Execute phases **in order**. Every phase ends with the repo **green** (tests, typecheck,
  lint) and is **independently committable and revertable**. Do not start phase N+1 with
  phase N uncommitted.
- After each phase: run the [verification baseline](#verification-baseline), run the listed
  rows of the [manual test matrix](#phase-0--baseline--manual-test-matrix), update
  `specs/STATE.md` (project convention), commit with the given message.
- When this plan and reality disagree (an API doesn't exist, a type doesn't match), **stop
  and re-read the actual source** before improvising — the current code is full of
  load-bearing subtleties (see [Gotchas](#gotchas-load-bearing-subtleties)). Update the plan
  file itself when you deviate, so it stays the source of truth.
- Anything in the [DO-NOT-TOUCH list](#do-not-touch-list) is out of bounds unless a phase
  explicitly names it.

### Verification baseline

Run from repo root unless noted. These are the exact commands; all were verified green at
plan time (2026-06-11):

```bash
cd apps/registry && pnpm exec vitest run     # registry suite — 67 tests green at baseline
cd apps/registry && pnpm exec tsc --noEmit   # registry typecheck — clean at baseline
pnpm exec vitest run                          # root packages suite (~360 tests)
pnpm lint                                     # eslint
pnpm run typecheck:landing                    # landing app typecheck
```

Manual testing dev server: `pnpm run dev:landing:live` (lib watch + landing at :3000).
Wallet debug tracing: in the browser console set
`localStorage["aomi.wallet.debug"] = "1"` and filter console for `[aomi-wallet]`.

Registry artifacts (only when a phase says so — Phase 7):

```bash
pnpm run build:registry                          # rebuild apps/registry/dist
cp -r apps/registry/dist/. apps/landing/public/r/   # sync committed artifact snapshot
pnpm exec vitest run packages/client/test/registry-chain-artifacts.unit.test.ts
```

### DO-NOT-TOUCH list

These must not be modified at any phase (Phase 8/9 exceptions noted inline):

| Path | Why |
|---|---|
| `apps/registry/src/lib/aomi-auth-adapter/types.ts` | The adapter contract. **Additive changes only** (Phase 9 adds optional fields). Never change/remove existing members — picker, tx handler, privy, base-account all compile against it. |
| `apps/registry/src/components/runtime-tx-handler.tsx` | Provider-blind consumer. If it needs changes, the adapter implementation is wrong. |
| `apps/registry/src/components/control-bar/wallet-picker.tsx`, `dual-wallet-bar.tsx`, `network-select.tsx`, `connect-button.tsx`, `wallet-picker-context.tsx` | UI is fine; it keeps working through the contract. |
| `packages/client/**` (AA core, CLI, session, user-state) | Shared contract with CLI/backend. Nothing here needs to change. |
| `packages/react/**` (user context, wallet handler, runtime) | Backend sync contract. Unchanged. |
| `apps/registry/src/lib/aomi-auth-adapter/context.tsx` | identity→UserState sync. Unchanged. |
| `providers/base-account/base-account.tsx` | Separate provider, simple lifecycle, works. |
| `providers/privy/privy.tsx` | Untouched until Phase 8 (it must keep compiling all along, which it will if types.ts is only extended). |
| `network-preferences.tsx`, `persistence.ts` (wallet-preferences), `full-testnet-wallet-routing.tsx`, `use-wallet-activation-guard.ts`, `solana-networks.ts`, `wallet-family.ts`, `identity.ts` | Already-extracted, working modules. Reused as-is. |
| `wallet-brands.ts`, `accounts.ts`, `evm-identity-grace.ts`, `evm-disconnect-plan.ts` | Pure + tested. **Reused inside the registry**, not rewritten. Small additive exports allowed. |
| Backend payload shapes (`wallet:state_changed`, `wallet_tx_request/complete`, `UserState`) | Backend + CLI contract. |

### Functional invariants (the "must still work" checklist)

Everything below works today and must work after every phase:

1. Para sign-in via Google/email modal; Para sign-out (per-row and family-wide) that sticks
   across refresh; Para account modal ("manage" gear).
2. MetaMask / Rabby / Coinbase / Rainbow connect from the picker; WalletConnect handoff;
   Phantom-EVM connect (EIP-6963 path); correct brand labels (Rabby ≠ MetaMask) and one row
   per address.
3. Phantom/Solflare/Backpack/Glow Solana connect (first click works, dismissed popup
   doesn't re-pop), Solana sign/send through the tx handler, cluster switch with confirm.
4. Multi-wallet: several EVM connections at once, user-chosen active per family, choice
   survives refresh, sign-out of one never kills the others.
5. AA: sponsored/unsponsored sends, 7702 with embedded Para wallet, 4337 fallback with
   external signer, fee-append after simulation, `wallet_tx_complete` carries
   `executionKind/sponsored/SmartAccount4337/Delegation7702`.
6. EIP-712 sign with auto chain-switch; EVM network switch with no flash loop and no
   duplicate `wallet_switchEthereumChain` popups.
7. `identity` object fields (incl. `walletProvider`, `authMethod`, `authValue`,
   `manageable` accounts, `sponsored`/`sponsorProvider`) — picker's social-row gating and
   the backend envelope read these.
8. Full-testnet routing (`NEXT_PUBLIC_USE_FULL_TESTNET`) keeps functioning.
9. `getAccountCredential()` (Para JWT issuance) keeps functioning.

---

## Phase 0 — Baseline + manual test matrix

**Goal:** freeze current behavior into a written checklist so every later phase has a
regression bar. No production code changes.

**Files:**
- CREATE `docs/wallet-test-matrix.md`

**Steps:**

1. Create `docs/wallet-test-matrix.md` with the table below. Each row: ID, steps, expected,
   "needs extensions" flag, and a column per phase to record pass/fail.

| ID | Scenario | Expected |
|---|---|---|
| M1 | Fresh load → connect MetaMask → refresh | MM connected + active after refresh, no popups |
| M2 | Connect MetaMask + Para (Google) → set MM active in picker → refresh | MM stays active; Para still connected; no flapping (watch `[aomi-wallet]`) |
| M3 | With Para active, click MetaMask row once | switch sticks on FIRST click, no revert |
| M4 | Rabby connected → sign in with Para (Google) | Rabby survives (or auto-heals ≤2s); no MM/Rabby extension popups beyond the 2-budget |
| M5 | Para + MM connected → per-row sign out Para | MM survives; refresh → Para STAYS signed out, MM intact |
| M6 | Two EVM wallets → per-row disconnect one → refresh | disconnected one stays gone, other intact |
| M7 | Phantom-EVM connect from picker | connects on first click |
| M8 | Phantom-Solana connect; then retry after dismissing the popup | first click works; dismiss doesn't re-pop the popup |
| M9 | EVM network switch (Base→Arbitrum→Base) | wallet approves, no flash loop, switcher stays alive, no −32002 dup popups |
| M10 | SVM cluster switch (Mainnet→Devnet) | confirm dialog, reconnect works, EVM untouched |
| M11 | Backend tx request → EVM send (Para embedded, sponsored if env set) | tx executes, AA fields in result; check `wallet_tx_complete` in network tab |
| M12 | Backend tx request → EVM send with EXTERNAL wallet active | EOA or 4337 path executes with the ACTIVE wallet (not Para) |
| M13 | Backend eip712 request with different domain.chainId | auto chain-switch, then signs |
| M14 | Backend Solana sign request | signed via wallet-adapter |
| M15 | Rabby + MetaMask both installed, both connected | correct brand per row, one row per address, per-row disconnect surgical |
| M16 | `disconnect({family:"all"})` (picker "sign out" all) | everything gone incl. Para session; refresh stays clean |

2. Run the matrix once on current HEAD; record results as the baseline column (preview
   tools cannot install wallet extensions — these rows are for the human/user to run; the
   executor's job is to keep the doc updated and flag which rows each phase invalidates).

**Verify:** baseline commands green (no code changed).
**Commit:** `docs: add wallet manual test matrix (refactor baseline)`

---

## Phase 1 — Registry core (pure, unwired)

**Goal:** the `WalletRegistry` exists as a fully unit-tested pure core: types, reducer,
policies, command planner, persistence, store class. **Nothing imports it yet.**

**Files (all new):**

```
apps/registry/src/lib/aomi-auth-adapter/registry/
├── types.ts
├── reducer.ts
├── policy.ts
├── commands.ts
├── persistence.ts
├── store.ts
├── reducer.test.ts
├── policy.test.ts
├── persistence.test.ts
└── store.test.ts
```

**Step 1.1 — `registry/types.ts`.** Define exactly:

```ts
import type { WalletFamily } from "../types";

/** Runtime id vs stable id: wagmi connector `uid` is REGENERATED every page load;
 *  `connector.id` (e.g. "para", "io.metamask", "metaMaskSDK", "walletConnect") is stable
 *  across loads. Persist stable ids + addresses; resolve uids at runtime. */
export type RegistryConnection = {
  key: string;                  // `${family}:${uid}` — unique per live connection
  family: WalletFamily;
  uid: string;                  // wagmi connector uid | solana wallet name
  stableId: string;             // wagmi connector.id | solana wallet name
  kind: "para" | "external-evm" | "walletconnect" | "solana";
  address: string;              // lowercased 0x… | base58 (NOT lowercased for solana)
  addresses: string[];          // all accounts exposed by the connector (evm)
  chainId?: number;
  walletName?: string;          // sniffed brand ("Rabby" not "MetaMask") when known
};

export type ActiveRef = {
  family: WalletFamily;
  address: string;
  uid?: string;                 // resolved at runtime, never persisted
  stableId?: string;            // persisted hint to disambiguate same-address connectors
};

export type RegistryPhase = "booting" | "settling" | "stable" | "rebuilding";

export type EvmGraceState = {
  last: { address: string; chainId?: number; connectorId?: string; walletName?: string } | null;
  disconnectedAt: number | null;   // mirrors evm-identity-grace semantics EXACTLY
};

export type WalletRegistryState = {
  phase: RegistryPhase;
  connections: RegistryConnection[];
  activeByFamily: Partial<Record<WalletFamily, ActiveRef>>;
  /** user intent — survives refresh (persisted) */
  intents: {
    droppedAddresses: string[];          // lowercased evm addresses user signed out
    paraDetached: boolean;               // para wallet locally detached, session may live
    explicitFamilyDisconnect: Partial<Record<WalletFamily, boolean>>;
  };
  heal: {
    expected: Array<{ stableId: string; address: string }>;  // external evm conns to restore
    reattachBudget: number;              // POPUP_REATTACH_BUDGET = 2, per page load
    suppressedUntil: number | null;      // epoch ms; REATTACH_SUPPRESSION_MS = 300_000
    suppressionReason: string | null;
  };
  evmGrace: EvmGraceState;
  paraSession: { up: boolean; embeddedEvmAddress: string | null };
};

export type RegistryEvent =
  | { type: "boot/init"; persisted: PersistedRegistryV1 | null; now: number }
  | { type: "wagmi/connections-changed";
      connections: Array<Omit<RegistryConnection, "key" | "kind">>;
      now: number }
  | { type: "wagmi/config-rebuilt"; now: number }
  | { type: "wagmi/brands-changed"; brands: Record<string /*uid*/, string> }
  | { type: "wagmi/settled"; now: number }            // quiet-period timer fired (source-owned)
  | { type: "para/session-changed"; up: boolean; embeddedEvmAddress: string | null; now: number }
  | { type: "para/auth-flow-started"; reason: string; now: number }  // suppress popups 5min
  | { type: "solana/changed"; publicKey: string | null; walletName: string | null; now: number }
  | { type: "user/select-active"; family: WalletFamily; address: string; uid: string;
      stableId: string; now: number }
  | { type: "user/connect-succeeded"; family: WalletFamily; address: string; uid: string;
      stableId: string; now: number }                  // deliberate connect clears drops
  | { type: "user/disconnect-account"; address: string; uids: string[];
      isParaAccount: boolean; othersRemain: boolean; now: number }
  | { type: "user/disconnect-family"; family: WalletFamily | "all"; now: number };

export type RegistryCommand =
  | { kind: "wagmi/reconnect" }                        // silent storage-based restore
  | { kind: "wagmi/connect"; stableId: string }        // may pop extension UI (budgeted)
  | { kind: "wagmi/disconnect"; uid: string }
  | { kind: "para/logout" }
  | { kind: "persist" }
  | { kind: "debug"; event: string; data?: Record<string, unknown> };

export type PersistedRegistryV1 = {
  version: 1;
  active: Partial<Record<WalletFamily, { address: string; stableId?: string }>>;
  droppedAddresses: string[];
  paraDetached: boolean;
};

export const REGISTRY_STORAGE_KEY = "aomi.wallet.registry.v1";
export const POPUP_REATTACH_BUDGET = 2;
export const REATTACH_SUPPRESSION_MS = 300_000;
export const SETTLE_QUIET_MS = 1_200;
export const EVM_IDENTITY_GRACE_MS = 1_800;
```

**Step 1.2 — `registry/reducer.ts`.** `export function reduce(state, event): WalletRegistryState`.
Pure; no Date.now() (every event carries `now`), no IO, no globals. Required transitions:

- `boot/init`: hydrate intents + a *pending* active wish from `persisted`; phase `booting`.
- `wagmi/connections-changed`: classify each connection (`kind`: `stableId === "para"` →
  `"para"`; `stableId === "walletConnect"` → `"walletconnect"`; else `"external-evm"`),
  lowercase evm addresses, merge brands previously seen. Update `evmGrace` exactly like
  `evm-identity-grace.ts` does today: when the active connection vanishes, stamp
  `disconnectedAt` (once); when it returns, clear. Maintain `heal.expected` = the current
  external (non-para, non-wc) connections whenever phase is `stable`.
- Active resolution (call `policy.resolveActive` — Step 1.3) runs on every
  connections/settled event; **but a missing wanted connection never reassigns active
  during `booting`/`settling`/`rebuilding`** — the wish is kept, identity rides the grace.
- `wagmi/config-rebuilt`: phase → `rebuilding` (keep `heal.expected` from last stable).
- `wagmi/settled`: phase → `stable`; finalize active per policy; compute heal diff
  (commands planned in Step 1.4).
- `para/session-changed`: track session; if it goes up during settling, stay settling.
- `para/auth-flow-started`: set `heal.suppressedUntil = now + REATTACH_SUPPRESSION_MS`.
- `user/select-active`: set active (address+uid+stableId), clear that family's
  `explicitFamilyDisconnect`.
- `user/connect-succeeded`: clear `droppedAddresses` entirely (mirrors today's
  `explicitlyDroppedEvmAddressesRef.current.clear()`), clear `paraDetached` if para.
- `user/disconnect-account`: add lowercased address to `droppedAddresses`; set
  `paraDetached` when `isParaAccount && othersRemain`; if the dropped account was active,
  re-resolve active among remaining.
- `user/disconnect-family`: set `explicitFamilyDisconnect[family]`; clear active for the
  family/families; `"all"` also implies para logout (command).
- `solana/changed`: maintain the single solana connection + active.

**Step 1.3 — `registry/policy.ts`.** Pure helpers used by the reducer:

```ts
export function resolveActive(state, family): ActiveRef | undefined
// 1. current active if its connection is live → keep (uid refreshed by address+stableId match)
// 2. else persisted/pending wish if a connection matches by address (prefer stableId match) → it
// 3. else (only when phase === "stable") first external-evm connection → it
// 4. else para connection → it ; 5. else undefined

export function planHeal(state, now): RegistryCommand[]
// at `wagmi/settled` after a rebuild: diff heal.expected vs live connections;
// missing → first command is always {kind:"wagmi/reconnect"} (silent, unlimited);
// for still-missing after reconnect (a SECOND settled pass): {kind:"wagmi/connect", stableId}
// per missing connection, gated by: not in droppedAddresses, not para/walletconnect,
// reattachBudget > 0, suppressedUntil null-or-past. Decrement budget per connect command.

export function planDisconnect(state, event): RegistryCommand[]
// reuse the EXISTING planEvmAccountDisconnect from ../providers/para/evm-disconnect-plan.ts
// (import it; do not rewrite) to decide which uids get {kind:"wagmi/disconnect"};
// append {kind:"para/logout"} when the para account is targeted and nothing same-address
// remains, or on family:"all".
```

**Step 1.4 — `registry/commands.ts`.** `export function planCommands(prev, next, event): RegistryCommand[]`
— pure function deciding effects from a transition (heal on settled, disconnects on user
events, `{kind:"persist"}` whenever `active`/`intents` changed, `{kind:"debug",…}` for every
decision so `[aomi-wallet]` tracing survives — reuse existing event names:
`active-evm:user-select`, `active-evm:persisted`, `evm:heal`, plus new `registry:*`).

**Step 1.5 — `registry/persistence.ts`.** `loadPersisted(storageKey)`, `savePersisted(...)`,
plus **one-time migration**: if `aomi.wallet.registry.v1` is absent, read legacy keys
`aomi.wallet.active-evm-address` and `aomi.wallet.detached-para-evm-address`, fold them into
`PersistedRegistryV1`, write it, and **delete the legacy keys**. SSR-safe, try/catch
swallow, same style as the existing `persistence.ts`.

**Step 1.6 — `registry/store.ts`.** Framework-free class:

```ts
export type CommandExecutors = {
  wagmiReconnect(): Promise<void>;
  wagmiConnect(stableId: string): Promise<void>;
  wagmiDisconnect(uid: string): Promise<void>;
  paraLogout(): Promise<void>;
};

export class WalletRegistryStore {
  constructor(opts: { executors: CommandExecutors; storageKey: string; initialNow: number })
  getSnapshot(): WalletRegistryState        // stable reference between dispatches
  subscribe(cb: () => void): () => void
  dispatch(event: RegistryEvent): void      // reduce → planCommands → execute (async, errors
                                            // caught + walletDebug-logged, never thrown)
}
```

Persistence executes synchronously inside dispatch (`{kind:"persist"}` → `savePersisted`).
Command executors are injected so tests use fakes. `subscribe`/`getSnapshot` shaped for
React's `useSyncExternalStore`.

**Step 1.7 — Tests.** Use replayed timelines as fixtures (the STATE.md round-3/4 traces
describe them). Minimum cases:

- `reducer.test.ts`: boot-war replay — `boot/init {persisted: 0xRabby}` →
  connections grow 1→2→3 (para connects last) → `wagmi/settled` ⇒ active = Rabby, zero
  dependence on event order; same replay with no persisted wish ⇒ active = first external;
  external-only (no para) ⇒ active = external; para-only ⇒ para. Grace: active connection
  vanishes ⇒ `disconnectedAt` stamped once; expired stays expired (port the existing
  regression case); returns ⇒ cleared. Dropped address never re-becomes active.
- `policy.test.ts`: planHeal — missing external ⇒ reconnect first; second settled pass ⇒
  connect with budget decrement; budget exhaustion ⇒ no connect command; suppression window
  ⇒ no connect command; dropped/para/wc never healed. planDisconnect — delegates to
  `planEvmAccountDisconnect` (para-with-same-address-external case included), family:"all"
  ⇒ para/logout present.
- `persistence.test.ts`: roundtrip; legacy-key migration (writes v1, deletes legacy);
  corrupt JSON ⇒ null.
- `store.test.ts`: dispatch executes planned commands via fakes; executor rejection is
  swallowed + logged; persist fires when active changes; snapshot identity stable when
  nothing changed.

**Verify:** baseline commands (new tests included in the registry vitest run — the include
glob `src/**/*.{test,spec}.{ts,tsx}` already covers them). No manual rows affected.
**Commit:** `feat(wallet): add WalletRegistry pure core (reducer, policy, persistence, store) — unwired`
**Rollback:** delete the `registry/` folder.

---

## Phase 2 — Sources mounted in shadow mode

**Goal:** the registry runs live alongside the current machinery, ingesting real events and
logging its decisions — **controlling nothing**. This de-risks every later flip: we get
real-world timelines proving the reducer resolves the same (or better) outcomes before any
behavior changes.

**Files:**

```
CREATE apps/registry/src/lib/aomi-auth-adapter/providers/para/sources/wagmi-source.ts
CREATE apps/registry/src/lib/aomi-auth-adapter/providers/para/sources/para-session-source.ts
CREATE apps/registry/src/lib/aomi-auth-adapter/providers/para/sources/solana-source.ts
CREATE apps/registry/src/lib/aomi-auth-adapter/providers/para/use-wallet-registry.ts
MODIFY apps/registry/src/lib/aomi-auth-adapter/providers/para/para.tsx  (mount only)
```

**Step 2.1 — `use-wallet-registry.ts`.** Hook that owns one store instance per provider
mount:

```ts
export function useWalletRegistry(opts: { storageKey: string }): {
  store: WalletRegistryStore;
  state: WalletRegistryState;   // via useSyncExternalStore
}
```

Executors for this phase are **no-ops that only walletDebug-log** what they *would* do
(`registry:shadow-cmd`). Real executors arrive in Phases 4–5. `boot/init` is dispatched
once on mount with `loadPersisted()`.

**Step 2.2 — `sources/wagmi-source.ts`.** `useWagmiRegistrySource(store)`:

- Watches `useSafeConnections()` (already memoized on the wagmi store snapshot),
  `useSafeConnectors()`, `useSafeWagmiConfig()`, and `useEvmProviderBrands(...)`.
- On connections change → dispatch `wagmi/connections-changed` mapping each wagmi
  connection to `{family:"evm", uid: connector.uid, stableId: connector.id, address,
  addresses, chainId, walletName: brands[uid] ?? connector.name}`.
- Detects config rebuild: when the **connector uid set is replaced wholesale** (or the
  wagmi config object identity changes) → dispatch `wagmi/config-rebuilt`.
- Owns the settle timer: after every connections/rebuild event (re)start a
  `SETTLE_QUIET_MS` timeout; on fire → dispatch `wagmi/settled`. Clear on unmount.
- On brands change → `wagmi/brands-changed`.

**Step 2.3 — `sources/para-session-source.ts`.** `useParaSessionSource(store)`:

- Watches `useSafeParaAccount()` / `useSafeParaClient()` (the existing safe wrappers in
  para.tsx — export them or move them here unchanged).
- Dispatch `para/session-changed {up, embeddedEvmAddress}` on transitions.
- Dispatch `para/auth-flow-started` from the same places para.tsx currently calls
  `suppressPromptingEvmReattach(...)` — for shadow mode, call the source's dispatch
  **alongside** the existing suppress call (do not remove the old one yet).

**Step 2.4 — `sources/solana-source.ts`.** `useSolanaRegistrySource(store)`:

- Watches `useSafeSolanaWallet()`; dispatch `solana/changed {publicKey, walletName}`.
  (The connect dance stays in para.tsx until Phase 6.)

**Step 2.5 — Mount in `para.tsx`.** Inside `AomiParaAdapterProvider` (NOT the outer
provider — it must live where the safe hooks resolve), add:

```tsx
const { store: registryStore, state: registryState } = useWalletRegistry({ storageKey: "para" });
useWagmiRegistrySource(registryStore);
useParaSessionSource(registryStore);
useSolanaRegistrySource(registryStore);
```

`registryState` is **unused** for now (prefix `void registryState` or omit). Behavior must
be byte-identical; the only observable difference is new `[aomi-wallet] registry:*` log
lines.

**Step 2.6 — Shadow comparison logging.** Add a dev-only effect comparing the registry's
resolved active EVM address vs the live `identity.address` whenever either changes; log
`registry:shadow-diff` on mismatch. This is the acceptance instrument for Phase 4.

⚠️ Migration note: Phase 1's persistence migration deletes the legacy
`aomi.wallet.active-evm-address` key on first load — but the *live* enforcement code still
reads it at mount via `persistedActiveEvmAddressRef`. For shadow mode, make the migration
**non-destructive** (write v1, keep legacy keys); the legacy keys are deleted in Phase 4
when the old readers die. Encode this as a `migrateDestructively: boolean` option.

**Verify:** baseline commands; run matrix rows M2, M4, M9 with debug on — confirm
`registry:*` lines appear, **no `registry:shadow-diff` mismatches** in steady state (during
the boot war, transient diffs are expected while old machinery fights; final settled state
must agree), and no behavior regressions.
**Commit:** `feat(wallet): mount WalletRegistry sources in shadow mode (no behavior change)`
**Rollback:** remove the four hook calls from para.tsx.

---

## Phase 3 — Identity + accounts derive from the registry

**Goal:** the UI renders from owned state. `identity` (connection fields) and `accounts[]`
come from registry selectors. wagmi's `current` pointer is no longer read **for display**.

**Files:**

```
CREATE apps/registry/src/lib/aomi-auth-adapter/registry/selectors.ts (+ selectors.test.ts)
MODIFY providers/para/para.tsx
```

**Step 3.1 — `registry/selectors.ts`:**

```ts
export function selectEvmIdentity(state: WalletRegistryState, now: number): {
  address?: string; chainId?: number; connectorId?: string; walletName?: string;
}
// Wraps the active connection through resolveGracefulEvmIdentity (import the existing
// module — its `previous`/`disconnectedAt` inputs come from state.evmGrace).

export function selectAccounts(state: WalletRegistryState): AomiAccount[]
// Maps registry connections → the EXISTING buildAccounts() inputs:
//   evmConnections: state.connections(evm) → {id: uid, walletName, address, chainId}
//   activeEvmAddress / activeEvmConnectionId: from state.activeByFamily.evm
//   solanaConnections / activeSolanaAddress: from the solana connection
// MUST keep account.id === wagmi connector uid (picker contract).

export function selectActiveEvm(state): ActiveRef | undefined
export function selectSolana(state): RegistryConnection | undefined
```

`selectAccounts` reuses `buildAccounts` verbatim — the dedupe/branding behavior and its 9
tests keep applying.

**Step 3.2 — Flip the derivation in para.tsx.** In the big adapter `useMemo`:

- Replace the `currentEvmIdentity` / `gracefulEvmIdentity` construction (around
  para.tsx:793) with `selectEvmIdentity(registryState, nowTick)` where `nowTick` comes from
  the existing render cadence (grace already re-evaluates on re-render today; preserve
  that: keep the small interval/re-render the grace currently relies on — check how
  `evmDisconnectedAtRef` triggers re-renders today and mirror it; if it relies on wagmi
  churn, add a 500ms interval that only ticks while `state.evmGrace.disconnectedAt` is
  non-null).
- Replace the `builtAccounts = buildAccounts({...})` call with
  `selectAccounts(registryState)`, keeping the `manageable: true` post-pass for para
  accounts exactly as-is.
- Identity fields that are **session metadata, not connection state** stay sourced from
  Para hooks directly: `walletProvider`, `walletProviderSubject`, `authMethod`,
  `authValue`, `authVerifiedAt`, `sponsored`/`sponsorProvider`/`sponsorAccount` (from
  `resolveParaSponsorship`), `aaMode`/`SmartAccount4337`/`Delegation7702` (from
  `useUser()`). **Do not** route these through the registry.
- The grace-related refs (`lastConfirmedEvmIdentityRef`, `evmDisconnectedAtRef`) and their
  feeding effects become dead → delete them. `EVM_IDENTITY_GRACE_MS` const moves to
  registry/types (re-export from para.tsx if referenced).
- Solana identity fields (`svmAddress`, `solanaWalletName`, cluster, capabilities) keep
  their current derivation (wallet-adapter is the registry's source anyway; flipping them
  buys nothing — skip).

**Step 3.3 — Keep the old machinery running.** Enforcement, heal, reconnect effects stay
untouched this phase — they manipulate wagmi, the registry observes wagmi, the UI follows
the registry. The shadow-diff log from Phase 2 should now be structurally zero (identity IS
the registry).

**Tests:** `selectors.test.ts` — grace passthrough (incl. expired-stays-expired), accounts
mapping preserves uid ids + active flags, dedupe still one-row-per-address (fixture with
Rabby-impersonation duplicate connectors).

**Verify:** baseline commands; registry suite (existing picker tests exercise the adapter
through mocks — they must stay green untouched); manual rows M1, M2, M5, M9, M15. Watch for
identity flicker (grace must behave identically — row M9's "no flash loop" is the canary).
**Commit:** `refactor(wallet): derive identity + accounts from WalletRegistry`
**Rollback:** revert para.tsx hunk; selectors stay (unused).

---

## Phase 4 — Active selection + explicit-connector signing; delete the enforcement

**Goal:** the war ends. Active-per-family is *declared* in the registry; every signing/
chain operation targets the active connection's connector **explicitly**; the enforcement
effect, its budget, and the legacy persisted-address restore are **deleted**.

**Files:**

```
MODIFY providers/para/para.tsx
MODIFY apps/registry/src/lib/aomi-auth-adapter/safe-wagmi-hooks.ts  (additive)
MODIFY registry/persistence.ts (enable destructive migration)
```

**Step 4.1 — Real executors.** Replace the Phase-2 no-op executors in the
`useWalletRegistry` wiring inside para.tsx:

```ts
wagmiReconnect: () => wagmiReconnectAsync(),                     // existing safe hook
wagmiConnect:  (stableId) => {                                   // resolve connector by .id
  const c = evmConnectors.find((x) => x.id === stableId);
  return c ? wagmiConnectAsync({ connector: c }) : Promise.resolve();
},
wagmiDisconnect: (uid) => {
  const c = evmConnectors.find((x) => x.uid === uid);
  return c ? wagmiDisconnectAsync({ connector: c }) : Promise.resolve();
},
paraLogout: () => logoutParaSession(),                           // existing helper
```

(Heal/disconnect commands only start *flowing* in Phase 5; wiring real executors now is
safe because Phase 4 events don't plan those commands yet — verify `planCommands` gates.)

**Step 4.2 — `selectAccount` dispatches; cosmetic switch only.**

```ts
selectAccount: async (id) => {
  const target = accounts.find((a) => a.id === id);
  if (!target || target.family !== "evm") return;          // solana: no-op (unchanged)
  const conn = registryState.connections.find((c) => c.uid === id);
  if (!conn) throw new Error(`Unknown account: ${id}`);
  registryStore.dispatch({ type: "user/select-active", family: "evm",
    address: conn.address, uid: conn.uid, stableId: conn.stableId, now: Date.now() });
  // Cosmetic only — keeps Para's modal/other wagmi consumers visually in sync.
  // Failure is non-fatal: active is OURS now.
  try { await switchAccountAsync({ connector: wagmiConfig.connectors.find(c => c.uid === conn.uid)! }); }
  catch (e) { walletDebug("active-evm:cosmetic-switch-failed", { e: String(e) }); }
},
```

Persistence happens via the reducer's `{kind:"persist"}` — delete
`writePersistedActiveEvmAddress` / `persistedActiveEvmAddressRef` / `ACTIVE_EVM_ADDRESS_KEY`
direct usage. Flip the migration to destructive (legacy keys now removed on load).

**Step 4.3 — Thread the connector through every wagmi operation.** This is the heart of the
phase. Add to `safe-wagmi-hooks.ts` (additive):

```ts
export function useSafeGetWalletClientFor(): (args: { uid: string; chainId?: number })
  => Promise<WalletClient | null>
// implemented with @wagmi/core getWalletClient(config, { connector, chainId }) — imperative,
// resolved at call time, so the AA path gets the ACTIVE connection's client, not current's.
```

Then in the adapter methods (all in para.tsx), resolve once per call:

```ts
const active = selectActiveEvm(registryState);
const activeConnector = active?.uid
  ? wagmiConfig.connectors.find((c) => c.uid === active.uid) : undefined;
```

and pass `connector: activeConnector` (plus `account: active.address` where accepted) to:

| Operation | Call site today | Change |
|---|---|---|
| `sendTransactionAsync` | wrappers handed to `executeWalletCalls` | wrap: `(args) => sendTransactionAsync({ ...args, connector: activeConnector })` |
| `sendCallsSyncAsync` (EIP-5792) | same | same wrapping (`SendCallsParameters` carries `ConnectorParameter`) |
| `signTypedDataAsync` / `signMessageAsync` | `signTypedData` / `signMessage` adapter methods | add `connector` |
| `switchChainAsync` | `switchChain`, `selectNetwork`, align-to-preference effect, eip712 pre-switch | add `connector: activeConnector` |
| `useSafeCapabilities` | capabilities passed to `executeWalletCalls` | pass `account: active.address` so caps reflect the active wallet |
| `getWalletClient` (AA external signer) | `resolveParaAAProviderState({ walletClient })` | use `useSafeGetWalletClientFor()({ uid: active.uid })` |
| `shouldUseExternalSigner` (AA) | currently keyed off current connector being non-para | key off `activeConnector` instead: `active && activeConnector?.id !== "para"` |

⚠️ Verify each wagmi action's parameter type accepts `connector` before assuming
(`ConnectorParameter` confirmed present on `SendTransactionParameters` in the installed
`@wagmi/core`; check the others in
`node_modules/.ignored_wagmi/node_modules/@wagmi/core/dist/types/actions/*.d.ts` or the
workspace-resolved equivalent). Any action lacking it → fall back to
`getWalletClient(config,{connector})` + direct viem call inside the safe-hook wrapper.

**Step 4.4 — Delete the enforcement.** Remove from para.tsx:

- the active-EVM enforcement effect (watching/`switchAccountAsync`-ing back), including
  `activeEvmEnforceAttemptsRef`, `lastWantedConnectionUidRef`, the budget-refund logic;
- the once-per-load persisted-address restore effect;
- `accountSwitchInFlightRef` **only where it guarded the enforcement/reconnect interplay**
  — the reconnect effect still exists until Phase 5; keep the ref if that effect still
  reads it (check before deleting; if kept, leave a `// Phase 5 removes` comment).

Identity/accounts already follow the registry (Phase 3), so Para re-asserting wagmi's
`current` is now **visible nowhere**: display reads the registry, signing reads the
registry. Log `evm:current-changed` still (diagnostics).

**Step 4.5 — Update connect flows to inform the registry.** In `connectEvmWallet` and the
solana connect completion path, after a successful deliberate connect dispatch
`user/connect-succeeded` (this is what clears `droppedAddresses` in the reducer — mirror of
the old `.clear()` call, which you should now delete). New connections should become active
for their family per existing UX (deliberate connect → that wallet becomes active):
dispatch `user/select-active` for it too — this matches today's behavior where wagmi made
the new connection current and we displayed it.

**Tests:** extend `reducer.test.ts`: select-active persists / connect-succeeded clears
drops / boot resolves persisted wish by address+stableId with fresh uids (uids in fixture
differ from persisted — the realistic refresh case).

**Verify:** baseline; manual rows **M1, M2, M3** (the headline fixes — must now pass
*without* any enforcement), M5, M9, M11, **M12** (AA with external active — proves the
connector threading + `shouldUseExternalSigner` flip), M13, M15. With debug on: zero
`active-evm:enforce` lines exist anymore (the code is gone); `registry:*` lines show the
boot resolution happening once, no tug-of-war.
**Commit:** `refactor(wallet): registry-owned active account + explicit-connector signing; drop enforcement war`
**Rollback:** this phase is the riskiest — keep it one commit; revert restores enforcement.

---

## Phase 5 — Heal + disconnect intent through the reducer

**Goal:** the recovery ladder and per-account disconnect logic move from effect/ref soup
into registry policy. The remaining recovery refs in para.tsx are deleted.

**Files:** `MODIFY providers/para/para.tsx`, `MODIFY registry/{reducer,policy,commands}.ts` (+tests)

**Step 5.1 — Enable heal command flow.** Phase 1 already implemented `planHeal`; now make
`wagmi/config-rebuilt` → `settled` transitions actually emit the commands (remove the
shadow gate). The wagmi-source's settle timer provides the cadence the old 1.5 s delay
approximated; the **two-pass rule** (reconnect on first settled, popup-connect on second)
replaces it. Budget (2) + suppression (5 min) enforced in policy — already tested.

**Step 5.2 — Delete the old ladder from para.tsx:** the reconnect effect
(`evmReconnectAttemptedRef`, `hadEvmConnectionRef`), the re-attach effect
(`evmReattachAttemptedRef`, `evmReattachBudgetRef`, `lastEvmConnectionsRef`), the
suppression refs (`evmReattachSuppressedUntilRef`, reason ref) and
`suppressPromptingEvmReattach` (its call sites now only dispatch `para/auth-flow-started` —
Phase 2 left them dual-firing; make the dispatch the only thing). Delete
`accountSwitchInFlightRef` if Phase 4 kept it.

**Step 5.3 — Disconnects dispatch.** Rewrite the adapter's `disconnect` to:

```ts
disconnect: async (options) => {
  if (options?.accountId) {
    const plan = planEvmAccountDisconnect(/* same inputs as today */);
    registryStore.dispatch({ type: "user/disconnect-account",
      address: plan.targetAddress, uids: [...plan.connectorIds],
      isParaAccount: plan.isParaAccount, othersRemain: plan.otherConnectionsRemain,
      now: Date.now() });
    return;   // commands (wagmi/disconnect ×N, para/logout if warranted) run via executors
  }
  registryStore.dispatch({ type: "user/disconnect-family",
    family: options?.family ?? "all", now: Date.now() });
  // family:"solana"/"all" still need the wallet-adapter disconnect — keep the direct
  // solanaWallet.disconnect() call here (the registry executor set has no solana executor
  // until Phase 6; add one then if you prefer symmetry).
},
```

Preserve today's semantics exactly (they're encoded in `evm-disconnect-plan.ts` + STATE.md
round descriptions): per-row para sign-out logs the para session out **only** when no
same-address external remains; family-scoped disconnect leaves the Para session alone;
`{family:"all"}` always logs Para out. `paraDetached` (ex `detached-para-evm-address`)
must prevent heal/grace from resurrecting the para connection while the session lives.

**Step 5.4 — Grace + drops interplay.** Reducer rule (add test): an address in
`droppedAddresses` is excluded from grace identity (no zombie identity for a wallet the
user just signed out — mirrors today's `explicitDisconnect` input to
`resolveGracefulEvmIdentity`).

**Tests:** reducer/policy additions: rebuild→settled→reconnect→settled→connect two-pass;
para sign-out with surviving MM (commands = disconnect para uid + para/logout, heal keeps
MM); drop excluded from heal + grace; budget/suppression edges (boundary `now ===
suppressedUntil`).

**Verify:** baseline; manual rows **M4, M5, M6, M16** (the heal/sign-out rows), M2 again
(regression), M9. Debug: `evm:heal` lines now come from registry commands.
**Commit:** `refactor(wallet): heal ladder + disconnect intents via WalletRegistry policy`

---

## Phase 6 — Solana connect machine into the source

**Goal:** the select→autoConnect-deference→manual-connect dance leaves para.tsx; the
pending-wallet state lives in the registry.

**Files:** `MODIFY sources/solana-source.ts`, `MODIFY providers/para/para.tsx`,
`MODIFY providers/para/para-sol.tsx` (only if helper signatures need re-exporting)

**Step 6.1 —** Move the pending-connect effect (para.tsx, the one watching
`pendingSolanaWallet` + `solanaWallet.connecting` with the 400 ms grace and
`solanaConnectAttemptObservedRef`) into `useSolanaRegistrySource` as a self-contained state
machine: `idle → selecting(wallet, observedAttempt) → connected | failed`. Keep constants
and semantics identical (defer to provider autoConnect; 400 ms grace before manual
`connect()`; never re-pop after an observed failed attempt; settle pending if the adapter
unselected the wallet). `connectSolanaWallet` in the adapter becomes: validate name →
`solanaWallet.select(name)` → dispatch `solana/connect-requested {walletName}` (add this
event + `intents.pendingSolanaWallet` transitions to the reducer) → return a promise that
resolves when the source observes the target connected (reuse the existing
promise-resolution pattern — today's implementation already waits on state, keep its
timeout/rejection behavior).

**Step 6.2 —** Delete `pendingSolanaWallet` state + `solanaConnectAttemptObservedRef` from
para.tsx. `connectPreferredSolanaWallet` (para-sol.tsx) and `buildParaSolanaMethods` are
unchanged.

**Tests:** source-level test (jsdom): select fires, autoConnect observed ⇒ no manual
connect; no attempt in 400 ms ⇒ manual connect once; dismissed popup ⇒ no re-pop.
Use fake timers.

**Verify:** baseline; manual rows **M8, M10, M14**, M7.
**Commit:** `refactor(wallet): solana connect state machine into registry source`

---

## Phase 7 — Decompose para.tsx + registry artifacts

**Goal:** mechanical split; no behavior change. para.tsx (now substantially smaller after
Phases 3–6) lands under ~400 lines/module.

**Files:**

```
RENAME/SPLIT providers/para/para.tsx →
├── para.tsx                  # outer AomiParaProvider (Para SDK config plumbing) — keep name
├── para-adapter.tsx          # AomiParaAdapterProvider: registry wiring + adapter useMemo
├── para-connect.ts           # connectEvmWallet/connectSocial/openAccountUI/connect impls
├── para-disconnect.ts        # disconnect impl + logoutParaSession helper
├── para-safe-hooks.ts        # useSafeParaAccount/Client/Modal/Logout/IssueJwt wrappers
MODIFY providers/para/index.ts            # re-export so import sites are unchanged
MODIFY apps/registry/src/registry.ts      # file lists (see below)
```

**Steps:**

1. Pure moves — every export keeps its name; `providers/para/index.ts` re-exports so
   **zero import-site changes** anywhere else.
2. Update `apps/registry/src/registry.ts`: add all new files (`registry/*.ts`,
   `providers/para/sources/*.ts`, the split para files) to the `aomi-auth-adapter` /
   `aomi-para-provider` item file lists. **Also fix the known stale lists** flagged in
   STATE.md ("Registry: … file lists are stale for most of the new wallet UI" — add
   `dual-wallet-bar.tsx`, `wallet-picker.tsx`, `wallet-icon-slot.tsx`, `wallet-map.tsx`,
   `icons/wallets/`, `accounts.ts`, `network-preferences.tsx`, `solana-networks.ts`,
   `para-sol.tsx` where missing).
3. Rebuild + sync artifacts:
   `pnpm run build:registry && cp -r apps/registry/dist/. apps/landing/public/r/`
4. Run the pinned-artifact test:
   `pnpm exec vitest run packages/client/test/registry-chain-artifacts.unit.test.ts` —
   if its pinned path points at `providers/para/para.tsx` contents that moved, update the
   pin (it was updated for the folder move before; same procedure).

**Verify:** full baseline + `pnpm run build:lib` + `pnpm exec vitest run` (root) +
spot-check matrix M2/M11.
**Commit:** `refactor(wallet): decompose para provider into modules; refresh registry file lists + artifacts`

---

## Phase 8 (optional / stretch) — Privy on the registry, demo route

**Goal:** prove provider-portability. Skip if time-boxed; nothing earlier depends on it.

**Steps:**

1. `apps/landing/app/privy/page.tsx` (or env-gate the existing default page) rendering the
   widget inside `LandingPrivyProvider` (`landing-privy-provider.tsx` already exists;
   needs `NEXT_PUBLIC_PRIVY_APP_ID`).
2. Run matrix rows M1, M7, M11 against it. Accept documented gaps (no per-account EVM
   disconnect, simpler Solana).
3. Only if cheap: mount `useWalletRegistry` + a `privy-session-source` in
   `providers/privy/privy.tsx` mirroring the para wiring (wagmi-source is reusable as-is
   since Privy also drives wagmi). Do **not** block the PR on this.

**Commit:** `feat(wallet): privy demo route (+ optional registry adoption)`

---

## Phase 9 — Linking groundwork, invariants, cleanup

**Goal:** future-proofing + docs. Small, mostly types and text.

**Steps:**

1. **Additive types** — `types.ts`: add to `AomiAccount`:
   `linked?: boolean; linkedVia?: "para" | "privy" | "challenge";` (optional, undefined
   everywhere today). `registry/types.ts`: add
   `export type WalletLink = { address: string; family: WalletFamily; linkedVia: "para" | "privy" | "challenge"; subject: string; verifiedAt: number };`
   with a doc comment pointing at WALLET-ARCHITECTURE.md §11.3 (mirrors the future
   `GET /api/account/wallets` row).
2. **Sweep for dead code**: grep para modules for the deleted refs/keys
   (`ACTIVE_EVM_ADDRESS_KEY`, `DETACHED_PARA_EVM_ADDRESS_KEY`, `enforce`, `reattach`) —
   all gone except the persistence migration's legacy-key constants (keep those in
   `registry/persistence.ts` only).
3. **Guard the invariant**: add an exit-criteria grep to CI-less reality — document in
   `specs/DOMAIN.md` under Invariants:
   - "Active wallet per family is owned by WalletRegistry (`registry/store.ts`); wagmi's
     current connection must never be read for display or signing — every wagmi action in
     the adapter passes an explicit `connector`."
   - "All wallet connection/recovery decisions are reducer transitions in
     `registry/reducer.ts`; effects fire only via `planCommands`."
   And verify mechanically: `grep -rn "useSafeWagmiAccount" apps/registry/src/lib/aomi-auth-adapter/providers/para/`
   must match **only** `sources/wagmi-source.ts` (diagnostics) — fix any stragglers.
4. Update `specs/STATE.md` (full summary of the refactor), re-run the **entire** manual
   matrix, fill the final column.
5. Final: `pnpm run build:lib`, full baseline, `pnpm run typecheck:landing`,
   `pnpm run prettier` clean.

**Commit:** `chore(wallet): linking groundwork types, DOMAIN invariants, refactor cleanup`

---

## Gotchas (load-bearing subtleties)

Read before touching anything. Each of these was a production bug once (STATE.md rounds 1–5):

1. **Never let the adapter subtree unmount.** `ParaSolanaWrapper` caches the last non-null
   Para client (`lastParaRef`) and renders `AomiParaAdapterProvider` in BOTH states — Para
   nulls its client transiently during logout/re-init. Don't "simplify" this. The registry
   store living in React state makes unmount = total state loss.
2. **Everything passed to `<ParaProvider>` must be referentially stable** (memoized).
   One inline array/object prop = wagmi config rebuild on every render = connection wipe.
   The `useMemo`s at para.tsx:1667–1729 are the fix for the network-switch flash loop.
3. **wagmi connector `uid` regenerates every page load.** Persist `address` + `connector.id`
   (`stableId`), resolve `uid` at runtime. `AomiAccount.id` stays the runtime uid (picker
   contract).
4. **Grace must stay expired once expired** (`evm-identity-grace.ts` regression test):
   feeding an expired result back must not restart the window — that was the 1 Hz flash
   loop.
5. **`canConnect`/`canDisconnect` are deliberately NOT gated on `identity.isConnected`**
   (comment at para.tsx:1086) — dual-family UX. Preserve.
6. **Picker's social-row gating** keys off `accounts.some(a => a.manageable)`. Keep the
   `manageable: true` post-pass for para-brand accounts.
7. **Phantom-EVM has no Para-branded connector** — it arrives via wagmi's EIP-6963
   discovery. `connectEvmWallet`'s fuzzy matching (id/uid/canonical-brand) is what finds
   it. Don't tighten the matching.
8. **Rabby impersonates MetaMask** (`isMetaMask: true`). Brand truth comes from
   `useEvmProviderBrands` provider sniffing, which must keep feeding the registry
   (`wagmi/brands-changed`) — row labels and `walletFamilyAliasKey` dedupe depend on it.
9. **Para logout is best-effort double-path**: `useLogout` hook, falling back to duck-typed
   `paraSession.logout()`. Keep `logoutParaSession` as-is; sign-out silently no-oping is
   how "sign-out doesn't stick" was born.
10. **The align-to-preference chain-switch effect** can double-fire `wallet_switchEthereumChain`
    with user-initiated switches (−32002). `evmSwitchInFlightRef` guards it today — if you
    move chain alignment, keep an in-flight guard (or route the alignment through the
    registry as a command with single-flight semantics).
11. **AA must keep working for BOTH owner shapes**: embedded Para (session, 7702-capable)
    and external signer (session + walletClient, 4337-only — Para SDK hard constraint, do
    not "fix" the fallback). Phase 4's `shouldUseExternalSigner` flip is the only allowed
    change to AA wiring.
12. **`wallet_getCapabilities` 403 noise** on public RPCs is known/harmless — don't chase
    it mid-refactor.
13. **Tests run in jsdom** with stubs in `vitest.setup.ts` (ResizeObserver, scrollIntoView,
    localStorage polyfill, IS_REACT_ACT_ENVIRONMENT). New component-adjacent tests may need
    the same setup file (registry vitest config already includes it).
14. **`Date.now()` discipline**: reducer/policy are pure — `now` always arrives in the
    event. Only sources and adapter methods may call `Date.now()`.

## Effort + risk map

| Phase | Size | Risk | Notes |
|---|---|---|---|
| 0 | ½ day | none | docs only |
| 1 | 1–2 days | low | pure code + tests, unwired |
| 2 | 1 day | low | shadow mode, logs only |
| 3 | 1 day | medium | display flip; grace fidelity is the watch-item |
| 4 | 1–2 days | **high** | the behavior flip; gate on M1–M3, M12 manual passes |
| 5 | 1–2 days | medium-high | heal/sign-out semantics; gate on M4–M6, M16 |
| 6 | ½–1 day | medium | solana dance; gate on M7, M8, M10, M14 |
| 7 | ½–1 day | low | mechanical + artifacts |
| 8 | optional | low | demo route |
| 9 | ½ day | none | types + docs |

Total core path (0–7, 9): ~7–10 working days. If the PR must shrink: Phases 0–4 alone
deliver the headline fixes (stable active wallet, no enforcement war) and are a coherent
stopping point; 5–6 can be a follow-up PR — but then the old heal/solana refs stay and you
must NOT delete `suppressPromptingEvmReattach`'s dual-fire from Phase 2.
