# Auth BFF BetterAuth Cleanup Goal

## BFF Sentry Observability

Current session goal: **LOCAL IMPLEMENTATION AND REVIEW FIXES COMPLETE;
EXTERNAL ROLLOUT PENDING 2026-07-30** — the approved server-only Sentry observability design in
`docs/topics/bff/facts/sentry-observability.md` is implemented and locally
verified for both Portal and Aomi Build, including the shared
three-layer identify/classify/route pipeline, typed Account/Deploy observers,
behavior-preserving ownership boundaries, controlled staging smoke routes, and
automated verification. The review follow-up made the pipeline and async
observer seams non-throwing, restored existing HTTP/JSON-RPC/silent-degrade
contracts, added a safe production fallback when Sentry is unavailable, and
removed all Smither/schema changes. The final review restored the two-read
Build resume fallback, aligned artifact-degrade telemetry with its 404/409
responses, and closed the remaining GitHub/supervisor response-contract
drift. External Sentry/Vercel/dashboard
configuration and live staging smoke verification remain unperformed and
require separate authorization.

## Aomi Build Control Plane Performance

- Replaced the deployments page's per-source history fan-out with one
  keyset-paginated manager projection feed.
- Added a shell-level TanStack Query cache so Projects and Deployments retain
  data across tab remounts instead of loading from scratch.
- Scoped project and deployment cache keys by GitHub login and clear the cache
  on sign-out to prevent one account from reusing another account's data.
- Projects remain fresh for 60 seconds, deployment history for 15 seconds, SDK
  status for 5 minutes, and inactive entries remain cached for 15 minutes.
- Kept backend endpoint contracts unchanged; the new global feed belongs to
  manager and the Aomi Build BFF relays it.

Current session goal: **IMPLEMENTED; LIVE E2E IN PROGRESS 2026-07-22** — implement and verify
`specs/WIDGET-AUTH-INTEGRATION-PLAN.md` across `aomi`, `db-master`, and
`product-mono`, including tenant-scoped provider identities, the atomic
canonical-user resolver, origin-bound widget sessions, generic Portal/account
routes, the published `AomiWidget` API, and the separate-origin consumer.

2026-07-13 follow-up: staging and production now use separate Supabase
databases. Local schema convergence applies the backend's forward drop instead
of recreating the retired `bff_cli_device_sessions` / `bff_cli_sessions`
tables; fresh databases also finish replay with that drop.

2026-07-26 follow-up: the hosted topology is explicitly limited to staging
`cmwkmjpfbffmdiluvgtu` and production `akejwtxsjvbexutsfhkn`; the public
architecture guide now names both refs so a legacy third target cannot be
mistaken for another supported environment.

Progress:

- 2026-08-02 notification presentation preview: moved the shared notification
  toast to a macOS-style upper-right stack below the chat header, added Aomi
  title/body hierarchy and custom blue line-art notice, success, error, and
  wallet SVGs, and verified the live Portal layout in dark mode. Wallet
  transaction requests now use the wallet presentation instead of a generic
  notice. Internal `/api/system` acknowledgement records are filtered before
  they reach chat, persisted system transcript records stay hidden, and live
  wallet connection plus system notice/error events route through the
  notification model; payment-required messages retain the dedicated blocking
  gate. Non-blocking notification banners dismiss after six seconds by default
  and remain manually dismissible.

- 2026-07-31 Portal thread-history recovery: decoupled canonical account
  history from wallet connectivity, so a signed-in user can load and retain
  their threads with no wallet attached. Account identity changes remount the
  runtime to prevent one signed-in account from retaining another account's
  in-memory thread list.

- 2026-07-30 BFF Sentry review fixes: made identify/classify/route defensive
  end to end, normalized invalid response statuses and context, absorbed async
  observer rejections, reordered Build recovery before telemetry, and removed
  telemetry-only orchestration dependencies. Restored pre-existing Deploy,
  Account proxy/token, device/provider auth, MCP, GitHub cookie, and Build
  fallback contracts. Removed the Smither observer, result field, generated
  declaration changes, package bump, and database-shape impact entirely.

- 2026-07-29 integrations consolidation: moved the functional Telegram bot
  configuration from Operate into Integrations, retained Discord as an explicit
  coming-soon integration, and redirected the retired Bots route. Verified the
  focused bot UI regression, Build lint, and Build type-check.

- 2026-07-27 hosted account-pool hardening: traced recurring Settings auth
  failures to aggregate Supabase session exhaustion across two backend and two
  manager processes plus independently warm Vercel functions. Portal now
  normalizes a Supabase session-pooler URL to transaction mode on Vercel while
  retaining a one-client, short-idle local pool; paired backend deployment
  work splits and verifies the fleet-wide session budget.
- 2026-07-27 Build layout: standardized all twelve primary pages on responsive gutters and PT Serif titles paired with their navigation icons.
- 2026-07-27 Build project membership: the Projects index now treats GitHub
  source records as internal import/ownership metadata and only surfaces
  sources that contain at least one Aomi app, removing historical repositories
  that were bound to a platform but never became Build projects.
- 2026-07-27 cross-platform project discovery: the Projects index now uses the
  backend's platform-agnostic, GitHub-user-scoped source list instead of
  silently defaulting to `community`, and project links preserve each source's
  bound platform for detail reads.

- 2026-07-27 deployment-history correctness: the project History view now
  loads the deployment-history API and merges it with the promotion log, so a
  successfully deployed/live app remains visible even when its append-only
  promotion records are empty. Promotions continue to use the activation log.

- 2026-07-27 Shared chat welcome title: replaced the Portal and Landing
  one-off catchphrases with the shared “What should happen on-chain?” default
  and styled it with the same regular PT Serif display face used by Aomi Build
  page titles.

- 2026-07-27 Aomi Build CLI auth completion: replaced the localhost callback's
  raw inline HTML with a redirect to a branded Build completion page based on
  the existing Portal device-auth surface. The hosted page receives only a
  coarse completion status; OAuth codes and state remain confined to the
  loopback callback and CLI exchange.
- 2026-07-27 Build deploy-platform configuration: reduced the BFF deploy
  admission allowlist to one server-only source, `APP_DEPLOY_PLATFORMS`, and
  removed the singular and `NEXT_PUBLIC_*` compatibility paths so Vercel
  configuration cannot silently diverge.

- 2026-07-27 Para ACL mode recovery: confirmed the reported staging Para EVM
  row is user-controlled (`provider_managed = false`) and that the backend
  permits `client_auto` without a delegated grant. Removed the frontend's
  incorrect self-custody-only gate so Para can select “Accept transactions”;
  `Auto` still correctly requires a live delegation grant and `Locked` remains
  available. Added a regression covering all three availability states and the
  complete challenge, Para signature, commit, and refresh path.

- 2026-07-26 usage-log model-key attribution: normalized the manager's safe
  model-key metadata into the deploy client and rendered a compact key
  label/prefix badge beside funded usage events in Aomi Build Logs. Added
  client and UI regressions, patch-bumped `@aomi-labs/deploy` to `0.2.4`, and
  verified focused tests, package build/pack, Build lint/typecheck, and the
  production Build compile. Refreshed the staging backend route contract after
  three account endpoints shipped and removed the unreliable external
  coordination workflow from frontend CI.

- 2026-07-26 staging Portal account-auth recovery: traced the Settings
  `widget_auth_failed` response to Vercel Preview using the production Supabase
  session pool, where parallel BetterAuth/account functions exhausted the
  15-client cap. Restored global Preview to the canonical staging branch using
  its transaction-pool URL, rebuilt merged `main`, and confirmed concurrent
  session/account probes with no 5xx or pool-exhaustion logs. Settings now
  translates widget-auth and unknown structured transport failures into calm,
  actionable copy instead of rendering raw JSON.
- 2026-07-27 TypeScript cleanup and release validation: decomposed the Portal
  Packages overlay into its catalog data, catalog-loading hook, package row,
  and modal orchestration so every logic file remains under 500 lines without
  changing the UI or API boundary. Split the 740-line dev theme audit into a
  specimen surface and contrast table, removed avoidable assertions, and kept
  its measured token behavior intact. Verified focused lint/typecheck/tests,
  all repository CI commands, full Portal tests, and production builds for
  Portal, Landing, and Aomi Build; the Portal build used mock-safe local auth
  and database values only.

- 2026-07-27 Light/dark design-token sweep: fixed a dark-mode collision where
  `--aomi-surface-2`, `--aomi-raised` and `--aomi-border` all resolved to
  `#27272a`, rendering every divider, table rule, meter track and icon-button
  fill at 1.00:1 — the same collision existed independently in `apps/build`.
  Re-laid both dark ramps as six distinct steps, split `--aomi-success` per
  theme, un-collided light's `--aomi-hover` from `--aomi-surface-2`, removed a
  duplicate `--aomi-ring` that was overriding the sky focus ring with grey, and
  made `.dark` re-declare its derived `color-mix()` tokens (they only worked
  because `.dark` sits on `<html>`) while adding a `.light` scope so either
  theme can be applied to a subtree. Added a dev-only `/dev/theme-audit` harness
  that renders every redesigned surface in both themes from static fixtures and
  measures 21 contrast pairs: 9 hard failures down to 4, all light-mode and
  intentional. Left as design calls: the light accent is 3.71:1 as text (AA
  needs 4.5), and `--aomi-warning` is an unreferenced dead token.

- 2026-07-27 Build title typography and Packages spacing: loaded the same PT
  Serif display face used by Portal's Usage Statement into Aomi Build and
  applied the shared display treatment to all 15 Build page-level headings,
  including Deployments, Transactions, and Observability. Increased the Portal
  Packages title-to-search gap to 25px while preserving the divider rhythm
  below the search field. Verified Build lint/typecheck, all 15 heading
  contracts, live computed PT Serif rendering on `/build`, the 7 focused
  Packages tests, Portal lint/typecheck, and live Packages geometry.

- 2026-07-26 Landing and Portal UI polish: scoped the Landing demo layout
  independently from Portal, default-collapsed its sidebar, refined the welcome
  spacing and composer layout, added a slow edge-faded suggestion marquee,
  improved dark-mode segmented-control contrast, and prevented horizontal
  scrolling in both welcome and docked composer inputs. Aligned the Portal
  Packages overlay to the Settings reference frame, header, typography, and
  close control, and replaced raw proxy HTML failures with a bounded package
  error. Patch-bumped `@aomi-labs/widget-lib` to 1.4.14, refreshed the affected
  Landing registry mirrors, and verified the registry build and 277 tests,
  Landing lint, focused Portal package tests, Portal lint/typecheck, and live
  equal overlay geometry.
- 2026-07-24 idempotent npm publishing: changed the post-merge publish job to
  skip exact package versions that are already live, publish only missing
  versions, and fail closed on registry errors other than a definitive 404.
  This makes reruns safe after partial publication or transient npm outages.

- 2026-07-24 atomic account ownership: split provider sign-in from authenticated
  linking and preflight every verified provider, email, BetterAuth, EVM, and
  Solana signal under one transaction before creating or attaching canonical
  ownership. Conflicts now produce no canonical writes or session, surface a
  non-identifying recovery message, and last-factor unlink checks serialize per
  account. Added sign-in, linking, conflict, retry, and unlink regressions and
  patch-bumped `@aomi-labs/account` to 0.1.8 and `@aomi-labs/widget-lib` to
  1.4.12.

- 2026-07-22 model catalog availability: traced the staging picker's permanent
  `Loading...` state to Better Auth session-pool exhaustion on the otherwise
  public `/api/thread/models` proxy route. Marked that catalog route as
  bearer-independent so it bypasses account database resolution while still
  stripping browser credentials, added proxy regression coverage, and
  patch-bumped `@aomi-labs/account` to 0.1.6.

- 2026-07-23 review-blocker closure: default wallet-mode widgets now withhold
  their required AccountBearer source until an EVM/SVM signer is actually
  available; superseded widget-session exchanges after sign-out or a wallet
  switch revoke their late WST and reject the waiting request instead of
  returning a stale principal; and account refreshes are keyed to the active
  auth/client context so an old provider response cannot overwrite a newly
  selected user's state. Added focused regressions for all three paths,
  removed the stale test-only adapter `kind` fields, rebuilt client/widget
  artifacts, and refreshed the Landing registry mirror. Verified 816 root
  tests, 278 widget tests, lint, root/account/Portal typechecks, client and
  widget builds, and the widget-consumer production build.

- 2026-07-23 widget-auth PR main sync: rebased frontend PR #382 and backend PR
  #855 onto current `main`, preserving the newer x402 and Solana approval work
  alongside tenant-scoped widget authentication. Reconciled the Portal x402
  signer address type, regenerated client/React/widget registry artifacts and
  the Landing registry mirror, and patch-bumped `@aomi-labs/account` to 0.1.7
  and `@aomi-labs/client` to 0.3.9 after the versions already on `main`.
  Verified frozen install, lint, root/account/Portal typechecks, 782 root tests,
  269 widget tests, the Portal test command and production build, the client,
  React, and widget builds, and the widget-consumer production build. Backend
  fmt, database clippy with warnings denied, and the focused plain-message
  signing pipeline test also passed before its rebased branch was pushed. The
  first clean frontend CI run exposed generated-state assumptions that local
  builds had masked: registry boundary tests ran before the package build, and
  Landing could not resolve a widget source import through its narrower
  `@/lib` alias. CI now builds the registry before its tests, the shared import
  is package-relative, and the exact registry-build/test plus Landing production
  build sequence passes locally.
- 2026-07-23 fleet-safe Telegram bot mappings: Build now creates and edits
  builder-wide many-to-many bot/app mappings with a required primary app,
  source-qualified display labels, and write-only credentials. The BFF validates
  every selected app against the signed-in builder's sources before calling the
  manager-wide bot API.

- 2026-07-22 wallet account-access deduplication: hid the legacy `wallet`
  authentication identity from account management, matching the existing
  SIWE/SIWS proof-identity behavior while preserving the branded linked EVM or
  Solana wallet row. Added the reported Rabby regression case and patch-bumped
  `@aomi-labs/widget-lib` to 1.4.10.

- 2026-07-22 Vercel Preview account-state recovery: reproduced the missing
  account badge and connected-only Phantom row while chat history remained
  visible, then traced the repeated 500s to Supabase session-pool exhaustion
  (`EMAXCONNSESSION`, 15-client cap) across separate Vercel API functions. The
  account package now limits Vercel instances to one short-lived Postgres
  client instead of four 30-second clients, with regression coverage and a
  patch bump to 0.1.4. The non-fatal session warning remains diagnostic: it
  compares a queued pending transaction snapshot with the later terminal
  simulation state and does not indicate a signing or broadcast failure.

- 2026-07-22 Vercel PR-preview auth recovery: found that the repaired staging
  `DATABASE_URL` was still scoped only to `Preview (main)`, so ordinary PR
  previews inherited the stale global Preview database and returned 401/403 at
  the backend account boundary. Promoted the already-verified encrypted staging
  value to global Preview scope without exposing the credential, redeployed PR
  #381, and passed disposable SIWS, canonical account, AccountBearer, wallet,
  thread list/create, cleanup, and session-revocation checks with HTTP 200. The
  replacement deployment recorded no 401 or 500 responses during verification;
  Production was not changed.

- 2026-07-22 Solana Phantom approval recovery: reproduced the reported
  10,000-lamport mainnet self-transfer in signed-in Chrome and traced the
  missing popup to the frontend rejecting the backend's legacy
  `mainnet-beta` cluster label before invoking Phantom. Canonicalized legacy
  Solana cluster aliases at the client request boundary and defensively in the
  runtime handler, added send-request regression coverage, patch-bumped
  `@aomi-labs/client` to 0.3.7 and `@aomi-labs/widget-lib` to 1.4.9, and
  regenerated their publishable artifacts. The CLI decoded the supplied
  unsigned transaction as the expected self-transfer, its real Solana signing
  round-trip tests passed, and focused client/widget tests, targeted ESLint,
  portal typecheck, and the portal test command passed.

- 2026-07-21 portal x402 E2E: moved Coinbase x402 signing from the portal's
  Wagmi-only client to the shared wallet-kit adapter, so Para, Privy, injected,
  and other connected EVM wallets use the same `signTypedData`/chain-switch
  boundary. Verified the flow with a real MetaMask provider: SIWE created the
  canonical account, x402 switched the wallet from Base to Base Sepolia,
  MetaMask signed the USDC authorization, and the paid retry returned the
  rendered portal response. Removed the temporary local EVM signing harness
  after this proof.

- 2026-07-21 x402 BFF bridge: allowed the Coinbase x402 v2
  `Payment-Signature` request proof through the shared account proxy and
  returned `Payment-Required` challenges plus `Payment-Response` settlement
  receipts without broadening browser credential forwarding. Added coverage
  for chained partner/platform headers, patch-bumped `@aomi-labs/account` to
  0.1.5 and `@aomi-labs/client` to 0.3.8 after syncing current `main`, and
  verified the focused tests, account/portal/base/landing typechecks,
  formatting, and packed package contents.

- 2026-07-23 provider address-label polish: provider-managed Para and Privy
  rows under Account access now show only their shortened addresses in family
  order, separated by a middle dot (for example,
  `0xda6..f0 · 53GfE..oL`), without repeating `EVM` and `SVM` labels in the
  subtitle. Connected SVM rows now include `Solana` after the address, matching
  the network-name position already used by Ethereum and EVM L2 rows.

- 2026-07-23 thread-auth recovery: traced Portal and widget-consumer 401s to
  the live Rust backend using the remote database while BetterAuth/account
  resolution used `aomi_local`. Restarted the supported auth stack so both
  share the local database; AccountBearer and origin-bound widget-session
  probes now both list 43 threads with HTTP 200. The React runtime also keeps
  the caller's `localhost` backend host instead of rewriting it to
  `127.0.0.1`, and provider widgets withhold their required bearer source until
  the provider credential is ready.

- 2026-07-23 widget-consumer Solana diagnosis: confirmed from Para's live BETA
  partner metadata that Portal requires EVM + Solana wallets while the
  consumer/Landing Para project supports EVM only. The canonical Aomi account
  is shared correctly; only the provider project's live signer set differs.
  The Para developer dashboard is open at sign-in so Solana can be enabled for
  the consumer project before a logout/relogin provisioning check.

- 2026-07-22 provider account-access polish: merged tenant-scoped Para and
  Privy identities into one provider card, attached the provider-owned EVM and
  Solana addresses to that card, and distinguished live/write access (green)
  from linked/read-only access (yellow). The Portal now renders one Para row
  with both live families, while a consumer session that exposes only EVM still
  shows its linked Solana address as stored access. Grouped rename and unlink
  operations update every backing provider identity. Patch-bumped
  `@aomi-labs/widget-lib` to 1.4.10, refreshed the registry artifact, visually
  verified the live Portal modal, and passed all 267 registry tests, root lint,
  the registry build, Portal typecheck, and the widget-consumer production
  build.

- 2026-07-22 widget authentication integration: implemented the v1 code and
  automated acceptance coverage in `specs/WIDGET-AUTH-INTEGRATION-PLAN.md`. Added the
  audited tenant-scope migration and Rust schema/entity mirror; provider-neutral
  identity resolution; strict Para and disabled Privy widget descriptors;
  provider/SIWE/SIWS WST exchange with hashed storage, origin binding,
  revocation, and public credentialless CORS; generic account/BFF principals;
  and the published `AomiWidget`, `paraAuth`, `privyAuth`, and standalone Vite
  consumer. Portal retains its existing Para project while Landing and the
  consumer use the requested separate Beta key in ignored local env files.
  Portal is live on port 3000 and the consumer on port 3001. The consumer now
  renders the full widget plus an actionable Retry/origin banner when Para
  startup fails. The Landing project now accepts `http://localhost:3001` and
  the Google popup reaches Para's wallet-selection screen after restoring the
  SDK's OAuth encryption worker. The final live consumer
  login/thread/harmless-signing gate remains unchecked until the user completes
  the wallet selection and the post-login checks run.
  Patch-bumped account/client/widget-lib, refreshed artifacts and lockfile, and
  passed isolated Postgres replay, Rust fmt/clippy, frontend lint/typechecks,
  package/consumer builds and pack verification, 769 root tests, 252 registry
  tests, and the portal test command.

- 2026-07-20 Robinhood Chain support: added chain `4663` to the client and wallet-kit defaults, including Alchemy metadata, network selection coverage, a monochrome chain icon, generated registries, and explicit portal/landing/docs network lists. Patch-bumped `@aomi-labs/client` to `0.3.2` and `@aomi-labs/widget-lib` to `1.4.3`; focused tests, root/portal/landing typechecks, client and registry builds, lint, formatting, and the read-only client `chain list` CLI passed.

- 2026-07-19 Operate observability detail: replaced the #374 fixture route
  contract with owned source/application IDs and a live manager aggregate
  relayed through `@aomi-labs/deploy` and the Build BFF. Real detail, health,
  transaction, log, and deployment values stay authoritative; backend-missing
  chart/release slices retain explicitly labeled fixture fallbacks. Renamed the
  frontend workspace from `apps/aomi-build` to `apps/build`, patch-bumped the
  deploy package to 0.2.2, and moved the Vercel output directory with it. Full
  app tests, typecheck, lint, production build, package build/pack, GitHub CI,
  and the corrected Vercel preview passed. Staging E2E still depends on the
  backend release-build unblock in product-mono PR #841 reaching `main`.

- 2026-07-15 Aomi Build theming: replaced the app's hard-coded Cursor palette
  with the canonical light/dark tokens from `aomi-design`, added a persisted
  system-aware theme toggle without hydration flash, and aligned semantic
  colors, typography families, radii, shadows, and focus/scrollbar surfaces.
  Verified focused theme tests, Aomi Build lint/typecheck/production build,
  and live `/build` rendering plus reload persistence in both themes.

- 2026-07-20 wallet connection cancellation polish: the shared wallet picker
  now treats explicit provider rejection, WalletConnect reset/expiry, and
  EIP-1193 code 4001 as normal dismissal paths instead of rendering a red error
  banner. Genuine provider and relay failures remain visible. Added regression
  coverage, patch-bumped `@aomi-labs/widget-lib` to 1.4.7, and regenerated the
  registry artifacts.

- 2026-07-17 Solana full-balance swap and holdings polish: taught the Jupiter
  fast path to accept `amount: "all"` for SPL inputs so the backend resolves the
  connected wallet balance and transparently falls back from flaky mint-filter
  RPC reads to token-program scans. The standalone holdings tool now defaults
  its owner from SVM wallet context and returns compact aggregated display
  amounts. Added a dedicated holdings trace presenter that shows `0.148008
USDC` for the canonical mainnet mint, or just the visible UI amount with the
  generic token icon when the symbol is unknown. Patch-bumped
  `@aomi-labs/widget-lib` to 1.4.6 and regenerated registry artifacts.

- 2026-07-17 Solana working-trace polish: split SVM network context from the
  EVM interpreter so Solana traces show the chain family and current slot,
  and added a Jupiter preparation presenter that surfaces input amount,
  expected output, and token direction like the LI.FI swap trace while keeping
  raw tool data available in the expandable detail. Simplified the default
  mainnet picker row and compact trigger to `Solana`. Compact SVM network
  traces now show the formatted slot number without redundant text, and wallet
  approval traces include the staged SVM transaction count. SVM simulation and
  approval matching now live in a dedicated `svm-tx` family with routing tests
  that prevent Solana results from falling through to the EVM interpreter.

- 2026-07-17 browser Solana approval recovery: traced the missing Phantom
  prompt to the portal's zero-config mainnet RPC fallback. Solana's official
  public endpoint returns HTTP 403 to JSON-RPC requests carrying a localhost
  browser Origin, so the runtime failed while refreshing the blockhash before
  invoking the wallet. Switched the portal fallback to PublicNode's
  browser-compatible Solana endpoint, restarted the portal, and verified a
  localhost-origin `getLatestBlockhash` call, portal health, targeted ESLint,
  portal typecheck, and the portal test command.

- 2026-07-17 external Solana GUI parity: browser-connected SVM wallets now use
  BetterAuth SIWS for account creation and optional linking, matching the CLI
  and external EVM flow. Legacy backend binding remains limited to embedded
  wallets, and SIWS proof identities stay hidden from account management while
  the linked Solana wallet remains visible.

- 2026-07-17 wallet naming and thread archive follow-up: unlabeled BetterAuth
  SIWE wallet rows now inherit the connected EVM provider brand (for example,
  `Rabby 1`) without overwriting user labels. Restored durable archive and
  unarchive endpoints backed by `thread_archives`, exposed archive state in
  thread summaries, synchronized the client/OpenAPI contract, and verified the
  full live archive round trip plus canonical Rabby account response locally.

- 2026-07-17 BetterAuth Solana CLI parity: added SIWS nonce/verify endpoints to
  BetterAuth, synchronized verified external Solana wallets into canonical
  `public_keys`, and added Solana-only login plus authenticated wallet linking
  to the TypeScript CLI without the legacy backend bind ceremony. Live dev
  stack E2E covered Solana-only account creation and relogin, EVM-to-Solana
  linking, login through either wallet into the same canonical user, ownership
  conflict and last-factor protection, and an authenticated SVM commit followed
  by local Ed25519 signing and backend completion. Patch-bumped
  `@aomi-labs/account` to 0.1.1 and `@aomi-labs/client` to 0.3.3. GUI work is
  intentionally not started yet.

- 2026-07-16 Solana transaction parity: completed the shared HTTP client and
  CLI paths for SVM approval normalization, signing, broadcast, and terminal
  callbacks; added portal wallet binding and a loopback-only injected Solana
  signer for browser E2E; and made the default runtime preserve both EVM and
  SVM wallet/network state. Patch-bumped `@aomi-labs/client` to 0.3.2 and
  regenerated its publishable artifacts. Verified a Gemini 3 Flash transfer
  through the CLI and portal, including finalized on-chain signatures, backend
  pending-state cleanup, and interpreted Solana trace steps.

- 2026-07-16 staging thread-load diagnosis: reproduced `GET /api/threads`
  returning 401 and `GET /api/account` returning 403 for the connected wallet.
  Both statuses map to the backend's verified-bearer/missing-canonical-user
  paths, so the leading cause is Portal/backend staging database identity drift
  after the July 14 `DATABASE_URL` rotation, not thread rendering or wallet
  provider collisions. Direct Vercel/server environment comparison remains
  blocked by missing `chat-portal` team access and the unavailable staging VPN;
  a targeted backend-log request is prepared for the internal cloud agent.

- 2026-07-14 hosted SDK compatibility: Aomi Build now marks incompatible
  deployments as outdated, blocks their broken chat iframe, links users to the
  Deployments tab, and requests a source-owned SDK upgrade pull request before
  redeployment. Renamed the existing action to describe its actual linked-repo
  behavior and patch-bumped `@aomi-labs/deploy` to 0.2.1.

- 2026-07-14 UI interaction context: added active-thread
  `recordUiInteraction(payload)` over the existing `/api/system` transport,
  documented ordering before an immediate chat send, patch-bumped
  `@aomi-labs/react` to 0.5.2, and regenerated its publishable artifacts.
  Verified focused runtime tests, targeted ESLint, library and landing
  typechecks, the React package build, and the packed npm tarball.

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
- 2026-07-10 release/PR preparation: audited every changed workspace against
  the npm publish workflow and registry. Patch-bumped the three changed
  published packages to `@aomi-labs/client@0.3.1`,
  `@aomi-labs/react@0.5.1`, and `@aomi-labs/widget-lib@1.4.1`; rebuilt their
  artifacts and verified packed tarballs. The changed account and smither
  workspaces are not npm-published, and product-mono has no changed npm
  package. Re-ran frontend lint, package builds, 656 root tests, 221 registry
  tests, and the landing production build before draft PR publication. Opened
  related draft PRs `aomi#304` and `product-mono#780`, with reciprocal links
  and coordinated review/deploy notes.
- 2026-07-13 chat-polish restoration: replayed the complete change set from
  merge commit `17e9bab9` onto current `origin/main` on
  `restore-chat-polish`, preserving the newer thread-era endpoint work while
  restoring assistant-ui 0.14, thread persistence/recovery, the animated
  Working trace, modular tool interpretation, LI.FI presentation, archive-only
  thread actions, generated registries, CLI hardening, and associated package
  updates. Verified frozen install, full lint, library/portal/landing typechecks,
  client/React/registry and landing builds, 682 root tests plus 221 registry
  tests (including the LI.FI interpreter cases), and a signed-in Chrome flow:
  zero trash/delete thread controls, animated trace rows/chips, and a live
  LI.FI ETH-to-USDC quote with no transaction staging or signature request.
- 2026-07-13 PR #329 main sync: merged the latest `origin/main` into
  `restore-chat-polish` without conflicts, retaining the restored chat polish
  alongside the newer Build P1 control-plane work. Re-ran the exact CI workflow
  locally: frozen install, lint, library and deploy builds, 682 root tests, 221
  registry tests, registry build, landing production build, and the live
  staging OpenAPI contract all passed before pushing the refreshed branch.
- 2026-07-13 working-trace scroll: kept long Working traces capped at 260px but
  made the capped region wheel, touch, and keyboard scrollable with hidden
  cross-browser scrollbars. Replaced the previous CSS mask with a
  pair of pointer-transparent, theme-background edge fades so Chrome hover-wheel
  hit-testing reaches the trace while rows dissolve cleanly at both edges without
  smearing text; the bottom fade appears only while more content exists below, so
  the newest step is fully clear at the scroll end;
  preserved auto-follow for the newest live step unless the reader scrolls up,
  and kept Show all / Collapse to recent behavior. Verified targeted ESLint,
  registry build, portal typecheck, all 221 registry tests, and a signed-in
  Chrome E2E against the local dev auth stack using an existing 19-step trace.
- 2026-07-13 working-trace npm follow-up: audited the merged feature against the
  main-branch npm workflow and confirmed only `@aomi-labs/widget-lib` ships the
  touched source. Patch-bumped it from `1.4.1` to `1.4.2` and added a repository
  rule requiring relevant publishable npm workspaces to be version-bumped before
  future merges rather than corrected afterward.
- 2026-07-14 PR #336 main sync: merged `origin/main` into
  `feat/required-secrets-gating`, preserving required-secret activation and
  promotion gating across the newer Build control-plane UI. Resolved the
  launch UI/type conflicts, fixed the merged usage-summary accumulator typing,
  and verified focused Build tests, deploy package tests, the Aomi Build
  typecheck, and the deploy package build.
- 2026-07-26 settings redesign frontend correctness: scoped the shared account
  overview to adapter-account transitions and fenced stale in-flight responses;
  made package full-set replacements wait for an authoritative account
  baseline, serialize writes, and refresh the shared account snapshot; derived
  cached statements from current allowance data; and preserved provider/payment
  dimensions so mixed BYOK and managed model rows render independently. Added
  timing and account-switch regression coverage; corrected the live-data error
  message; and patch-bumped the changed widget package to `1.4.13`. Verified
  302 Portal tests, Portal type-check, repository lint, and `git diff --check`.
  After the first refreshed preview exposed undeclared Para runtime imports,
  made the exact `core-sdk` and `user-management-client` versions available
  from the workspace root so Para's nested packages resolve them in clean pnpm
  installs, then reproduced the production Telegram build.
- 2026-07-26 Builder CLI authentication cleanup: reused the existing Build
  GitHub OAuth callback for CLI authorization, limited CLI sessions to deploy,
  deployment-status, and activate scopes, made exchange retries idempotent,
  and preserved partner platforms in project links and detail lookups. Verified
  type-check, lint, all 331 Build tests, and the production Build bundle.
- 2026-07-27 partner-payment visibility: exposed validated app pricing and the
  durable partner ledger in Project Home, Usage, Logs, Transactions, and
  Observability. Recipient-bucket settlements and outstanding balances are
  explicitly labeled and deduplicated across projects, while configured prices
  remain visible before the first successful paid call. Cross-project payout
  and log rows are deduplicated while advancing every affected project cursor.
  Patch-bumped `@aomi-labs/deploy` to `0.3.1` after `main` advanced to `0.3.0`.
  Synced the PR with the July 27 frontend changes and updated the full-suite
  bootstrap contract to assert the new nullable pricing field. Verified root
  lint, Build type-check, deploy/client/React/registry builds, 1,390 tests, and
  the Landing production build.
