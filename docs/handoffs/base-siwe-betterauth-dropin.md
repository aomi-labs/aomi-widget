# Handoff → arixoneth: base SIWE is shaped as a drop-in for your BetterAuth

Status: 2026-06-27 · from: bff-unification (`@aomi-labs/account`) · re: `codex/widget-auth-pre-rust`

## TL;DR

base uses a Coinbase/Base **smart account** with no Privy/Para JWT, so the BFF
unification gave it a **pre-BetterAuth SIWE bridge**: prove wallet ownership →
mint the session. Your branch already has the real thing
(`@aomi-labs/auth/better-auth/siwe` + the BetterAuth SIWE plugin). To avoid a
parallel stack, **our bridge is shaped to match your seams** so your migration is
a delete-and-point, not a rewrite. This doc is the per-seam mapping.

This complements [arixoneth-account-auth.md](./arixoneth-account-auth.md) (the
GAP-1/2/3 contract) — base SIWE inherits all three gaps; the notes below say how.
For the full seam contract, his↔ours data-type tables, and the merge plan, see
[bff-betterauth-integration.md](./bff-betterauth-integration.md) — this doc is the
SIWE + provider-verify drill-down it links to.

## Provider exchange (Privy/Para) — verification sub-seam is a drop-in

The provider-exchange *flow* is not a drop-in (ours creates the session from the
provider JWT; yours links a provider to an existing BetterAuth session — the
"scaffold → reframe" from the main handoff). But its **verification sub-seam** is
now shaped to match yours so the verifiers swap cleanly:

| Ours (`packages/account/src/providers.ts`) | Yours (`@aomi-labs/auth/providers`) | Migration |
|---|---|---|
| `verifyProviderCredential(credential: ProviderTokenCredential) → { provider, token }` | `verifyProviderCredential(credential, options?)` | Same name + `ProviderTokenCredential` input + `VerifiedProviderToken` (`subject`/`expiresAt`/`email`/`emailVerified`/`providerMetadata`). Yours returns the extra `walletAttestationProvider`; the exchange only reads `token.subject`, so yours drops in. |
| `verifyPrivyToken({ token, appId, verificationKey })` | `verifyPrivyToken({ token, tokenKind, appId, ...Key })` | Same return shape; yours adds access/identity token-kind handling. |
| `verifyParaJwt({ token, expectedAudience?, keyId? })` | `verifyParaJwt({ token, expectedAudience, jwksUrl, keyId? })` | Same return shape; ours derives the JWKS URL from env (PROD/BETA fallback), yours takes it explicitly. |

`exchange.ts` consumes only `verifyProviderCredential(...).token.subject`, so when
your `@aomi-labs/auth/providers` lands the import swaps with no route change. The
exchange *flow* (create-vs-link) is still reframed at merge.

## Seam-by-seam drop-in map

| Our bridge (`packages/account/src/siwe.ts`) | Your BetterAuth equivalent | Migration |
|---|---|---|
| `verifySiweMessage({ message, signature, address, chainId? }) → boolean` | `verifySiweMessage(...)` in `@aomi-labs/auth/better-auth/siwe` | **Identical signature + behavior** (EOA `verifyMessage` → smart-account on-chain EIP-1271/6492). Replace the import; zero call-site change. |
| `createSiweNonceRoute()` — single-use `aomi_siwe_nonce` httpOnly cookie | BetterAuth SIWE plugin nonce (and `createWalletLinkNonce`/`verifyWalletLinkNonce` for linking) | Drop our nonce route; BetterAuth issues + validates the nonce. |
| `createSiweExchangeRoute()` — validate fields (`validateSiweMessage`) → verify sig → `resolveOrCreateByWallet` → `setSessionCookie` | BetterAuth SIWE plugin sign-in → BetterAuth session | Drop our verify route; BetterAuth creates the session. We already split field-validation from signature-verification to mirror your structure. |
| `resolveOrCreateByWallet(address)` → canonical user keyed `wallet_provider='wallet'`, `auth_value_normalized=lower(address)` in **`users`/`auth_identities`** | `getOrCreateAomiUserForBetterAuthSession({ betterAuthUserId, ... })` (keyed `provider='better_auth'`) + `syncSiweWalletsForUser` | **GAP-3 / Alice invariant** — see below. The wallet address must resolve to the user's *existing* canonical UUID across the cutover, or sessions/history detach. |
| `aomi_session` httpOnly cookie (`@aomi-labs/account/session`) | BetterAuth session | Per the main handoff: replace `session.ts`; keep `getSessionedCanonicalId(req) → canonical UUID` and the proxy is unchanged. |
| Client `AomiWalletSiweSessionProvider` (`apps/shadcn-registry/.../aomi-session/`): nonce → `adapter.signMessage` → verify, publishes `AomiSessionStatus` | BetterAuth client SIWE sign-in | Replace with the BetterAuth client call; keep the `anonymous/establishing/ready/error` lifecycle so account-gated UI is unchanged. |

## The gaps, as they apply to base SIWE

- **GAP-1 (canonical id in `sub`)** — already satisfied. Our SIWE mints via
  `mintAccountBearer(userId)`, so `sub` = the canonical UUID. Keep that when your
  BetterAuth JWT mints for a SIWE session.
- **GAP-2 (static-key verify)** — unchanged from the main handoff: register your
  signing key + `kid` as `aomi-bff` in both mesh tomls.
- **GAP-3 (account-graph tables) — the one that bites base SIWE.** Our bridge
  writes the backend-read `users`/`auth_identities` with a `wallet_provider='wallet'`
  identity keyed on the lowercased address. Your BetterAuth keys the canonical
  user on `provider='better_auth'` (the BetterAuth user id) and records the wallet
  via `syncSiweWalletsForUser`. **These are two different identity keys for the
  same person**, so at cutover the migration must map an existing
  `wallet_provider='wallet'` row to the BetterAuth-keyed user **preserving the
  canonical UUID** — otherwise a returning base user gets a second account and
  loses her sessions/history. Recommended: on first BetterAuth SIWE login, look up
  any existing `wallet`-keyed `auth_identities` row for that address and adopt its
  `user_id` as the canonical id rather than minting a new one.

## Why a bridge exists at all

base shipped in this branch needs a working proxy-mint login *now*, before your
BetterAuth lands. The bridge is deliberately thin and labelled TMP in-code
(`packages/account/src/siwe.ts` header). When BetterAuth merges: delete the two
SIWE routes + the client provider, point base's wallet login at the BetterAuth
SIWE plugin, and run the GAP-3 UUID-preserving backfill above. `verifySiweMessage`
is the one piece that survives verbatim (it's yours, copied to match).

## Files

- `packages/account/src/siwe.ts` — bridge (verify fn shaped to match yours).
- `packages/account/src/account-graph.ts` — `resolveOrCreateByWallet` (+ tests).
- `apps/base/app/api/bff/auth/siwe/{nonce,verify}/route.ts` — base mounts.
- `apps/shadcn-registry/src/lib/aomi-session/` — client SIWE session provider.
