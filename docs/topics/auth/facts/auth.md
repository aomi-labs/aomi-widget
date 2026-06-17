---
title: Auth
owner: frontend
status: authoritative
area: auth
review_after_days: 30
sources_of_truth:
  - apps/portal/src/app/auth/privy/page.tsx
  - apps/portal/src/app/auth/privy/privy-login-client.tsx
---

# Auth

## Overview

The portal no longer owns OAuth state, provider callbacks, pending auth rows, or secret handoff routes. The old `@aomi-labs/auth` package, `/api/auth/begin`, `/api/auth/await`, dummy providers, and portal-local `/api/auth/privy/*` API routes have been removed.

Portal auth starts from the Rust backend:

1. The caller posts to BE `POST /api/auth/privy/begin` with `X-Session-Id`.
2. The backend mints the signed state token and returns a browser URL for the portal `/auth/privy` page.
3. The portal page runs the client-side Privy login, gets the Privy access token, and posts it to the backend callback URL embedded in the begin response.
4. The backend verifies the state and Privy token, registers embedded wallet signers, upserts identities, stores secrets, and writes approval state.

The portal is now a browser UI shell for the backend-owned flow. It must not store raw provider credentials or mirror approval state locally.

## Source Map

- [apps/portal/src/app/auth/privy/page.tsx](../../../../apps/portal/src/app/auth/privy/page.tsx)
- [apps/portal/src/app/auth/privy/privy-login-client.tsx](../../../../apps/portal/src/app/auth/privy/privy-login-client.tsx)

## Operational Notes

- Privy app id, signer id, state signing, callback URL selection, and token verification are backend-owned.
- The portal `/auth/privy` page requires the backend-provided `callback_url`; it no longer falls back to a portal callback API route.

## Related Topics

- [auth/facts/auth-adapter.md](auth-adapter.md)
- [auth/facts/base-account.md](base-account.md)
- [client-runtime/facts/react-runtime.md](../../client-runtime/facts/react-runtime.md)
