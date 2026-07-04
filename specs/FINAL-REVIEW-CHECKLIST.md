# Final Review Checklist: Auth BFF, Wallet Runtime, DB Thread Cutover

Date: 2026-07-03
Branch reviewed: `codex/merge-bff-betterauth`
Primary repo: `/Users/aronmegyeri/Documents/Work/Aomi/Work.nosync/aomi`
Sibling repos checked:

- `/Users/aronmegyeri/Documents/Work/Aomi/Work.nosync/product-mono`
- `/Users/aronmegyeri/Documents/Work/Aomi/Work.nosync/db-master`

This file expands the previous agent report into a fix-ready checklist. It is
written for a later implementation agent: start at the top, do not skip the
security items, and keep each issue's acceptance checks green before moving on.

## Scope Triage Follow-Up

Checked again on 2026-07-03 against the active local branches:

- `aomi`: `codex/merge-bff-betterauth`
- `product-mono`: `codex/auth-stack-dbthread-unification`
- `db-master`: `main` with 48 untracked migration files

Use this pass to fix items caused by, or directly blocking, those branches. Keep
unrelated findings documented, but do not let them pull the branch into a
general cleanup project.

Priority buckets:

- **P0 current-branch blockers:** `SEC-002`, `SEC-004`, `SEC-005`,
  `RUNTIME-001`, `RUNTIME-002`, `XREPO-002`, `XREPO-003`.
- **P1 finish-before-PR items:** `RUNTIME-003`, `AUTH-002`, `AUTH-003`,
  `DEP-001`, `HYGIENE-001`, `HYGIENE-002`.
- **P2 opportunistic cleanup:** `SEC-006`, `RUNTIME-005`, `HYGIENE-003`
  through `HYGIENE-006`.
- **Deferred unless owner explicitly reopens scope:** `SEC-003`,
  `RUNTIME-004`.
- **Owner-deferred but branch-related:** `SEC-001`, `XREPO-001`,
  `XREPO-004`. If these stay deferred, the PR/deploy notes must name the owner,
  date, and exact product surface left disabled or unsupported.

Scope evidence from this follow-up:

- `SEC-003` is real but pre-existing in `product-mono` `origin/main`; it is not
  introduced by `codex/auth-stack-dbthread-unification`.
- `RUNTIME-004` names `packages/react/src/handlers/wallet-handler.ts`, which is
  not changed by `codex/merge-bff-betterauth` relative to `origin/main`.
- `XREPO-002`/`XREPO-003` remain in-scope: `db-master` currently has 48
  untracked migrations, including the thread rename and account-model chain.
- `RUNTIME-001`/`RUNTIME-002` remain in-scope: the active `aomi` diff changes
  both `packages/react/src/contexts/control-context.tsx` and
  `packages/react/src/runtime/aomi-runtime.tsx`.
- `SEC-002`, `SEC-004`, and `SEC-005` remain in-scope: the active `aomi` diff
  changes the device-auth client, AccountBearer proxy, and base proxy files
  named below.

## Executive Verdict

Current status: **No-go for merge or deploy.**

The architecture is still salvageable: BetterAuth, AccountBearer, wallet-kit,
and the DB thread/account model direction are coherent. The blockers are mostly
integration and hardening failures created by merge resolution, endpoint
cutover drift, and incomplete cross-repo deployment prep.

The immediate risk is not theoretical. The current code contains:

- A critical MCP user-spoofing path in portal.
- A critical device-auth link flow that can post provider credentials to an
  attacker-controlled redirect URI.
- A confirmed hosted Supabase credential committed in `product-mono` before the
  active product branch.
- A client/backend BYOK route mismatch that will break the settings surface.
- A DB migration chain that is not reproducible from tracked `db-master` state.
- A React runtime merge regression that drops platform/application scoping.

Do the "Immediate Containment" checklist before normal cleanup.

## Immediate Containment

- [ ] Deferred out of this branch but still urgent for the owner: rotate the
  leaked `product-mono` Supabase pooler password from
  `aomi/crates/database/src/lib.rs:52`.
- [ ] Deferred out of this branch: remove the hardcoded hosted DB URL and
  require explicit DB env in `product-mono`.
- [ ] Owner-deferred but branch-related: disable or auth-gate portal
  `/api/mcp/[transport]` until it derives user identity server-side.
- [x] Disable device-auth `mode=link` or restrict `redirect_uri` to loopback
  `/callback` before any external testing.
- [ ] Confirm ignored `.env*.local` files were not shared. Rotate local secrets
  only if they left this machine.
- [x] Do not deploy `apps/base` as currently written unless it is intentionally
  an anonymous-only demo with mutating routes removed.

## Fix Order

1. Security stop-ship items for this pass: `SEC-002`, `SEC-004`, `SEC-005`.
2. React/runtime merge recovery: `RUNTIME-001`, `RUNTIME-002`.
3. Cross-repo deploy contract: `XREPO-002`, `XREPO-003`.
4. Finish-before-PR verification: `RUNTIME-003`, `AUTH-002`, `AUTH-003`,
   `DEP-001`, `HYGIENE-001`, `HYGIENE-002`.
5. Opportunistic cleanup if the above is green: `SEC-006`, `RUNTIME-005`,
   `HYGIENE-003` through `HYGIENE-006`.

## Deferred For Later

Keep these findings documented but do not treat them as part of the current fix
pass unless the owner explicitly reopens scope:

- [ ] `SEC-001` MCP route allows user spoofing. Branch-related, owner-deferred;
  must remain disabled/not externally exposed if not fixed.
- [ ] `SEC-003` hosted Supabase credential hardcoded in `product-mono`.
  Pre-existing on `product-mono` `origin/main`.
- [ ] `XREPO-001` BYOK client calls removed backend route. Branch-related,
  owner-deferred; settings/BYOK surfaces must not be claimed ready if left open.
- [ ] `XREPO-004` signing authorization is not end-to-end. Branch-related,
  owner-deferred; autonomous signing UX/API must not be claimed complete.
- [ ] `RUNTIME-004` wallet request suppression can hide blocking requests. Not
  touched by the active `aomi` branch.

## Issue Index

| ID | Severity | Complexity | Repo | Status | Summary |
| --- | --- | --- | --- | --- | --- |
| SEC-001 | Critical | M | aomi | Owner-deferred, branch-related | MCP route trusts caller-supplied `x-aomi-user`. |
| SEC-002 | Critical | M | aomi | Completed | Device-auth link mode can exfiltrate provider credentials. |
| SEC-003 | Critical | S | product-mono | Deferred, pre-existing | Hosted Supabase credential hardcoded in source. |
| SEC-004 | High | M | aomi | Completed | AccountBearer proxy fails open to anonymous. |
| SEC-005 | High | M | aomi | Completed | Base app is an anonymous relay to production by default. |
| SEC-006 | Medium | M | aomi | P2 current branch | Device-auth grants are in-process and store session tokens. |
| XREPO-001 | Blocker | M | aomi/product-mono | Owner-deferred, branch-related | BYOK client still calls removed `/api/control/provider-keys`. |
| XREPO-002 | Blocker | L | db-master/product-mono | P0 current branch | Required DB migrations are untracked. |
| XREPO-003 | Blocker | L | db-master | P0 current branch | `sessions` to `threads` migration is fresh-DB only. |
| XREPO-004 | High | L | aomi/db-master/product-mono | Owner-deferred, branch-related | Signing authorization contract is split and not surfaced end to end. |
| RUNTIME-001 | Blocker | L | aomi | Completed | Control-context merge regression resurrected old monolith. |
| RUNTIME-002 | Blocker | M | aomi | Completed | Application/platform scoping is dropped. |
| RUNTIME-003 | High | M | aomi | P1 current branch | New sessions miss `user_state_updated` listener. |
| RUNTIME-004 | High | M | aomi | Deferred, not in branch diff | Wallet request suppression can hide blocking requests. |
| RUNTIME-005 | Medium | M | aomi | P2 current branch | Runtime/provider values are render-unstable. |
| AUTH-001 | High | L | aomi/product-mono | Completed | Portal auth DB still owns a second wallet graph. |
| AUTH-002 | High | M | aomi | P1 partially addressed | Identity rebind can orphan old-user-owned backend rows. |
| AUTH-003 | Medium | S | aomi | P1 mostly completed | Smoke script targets deleted legacy BFF endpoints. |
| DEP-001 | High | M | aomi | P1 triage | `pnpm audit` reports 4 critical and 65 high advisories. |
| HYGIENE-001 | High | S | aomi | P1 current branch | Generated `dist` artifacts are tracked/dirty. |
| HYGIENE-002 | Medium | S | aomi | P1 current branch | Portal backend URL fallback changed to local-only. |
| HYGIENE-003 | Medium | S | aomi | P2 reported | Dependency/version drift and stale package refs. |
| HYGIENE-004 | Medium | S | aomi | P2 reported | Planning/spec scratch files should be pruned before PR. |
| HYGIENE-005 | Low | S | aomi | P2 reported | Logs, duplicated helpers, dead aliases, and stubs remain. |
| HYGIENE-006 | Low | S | aomi | P2 confirmed | GOAL/session notes are stale review state. |

## Security Findings

### SEC-001: MCP Route Allows User Spoofing

Deferred for later per owner direction.

Severity: Critical
Complexity: Medium
Primary files:

- `apps/portal/src/app/api/mcp/[transport]/route.ts:19`
- `apps/portal/src/lib/aomi-mcp/mcp-server.ts:19`
- `apps/portal/src/lib/aomi-mcp/env.ts:21`
- `packages/mcp-core/src/backends/aomi-client.ts:99`

Problem:

`/api/mcp/[transport]` accepts requests with no auth gate. The MCP server then
resolves the backend user from the client-supplied `x-aomi-user` header or a
fixed dev UUID. The mcp-core client forwards that value with `X-Aomi-User` and
the service auth token to the backend.

Impact:

Any caller that can reach portal can choose a victim UUID and drive MCP tools
as that user. Because the backend bridge is service-authenticated, this is a
full impersonation class bug.

Fix checklist:

- [ ] Add a route-level auth gate before `buildMcpServerForRequest`.
- [ ] Resolve canonical user ID from BetterAuth session or a real MCP OAuth
  session, not from headers.
- [ ] Remove `x-aomi-user` user resolution from production code.
- [ ] Remove `AOMI_DEV_USER_ID` fallback outside explicit dev/test mode.
- [ ] Make `AOMI_AUTH_TOKEN` required in non-development.
- [ ] Add negative tests for spoofed `x-aomi-user`.
- [ ] Add a no-session test that receives 401/403, not a working MCP server.

Acceptance checks:

- [ ] `curl` without auth to `/api/mcp/http` cannot initialize or call tools.
- [ ] `curl -H 'x-aomi-user: victim'` with no session is rejected.
- [ ] Authenticated user A cannot set a header to act as user B.
- [ ] Production build fails fast if MCP service env is missing and route is
  enabled.

### SEC-002: Device-Auth Link Mode Can Exfiltrate Provider Credentials

Severity: Critical
Complexity: Medium
Primary files:

- `apps/portal/src/app/device-auth/device-auth-client.tsx:46`
- `apps/portal/src/app/device-auth/device-auth-client.tsx:170`
- `apps/portal/src/app/device-auth/device-auth-client.tsx:287`

Problem:

Device auth validates only that `state`, `code_challenge`, and `redirect_uri`
are nonempty. In `mode=link`, it obtains a Privy/Para credential and posts it
as a hidden form to the caller-provided `redirect_uri`.

Impact:

An attacker can send a user a crafted portal link with
`mode=link&redirect_uri=https://attacker.example/...`. If the user completes
provider auth, portal posts the provider credential to the attacker, who can
try to exchange or link it.

Fix checklist:

- [x] Apply the same redirect validation used by login grants to link mode.
- [x] Allow only loopback `http://127.0.0.1:<port>/callback`,
  `http://localhost:<port>/callback`, or equivalent approved CLI callback.
- [x] Stop posting raw provider credentials to browser-provided URLs.
- [x] Convert link mode to one-time PKCE code exchange through portal.
- [x] Bind link grants to provider, state, challenge, user/session, and expiry.
- [x] Add an explicit "invalid redirect" error page for rejected requests.

Acceptance checks:

- [x] Link flow rejects `https://attacker.example/callback`.
- [x] Link flow rejects non-`/callback` loopback paths.
- [x] Link flow never includes provider credential JSON in a form submitted to
  a third-party origin.
- [x] CLI link still succeeds through the approved loopback code exchange.

### SEC-003: Hardcoded Hosted Supabase Credential in product-mono

Deferred for later per owner direction.

Follow-up scope note, 2026-07-03: this credential is present in
`product-mono` `origin/main`, so it is not introduced by
`codex/auth-stack-dbthread-unification`. Treat rotation as urgent owner
containment outside this branch, not as a blocker for the current diff unless
the owner reopens scope.

Severity: Critical
Complexity: Small
Primary files:

- `product-mono/aomi/crates/database/src/lib.rs:52`
- `product-mono/aomi/crates/database/src/lib.rs:367`
- `product-mono/aomi/bin/x/src/config.rs:60`

Problem:

`DEFAULT_DATABASE_URL` contains a hosted Supabase pooler URL with embedded
username and password. Runtime and tests fall back to it when DB env vars are
absent.

Impact:

The secret is exposed in source/history, and local or unconfigured runs can
silently connect to the hosted shared DB.

Fix checklist:

- [ ] Rotate the exposed Supabase password immediately.
- [ ] Replace `DEFAULT_DATABASE_URL` with no default or a local-only safe value.
- [ ] Make production/staging DB URL required.
- [ ] Make tests require an explicit local DB fixture or skip when unset.
- [ ] Search repo history and docs for the old credential.
- [ ] Add a secret scan in CI to prevent reintroduction.

Acceptance checks:

- [ ] Secret scan for the retired Supabase pooler URL/password returns no live
  credentials.
- [ ] Running without `DATABASE_URL` cannot connect to hosted DB.
- [ ] CI secret scan passes.

### SEC-004: Backend Proxy Fails Open on Bearer Mint Failure

Severity: High
Complexity: Medium
Primary file: `packages/account/src/proxy.ts:145`

Problem:

When `resolveCanonicalUserId` finds a session but `mintAccountBearer` throws,
the proxy logs a warning and forwards the request anonymously.

Impact:

Signer/key/env failures silently downgrade authenticated requests. This hides
auth outages and can produce confusing anonymous side effects on routes that
expected user isolation.

Fix checklist:

- [x] Change `injectBearer` to return an auth state:
  `anonymous | authenticated | mint_failed`.
- [x] Fail closed for `mint_failed` with 500 or 503.
- [x] Add route policy for routes that must never be anonymous.
- [x] Keep anonymous forwarding only for explicitly public routes.
- [x] Add tests with a resolved session and missing/invalid
  `PORTAL_SERVICE_PRIVATE_KEY`.

Acceptance checks:

- [x] Authenticated request plus broken signer returns 5xx.
- [x] Anonymous request to allowed anonymous route still works.
- [x] Protected routes cannot silently proceed without `Authorization`.

### SEC-005: Base App Proxies Anonymous Mutating Routes to Production

Severity: High
Complexity: Medium
Primary files:

- `apps/base/app/api/[...slug]/route.ts:25`
- `apps/base/app/api/[...slug]/route.ts:56`
- `apps/base/app/aomi-app.tsx:12`

Problem:

The base app has a hand-rolled proxy that strips `authorization`, defaults
upstream to `https://api.aomi.dev`, and allows mutating widget routes such as
chat, secrets, sessions, and provider keys.

Impact:

A deployed base shell can become a public relay to production backend routes,
without the shared AccountBearer injection policy.

Fix checklist:

- [x] Replace the hand-rolled proxy with shared `createBackendProxy`.
- [x] Decide whether base is authenticated or truly anonymous.
- [x] If anonymous, remove secrets, account, BYOK, control mutation, and
  sensitive thread routes.
- [x] Require `AOMI_PROXY_BACKEND_URL` in deployed env; do not default to prod.
- [x] Update `apps/base/.env.example` to match the chosen behavior.

Acceptance checks:

- [x] Base deploy with missing backend env fails or uses a documented safe demo
  endpoint.
- [x] Anonymous base cannot write secrets/BYOK/user-scoped data.
- [x] Base proxy behavior is covered by route allowlist tests.

### SEC-006: Device-Auth Grants Are Process-Local and Store Session Tokens

Severity: Medium
Complexity: Medium
Primary files:

- `apps/portal/src/lib/device-auth-grants.ts:10`
- `apps/portal/src/lib/device-auth-grants.ts:20`
- `apps/portal/src/app/api/aomi/device-auth/exchange/route.ts:34`

Problem:

Device grants are stored in an in-memory `Map` and contain raw session tokens.
The exchange endpoint returns the raw session token.

Impact:

On Vercel/serverless, grant creation and exchange can land on different
instances. Tokens also live in process memory until TTL/prune.

Fix checklist:

- [ ] Move grants to Postgres or Redis with TTL.
- [ ] Store hashed grant codes.
- [ ] Atomically consume grants.
- [ ] Avoid storing raw session tokens when possible; otherwise encrypt at rest.
- [ ] Bind grant to user, provider, code challenge, redirect URI, and expiry.
- [ ] Add cross-instance style tests using separate store clients.

Acceptance checks:

- [ ] Grant exchange works after process restart when backed by durable store.
- [ ] Reusing the same code fails.
- [ ] Wrong state/verifier/redirect fails.
- [ ] Raw grant code is not stored in plaintext.

## Cross-Repo Contract Findings

### XREPO-001: BYOK Client Calls Removed Backend Route

Deferred for later per owner direction.

Follow-up scope note, 2026-07-03: this is branch-related because the active
`aomi` branch changes the TypeScript client and the active `product-mono` branch
exposes `/api/account/payment/byok`. If still deferred, do not claim BYOK/settings
readiness in the PR or deploy notes.

Severity: Blocker
Complexity: Medium
Repos: `aomi`, `product-mono`
Primary files:

- `packages/client/src/client.ts:948`
- `packages/client/src/client.ts:972`
- `packages/client/src/client.ts:999`
- `apps/base/app/api/[...slug]/route.ts:46`
- `product-mono/aomi/bin/backend/src/endpoint/account/payment.rs:62`
- `product-mono/aomi/bin/backend/src/endpoint/tests/routes.rs:61`

Problem:

The TypeScript client still calls `/api/control/provider-keys`, while the
backend now registers BYOK under `/api/account/payment/byok`.

Fix checklist:

- [ ] Confirm backend response shape for list/create/delete BYOK.
- [ ] Update `AomiClient.listByokKeys`, `saveByokKey`, and `deleteByokKey`.
- [ ] Update portal/base proxy allowlists.
- [ ] Remove old `/api/control/provider-keys` tests and docs.
- [ ] Add integration tests against the new route names.
- [ ] Coordinate deploy so backend and frontend cut over together.

Acceptance checks:

- [ ] BYOK list/save/delete succeeds through portal proxy.
- [ ] Old control route returns 404 in tests.
- [ ] Client tests assert `/api/account/payment/byok`.

### XREPO-002: db-master Cannot Reproduce Required Schema

Severity: Blocker
Complexity: Large
Repos: `db-master`, `product-mono`

Problem:

`db-master` has 48 untracked migrations, including the thread rename and
account-model chain. `product-mono` is already compiled against the final
schema (`threads`, `auth_providers`, `public_keys.signing_mode`, etc.).

Fix checklist:

- [ ] Create a db-master branch for this migration chain.
- [ ] Add the intended migrations deliberately.
- [ ] Squash add-then-drop churn before first commit.
- [ ] Verify `git ls-files migrations/*.sql` includes the full chain.
- [ ] Replay from empty DB.
- [ ] Replay against a staging/prod clone snapshot.
- [ ] Publish a PR before merging dependent product code.

Acceptance checks:

- [ ] Fresh DB reaches schema expected by `product-mono` Diesel schema.
- [ ] Upgraded DB reaches the same schema.
- [ ] No migration file needed for runtime is untracked.

### XREPO-003: Thread Rename Migration Is Fresh-DB Only

Severity: Blocker
Complexity: Large
Primary file:
`db-master/migrations/20260627005000_rename_sessions_to_threads.sql:12`

Problem:

The migration itself says staging/prod need a self-converging variant, but the
file contains unconditional renames.

Fix checklist:

- [ ] Replace unconditional renames with guarded old/new shape checks.
- [ ] Handle DBs where later `threads_*` migrations already no-oped into
  migration history.
- [ ] Reassert final `threads` columns, indexes, constraints, and timer drops.
- [ ] Add preflight SQL that reports current shape before mutating.
- [ ] Rehearse on a prod clone and capture row counts before/after.

Acceptance checks:

- [ ] Running on fresh schema succeeds.
- [ ] Running on already partially migrated staging shape succeeds.
- [ ] Messages, usage events, transactions, and thread parent links preserve row
  counts and references.

### XREPO-004: Signing Authorization Is Not End-to-End

Deferred for later per owner direction.

Follow-up scope note, 2026-07-03: this is branch-related across
`product-mono`, `db-master`, and the wallet runtime. It remains deferred only
because it is a wider signing UX/API contract pass. If left open, autonomous
signing must not be presented as complete.

Severity: High
Complexity: Large
Repos: `aomi`, `db-master`, `product-mono`
Primary files:

- `db-master/migrations/20260630010000_identity_wallets_signing_authorization.sql:17`
- `packages/client/src/wallet-utils.ts:30`
- `packages/client/src/wallet-utils.ts:374`
- `apps/shadcn-registry/src/components/runtime-tx-handler.tsx:188`
- `apps/shadcn-registry/src/lib/wallet-kit/account/aomi-backend-runtime.ts:254`

Problem:

The DB introduces signing policy, but the frontend wallet path does not carry
`signing_authorization`/7702 data. Wallet "read/write" capability is currently
derived from whether the wallet is live, not from the backend signing mode.

Fix checklist:

- [ ] Decide final API name: `signing_mode`, `signing_authorization`, or both
  with clear boundaries.
- [ ] Surface backend signing policy through `/api/account` or a dedicated
  account/wallet endpoint.
- [ ] Extend `WalletTxPayload` and `WalletTxCallPayload` to carry the required
  authorization fields.
- [ ] Preserve authorization fields during pending transaction hydration.
- [ ] Pass fields through simulation, fee injection, AA conversion, and
  `adapter.sendTransaction`.
- [ ] Update wallet-picker badges to distinguish "connected now" from
  "authorized for autonomous signing".
- [ ] Add tests proving a backend pending tx retains authorization data all the
  way to the adapter.

Acceptance checks:

- [ ] Backend signing mode appears in account/wallet API response.
- [ ] Frontend shows correct read/write/autonomous/human/denied state.
- [ ] 7702 authorization data is not dropped before wallet execution.
- [ ] A denied wallet cannot be used for signing.

## React and Runtime Findings

### RUNTIME-001: Control-Context Merge Regression

Severity: Blocker
Complexity: Large
Primary files:

- `packages/react/src/contexts/control-context.tsx`
- `packages/react/src/control/*.ts`
- `packages/react/src/runtime/aomi-runtime.tsx:21`

Problem:

The branch resurrected the old inline `ControlContextProvider` logic while the
extracted hooks in `packages/react/src/control/` are effectively dead code.
This dropped main's composition-root refactor and reintroduced deprecated
`setState` and `onControlStateChange` behavior.

Fix checklist:

- [x] Re-resolve the merge using `origin/main` control-context structure as the
  base.
- [x] Port only the BFF/thread-auth deltas onto the extracted hook structure.
- [x] Use `useApiKeyImpl`, `useByokImpl`, `useAuthEndpointsImpl`, and
  `usePerThreadControlImpl` from `ControlContextProvider`.
- [x] Delete duplicate inline implementations after parity tests pass.
- [x] Remove or intentionally keep compatibility shims with tests.

Acceptance checks:

- [x] `rg 'useApiKeyImpl|useByokImpl|useAuthEndpointsImpl|usePerThreadControlImpl'
  packages/react/src` shows real imports/usages, not declarations only.
- [x] Existing control-context tests pass.
- [x] New tests prove app platform and application id paths work.

### RUNTIME-002: Application/Platform Scoping Is Dropped

Severity: Blocker
Complexity: Medium
Primary files:

- `packages/react/src/runtime/aomi-runtime.tsx:21`
- `packages/react/src/control/auth-endpoints.ts:48`
- `packages/react/src/control/per-thread-control.ts:147`
- `packages/react/src/contexts/control-context.tsx:708`
- `packages/react/src/contexts/control-context.tsx:834`

Problem:

`AomiRuntimeProviderProps` no longer exposes `applicationId` or `appPlatforms`,
and the current control context calls `getApps` without platform filters and
`setModel` without application ID.

Fix checklist:

- [x] Restore `applicationId?: number | string | null`.
- [x] Restore `appPlatforms?: AomiPlatformFilter`.
- [x] Forward both props through `AomiRuntimeInner`.
- [x] Pass `platforms` to `getApps`.
- [x] Resolve selected app by `(name, applicationId)` descriptor, not name only.
- [x] Include normalized `applicationId` in every set-model and send path that
  reaches backend.

Acceptance checks:

- [x] Hosted app iframe with `application_id=42` uses app ID 42, not first app
  with same name.
- [x] Platform filter changes authorized app list.
- [x] Regression test covers duplicate app names across platforms.

### RUNTIME-003: New Sessions Miss User-State Listener

Severity: High
Complexity: Medium
Primary file: `packages/react/src/runtime/user-state-provider.tsx:580`

Problem:

The provider attaches `user_state_updated` listeners only to sessions that
exist during effect setup. Lazily created sessions are never wired back to
React user state.

Fix checklist:

- [ ] Add a `SessionManager` creation subscription or central session factory
  callback.
- [ ] Register the listener whenever a session is created.
- [ ] Unregister on provider unmount/session close.
- [ ] Add a test where the provider mounts before any session exists, then a
  session emits `user_state_updated`.

Acceptance checks:

- [ ] Lazily created session updates `useUser()`.
- [ ] No duplicate listeners after re-render.
- [ ] Closing sessions cleans up listeners.

### RUNTIME-004: Wallet Request Suppression Can Hide Blocking Requests

Deferred for this pass unless owner reopens scope. Follow-up scope note,
2026-07-03: `packages/react/src/handlers/wallet-handler.ts` is not changed by
`codex/merge-bff-betterauth` relative to `origin/main`.

Severity: High
Complexity: Medium
Primary file: `packages/react/src/handlers/wallet-handler.ts`

Problem:

Visible wallet requests filter out suppressed IDs, while the blocking flag uses
all requests. If resolve/reject fails and the backend re-emits the same ID, the
request can remain invisible while still blocking other work.

Fix checklist:

- [ ] On resolve/reject failure, clear suppression or make the request visible.
- [ ] Track suppression by request lifecycle, not just ID.
- [ ] Make blocking count use visible actionable requests, or expose a visible
  error state.
- [ ] Add tests for failed resolve followed by same-ID re-emit.

Acceptance checks:

- [ ] Failed resolve does not permanently hide a wallet request.
- [ ] UI blocking state matches visible pending work.

### RUNTIME-005: Runtime Provider Values Are Render-Unstable

Severity: Medium
Complexity: Medium
Primary files:

- `packages/react/src/contexts/ext-user-context.tsx:90`
- `packages/react/src/runtime/core.tsx:492`
- `packages/react/src/contexts/event-context.tsx:136`
- `packages/react/src/contexts/notification-context.tsx:123`

Problem:

Several hooks/providers allocate fresh objects inline. Consumers rerender more
often than needed, and memo dependencies are fragile.

Fix checklist:

- [ ] Memoize `useUser()` return value.
- [ ] Avoid using raw `useUser()` object as a broad dependency.
- [ ] Memoize event and notification context values.
- [ ] Add render-count regression tests around wallet-kit/runtime consumers if
  practical.

Acceptance checks:

- [ ] No behavior change in runtime tests.
- [ ] No broad consumer rerender on unrelated state update.

## Auth and Account Findings

### AUTH-001: Portal Auth DB Still Owns A Second Wallet Graph

Severity: High
Complexity: Large
Primary areas:

- Portal auth DB tables: `aomi_users`, `aomi_auth_identities`, `aomi_wallets`
- Backend account tables: `users`, `auth_providers`, `public_keys`
- Bridge path: `apps/portal/src/lib/aomi-account/canonical-session.ts`
- Account API path: `apps/portal/src/lib/aomi-account/session.ts`

Problem:

The linked account-model note was directionally right: the target account graph
is a single canonical account (`users.id`), linked credentials
(`auth_providers`), and operable keys (`public_keys`) with nullable
`public_keys.auth_provider_id` provenance. Recent `product-mono` commits moved
the backend toward that shape: `identity_wallets` is explicitly vestigial in
`20260701010000_account_model_consolidation.sql` and is dropped by
`20260701020000_account_model_contract.sql`.

The current portal branch did not complete that convergence. `@aomi-labs/auth`
still creates and reads a separate `aomi_*` graph in the BetterAuth database.
SIWE/provider linking writes `aomi_wallets`; `/api/aomi/account` returns
`aomi_wallets`; the BFF bearer path only mirrors the canonical user and a
`betterauth` provider row into the backend through `@aomi-labs/account`.
It does not mirror linked wallets into backend `public_keys`.

The resolved target assumes one Postgres database for BetterAuth tables and the
canonical account tables. The backend should not touch BetterAuth tables, but
portal is expected to have write permission because BetterAuth and account-link
UX live there. The issue is not "portal writes account state"; the issue is
"portal writes a second account graph."

Impact:

A wallet can appear linked in portal account management while the backend
account view and signing logic have no corresponding `public_keys` row. That
means wallet-aware backend behavior can fail or route as anonymous/denied even
though the portal UI says the account is linked. First BetterAuth SIWE adoption
can also mint a fresh backend user id instead of preserving an existing
wallet-owned backend UUID when the auth DB cannot see backend rows.

Implementation note, 2026-07-03:

AUTH-001 was implemented in `aomi` with the shared-Postgres architecture:
portal still owns BetterAuth/session UX, but durable account-link state now
writes the canonical `users` / `auth_providers` / `public_keys` graph. Focused
auth/account tests, wallet-picker tests, local CLI SIWE link/unlink E2E, and
the updated smoke script passed before handoff.

Fix checklist:

- [x] Make backend `users` / `auth_providers` / `public_keys` the account graph
      authority for wallets and provider provenance.
- [x] Remove `aomi_users`, `aomi_auth_identities`, and `aomi_wallets` as durable
      account tables unless a future pass proves a narrow non-authoritative cache
      is necessary.
- [x] Keep BetterAuth tables for login/session internals only.
- [x] Keep account/auth UX in portal, but have portal write the canonical
      `users` / `auth_providers` / `public_keys` tables directly in the shared
      database.
- [x] Move SIWE/provider wallet linking to write `public_keys` with nullable
      `auth_provider_id`.
- [x] Use `better_auth` as the canonical provider spelling unless backend has a
      strong reason to keep `betterauth`; if backend currently requires
      `betterauth`, treat that as a temporary compatibility shim.
- [x] On first BetterAuth SIWE adoption, preserve an existing backend `users.id`
      if the wallet already has a `public_keys` owner. Same wallet plus same
      human should not get a new account because the login mechanism changed.
- [x] Normalize family names at the storage boundary (`evm` / `svm` in
      `public_keys.chain_type`; convert legacy `ethereum` only at wire edges).
- [x] Normalize address casing once: EVM lower-case for identity, SVM
      case-preserving.
- [x] Add tests for SIWE first login, link, list, relogin, unlink, and backend
      `/api/account` plus `/api/account/wallets`.

Resolved design notes:

- Portal remains the place where BetterAuth, SIWE login, provider linking,
  account UI, and wallet-link UX live.
- Backend remains mostly verify-only for auth and focused on the work/runtime
  side. It reads canonical account rows and validates `AccountBearer`; it should
  not become the owner of BetterAuth session logic.
- `/api/aomi/account` should remain a portal/BFF route, but should become a view
  over the canonical account graph, not a view over `aomi_*`.
- Provider-derived keys should carry provenance:
  `public_keys.auth_provider_id -> auth_providers.id`.
- SIWE should create an `auth_providers(provider='siwe', subject=...)` row and
  the proved wallet's `public_keys.auth_provider_id` should point at that SIWE
  row. SIWE is an auth credential, not only a wallet row.
- Manual/imported/non-authenticated keys should use `auth_provider_id = null`.
- Privy/Para embedded keys should point at the Privy/Para provider row.
- External wallets linked while a Privy/Para session is active but proven by
  SIWE should point at the SIWE provider row, because provenance should mean
  "what attested this key," not "which session happened to be active."
- Current dev/local data does not need preservation; do not over-design around
  local migration conflicts. The durable invariant to preserve is same wallet
  plus same human means same canonical `users.id`.
- Do not add a long-lived wallet sync layer as the preferred fix. Clean
  convergence means one durable graph, not two tables plus translation.
- Unlink should be provenance-aware:
  SIWE/external unlink revokes the `public_keys` row and, when safe, the SIWE
  provider row; Privy/Para unlink revokes the provider row and provider-derived
  keys; no unlink path should remove the last viable login factor without a
  replacement.

Acceptance checks:

- [x] Wallet linked through portal appears in backend `/api/account`.
- [x] Wallet linked through portal appears in backend `/api/account/wallets`
      with the expected `auth_provider_id` provenance when provider-derived.
- [x] Wallet unlinked through portal disappears from the backend account view or
      is explicitly marked revoked by the backend authority.
- [x] CLI/UI no longer need fallback logic for two durable wallet lists.
- [x] First BetterAuth SIWE adoption keeps the existing wallet-owned backend
      UUID when one exists.

### AUTH-002: Identity Rebind Can Orphan Backend Rows

Severity: High
Complexity: Medium
Primary file: `packages/account/src/account-graph.ts:179`

Problem:

`rebindIdentityToCanonicalUser` moves an auth provider row to the BetterAuth
canonical user ID but does not migrate rows keyed to the previous backend UUID,
such as threads, secrets, or BYOK.

Partial implementation note, 2026-07-03:

AUTH-001 now resolves first SIWE BetterAuth adoption to an existing
wallet-owned backend `users.id`, so legacy user-owned rows stay reachable by
preserving the UUID. The broader migration/row-count audit for non-preserved
rebind paths remains open.

Fix checklist:

- [x] Define whether first SIWE adoption should keep the legacy backend UUID or
  migrate owned data.
- [x] If preserving legacy data, resolve canonical ID to the existing backend
  user instead of reassigning only auth provider.
- [ ] If migrating, do it in one transaction across all owned tables.
- [ ] Add row-count and ownership tests for threads, secrets, BYOK, wallets, and
  app grants.

Acceptance checks:

- [x] Legacy wallet-keyed user keeps threads after BetterAuth adoption.
- [ ] No owned rows remain under unreachable previous UUID.

### AUTH-003: Smoke Script Uses Deleted Endpoints

Severity: Medium
Complexity: Small
Primary file: `scripts/smoke-auth-stack.mjs`

Problem:

The smoke script still calls `/api/bff/auth/siwe/*` and
`/api/bff/auth/token`, which the goal explicitly removed.

Fix checklist:

- [x] Replace SIWE nonce/verify calls with `/api/auth/siwe/{nonce,verify}`.
- [x] Replace bearer route with `/api/aomi/account-bearer`.
- [x] Update response parsing for BetterAuth/account bearer shapes.
- [ ] Add negative checks that legacy endpoints are gone.
- [ ] Update docs that reference this smoke path.

Acceptance checks:

- [x] Smoke script passes against current portal.
- [ ] Smoke script fails loudly if legacy endpoints reappear.

## Dependency Audit

### DEP-001: pnpm audit Reports Critical and High Advisories

Severity: High
Complexity: Medium
Command run:

```sh
pnpm audit --audit-level moderate
pnpm audit --json --audit-level moderate
```

Summary:

- 178 total advisories.
- 4 critical.
- 65 high.
- 97 moderate.
- 12 low in tabular audit output; JSON summary grouped low differently.

Critical advisories observed:

- `ses`: possible arbitrary exfiltration/execution.
- `protobufjs`: arbitrary code execution.
- `vitest`: Vitest UI server file read/execution.
- `shell-quote`: newline escaping issue.

High advisories observed include:

- `ses`
- `node-forge`
- `preact`
- `hono`
- `next`
- `minimatch`
- `rollup`

Most paths appear to come through wallet SDK transitive chains
(`@getpara/react-sdk`, WalletConnect/Reown/wagmi, Cosmos connectors), plus dev
tooling.

Fix checklist:

- [ ] Run `pnpm audit --json` and save a concise advisory inventory in the PR.
- [ ] Run `pnpm why ses protobufjs shell-quote node-forge hono next rollup`.
- [ ] Upgrade direct dependencies where available.
- [ ] Add `pnpm.overrides` only after confirming compatibility.
- [ ] Decide whether vulnerable Cosmos/React Native connector paths ship to
  production bundles.
- [ ] Upgrade Vitest even if UI server is dev-only.
- [ ] Re-run build, lint, tests, and audit after upgrades.

Acceptance checks:

- [ ] No critical advisories remain, or every remaining critical is documented
  as non-shipping with owner approval.
- [ ] No high advisory touches a production request/auth/signing path without a
  mitigation.

## Repo Hygiene Findings

### HYGIENE-001: Generated dist Artifacts Are Tracked/Dirty

Severity: High
Complexity: Small
Primary paths:

- `packages/react/dist/index.cjs`
- `packages/react/dist/index.js`
- tracked dist under `packages/client/dist`, `packages/react/dist`, and
  `apps/shadcn-registry/dist`

Fix checklist:

- [ ] Confirm whether package publishing requires committed `dist`.
- [ ] If not, `git rm -r --cached` generated dist paths that are gitignored.
- [ ] If yes, regenerate after all source fixes and commit as a separate
  mechanical step.
- [ ] Update PR description to explain artifact policy.

Acceptance checks:

- [ ] Source review diff is not polluted by stale generated output.
- [ ] `pnpm run build:lib` regenerates cleanly.

### HYGIENE-002: Portal Backend URL Fallback Changed

Severity: Medium
Complexity: Small
Primary file: `apps/portal/next.config.ts:45`

Problem:

Portal public backend URL now falls back to `http://127.0.0.1:8080`. The shared
proxy still has production/staging defaults, but browser-facing env defaults
can be wrong if Vercel env is missing.

Fix checklist:

- [ ] Confirm `NEXT_PUBLIC_BACKEND_URL` and `BACKEND_URL` are set in every Vercel
  environment.
- [ ] Restore Vercel-aware defaults if any environment is missing them.
- [ ] Add an env validation or deployment checklist.

Acceptance checks:

- [ ] Production portal cannot bake `127.0.0.1:8080` into browser code.

### HYGIENE-003: Dependency and Version Drift

Severity: Medium
Complexity: Small
Reported items to verify/fix:

- [ ] `apps/shadcn-registry` version downgrade `1.2.21` to `1.2.20`.
- [ ] `pg` version mismatch between `packages/auth` and `packages/account`.
- [ ] Unused `bs58` in shadcn-registry.
- [ ] `pnpm-workspace.yaml` `allowBuilds` key ignored by pnpm.

Acceptance checks:

- [ ] Single intended `pg` version in lockfile.
- [ ] Package versions move monotonically or include a reason.
- [ ] No unused dependency remains.

### HYGIENE-004: Planning Specs and Scratch Files

Severity: Medium
Complexity: Small

Reported cleanup candidates:

- [ ] `specs/AUTH-STACK-REVIEW.md`
- [ ] `specs/MERGE-BFF-BETTERAUTH-FIXES.md`
- [ ] `specs/WALLET-KIT-CLEANUP.md`
- [ ] `specs/WALLET-KIT-PR-WALKTHROUGH.md`
- [ ] `specs/mcp-design.md`
- [ ] `specs/STATE.md` diary content
- [ ] `tmp-v2-table.md`
- [ ] stale `apps/registry/` references in docs/config

Acceptance checks:

- [ ] PR contains durable docs only.
- [ ] Walkthrough material becomes PR description, not committed scratch.

### HYGIENE-005: Logs, Dead Aliases, and Small Cleanups

Severity: Low
Complexity: Small

Reported fix-along items:

- [ ] Remove noisy `console.log`/`console.debug` from runtime hot paths.
- [ ] Drop dead `useAomiAuthAdapter` alias after last portal consumer is moved.
- [ ] Remove dead `WalletLink` type, `ensureAccount`, and always-throw archive
  stubs if unused.
- [ ] De-duplicate URL joiners and HTTP status helpers.
- [ ] Remove dead `aomi_user_id` claim branch if unreachable.
- [ ] Throttle or sanitize SIWE failure logging.

Acceptance checks:

- [ ] Runtime logs are intentional and behind logger/debug controls.
- [ ] `rg` confirms removed aliases/stubs have no consumers.

### HYGIENE-006: Persistent Goal Needs Updating

Severity: Low
Complexity: Small
Primary file: `GOAL.md`

Fix checklist:

- [ ] Update `GOAL.md` after this review lands.
- [ ] Keep only current blockers and completed verification.
- [ ] Remove stale "local dev stack is running" claims when no longer true.

## Deployment Checklist

Before merge:

- [x] Current-pass security items fixed: `SEC-002`, `SEC-004`, `SEC-005`.
- [ ] Owner-deferred branch-related items have explicit owner/date and disabled
  or unsupported surfaces before merge: `SEC-001`, `XREPO-001`, `XREPO-004`.
- [ ] Out-of-scope deferrals are acknowledged separately:
  pre-existing `SEC-003` and non-branch `RUNTIME-004`.
- [ ] `XREPO-002` and `XREPO-003` DB migration PR opened and reviewed.
- [x] `RUNTIME-001` and `RUNTIME-002` fixed.
- [ ] Smoke script updated and passing.
- [ ] Dependency audit triaged.
- [ ] Generated artifacts policy resolved.

Before deploy:

- [ ] DB snapshot captured.
- [ ] Migration replay passed on empty DB.
- [ ] Migration replay passed on prod/staging clone.
- [ ] Product backend route manifest matches frontend client routes.
- [ ] Portal env checklist reviewed:
  `BETTER_AUTH_SECRET`, `DATABASE_URL`, `AOMI_ACCOUNT_DATABASE_URL`,
  `BETTER_AUTH_URL`, `AOMI_PORTAL_BASE_URL`, `AOMI_TRUSTED_ORIGINS`,
  `PORTAL_SERVICE_PRIVATE_KEY`, `NEXT_PUBLIC_BACKEND_URL`, `BACKEND_URL`,
  `AOMI_BE_URL`, `AOMI_AUTH_TOKEN`.
- [ ] BFF key/kid matches backend trust config for target environment.
- [ ] Legacy BFF auth routes return 404.
- [ ] MCP route is either disabled or authenticated.

Suggested deploy order:

1. `db-master` migrations.
2. `product-mono` backend.
3. `aomi` portal/base/landing/client/widget updates.

## Verification Run During This Review

Commands/checks run locally:

- [x] Read `GOAL.md`.
- [x] Read attached prior report.
- [x] Inspected local git status for `aomi`.
- [x] Confirmed active local branch for `product-mono`:
  `codex/auth-stack-dbthread-unification`.
- [x] Confirmed active local branch/state for `db-master`: `main` with 48
  untracked migrations.
- [x] Compared active `aomi` and `product-mono` branches against `origin/main`
  for checklist file ownership.
- [x] Confirmed `RUNTIME-004` file is not changed by the active `aomi` branch.
- [x] Confirmed `SEC-003` credential is already present in `product-mono`
  `origin/main`.
- [x] Searched local `aomi`, `product-mono`, and `db-master` for reported
  issue evidence.
- [x] Ran a tracked/untracked secret-pattern scan over `aomi`.
- [x] Ran a tracked/untracked secret-pattern scan over `product-mono`.
- [x] Confirmed `aomi` local `.env*.local` secrets are ignored.
- [x] Confirmed `product-mono` hardcoded hosted DB credential.
- [x] Ran `pnpm audit --audit-level moderate`.
- [x] Ran `pnpm audit --json --audit-level moderate` summary.
- [x] Used three explorer subagents for security, runtime/wallet, and sibling
  repo validation.

Not run:

- [ ] Full `pnpm run lint`.
- [ ] Full `pnpm run build:lib`.
- [ ] Full app builds.
- [ ] Full vitest suite.
- [ ] Product Rust tests.
- [ ] DB migration replay.

The prior report claimed those broad checks were green, but this review did not
re-run them except for dependency audit and static scans.
