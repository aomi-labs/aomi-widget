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
- 2026-07-03 review follow-up: drafted `specs/FINAL-REVIEW-CHECKLIST.md` with
  severity/complexity-ranked fix checklists and a security pass. New confirmed
  stop-ship items include MCP user spoofing, device-auth link credential
  exfiltration, the product-mono hosted DB credential, fail-open bearer proxy,
  base anonymous prod proxy, BYOK route drift, untracked db-master migrations,
  and the React control-context merge regression.
- 2026-07-03 AUTH-001 follow-up: rewired portal account-link storage away from
  durable `aomi_*` tables to the shared canonical `users` / `auth_providers` /
  `public_keys` graph. BetterAuth session tables remain session-only; SIWE and
  provider-attested wallets now land as canonical public keys with provider
  provenance. Verified auth/account package typechecks plus focused auth and
  account vitest suites. Live dev-stack E2E passed with CLI SIWE login, link,
  links, logout, relogin, whoami, unlink, final DB inspection, and the SIWE
  smoke path through portal-minted AccountBearer to backend.
- 2026-07-03 provider-link follow-up: tightened Para/Privy provider exchange so
  token-attested embedded wallets are synced with the provider identity, wallet
  ownership conflicts return 409 instead of creating an identity-only link, and
  the wallet modal no longer labels live provider wallets as linked until the
  canonical wallet row exists. Reset local `aomi_local`; backend/portal are
  healthy on 8080/3000 with empty auth/account tables.
- 2026-07-03 provider account-access polish: restored the GUI contract that
  Para/Privy Account Access shows the provider sign-in row only while the
  embedded EVM/SVM public keys remain durable backend graph rows. Provider
  wallet sync now merges REST attestations with verified token attestations so
  Para's JWT EVM/SVM wallets are not dropped when the REST response is partial.
- 2026-07-03 provider display follow-up: corrected wallet-picker semantics so
  durable Para/Privy account-wallet rows are not promoted into Connected unless
  the provider runtime reports live wallet rows, and Quick Sign-In dedupes
  method-keyed social rows against stored provider-auth rows by provider.
