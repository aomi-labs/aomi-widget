---
title: Auth
owner: frontend
status: authoritative
area: auth
review_after_days: 30
sources_of_truth:
  - packages/auth/src/account.ts
  - packages/auth/src/better-auth/auth.ts
  - packages/auth/src/better-auth/provider-plugin.ts
  - packages/auth/src/service/account-service.ts
  - packages/auth/src/service/provider-exchange.ts
  - packages/auth/src/types.ts
---

# Auth

## Overview

`@aomi-labs/auth` owns account auth: Better Auth sessions, SIWE, provider-token sign-in/linking, the `aomi_*` account graph, wallet linking, and canonical Aomi account resolution.

The former MCP approvals helper island was removed after deprecation. Runtime MCP behavior lives outside this package and does not import the legacy approval subpaths.

## Source Map

- [packages/auth/src/account.ts](../../../../packages/auth/src/account.ts)
- [packages/auth/src/better-auth/auth.ts](../../../../packages/auth/src/better-auth/auth.ts)
- [packages/auth/src/better-auth/provider-plugin.ts](../../../../packages/auth/src/better-auth/provider-plugin.ts)
- [packages/auth/src/service/account-service.ts](../../../../packages/auth/src/service/account-service.ts)
- [packages/auth/src/service/provider-exchange.ts](../../../../packages/auth/src/service/provider-exchange.ts)
- [packages/auth/src/types.ts](../../../../packages/auth/src/types.ts)

## Key Flows

### Account Sign-In

Better Auth owns browser/device sessions. SIWE sign-in verifies an ERC-4361 message through the Better Auth SIWE plugin. Privy/Para token sign-in goes through the Aomi provider plugin, which verifies the provider token server-side, creates or finds a Better Auth user, links the provider identity in the `aomi_*` graph, syncs attested provider wallets, and sets the Better Auth session cookie.

### Backend Bearer Handoff

Portal and CLI requests authenticate to the BFF with a Better Auth session cookie or bearer-plugin session token. The portal proxy resolves that session to the canonical Aomi `users.id`, mints a short-lived EdDSA `AccountBearer` with the static service topology, strips client auth headers, and forwards the backend request with the trusted bearer.

The old Better Auth JWT/JWKS minter path has been removed. Backend identity now flows through `resolveOrCreateCanonicalUser` plus the service mesh signer, not `/api/auth/token`.

### Providers

Privy and Para provider verification lives under `packages/auth/src/providers/`. Provider tokens are verified server-side before account sign-in or linking, and provider-attested wallets are synced only when the corresponding REST credentials are configured.

## Operational Notes

- Raw provider credentials must never be returned to MCP callers or persisted in approval rows.
- Raw Privy/Para tokens must never be stored in Aomi account tables.
- `PORTAL_SERVICE_PRIVATE_KEY` provides the portal BFF's Ed25519 signing key. The matching public key lives in `packages/account/src/topology-data.ts` and the backend `service.toml`.
- Privy and Para verification keys/secrets are server-only and must not be exposed to the browser.

## Related Topics

- [auth/facts/wallet-kit.md](wallet-kit.md)
- [auth/facts/base-account.md](base-account.md)
- [client-runtime/facts/react-runtime.md](../../client-runtime/facts/react-runtime.md)
