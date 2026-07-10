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
- 2026-07-06 Vercel clean-deploy follow-up: fixed the current
  `codex/merge-bff-betterauth` Vercel failure by making the pnpm build-script
  approval policy deterministic for clean installs. Added the missing native
  dependency build approvals to `onlyBuiltDependencies` and mirrored them as
  boolean `allowBuilds` entries for pnpm 11. Verified `pnpm --filter portal
build`, `CI=true npx -y pnpm@10.28.0 install --frozen-lockfile`, and
  `CI=true npx -y pnpm@10.28.0 --filter portal build`. Pushed commit
  `33ecda7f`; GitHub/Vercel statuses for `base`, `chat-portal`,
  `landing-page`, and `tg-mini-app` all completed successfully.
- 2026-07-06 OpenAPI CI follow-up: refreshed the checked-in backend OpenAPI
  fixture and generated client route manifest from
  `https://api-staging.aomi.dev/api/openapi.json`, adding the provider grant
  revoke route and Para auth begin/callback routes that staging exposes.
  Verified the live OpenAPI contract against staging plus the full
  `build-and-lint` workflow gates locally with pinned `pnpm@10.28.0`.
- 2026-07-07 widget proportion polish: tuned the shadcn registry widget's
  global small text scale and chat rail proportions so sidebar, trace,
  composer, wallet/auth controls, and message text read closer to standard chat
  UI proportions without a visual redesign. Verified registry build with pinned
  `pnpm@10.28.0` and targeted ESLint on touched TSX files.
- 2026-07-07 assistant turn phase polish: split chat sending into
  `submitting` vs `working` phases so the UI keeps the blinking dot only while
  the backend request is still pending, switches to a minimal Working shimmer
  after the backend accepts processing, and buffers provisional pre-tool text
  out of the final answer area. Verified focused React chat tests, React package
  build, registry build, and targeted ESLint with pinned `pnpm@10.28.0`.
- 2026-07-07 working trace interpreter follow-up: replaced icon-only trace
  guessing with a typed registry plus deterministic interpreter for web search,
  skill activation, chain context, native/token balances, token lookup,
  ERC-20/Aerodrome calls, staged transactions, simulations, and wallet approval.
  Trace rows now show concise interpreted titles with up to three under-label
  chips and `+N more` overflow while raw args/results remain expandable.
  Verified focused interpreter Vitest coverage, targeted ESLint, and registry
  build with pinned `pnpm@10.28.0`.
- 2026-07-07 trace chip cleanup: simplified skill chips to activated skill names
  only with capitalization, removed gas-price chips from network checks, and
  swapped network color dots for the existing chain logo components in trace
  chips. Verified focused interpreter Vitest coverage, targeted ESLint, and
  registry build with pinned `pnpm@10.28.0`.
- 2026-07-07 trace interpreter hardcode cleanup: removed the non-scalable
  contract/token/pool registry, protocol-specific selector handling, route
  reconstruction, and token-decimal formatting from working-trace chips. The
  interpreter now keeps only generic ERC-20 selector decoding plus structural
  result parsing, and falls back to the model-provided tool label for
  protocol-specific calls. Verified focused interpreter Vitest coverage,
  targeted ESLint, and registry build with pinned `pnpm@10.28.0`.
- 2026-07-07 trace chip polish follow-up: resolved numeric chain ids and
  lowercase network strings through shared `@aomi-labs/react` chain metadata so
  trace chips show names/logos such as Base instead of `chain 8453`, capitalized
  success/failure/status chips, and changed chip overflow to show four facts
  plus a `+N more` chip. Verified focused interpreter Vitest coverage, targeted
  ESLint, and registry build with pinned `pnpm@10.28.0`.
- 2026-07-07 trace chip semantics follow-up: replaced block `#` chips with a
  block icon plus plain number, removed nonce from native balance chips, changed
  custom/protocol EVM calls to show structural from/to address chips instead of
  selector/success chips, capitalized staged action chips, and added tx/gas
  icons for staged, simulated, and committed transaction counts. Verified
  focused interpreter Vitest coverage, targeted ESLint, and registry build with
  pinned `pnpm@10.28.0`.
- 2026-07-07 token/allowance chip polish: standardized token-related chips so
  token resolution, token balance, metadata, and allowance rows put the resolved
  chain chip first, use a generic token icon for symbols, use a user icon for
  wallet owner addresses, and omit noisy contract-address/count/value chips
  where they do not help scanning. Verified focused interpreter Vitest coverage,
  targeted ESLint, and registry build with pinned `pnpm@10.28.0`.
- 2026-07-07 token-miss chip cleanup: removed the redundant `not found` badge
  from unresolved token rows so the trace keeps only the queried token symbol.
  Verified focused interpreter Vitest coverage, targeted ESLint, and registry
  build with pinned `pnpm@10.28.0`.
- 2026-07-07 staged action chip icons: added deterministic icons for staged
  approve, swap, transfer/send, bridge, burn, mint/claim, and
  deposit/withdraw-style action chips, with a generic staged fallback for
  custom actions. Verified focused interpreter Vitest coverage, targeted
  ESLint, and registry build with pinned `pnpm@10.28.0`.
- 2026-07-08 thread refresh persistence: added widget-local active-thread
  persistence with vendor-scoped storage keys, restored valid materialized
  threads after authenticated list load, ignored empty local drafts, and fell
  back from stale stored thread ids to the newest valid regular thread.
  Verified focused React thread tests, React package build, targeted ESLint,
  and registry build.
- 2026-07-07 tool interpreter architecture planning: drafted
  `specs/TOOL-INTERPRETER-PLAN.md` from `tmp-examples.md`, current frontend
  trace behavior, and backend operation-shape exploration. The plan separates
  unwrap, normalization, family parsing, operation facts, and presentation
  rules while preserving the current `interpretToolStep()` UI contract.
- 2026-07-07 tool interpreter architecture implementation: split the shadcn
  registry interpreter into the planned unwrap, normalization, ordered pipeline,
  simple/EVM family parsers, and descriptor/chip presentation modules while
  keeping the public `interpretToolStep()` API and current EVM golden behavior.
  SVM remains reserved for the first real payload. Updated registry packaging
  so installed assistant-thread components include the interpreter module tree.
  Verified focused interpreter Vitest coverage, targeted ESLint, and registry
  build with pinned `pnpm@10.28.0`; app-wide typecheck still reports unrelated
  wallet-kit account runtime test fixture type drift.
- 2026-07-07 trace chain-chip tuning: made EVM-family trace rows show a chain
  chip whenever an explicit chain field is present, including generic
  protocol-specific calls such as quotes/pool checks, token lookup misses,
  native balance payloads that carry chain, ERC-20 approve/transfer calls, and
  pending wallet approval/commit rows. Verified focused interpreter Vitest
  coverage, targeted ESLint, Prettier, and registry build with pinned
  `pnpm@10.28.0`.
- 2026-07-07 trace status chip tuning: made status/outcome chips render last
  regardless of descriptor order and replaced status color dots with neutral
  lucide icons for queued/pending, success, failed, and revoked states. Verified
  focused interpreter Vitest coverage, targeted ESLint, Prettier, and registry
  build with pinned `pnpm@10.28.0`.
- 2026-07-07 frontend submitting fallback: added a React runtime grace timer so
  slow `/api/chat` acknowledgements keep the black submitting dot only briefly
  before promoting the visible turn to the existing Working shimmer, while
  clearing back to idle on synchronous completion or send failure. Verified
  focused React chat tests, targeted ESLint, and React package build with
  pinned `pnpm@10.28.0`.
- 2026-07-07 working shimmer timing polish: tuned the Working-label shimmer to
  use less off-screen travel, a wider highlight band, and a steadier linear
  sweep so it spends less time looking static and no longer flashes through as
  quickly. Rebuilt the shadcn registry, refreshed the landing registry mirror,
  and verified CSS formatting with pinned `pnpm@10.28.0`.
- 2026-07-07 trace icon tuning: switched approval/permit action chips and
  ERC-20 approve row icons to the clearer pencil-write icon while keeping
  allowance on the pen-line icon, and gave skill chips a distinct puzzle-piece
  capability icon instead of reusing the Activate skill sparkle. Verified
  focused interpreter Vitest coverage, targeted ESLint, Prettier, and registry
  build with pinned `pnpm@10.28.0`.
- 2026-07-07 native/staged/error chip polish: made native ETH balance chips
  render with a compact amount (for example `0.00087`), the Ethereum logo, and
  no trailing `ETH` text while leaving ERC-20 amount chips unchanged; staged
  transaction rows now show `1 tx` / `N txs`; failed tool calls now show only
  the `Failed` badge instead of the backend error code chip. Verified focused
  interpreter Vitest coverage, targeted ESLint, Prettier, and registry build
  with pinned `pnpm@10.28.0`.
- 2026-07-07 decimals chip polish: collapsed token decimals rows from separate
  `decimals` and value chips into a single numeric metadata chip such as
  `6 decimals` with a hash icon. Verified focused interpreter Vitest coverage,
  targeted ESLint, Prettier, and registry build with pinned `pnpm@10.28.0`.
- 2026-07-07 assistant footer icon polish: shrank the assistant response copy
  and rerun glyphs by half while keeping their existing button hit targets.
- 2026-07-09 CLI skills review completion: finished the remaining
  `specs/CLI-SKILLS-REVIEW-PLAN.md` items. Canonicalized the CLI default BFF
  URL to `https://chat.aomi.dev`, added `--json`/`--verbose` ergonomics, made
  account summary vs link-graph output distinct, hid local state path noise by
  default, moved deprecated embedded-provider flags out of root help's primary
  option list, made empty chat responses exit non-zero, and fixed wallet
  label/relink semantics so wallet labels live on wallet metadata while relinks
  return no-op. Refreshed both `aomi-transact` skill mirrors for JSON/verbose
  docs and reran the CLI surface verifier. Verified with auth/client focused
  Vitest suites, auth/root typechecks, client build, official SIWE auth smoke,
  built-CLI native SIWE with a private key, parseable JSON account/wallet/tx/
  app/chain output, state permissions, live wallet rename/relink checks, and a
  real local Anvil transaction submission through `aomi tx sign`.
  Verified targeted ESLint, Prettier, and registry build with pinned
  `pnpm@10.28.0`.
- 2026-07-07 final-answer streaming fix: buffered no-tool assistant text while
  the turn is still running because a later tool call can move that text into
  the Working trace, then fake-streamed the settled final answer after completion
  using the same path as post-tool answers. Fixed runtime turn merging so
  tool-bearing assistant fragments still fold into one Working-trace turn, but
  contiguous text-only assistant snapshots collapse to the latest final answer
  instead of being glued together; kept a conservative exact duplicate collapse
  for single-fragment `answeranswer` content, and retained a `lastCompletedAt`
  completion marker so late-mounted final answers still fake-stream. Cleaned up
  the intermediate UI-side fuzzy de-duping/debug scaffold so text normalization
  is owned by the runtime. Regenerated the shadcn registry payloads and landing
  public mirror; verified targeted ESLint, focused runtime tests, React package
  build, widget registry build, and generated JSON guards with pinned
  `pnpm@10.28.0`.
- 2026-07-08 empty new-chat no-op: guarded the React thread-list adapter so
  selecting New Chat from the current empty local draft leaves the thread id and
  `threadViewKey` unchanged instead of remounting/refreshing another blank
  chat. Added focused adapter regression coverage and verified with the focused
  React thread Vitest file, targeted ESLint, and React package build.
- 2026-07-09 CLI skills review phase 1: fixed expected CLI error handling so
  `fatal()` exits before citty can print stacks while Vitest keeps the strict
  `CliExit` hook; switched normal command execution to `runCommand` under the
  CLI's own catch path so HTTP 401s and missing transaction errors stay
  one-line. Added upfront EVM/Solana private-key validation for `wallet set`,
  CLI flags, and env vars; hardened CLI state storage to `0700` dirs and
  `0600` files; made logout clear stored EVM/Solana signing keys; and stopped
  persisting one-shot `--private-key` / env secrets. Verified focused CLI
  Vitest coverage, client package build, and real `dist/cli.js` smokes for bad
  provider, bad private key, missing tx, 401 chat, and no one-shot key leak.
- 2026-07-09 CLI skills review phase 0: refreshed `aomi-transact` skill docs
  and the plugin mirror against the real v0.1.42 CLI help surface. Removed
  nonexistent `wallet login` guidance, corrected app examples (`zerox`,
  `polymarket_rewards`, default-app Lido/Uniswap flows), documented the full
  account link/unlink/rename/update/delete/session-switch surface, widened the
  skill network allowlist for `chat.aomi.dev`, staging, and local dev, and
  added `scripts/verify-cli-surface.mjs` to catch command/app drift. The
  docs/help check passes; live `localhost:3000` app comparison currently fails
  because that backend exposes a stale registry, which the new check reports.
- 2026-07-10 main rebase integration: rebased `feat/working-trace-a` onto
  `origin/main`, reconciled the newer thread wire format and workspace build
  policy, regenerated client/React/registry artifacts, and migrated Smither's
  rollback flow to the current deployment-record/promote API. Updated stale UI
  timing and route assertions, aligned the local auth bootstrap with the
  consolidated account package, and added coverage for numeric/string
  `last_active_at` normalization. Verified the frozen install, lint, root and
  app typechecks, all package/app Vitest suites, package builds, and production
  builds for landing, base, portal, Aomi Build, Telegram, and Smither; the user
  also confirmed the integrated UI works in manual testing.
- 2026-07-10 wallet approval popup recovery: traced the missing web-wallet
  prompt to the local backend failing transaction-event persistence because
  `user_transactions.application_id` was absent. The local stack bootstrap had
  preferred the lagging `db-master` migrations over the migrations paired with
  the running `product-mono` backend. Switched the bootstrap source order,
  added attribution-column/index convergence checks, applied the missing July 7
  migrations to `aomi_local`, and verified in the user's signed-in Chrome flow
  that a fresh 1-wei Base request opens Rabby approval without broadcasting it.
- 2026-07-10 message edit/rerun recovery: implemented the assistant-ui external
  runtime's missing edit and reload capabilities, rewound visible history to
  the selected user turn, and projected new backend turns in place of superseded
  responses. Persisted compact raw-message branch ranges so the selected edited
  path survives reload without storing message content locally. Added focused
  edit, rerun, and remount regression coverage; verified React tests, targeted
  ESLint, root and portal typechecks, React/registry builds, and signed-in Chrome
  E2E for rerun, editing FIRST to SECOND/THIRD, and post-edit page refresh with
  no new runtime-capability errors.
