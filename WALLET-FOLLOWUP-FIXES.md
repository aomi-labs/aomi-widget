# Wallet Registry Refactor — Follow-up Fixes

> Written 2026-06-12 after a full review of the executed `WALLET-REFACTOR-PLAN.md` work
> (uncommitted working tree on `polish-multi-wallet`) plus the manual test results in
> `docs/wallet-manual-test-results-2026-06-12.md`. This document is for the executor
> agent. Every finding below was verified against the actual code (file:line refs are
> against the current working tree); the two headline root causes were additionally
> verified empirically (the backend 400 was reproduced against the real product-mono
> deserializer; the settle-timer death was traced through the React effect lifecycle).
>
> **Review verdict in one line:** the registry core (reducer/policy/store/persistence)
> is solid and well-tested; the bugs all live in the *impure boundary* — the React
> sources, the command executors, and the safe-hook wrappers — which is exactly the
> layer with zero test coverage.

---

## 0. Ground rules for the executor

1. **Commit the current working tree FIRST, before touching anything.** The entire
   refactor (plan Phases 1–9) is sitting uncommitted — this violates the plan's own
   per-phase commit rule and means there is currently no rollback granularity at all.
   Split into logical commits (suggested: ① registry core + tests, ② sources + shadow
   wiring, ③ identity/accounts/active flip + enforcement deletion, ④ heal/disconnect +
   solana machine, ⑤ registry.ts lists + artifacts + privy route + docs). If splitting
   is impractical, one commit is still infinitely better than zero. Also `git add` the
   untracked docs (`WALLET-ARCHITECTURE.md`, `WALLET-REFACTOR-PLAN.md`, this file,
   `docs/wallet-*.md`).
2. Then fix in priority order below. **One commit per fix** (or per tightly-related
   group), each ending green: `cd apps/registry && pnpm exec vitest run && pnpm exec
   tsc --noEmit`, root `pnpm exec vitest run`, `pnpm lint`, `pnpm run typecheck:landing`.
3. The original plan's DO-NOT-TOUCH list still applies **except** where a fix below
   explicitly names a file (F1 touches `context.tsx`; F13 touches `wallet-picker.tsx`
   to *revert* an unauthorized change). Fix F1's optional hardening in
   `packages/client` requires user sign-off — flag it, don't just do it.
4. When a fix changes behavior described in `WALLET-REFACTOR-PLAN.md` or
   `WALLET-ARCHITECTURE.md`, update those docs in the same commit. The plan said
   "update the plan file when you deviate" — this was not done during execution
   (see §5 Process notes); don't repeat that.
5. After P0+P1 land, ask the user to re-run manual rows 19–22 (backend flows), 7–8
   (Para auth wipe), 12 (Rabby→MetaMask), 2/5 (Phantom auto-connect) from
   `docs/wallet-manual-test-results-2026-06-12.md`.

---

## P0 — Backend/model regression (blocks all tx/sign verification)

### F1. `/api/state` 400 with a connected wallet: `svm.capabilities: null` is the poison pill — NOT `auth_method: "wagmi"`

**Symptom** (manual rows 19–22): with any wallet connected, `GET /api/state?user_state=…`
returns 400 and the model stops responding.

**Root cause (empirically proven against product-mono `aomi/crates/tools/src/user_state/wallet.rs:181`):**
the backend's `SolUserState.capabilities` is `#[serde(default)] SolCapabilitiesUserState`
(a transparent `Vec`). `#[serde(default)]` only covers a *missing* key — an explicit JSON
`null` fails `Vec` deserialization (`invalid type: null, expected a sequence`), and the
`/api/state` endpoint parses strictly (`chat.rs:302` → `validate(false, true)` →
`serde_json::from_str::<UserState>` → 400). `POST /api/chat` parses leniently, which is
why chat "succeeds" while state polling dies.

The frontend emits that `null` here:

- `apps/registry/src/lib/aomi-auth-adapter/context.tsx:61` —
  `capabilities: toSvmCapabilities(identity.solanaCapabilities) ?? null` — with no
  Solana wallet connected, `getSolanaCapabilitySnapshot` returns `undefined` → `null`
  goes on the wire.

**Important findings the tester should know:**
- `auth_method: "wagmi"` is **innocent**. The branch did newly introduce it
  (`providers/para/para.tsx:573-578` emits `"wagmi"` for an external-EVM connection
  without a Para embedded session; main emitted `null`) but the backend accepts it —
  there is even a backend test asserting `"wagmi"` round-trips. No change needed there.
- This failure is **wallet-family-dependent, not branch-dependent**: a main-frontend
  payload for an EVM-only connection fails the same way against the current backend
  (verified by running both payload shapes through the real Rust deserializer). The
  "works on upstream" observation most likely had a Solana wallet connected (real
  capabilities array) or hit an older backend. Worth a 2-minute recheck on main with
  EVM-only to confirm, but the fix is the same regardless.

**Fix:**
1. `context.tsx:61` → `capabilities: toSvmCapabilities(identity.solanaCapabilities) ?? []`.
   Use `[]`, not `undefined`: the user-state merge (`mergeRecords`/`deepMergePreserve`)
   skips `undefined`, so `undefined` would leak *stale* capabilities across a Solana
   disconnect; `[]` overwrites cleanly and the backend accepts it (proven).
2. **Optional, needs user sign-off (touches DO-NOT-TOUCH `packages/client`):**
   defense-in-depth in `packages/client/src/user-state/normalize.ts` `buildSvm` — when
   `capabilities == null`, drop the key entirely so every host app is shielded.
3. **Out of this repo:** recommend to the user a backend hardening in product-mono
   (`wallet.rs`: make `capabilities` null-tolerant via `Option` or `deserialize_with`),
   because already-shipped frontends keep sending `null`.

**Tests:** unit test on the context sync (or on `toSvmCapabilities` usage) asserting an
EVM-only identity produces `capabilities: []`, never `null`.
**Verify:** manual rows 19–22.

---

## P1 — Headline wallet regressions from manual testing

### F2. Para-auth wallet wipe with no recovery: the settle timer is killed and never re-armed → `wagmi/settled` never fires → heal never runs

**Symptom** (manual rows 7–8): external wallet connected → open Para modal → reach the
Google sign-in stage → external EVM wallet disconnects; cancelling leaves zero wallets;
completing login doesn't bring externals back.

**Root cause** (`providers/para/sources/wagmi-source.ts:55-98`, verified independently
twice): `planHeal` only runs on a `wagmi/settled` event, and after Para's SDK rebuilds
the wagmi config (which it does on modal/auth churn — and the rebuilt config is
permanently dead from wagmi's side: `Hydrate.onMount` never re-runs for a swapped
`config` prop, so the registry heal is the *only* recovery path), `wagmi/settled` comes
exclusively from the source's settle timer. That timer dies like this:

1. Connections effect dispatches `wagmi/connections-changed` (emptied list) and arms the
   timer; config effect dispatches `wagmi/config-rebuilt` and re-arms it. One pending
   timer in the **shared** `settleTimerRef`.
2. Any dep-identity re-run of the connections effect with an unchanged content key —
   e.g. `useEvmProviderBrands` returning a new `brands` object (it sets `{}` on
   membership change at `wallet-brands.ts:352-358`), or StrictMode double-invoke —
   first runs the previous cleanup (`wagmi-source.ts:92-97`), which **clears the
   pending timer**, then early-returns at line 84 **without rescheduling**.
3. No `wagmi/settled` is ever dispatched; phase wedges at `rebuilding`/`settling`;
   `planHeal` never executes; silent reconnect never happens. Cancel → zero wallets;
   complete → only the synthetic Para connection appears (session event, not a wagmi
   settle). This exactly reproduces both manual outcomes.

Note: the heal *policy* itself is fine — `heal.expected` is captured before the wipe,
suppression carve-outs are correct, `wagmi/config-rebuilt` detection works. Only the
cadence is dead. The two prior "follow-up fixes" recorded in STATE.md (silent reconnect
during suppression; the 8s `AUTH_FLOW_RECONNECT_SETTLE_MS` delay) were treating
symptoms of this.

**Fix (do both):**
1. **Make the timer un-killable by unrelated effect re-runs.** Move timer cleanup out of
   the connections effect into a dedicated unmount-only effect
   (`useEffect(() => () => { clear(); }, [])`), and never clear a pending timer unless
   you are replacing it in `scheduleSettled` itself.
2. **Preferred, more robust:** move settle ownership into `WalletRegistryStore` — the
   store (re)arms a single settle timer on *every* dispatched `wagmi/*` event and
   dispatches `wagmi/settled` itself when quiet for `SETTLE_QUIET_MS`. The source then
   has no timer at all, and the cadence is immune to React effect lifecycles. The
   store already half-owns this via `scheduleSettledPass` (`registry/store.ts:121-130`);
   consolidate rather than keeping two dispatchers. If you do this, also give the store
   a `dispose()` that cancels pending timers, and call it from `useWalletRegistry` on
   unmount.

**Tests (mandatory — this is why the green suite missed a production bug):** add
`sources/wagmi-source.test.ts` (jsdom + fake timers) covering: rebuild → settled fires
after quiet period; a brands-identity re-run between rebuild and settle does NOT cancel
the settle; settle fires exactly once per quiet window. If settle moves into the store,
test it there instead and keep a thin source test that config-rebuild → store receives
events.

**Verify:** manual rows 7–8 (cancelled login restores externals silently; completed
login restores externals); watch `[aomi-wallet]` for `evm:heal {action: "reconnect"}`
after modal open.

### F3. Heal second pass races the first: executor uses fire-and-forget `reconnect`

**Root cause** (`providers/para/para.tsx:322-324`): `wagmiReconnect` wraps the **sync**
TanStack `mutate` (`useSafeReconnect`) in `Promise.resolve(...)` — it resolves
immediately, so the store's `finally { scheduleSettledPass() }`
(`registry/store.ts:72-79`) starts the second-pass countdown at reconnect *kickoff*,
not completion. The budgeted popup pass can fire while silent reconnect is still in
flight, wasting the 2-popup budget / popping extensions. The 8s
`AUTH_FLOW_RECONNECT_SETTLE_MS` constant smells like a band-aid for exactly this.

**Fix:** expose `reconnectAsync` from `useSafeReconnect` in `safe-wagmi-hooks.ts` and
`await` it in the executor. After F2+F3 land, re-evaluate whether
`AUTH_FLOW_RECONNECT_SETTLE_MS` (and its duplicated reason-whitelist, see F12) can be
reduced or removed — keep it only if real-device testing still needs it, and say so in
a comment.

Also worth knowing: `@wagmi/core`'s `reconnect` has a **module-level** `isReconnecting`
guard — a concurrent Para-internal reconnect makes ours silently return `[]`. The
two-pass ladder covers this *if* settles keep flowing (F2), but log the empty result
(`walletDebug("evm:heal", {action:"reconnect-empty"})`) so it's diagnosable.

### F4. Phantom EVM auto-connects: no-arg `reconnect()` tries ALL connectors

**Symptom** (manual rows 2/5): clear cache → connect MetaMask → Phantom EVM is also
connected immediately.

**Root cause** (verified in `@wagmi/core` source): `reconnect()` with no `connectors`
argument iterates **all** config connectors and silently connects every one whose
`isAuthorized()` is true — storage (`recentConnectorId`) only *sorts*, it does not
filter. Phantom's EIP-6963 connector (`app.phantom`, auto-discovered;
`multiInjectedProviderDiscovery` defaults true) reports authorized because the
*extension-side* site permission survives a cache clear. Two triggers: (a) wagmi's own
`reconnectOnMount` on page load, (b) **our heal executor** calling no-arg reconnect —
and once connected, the next stable settle adopts Phantom into `heal.expected`
(`reducer.ts` `externalHealExpected`), so the registry then actively keeps it alive.

**Fix:**
1. Make the heal reconnect **targeted**: extend the command to
   `{ kind: "wagmi/reconnect", stableIds: string[] }` (from `planHeal`'s
   `silentReconnectEligible`), and have the executor resolve those stableIds to
   connector instances and call `reconnectAsync({ connectors })`. This is fully in our
   control and also narrows F2's blast radius.
2. The load-time path (wagmi's own `reconnectOnMount`) is **inherent wagmi/extension
   behavior** — decide with the user (Open Question 1 in the test-results doc) whether
   to accept it (document as expected: "Phantom re-appears because the extension still
   authorizes the site") or suppress it. Suppression options: pass
   `reconnectOnMount: false` via Para's `externalWalletConfig.evmConnector.wagmiProviderProps`
   + do our own boot-time targeted reconnect from persisted state (would need
   `heal.expected`/known-wallets persisted into `PersistedRegistryV1` — schema bump to
   v2 with migration); or post-boot, disconnect external connections not present in a
   persisted known-set. Do NOT ship suppression without the user choosing it — it
   trades "surprise wallet" for "refresh sometimes loses a wallet wagmi would have
   restored".

**Tests:** policy test that the reconnect command carries exactly the eligible
stableIds; executor test (fake connectors) that only those are passed to reconnectAsync.
**Verify:** manual rows 2/5.

### F5. Rabby → "add MetaMask" no-op: Para's branded MetaMask connector is bound to Rabby's provider; the real MetaMask (EIP-6963) is discarded by dedupe

**Symptom** (manual row 12): with Rabby connected, clicking MetaMask in the add-list
does nothing. Reverse direction works.

**Root cause** (verified in `@getpara/evm-wallet-connectors` + our dedupe):
1. Para's `metaMaskWallet` resolves its provider as
   `window.ethereum.providers?.find(isMetaMask) ?? window.ethereum`; with Rabby as the
   default wallet there is no `providers` array and Rabby replaces `window.ethereum`
   (spoofing `isMetaMask: true`) → the branded "MetaMask" connector **talks to Rabby**.
2. The genuine MetaMask exists only as the EIP-6963 connector (`io.metamask`), but
   `dedupeWalletOptions` (`wallet-brands.ts:248-262`) keeps the **first** option per
   canonical label and branded connectors come first in `config.connectors` → the
   6963 option is discarded; the picker's "MetaMask" row points at the Rabby-bound
   branded connector.
3. Clicking it connects… Rabby's same address (auto-approved, no popup), which
   `buildAccounts` groups into the existing Rabby row by address → visually a no-op.
   Any error on a second click (`ConnectorAlreadyConnectedError`) is swallowed by the
   picker's `runAction` catch (`wallet-picker.tsx:162-175`, console.warn only).

**Fix (layered):**
1. In `dedupeWalletOptions` (or option building in `para.tsx:740-748`): when two
   options share a canonical brand key, **prefer the connector whose id looks like an
   rdns** (contains a dot, e.g. `io.metamask`) over a Para-branded one — 6963
   connectors are provider-accurate by construction.
2. Belt-and-braces in `connectEvmWallet`: before connecting, sniff
   `await target.getProvider()` with `detectEvmProviderBrand`; on brand mismatch with
   the requested canonical key, look for another connector whose provider sniffs to the
   requested brand and connect that one instead. Log `evm:connect-brand-mismatch`.
3. Surface failures: `runAction` in `wallet-picker.tsx` should set a visible error
   state (even a transient row shake/toast), not just `console.warn`. (Picker is
   DO-NOT-TOUCH for behavior, but error *surfacing* is a bugfix — keep it minimal.)

**Tests:** `wallet-brands.test.ts` — dedupe prefers rdns-id connector over branded
duplicate; brand-mismatch redirect picks the 6963 connector (fake providers with
`isRabby`/`isMetaMask` flags).
**Verify:** manual row 12 both directions.

---

## P2 — Defects found in code review (not yet user-visible, or partially)

### F6. **CRITICAL** — EIP-5792 batched sends ignore the active wallet: `connector` silently dropped

`safe-wagmi-hooks.ts:184-219`: `useSafeSendCallsSync`'s wrapper destructures a fixed
9-field list and forwards only those — the `connector: activeConnector` passed at
`para.tsx:1117-1123` (hidden by an `as never` cast) never reaches wagmi. A 5792-capable
wallet with active ≠ wagmi-current sends the batch from the **wrong wallet** — exactly
the M12 scenario, and a direct violation of the new DOMAIN invariant. `@wagmi/core`'s
`SendCallsSyncParameters` does accept `ConnectorParameter` (verified). **Fix:** add
`connector` to the destructure/forward list, type it properly, delete the `as never`.
Audit the other `as never` casts at `para.tsx:1166, 1179` while there — they currently
work because those wrappers pass args through opaquely, but type them honestly.

### F7. Capabilities still keyed to wagmi's current account

`safe-wagmi-hooks.ts:169-182` calls `useCapabilities()` with no args; the result drives
the 5792-vs-legacy decision in `executeWalletCalls`. When active ≠ current, the
decision is made on the wrong wallet's capabilities. **Fix:** pass
`{ account: active.address, connector: activeConnector }` (hook accepts both —
verified). Plan Phase 4 table explicitly required this.

### F8. `selectAccount`: dispatch-last ordering + synthetic Para row unselectable

`para.tsx:784-826`. Two defects vs plan Step 4.2:
1. It awaits `switchAccountAsync` and only dispatches `user/select-active` on success —
   the plan demanded dispatch FIRST, cosmetic switch after in try/catch ("active is
   OURS now"). As written, a rejected wagmi switch means the registry never records the
   user's choice — the old "first click doesn't stick" class of bug re-enters.
2. The dispatch is gated on a live wagmi connection (`evmConnections.find(...)`), so
   the registry's synthetic Para connection (uid `para-session`, exists when the Para
   session is up without a wagmi connection) is a **silent no-op** when clicked.

**Fix:** resolve the target from `registryStore.getSnapshot().connections`; dispatch
`user/select-active` immediately; then best-effort `switchAccountAsync` in try/catch
logging `active-evm:cosmetic-switch-failed` (skip the cosmetic switch entirely for the
synthetic Para uid). Test: reducer already covers select-active; add an adapter-level
test if feasible, else cover via picker test that clicking the Para row marks it active.

### F9. Align-to-preference chain-switch effect was deleted, not threaded — decide: restore or ratify

HEAD's para.tsx had an effect auto-switching the wallet to `selectedEvmChainId`; the
working tree keeps only wallet→preference sync (`para.tsx:434-454`). Net change: on
refresh, the persisted chain preference gets overwritten by whatever chain the wallet
reports, and switching to a wallet on another chain no longer aligns it to the chosen
network. The plan's Phase 4 table listed this effect as a call site to keep (with
`connector` + the in-flight guard). Undocumented deviation. **Fix:** ask the user which
behavior is intended. If restore: re-add the effect with
`switchChainAsync({ chainId, connector: activeConnector })` guarded by
`evmSwitchInFlightRef`. If ratify: document in STATE.md + WALLET-ARCHITECTURE.md and
delete the plan-table row.

### F10. `resolveActive` can re-activate an explicitly dropped wallet

`registry/policy.ts:65-98` never consults `intents.droppedAddresses`; if a just-dropped
connection is still live when a `connections-changed` lands (disconnect command in
flight or executor skipped on a missing uid, `para.tsx:340-354`), the `firstExternal`
fallback can re-select and re-persist it. Plan Phase 1 demanded "dropped address never
re-becomes active". **Fix:** filter fallback candidates (and persisted-wish matches)
against `droppedAddresses`. Add the reducer test the plan listed.

### F11. Family disconnect leaves zombie grace identity

`user/disconnect-family` (reducer) neither populates anything the grace selector reads
nor clears `evmGrace`; `selectors.ts:71-76` derives `explicitDisconnect` only from
`droppedAddresses`. "Disconnect all" can display the old wallet identity for up to
1.8s. At HEAD this was suppressed via `explicitEvmDisconnectRef`. **Fix:** clear
`evmGrace` in the `user/disconnect-family` transition (cleanest), or include
`intents.explicitFamilyDisconnect.evm` in the selector's `explicitDisconnect` input.
Reducer test: family disconnect → `selectEvmIdentity` returns empty immediately.

### F12. Suppression semantics are inverted relative to the original contract, with the reason-whitelist duplicated

The Para-auth reason strings (`para-social-login`, `para-auth-modal`,
`para-evm-connect-fallback`, `para-account-modal`) are copy-pasted in
`registry/policy.ts:130-134` AND `registry/store.ts:112-115`, and `suppressedUntil` now
means "block popups" for some reasons but "delay-then-allow" for auth reasons — one
field, two meanings. This was a deliberate hotfix (STATE.md records it) but it's a
drift trap. **Fix:** introduce a distinct state field (e.g. `heal.authFlowUntil`)
or at minimum a shared exported `isParaAuthFlowReason(reason)` helper used by both;
update `WALLET-REFACTOR-PLAN.md` §Phase 5 + `WALLET-ARCHITECTURE.md` to describe the
real semantics. Re-check whether F2/F3 make the 8s delay unnecessary.

### F13. DO-NOT-TOUCH violation: per-row Para sign-out removed from the picker — needs user decision

Uncommitted edit `wallet-picker.tsx:372` (`adapter.disconnect && !account.manageable`)
+ a test locking it in: manageable (Para) rows now show only "Manage", no per-row
Disconnect. This violates the plan's picker freeze AND functional invariant #1 /
matrix row M5 ("per-row sign out Para … sticks across refresh") — the adapter's
Para-aware `disconnect({accountId})` path (including the careful same-address
`markDroppedAddress` reducer logic added in Phase 5) is now unreachable from the UI.
Manual row 11 recorded per-row Para sign-out as PASS, so the tester either tested
before this edit or via another surface. **Fix:** present both options to the user:
(a) revert the edit (restore the disconnect button alongside Manage) — default
recommendation, matches plan + matrix; or (b) ratify "Para signs out via its Manage
modal", then update the matrix row M5, the invariants list, and STATE.md. Do not leave
it as an undocumented drive-by.

---

## P3 — Minor issues, cleanups, and deferred UX (batch into one or two commits)

1. **Dead boot debug/persist commands** — `registry/commands.ts:70-79` is unreachable:
   the store constructor calls `reduce()` directly, bypassing `planCommands`
   (`store.ts:32-36`), so `boot/init` loses its `active-evm:persisted` debug line.
   Either route boot through `dispatch` or log explicitly in the constructor.
2. **Store created in `useMemo`** (`use-wallet-registry.ts:22-37`) — React may discard
   memo caches; recreation = total in-memory registry loss (the exact failure mode
   gotcha #1 warns about). Use a `useRef`/lazy `useState` initializer. Add `dispose()`
   if F2's store-owned timer lands.
3. **Heal budget double-compute** — the reducer's `countPlannedHealConnects`
   (reducer.ts:426-440) and `planCommands`' `planHeal` over a reconstructed prev-state
   must agree exactly or the budget drifts; also `const stateForHeal = { ...state,
   phase: state.phase }` is a no-op spread. Restructure so the decrement comes from the
   single `planHeal` result (e.g. planCommands returns the count to the reducer via the
   event, or budget bookkeeping moves wholly into commands). Also: the budget is never
   replenished per page-load lifetime — plan said "per page load"; consider resetting
   on `user/connect-succeeded`.
4. **`preferParaOnConnect` lingers** (reducer.ts:190-217) — flag isn't cleared when an
   external wallet is live+active, so Para can grab active much later when the external
   drops; also means Para social sign-in while an external is active does NOT make Para
   active (deviation from plan Step 4.5's "deliberate connect becomes active"). Clear
   the flag once consumed or deliberately keep + document.
5. **Spurious persists** — `persistableChanged` (commands.ts:12-20) JSON-compares all of
   `intents` including transient fields (`pendingSolanaWallet`, `preferParaOnConnect`)
   that `toPersisted` doesn't write → churny localStorage writes. Compare only the
   persisted projection.
6. **`planDisconnect` family path emits a disconnect for the synthetic `para-session`
   uid** (policy.ts:215-221) → guaranteed `registry:command-skip` noise per family
   disconnect. Filter `kind === "para"` synthetic connections.
7. **`connectSolanaWallet` lost HEAD's fast path** — already-selected wallet used to
   `await solanaWallet.connect()` directly; now everything routes through the 400ms
   grace machine, and connect errors are swallowed in `solana-source.ts:92-97` instead
   of propagating to the picker's runAction. Restore the fast path and/or propagate
   rejections to the pending-promise.
8. **`getWalletClientFor` swallows all errors** (safe-wagmi-hooks.ts:75-82) → AA owner
   silently degrades to session-only. Add a `walletDebug("aa:wallet-client-failed")`.
9. **Stale-closure hardening** — adapter methods resolve `activeConnector` from the
   render-time `registryState` (para.tsx:709-714); correctness currently relies on the
   memo recomputing every render (accident of `useSafeSolanaWallet` returning fresh
   objects). Resolve via `registryStore.getSnapshot()` inside async methods to be
   robust by construction.
10. **UI flash when switching active Para → external** (manual row 9 note, Open
    Question 9): likely the add-list expander/section recalculation when `accounts`
    re-orders. Investigate `wallet-picker.tsx` connected-section keys; stabilize row
    identity (`key={account.id}` vs address-keyed) before reaching for animation fixes.
11. **SVM cluster switch refreshes parts of the page** (manual row 18, Open Question 8):
    pre-existing known UX (cluster switch remounts the Solana provider subtree —
    WALLET-ARCHITECTURE.md §14 lists the remount UX as an open decision). Confirm
    nothing NEW regressed vs main, then park it under the §14 decision; not a refactor
    follow-up.
12. **Registry artifacts** — after all fixes: `pnpm run build:registry`, sync
    `apps/landing/public/r/`, re-run the pinned artifact test
    (`pnpm exec vitest run packages/client/test/registry-chain-artifacts.unit.test.ts`).
13. **Phase 7 (para.tsx decomposition) remains undone** — para.tsx is 1,448 lines
    (target was <400/module). Recommend doing it as its own PR *after* these fixes land
    and the manual matrix is green, exactly as STATE.md suggests. Do not mix it into
    the fix commits.

---

## 4. Manual re-test map (after fixes)

| Fix | Re-run rows (results doc) |
|---|---|
| F1 | 19, 20, 21, 22 |
| F2+F3 | 7, 8, and regression 9/10/11 |
| F4 | 2, 5 |
| F5 | 12 (both directions) |
| F6+F7 | 20 (external active, 5792 wallet if available) |
| F8 | 10 (set Para active), 4 |
| F11 | 13 |
| F13 | 11 (whichever way the decision goes) |

## 5. Process notes (for the record — read once, then just follow §0)

- The execution violated the plan's commit discipline (nothing committed across 10
  phases), did not update the plan file on deviations (Phase 7 skip, align-effect
  deletion, suppression inversion, connect-succeeded scope change, picker edit), and
  made one DO-NOT-TOUCH edit (F13). STATE.md, to its credit, honestly recorded most of
  this.
- Both production-blocking bugs lived in untested boundary code (the wagmi source's
  timer lifecycle; the executor's sync-vs-async reconnect) while the pure core had 40+
  new tests — when adding tests for these fixes, prioritize the source/executor layer.
- The two pre-review hotfixes (suppression carve-out, 8s delay) patched symptoms of F2
  without finding it; with F2 fixed, revisit both (see F3/F12).
