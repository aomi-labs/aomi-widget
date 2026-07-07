# Current State

## Last Updated

2026-07-07 — aomi-smither: multi-loop + eval + parallel (stage 2)

## Flexible-orchestration roadmap (Cecilia's direction)

- **Stage 1 — composition + clarify** ✅. Plan is a composition of typed
  phases; clarify pauses answerable from TUI + console.
- **Stage 1.5 — intake in the browser from t=0** ✅. The composer is visible
  before the workflow exists; one tab follows into the build.
- **Stage 2 — multi-loop + eval + parallel** ✅ (this entry). `eval` phase
  (run + judge → metric), `eval-pass` loops with graceful `return-last` max,
  parallel fan-out. Proven on the defi-pools shape.
- **Stage 3 — wait-external + cross-repo agents** (next). Durable pauses for
  outside-Aomi work; agent phases in another repo. Proof target: GameFi
  companion (design proposal → wait for game-server APIs → integration eval).

## Recent Changes

### Multi-loop + eval + parallel (2026-07-07, stage 2)

Extended the composition vocabulary with the three primitives the arb-bot /
GameFi / defi-pools scenarios jointly demanded:

- **plan.ts** — `eval` phase (scenario/rubric/threshold/judge), `parallel`
  phase (branches[][], maxConcurrency), and loops generalized: `until` is
  "validation-green" | "eval-pass"; `onMax` "fail" | "return-last"; agent
  `onlyIf` gained "prev-eval-fail". `innerPhasesOf` centralizes the descent
  into loop bodies + parallel branches; `compositionIssues` validates the new
  shapes (eval needs binaries; eval-pass loop needs an eval in body; ids unique
  across branches). `stagesFor` expands a parallel into a header row + one row
  per branch leaf (each lights up independently); loops stay one row.
- **evals.ts** (new) — `runEvalStep`: compile → aomi-run(scenario) →
  read-only judge (claude/codex → strict JSON score) → EvaluationRow. Judge
  never edits files. Malformed score clamps to 0 (a failing eval, not a crash).
- **workflow.tsx** — renders `<Parallel>` (branch = `<Sequence>`) and eval
  Tasks; eval-pass loops use the latest eval's `pass` as the `until` predicate;
  refine agents get the judge's feedback folded into their prompt. `loopDone`
  detects graceful `return-last` max via `ctx.iterations` (0-indexed → final
  round is maxRounds-1; the enclosing Sequence still orders downstream).
- **prompts.ts** — composer intake prompt teaches the eval/parallel/loop
  vocabulary; `judgePrompt` + `PromptContext.evalFeedback`.

Verified live through the real Smithers runtime (stubbed commands): (1) parallel
fan-out — both branches ran concurrently and the run waited; (2) eval-pass loop
— judge scored 0.3 then 0.9 across iterations 0/1, loop exited on pass; (3)
graceful return-last — judge always 0.2, loop ran its 2-round budget, never
passed, and the result phase STILL mounted (status complete) instead of
hard-failing. 69 vitest green (10 new: composition shapes + eval judge + clamp +
failure paths); tsc + eslint clean; dist rebuilt.

Bug found + fixed during the proof: `return-last` max detection was off by one
(`ctx.iterations` is the 0-indexed current round, maxing at maxRounds-1), so
the result phase never mounted after a graceful loop. Fixed and re-proven.

### Intake visible in browser from t=0 (2026-07-06, stage 1.5)

Cecilia's ask after driving the morpho chat: "why stare at the terminal during
'thinking…' — give me a UI that monitors from the start." The composer isn't a
Smithers node (no graph until the plan is composed), so it can't ride the
gateway. Instead:

- **intake.ts** — `startIntakeServer`: a loopback HTTP server booted at CLI
  startup serving a self-contained aomi-branded page (`GET /`) + live state
  (`GET /intake`, polled). Shows the conversation, composer thinking (elapsed),
  the draft plan forming, and the composed stage preview. When the build
  starts it flips to `phase:"building"` with a `buildUrl` and the page follows
  itself to the gateway console — one tab across intake → compose → build.
- **cli.tsx** — `SmitherApp` boots the intake server at t=0 (prints
  `⌗ intake view:`), mirrors chat state (turns/draft/thinking/composed stages/
  phase) into it every change, and hands the console URL back from `RunView`
  via `onConsoleUrl` so the page follows on run start. `--no-console` disables.

Verified: intake server serves the page, reflects turns/thinking/draft/stages,
transitions intake→preview→building with buildUrl, and picks the next free
port on conflict (3 vitest). Live screenshot of the morpho preview state
(conversation + forming plan + composed clarify→research→synthesize→loop rail)
captured via playwright. 59 vitest green total; tsc + eslint clean; dist built.

Seam (honest): the transition is a redirect (intake server on 7331, gateway on
7332), not an in-place swap — one tab, one brief navigation. The composer is
streamed, not itself a durable node; making intent a true workflow node is the
stage-2+ "conversational orchestrator" direction and is noted, not built.

### Composition model + clarify primitive (2026-07-06, stage 1)

### Composition model + clarify primitive (2026-07-06, stage 1)

Cecilia's direction after reviewing three scenarios (arb bot, GameFi
companion, spec-less DeFi pools): the plan is now a **composition of typed
phases**, not flags on one pipeline. Stage 1 of 3 (next: multi-loop + eval +
parallel for defi-pools; then wait-external + cross-repo for GameFi).

- **plan.ts** — phase vocabulary (compute ops / agent roles incl. research,
  draft-spec, synthesize / clarify / gate / loop) as zod discriminated
  unions; `BuildPlan.phases?` optional; `classicComposition` reproduces the
  old pipeline with identical node ids (resume-safe); `compositionIssues`
  validates structure at finalize.
- **workflow.tsx** — generic renderer: walks `resolveComposition(plan)`,
  chain-mounts phases as predecessors' rows appear; denied gate skips
  downstream except result. Clarify = select-mode `<Approval>` with options
  mirrored into request.metadata; clarify answers are folded into later
  agent prompts (`PromptContext.clarifications`).
- **run.ts** — `executeRunUntilSettled`: the engine RETURNS
  `waiting-approval` (does not block) — discovered live; the settle loop
  re-executes with resume after durable decisions from any surface.
  `decideApproval` gained `selection` (approveNode's 7th arg).
- **console.ts** — loopback decision endpoint (`POST /decide`, port 0)
  beside the gateway: the stock 0.26.1 gateway approve route DROPS decision
  payloads (`approveNode(..., body.note, body.decidedBy)` — no decision
  arg), so browser select-mode decisions need this side channel. decideUrl
  rides into UI boot props; `ConsoleHandle.decideUrl` exposed.
- **cli.tsx / ui/aomi-smither.tsx** — TUI renders clarify options as a
  Select; branded console renders option buttons (first = recommended) and
  posts to the decision endpoint. Intake prompt teaches the composer the
  vocabulary + viability probe.

Verified live: (1) morpho intake — "build a morpho pool manager" →
ready:false, explains GraphQL-only, offers research-mode (recommended) /
draft-spec, asks positions-vs-vault-curation; (2) engine proof — composed
clarify workflow paused (ApprovalRequested → NodeWaitingApproval), decision
POSTed over the endpoint, "approval granted", resumed, finished;
`clarify` row persisted `{selected: "research-mode", notes}`; (3) browser
page serves options + decideUrl in boot props. 56 vitest green (5 new
composition tests), tsc + eslint clean, dist rebuilt.

Note for reviewers: headless `--yes` auto-selects each clarify's FIRST
option — compositions should order options recommendation-first.

### aomi-smither engine rewrite: Smithers-native, compose-from-intent (2026-07-05)

Rewrote `packages/smither` (Cecilia's direction; Han returns Monday to
continue on this branch). The old hand-rolled sequential engine + plan.json
state (`workflow.ts`, `state.ts`, `smithers.ts`) is replaced by a real
`smithers-orchestrator` (0.26.1) integration:

- **plan.ts** — `BuildPlan` zod schema is the contract between the intake
  chat and the workflow; `stagesFor(plan)` drives preview, dry-run, and node
  ids (stable, resume-safe).
- **workflow.tsx** — JSX task graph rendered from the plan: binaries →
  codegen → agent curate (needsApproval) → optional forked-session review →
  `<Loop>` validate/repair (maxFixRounds) → optional smoke → `<Approval>`
  deploy gate → deploy → result. Conditional mounting from persisted ctx
  outputs.
- **run.ts** — embeds the engine (`Effect.runPromise(runWorkflow(...))`),
  durable approvals via `approveNode`/`denyNode`, run pointer in
  `.smithers/runs/<app>/run.json`, resume on re-run. Bun-only (bun:sqlite);
  modules lazy-import the orchestrator so Node can still load them.
- **intent.ts / cli.tsx** — new TUI: intent chat ("What Aomi App do you wanna
  build?") → read-only CLI agent distills the plan → editable preview →
  live run view with inline approval prompts. Headless `--yes` and
  `--dry-run` modes; `rollback` subcommand unchanged.
- **binaries.ts** — fresh-from-GitHub guarantee: `ensureFreshSdkCheckout`
  (fetch, ff-only merge when clean+behind; throws on dirty/diverged/offline
  unless `--allow-stale-sdk`), and stale fallbacks are gated behind the same
  flag. CLI shebang is now `#!/usr/bin/env bun`; added `effect` dep.

Also earlier same day: renamed the package from Han's `aomi-workbench`
(`@aomi-labs/workbench`) to `aomi-smither` (`@aomi-labs/smither`) across
package/bin/identifiers/docs/lockfile.

Verified: 35 vitest tests pass (plan/intent/binaries-freshness/state/commands/
rollback), `pnpm run build:smither` green, `tsc --noEmit` clean, CLI help +
dry-run compose correctly under Bun. All uncommitted — pending Cecilia's
review.

### Live E2E: geckoterminal app built by smither (2026-07-05)

First real end-to-end run succeeded. `aomi-smither --app geckoterminal
--existing --builder claude --yes` against `~/Code/aomi-sdk`: GitHub-fresh
sync fast-forwarded the checkout to origin/main, built binaries, gen-client +
gen-tool from a sanitized GeckoTerminal OpenAPI spec (20 client methods,
~6.6k LOC generated), Claude curated 10 pool-centric tools, and cargo
fmt/clippy/test validated green on the first pass (zero repair rounds).
Plugin compiles (`plugins/geckoterminal.dylib`).

Fixes that came out of the live run:
- Freshness gate no longer counts untracked files as dirty
  (`git status --untracked-files=no`) — generated apps and the engine's own
  `.smithers/` state under sdkRoot used to block every second run.
- React duplication crash in the TUI (`@inkjs/ui` declares no react dep) —
  fixed via root `pnpm.packageExtensions` granting it a react peer.
- CLI/headless runs exit explicitly (engine timers keep the loop alive).
- TUI: elapsed ticker on intent "thinking…", streamed command output tail in
  the run view. `savePlan`/`loadPlan` persist the BuildPlan beside the run.

Notes: GeckoTerminal's published spec has 14 `include` query params missing
`schema` — sanitized copy written to `apps/geckoterminal/openapi.yaml` in the
SDK checkout (untracked) plus a one-line workspace-exclude edit to the SDK
root `Cargo.toml` (codegen artifact). Morpho has no public OpenAPI (GraphQL
only) — a draft-spec agent stage (SDK's `aomi-app-client-api-gen` skill) is
the path for spec-less platforms. Stale `morpho` run state from Cecilia's
first TUI session remains under `packages/smither/.smithers/runs/morpho/`.

### Browser console: live workflow visualization via Smithers Gateway (2026-07-05)

Added a Gateway sidecar (`packages/smither/src/console.ts`) per Cecilia's ask
to visualize workflow progress (smithers.sh workflow-ui pattern):

- **startConsole** — boots `smithers-orchestrator/gateway` on `127.0.0.1`
  (no auth ⇒ operator role, loopback-only by design), registers the run's own
  workflow object (`ui: true` mounts the built-in operator console), serves
  `/console` + `/workflows/<app>`. Port retry starts at 7331; ports are
  probed with a raw `net` server first because `gateway.listen` does NOT
  reject on EADDRINUSE — it emits an unhandled 'error' that would crash the
  process.
- **startConsoleForApp** — observer mode: rebuilds the workflow from the
  persisted `plan.json` (written by `prepareRun` since this change) and
  attaches to the same `smithers.sqlite`; the gateway's out-of-process event
  bridge (1s poll) streams a run executing in another terminal.
- **CLI**: interactive runs boot the sidecar by default and show
  `⌗ live console: <url>` in the run view; headless opts in with
  `--console`; `--no-console` / `--console-port` to disable/move. New
  `aomi-smither console --app <name>` subcommand for external observation.
- Browser approvals work (operator console approve/deny writes the same
  durable decision the TUI does; first writer wins).

Verified: 38 vitest tests green, tsc + eslint clean, live smoke under Bun
(port-conflict bump, /health, /workflows `hasUi:true`, console HTML, 42.5KB
workflow client.js bundle all 200), and `console --app geckoterminal`
serves the real completed run's state. `plan.json` for geckoterminal was
reconstructed manually (run predates savePlan).

### Shipped: geckoterminal live on staging community platform (2026-07-06)

Smither's deploy stage ran the full lifecycle: exported app committed to
`ceciliaz030/my-aomi-bots` (branch `smither/geckoterminal-poc`, standalone
Cargo.toml pinned to published aomi-sdk 3.0.1), community-scoped activation
token minted with the staging admin key (id 137), preflight → PR #84 on
`aomi-labs/community-apps` → CI "Build candidate release: pass" → release
`apps-141779906-r229e1090c5-geckoterminal-cb7227310237` activated. Backend
status: `active=true artifact_ready=true loaded`. Full narrative with real
snippets: `aomi-smither-poc-log.md` (repo root).

New plan fields from the ship: `deployPath`/`deployAomiToml`/`deployPlatform`
(+ CLI flags), and a codegen idempotence guard (existing curated sources are
never regenerated without --force). Backend quirks surfaced: unbound
app-scoped token mint 500s on `platform_activation_tokens_scope_shape`;
`aomi-build deploy` resolves platform from saved config before the manifest.
SECURITY: the staging admin private key was echoed into the session transcript
by a clap parse error — rotate `AOMI_ADMIN_SERVICE_PRIVATE_KEY_STAGING`.

### Branded gateway-react console UI (2026-07-06)

Shipped the phase-2 custom UI. The console sidecar now serves an aomi-branded
React app instead of the generic operator console:

- **`src/ui/aomi-smither.tsx`** — Gateway UI entry (`createGatewayReactRoot` +
  `gateway-react` hooks). Renders the plan's named stages as a stage rail
  coloured by live events, an approvals panel (real approve/deny →
  `submitApproval`), an activity feed, and per-node output. aomi design tokens
  inlined (ink `#09090b`, lilac accent, PT Serif/Geist via Google Fonts, pill
  controls, semantic status colours). Self-contained; no `@aomi-labs/design`
  import (browser bundle).
- **`src/console-model.ts`** — pure, DOM-free event→stage reducer +
  snapshot-executed-stage collector. 10 unit tests. Mirrors the TUI's
  `reduceEvent` over the wire frame shape.
- **`console.ts`** — `register(app, workflow, { ui: { entry, title, props } })`
  with `props = { app, stages: stagesFor(plan) }`; resolves the entry abs path
  from the package root (works from dist/ and src/), falls back to the built-in
  console if the source isn't present. `--console-builtin` forces the generic
  console; `/console` still serves it too.
- **Stage status sourcing**: live runs light the rail from `useGatewayRunEvents`
  (afterSeq:0 replay + tail). A run that finished before the console attached
  has no streamable events, so its rail is reconstructed from
  `getDevToolsSnapshot` (called via `useSmithersGateway().rpcRaw` — it's an
  HTTP route, not in the typed RPC union): only stages present in the persisted
  tree + a succeeded run render `done`, so a non-executed stage never falsely
  greens.

Verified: 48 vitest tests, `tsc` (node) + `tsc -p tsconfig.ui.json` (browser,
`allowImportingTsExtensions`) + eslint all clean; Bun bundled the entry (5.7 MB,
HTTP 200); Playwright rendered the branded UI against the real geckoterminal
run — all five stages `done`, "finished" pill, PT Serif loaded, zero console
exceptions.

REACT FIX (repo-wide, low blast radius): the Bun-built browser bundle crashed
with "Incompatible React versions" — the dedupe plugin resolved `react@19.2.3`
(root-hoisted) against `react-dom@19.2.7` (smithers' pin). Added
`pnpm.overrides` `react`/`react-dom` → `19.2.7`; every workspace consumer
declares `^19.2.0`, so this is an in-range patch alignment, not a bump past any
declared range. Collapses the two react copies to one (also subsumes the
earlier `@inkjs/ui` packageExtensions workaround, left in place as
belt-and-suspenders).

Known limitation: the entry is compiled from `src/ui/aomi-smither.tsx` at
gateway request time, so a published tarball (which ships only `dist`) would
fall back to the built-in console. Fine for workspace-internal use (always run
from source); ship `src/ui` + `src/console-model.ts` in `files` if this ever
publishes standalone.

### Pending
- Add a draft-spec agent stage for platforms without an OpenAPI spec.
- Decide whether `review`/`fix` agent output schemas should feed a quality
  gate (currently informational).
- Optional: custom aomi-branded gateway-react UI
  (`ui: { entry: ".smithers/ui/aomi-smither.tsx" }`, hooks from
  `smithers-orchestrator/gateway-react`) — the built-in operator console
  already covers graph/outputs/approvals, so this is branding polish.
- Cosmetic: observer-mode boot logs a ClaudeCodeAgent ANTHROPIC_API_KEY WARN
  (agents are constructed, never invoked); consider suppressing.
- Root `vercel-build`/CI: smither package is not in the app build path; no CI
  wiring for bun tests yet.

### CLI auth: SIWE session + `/token` bearer refresh (2026-06-28)

Made the `aomi` CLI work under the proxy-mint model and shaped it as a drop-in to
arixon's BetterAuth. Before: the CLI talked to the raw backend with a static,
hand-pasted `--account-bearer` that died in 15 min and could not refresh (the
refresh-on-401 plumbing was dead). Now it holds a **BFF session** and mints
short-lived AccountBearers on demand — the same two-token loop arixon's `bearer()`
+ `jwt()` plugins serve (verified by reading `codex/widget-auth-pre-rust`: his
`auth.ts` enables `bearer()` for headless clients and `jwt()` exposes
`GET /api/auth/token`).

- **New BFF route** `createBearerTokenRoute` (`packages/account/src/token.ts`),
  mounted in portal + base + landing at `app/api/bff/auth/token/route.ts`. Reads the
  session from `Authorization: Bearer <aomi_session>` (cookie fallback) → returns
  `mintAccountBearer` → `{ access_token, token_type, expires_at }`. The bearer-header
  read pre-matches arixon's `bearer()` plugin so migration is a URL swap.
- **SIWE login now creates a canonical user** via `resolveOrCreateByWallet` (inserts
  `users` + `auth_identities`, keyed `wallet_provider='wallet'`, `application=null` so the
  wallet user is global — same UUID across BFFs). The SIWE nonce/verify routes are now
  mounted on **portal + base + landing** (parity) so the CLI can log in against any BFF
  origin, not just base.
- **e2e validated (2026-06-28)** against a local portal BFF → staging backend
  (`api-staging.aomi.dev`): `aomi account login` (SIWE) created the canonical user in the
  staging DB; `aomi wallet whoami` + `aomi chat` returned `/api/account` and `/api/chat`
  **200** through the proxy as that user (only the LLM call 402'd on backend OpenRouter
  credits). The e2e exposed + fixed a design bug: the CLI first fetched a backend bearer
  from `/token` and sent **that** to the proxy, which strips client `Authorization` and
  re-mints from the cookie → 401. Fix: `getSessionedCanonicalId` now reads the session from
  `Authorization: Bearer <aomi_session>` first (then cookie), so the **proxy** mints from
  the session the CLI presents; `getAccountBearer` returns the session directly (no `/token`
  round-trip). `/token` remains the direct-to-backend analog of arixon's `/api/auth/token`.
- **CLI** (`packages/client/src/cli/account-auth.ts`): `siweLogin` (non-interactive
  SIWE with the device `--private-key` → stores `aomi_session`) +
  `createSessionGetAccountBearer` (fetches `/api/bff/auth/token`, caches, refreshes on
  401/expiry). `aomi login` now does SIWE (Privy-URL print kept as fallback for
  Solana/no-key); `accountSession` persisted in CLI state; `--account-bearer` kept as
  CI escape hatch. Open decision: the CLI's default `baseUrl` still points at the raw
  backend — it must point at a BFF for login; flipping the default is left to the owner.
- Tests: `token.test.ts` (4) + `account-auth.test.ts` (5) green; account-graph 9/9
  regression; account + client typecheck clean; client bundle builds.
- Full design + his↔ours mapping: `docs/handoffs/bff-betterauth-integration.md` §3.

### base SIWE shaped as a BetterAuth drop-in (2026-06-27)

Checked our BFF account model against arixon's `codex/widget-auth-pre-rust`
(BetterAuth, `@aomi-labs/auth`). Most of our work already matches the seams in
`docs/handoffs/arixoneth-account-auth.md` (sub=canonical UUID, proxy
inject-from-session, `getSessionedCanonicalId` contract). The one new divergence —
base SIWE — was reshaped to be a drop-in for his BetterAuth SIWE: extracted
`verifySiweMessage({message,signature,address,chainId?})` in
`packages/account/src/siwe.ts` to mirror `@aomi-labs/auth/better-auth/siwe`
exactly (EOA → smart-account EIP-1271/6492), split field-validation
(`validateSiweMessage`) from signature-verification like his. Full per-seam
mapping + the GAP-3 UUID-preservation note: `docs/handoffs/base-siwe-betterauth-dropin.md`.
Account typecheck + base typecheck clean; account-graph tests 9/9.

Also extracted Privy/Para credential verification out of `exchange.ts` into
`packages/account/src/providers.ts`, shaped to mirror his `@aomi-labs/auth/providers`
(`verifyProviderCredential` / `ProviderTokenCredential` / `VerifiedProviderToken`),
so his verifiers drop in for the exchange's verification sub-seam (the exchange
*flow* itself still gets reframed under BetterAuth — session-first link). Portal
175/175 + account-graph 9/9 green; account + portal typecheck clean.

Handoffs for the BetterAuth integration (`docs/handoffs/`):
`bff-betterauth-integration.md` is the centerpiece — the full seam contract (which
points drop in literally vs replace-body vs reframe), his↔ours data-type tables
(bearer claims, session, account graph, provider credential, SIWE, exchange), and
the recommended merge plan (his branch as base, our contract wins the seams, the
GAP-1/2/3 checklist, and the one backend-verify gate). `arixoneth-account-auth.md`
is the contract + gaps; `base-siwe-betterauth-dropin.md` is the SIWE/provider detail.

### BFF unification: one shared bearer/proxy/session seam (2026-06-27)

Extracted the per-app BFF plumbing (previously triplicated and divergent across
portal/base/landing) into `@aomi-labs/account` (server-only) so every Next app
mounts it as a thin config — change the auth model once, all clients inherit it.

**`@aomi-labs/account` (new server-only modules):**
- `session.ts` — moved from `apps/portal/src/server/cookies/session.ts`. HS256
  `aomi_session` cookie helpers. Secret now `AOMI_SESSION_SECRET` (falls back to
  `PORTAL_ONLY_SESSION_SECRET`). Portal's old file is a re-export shim.
- `proxy.ts` — `createBackendProxy(config)` → Next `{GET,POST,PUT,PATCH,DELETE}`.
  Single auth model: strips inbound `authorization`/`cookie`, mints the bearer
  from `aomi_session`, injects `Authorization`, SSE-aware, degrades to anonymous
  on mint failure. Config: `allowedRoutes`, `applyDefaults`, `transformResponse`,
  `upstreamBaseUrl`.
- `exchange.ts` — `createAuthExchangeRoute(config)`: Privy/Para JWT → canonical
  user → session cookie (provider verification moved in from portal). The bearer
  stays server-side and is minted by the proxy from the session cookie.
- `siwe.ts` — `createSiweNonceRoute()` + `createSiweExchangeRoute()`: wallet-
  ownership login for base's Base smart account (no provider JWT). Verifies SIWE
  signatures on-chain (EIP-1271/6492 via viem) and mints the session from the
  proven address without returning a bearer to the browser. Added deps: `jose`,
  `viem`; peer `next`.
- `account-graph.ts` — added `resolveOrCreateByWallet(address)` (mirrors
  `insert_for_identity` for a `wallet`-keyed identity).

**Shared client (`@aomi-labs/widget-lib`):**
- `AomiSessionProvider` / `useAomiSession` — moved from portal's
  `aomi-session-bridge.tsx` (now a re-export shim). Provider-JWT login bridge.
- `AomiWalletSiweSessionProvider` — new SIWE login bridge (nonce → `signMessage`
  → verify) for base.

**Apps (now thin configs):**
- portal — `[...slug]` + exchange routes delegate to the factories; behavior
  preserved (all 175 portal tests pass; the existing proxy test was rewired to
  use the real `createBackendProxy`).
- landing — replaced the blind passthrough proxy (which leaked the session
  cookie upstream) with `createBackendProxy` + a real allowlist; added exchange
  route; mounted `AomiSessionProvider` in the Privy/Para providers.
- base — replaced its hand-rolled proxy with `createBackendProxy`; added SIWE
  `nonce`/`verify` routes; mounted `AomiWalletSiweSessionProvider`; dropped the
  old browser-held-bearer routes (`/api/account/exchange`, `/api/auth/privy/begin`).

**Verification:** all apps + lib typecheck clean; base + landing `next build`
clean (no server-only leak into client bundles); base/landing/changed-files lint
clean. New env (base + landing): `PORTAL_SERVICE_PRIVATE_KEY`,
`AOMI_SESSION_SECRET`, provider verify keys, optional `BASE_RPC_URL`.

**Not done this round:** telegram (no backend proxy today). CLI/React transport
needed no change — already compatible with the same-origin proxy contract.

**Pre-existing (not mine):** `apps/portal/src/features/launch/components/deploy-step.tsx:210`
has a `react-hooks/preserve-manual-memoization` lint error on the branch.

### Remove no-op `createAccountBearerProvider` (2026-06-22)

The browser holds no AccountBearer under the proxy-inject design (Option 2): the
portal sets an httpOnly `aomi_session` cookie at login (`AomiSessionBridge` →
`/api/account/sessions/exchange`) and the same-origin proxy injects the bearer
from that cookie on every `/api/*` call. `createAccountBearerProvider` was a
no-op that always yielded `undefined`, so its plumbing produced nothing.

- Deleted `packages/client/src/account-session.ts` (function +
  `AccountBearerProviderOptions`/`AccountBearerProvider`/`EmbeddedCredentialProvider`/`AccountSessionExchangeResponse` types) and its barrel exports in `packages/client/src/index.ts`.
- Deleted `packages/client/test/account-session.unit.test.ts` (only exercised the no-op).
- Stripped the dead `accountBearerProvider` memo + dispose effect and the `getAccountBearer` client option from `apps/portal/src/components/portal-aomi-frame.tsx`.
- Note: `dist/` (`packages/client`) still needs a rebuild (`pnpm run build:lib`) to drop the stale export/types.


### Deploy flow: CLI, SDK, BFF security, Portal UI (2026-06-20)

Shipped 11 PRs enabling a full deploy app flow. End-to-end: `aomi deploy --commit` →
BFF → platform backend → GitHub Pages, surfaced in the Portal onboarding wizard.

**CLI (new — `packages/client/src/cli/commands/`):**
- `aomi deploy --commit` — validates git state, uploads source, returns app ID (#234)
- `aomi status` — polls deployment/release progress with live terminal output (#239)
- `aomi activate` — promotes a built release to live (#239)
- `DeployCliError` in `errors.ts` with typed codes: `AUTH_FAILED`, `BACKEND_ERROR`, `NOT_A_GIT_REPO`, `VALIDATION_ERROR`, `NETWORK_ERROR` (#234, #242)
- Property-based tests for deploy error handling using `fast-check` (#242)

**SDK (`packages/deploy/src/`):**
- Typed deployment status and watch types (#232)
- `watchDeployment()` with exponential backoff, property-based tests (#235)

**BFF (`apps/portal/src/app/api/onboard/`):**
- Security utilities: CSRF protection, rate limiting, input validation (#233)
- `TokenCache` with configurable TTL, 30s fetch timeout, 401/403 auto-invalidation (#236)
- `handleDeploy()` factory unifying dry-run/deploy routes (#237)
- Route hardening across all onboard endpoints (#238)
- Property-based tests for route factory and security (#242)

**Portal UI (`apps/portal/src/components/settings/onboarding/`):**
- Progress bar in deploy step, `applicationId` wiring through wizard (#240)
- `chatAppUrl()` helper, configurable chat URL, dead mock code removed (#241)

**CI:**
- OpenAPI check made conditional (`if: vars.NEXT_PUBLIC_BACKEND_URL != ''`) — cherry-picked to all 11 branches

379 tests pass. All branches deleted after merge.

### Privy autonomous signing: persist Solana wallet slots (2026-06-12)

Root-caused two blockers for the byreal autonomous swap (`authorized_sign` via Privy delegated signing):

1. **BE (product-mono, fixed there)**: `privy_rs::PrivateKey` only accepts SEC1 PEM, but `PRIVY_AUTHORIZATION_PRIVATE_KEY` in env was the dashboard `wallet-auth:<base64 PKCS#8>` format → "Invalid key format: provided PEM string is malformed", with no BE log. Added `normalize_authorization_key()` (accepts SEC1/PKCS#8 PEM, wallet-auth base64, `\n`-escaped) + info/error logs in `aomi/crates/tools/src/authorized_signer/privy.rs`. 13 tests pass.
2. **FE (`packages/auth/src/providers/privy.ts`)**: the portal login page POSTs a `wallets[]` array (EVM + Solana), but the provider callback only persisted the 4 EVM slots. The BE `PrivySigner` SVM path hard-requires `PRIVY_SOLANA_WALLET_ID`/`PRIVY_SOLANA_WALLET_ADDRESS`. Callback now parses `wallets[]`, validates the base58 address, and persists the two Solana slots + identity metadata. 7 tests pass (`packages/auth/test/privy.test.ts`).

To re-test e2e: restart portal, redo `aomi wallet login --solana` (vault must re-populate with the new slots), then chat swap should route through `authorized_sign` → BE-signed blob → byreal broadcast. Note `svm_sign_tx` is the *interactive* tool (FE/CLI signs); "pending wallet approval" in BE logs with no follow-up means the client never resolved the request — there is no timeout on either side.

### CLI e2e smoke: Solana wallet connect + Byreal swap (2026-06-12)

Manual test of local `packages/client` build (0.1.41) against backend :8080. All green:
`aomi wallet set --solana` (base58 → derived address), `--app byreal` balances, swap quote (0.005 SOL→USDC), confirm → `tx-1` queued, `aomi tx sign tx-1` (solana_sign) → broadcast, signature finalized on mainnet, pools-by-TVL query.

- **Known issue (backend agent, no code change)**: after queueing the wallet request, the agent's chat reply prematurely claimed "swap was successful" with placeholder signature `11111111...1111` before any signing happened. Misleading UX; likely the agent hallucinating around the queue-tx tool result.
- Minor: local CLI banner/help still says `v0.1.40` though package.json is 0.1.41 (version string not bumped in dist or hardcoded).

### Account token-exchange runtime wiring + test coverage (2026-06-08)

Branch `codex/para-solana-support-wip` (PR #150). Merged `fix/pr150-runtime-wiring` (commit "Wire account token exchange into runtime") after review: builds, dist in sync, 26 runtime tests, portal typecheck clean.

- **Reviewed & verified adaptation** of the FE↔backend contracts: `createAccountAccessTokenProvider` → `POST /api/account/exchange` (`{ provider, provider_token }` ↔ backend `ExchangeAccountSessionRequest`), and `app` on `sendSystemMessage` → `/api/system` query params.
- **Removed dead `ThreadContextTest.tsx`** debug component (referenced removed `threads`/`threadMetadata`; failed `tsc --noEmit`, not caught by CI). Registry typecheck now clean.
- **FE unit coverage**: `packages/client/test/account-session.unit.test.ts` — caching, forceRefresh, single in-flight coalescing, proactive timer refresh + subscriber notify, dispose teardown, snake_case mapping (7 tests).
- **Live e2e**: `client.integration.test.ts` gained an LLM-free app-scoped system-message test (green vs local backend :8080 + local supabase).
- **Backend DB e2e** (product-mono, branch `test/account-exchange-db-e2e`): `entities.rs` test mirroring the exchange's Privy identity resolution + provider scoping (green vs local supabase :54322).
- **Known gap (flagged, no code)**: backend `ScheduledIntentDueEvent` (`scheduled_intent_due`, declared System→UI) from product-mono #564 has no FE handler — falls through as a raw system message. Product decision needed.



### Multi-wallet per-family connection + hybrid picker (2026-05-29)

Branch `codex/para-solana-support-wip`. Design/plan in `docs/superpowers/specs/2026-05-29-multiwallet-per-family-picker-design.md` and `docs/superpowers/plans/2026-05-29-multiwallet-per-family-picker.md`. Backend contract unchanged.

- **Default Solana cluster → mainnet** (was devnet) in `landing-para-provider.tsx`, `landing-privy-provider.tsx`, `portal/wallet-providers.tsx`.
- **Account registry**: `AomiAccount` type + `accounts`/`selectAccount` on `AomiAuthAdapter`; `disconnect({accountId})` for per-account EVM disconnect (`types.ts`, new `accounts.ts` with `buildAccounts`/`isAccountSelectable` + tests).
- **Persistence**: new `persistence.ts` (localStorage wallet prefs) wired into `network-preferences.tsx` (read-once `useState` init + save effect, `storageKey="para"`). `vitest.setup.ts` gained a localStorage polyfill + `IS_REACT_ACT_ENVIRONMENT`. Deviation from spec: persists selection only (family/chain/network), not active account — wagmi/solana-adapter restore their own active connection.
- **wagmi multi-connection**: `safe-wagmi-hooks.ts` gained `useSafeConnections`, `useSafeSwitchAccount`, and `WagmiConfigShape.connectors`.
- **para.tsx**: builds `accounts` from wagmi connections + Solana wallet; `selectAccount` → wagmi `switchAccount`; per-account EVM disconnect; EVM-connect guard (keys off `wagmiAddress`) so "Connect EVM" no longer reopens the Para modal when already connected. base-account/privy/context + network-select test mock got minimal `accounts:[]`/`selectAccount` conformance.
- **Hybrid picker**: new `wallet-picker-context.tsx` + `wallet-picker.tsx` (Para provider row + EVM/Solana family sections, inactive family greyed with "Switch to X" affordance, select/disconnect/connect). `dual-wallet-bar.tsx` rewritten to a trigger that opens the picker. Deleted `wallet-family-slot.tsx` (+ its public export).

### Registry app metadata crash guard (2026-05-27)

- **Fixed control bar crash on malformed app ids** in `apps/registry/src/components/control-bar/app-metadata.ts` by:
  - making `normalizeAppId` accept unknown values and safely return an empty string for non-strings
  - adding a fallback `Unknown App` metadata entry for empty/invalid ids
  - skipping invalid entries in `groupAppsByCategory` before calling `getAppInfo`
  - normalizing returned `AppInfo.id` values for consistent icon/selection behavior
- **Added regression test** `apps/registry/src/components/control-bar/app-metadata.test.ts` to verify non-string ids no longer crash grouping and empty ids resolve to fallback metadata

### Release version bumps for publish (2026-04-27)

- **Bumped package versions** for the three publish targets:
  - `@aomi-labs/client`: `0.1.28` -> `0.1.29`
  - `@aomi-labs/react`: `0.3.12` -> `0.3.13`
  - `@aomi-labs/widget-lib`: `1.2.8` -> `1.2.9`
- **Updated files:** `packages/client/package.json`, `packages/react/package.json`, `apps/registry/package.json`

### CLI root-shape alignment with Rust CLI (2026-04-19)

- **Added root chat mode** to `packages/client/src/cli/root.ts` + new `src/cli/repl.ts`:
  - `aomi` now starts an interactive REPL by default
  - `aomi --prompt "<message>"` sends a single prompt and exits
- **Added REPL commands** matching the backend CLI shape: `/heap`, `/app`, `/model`, `/key`, and `:exit`
- **Added BYOK support** to the TS CLI:
  - new `src/cli/commands/byok.ts`
  - new `AomiClient` methods for `GET /api/account/payment`, `POST /api/account/payment/byok`, and `DELETE /api/account/payment/byok/:provider`
- **Kept noun-verb operator subcommands** (`tx`, `session`, `secret`, `model`, `app`, `chain`) for wallet/session workflows instead of removing them
- **Added unit coverage** in `test/cli/cli-provider-keys.unit.test.ts` and `test/cli/cli-repl.unit.test.ts`

### AA Proxy: Delete client-side complexity (2026-04-12)

- **Deleted 8 source files (~871 lines):** `cli/aa-config.ts`, `cli/commands/aa.ts`, `cli/commands/defs/aa.ts`, `aa/env.ts`, `aa/alchemy/env.ts`, `aa/pimlico/env.ts`, `aa/alchemy/resolve.ts`, `aa/resolve.ts`
- **Deleted 3 test files:** `aa-env.unit.test.ts`, `aa-resolve.unit.test.ts`, `cli-aa-config.unit.test.ts`
- **Rewrote `cli/execution.ts`** (285→170 lines) — removed `getCliAAApiKey()`, `getCliAlchemyGasPolicyId()`, `isCliProviderConfigured()`, `resolveAAProvider()`, `resolveAAMode()`, all `readAAConfig()` calls. New 3-way decision: `--eoa` → EOA, `PIMLICO_API_KEY` + pimlico → Pimlico BYOK, `ALCHEMY_API_KEY` → Alchemy BYOK, else → Alchemy proxy (zero-config default)
- **Added proxy transport to `aa/alchemy/create.ts`** — `proxyBaseUrl` param threaded through `CreateAlchemyAAStateOptions` → `createAlchemyWalletApisState`. Transport selection: `proxyBaseUrl ? alchemyWalletTransport({ url }) : alchemyWalletTransport({ apiKey })`
- **Threaded `proxyBaseUrl` through `aa/create.ts`** — `CreateAAStateOptions` and `createAAProviderState` pass through to Alchemy creator
- **Moved `AAProvider` type** from deleted `aa/env.ts` to `aa/types.ts`
- **Inlined env reads** — `pimlico/resolve.ts` uses `process.env.PIMLICO_API_KEY` directly (was `readEnv(PIMLICO_API_KEY_ENVS)`)
- **Inlined `alchemy/provider.ts`** — replaced `resolveAlchemyConfig` dependency with local `resolveForHook()` using `getAAChainConfig` + `buildAAExecutionPlan` + `NEXT_PUBLIC_*` env vars
- **Added `ALCHEMY_CHAIN_SLUGS`** to `src/chains.ts` — maps chain IDs to Alchemy network slugs for proxy URL construction
- **Deleted `parseAAConfig()`** (~75 lines) from `aa/types.ts` — along with `assertChainConfig()` and `isObject()` helpers
- **Removed `aomi aa` subcommand** from `cli/root.ts` — no more `aomi aa status/set/test/reset` commands
- **Updated `src/index.ts`** — removed exports for deleted symbols (`parseAAConfig`, `readEnv`, `isProviderConfigured`, `resolveDefaultProvider`, `resolveAlchemyConfig`, `AlchemyResolveOptions`, `AlchemyResolvedConfig`)
- **Updated barrel files** — `aa/index.ts`, `aa/alchemy/index.ts`, `aa/pimlico/index.ts` trimmed to match remaining modules
- **Rewrote `test/cli-execution.unit.test.ts`** — removed persisted-config tests, added proxy-mode tests (zero-config → `proxy: true`), added BYOK tests, added proxy URL assertion
- **Updated `test/aa-create.unit.test.ts`** — pass `apiKey` explicitly (no longer read from env by create function)
- All 155 tests pass, build clean, lint clean

#### New execution model
| Env vars | Flag | Result |
|---|---|---|
| (none) | (none) | **AA proxy** (zero-config, via backend) |
| `ALCHEMY_API_KEY` | (none) | AA BYOK (Alchemy direct) |
| `PIMLICO_API_KEY` | `--aa-provider pimlico` | AA BYOK (Pimlico direct) |
| any | `--eoa` | EOA |

### Phase 5: Cleanup legacy code (2026-04-12)

- **Deleted `src/cli/args.ts`** — hand-rolled `parseArgs()` + `getConfig()` parser fully replaced
- **Removed `ParsedArgs` and `CliRuntime` types** from `types.ts` — `CliConfig` is the single config type
- **`buildCliConfig(args)` in `shared.ts`** — single source of truth for CLI config, reads citty's typed args + env vars directly (no re-parsing `process.argv`)
- **Extracted `src/chains.ts`** — `SUPPORTED_CHAIN_IDS`, `CHAIN_NAMES` (from deleted `args.ts`)
- **Extracted `src/cli/validation.ts`** — `parseChainId`, `normalizePrivateKey`, `parseAAProvider`, `parseAAMode` (from deleted `args.ts`)
- **All handler functions** take `CliConfig` directly (no more `runtime.config` destructuring)
- **All def files** use `buildCliConfig(args)` instead of `toCliRuntime()`
- **Updated `commands/aa.ts`** import — `CHAIN_NAMES`/`SUPPORTED_CHAIN_IDS` from `../chains` (was `../args`)
- **Updated test files** — `cli-execution.unit.test.ts` uses `buildCliConfig()`, `cli-session.unit.test.ts` passes `CliConfig` directly, `cli-wallet-sign.unit.test.ts` passes `(config, txIds)` signature
- All 188 tests pass, build clean

### Phase 4: Flatten AA execution (2026-04-12)

- **Removed `"auto"` execution mode** from `CliExecutionMode` — now `"aa" | "eoa"` only
- **Removed `fallbackToEoa`** from `CliExecutionDecision` — AA either works or fails, no silent cascading
- **Deleted `executeTransactionWithFallback()`** (~100 lines) from `wallet.ts` — the 3-layer sponsored→unsponsored→EOA cascade
- **Simplified `resolveCliExecutionDecision()`** from ~80 lines to ~15 lines — just checks if provider is configured
- **Simplified `resolveAAProvider()`** — removed `required` parameter, always throws on missing config when AA requested
- **Removed `sponsored` parameter** from `createCliProviderState()` — no more sponsorship retry logic
- **Removed `isAlchemySponsorshipLimitError` re-export** from `execution.ts` — no longer needed by CLI
- **Updated `resolveExecutionMode()` in `args.ts`** — default is `"eoa"`, `--aa`/`--aa-provider`/`--aa-mode` set `"aa"`
- **Removed sign-flag command guard** from `getConfig()` — citty handles command routing now
- **Exported `CliExecutionDecision` type** from `execution.ts` for external use
- **Updated `tx.ts` defs** — refreshed flag descriptions for `--aa` and `--eoa`
- **Fixed `cli-session.unit.test.ts`** — updated to use `newSessionCommand` (pre-existing break from umbrella removal)
- **Updated all test expectations** — removed `fallbackToEoa`, changed `"auto"` to `"aa"`/`"eoa"`, fixed `sponsored` params
- **Updated `specs/AA-ARCH.md`** — CLI flow, decision type, single-shot sign, `fallback` field vs signing, `--aa-provider` / `--aa-mode` as AA triggers, `executeWalletCalls` + `fallbackToEoa` note for widget vs CLI
- **Made `execution` optional in `CliConfig`** — `undefined` means auto-detect (AA if configured, else EOA)
- **`resolveExecutionMode` returns `undefined`** when no `--aa`/`--eoa` flag (was returning `"eoa"`)
- **`resolveCliExecutionDecision` handles `undefined`** — checks if provider configured, uses AA automatically
- **Added `getAlternativeAAMode()`** — returns the other mode (7702↔4337) for fallback
- **Added mode fallback in `signCommand`** — tries preferred mode, if fails tries alternative, if both fail: hard error with `--eoa` suggestion
- All 189 tests pass, build clean

#### Execution model
| AA configured? | Flag | Result |
|---|---|---|
| Yes | (none) | **AA automatically** (7702 → 4337 fallback) |
| Yes | `--aa` | AA required, same fallback |
| Yes | `--eoa` | EOA, skip AA |
| No | (none) | EOA |
| No | `--aa` | Error: "configure AA first" |

### Spec: AA-ARCH.md refresh (2026-04-11)

- **Updated `specs/AA-ARCH.md`** to match current `packages/client/src/aa/` layout (`alchemy/` and `pimlico/` subpackages, `owner.ts`, dynamic SDK imports in provider `create.ts` files), CLI persistence (`~/.aomi/aa.json`, `aomi aa`, `aomi tx sign`), `AAState` naming, ERC-20 + 4337 mode override, and flattened CLI sign path (no sponsorship/EOA cascade).

### CLI Refactor: citty + noun-verb + AA config (2026-04-11)

- **Adopted citty** as CLI framework, replacing hand-rolled `switch` dispatcher
- **New file `src/cli/root.ts`** — root `defineCommand` with noun-verb subcommands tree
- **New directory `src/cli/commands/defs/`** — citty `defineCommand` wrappers for each noun:
  - `chat.ts`, `tx.ts` (list/simulate/sign), `session.ts` (list/new/resume/delete/status/log/events/close), `model.ts` (list/set/current), `app.ts` (list/current), `chain.ts` (list), `secret.ts` (list/clear/add), `aa.ts` (status/set/test/reset)
- **New file `src/cli/commands/defs/shared.ts`** — global args definition + `toCliRuntime()` bridge adapter
- **New file `src/cli/aa-config.ts`** — persistent AA config in `~/.aomi/aa.json`
- **New file `src/cli/commands/aa.ts`** — AA config command handlers
- **Modified `src/cli/main.ts`** — replaced `main()` switch + `printUsage()` with `runMain(root)` from citty
- **Removed legacy aliases** — no more `aomi sign`, `aomi log`, etc. at top level; use `aomi tx sign`, `aomi session log`
- **Removed umbrella routing** — deleted `sessionCommand`, `modelCommand`, `appCommand`, `chainCommand`, `secretCommand`; defs call leaf handlers directly
- **Extracted leaf handlers** — `newSessionCommand`, `resumeSessionCommand`, `deleteSessionCommand`, `currentAppCommand`, `currentModelCommand`, `setModelCommand`, `listSecretsCommand`, `clearSecretsCommand`
- **Deleted `createRuntime`** from `args.ts`

#### Command surface
```
aomi chat <message>                 Send a message
aomi tx list                        List transactions
aomi tx simulate <id>...            Simulate batch
aomi tx sign <id>...                Sign and submit
aomi session list|new|resume|delete|status|log|events|close
aomi model list|set|current
aomi app list|current
aomi chain list
aomi secret list|clear|add
aomi aa status|set|test|reset
```

### Landing `content/components` + resolve aliases (2026-04-03)

- **Moved** interactive docs-only UI from `apps/landing/src/components/` to **`apps/landing/content/components/`** (playground, samples, **`examples/`** (API consoles + collapsible demos), layout). Collapsible demo, playground, and widget demo use **`backendUrl = "/"`** (same-origin proxy).
- **`app/mdx-components.tsx`** — playground/samples from `@/content/components/...`; sessions/system consoles from **`@/components/examples/...`**.
- **`apps/landing/next.config.ts`** — `@/components` → **`apps/registry/src/components`**; **`@/components/examples`** → **`content/components/examples`** (must precede `@/components` in alias maps); **`@/content`** → `./content`.
- **`apps/landing/tsconfig.json`** — **`@/components/examples/*`** → `./content/components/examples/*` (before `@/*`); **`@/content/*`** → `./content/*`.
- **`content/examples/*.mdx`** — API console imports use **`@/components/examples/...`** (former `api-console/` folder removed; files live next to `aomi-frame-collapsible`, etc.).
- **Guide MDX** uses `@/components/...` for widget UI → **registry**, except **`@/components/examples/*`** → **content** examples.
- **Deleted `apps/landing/src/mdx-provider.tsx`** — unused stub; MDX uses **`app/mdx-components.tsx`**.

### Aomi wallet adapter rename (2026-04-03)

- **`apps/registry/src/lib/wallet-adapter.ts` → `aomi-auth-adapter.ts`** — auth adapter exports now use the `AomiAuth*` naming surface consistently.
- **Registry** — item `wallet-adapter` renamed to **`aomi-auth-adapter`**; install URL is now `https://aomi.dev/r/aomi-auth-adapter.json` (rebuilt `apps/registry/dist/` → `apps/landing/public/r/`).
- **`apps/registry/scripts/build-registry.js`** — clears `dist/` before writing so renamed/removed registry items do not leave stale `*.json` artifacts.

### Landing cleanup (2026-04-03)

- **Deleted `apps/landing/src/components/wallet-providers.tsx`** — unused; hero uses `LandingParaProvider` instead.
- **Deleted `apps/landing/src/components/config.tsx`** — only imported by the removed wallet providers file.

### Registry file renames (2026-04-03)

- **`control-bar/wallet-connect.tsx` → `connect-button.tsx`** — public surface is now `ConnectButton` / `ConnectButtonProps`.
- **`wallet-tx-handler.tsx` → `runtime-tx-handler.tsx`** — public surface is now `RuntimeTxHandler`. Registry item slug **`wallet-tx-handler` → `runtime-tx-handler`** (shadcn URL is now `https://aomi.dev/r/runtime-tx-handler.json`).
- **`apps/registry/src/registry.ts`** — updated `control-bar` file list, `aomi-frame` registry dependency, and runtime handler entry.
- **Rebuilt `apps/registry/dist/`** and synced to `apps/landing/public/r/`.

### Wallet Bridge Architecture (2026-04-03)

- **New file `apps/registry/src/lib/aomi-auth-adapter.ts`** — extracted `AomiAuthAdapter`, `AomiAuthAdapterContext`, `AOMI_AUTH_DISCONNECTED_ADAPTER`, `AomiAuthAdapterProvider`, and `useAomiAuthAdapter()`.
- **New file `apps/landing/app/components/landing-aomi-auth-bridge.tsx`** — `LandingAomiAuthBridge` runs inside the Para provider tree, reads wagmi + Para auth hooks, and writes `AomiAuthAdapterContext`.
- **New file `apps/landing/app/components/landing-para-provider.tsx`** — `LandingParaProvider` wraps `ParaProvider` + `LandingAomiAuthBridge` with all Para SDK config (apiKey, env, chains, wallets, oAuth).
- **Modified `apps/registry/src/components/aomi-frame.tsx`** — removed `AomiAuthAdapterProvider` wrapper and `adapter` prop from `Root`. Widget now reads from `AomiAuthAdapterContext` provided by an ancestor bridge.
- **Modified `apps/landing/app/sections/hero.tsx`** — wrapped `AomiFrame.Root` with `LandingParaProvider`.
- **Modified consumer imports** — `connect-button.tsx`, `runtime-tx-handler.tsx`, `network-select.tsx`, `account-identity.ts` now import from `lib/aomi-auth-adapter` (relative paths).
- **Updated `apps/registry/src/index.ts`** — exports the `AomiAuth*` auth adapter and identity surface.
- **Updated `apps/registry/src/registry.ts`** — replaced `aomi-adapter-provider` entry with `aomi-auth-adapter` + `aomi-auth-sync-bridge` entries.
- **Deleted `apps/registry/src/components/aomi-adapter-provider.tsx`** — replaced by `lib/aomi-auth-adapter.ts`.
- **Deleted `apps/registry/src/components/para-adapter-provider.tsx`** (564 lines) — replaced by the host-side `LandingAomiAuthBridge` + `LandingParaProvider`.
- **Modified `apps/registry/package.json`** — removed `@getpara/react-sdk`, `@getpara/react-core`, `@getpara/evm-wallet-connectors` from deps; added `@getpara/react-sdk` as optional peer dep.
- **Fixed Para modal not opening** — `ParaProviderMin` gates both children AND `ParaModal` behind `isReady` (which never fires due to Zustand store duplication). Fix: render `ParaModal` outside `ParaProviderMin` wrapped in `ParaProviderCore` (from `@getpara/react-core/internal`) with `waitForReady: false` + `AuthProvider` (from `@getpara/react-sdk-lite` internal dist, accessed via turbopack alias `@para-internal/auth-provider`). This provides both `CoreStoreContext` and `AuthContext` that `ParaModal` requires for OAuth/phone/wallet auth flows. Added corresponding turbopack + webpack aliases in `next.config.ts`.

### AA Consolidation (2026-03-22)

- **New files in `packages/client/src/aa/`:**
  - `env.ts` — unified env var reading (`readEnv`, `readGasPolicyEnv`, `isProviderConfigured`, `resolveDefaultProvider`) with `publicOnly` flag for browser-safe vs CLI usage
  - `adapt.ts` — `adaptSmartAccount()` (bridges `@getpara/aa-*` SDK shapes to `AALike`), `isAlchemySponsorshipLimitError()`, `ParaSmartAccountLike` type
  - `resolve.ts` — `resolveAlchemyConfig()` and `resolvePimlicoConfig()` with `modeOverride`, `publicOnly`, `throwOnMissingConfig` options
  - `create.ts` — `createAAProviderState()` async smart account creation (only file importing `@getpara/aa-alchemy`/`@getpara/aa-pimlico`)
- **Refactored `src/aa/alchemy.ts`** — removed private `resolveAlchemyProviderConfig()` and `readPublicEnv()`, now delegates to `resolveAlchemyConfig({ publicOnly: true })`
- **Refactored `src/aa/pimlico.ts`** — same treatment, delegates to `resolvePimlicoConfig({ publicOnly: true })`
- **Simplified `src/cli/execution.ts`** — deleted ~200 lines of duplicated AA logic (`ParaSmartAccountLike`, `readFirstEnv`, `isProviderConfigured`, `resolveDefaultProvider`, `resolveAAProvider`, `resolveAAPlan`, `adaptSmartAccount`, `createAlchemyProviderState`, `createPimlicoProviderState`, `isAlchemySponsorshipLimitError`). Now delegates to `../aa` for all AA operations.
- **Updated `src/aa/index.ts`** — added exports for env, adapt, resolve, create modules
- **Updated `src/index.ts`** — added public API exports for new AA symbols
- **New test files:** `aa-env.unit.test.ts`, `aa-adapt.unit.test.ts`, `aa-resolve.unit.test.ts`, `aa-create.unit.test.ts`
- All 79 tests pass, library builds, lint clean

### Docs Directory Restructure Phase 7 (2026-03-04)

- **Sub-task A: Dedup reference pages**
  - Removed `### Message Processing` sequence diagram section from `reference/architecture.mdx` (duplicates `build/how-it-works.mdx`)
  - Removed `ChatAppBuilder` flowchart mermaid block from `reference/sdk.mdx` (duplicates `build/building-apps.mdx`)
- **Sub-task B: Updated routing and nav files**
  - Changed default redirect in `app/docs/[[...slug]]/page.tsx` from `/docs/getting-started/overview` to `/docs/build/overview`
  - Updated all 16 legacy redirects to point to new `/docs/build/` and `/docs/use-aomi/` paths
  - Added 19 new redirects for restructured paths (getting-started/*, core-concepts/*, integration/*, telegram/*)
  - Updated both `navLinks` and `navTabs` in `layout-config.tsx` to `/docs/build/overview`
- **Sub-task C: Updated internal links across all documentation pages**
  - Updated links in 8 persistent `.mdx` files: namespaces, api-reference, sessions, widget/configuration, reference/runtime, headless/runtime-provider, headless/install, widget/aomi-frame
  - All `/docs/core-concepts/*` links → `/docs/build/*`
  - All `/docs/getting-started/*` links → `/docs/build/*`
  - All `/docs/integration/*` links → `/docs/build/*`
  - All `/docs/guides/integration/*` links → `/docs/build/*`
  - All `/docs/guides/telegram/*` links → `/docs/use-aomi/telegram/*`
- **Sub-task D: Deleted old directories and files**
  - Deleted 13 files via `git rm`: getting-started/{overview,for-businesses,quickstart,meta.json}, core-concepts/{how-it-works,meta.json}, integration/{overview,meta.json,widget/install,widget/meta.json,headless/meta.json}, telegram/{overview,meta.json}
  - Removed 6 empty directories: getting-started/, core-concepts/, integration/widget/, integration/headless/, integration/, telegram/

### Docs Directory Restructure Phase 6 (2026-03-04)

- Created `apps/landing/content/guides/use-aomi/overview.mdx` -- Getting Started page for end users (what Aomi assistants are, chat experience, threads, wallet, where to use)
- Created `apps/landing/content/guides/use-aomi/web-chat.mdx` -- Web Chat guide (sending messages, streaming, tool calls, thread management, control bar, wallet connection, tips)
- Created `apps/landing/content/guides/use-aomi/telegram/overview.mdx` -- Telegram Bot overview rewrite (rewrote existing `telegram/overview.mdx` for end users, removed architecture diagram and panel router internals, added Getting Started section, links to sub-pages)
- Created `apps/landing/content/guides/use-aomi/faq.mdx` -- FAQ page (8 questions: tool calls, wallet safety, wallet-optional usage, models, threads, refusals, reporting problems, data access)
- All 4 pages already listed in existing `use-aomi/meta.json` from Phase 1

### Docs Directory Restructure Phase 5 (2026-03-04)

- Moved `core-concepts/building-apps.mdx` to `build/building-apps.mdx` via `git mv`
- Edited `building-apps.mdx`: removed AomiTool trait table and AomiBackend trait code block/paragraph (SDK overlap)
- Added SDK Reference callout notes where trait details were removed
- Updated Next Steps links to `/docs/build/` and `/docs/reference/` paths
- Moved `telegram/admin.mdx` to `build/telegram-bot.mdx` via `git mv`
- Reframed as "Telegram Bot Setup" for developers deploying the bot for their product
- Updated frontmatter (title: "Telegram Bot Setup", description: "Configure and deploy the Telegram bot for your product.")
- Reframed intro, section headers (Development/Production), added Next Steps with `/docs/build/` links
- Already listed in `build/meta.json` at correct positions

### Docs Directory Restructure Phase 4 (2026-03-04)

- Created `apps/landing/content/guides/build/how-it-works.mdx` by merging:
  - `core-concepts/how-it-works.mdx` (technical pipeline: mermaid diagrams, endpoint table, sequence diagram, SSE format, step-by-step walkthrough, "What Aomi Manages" table)
  - `getting-started/for-businesses.mdx` (narrative tone, "What MyCoinDex Gets" summary table, integration code snippets)
- Structural base: `how-it-works.mdx` (better technical flow with pipeline + sequence diagrams)
- Absorbed from `for-businesses.mdx`: narrative opening tone, capability summary table
- Merged "What MyCoinDex Gets" and "What Aomi Manages" into single "What You Get" table with Capability/Details/Managed By columns
- Removed: Step 6 "Integrate Into Your Product" (covered by quickstart and widget/headless pages), duplicated 4-endpoint API table (kept 5-endpoint version), duplicated preamble/model sections
- Added SSE event types table alongside the existing stream format code block
- All Next Steps links updated to `/docs/build/` paths
- Already listed in `build/meta.json` at position 3

### Docs Directory Restructure Phase 3 (2026-03-04)

- Created `apps/landing/content/guides/build/quickstart.mdx` by merging:
  - `getting-started/quickstart.mdx` (end-to-end quickstart flow: prereqs, install, env vars, add to page, configure API key, run, customizing layout)
  - `integration/widget/install.mdx` (what gets installed file tree, registry architecture, namespace configuration, updating components)
- Absorbed "What Gets Installed" (npm packages + file tree), "Registry Architecture" (three sources table + diagram), "Namespace Configuration" (shorthand via components.json), "Updating Components" (--overwrite + git diff)
- Collapsed "Philosophy" section into single sentence in Registry Architecture section
- Merged "Run Your App" and "What You Should See" into one section
- All Next Steps links updated to `/docs/build/` paths
- Already listed in `build/meta.json` at position 2

### Docs Directory Restructure Phase 2 (2026-03-04)

- Created `apps/landing/content/guides/build/overview.mdx` by merging:
  - `getting-started/overview.mdx` (What is Aomi framing, How It Works diagram, Key Features, Platform Support)
  - `integration/overview.mdx` (Widget vs Headless comparison, Shared Foundation, Choosing a Path)
- Merged two separate integration path tables into a single comprehensive 3-column comparison (Widget, Headless, Telegram)
- Developer-focused tone, removed end-user-facing language
- All links updated to new `/docs/build/` paths

### Docs Directory Restructure Phase 1 (2026-03-04)

- Created new directory structure under `apps/landing/content/guides/`:
  - `use-aomi/` and `use-aomi/telegram/`
  - `build/`, `build/widget/`, `build/headless/`
- Moved 15 unchanged pages via `git mv`:
  - 4 widget files: `integration/widget/` -> `build/widget/`
  - 4 headless files: `integration/headless/` -> `build/headless/`
  - 3 core-concepts files: `core-concepts/{namespaces,sessions,api-reference}.mdx` -> `build/`
  - 1 integration file: `integration/wallet-integration.mdx` -> `build/`
  - 3 telegram files: `telegram/{commands,panels,wallet}.mdx` -> `use-aomi/telegram/`
- Created 5 new `meta.json` files: `use-aomi/`, `use-aomi/telegram/`, `build/`, `build/widget/`, `build/headless/`
- Updated root `meta.json` with new two-section layout (Use Aomi / Build with Aomi)
- Old directories preserved (remaining files handled in later phases)
- No file content modified (link updates happen in later phases)

### Playground Theme Customizer & Radius Unification (2026-03-03)

- **Theme customizer** added to `/playground/configurator` as a "Theme" tab alongside "Layout"
  - 12 curated presets (Default, Modern Minimal, Violet Bloom, Ocean Breeze, Claude, Cyberpunk, Midnight Bloom, Catppuccin, Nature, Amber Minimal, Supabase, Mono)
  - Light/dark mode toggle (scoped to preview only via `.dark` class)
  - Radius slider (0–2rem) controlling all widget border-radius tokens
  - Collapsible color overrides with native color pickers
  - Generated Theme CSS export (`:root` + `.dark` blocks with OKLCH values)
- **New files**: `lib/color-convert.ts`, `lib/theme-presets.ts`, `lib/theme-utils.ts`, `src/components/playground/ThemeCustomizer.tsx`
- **Modified**: `PlaygroundConfigurator.tsx` — tabbed config (Layout|Theme) + tabbed code output (JSX|CSS)

#### Radius unification refactor
- **`default.css`** — extended `@theme inline` with `--radius-2xl`, `--radius-3xl`, `--radius-4xl` tokens (calc offsets from `--radius`)
- **`theme-utils.ts`** — `themeToStyleObject` now sets all 7 radius tokens (`sm` through `4xl`) as inline style overrides
- **`thread-list.tsx`** — "New Chat" button and thread list items changed from `rounded-full` → `rounded-3xl`
- **`connect-button.tsx`** — account connect button changed from `rounded-full` → `rounded-3xl`
- **`attachment.tsx`** — attachment tiles changed from `rounded-[14px]` → `rounded-xl`
- Components using `rounded-3xl`/`rounded-4xl` (suggestion cards, composer, frame wrapper) now automatically use the new tokens
- `rounded-full` kept on intentionally circular elements (send/cancel buttons, avatars, control bar pills)

### Landing Page — DeFi & X API Consoles (2026-03-01)

- **`DefiConsole.tsx`** — 9 accordion endpoints covering DefiLlama (prices, yields, protocols, chain TVL, bridges), 0x swap quotes, LI.FI cross-chain quotes, and CoW Protocol (quote + order submission)
- **`XConsole.tsx`** — 5 accordion endpoints for X API v2: user lookup, user posts, search, trends, and single post retrieval. All require Bearer token auth.
- **`defi-aggregators.mdx`** — replaced stub with intro text + `<DefiConsole />`
- **`x-apis.mdx`** — replaced stub with intro text + `<XConsole />`
- **`app/api/proxy/route.ts`** — expanded CORS proxy allowlist with DefiLlama hosts (`coins.llama.fi`, `yields.llama.fi`, `api.llama.fi`, `bridges.llama.fi`), aggregator hosts (`api.0x.org`, `li.quest`, `api.cow.fi`), and X API (`api.x.com`)
- **`ApiDrawer.tsx`** — normalized vertical padding (`py-3`) across description, URL bar, and response header sections

### Thread-Scoped Control State (2026-02-02)

- **`ThreadMetadata`** now includes a `control` field with `ThreadControlState`
- **`ThreadControlState`** stores per-thread control configuration:
  - `model: string | null` - selected model for this thread
  - `namespace: string | null` - selected namespace for this thread
  - `controlDirty: boolean` - whether control changed but chat hasn't started
  - `isProcessing: boolean` - whether thread is currently generating (disables controls)
- Model/namespace selections are now **thread-scoped** - switching threads restores previous selections
- `isProcessing` wired from orchestrator → thread metadata → control context → UI components
- Control dropdowns disabled while assistant is generating

### Control Context API Updates

- Removed `isProcessing` prop (now derived from thread metadata)
- Added `getCurrentThreadControl()` to get current thread's control state
- Added `onNamespaceSelect(namespace)` for per-thread namespace changes
- `onModelSelect(model)` now updates thread metadata + calls backend
- Added `markControlSynced()` to clear dirty flag after chat starts
- Global state: `apiKey`, `availableModels`, `authorizedNamespaces`, `defaultModel`, `defaultNamespace`
- Per-thread state: `model`, `namespace`, `controlDirty`, `isProcessing` (in ThreadMetadata)

### Control Context Refactor (2025-01-30)

- Added `ControlContextProvider` for model/namespace/apiKey management
- Model selection is backend-only via `onModelSelect(model)` - not stored in global client state
- Auto-fetches namespaces on mount and when apiKey changes
- ApiKey persisted to localStorage automatically
- Added Control API to `AomiClient`: `getNamespaces()`, `getModels()`, `setModel()`

### Control Bar Components

- `ModelSelect` - reads model from thread control state, calls `onModelSelect()` on selection
- `NamespaceSelect` - reads namespace from thread control state, calls `onNamespaceSelect()` on selection
- `ApiKeyInput` - uses `setApiKey()` for updates
- Both disabled when `isProcessing` is true

### Runtime Modularization

- Split `aomi-runtime.tsx` into shell (50 lines) + `core.tsx` (runtime logic)
- Extracted `threadlist-adapter.ts` for thread list operations
- `orchestrator.ts` now receives `aomiClient` instance instead of URL
- `ControlContextProvider` receives `getThreadMetadata` and `updateThreadMetadata` from thread context
- Core syncs `isRunning` → `threadMetadata.control.isProcessing`

### Event System

- Added `EventContextProvider` for inbound/outbound system events
- Added `UserContextProvider` for wallet/user state (replaces local state)
- Wallet state changes auto-synced via `onUserStateChange` subscription
- Handler hooks: `useWalletHandler()`, `useNotificationHandler()`

### API Simplification

- Removed `publicKey` prop from `AomiRuntimeProvider`
- Removed `WalletSystemMessageEmitter` component
- Removed `AomiRuntimeProviderWithNotifications` (use `AomiRuntimeProvider`)
- User address obtained from `useUser().user.address` internally

### Backend Compatibility (merged from codex branch)

- Added `tool_stream` field to `AomiMessage`
- Added `rehydrated`, `state_source` fields to `ApiStateResponse`
- System events use tagged enum format: `{ InlineCall: { type, payload } }`

### Apps Updated

- `apps/registry/src/components/aomi-frame.tsx` - uses new API
- `apps/registry/src/components/aomi-frame-collapsible.tsx` - uses new API
- `apps/registry/src/components/control-bar/` - uses thread-scoped control state

## Provider Structure

```
AomiRuntimeProvider
└── ThreadContextProvider
    └── NotificationContextProvider
        └── UserContextProvider
            └── ControlContextProvider (receives getThreadMetadata, updateThreadMetadata)
                └── EventContextProvider
                    └── AomiRuntimeCore (syncs isRunning → threadMetadata.control.isProcessing)
                        └── AssistantRuntimeProvider
```

## Data Flow

### Thread Control State Flow

```
User selects model/namespace
        ↓
ModelSelect/NamespaceSelect onClick
        ↓
onModelSelect(model) / onNamespaceSelect(namespace)
        ↓
updateThreadMetadata(threadId, { control: { ...control, model/namespace, controlDirty: true } })
        ↓
(for model) aomiClient.setModel(sessionId, model, namespace)
        ↓
Backend stores model selection for session
```

### isProcessing Flow

```
Backend responds / assistant generating
        ↓
orchestrator detects isRunning change
        ↓
core.tsx useEffect syncs to threadMetadata.control.isProcessing
        ↓
ControlContextProvider reads from getThreadMetadata(sessionId).control.isProcessing
        ↓
ModelSelect/NamespaceSelect get isProcessing from useControl()
        ↓
Controls disabled while isProcessing === true
```

## Pending

- End-to-end testing of wallet tx request flow
- SSE event handling verification (SystemNotice, AsyncCallback)
- E2E verification of control flow: apiKey → namespaces → model selection
- Thread list should show model/namespace per thread (optional enhancement)

## Notes

- `WalletFooterProps` still works - `wallet`/`setWallet` map to `user`/`setUser`
- `WalletButtonState` type alias kept for backwards compatibility
- Specs are designed for new agents to quickly understand the codebase
- `useControl()` hook provides access to control state and actions
- Control bar components get all data from context (no props needed)
- New threads initialize with `createDefaultControlState()` (null model/namespace)
- Thread switching restores the thread's previous model/namespace selection
