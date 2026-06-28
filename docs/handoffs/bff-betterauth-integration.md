# BFF ↔ BetterAuth integration — seam contract, data-type map, merge plan

Status: 2026-06-27 · from: bff-unification (`@aomi-labs/account`) · to: arixoneth · re: `codex/widget-auth-pre-rust`

This is the **integration centerpiece**. It consolidates:

1. **The seam contract** — every point where your BetterAuth stack drops into our
   deployed BFF, with exact signatures and a drop-in status per seam.
2. **A his ↔ ours data-type comparison** — claim-for-claim, type-for-type.
3. **A recommended merge plan** — direction, what wins where, and the one gate.

Companion docs:
- [arixoneth-account-auth.md](./arixoneth-account-auth.md) — the contract + GAP-1/2/3 (read first).
- [base-siwe-betterauth-dropin.md](./base-siwe-betterauth-dropin.md) — SIWE + provider-verify drop-in detail.

The governing fact (from the main handoff): **our `@aomi-labs/account` is the
already-deployed contract the Rust backend verifies against.** So integration is
*contract-first* — your code conforms to these seams, regardless of which branch
is the mechanical base.

---

## 1. The seam contract — where you drop in

Each seam is classified:

- 🟢 **literal swap** — signatures already match; replace the import, no call-site change.
- 🟡 **replace-body** — keep our signature, swap the implementation (the handoff's designated seams).
- 🔴 **reframe** — the *flow* inverts under BetterAuth; not a swap, a rewrite at merge.

| Seam | Our surface (`@aomi-labs/account`) | Your surface (`@aomi-labs/auth`) | Status | Notes |
|---|---|---|---|---|
| **Backend proxy** | `createBackendProxy(config)` → Next handlers; injects bearer from session, strips `cookie`/client `authorization` | `apps/portal/.../[...slug]/route.ts` (forwards browser bearer) | 🟢 via session seam | Keep ours (browser holds nothing), take your allowlist breadth. Body depends only on the two seams below. |
| **Session resolve** | `getSessionedCanonicalId(req) → string \| null` (reads `aomi_session`) | `getBetterAuthSession(req) → { user, session } \| null` | 🟡 replace-body | Re-implement `getSessionedCanonicalId` to read the BetterAuth session and return the **canonical UUID**. Proxy then unchanged. |
| **Account graph (provider)** | `resolveOrCreateCanonicalUser({provider, subject}) → {userId, created}` | `getOrCreateAomiUserForBetterAuthSession({betterAuthUserId, ...}) → DbAomiUser` | 🟡 replace-body | Keep our signature + the stable-UUID contract; swap the body to your graph. **GAP-3**: write the tables the backend reads (or migrate, preserving UUIDs). |
| **Account graph (wallet)** | `resolveOrCreateByWallet(address) → {userId, created}` (keyed `wallet_provider='wallet'`) | BetterAuth SIWE login → `getOrCreateAomiUserForBetterAuthSession` + `syncSiweWalletsForUser` (keyed `provider='better_auth'`) | 🔴 reframe | Different identity key for the same wallet. Migration must map the existing wallet row to the BetterAuth user **preserving the canonical UUID**. |
| **Bearer mint** | `mintAccountBearer(userId, role?) → {accessToken, expiresAt}` — `sub`=canonical UUID, EdDSA, mesh key | BetterAuth JWT plugin (`createAomiBackendJwtOptions`) — `sub`=BetterAuth id, `aomi_user_id`=canonical, JWKS | 🟡 replace-body | **GAP-1**: put canonical UUID in `sub`. **GAP-2**: register your key+`kid` as `aomi-bff` in the mesh tomls. Keep claim set `sub/iss/aud/role/iat/exp`. |
| **Provider-credential verify** | `verifyProviderCredential(cred) → {provider, token}`; `verifyPrivyToken`, `verifyParaJwt` (`packages/account/src/providers.ts`) | `verifyProviderCredential(cred, opts?)`; `verifyPrivyToken`, `verifyParaJwt` (`@aomi-labs/auth/providers`) | 🟢 literal swap | Same `ProviderTokenCredential` in, `VerifiedProviderToken` out. Exchange reads only `token.subject`. |
| **SIWE verify** | `verifySiweMessage({message, signature, address, chainId?}) → boolean` (`packages/account/src/siwe.ts`) | `verifySiweMessage({message, signature, address, chainId?}) → boolean` (`@aomi-labs/auth/better-auth/siwe`) | 🟢 literal swap | Identical signature + EOA→EIP-1271/6492 behavior. Copied to match. |
| **Provider exchange flow** | `createAuthExchangeRoute()` at `/api/bff/auth/exchange` — verify → resolve-or-**create** session → mint | `/api/aomi/provider/exchange` — `exchangeProviderForExistingSession({betterAuthUserId, credential})` — **link** to existing session | 🔴 reframe | Provider-first (ours) vs session-first link (yours). The verify sub-seam above swaps; the flow is rewritten. |
| **SIWE exchange flow** | `createSiweNonceRoute()` + `createSiweExchangeRoute()` (cookie nonce → verify → session) | BetterAuth SIWE plugin (nonce + session) | 🔴 reframe | Delete our two routes; BetterAuth owns nonce + session. `verifySiweMessage` survives. |
| **Account read** | `/api/account` → proxied to backend | `/api/aomi/account` → local (`accountResponseFromSession`) | 🔴 reframe | Different owner (backend vs BetterAuth). Reconcile path + payload at merge. |
| **Session cookie** | `aomi_session` (HS256, `sub`=canonical UUID, httpOnly, 7d) | BetterAuth session (DB-backed + its cookie) | 🟡 replace-body | Replace `session.ts`; keep `getSessionedCanonicalId` (above). |

**Scorecard:** 3 literal swaps (proxy-via-seam, provider-verify, SIWE-verify) · 4 replace-body (session, account-graph-provider, bearer, cookie) · 4 reframe (wallet account-graph, provider-exchange flow, SIWE-exchange flow, account read).

---

## 2. Data types — his ↔ ours

### 2a. AccountBearer (the backend JWT)

| Field | Ours (`@aomi-labs/service` / `account`) | Yours (`@aomi-labs/auth` JWT plugin) | Aligned? |
|---|---|---|---|
| alg / key | EdDSA + `kid`, **static mesh** (`service.portal.toml`) | EdDSA Ed25519, **JWKS endpoint** | ⚠️ GAP-2 |
| `sub` | **canonical UUID** | **BetterAuth user id** | ❌ GAP-1 — must be canonical UUID |
| canonical id | `sub` | `aomi_user_id` (custom claim) | ❌ GAP-1 |
| `aud` | `"aomi-backend"` | `"aomi-backend"` | ✅ |
| `iss` | `"aomi-bff"` | origin URL (env) | ⚠️ register as `aomi-bff` |
| `role` | `"user"` (authorized in mesh) | — (uses `scope`) | ⚠️ keep `role` |
| extra | — | `sid`, `scope` (`"aomi:api"`) | ✅ fine as extra claims |
| TTL | 15 min (`ACCOUNT_BEARER_TTL_SECONDS`) | `"15m"` | ✅ |
| return type | `MintedBearer = { accessToken, expiresAt }` | `AomiBackendJwtCustomClaims = { sid, aomi_user_id, scope }` | — |
| verify claims | `AccountBearerClaims = { sub, iss, aud, role, iat, exp }` | `AOMI_BACKEND_JWT_ALLOWED_CLAIMS = [iss, aud, sub, iat, exp, nbf, jti, sid, aomi_user_id, scope]` | reconcile |

### 2b. Session

| | Ours | Yours |
|---|---|---|
| mechanism | `aomi_session` HS256 cookie | BetterAuth session (DB + cookie) |
| payload | `{ sub: canonicalUUID }` | `{ user: { id, email?, emailVerified?, name?, image? }, session: { id } }` |
| read seam | `getSessionedCanonicalId(req) → string \| null` | `getBetterAuthSession(req)` / `requireAomiSession(req)` |
| signing | `AOMI_SESSION_SECRET` (HMAC) | `BETTER_AUTH_SECRET` |

### 2c. Account graph (canonical user + identity)

| Concept | Ours | Yours |
|---|---|---|
| user table | `users` (id = canonical UUID) — **backend reads this** | `aomi_users` (POC, GAP-3) |
| identity table | `auth_identities` `(provider, subject) → user_id` | `aomi_auth_identities` (POC, GAP-3) |
| resolve (provider) | `resolveOrCreateCanonicalUser({provider, subject})` | `getOrCreateAomiUserForBetterAuthSession({betterAuthUserId, email?, ...})` |
| resolve (wallet) | `resolveOrCreateByWallet(address)` — `wallet_provider='wallet'` | SIWE login → BetterAuth user (`provider='better_auth'`) + `syncSiweWalletsForUser` |
| return type | `CanonicalUser = { userId, created }` | `DbAomiUser` |
| id type | `string` (UUID) | `AomiUserId` |
| input type | `ResolveInput = { provider, subject, walletAddress? }` | `{ betterAuthUserId, email?, emailVerified?, name?, avatarUrl?, accessSignals? }` |

### 2d. Provider credential + verification

| Type | Ours (`packages/account/src/providers.ts`) | Yours (`@aomi-labs/auth/providers`) | Aligned? |
|---|---|---|---|
| provider enum | `AccountCredentialProvider = "privy" \| "para" \| (string & {})` | same | ✅ |
| credential in | `ProviderTokenCredential = { provider, providerToken, tokenKind?, keyId? }` | `ProviderTokenCredential = { provider, tokenKind?, providerToken, keyId? }` | ✅ same |
| verified out | `VerifiedProviderToken = { subject, expiresAt?, email?, emailVerified?, providerMetadata }` | `VerifiedProviderToken = { subject, expiresAt, email?, emailVerified?, providerMetadata }` | ✅ same |
| wrapped out | `VerifiedProviderTokenCredential = { provider, token }` | `{ provider, token, walletAttestationProvider }` | ✅ superset — extra field ignored |
| verifier fn | `ProviderCredentialVerifier = (cred) => Promise<VerifiedProviderToken>` | same | ✅ |
| dispatcher | `verifyProviderCredential(cred) → { provider, token }` | `verifyProviderCredential(cred, opts?) → VerifiedProviderCredential` (also handles `{provider:"cookie"}`) | ✅ literal swap (we read `token.subject`) |
| privy | `verifyPrivyToken({token, appId, verificationKey})` | `verifyPrivyToken({token, tokenKind, appId, ...Key})` | ✅ same return |
| para | `verifyParaJwt({token, expectedAudience?, keyId?})` (env JWKS, PROD/BETA fallback) | `verifyParaJwt({token, expectedAudience, jwksUrl, keyId?})` (explicit URL) | ✅ same return |

### 2e. SIWE

| | Ours (`siwe.ts`) | Yours (`better-auth/siwe.ts`) |
|---|---|---|
| verify fn | `verifySiweMessage({message, signature, address, chainId?}) → boolean` | identical |
| nonce | single-use `aomi_siwe_nonce` cookie (`createSiweNonceRoute`) | BetterAuth SIWE plugin nonce / `createWalletLinkNonce` (HMAC, bound to userId/address/chainId/domain) |
| field check | `validateSiweMessage` (viem) | BetterAuth plugin |
| chains | base + baseSepolia | mainnet, arbitrum, optimism, base, baseSepolia, polygon, sepolia, linea(+sepolia) |

### 2f. Exchange request/response

| | Ours `/api/bff/auth/exchange` | Yours `/api/aomi/provider/exchange` |
|---|---|---|
| precondition | none (creates the session) | **authenticated BetterAuth session** |
| request | `{ provider, provider_jwt, key_id? }` | `AomiAccountCredential` = `{ provider, providerToken, tokenKind? }` \| `{ provider:"cookie" }` |
| effect | resolve-or-create user, set `aomi_session`, mint-check | link credential to existing user |
| response | `{ ok, user_id }` | `{ status: "linked" \| "conflict" \| "noop", account }` |

---

## 3. Integration plan (recommended)

**Don't cherry-pick your stack into ours** (your surface is ~5–10× larger —
`packages/auth` + `wallet-kit` + attestation + mcp-approvals). **Don't blind
`git merge`** either (both branches edited the `[...slug]` proxy + exchange routes,
and did opposing renames — ours `apps/registry → apps/shadcn-registry`, yours
`→ wallet-kit` — so a naive merge conflicts hard and risks your GAP-1 minting
reaching the deployed backend).

**Do this — contract-first reconciliation, you drive it:**

1. **Mechanical base = your branch.** It carries the most code; moving it into ours
   is the expensive direction. Bring our *small, authoritative* contract layer on top.
2. **Our contract wins the seams.** At the 🟢/🟡 rows above, our shapes are the
   target: proxy inject-from-session, `sub`=canonical UUID, the
   `getSessionedCanonicalId` contract, account-graph table targets, the verifier
   shapes. Your BetterAuth supplies the *body* behind them.
3. **Take your new code wholesale where it doesn't touch the backend contract** —
   `wallet-kit`, wallet attestation, mcp-approvals, BetterAuth scaffolding. Normal merge.
4. **Land the three gaps** (the existing "Suggested sequence" in the main handoff):
   - GAP-2: register your signing key + `kid` as `aomi-bff` in `service.toml` + `service.portal.toml`.
   - GAP-1: mint with canonical UUID in `sub` (keep `aomi_user_id`/`sid`/`scope` as extras).
   - GAP-3: `resolveOrCreate*` writes `users`/`auth_identities` (or a UUID-preserving migration).
5. **Reframe the 🔴 flows** — provider exchange (→ session-first link), SIWE exchange
   (→ BetterAuth plugin), account read. The verify sub-seams already swap; only the
   flows change.

**The one gate that proves the merge survived:** a BetterAuth-signed token with
`sub` = a known canonical UUID **verifies in the Rust backend** and `DbUser::get(sub)`
resolves the user. Green = the contract held. (Add the proxy/SIWE smoke checks from
the bff-unification work as secondary gates.)

**Timing — do it soon.** Both branches keep touching the proxy/exchange and carry
opposing renames; the divergence cost compounds daily, while the risky part (the 3
gaps) is small and fully specified. There's no value in letting it age.
