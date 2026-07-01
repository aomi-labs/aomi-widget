# Merge BFF + BetterAuth — review fix checklist

> Branch: `codex/merge-bff-betterauth`. Source: the deep review of 2026-06-30
> (see memory `bff-betterauth-merge-review`). The **auth/token contract is verified
> correct** (GAP-1/2/3, EdDSA mesh, Alice invariant — checked against the Rust
> verifier and the real keys). Everything below is **deletion + small fixes**, not
> redesign. Tests today: account/service 23 ✓, wallet-kit 190 ✓, packages 426 ✓ /
> **2 ✗** (the stale `control.test.tsx`).

## Decisions locked (2026-06-30)

1. **CLI auth = BetterAuth SIWE + `bearer()`** — build a CLI auth client on this branch (§6).
2. **Delete the legacy auth mode AND the dead JWKS minter** (§2.1, §2.2).
3. **Delete the `packages/account` drop-ins** (exchange/siwe/providers/HS256 cookie) — §2.3.
4. **Remove + rotate the committed dev signing key** (§1.1).
5. **Perf items → follow-up PR**, not this one (§7).
6. **/api/chat fix = minimal `stripBulkyPendingFields`** (§1.3).
7. **This doc includes cross-repo + merge-reconciliation sections** (§8).

---

## 0. Pre-flight

- [ ] Confirm baseline: `pnpm exec vitest run packages/` (expect the 2 `control.test.tsx`
      failures — they are fixed in §1.2). Capture the green count for the rest.
- [ ] Work in small commits, one section at a time, re-running the relevant suite.

---

## 1. 🔴 Blockers — must be done before merge

### 1.1 Remove + rotate the committed dev signing key

- [x] Generate a fresh dev Ed25519 keypair: `openssl genpkey -algorithm ed25519 -out dev.key && openssl pkey -in dev.key -pubout`.
- [x] Strip the private key from [`HANDOFF-LOCAL-BACKEND.md`](../HANDOFF-LOCAL-BACKEND.md) §5; replace with the `openssl` recipe + "store in `PORTAL_SERVICE_PRIVATE_KEY` / 1Password" note. Also fix the machine-specific absolute paths in its shell snippets.
- [x] Update the **new public key** in [`packages/account/src/topology-data.ts`](../packages/account/src/topology-data.ts) for `kid = aomi-bff-dev-1`.
- [x] Update the matching public key in the backend `../product-mono/aomi/service.toml` + `service.dev.toml` (see §8.1 — fix the stale one at the same time).
- [x] Set the new private key in `apps/portal/.env.local` (`PORTAL_SERVICE_PRIVATE_KEY`); confirm it is git-ignored.
- [x] Verify: `pnpm exec vitest run packages/service` and a local mint→verify round-trip succeed with the new pair.
- [ ] (Optional but recommended) scrub the key from git history before this branch merges (`git filter-repo` / BFG), since it lives in commit `7e03d36a`.

### 1.2 Green the suite — stale `publicKey` test

> Confirmed a **stale test, not a regression**: the backend reads the wallet via
> `public_key_from_user_state(user_state)` (product-mono `runtime/src/auth/mod.rs:317`),
> never a standalone chat param.

- [x] Remove `publicKey` from `MockSession.syncRuntimeOptions`, the `_publicKey` field, and the `sendAsync` mock in [`packages/react/src/runtime/__tests__/test-harness.tsx`](../packages/react/src/runtime/__tests__/test-harness.tsx) (~lines 366, 412-426).
- [x] Remove the `publicKey: "0xabc"` expectation in [`packages/react/src/runtime/__tests__/control.test.tsx:128`](../packages/react/src/runtime/__tests__/control.test.tsx).
- [x] Verify: `pnpm exec vitest run packages/react` → fully green.

### 1.3 `/api/chat` URL overflow

- [x] In [`packages/client/src/client.ts:352`](../packages/client/src/client.ts), wrap with the same strip `fetchState` uses:
      `const normalizedUserState = stripBulkyPendingFields(UserState.normalize(options?.userState));`
- [x] Verify: a `sendMessage` with a pending unsigned-tx / EIP-712 in `userState` no longer puts the blob in the URL (unit test or manual URL inspection).

---

## 2. 🟠 Unify the auth story — delete the dead paths (decisions #2, #3)

> After this section there is exactly **one** way auth works: BetterAuth session →
> `resolveOrCreateCanonicalUser` → `mintAccountBearer` (mesh) → proxy-inject → backend verify.

### 2.1 Delete the dead JWKS minter

- [x] Remove `jwt(createAomiBackendJwtOptions(env))` from the plugins array in [`packages/auth/src/better-auth/auth.ts:37`](../packages/auth/src/better-auth/auth.ts).
- [x] Delete [`packages/auth/src/better-auth/backend-jwt.ts`](../packages/auth/src/better-auth/backend-jwt.ts) + `backend-jwt.test.ts` + its re-exports in `better-auth/index.ts`.
- [x] Drop the now-unused `backendJwt*` fields (issuer/audience/expiresIn/jwksPath/scope) from `better-auth/env.ts` and their env reads.
- [x] Grep-confirm zero references to `/api/auth/token` / `jwks` remain in `apps/` + `packages/` (except docs).
- [x] Verify: `pnpm --filter @aomi-labs/auth type-check` + `pnpm exec vitest run packages/auth`.

### 2.2 Delete the legacy auth mode

- [x] Delete [`apps/portal/src/lib/backend-auth.ts`](../apps/portal/src/lib/backend-auth.ts) (the `NEXT_PUBLIC_AOMI_AUTH_MODE` switch).
- [x] At the 5 call sites (`portal-aomi-frame.tsx:48`, `settings/bots.tsx:111`, `general-settings.tsx:75`, `apps-settings.tsx:73`, `app-keys.tsx:89`) hardcode the better-auth path (drop `shouldUseBetterAuthBackendJwt()`).
- [x] Delete the now-dead `exchangeProviderCredential()` legacy branch in [`packages/client/src/account-session.ts`](../packages/client/src/account-session.ts) (~149-172) and simplify `exchange()` to the better-auth path.
- [x] Verify: `pnpm --filter portal exec tsc --noEmit` + `pnpm exec vitest run packages/client`.

### 2.3 Delete the `packages/account` drop-ins (NOT the live path)

> ⚠️ KEEP the live contract core. DELETE only the base/landing drop-ins + HS256 cookie helpers.

- [x] **KEEP:** `bearer.ts`, `proxy.ts`, `token.ts`, `topology.ts`, `topology-data.ts`, `db.ts`, `account-graph.ts::resolveOrCreateCanonicalUser` (+ its helpers `findUserIdBySubject`/`ensureBackendUser`/`rebindIdentityToCanonicalUser`/`isUniqueViolation`), and `session.ts::getSessionedCanonicalId` **(BetterAuth branch only)**.
- [x] **DELETE:** [`packages/account/src/exchange.ts`](../packages/account/src/exchange.ts), [`siwe.ts`](../packages/account/src/siwe.ts), [`providers.ts`](../packages/account/src/providers.ts) (+ their tests), and `account-graph.ts::resolveOrCreateByWallet` + `findUserIdByWallet`.
- [x] In `session.ts`: delete `issueSessionCookie` / `setSessionCookie` / `clearSessionCookie` / `readSessionCookie` and the **HS256 fallback branch** of `getSessionedCanonicalId` (the `authorization`/cookie tail, ~116-122) — the CLI now uses BetterAuth (§6), so the HS256 session is fully dead.
- [x] Update `packages/account/src/index.ts` to stop exporting the deleted symbols.
- [x] Grep-confirm no importers of the deleted symbols remain (esp. that `apps/base` / `apps/landing` in THIS repo don't import them; if they do, they move to BetterAuth too or this decision changes).
- [x] Verify: `pnpm --filter @aomi-labs/account type-check` + `pnpm exec vitest run packages/account`.

---

## 3. 🟠 Wallet-kit — remove the reverted row-collapse scaffolding

> The "collapse Privy/Para EVM+SVM into one row" feature was reverted; tests already
> assert `"EVM/SVM"` never renders. This is dead scaffolding.

- [x] Collapse `groupConnectedByProvider` (now `accounts.map(a => [a])`) and the `legs: WalletLeg[]` concept to a single leg in [`apps/registry/src/components/control-bar/wallet-account-model.ts`](../apps/registry/src/components/control-bar/wallet-account-model.ts).
- [x] In [`wallet-picker.tsx`](../apps/registry/src/components/control-bar/wallet-picker.tsx): delete the always-false `grouped` branch (`renderConnectedGroup` ~639-666), `joinLegAddresses`, `singleNetworkName`, and fold the combined `FamilyChip` into `ChainTag`.
- [x] Drop the dead `wallets?` / `supportedEvmChains?` props + leg logic from `LinkedAuthAccountRow` (only call site passes neither).
- [x] Drop `ChainTag`'s unused `chainId` / `supportedEvmChains` props.
- [x] Rename the stale test `wallet-account-model.test.ts:53` ("groups … behind their linked account").
- [x] **Finish `solana*`→`svm*` (KEEP public aliases — landing consumes them):** in [`composer/build-identity.ts`](../apps/registry/src/lib/wallet-kit/composer/build-identity.ts) keep writing the public `solana*` aliases (consumed by `apps/landing/components/dev/para-solana-runtime-driver.tsx`), but remove the **internal** dead `?? solanaX` read-fallbacks in [`context.tsx:58`](../apps/registry/src/lib/wallet-kit/context.tsx) and `runtime-tx-handler.tsx`, and trim the doubled effect deps. Rename internal `Solana*` types/params (`accounts.ts`, `runtime/svm/wallet-runtime.ts`) to `Svm*`.
- [x] Verify: `pnpm --filter @aomi-labs/widget-lib exec vitest run src/lib/wallet-kit src/components/control-bar` (190 ✓) + `pnpm run typecheck:landing`.

---

## 4. 🟡 Medium correctness / cleanup

- [x] **Account-create race** — [`aomi-backend-runtime.ts`](../apps/registry/src/lib/wallet-kit/account/aomi-backend-runtime.ts): gate auto-SIWE behind the provider-credential exchange (session-first) with a shared in-flight ref so both effects can't each create an account. Add a test.
- [x] **Stale docstrings** — [`packages/account/src/session.ts:7,85`](../packages/account/src/session.ts): rewrite to "BetterAuth-session-first" (the HS256 prose is gone after §2.3).
- [x] **Portal upstream override** — [`apps/portal/src/app/api/[...slug]/route.ts:56-74`](../apps/portal/src/app/api/[...slug]/route.ts): delete the local `resolveUpstreamBaseUrl` + prod default; call `createBackendProxy({ allowedRoutes: ALLOWED_ROUTES })` and let the package resolve the upstream (VERCEL_ENV-aware). Also drop the redundant `/api/account/sessions/exchange` allowlist entry (already covered by `/^\/api\/account(\/.*)?$/`).
- [x] **next.config proxy bypass** — `apps/portal/next.config.ts:65-77`: delete the `AOMI_BACKEND_PROXY_TARGET` rewrite (referenced nowhere else) — it bypasses the allowlist + bearer-inject + cookie-strip.
- [x] **`verify()` guard** — [`packages/service/src/topology.ts:156`](../packages/service/src/topology.ts): reject an issuer node with empty `publicKey` / `issues` before `importSPKI("")`.
- [x] **`"use client"`** — removed with `backend-auth.ts` in §2.2 (no-op otherwise).
- [x] **Provider-exchange dedup** — extract the shared verify→resolve→link→sync core used by both `better-auth/provider-plugin.ts` and `service/provider-exchange.ts`.
- [x] **Dead `publicKey` params** — remove `publicKey` from `sendMessage`/`getApps` options ([`client.ts:344,757`](../packages/client/src/client.ts)) and the `ClientSession.send()/sendAsync()` pass-throughs (it goes nowhere; identity is in `user_state` + the bearer).
- [x] **Silent thread errors** — expose a `threadListError` flag from [`user-state-provider.tsx:453`](../packages/react/src/runtime/user-state-provider.tsx) so the UI can show "failed to load sessions" instead of an empty list.
- [x] **MEDIUM-1 (account-service)** — wrap the signal-owner `upsertAuthIdentity({provider:"better_auth"})` to catch `identity_already_linked_to_another_account` and return a handled conflict instead of a 500.

---

## 5. 🟢 Low / Nit

- [ ] Delete dead [`packages/auth/src/service/siwe-mirror.ts`](../packages/auth/src/service/siwe-mirror.ts) (1-line re-export, no importers).
- [ ] Delete scratch files: [`tmp-v2-report.md`](../tmp-v2-report.md), [`memory/2026-04-01.md`](../memory/2026-04-01.md). Add `tmp*.md` to `.gitignore`.
- [ ] [`tmp.md`](../tmp.md): keep but rename to `docs/generated/userstate-shape-reference.md` and update the test comment that cites it (`packages/client/test/cli/cli-e2e-user-state.unit.test.ts`).
- [ ] Delete vestigial [`apps/portal/service.portal.toml`](../apps/portal/service.portal.toml) (NOT loaded — `topology-data.ts` is the live source) or add a header noting it is documentation-only.
- [ ] Gate `/dev/widget-auth-e2e` behind `NODE_ENV !== "production"` (Hardhat test keys ship to a prod route otherwise).
- [ ] Gate the unconditional `console.debug("[RuntimeTxHandler] … solana_sign_message …")` behind `walletDebug()` like the portal-fetch path.
- [ ] Pin `algorithms: ["HS256"]` on any remaining `jwtVerify` (defense-in-depth) — moot if all HS256 verify is deleted in §2.3.
- [ ] De-dupe: `familyLabel` (`network-select.tsx` ↔ `wallet-account-model.ts`), `getHttpStatus` (`user-state-provider.tsx` ↔ `core.tsx`), `UserId` (`mcp-core/types.ts` ↔ `ports/backend.ts`).
- [ ] `liveAccounts` `errorVersion` recompute hack (`aomi-backend-runtime.ts:208`) — add a comment or a cleaner trigger.
- [ ] Remove `aomiClientRef` from the `useEffect` dep array (`user-state-provider.tsx:471`, no-op).
- [ ] mcp-core: replace the `_ensureImport` suppressor alias (`aomi-client.ts:216`) with an explicit cast at the call site.
- [ ] `account-session.ts`: add a retry cap/backoff for `AccountCredentialUnavailableError`; validate `expiresAt` is seconds not ms.
- [ ] `aa/pimlico/create.ts`: revisit the six `as never` casts on SDK owner params.
- [ ] Use fake timers in the retry-path tests (`thread.test.tsx:551`).

---

## 6. ✅ CLI parity — make the CLI work like the GUI (BetterAuth SIWE + bearer)

> Goal: the `aomi` CLI can **SIWE-authenticate, send a message, and load threads**, the
> same as the portal GUI. On this branch the CLI has **no auth client** wired. The portal
> already serves BetterAuth's SIWE endpoints at `/api/auth/siwe/*` and the `bearer()`
> plugin, so no new portal routes are needed — only a CLI-side client.

**How it works (target):** CLI does the SIWE handshake against the portal → BetterAuth
issues a session token (via `bearer()`) → the CLI attaches `Authorization: Bearer <session>`
to every proxied `/api/*` call → the proxy's `getSessionedCanonicalId` resolves the session
(`auth.api.getSession`), mints the AomiBearer, and forwards it. (The proxy reads the session
from the _incoming_ request before it strips client headers, so presenting the session bearer
is correct — the CLI does **not** need `/api/bff/auth/token`.)

- [x] **6.1 Build the CLI auth client** (`packages/client/src/account-session.ts` or a new `cli/auth.ts`):
  - [x] `POST {portal}/api/auth/siwe/nonce` → nonce (BetterAuth's current SIWE endpoint is POST-only).
  - [x] Build the EIP-4361 message (domain = portal host, address = CLI EVM key, the nonce) and sign it with the CLI keypair.
  - [x] `POST {portal}/api/auth/siwe/verify` (BetterAuth) with `{ message, signature, walletAddress, chainId }` → capture the session token from the `set-auth-token` response header (bearer plugin).
  - [x] Persist the session token in the CLI session store (`cli/state.ts`), with expiry.
- [x] **6.2 Attach the session on proxied calls:** wire `AomiClient`'s bearer seam so CLI requests carry `Authorization: Bearer <sessionToken>` (the proxy mints from it). Do **not** fetch an AomiBearer client-side for the CLI.
- [x] **6.3 Confirm the data paths** reuse the existing CLI commands unchanged once auth is attached: `aomi chat` (`/api/chat`), `aomi wallet whoami` (`/api/account`), thread list/switch (`/api/sessions`, `/api/state`).
- [x] **6.4 Sign-out:** add `aomi logout` → `POST /api/auth/sign-out` (BetterAuth) + clear the stored session token.

### CLI ↔ GUI parity verification matrix

Run the local stack (`scripts/dev-auth-stack.sh`) and confirm each row passes for **both** surfaces:

| Capability                 | GUI (portal)                | CLI (target)                                                              | Pass? |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------- | ----- |
| SIWE auth → canonical user | login in widget             | `aomi account login` (SIWE)                                               | [x]   |
| Same user across surfaces  | —                           | CLI + GUI with the same wallet resolve to the **same** `users.id` (Alice) | [ ]   |
| Send message               | composer → `/api/chat` 200  | `aomi chat "hi"` → 200, streams                                           | [x]   |
| Load / list threads        | sidebar list                | `aomi` thread list → `/api/sessions` 200                                  | [x]   |
| Switch thread / poll state | click thread                | thread switch → `/api/state` 200                                          | [x]   |
| Backend identity           | `DbUser::get(sub)` resolves | same `sub` (canonical UUID) verifies in backend                           | [x]   |
| Sign-out                   | account panel               | `aomi logout` clears session                                              | [x]   |

- [ ] **Gate:** all rows green against the local stack → CLI is at parity.

Verification note (2026-07-01): local stack was healthy via
`scripts/dev-auth-stack.sh status`; CLI SIWE login with a test EVM key resolved canonical
backend user `cce71768-e2b5-46bb-96f4-5c2aaa8a2616`, `aomi wallet whoami`,
`aomi chat "hi"`, `aomi session list`, `aomi session status`, AomiClient
`/api/sessions` list/create, AomiClient `/api/state`, and `aomi logout` all passed
against `http://localhost:3000`. The GUI same-wallet comparison row remains open because
this pass did not exercise a browser wallet/widget login.

---

## 7. ⏭️ Follow-up PR (deferred perf — decision #5)

> Not in this PR. Track separately; both are correctness-neutral today.

- [ ] **Proxy hot-path cache** — `getSessionedCanonicalId` runs `getSession` + 2 DB write-txns on every proxied request (each `/api/state` poll). Cache the canonical id per session token for the bearer TTL, with invalidation on sign-out.
- [ ] **Thread-list refetch storm** — replace the `wasConnectedRef` boolean ([`user-state-provider.tsx:263`](../packages/react/src/runtime/user-state-provider.tsx)) with a stable-identity key (BetterAuth user id) or a debounce so a reconnect doesn't blow away warm sessions.

---

## 8. 🔗 Cross-repo / merge reconciliation (decision #7)

### 8.1 Backend repo (`../product-mono`) — stale dev key

- [ ] Fix the `aomi-bff-dev-1` public key in `../product-mono/aomi/service.dev.toml` to match `topology-data.ts` + the active `service.toml` (currently `...Xx7J...`, should be the rotated key from §1.1). Otherwise "copy `service.dev.toml` → `service.toml`" silently 401s a fresh dev.
- [ ] Remove the admin dev private key from the comment in the local `service.toml` (keep a generate recipe).

### 8.2 Reconcile with `origin/main` (advanced past this branch's base)

> This branch diverged at an OLD merge-base (`dc73bad4`); `origin/main` has since merged
> bff-unification (#277) + one-click deploy. A real PR to `main` must fold these in.

- [ ] Rebase / merge `origin/main` and resolve the `apps/registry` rename + `[...slug]`/exchange-route conflicts contract-first (don't blind-merge).
- [ ] Reconcile any CLI auth that already exists on `origin/main`'s bff-unification side with the BetterAuth CLI client built in §6 (avoid two CLI auth paths).
- [ ] Re-run the §9 gate after reconciliation.

---

## 9. 🧹 Docs & markdown cleanup (do LAST, once the code work above is done)

> This PR added/touched **29 `.md` files** (8 new, 20 modified, 1 renamed). A lot of it is
> planning/scratch that shouldn't outlive the merge. Reference counts below are verified.
> Rule of thumb: **git history preserves anything deleted** — prefer delete over keep for
> executed plans; consolidate genuine overlaps; keep only living docs.

### Delete (scratch + superseded)

- [ ] `tmp-v2-report.md` — overnight e2e scratch log (the 2 referrers are `docs/generated/*` inventories that mark it _not-included_). _(also §5)_
- [ ] `memory/2026-04-01.md` — agent session journal, not project doc. _(also §5)_
- [ ] [`specs/AUTH-BACKEND-JWT-CONTRACT.md`](AUTH-BACKEND-JWT-CONTRACT.md) — documents the **JWKS path deleted in §2.1**; now describes code that no longer exists. (1 referrer — update/remove it.)
- [ ] **`specs/MERGE-BFF-BETTERAUTH-FIXES.md` (THIS doc)** — delete once every box above is ticked; its outcome lives in `STATE.md` + the `bff-betterauth-merge-review` memory.

### Rename

- [ ] `tmp.md` → `docs/generated/userstate-shape-reference.md` (3 referrers incl. a test — update `packages/client/test/cli/cli-e2e-user-state.unit.test.ts`). _(also §5)_

### Consolidate (genuine overlap)

- [ ] `HANDOFF-LOCAL-BACKEND.md` **+** `docs/local-merged-bff-betterauth-stack.md` both describe "bring up the local merged stack." After the §1.1 key scrub, merge into **one** doc (e.g. `docs/local-dev-stack.md`); update the 4 referrers of HANDOFF.
- [ ] Auth planning docs: keep [`specs/WIDGET-AUTH-PLAN.md`](WIDGET-AUTH-PLAN.md) as the single surviving auth spec; fold "what actually shipped" from [`specs/MERGE-PLAN-BFF-BETTERAUTH.md`](MERGE-PLAN-BFF-BETTERAUTH.md) into `STATE.md` + memory, then **delete MERGE-PLAN**.

### Archive or delete (executed plans — history keeps them)

- [ ] `specs/WALLET-KIT-PR-WALKTHROUGH.md` — PR presentation companion; delete after merge.
- [ ] `specs/WALLET-KIT-CLEANUP.md` — fold any still-open items into `STATE.md`, then delete.
- [ ] `specs/WALLET-PROVIDER-PLUGIN-REFACTOR.md` — executed migration plan; delete.
- [ ] `specs/WALLET-ADAPTERS-ARCH.md` + `specs/portal-widget-lib-unification.md` — fold any still-true architecture into [`specs/DOMAIN.md`](DOMAIN.md), then delete. _(If you'd rather keep them browsable, move all four to a new `specs/archive/` instead of deleting.)_

### Stale-check (these may now describe deleted code)

- [ ] `docs/topics/auth/facts/auth.md`, `docs/topics/auth/facts/base-account.md`, and the renamed `auth-adapter.md` — confirm none of them still document the **JWKS / legacy-mode** paths removed in §2; update or trim if they do.

### Keep (living docs — leave as-is)

- `README.md`, [`specs/STATE.md`](STATE.md), [`specs/DOMAIN.md`](DOMAIN.md), `docs/index.md`, `docs/topics/index.md`, `docs/krexa-wallet.md`, `packages/client/skills/repowiki/SKILL.md`.

### Update + regenerate (last)

- [ ] Update [`specs/STATE.md`](STATE.md) with the merge outcome and drop the completed pending items (per `CLAUDE.md`).
- [ ] Regenerate `docs/generated/markdown-inventory.md` + `docs/generated/repo-inventory.md` **after** all the deletes/renames above so the inventory is accurate.
- [ ] Final grep: no remaining links point at any deleted `.md` (`grep -rl <deleted-name> . --include='*.md'`).

---

## 10. Final verification gate

- [ ] `pnpm run typecheck` + `pnpm run typecheck:landing` + `pnpm --filter portal exec tsc --noEmit`
- [ ] `pnpm run lint`
- [ ] `pnpm exec vitest run packages/` → **fully green** (no more `control.test.tsx` failures)
- [ ] `pnpm --filter @aomi-labs/widget-lib exec vitest run src/lib/wallet-kit src/components/control-bar`
- [ ] `pnpm run build:packages` + `pnpm run build:lib` + `pnpm run build:registry`
- [ ] Local stack up (`scripts/dev-auth-stack.sh`) → run the **§6.4 CLI↔GUI parity matrix** end to end.
- [ ] Smoke the contract gate: a BetterAuth login (each method) → `/api/account` 200 → `/api/sessions` 200 → `/api/state` 200 → chat streams; proxy strips client auth+cookie; relogin returns the same UUID.

---

## Appendix A — Verified clean (do NOT touch)

The whole auth/token contract (GAP-1/2/3), proxy strip+inject (allowlist, traversal-safe, no SSRF), the Alice invariant, `ensureAccountSchema` memo, the mcp-approvals relocation, all deleted files (registry 14 / portal 11 / mcp-core 6), the `signInPolicy` removal, the AA-resolver consolidation, heal-budget bookkeeping, SVM executor wiring, the `walletKey` SVM-case fix, and the CLI `aaMode`/`smartAccount`/`smart_account_4337`/`delegation_7702` fields are all correct. Staging + prod mesh keys pair correctly.

## Appendix B — packages/account: keep vs delete (the precise line)

KEEP (live contract path): `bearer.ts`, `proxy.ts`, `token.ts`, `topology.ts`, `topology-data.ts`, `db.ts`, `account-graph.ts::resolveOrCreateCanonicalUser` (+ helpers), `session.ts::getSessionedCanonicalId` (BetterAuth branch).
DELETE (base/landing drop-ins, now unused): `exchange.ts`, `siwe.ts`, `providers.ts`, `account-graph.ts::resolveOrCreateByWallet`, and `session.ts`'s HS256 cookie helpers + HS256 fallback branch.
