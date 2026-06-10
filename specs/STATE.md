# Current State

## Last Updated

2026-06-10 - Para brand logo + provider-branded social row in the picker (multi-wallet)

## Recent Changes

### Wallet picker: Para brand logo + provider-branded social row (2026-06-10)

Branch `polish-multi-wallet`. `icons/wallets/index.tsx` + `icons/wallet-map.tsx` + `wallet-picker.tsx` + `wallet-picker.test.tsx`. GUI only; backend contract unchanged. Two product asks.

- **Para brand mark wired into the wallet icon map** (`wallet-map.tsx`): reused the existing `ParaIcon` from `icons/apps` (the apps-list Para logo) rather than a duplicate — added `para: ParaIcon` + a `key.includes("para")` branch in `getWalletIcon`. This alone fixes the **connected Para row** — it was falling back to the generic `WalletIcon`; now `WalletIconSlot` resolves "Para" → the real Para logo. Label was already "Para". (Side effect: the connect-bar trigger avatar for Para also shows the logo now — consistent.) `WalletIconSlot` renders the Para mark at `PARA_RATIO` (15% smaller than `BRAND_RATIO`) since it reads heavier than the others at the shared size — same per-brand tuning Phantom already uses.
- **Social-login row rebranded** to the account provider (`wallet-picker.tsx`, `SocialLoginRow`): title = provider brand from `formatWalletProvider(identity.walletProvider)` ("Para"), subtitle = the method label ("Email or Google"), icon = the Para brand mark (`WalletIconSlot`) instead of the mail icon. Was: title "Email or Google" / subtitle "Add an Aomi account" (linked) or "Fast account sign-in" (disconnected) / mail icon. Falls back to the old method-label + mail icon when no provider brand exists (`brandLabel` undefined) — so non-Para adapters degrade cleanly. `aria-label` stays the method label, so existing button-name queries are unaffected. Dropped the now-unused `linkedMode` prop from `SocialLoginRow`.
- Tests: harness identity gained `walletProvider: "para"` (mirrors the real adapter). 2 new cases — social row shows "Para" title + "Email or Google" subtitle + Para brand mark; falls back (no "Para" mark) when `walletProvider` is undefined. 57 registry tests green, lint clean, typecheck clean except the pre-existing `GITHUB` error (`para.tsx:231`).
- **Not yet eyeballed live**: confirm the Para "P" mark reads well at slot size on the connected row + the social row.

### Wallet picker: per-row "manage" action for manageable wallets (2026-06-10)

### Wallet picker: per-row "manage" action for manageable wallets (2026-06-10)

Branch `polish-multi-wallet`. `types.ts` + `para.tsx` + `wallet-picker.tsx` + `wallet-picker.test.tsx`. Backend contract unchanged. Driven by "wallets with a management menu should have a manage option, not just sign out — e.g. Para".

- **New optional `manageable?: boolean` on `AomiAccount`** (`types.ts`). Set when an account has an in-app management surface (the handler is the adapter's existing `openAccountUI({ family })`). External wallets managed only in their own extension (MetaMask, Phantom) leave it unset.
- **Para adapter marks its own account manageable** (`para.tsx`): after `buildAccounts`, accounts whose `walletName` canonicalizes to `"para"` get `manageable: true`, gated on `Boolean(paraModal) && isConnected`. External wallets connected *through* Para keep their brand name → stay unmanaged. Renamed the `buildAccounts` result to `builtAccounts` and map over it.
- **Picker renders a per-row gear button** (`Settings2Icon`) **before the logout icon** in `FamilyStatusRow`, shown only when `account.manageable && adapter.openAccountUI && adapter.canOpenAccountUI`. Click → `openAccountUI({ family })` then `closePicker()` (the Para modal takes over). New `onManage` prop + `manage:${id}` pending key. The header "Account" button stays (account-level entry); the per-row button is the wallet-level manage. Order in the right cluster: Active pill → manage → logout.
- **Add-list separators tidied** (`wallet-picker.tsx`): a hairline now divides the Connected section from the link/add area (rendered after `connectedSection` when anything follows). The full-list row was renamed `"More wallet options"`/`"Connect or link additional wallets"` → **"Other wallets"** (subtitle still "Open the full wallet list", both modes). The brand connect options render as one **flat list** — EVM, then Solana, then "Other wallets" — with **no separators between families** (the earlier EVM↔Solana hairline was removed per the user, connected and disconnected alike); dropped the now-unused `Fragment` import. Test updated (`"Other wallets"`).
- **Provider sign-in row visibility = gated on Para, not on any connection**: the "Para / Email or Google" row (under a "Quick sign-in" label) shows whenever **Para itself is not connected** — including alongside connected external wallets, so Para stays reachable to (re)connect — and hides once Para is connected (`socialOptionsToShow = paraAccountConnected ? [] : socialLoginOptions`, where `paraAccountConnected = connectedAccounts.some(a => a.manageable)`). The section label is always "Quick sign-in" (dropped the "Link additional accounts" wording the user disliked). (This is the final rule after a back-and-forth: brief "hide whenever connected" pass was reverted per user — they want it shown whenever Para isn't connected.)
- **Active EVM account now persists across refresh** (`para.tsx`). Selecting a non-Para wallet (e.g. MetaMask) as active didn't survive reload — wagmi/Para's connector re-asserts Para as current. Fix: persist the chosen address to localStorage (`aomi.wallet.active-evm-address`) in `selectAccount`, and a once-per-load restore effect re-applies it via `switchAccount` once the matching connection reconnects (guarded by `accountSwitchInFlightRef` so it doesn't fight the reconnect effect). Cleared when that account / the EVM family is disconnected. **Not verified live** — needs two extensions; watch for Para re-asserting active *after* the one-shot restore (would need a repeating enforce instead of attempt-once).
- **Fixed: Para sign-out didn't stick across refresh** (`para.tsx`). The per-row "sign out" only dropped the wagmi connector; Para's embedded/social session stayed alive and silently re-attached on the next load. Now wired `useLogout` from `@getpara/react-sdk` (re-exported via react-core) behind a `useSafeLogout` wrapper → a `logoutParaSession()` helper in `disconnect`. Called when signing out the Para account (`accountId` path, `canonicalWalletKey(walletName) === "para"`) and on a full `{ family: "all" }` disconnect; a family-scoped disconnect leaves the Para session alone. Note: Para logout is cross-tab (the reason it was previously deferred to the account modal) — acceptable for the sign-out action. **Not verified live.**
- **Fixed: first EVM account switch after load reverted** (`para.tsx`). On a fresh load with Para active, clicking MetaMask switched for a few ms then flipped back to Para; the 2nd click stuck, and a refresh reset it. Cause: during the first `switchAccount`, wagmi's *current* connection briefly reads disconnected, the auto-reconnect effect fired `wagmiReconnect()`, and that restored the previous (Para) connection. Fix: the reconnect effect now only fires on a *truly wiped* session (`!wagmiConnected && evmConnections.length === 0`) — during a switch the connections list stays populated — plus an `accountSwitchInFlightRef` set around `switchAccountAsync` that the effect skips on. (Still recovers the Para-session-reinit wipe it was built for, where connections go empty.) **Not verified live** — needs two real wallet extensions; confirm a single MetaMask click sticks.
- **Removed the "Active" pill and the "Switch" hover hint** (per product call). Active state still reads from the checkmark next to the name + the highlighted row border/bg; the in-progress spinner on switch is kept. With the pill gone the trailing cluster is just `[manage?] [logout]`; logout is right-anchored so it aligns across rows on its own — so the earlier `reserveManageSlot` fixed-column machinery was reverted as unnecessary. (Considered a gear on every wallet for symmetry but external wallets have no in-app management surface, so the gear would open nothing.)
- Tests: 2 new cases in `wallet-picker.test.tsx` — manage button shows for the manageable Para row but not the Phantom row and fires `openAccountUI({family:"evm"})`; hidden when `canOpenAccountUI` is false. 55 registry tests green, lint clean, typecheck clean except the pre-existing `GITHUB` error (`para.tsx:231`).
- **Not yet eyeballed live**: verify the gear renders on the Para row (not Phantom) and opens the Para account modal.

### Network selector debloat: testnet collapse + lighter rows + Command primitive (2026-06-10)

Branch `polish-multi-wallet`. `network-select.tsx` + `network-select.test.tsx` + `vitest.setup.ts`. GUI only; adapter/backend contract unchanged. Driven by "the list looks bloated" — 13 rows with testnets at full weight.

- **Collapse testnets behind a "Show testnets" toggle.** Mainnets show by default; testnets fold behind a footer toggle that advertises the hidden count ("3 hidden"). Partition is derived, not configured: `chain.testnet === true` for EVM, `cluster !== "solana:mainnet"` for SVM. Default landing view drops from 13 rows to 8. Toggle state persists to a standalone localStorage key (`aomi.network-select.show-testnets`) — kept out of `WalletPreferences` since it's a display pref, not a wallet selection. **Edge cases:** if the *active* network is a testnet the rows stay visible and the toggle is suppressed (can't hide the network you're on); a non-empty search query also forces testnets visible so search can jump to one ("sep" → Sepolia) while collapsed.
- **Lighter rows.** Only the live network carries a filled icon chip (`bg-primary/10`); inactive rows show a bare brand mark (`text-muted-foreground`), so the list reads as one clean column instead of a stack of grey boxes.
- **Rebuilt on the `Command` (cmdk) primitive** — same as the App/Model selectors, for keyboard nav + structural consistency. Kept real chain names in rows (per the earlier "row titles keep real names" decision); did NOT shorten labels.
- **Search input is count-gated, not always-on.** Decided against a permanent search box: at ~8 branded rows it's chrome that re-bloats what we just trimmed, and logo-recognition beats typing for a small set. `CommandInput` renders only when the default (mainnet) list exceeds `SEARCH_VISIBLE_THRESHOLD` (=10) — so it stays hidden at today's scale but appears for hosts that configure many custom chains. One constant to tune (0 = always show). Search reveals testnets when active.
- **Kept intact:** connection-aware family gating (EVM-only → no SVM rows, etc.), trigger chips ("Base / Mainnet"), the destructive-SVM-switch confirm dialog, the wallet-activation guard, and the `≤1 switchable target → render null` guard (counts all targets incl. testnets).
- **Test env:** cmdk needs `ResizeObserver` + `Element.scrollIntoView`, both absent in jsdom — added no-op stubs to `vitest.setup.ts` (also unblocks future cmdk-based component tests). Reworked the 4 network-select tests for cmdk's `role="option"` items; added 2 cases (testnet hidden-by-default + toggle reveal; active-testnet keeps rows visible + suppresses toggle). 53 registry tests green, lint clean, typecheck clean except the pre-existing `GITHUB` OAuth-label error (`para.tsx:231`).
- **Not yet eyeballed live** (preview infra was flaky this session): verify the dropdown visually — testnet collapse/expand, lighter rows, trigger unchanged. Layout separation (Axis B: unified list vs two control-bar pills) was discussed and deferred — staying on the unified popover for now.

### EVM network switch killed the wallet connection (flash loop + dead switcher) (2026-06-10)

Branch `polish-multi-wallet`. Symptom: switch an EVM network once → wallet approves → EVM wallet logo + EVM network chip start flashing ~every second (off a few ms, back on) and network switching is dead until reload. Three stacked bugs in `aomi-auth-adapter`:

1. **Root cause — Para SDK rebuilt the wagmi config on every network switch** (`para.tsx`, `AomiParaProviderInner`). `resolvedWallets` was recomputed (new array identity) on each render and `paraClientConfig`/`config` were inline JSX objects. A network switch updates the network-preferences context → Inner re-renders → new `externalWalletConfig.wallets` identity → Para's `ParaProviderMin` does an identity compare (`externalWallets !== externalWalletConfig?.wallets`), pushes the array into its zustand store → `@getpara/evm-wallet-connectors` `ParaEvmProvider` sees a new wallet list → `createWagmiConfig()` from scratch → **all in-memory connections dropped** (wagmi's reconnect-on-mount doesn't re-run for a swapped config prop — mount-only effect). Fix: `useMemo` `resolvedWallets` / `paraClientConfig` / `paraConfig` (`apiKey ? {…} : null`, JSX branches on `paraClientConfig`), hoisted shared `defaultOAuthMethods` module const (a fresh `["GOOGLE"]` default array per render churned the `oAuthMethods`-keyed memos in both Inner and `AomiParaAdapterProvider`).
2. **Flash oscillation — grace window restarted itself** (`evm-identity-grace.ts`). On expiry it returned `disconnectedAt: null`; the provider wrote that back to the ref, so the next render treated the still-missing address as a *fresh* disconnect and restarted the 1.8 s grace → identity flipped cached(on) → empty(off) → cached(on) forever. That's the visible ~1 s flash of the EVM logo + chip. Fix: expired branch now preserves `disconnectedAt` so it stays expired until a live address returns. Test updated + regression test added (feed expired result back in → must stay expired).
3. **No self-heal** (`para.tsx` reconnect effect). Auto-reconnect required `paraAccount.isConnected`, so external-wallet-only sessions (MetaMask/Rabby without Para login) never recovered from an in-memory wagmi reset. Fix: reconnect now keys off `hadEvmConnectionRef && !explicitEvmDisconnectRef` (still one attempt until restored; wagmi `reconnect()` only restores storage-persisted connectors so it can't fight a deliberate disconnect). `explicitEvmDisconnectRef` declaration moved up next to the reconnect refs.
4. **Bonus race fix**: `selectNetwork`/`switchChain` set the chain preference then await `switchChainAsync`, while the align-to-preference effect *also* fired `switchChainAsync` as soon as the preference changed (wagmi `chainId` still old) → two concurrent `wallet_switchEthereumChain` (dup popups / -32002 in some wallets). New `evmSwitchInFlightRef` set around user-initiated switches; the effect skips while set. Effect's promise also gets a `.catch` (was an unhandled rejection on user reject).
5. Typed `evmConnectionInputs` as `EvmConnectionInput[]` — fixes the `string` vs `` `0x${string}` `` tsc error the uncommitted grace wiring introduced.

51 registry tests green, lint clean, typecheck clean except the pre-existing `GITHUB` OAuth-label error (`para.tsx:231`). **Not verified live** (needs a real wallet extension): user verifying manually — load → connect → switch EVM network → no flash, switcher stays usable, repeat switches work.

### Network selector rebuild: connection-aware + unified + logos (2026-06-09)

Branch `polish-multi-wallet`. `network-select.tsx` + `network-select.test.tsx` + `icons/chains/index.tsx`. GUI only; adapter/backend contract unchanged.

- **Connection-aware gating.** Which families surface now follows what's actually *connected* (`identity.address` for EVM, `identity.svmAddress` for SVM), not just what the host *supports*. EVM-only wallet → only EVM networks; SVM-only → only SVM; both → both. When nothing is connected it falls back to showing all supported networks so the picker doubles as a pre-connect preference. (Was: gated on supported-network counts, so it always showed both EVM+SVM tabs regardless of connection.)
- **Collapsed the EVM | Solana tab toggle into one unified list.** Single scrollable popover; when both families are present, subtle uppercase group headers (`EVM` / `SVM`) separate them. One family → no header. Matches the flat-list direction the wallet picker already landed on. Removed the `panel`/`setPanel` tab state + its reset effect + `canShowFamilyTabs`.
- **Brand logos everywhere.** Added `SolanaIcon` to `icons/chains/index.tsx` (official 3-bar mark, monochrome `currentColor`, layered opacities). SVM rows + trigger now render it; EVM rows/trigger use `getChainIcon`. The **trigger** previously had no logo (the user's main gripe — sibling Model/App selects show one): it now renders `icon + label` per shown family, joined by a `/` separator (e.g. `[Base] Base / [◎] Mainnet`). EVM chip label = chain name; SVM chip label = cluster (`Mainnet`/`Devnet`/`Testnet`), the icon carrying the family.
- **"Solana" → "SVM"** in UI chrome: group header + confirm-dialog title/body ("Switch SVM network?"). Network *row* titles keep their real names ("Solana Mainnet" etc.).
- **Fixed first-row always looking pre-selected.** Radix auto-focuses the first row on open; `focus:bg-accent` painted it as if hovered/active. Switched to `focus-visible:` so the highlight only shows for keyboard nav, not the mouse-triggered open. `isActive && bg-accent` still marks the live network.
- **Hide guard** now counts only *visible* (shown-family) targets — hides the selector when ≤1 switchable network is visible.
- Tests reworked: dropped the tab-click steps; added an EVM-only gating case (Solana rows absent) + a both-connected unified-list case; `createHarnessAdapter` gained `address` / `evmChains` / `solanaNetworks` overrides. 45 registry tests green, lint clean, registry typecheck clean for changed files (pre-existing `GITHUB` error in `para.tsx:222` unchanged).
- **Not yet eyeballed live**: trigger logos + connected-family gating need a real wallet connection to fully exercise (automated preview can't sign one) — user verifying via screenshots.

### Connect/wallet trigger button restyle (2026-06-09)

Branch `polish-multi-wallet`. `dual-wallet-bar.tsx` only. Iterated once on product feedback.

- **One shared button surface for both states.** Dropped the deep-black connected (`bg-primary`) state and the dashed-border disconnected state. Both now use the original `bg-muted` fill with a **solid** `border border-border` outline and `hover:bg-muted/70`, text in full `text-foreground` (was `text-muted-foreground`) so "Connect wallet" reads clearly. (First pass tried `bg-foreground/[0.05]`; reverted to muted per feedback.)
- **Connected**: active wallets render as circular brand avatars **plus the short address(es)** beside them (`formatAddress`, joined ` / `). Discs are **opaque `bg-muted` with a `ring-1 ring-border` outline** and **stack** with `-ml-2` overlap — opaque so the front disc masks the one behind (a translucent fill let the back logo bleed through). Button padding tightened to `px-3.5 py-2` so more of the address fits.
- **Shared icon rendering** (`wallet-icon-slot.tsx`): the picker's `WalletIconSlot` was extracted into its own module and is now used by **both** the picker rows and the trigger avatars, so brand mark colour (`text-muted-foreground`), proportional sizing, the Phantom-art quirk, and the iconUrl/generic fallbacks are defined **once**. It takes a numeric `size` (slot px; mark scales from it via fixed ratios) + a `className` to restyle the slot (the trigger passes `rounded-full ring-1 ring-border` + stack margin; picker uses the 36px default). The trigger uses `size={28}`. This fixed the "logo colours off (esp. Phantom)" by matching the modal exactly.
- **Note**: the brand icons in `components/icons/wallets` are **monochrome** (`fill="currentColor"`), so they tint to `currentColor` — now consistently `text-muted-foreground` in both surfaces. True brand colours would need new colored SVG assets; not done (the muted-foreground look matches the approved modal).
- **Responsive disclosure (container queries).** The trigger button is now an `@container`; its content reveals more as the bar widens (fixing "button grows but text doesn't"). Each connected wallet carries a `detail` (EVM chain name via `getChainInfo`, Solana cluster via `solanaClusterLabel`). For a **single** wallet (most empty space): network `· {detail}` appears at `@[12rem]`, and the address swaps short→`longAddress` (12+8 hex) at `@[15rem]`. For **two** wallets: addresses stay short (avatars stacked), network only at `@[20rem]`. `singleWallet = connectedWallets.length === 1` drives the breakpoint choice. Breakpoints tuned for a ~15rem (w-full sidebar-footer) button — easy to nudge.
- **Not yet eyeballed live**: connected-state avatars + responsive tiers need a real wallet connection (preview can't sign one) — verify via screenshots in a real browser, and confirm/adjust the `@[...]` breakpoints against the actual sidebar width. Lint + registry typecheck clean; 13 picker tests pass.

### Wallet picker: dedup + network grouping + collapsible add-list (2026-06-09)

Branch `polish-multi-wallet`. GUI/adapter polish; backend contract unchanged. Done in two passes (same day).

Adapter (`apps/registry/src/lib/aomi-auth-adapter/`):
- **Fixed duplicate connected rows** (Rabby "take over MetaMask" / EIP-6963 impersonation). `buildAccounts` (`accounts.ts`) groups EVM connections by **lowercased address** → one row per address. Display name/`id` prefer the active connector, else a real brand over a generic "Injected" label; the row carries `connectorIds` + `chainId`. Solana deduped defensively by `publicKey`. Distinct addresses stay separate.
- **"Sign out one = sign out all" fixed** as a side effect — `disconnect({accountId})` in `para.tsx` already groups by address; correct once the display is one row per address. `para.tsx` unchanged.
- **`AomiAccount` type** (`types.ts`) gained optional `chainId` + `connectorIds`.

Picker (`wallet-picker.tsx`):
- **Connected section is one flat list** (network grouping was tried, then dropped per product feedback). Each row carries a compact **`FamilyTag`** — text "EVM"/"SVM" with a small green status dot (no chip outline) — so execution family is clear. Chain/cluster shows inline in the meta line (`0xdA6..F0 · Base`, cluster capitalized: `· Mainnet`) only when it adds info beyond the family name.
- **Switching the active wallet = click the row.** The whole row (icon + name + meta) is one button for inactive EVM accounts (chevron removed); hover highlights the card + reveals a "Switch" hint, a spinner shows while switching, and the "Active" pill fades in. Disconnect stays a separate icon button beside it. Solana/active rows render as a static (non-clickable) row.
- **Section order when connected:** Connected → Quick sign-in → Add wallet; disconnected keeps Quick sign-in on top.
- **Collapsible "Add another wallet"** expander in the connected state (brand rows hidden until expanded, smooth grid-rows transition); collapses again after a direct link. Disconnected keeps the brand grid visible for onboarding.
- **Add-list is grouped by family** (EVM rows, hairline separator, Solana rows, hairline, multichain/"More" at the bottom) so a dual-chain wallet like Phantom appearing on both chains doesn't read as a duplicate.
- **Already-connected brands filtered** from the add-list, **family-scoped** (a connected EVM Phantom hides the EVM add row but leaves its Solana entry connectable).
- **Family-aware dedup** of add options (`walletFamilyAliasKey`) so a dual-chain wallet like **Phantom is reachable on both EVM and Solana** (previously its Solana entry was collapsed away by brand-only dedup — that's why Phantom only ever connected as EVM).
- **Direct connect/switch keeps the picker open** (no success banner, no forced close — the new wallet just lands in the connected list). Only external handoffs (WalletConnect / full Para list, via `isExternalHandoff`) close the picker so their own surface can take over.
- **Social section is context-aware:** label "Quick sign-in" (disconnected) → "Link additional accounts" (connected); row subtitle adapts to "Add an Aomi account" when connected.
- Solana cluster label is capitalized in the row meta (`· Mainnet`). The "Account" header pill kept as-is (per product decision).

Tests: `accounts.test.ts` (9 dedup cases) + `wallet-picker.test.tsx` (13 cases: grouping, collapsed/expanded add-list, connected-brand filtering, success state, dual-chain Phantom reachability, DOM order). Full registry suite green (44 tests). Registry typecheck clean for changed files (pre-existing unrelated `GITHUB`/`X` OAuth error in `para.tsx:222`, flagged separately). Lint clean.

- **Not yet eyeballed live**: connected-state visuals need real Rabby/MetaMask/Phantom extensions (automated preview can't install them) — verify via screenshots in a real browser.

### Account token-exchange runtime wiring + test coverage (2026-06-08)

Branch `codex/para-solana-support-wip` (PR #150). Merged `fix/pr150-runtime-wiring` (commit "Wire account token exchange into runtime") after review: builds, dist in sync, 26 runtime tests, portal typecheck clean.

- **Reviewed & verified adaptation** of the FE↔backend contracts: `createAccountAccessTokenProvider` → `POST /api/account/sessions/exchange` (`{ provider, provider_token }` ↔ backend `ExchangeAccountSessionRequest`), and `app` on `sendSystemMessage` → `/api/system` (backend merges query + JSON body via `select_system_params`). Both correct.
- **Removed dead `ThreadContextTest.tsx`** debug component (referenced removed `threads`/`threadMetadata`; failed `tsc --noEmit`, not caught by CI). Registry typecheck now clean.
- **FE unit coverage**: `packages/client/test/account-session.unit.test.ts` — caching, forceRefresh, single in-flight coalescing, proactive timer refresh + subscriber notify, dispose teardown, snake_case mapping (7 tests).
- **Live e2e**: `client.integration.test.ts` gained an LLM-free app-scoped system-message test (green vs local backend :8080 + local supabase).
- **Backend DB e2e** (product-mono, branch `test/account-exchange-db-e2e`): `entities.rs` test mirroring the exchange's Privy identity resolution + provider scoping (green vs local supabase :54322).
- **Known gap (flagged, no code)**: backend `ScheduledIntentDueEvent` (`scheduled_intent_due`, declared System→UI) from product-mono #564 has no FE handler — falls through as a raw system message. Product decision needed.



### Multi-wallet per-family connection + hybrid picker (2026-05-29)

Branch `codex/para-solana-support-wip`. Design/plan in `docs/superpowers/specs/2026-05-29-multiwallet-per-family-picker-design.md` and `docs/superpowers/plans/2026-05-29-multiwallet-per-family-picker.md`. Backend contract unchanged.

- **Default Solana cluster → mainnet** (was devnet) in `landing-para-provider.tsx`, `landing-privy-provider.tsx`, `portal/wallet-providers.tsx`.
- **Account registry**: `AomiAccount` type + `accounts`/`selectAccount` on `AomiAuthAdapter`; `disconnect({accountId})` for per-account EVM disconnect (`types.ts`, new `accounts.ts` with `buildAccounts`/`isAccountSelectable` + tests).
- **Persistence**: new `persistence.ts` (localStorage wallet prefs) wired into `network-preferences.tsx` (read-once `useState` init + save effect, `storageKey="para"`). `vitest.setup.ts` gained a localStorage polyfill + `IS_REACT_ACT_ENVIRONMENT`. Deviation from spec: persists selection only (family/chain/network), not active account — wagmi/solana-adapter restore their own active connection.
- **wagmi multi-connection**: `safe-wagmi-hooks.ts` gained `useSafeConnections`, `useSafeSwitchAccount`, and `WagmiConfigShape.connectors`.
- **para.tsx**: builds `accounts` from wagmi connections + Solana wallet; `selectAccount` → wagmi `switchAccount`; per-account EVM disconnect; EVM-connect guard (keys off `wagmiAddress`) so "Connect EVM" no longer reopens the Para modal when already connected. base-account/privy/context + network-select test mock got minimal `accounts:[]`/`selectAccount` conformance.
- **Hybrid picker**: new `wallet-picker-context.tsx` + `wallet-picker.tsx` (Para provider row + EVM/Solana family sections, inactive family greyed with "Switch to X" affordance, select/disconnect/connect). `dual-wallet-bar.tsx` rewritten to a trigger that opens the picker. Deleted `wallet-family-slot.tsx` (+ its public export).

### Registry app metadata crash guard (2026-05-27)

- **Fixed control bar crash on malformed app ids** in `apps/registry/src/components/control-bar/app-metadata.ts` by:
  - making `normalizeAppId` accept unknown values and safely return an empty string for non-strings
  - adding a fallback `Unknown App` metadata entry for empty/invalid ids
  - skipping invalid entries in `groupAppsByCategory` before calling `getAppInfo`
  - normalizing returned `AppInfo.id` values for consistent icon/selection behavior
- **Added regression test** `apps/registry/src/components/control-bar/app-metadata.test.ts` to verify non-string ids no longer crash grouping and empty ids resolve to fallback metadata

### Release version bumps for publish (2026-04-27)

- **Bumped package versions** for the three publish targets:
  - `@aomi-labs/client`: `0.1.28` -> `0.1.29`
  - `@aomi-labs/react`: `0.3.12` -> `0.3.13`
  - `@aomi-labs/widget-lib`: `1.2.8` -> `1.2.9`
- **Updated files:** `packages/client/package.json`, `packages/react/package.json`, `apps/registry/package.json`

### CLI root-shape alignment with Rust CLI (2026-04-19)

- **Added root chat mode** to `packages/client/src/cli/root.ts` + new `src/cli/repl.ts`:
  - `aomi` now starts an interactive REPL by default
  - `aomi --prompt "<message>"` sends a single prompt and exits
- **Added REPL commands** matching the backend CLI shape: `/heap`, `/app`, `/model`, `/key`, and `:exit`
- **Added provider-key support** to the TS CLI:
  - new `src/cli/commands/provider-keys.ts`
  - new `AomiClient` methods for `GET/POST/DELETE /api/control/provider-keys`
- **Kept noun-verb operator subcommands** (`tx`, `session`, `secret`, `model`, `app`, `chain`) for wallet/session workflows instead of removing them
- **Added unit coverage** in `test/cli/cli-provider-keys.unit.test.ts` and `test/cli/cli-repl.unit.test.ts`

### AA Proxy: Delete client-side complexity (2026-04-12)

- **Deleted 8 source files (~871 lines):** `cli/aa-config.ts`, `cli/commands/aa.ts`, `cli/commands/defs/aa.ts`, `aa/env.ts`, `aa/alchemy/env.ts`, `aa/pimlico/env.ts`, `aa/alchemy/resolve.ts`, `aa/resolve.ts`
- **Deleted 3 test files:** `aa-env.unit.test.ts`, `aa-resolve.unit.test.ts`, `cli-aa-config.unit.test.ts`
- **Rewrote `cli/execution.ts`** (285→170 lines) — removed `getCliAAApiKey()`, `getCliAlchemyGasPolicyId()`, `isCliProviderConfigured()`, `resolveAAProvider()`, `resolveAAMode()`, all `readAAConfig()` calls. New 3-way decision: `--eoa` → EOA, `PIMLICO_API_KEY` + pimlico → Pimlico BYOK, `ALCHEMY_API_KEY` → Alchemy BYOK, else → Alchemy proxy (zero-config default)
- **Added proxy transport to `aa/alchemy/create.ts`** — `proxyBaseUrl` param threaded through `CreateAlchemyAAStateOptions` → `createAlchemyWalletApisState`. Transport selection: `proxyBaseUrl ? alchemyWalletTransport({ url }) : alchemyWalletTransport({ apiKey })`
- **Threaded `proxyBaseUrl` through `aa/create.ts`** — `CreateAAStateOptions` and `createAAProviderState` pass through to Alchemy creator
- **Moved `AAProvider` type** from deleted `aa/env.ts` to `aa/types.ts`
- **Inlined env reads** — `pimlico/resolve.ts` uses `process.env.PIMLICO_API_KEY` directly (was `readEnv(PIMLICO_API_KEY_ENVS)`)
- **Inlined `alchemy/provider.ts`** — replaced `resolveAlchemyConfig` dependency with local `resolveForHook()` using `getAAChainConfig` + `buildAAExecutionPlan` + `NEXT_PUBLIC_*` env vars
- **Added `ALCHEMY_CHAIN_SLUGS`** to `src/chains.ts` — maps chain IDs to Alchemy network slugs for proxy URL construction
- **Deleted `parseAAConfig()`** (~75 lines) from `aa/types.ts` — along with `assertChainConfig()` and `isObject()` helpers
- **Removed `aomi aa` subcommand** from `cli/root.ts` — no more `aomi aa status/set/test/reset` commands
- **Updated `src/index.ts`** — removed exports for deleted symbols (`parseAAConfig`, `readEnv`, `isProviderConfigured`, `resolveDefaultProvider`, `resolveAlchemyConfig`, `AlchemyResolveOptions`, `AlchemyResolvedConfig`)
- **Updated barrel files** — `aa/index.ts`, `aa/alchemy/index.ts`, `aa/pimlico/index.ts` trimmed to match remaining modules
- **Rewrote `test/cli-execution.unit.test.ts`** — removed persisted-config tests, added proxy-mode tests (zero-config → `proxy: true`), added BYOK tests, added proxy URL assertion
- **Updated `test/aa-create.unit.test.ts`** — pass `apiKey` explicitly (no longer read from env by create function)
- All 155 tests pass, build clean, lint clean

#### New execution model
| Env vars | Flag | Result |
|---|---|---|
| (none) | (none) | **AA proxy** (zero-config, via backend) |
| `ALCHEMY_API_KEY` | (none) | AA BYOK (Alchemy direct) |
| `PIMLICO_API_KEY` | `--aa-provider pimlico` | AA BYOK (Pimlico direct) |
| any | `--eoa` | EOA |

### Phase 5: Cleanup legacy code (2026-04-12)

- **Deleted `src/cli/args.ts`** — hand-rolled `parseArgs()` + `getConfig()` parser fully replaced
- **Removed `ParsedArgs` and `CliRuntime` types** from `types.ts` — `CliConfig` is the single config type
- **`buildCliConfig(args)` in `shared.ts`** — single source of truth for CLI config, reads citty's typed args + env vars directly (no re-parsing `process.argv`)
- **Extracted `src/chains.ts`** — `SUPPORTED_CHAIN_IDS`, `CHAIN_NAMES` (from deleted `args.ts`)
- **Extracted `src/cli/validation.ts`** — `parseChainId`, `normalizePrivateKey`, `parseAAProvider`, `parseAAMode` (from deleted `args.ts`)
- **All handler functions** take `CliConfig` directly (no more `runtime.config` destructuring)
- **All def files** use `buildCliConfig(args)` instead of `toCliRuntime()`
- **Updated `commands/aa.ts`** import — `CHAIN_NAMES`/`SUPPORTED_CHAIN_IDS` from `../chains` (was `../args`)
- **Updated test files** — `cli-execution.unit.test.ts` uses `buildCliConfig()`, `cli-session.unit.test.ts` passes `CliConfig` directly, `cli-wallet-sign.unit.test.ts` passes `(config, txIds)` signature
- All 188 tests pass, build clean

### Phase 4: Flatten AA execution (2026-04-12)

- **Removed `"auto"` execution mode** from `CliExecutionMode` — now `"aa" | "eoa"` only
- **Removed `fallbackToEoa`** from `CliExecutionDecision` — AA either works or fails, no silent cascading
- **Deleted `executeTransactionWithFallback()`** (~100 lines) from `wallet.ts` — the 3-layer sponsored→unsponsored→EOA cascade
- **Simplified `resolveCliExecutionDecision()`** from ~80 lines to ~15 lines — just checks if provider is configured
- **Simplified `resolveAAProvider()`** — removed `required` parameter, always throws on missing config when AA requested
- **Removed `sponsored` parameter** from `createCliProviderState()` — no more sponsorship retry logic
- **Removed `isAlchemySponsorshipLimitError` re-export** from `execution.ts` — no longer needed by CLI
- **Updated `resolveExecutionMode()` in `args.ts`** — default is `"eoa"`, `--aa`/`--aa-provider`/`--aa-mode` set `"aa"`
- **Removed sign-flag command guard** from `getConfig()` — citty handles command routing now
- **Exported `CliExecutionDecision` type** from `execution.ts` for external use
- **Updated `tx.ts` defs** — refreshed flag descriptions for `--aa` and `--eoa`
- **Fixed `cli-session.unit.test.ts`** — updated to use `newSessionCommand` (pre-existing break from umbrella removal)
- **Updated all test expectations** — removed `fallbackToEoa`, changed `"auto"` to `"aa"`/`"eoa"`, fixed `sponsored` params
- **Updated `specs/AA-ARCH.md`** — CLI flow, decision type, single-shot sign, `fallback` field vs signing, `--aa-provider` / `--aa-mode` as AA triggers, `executeWalletCalls` + `fallbackToEoa` note for widget vs CLI
- **Made `execution` optional in `CliConfig`** — `undefined` means auto-detect (AA if configured, else EOA)
- **`resolveExecutionMode` returns `undefined`** when no `--aa`/`--eoa` flag (was returning `"eoa"`)
- **`resolveCliExecutionDecision` handles `undefined`** — checks if provider configured, uses AA automatically
- **Added `getAlternativeAAMode()`** — returns the other mode (7702↔4337) for fallback
- **Added mode fallback in `signCommand`** — tries preferred mode, if fails tries alternative, if both fail: hard error with `--eoa` suggestion
- All 189 tests pass, build clean

#### Execution model
| AA configured? | Flag | Result |
|---|---|---|
| Yes | (none) | **AA automatically** (7702 → 4337 fallback) |
| Yes | `--aa` | AA required, same fallback |
| Yes | `--eoa` | EOA, skip AA |
| No | (none) | EOA |
| No | `--aa` | Error: "configure AA first" |

### Spec: AA-ARCH.md refresh (2026-04-11)

- **Updated `specs/AA-ARCH.md`** to match current `packages/client/src/aa/` layout (`alchemy/` and `pimlico/` subpackages, `owner.ts`, dynamic SDK imports in provider `create.ts` files), CLI persistence (`~/.aomi/aa.json`, `aomi aa`, `aomi tx sign`), `AAState` naming, ERC-20 + 4337 mode override, and flattened CLI sign path (no sponsorship/EOA cascade).

### CLI Refactor: citty + noun-verb + AA config (2026-04-11)

- **Adopted citty** as CLI framework, replacing hand-rolled `switch` dispatcher
- **New file `src/cli/root.ts`** — root `defineCommand` with noun-verb subcommands tree
- **New directory `src/cli/commands/defs/`** — citty `defineCommand` wrappers for each noun:
  - `chat.ts`, `tx.ts` (list/simulate/sign), `session.ts` (list/new/resume/delete/status/log/events/close), `model.ts` (list/set/current), `app.ts` (list/current), `chain.ts` (list), `secret.ts` (list/clear/add), `aa.ts` (status/set/test/reset)
- **New file `src/cli/commands/defs/shared.ts`** — global args definition + `toCliRuntime()` bridge adapter
- **New file `src/cli/aa-config.ts`** — persistent AA config in `~/.aomi/aa.json`
- **New file `src/cli/commands/aa.ts`** — AA config command handlers
- **Modified `src/cli/main.ts`** — replaced `main()` switch + `printUsage()` with `runMain(root)` from citty
- **Removed legacy aliases** — no more `aomi sign`, `aomi log`, etc. at top level; use `aomi tx sign`, `aomi session log`
- **Removed umbrella routing** — deleted `sessionCommand`, `modelCommand`, `appCommand`, `chainCommand`, `secretCommand`; defs call leaf handlers directly
- **Extracted leaf handlers** — `newSessionCommand`, `resumeSessionCommand`, `deleteSessionCommand`, `currentAppCommand`, `currentModelCommand`, `setModelCommand`, `listSecretsCommand`, `clearSecretsCommand`
- **Deleted `createRuntime`** from `args.ts`

#### Command surface
```
aomi chat <message>                 Send a message
aomi tx list                        List transactions
aomi tx simulate <id>...            Simulate batch
aomi tx sign <id>...                Sign and submit
aomi session list|new|resume|delete|status|log|events|close
aomi model list|set|current
aomi app list|current
aomi chain list
aomi secret list|clear|add
aomi aa status|set|test|reset
```

### Landing `content/components` + resolve aliases (2026-04-03)

- **Moved** interactive docs-only UI from `apps/landing/src/components/` to **`apps/landing/content/components/`** (playground, samples, **`examples/`** (API consoles + collapsible demos), layout). Collapsible demo, playground, and widget demo use **`backendUrl = "/"`** (same-origin proxy).
- **`app/mdx-components.tsx`** — playground/samples from `@/content/components/...`; sessions/system consoles from **`@/components/examples/...`**.
- **`apps/landing/next.config.ts`** — `@/components` → **`apps/registry/src/components`**; **`@/components/examples`** → **`content/components/examples`** (must precede `@/components` in alias maps); **`@/content`** → `./content`.
- **`apps/landing/tsconfig.json`** — **`@/components/examples/*`** → `./content/components/examples/*` (before `@/*`); **`@/content/*`** → `./content/*`.
- **`content/examples/*.mdx`** — API console imports use **`@/components/examples/...`** (former `api-console/` folder removed; files live next to `aomi-frame-collapsible`, etc.).
- **Guide MDX** uses `@/components/...` for widget UI → **registry**, except **`@/components/examples/*`** → **content** examples.
- **Deleted `apps/landing/src/mdx-provider.tsx`** — unused stub; MDX uses **`app/mdx-components.tsx`**.

### Aomi wallet adapter rename (2026-04-03)

- **`apps/registry/src/lib/wallet-adapter.ts` → `aomi-auth-adapter.ts`** — auth adapter exports now use the `AomiAuth*` naming surface consistently.
- **Registry** — item `wallet-adapter` renamed to **`aomi-auth-adapter`**; install URL is now `https://aomi.dev/r/aomi-auth-adapter.json` (rebuilt `apps/registry/dist/` → `apps/landing/public/r/`).
- **`apps/registry/scripts/build-registry.js`** — clears `dist/` before writing so renamed/removed registry items do not leave stale `*.json` artifacts.

### Landing cleanup (2026-04-03)

- **Deleted `apps/landing/src/components/wallet-providers.tsx`** — unused; hero uses `LandingParaProvider` instead.
- **Deleted `apps/landing/src/components/config.tsx`** — only imported by the removed wallet providers file.

### Registry file renames (2026-04-03)

- **`control-bar/wallet-connect.tsx` → `connect-button.tsx`** — public surface is now `ConnectButton` / `ConnectButtonProps`.
- **`wallet-tx-handler.tsx` → `runtime-tx-handler.tsx`** — public surface is now `RuntimeTxHandler`. Registry item slug **`wallet-tx-handler` → `runtime-tx-handler`** (shadcn URL is now `https://aomi.dev/r/runtime-tx-handler.json`).
- **`apps/registry/src/registry.ts`** — updated `control-bar` file list, `aomi-frame` registry dependency, and runtime handler entry.
- **Rebuilt `apps/registry/dist/`** and synced to `apps/landing/public/r/`.

### Wallet Bridge Architecture (2026-04-03)

- **New file `apps/registry/src/lib/aomi-auth-adapter.ts`** — extracted `AomiAuthAdapter`, `AomiAuthAdapterContext`, `AOMI_AUTH_DISCONNECTED_ADAPTER`, `AomiAuthAdapterProvider`, and `useAomiAuthAdapter()`.
- **New file `apps/landing/app/components/landing-aomi-auth-bridge.tsx`** — `LandingAomiAuthBridge` runs inside the Para provider tree, reads wagmi + Para auth hooks, and writes `AomiAuthAdapterContext`.
- **New file `apps/landing/app/components/landing-para-provider.tsx`** — `LandingParaProvider` wraps `ParaProvider` + `LandingAomiAuthBridge` with all Para SDK config (apiKey, env, chains, wallets, oAuth).
- **Modified `apps/registry/src/components/aomi-frame.tsx`** — removed `AomiAuthAdapterProvider` wrapper and `adapter` prop from `Root`. Widget now reads from `AomiAuthAdapterContext` provided by an ancestor bridge.
- **Modified `apps/landing/app/sections/hero.tsx`** — wrapped `AomiFrame.Root` with `LandingParaProvider`.
- **Modified consumer imports** — `connect-button.tsx`, `runtime-tx-handler.tsx`, `network-select.tsx`, `account-identity.ts` now import from `lib/aomi-auth-adapter` (relative paths).
- **Updated `apps/registry/src/index.ts`** — exports the `AomiAuth*` auth adapter and identity surface.
- **Updated `apps/registry/src/registry.ts`** — replaced `aomi-adapter-provider` entry with `aomi-auth-adapter` + `aomi-auth-sync-bridge` entries.
- **Deleted `apps/registry/src/components/aomi-adapter-provider.tsx`** — replaced by `lib/aomi-auth-adapter.ts`.
- **Deleted `apps/registry/src/components/para-adapter-provider.tsx`** (564 lines) — replaced by the host-side `LandingAomiAuthBridge` + `LandingParaProvider`.
- **Modified `apps/registry/package.json`** — removed `@getpara/react-sdk`, `@getpara/react-core`, `@getpara/evm-wallet-connectors` from deps; added `@getpara/react-sdk` as optional peer dep.
- **Fixed Para modal not opening** — `ParaProviderMin` gates both children AND `ParaModal` behind `isReady` (which never fires due to Zustand store duplication). Fix: render `ParaModal` outside `ParaProviderMin` wrapped in `ParaProviderCore` (from `@getpara/react-core/internal`) with `waitForReady: false` + `AuthProvider` (from `@getpara/react-sdk-lite` internal dist, accessed via turbopack alias `@para-internal/auth-provider`). This provides both `CoreStoreContext` and `AuthContext` that `ParaModal` requires for OAuth/phone/wallet auth flows. Added corresponding turbopack + webpack aliases in `next.config.ts`.

### AA Consolidation (2026-03-22)

- **New files in `packages/client/src/aa/`:**
  - `env.ts` — unified env var reading (`readEnv`, `readGasPolicyEnv`, `isProviderConfigured`, `resolveDefaultProvider`) with `publicOnly` flag for browser-safe vs CLI usage
  - `adapt.ts` — `adaptSmartAccount()` (bridges `@getpara/aa-*` SDK shapes to `AALike`), `isAlchemySponsorshipLimitError()`, `ParaSmartAccountLike` type
  - `resolve.ts` — `resolveAlchemyConfig()` and `resolvePimlicoConfig()` with `modeOverride`, `publicOnly`, `throwOnMissingConfig` options
  - `create.ts` — `createAAProviderState()` async smart account creation (only file importing `@getpara/aa-alchemy`/`@getpara/aa-pimlico`)
- **Refactored `src/aa/alchemy.ts`** — removed private `resolveAlchemyProviderConfig()` and `readPublicEnv()`, now delegates to `resolveAlchemyConfig({ publicOnly: true })`
- **Refactored `src/aa/pimlico.ts`** — same treatment, delegates to `resolvePimlicoConfig({ publicOnly: true })`
- **Simplified `src/cli/execution.ts`** — deleted ~200 lines of duplicated AA logic (`ParaSmartAccountLike`, `readFirstEnv`, `isProviderConfigured`, `resolveDefaultProvider`, `resolveAAProvider`, `resolveAAPlan`, `adaptSmartAccount`, `createAlchemyProviderState`, `createPimlicoProviderState`, `isAlchemySponsorshipLimitError`). Now delegates to `../aa` for all AA operations.
- **Updated `src/aa/index.ts`** — added exports for env, adapt, resolve, create modules
- **Updated `src/index.ts`** — added public API exports for new AA symbols
- **New test files:** `aa-env.unit.test.ts`, `aa-adapt.unit.test.ts`, `aa-resolve.unit.test.ts`, `aa-create.unit.test.ts`
- All 79 tests pass, library builds, lint clean

### Docs Directory Restructure Phase 7 (2026-03-04)

- **Sub-task A: Dedup reference pages**
  - Removed `### Message Processing` sequence diagram section from `reference/architecture.mdx` (duplicates `build/how-it-works.mdx`)
  - Removed `ChatAppBuilder` flowchart mermaid block from `reference/sdk.mdx` (duplicates `build/building-apps.mdx`)
- **Sub-task B: Updated routing and nav files**
  - Changed default redirect in `app/docs/[[...slug]]/page.tsx` from `/docs/getting-started/overview` to `/docs/build/overview`
  - Updated all 16 legacy redirects to point to new `/docs/build/` and `/docs/use-aomi/` paths
  - Added 19 new redirects for restructured paths (getting-started/*, core-concepts/*, integration/*, telegram/*)
  - Updated both `navLinks` and `navTabs` in `layout-config.tsx` to `/docs/build/overview`
- **Sub-task C: Updated internal links across all documentation pages**
  - Updated links in 8 persistent `.mdx` files: namespaces, api-reference, sessions, widget/configuration, reference/runtime, headless/runtime-provider, headless/install, widget/aomi-frame
  - All `/docs/core-concepts/*` links → `/docs/build/*`
  - All `/docs/getting-started/*` links → `/docs/build/*`
  - All `/docs/integration/*` links → `/docs/build/*`
  - All `/docs/guides/integration/*` links → `/docs/build/*`
  - All `/docs/guides/telegram/*` links → `/docs/use-aomi/telegram/*`
- **Sub-task D: Deleted old directories and files**
  - Deleted 13 files via `git rm`: getting-started/{overview,for-businesses,quickstart,meta.json}, core-concepts/{how-it-works,meta.json}, integration/{overview,meta.json,widget/install,widget/meta.json,headless/meta.json}, telegram/{overview,meta.json}
  - Removed 6 empty directories: getting-started/, core-concepts/, integration/widget/, integration/headless/, integration/, telegram/

### Docs Directory Restructure Phase 6 (2026-03-04)

- Created `apps/landing/content/guides/use-aomi/overview.mdx` -- Getting Started page for end users (what Aomi assistants are, chat experience, threads, wallet, where to use)
- Created `apps/landing/content/guides/use-aomi/web-chat.mdx` -- Web Chat guide (sending messages, streaming, tool calls, thread management, control bar, wallet connection, tips)
- Created `apps/landing/content/guides/use-aomi/telegram/overview.mdx` -- Telegram Bot overview rewrite (rewrote existing `telegram/overview.mdx` for end users, removed architecture diagram and panel router internals, added Getting Started section, links to sub-pages)
- Created `apps/landing/content/guides/use-aomi/faq.mdx` -- FAQ page (8 questions: tool calls, wallet safety, wallet-optional usage, models, threads, refusals, reporting problems, data access)
- All 4 pages already listed in existing `use-aomi/meta.json` from Phase 1

### Docs Directory Restructure Phase 5 (2026-03-04)

- Moved `core-concepts/building-apps.mdx` to `build/building-apps.mdx` via `git mv`
- Edited `building-apps.mdx`: removed AomiTool trait table and AomiBackend trait code block/paragraph (SDK overlap)
- Added SDK Reference callout notes where trait details were removed
- Updated Next Steps links to `/docs/build/` and `/docs/reference/` paths
- Moved `telegram/admin.mdx` to `build/telegram-bot.mdx` via `git mv`
- Reframed as "Telegram Bot Setup" for developers deploying the bot for their product
- Updated frontmatter (title: "Telegram Bot Setup", description: "Configure and deploy the Telegram bot for your product.")
- Reframed intro, section headers (Development/Production), added Next Steps with `/docs/build/` links
- Already listed in `build/meta.json` at correct positions

### Docs Directory Restructure Phase 4 (2026-03-04)

- Created `apps/landing/content/guides/build/how-it-works.mdx` by merging:
  - `core-concepts/how-it-works.mdx` (technical pipeline: mermaid diagrams, endpoint table, sequence diagram, SSE format, step-by-step walkthrough, "What Aomi Manages" table)
  - `getting-started/for-businesses.mdx` (narrative tone, "What MyCoinDex Gets" summary table, integration code snippets)
- Structural base: `how-it-works.mdx` (better technical flow with pipeline + sequence diagrams)
- Absorbed from `for-businesses.mdx`: narrative opening tone, capability summary table
- Merged "What MyCoinDex Gets" and "What Aomi Manages" into single "What You Get" table with Capability/Details/Managed By columns
- Removed: Step 6 "Integrate Into Your Product" (covered by quickstart and widget/headless pages), duplicated 4-endpoint API table (kept 5-endpoint version), duplicated preamble/model sections
- Added SSE event types table alongside the existing stream format code block
- All Next Steps links updated to `/docs/build/` paths
- Already listed in `build/meta.json` at position 3

### Docs Directory Restructure Phase 3 (2026-03-04)

- Created `apps/landing/content/guides/build/quickstart.mdx` by merging:
  - `getting-started/quickstart.mdx` (end-to-end quickstart flow: prereqs, install, env vars, add to page, configure API key, run, customizing layout)
  - `integration/widget/install.mdx` (what gets installed file tree, registry architecture, namespace configuration, updating components)
- Absorbed "What Gets Installed" (npm packages + file tree), "Registry Architecture" (three sources table + diagram), "Namespace Configuration" (shorthand via components.json), "Updating Components" (--overwrite + git diff)
- Collapsed "Philosophy" section into single sentence in Registry Architecture section
- Merged "Run Your App" and "What You Should See" into one section
- All Next Steps links updated to `/docs/build/` paths
- Already listed in `build/meta.json` at position 2

### Docs Directory Restructure Phase 2 (2026-03-04)

- Created `apps/landing/content/guides/build/overview.mdx` by merging:
  - `getting-started/overview.mdx` (What is Aomi framing, How It Works diagram, Key Features, Platform Support)
  - `integration/overview.mdx` (Widget vs Headless comparison, Shared Foundation, Choosing a Path)
- Merged two separate integration path tables into a single comprehensive 3-column comparison (Widget, Headless, Telegram)
- Developer-focused tone, removed end-user-facing language
- All links updated to new `/docs/build/` paths

### Docs Directory Restructure Phase 1 (2026-03-04)

- Created new directory structure under `apps/landing/content/guides/`:
  - `use-aomi/` and `use-aomi/telegram/`
  - `build/`, `build/widget/`, `build/headless/`
- Moved 15 unchanged pages via `git mv`:
  - 4 widget files: `integration/widget/` -> `build/widget/`
  - 4 headless files: `integration/headless/` -> `build/headless/`
  - 3 core-concepts files: `core-concepts/{namespaces,sessions,api-reference}.mdx` -> `build/`
  - 1 integration file: `integration/wallet-integration.mdx` -> `build/`
  - 3 telegram files: `telegram/{commands,panels,wallet}.mdx` -> `use-aomi/telegram/`
- Created 5 new `meta.json` files: `use-aomi/`, `use-aomi/telegram/`, `build/`, `build/widget/`, `build/headless/`
- Updated root `meta.json` with new two-section layout (Use Aomi / Build with Aomi)
- Old directories preserved (remaining files handled in later phases)
- No file content modified (link updates happen in later phases)

### Playground Theme Customizer & Radius Unification (2026-03-03)

- **Theme customizer** added to `/playground/configurator` as a "Theme" tab alongside "Layout"
  - 12 curated presets (Default, Modern Minimal, Violet Bloom, Ocean Breeze, Claude, Cyberpunk, Midnight Bloom, Catppuccin, Nature, Amber Minimal, Supabase, Mono)
  - Light/dark mode toggle (scoped to preview only via `.dark` class)
  - Radius slider (0–2rem) controlling all widget border-radius tokens
  - Collapsible color overrides with native color pickers
  - Generated Theme CSS export (`:root` + `.dark` blocks with OKLCH values)
- **New files**: `lib/color-convert.ts`, `lib/theme-presets.ts`, `lib/theme-utils.ts`, `src/components/playground/ThemeCustomizer.tsx`
- **Modified**: `PlaygroundConfigurator.tsx` — tabbed config (Layout|Theme) + tabbed code output (JSX|CSS)

#### Radius unification refactor
- **`default.css`** — extended `@theme inline` with `--radius-2xl`, `--radius-3xl`, `--radius-4xl` tokens (calc offsets from `--radius`)
- **`theme-utils.ts`** — `themeToStyleObject` now sets all 7 radius tokens (`sm` through `4xl`) as inline style overrides
- **`thread-list.tsx`** — "New Chat" button and thread list items changed from `rounded-full` → `rounded-3xl`
- **`connect-button.tsx`** — account connect button changed from `rounded-full` → `rounded-3xl`
- **`attachment.tsx`** — attachment tiles changed from `rounded-[14px]` → `rounded-xl`
- Components using `rounded-3xl`/`rounded-4xl` (suggestion cards, composer, frame wrapper) now automatically use the new tokens
- `rounded-full` kept on intentionally circular elements (send/cancel buttons, avatars, control bar pills)

### Landing Page — DeFi & X API Consoles (2026-03-01)

- **`DefiConsole.tsx`** — 9 accordion endpoints covering DefiLlama (prices, yields, protocols, chain TVL, bridges), 0x swap quotes, LI.FI cross-chain quotes, and CoW Protocol (quote + order submission)
- **`XConsole.tsx`** — 5 accordion endpoints for X API v2: user lookup, user posts, search, trends, and single post retrieval. All require Bearer token auth.
- **`defi-aggregators.mdx`** — replaced stub with intro text + `<DefiConsole />`
- **`x-apis.mdx`** — replaced stub with intro text + `<XConsole />`
- **`app/api/proxy/route.ts`** — expanded CORS proxy allowlist with DefiLlama hosts (`coins.llama.fi`, `yields.llama.fi`, `api.llama.fi`, `bridges.llama.fi`), aggregator hosts (`api.0x.org`, `li.quest`, `api.cow.fi`), and X API (`api.x.com`)
- **`ApiDrawer.tsx`** — normalized vertical padding (`py-3`) across description, URL bar, and response header sections

### Thread-Scoped Control State (2026-02-02)

- **`ThreadMetadata`** now includes a `control` field with `ThreadControlState`
- **`ThreadControlState`** stores per-thread control configuration:
  - `model: string | null` - selected model for this thread
  - `namespace: string | null` - selected namespace for this thread
  - `controlDirty: boolean` - whether control changed but chat hasn't started
  - `isProcessing: boolean` - whether thread is currently generating (disables controls)
- Model/namespace selections are now **thread-scoped** - switching threads restores previous selections
- `isProcessing` wired from orchestrator → thread metadata → control context → UI components
- Control dropdowns disabled while assistant is generating

### Control Context API Updates

- Removed `isProcessing` prop (now derived from thread metadata)
- Added `getCurrentThreadControl()` to get current thread's control state
- Added `onNamespaceSelect(namespace)` for per-thread namespace changes
- `onModelSelect(model)` now updates thread metadata + calls backend
- Added `markControlSynced()` to clear dirty flag after chat starts
- Global state: `apiKey`, `availableModels`, `authorizedNamespaces`, `defaultModel`, `defaultNamespace`
- Per-thread state: `model`, `namespace`, `controlDirty`, `isProcessing` (in ThreadMetadata)

### Control Context Refactor (2025-01-30)

- Added `ControlContextProvider` for model/namespace/apiKey management
- Model selection is backend-only via `onModelSelect(model)` - not stored in global client state
- Auto-fetches namespaces on mount and when apiKey changes
- ApiKey persisted to localStorage automatically
- Added Control API to `AomiClient`: `getNamespaces()`, `getModels()`, `setModel()`

### Control Bar Components

- `ModelSelect` - reads model from thread control state, calls `onModelSelect()` on selection
- `NamespaceSelect` - reads namespace from thread control state, calls `onNamespaceSelect()` on selection
- `ApiKeyInput` - uses `setApiKey()` for updates
- Both disabled when `isProcessing` is true

### Runtime Modularization

- Split `aomi-runtime.tsx` into shell (50 lines) + `core.tsx` (runtime logic)
- Extracted `threadlist-adapter.ts` for thread list operations
- `orchestrator.ts` now receives `aomiClient` instance instead of URL
- `ControlContextProvider` receives `getThreadMetadata` and `updateThreadMetadata` from thread context
- Core syncs `isRunning` → `threadMetadata.control.isProcessing`

### Event System

- Added `EventContextProvider` for inbound/outbound system events
- Added `UserContextProvider` for wallet/user state (replaces local state)
- Wallet state changes auto-synced via `onUserStateChange` subscription
- Handler hooks: `useWalletHandler()`, `useNotificationHandler()`

### API Simplification

- Removed `publicKey` prop from `AomiRuntimeProvider`
- Removed `WalletSystemMessageEmitter` component
- Removed `AomiRuntimeProviderWithNotifications` (use `AomiRuntimeProvider`)
- User address obtained from `useUser().user.address` internally

### Backend Compatibility (merged from codex branch)

- Added `tool_stream` field to `AomiMessage`
- Added `rehydrated`, `state_source` fields to `ApiStateResponse`
- System events use tagged enum format: `{ InlineCall: { type, payload } }`

### Apps Updated

- `apps/registry/src/components/aomi-frame.tsx` - uses new API
- `apps/registry/src/components/aomi-frame-collapsible.tsx` - uses new API
- `apps/registry/src/components/control-bar/` - uses thread-scoped control state

## Provider Structure

```
AomiRuntimeProvider
└── ThreadContextProvider
    └── NotificationContextProvider
        └── UserContextProvider
            └── ControlContextProvider (receives getThreadMetadata, updateThreadMetadata)
                └── EventContextProvider
                    └── AomiRuntimeCore (syncs isRunning → threadMetadata.control.isProcessing)
                        └── AssistantRuntimeProvider
```

## Data Flow

### Thread Control State Flow

```
User selects model/namespace
        ↓
ModelSelect/NamespaceSelect onClick
        ↓
onModelSelect(model) / onNamespaceSelect(namespace)
        ↓
updateThreadMetadata(threadId, { control: { ...control, model/namespace, controlDirty: true } })
        ↓
(for model) aomiClient.setModel(sessionId, model, namespace)
        ↓
Backend stores model selection for session
```

### isProcessing Flow

```
Backend responds / assistant generating
        ↓
orchestrator detects isRunning change
        ↓
core.tsx useEffect syncs to threadMetadata.control.isProcessing
        ↓
ControlContextProvider reads from getThreadMetadata(sessionId).control.isProcessing
        ↓
ModelSelect/NamespaceSelect get isProcessing from useControl()
        ↓
Controls disabled while isProcessing === true
```

## Pending

- End-to-end testing of wallet tx request flow
- SSE event handling verification (SystemNotice, AsyncCallback)
- E2E verification of control flow: apiKey → namespaces → model selection
- Thread list should show model/namespace per thread (optional enhancement)

## Notes

- `WalletFooterProps` still works - `wallet`/`setWallet` map to `user`/`setUser`
- `WalletButtonState` type alias kept for backwards compatibility
- Specs are designed for new agents to quickly understand the codebase
- `useControl()` hook provides access to control state and actions
- Control bar components get all data from context (no props needed)
- New threads initialize with `createDefaultControlState()` (null model/namespace)
- Thread switching restores the thread's previous model/namespace selection
