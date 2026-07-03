# Auth BFF BetterAuth Cleanup Goal

Current session goal: complete the Auth BFF BetterAuth cleanup, remove legacy
`/api/bff/auth/*` auth-session routes, move CLI/native SIWE to BetterAuth
endpoints, keep canonical backend UUIDs stable, and verify with CLI E2E before
manual handoff.

Progress:

- Removed runtime `/api/bff/auth/siwe/*`, `/api/bff/auth/exchange`, and
  `/api/bff/auth/token` mounts from portal, base, and landing.
- Added `/api/aomi/account-bearer` for direct AccountBearer minting from an
  existing BetterAuth session.
- Inverted `@aomi-labs/account` so portal supplies the BetterAuth-backed
  canonical-user resolver.
- Moved CLI native SIWE to `/api/auth/siwe/{nonce,verify}` and BetterAuth
  bearer-session storage.
- Added auth regression coverage for preserving legacy wallet-keyed canonical
  UUIDs during first BetterAuth SIWE adoption.
- Verified typechecks for account, auth, client, portal, landing, and base;
  vitest suites for account/auth/client; portal test script; client build; and
  local CLI E2E against the dev auth stack.
- Follow-up live CLI E2E also verified no-browser SIWE account link and unlink:
  login with one wallet, link a second SIWE wallet, list links, logout/relogin,
  whoami, unlink the second wallet, and list links again.
- Local dev stack is running for manual testing at `http://127.0.0.1:3000`.
