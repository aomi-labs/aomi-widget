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
- 2026-07-03 final-review scope triage: updated
  `specs/FINAL-REVIEW-CHECKLIST.md` to prioritize current-branch blockers
  across `aomi`, `product-mono`, and `db-master`, and to defer pre-existing or
  non-branch findings such as `SEC-003` and `RUNTIME-004` unless owner scope is
  reopened.
- 2026-07-03 SEC-002 follow-up: moved device-auth provider link mode off raw
  credential loopback posts. CLI provider linking now creates an authenticated
  portal link intent, returns only a one-time PKCE code to an approved loopback
  `/callback`, and performs the provider link during portal exchange after the
  verifier check.
- 2026-07-04 SEC-002 verification: full root package Vitest suite, full portal
  Vitest suite, client build, actual CLI no-browser SIWE login/link/list smoke,
  and `scripts/smoke-auth-stack.mjs` with SIWE all passed against the local
  dev auth stack.
- 2026-07-03 SEC-004 follow-up: made the shared account proxy fail closed when
  a resolved BetterAuth session cannot mint an AccountBearer, added explicit
  optional-anonymous route policy for public widget routes, kept protected
  account/settings/secrets routes from forwarding without Authorization, and
  covered the behavior with focused proxy tests.
- 2026-07-04 SEC-004 verification: ran broad root/portal/telegram test suites,
  the live SIWE auth-stack smoke, and an actual CLI SIWE login/whoami/chat
  flow through the local portal proxy.
- 2026-07-03 SEC-005 base follow-up: replaced the Base app's hand-rolled
  anonymous catch-all proxy with the shared backend proxy, removed the
  production backend fallback for deployed environments, narrowed Base to a
  demo-only route allowlist, and updated Base env/docs/tests for the new
  explicit-backend requirement.
- 2026-07-04 SEC-005 verification follow-up: ran the broad root Vitest suite
  plus Base, shadcn registry, portal, and telegram app tests. CLI SIWE live E2E
  was not rerun because SEC-005 changes only the anonymous Base demo proxy and
  does not touch BetterAuth, SIWE, account linking, or CLI auth surfaces.
- 2026-07-04 RUNTIME-001/RUNTIME-002 follow-up: restored the React control
  context to the extracted hook composition from `origin/main`, reintroduced
  application/platform scoping through runtime, control, session, and client
  send paths, and covered platform filtering plus duplicate hosted app names by
  application id. Verified full React runtime/control Vitest coverage,
  targeted lint, client build, and library typecheck.
- 2026-07-04 XREPO-002/XREPO-003 prod-shape follow-up: created local
  `db-master` branch `codex/xrepo-db-migration-replay`, staged the 48
  previously untracked migrations, made
  `20260627005000_rename_sessions_to_threads.sql` self-converging for old
  `sessions` and already-renamed `threads` shapes, fixed the scheduled work
  cutover so prod `scheduled_intents` backfill into `threads.spawn_input` and
  `cron_jobs` before timer columns are dropped, and verified fresh replay plus
  prod-shaped seeded replay against an isolated local Postgres 17 container.
  Read-only prod inspection found deploy blockers: 12 duplicate provider-subject
  groups in `auth_identities` including 4 cross-user groups, and existing
  message duplicates that make the proposed `idx_messages_dedup` unique index
  invalid for prod. No GitHub push was performed; real staging/prod clone replay
  and duplicate-resolution policy remain deploy gates.
- 2026-07-04 portal settings route follow-up: migrated settings General,
  Usage, App Keys, Bots, BYOK, and Deploy install flows off stale
  `/api/settings/*` and `/api/control/provider-keys` paths onto the current
  `/api/account/*` backend contract, allowed the public GitHub App OAuth start
  route through the portal proxy, removed stale proxy allowlist entries, and
  made `/settings` accept a BetterAuth SIWE session cookie even when the wallet
  adapter is disconnected. Verified focused portal/client Vitest coverage,
  portal typecheck, client build, registry build, actual CLI no-browser SIWE
  login/whoami, and browser settings tab smoke with the CLI SIWE session.
- 2026-07-04 Vercel deploy-readiness follow-up: GitHub commit status showed
  only `Vercel - chat-portal` failing on `codex/merge-bff-betterauth` while
  `base`, `landing-page`, and `tg-mini-app` passed. Vercel CLI inspection was
  blocked by missing `aomi-labs` scope in the local CLI session, so remote logs
  could not be fetched. Hardened BetterAuth env resolution so Vercel preview
  deployments derive `baseURL`, SIWE domain, and trusted origins from arbitrary
  `VERCEL_BRANCH_URL` / `VERCEL_URL` values while production keeps the explicit
  canonical URL. Verified focused auth env/provider/linking tests, auth
  typecheck, portal test script, portal typecheck, and a Vercel-preview-shaped
  portal production build with branch/deployment URLs.
