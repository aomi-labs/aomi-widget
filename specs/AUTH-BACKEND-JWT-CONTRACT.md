# Aomi Backend JWT Contract

Status: draft plumbing for Rust cutover.

## Owner Split

- Better Auth owns login, browser/device sessions, JWT signing, and JWKS.
- The Aomi account service owns `aomi_users.id`, linked providers, linked wallets,
  conflicts, labels, and account metadata.
- Rust should validate tokens locally from JWKS and authorize requests from token
  claims. Rust should not depend on Portal cookies or Better Auth's session table
  for request-time auth.

## Endpoints

- Token: `GET /api/auth/token`
- JWKS: `GET /api/auth/.well-known/jwks.json`

The token endpoint requires a valid Better Auth session cookie or Better Auth
bearer. The JWKS endpoint is public.

## Required JWT Claims

```json
{
  "iss": "https://portal.aomi.dev",
  "aud": "aomi-backend",
  "sub": "<better_auth user.id>",
  "sid": "<better_auth session.id>",
  "aomi_user_id": "<aomi_users.id>",
  "scope": "aomi:api",
  "iat": 1781540000,
  "exp": 1781540900
}
```

Rust must validate:

- Signature against Better Auth JWKS.
- `iss` equals `AOMI_BACKEND_JWT_ISSUER`.
- `aud` equals `AOMI_BACKEND_JWT_AUDIENCE`.
- `exp` is in the future, and `nbf` if present is valid.
- `scope` contains or equals `aomi:api`.
- `aomi_user_id` is present and well-formed.

Rust should treat `aomi_user_id` as the Aomi account owner id. `sub` is only the
Better Auth subject and must not be interpreted as a product `users.id`.

## Do Not Add To The JWT

Do not place emails, wallet lists, linked provider metadata, provider tokens,
API keys, secret handles, or account graph snapshots in the token. Fetch that data
from the account service when a backend flow truly needs it.

## Current Compatibility

The TypeScript client still uses the existing provider-token exchange by default,
because the current Rust backend expects the legacy account bearer. The Better Auth
JWT source in `packages/client/src/account-session.ts` is opt-in until Rust accepts
this contract.
