---
title: Auth
owner: frontend
status: authoritative
area: auth
review_after_days: 30
sources_of_truth:
  - packages/auth/src/account.ts
  - packages/auth/src/better-auth/auth.ts
  - packages/auth/src/better-auth/backend-jwt.ts
  - packages/auth/src/types.ts
  - packages/auth/src/mcp-approvals/routes/begin.ts
  - packages/auth/src/mcp-approvals/routes/callback.ts
  - packages/auth/src/mcp-approvals/secret-store/be-vault.ts
  - apps/portal/src/lib/aomi-auth/local-secret-store.ts
---

# Auth

## Overview

`@aomi-labs/auth` contains two separate auth systems:

- Account auth: Better Auth sessions, SIWE, provider-token sign-in/linking, the `aomi_*` account graph, wallet linking, and the Better Auth-signed backend JWT contract.
- MCP approvals: pending OAuth-style provider approvals and the secret-store handoff that keeps raw credential material out of MCP-facing responses.

Do not couple those systems. Account auth answers "who is this user?" MCP approvals answer "may this app use this external credential?"

## Source Map

- [packages/auth/src/account.ts](../../../../packages/auth/src/account.ts)
- [packages/auth/src/better-auth/auth.ts](../../../../packages/auth/src/better-auth/auth.ts)
- [packages/auth/src/better-auth/backend-jwt.ts](../../../../packages/auth/src/better-auth/backend-jwt.ts)
- [packages/auth/src/types.ts](../../../../packages/auth/src/types.ts)
- [packages/auth/src/mcp-approvals/routes/begin.ts](../../../../packages/auth/src/mcp-approvals/routes/begin.ts)
- [packages/auth/src/mcp-approvals/routes/callback.ts](../../../../packages/auth/src/mcp-approvals/routes/callback.ts)
- [packages/auth/src/mcp-approvals/secret-store/be-vault.ts](../../../../packages/auth/src/mcp-approvals/secret-store/be-vault.ts)
- [apps/portal/src/lib/aomi-auth/local-secret-store.ts](../../../../apps/portal/src/lib/aomi-auth/local-secret-store.ts)

## Key Flows

### Account Sign-In

Better Auth owns browser/device sessions. SIWE sign-in verifies an ERC-4361 message through the Better Auth SIWE plugin. Privy/Para token sign-in goes through the Aomi provider plugin, which verifies the provider token server-side, creates or finds a Better Auth user, links the provider identity in the `aomi_*` graph, syncs attested provider wallets, and sets the Better Auth session cookie.

### Backend JWT

The Better Auth JWT plugin exposes `GET /api/auth/token` and JWKS at `/api/auth/.well-known/jwks.json`. The custom payload is intentionally small: `sub` is the Better Auth user id, `sid` is the Better Auth session id, `aomi_user_id` is the durable Aomi account id, and `scope` is `aomi:api`.

The TypeScript client keeps the legacy provider-token exchange as the default until Rust validates Better Auth JWTs through JWKS.

### Begin

`beginAuth` resolves the requested provider from a `ProviderRegistry`, generates a state token, stores a `pending_auths` row, and returns the provider start URL. It does not contact the provider; it only reserves the state and tells the caller where the user should be sent.

Portal exposes the BE-facing MCP entrypoint through `POST /api/mcp-auth/begin`. That route requires `X-Aomi-Auth`, reads the configured provider registry, and returns snake_case wire fields: `state_token`, `auth_url`, and `expires_at`.

### Start And Callback

`makeStartHandler` validates the `state` query param, checks that the state belongs to the requested provider, then delegates to the provider's `start()` method. Providers can return either inline HTML or a redirect URL.

`makeCallbackHandler` accepts GET query values or POST form/JSON values, validates the pending state, delegates to `provider.callback()`, writes provider-returned secrets through `SecretStore.put`, inserts an access approval, and marks the pending row complete.

The callback stores only secret handles in approval metadata. It sorts the returned handle keys before JSON encoding so the stored handle map is deterministic.

### Await And Lookup

`awaitAuth` long-polls a pending state until completion, failure, or timeout. It returns `pending` when the timeout expires without completion so callers can retry the wait.

`lookupApproval` checks whether a user already has an active approval for an application. This lets MCP avoid starting a new browser auth flow when an active grant already exists.

### Secret Storage

`BeVaultSecretStore` posts secrets to the Rust backend's trusted internal secret-ingest endpoint with `X-Aomi-Auth`. The backend keeps the raw secret material; this package stores only opaque handles.

`MemorySecretStore` and `MemoryStore` are local/test implementations. Portal's singleton auth runtime uses `MemoryStore` for pending/auth metadata and chooses `BeVaultSecretStore` by default unless `AOMI_SECRET_STORE=memory` is set.

### Providers

`dummyProvider` proves the end-to-end flow with an inline approval page and a synthesized token.

`makePrivyProvider` redirects to a portal-hosted Privy login page. Its callback expects `access_token`, `user_id`, `wallet_id`, and `wallet_address`, verifies the access token server-side, rejects browser-reported user IDs that do not match the signed subject, validates the obvious Privy DID and EVM address shapes, and returns Privy credential slots for the secret store.

## Operational Notes

- Raw provider credentials must never be returned to MCP callers or persisted in approval rows.
- Raw Privy/Para tokens must never be stored in Aomi account tables.
- `stateToken` is the correlation key across begin, start, callback, and await.
- MCP provider names are URL slugs under `/api/mcp-auth/{provider}` and keys in `ProviderRegistry`.
- Portal's singleton auth runtime is stored on `globalThis` so `next dev` hot reloads do not lose pending auth state.
- `AOMI_AUTH_TOKEN` is the v1 shared secret between portal and the backend trusted secret ingest path.
- `AOMI_BACKEND_JWT_ISSUER`, `AOMI_BACKEND_JWT_AUDIENCE`, `AOMI_BACKEND_JWKS_PATH`, and `AOMI_BACKEND_JWT_SCOPE` define the future Rust JWT validation contract.
- `PRIVY_APP_ID` or `NEXT_PUBLIC_PRIVY_APP_ID` plus the server-only `PRIVY_JWT_VERIFICATION_KEY` control whether the Privy provider is registered.
- Production persistence is still future work; the current store implementation is in-memory.

## Related Topics

- [auth/facts/wallet-kit.md](wallet-kit.md)
- [auth/facts/base-account.md](base-account.md)
- [client-runtime/facts/react-runtime.md](../../client-runtime/facts/react-runtime.md)
