# Current State

## Last Updated

2026-07-19 (evening) — /build sandbox-mode: FULLY GREEN CLOUD RUN.
  `smither-defillama-ea2a9cba…` completed all five stages in a real Vercel
  Sandbox booted from the rust-1.92 image: binaries ✓ codegen (kept
  existing sources) ✓ curate (real analysis: caught a dangling
  `defillama_get_yield_pool_history` tool reference) ✓ validate ✓ result ✓
  — run status `completed`, curation + result served by the BFF from the
  shared store. Phase 1–3 acceptance fully demonstrated on real infra.
  (Empty fileTree / 409 download for sandbox runs remain the known Phase-4
  gap.) Two more operational facts confirmed on the way: a stale
  VERCEL_OIDC_TOKEN (12 h life) makes Sandbox.create succeed but the VM
  die silently before its first store write — refresh with `vercel env
  pull` before dispatching; and the lazy keepalive is real — a run watched
  only via direct store reads (bypassing the BFF poll path) lets its
  sandbox lapse at the 5-minute create ceiling mid-stage, exactly the
  documented abandoned-run behavior. Test rig torn down (BFF :3210, ngrok
  tunnel, throwaway Postgres :5455).


2026-07-19 — /build ship: FIRST real Vercel sandbox-mode dispatch, chain
  verified end-to-end on actual Vercel infra (PR #370 carries it all).
  Golden image (debian:bookworm-slim, linux/amd64+zstd) pushed to VCR
  (`build-runner:e2e-test`, ~1 GB, Ready) → `Sandbox.create({image})` boots a
  real microVM → `run-plan` on Bun → binaries ✓ codegen ✓ claude curate
  agent ✓ validate ✓, run state flowing to Postgres with the BFF observing.
  Fix chain to get there (each its own commit): deterministic run-plan
  sanity probe; VCR's 500 MB compressed-layer cap (slimmed cargo layer;
  filtered `pnpm install --filter "@aomi-labs/smither..."`; CI=true prod
  re-install; explicit pnpm-store rm — `$(pnpm store path)` expanded empty
  and silently shipped 1.5 GB); Node from official tarball (nodesource
  stopped shipping npm); codegenStep re-derives plan source at execution
  time (sandbox plans compose as "discover", so committed apps hit remote
  gen-specs and failed); IS_SANDBOX=1 in dispatch env (claude CLI refuses
  skip-permissions as root). Final run settled "failed: validate-loop
  reached maxIterations 3" — forensics show the IMAGE was the defect, not
  the crate: minimal rustup profile lacked rustfmt (round 0) and clippy
  (round 1), and rustc 1.88 < aomi-sdk's rust-version 1.91 (round 2); the
  repair agent spent all rounds fixing the toolchain by hand. Dockerfile
  now: rust 1.92.0 + rustfmt/clippy components (rebuild + green-run rerun
  pending). Resilience findings REPORTED, not yet fixed (Cecilia to route:
  this PR vs follow-ups): (1) engine pg client never reconnects after a
  connection blip (ngrok hiccup bricked BFF reads until restart, twice);
  (2) sandbox run-id reuse is process-local registry — BFF restart mints
  new run ids instead of resuming (same disease as the fixed run.json bug;
  store should be the lookup); (3) cancel of a dead-sandbox run wedges the
  app on that instance (stopSandbox kills the engine before it settles the
  store status). Session housekeeping: 41 MB of .smithers run state is
  committed on MAIN (separate cleanup task spun off; image just rm's it);
  vercel CLI 54→56.3.2 (for `vercel vcr login docker`); headless agent
  billing = SMITHER_ANTHROPIC_API_KEY (renamed from AOMI_BUILDER_API_KEY)
  so sandbox runs never share the interactive Claude subscription quota.


2026-07-17 (night) — smithers-orchestrator 0.27.0 → 0.28.0 upgrade (in tree,
  unverified tail): packages/smither now `^0.28.0` + effect pinned 3.21.4;
  bun-compat drops the `Bun.which: () => null` polyfill (0.28's resolveBinary
  trusts a function-typed `which` with no PATH fallback — the stub broke
  git/claude resolution; `Bun.sleep` kept as cheap insurance); raw-TS loader
  hooks STILL required on 0.28.0 (plain-JS packaging lands only in releases
  after it). Verified: smither build + 73/73, aomi-build type-check + 229/229
  + lint, and on the two-instance Postgres E2E the compute stages
  (binaries/codegen) complete under Node with cross-instance observation
  intact. Found+fixed a 0.28 delta: engine settles quota-hit runs as new
  status `waiting-quota` (retries preserved, later create resumes) — wire
  mapping moved it running→failed (run-view.ts) so pages don't show an
  eternal spinner; in-memory engine.ts mapping already agreed. PARKED_STATUSES
  comment notes 0.28's `paused` (we never pass pauseSignal).
  Preserved-retry resume CONFIRMED after the quota window reset (~01:21am):
  re-creating the same app minted no new run id, resumed straight into
  `curate` (not a redo of binaries/codegen), and made a genuine retry
  attempt — smithers 0.28's "retries are preserved" holds. That attempt
  immediately hit a *fresh* 5-hour quota wall (resets ~2026-07-18 06:20
  local), because this session's own research work billed against the same
  Claude subscription the curate agent uses — not a code issue.
  REMAINING to verify: an agent step actually completing (either wait out
  the new window, or set SMITHER_ANTHROPIC_API_KEY so headless runs bill an API
  key instead of sharing the interactive subscription quota — recommended
  before the next verification pass), the Bun TUI/console surfaces, and a
  golden-image rebuild + sandbox-mode dispatch on 0.28.
  Upgrade audit report (API-surface diff, per-step risk):
  scratchpad smither-on-vercel-report.md + subagent findings; fallback = pin
  back to 0.27.0, store schema read-compatible both ways.


2026-07-17 (evening) — /build ship verification pass over the uncommitted
  Phase 1–3 work + golden-image base swap. (1) Fixed a statelessness bug the
  cross-instance E2E caught on a REAL fresh Postgres (14 on :5455, not the
  PGlite socket stand-in): prepareRun trusted the local run.json pointer and
  resumed a run id the shared store never had → smithers RUN_NOT_FOUND crash;
  prepareRun now checks the store (storeHasRun via SmithersDb.getRun) and a
  stale pointer falls back to a fresh run + rewritten run.json
  (packages/smither/src/run.ts). (2) E2E re-verified end-to-end: create on
  instance A (:3210), instance B (:3211, NEXT_DIST_DIR=.next-b) served
  status/stages mid-run and, at settle, curation, result, fileTree AND the
  crate tarball download (200, 50 KB) for a run it never executed; cancel
  route from B returns ok (run had already completed — cancel-mid-run was
  proven in the Phase 2 pass). (3) Golden image: Vercel Sandbox custom-image
  docs confirm images are plain OCI from VCR with NO base-OS constraint
  (only linux/amd64 manifest; ENTRYPOINT/CMD ignored; WORKDIR honored) — the
  AL2023 assumption was wrong, base swapped to debian:bookworm-slim
  (dnf→apt) and README push flow corrected to
  `docker buildx build --platform linux/amd64` + zstd (a plain build on an
  ARM Mac lands as `Unoptimized` in VCR and Sandbox rejects it; wait for
  `Ready`, else image_not_ready). Full sweep green after the fix: smither
  build + 73/73 tests, aomi-build type-check + 229/229 tests + lint.

2026-07-17 — /build ship Phase 3 (review-ready; real provisioning blocked on
  Vercel/API-key decisions): SandboxRunner. BFF dispatches
  `aomi-smither run-plan --plan-b64 … --run-id …` into a Vercel Sandbox
  booted from the golden image (infra/build-runner/{Dockerfile,README.md}:
  AL2023 + Rust + Bun + Node + claude CLI + pinned aomi-sdk with prebuilt
  release binaries + built smither package). AOMI_BUILD_RUNNER=vercel-sandbox
  branch in the engine (composePlan sdkRoot override, pre-allocated run id,
  settled-app re-create reuses the run id so run-plan resumes from store
  state); serverless keepalive = lazy extendTimeout from the poll path;
  cancel = durable store write + best-effort sandbox stop. @vercel/sandbox
  behind an injectable SandboxClientLike seam (sandbox-runner.ts, 4 tests
  with a fake client; SDK v2.7 API verified from the published types).
  run-plan now resumes when the shared store already knows the run id even
  with no local run.json (fresh-sandbox continuation). Local runner
  regression E2E green after the refactor (5/5 stages, curation present).
  Sandbox-mode known gaps (Phase 4): Files panel/download read local fs —
  empty for sandbox runs; cross-instance sandbox extend/stop and quotas need
  the build_runs registry decision; sandbox-mode plans always use discover
  (server can't stat the image's apps/).

2026-07-17 — /build ship Phase 2 (specs/BUILD-SHIP-E2E-PLAN.md): runner seam.
  packages/smither: `aomi-smither run-plan` headless subcommand (--plan/
  --plan-b64 JSON, optional pre-allocated --run-id via createRunState/
  prepareRun runId option) — smoked on Bun (resume replay, exit 0; custom
  run-id lands in run.json); `requestRunCancel` (durable
  cancel_requested_at_ms write the engine polls — cancel works from any
  process); makeWorkAgent takes apiKey, wired from SMITHER_ANTHROPIC_API_KEY so
  headless runners bill an API key instead of a CLI login. BFF: Runner seam
  (AOMI_BUILD_RUNNER, LocalRunner today, SandboxRunner = phase 3 slot),
  cancelBuildRun + POST /api/bff/build/runs/cancel, Esc on the page cancels
  the real run. Cancel E2E verified against shared Postgres: store status
  `cancelled`, codegen node cancelled mid-flight. Note: wire status maps
  cancelled→failed (no distinct wire state yet — P1 polish).

2026-07-16 — /build ship Phase 1 (specs/BUILD-SHIP-E2E-PLAN.md): stateless
  BFF over the durable store. packages/smither gains readRunView (run status
  + per-node states from _smithers_runs/_smithers_nodes + outputs) and
  prepareRun accepts a shared api handle; the BFF snapshot now derives
  status/stages/curation/result from the store every poll (live reducer is
  garnish), one store handle per app (PGlite can't double-open), and a
  registry miss reconstructs an observer handle from the store
  (reconstructBuildRun — recomposed plan, no filesystem). Pure derivation in
  server/bff/build/run-view.ts (+6 tests). Acceptance verified: two dev
  instances over one shared Postgres (PGlite socket stand-in on :15432) —
  create on A, poll on B mid-run and at settle; B served stages, curation,
  result, fileTree for a run it never executed. next.config distDir is
  NEXT_DIST_DIR-overridable for multi-instance local testing.
  Pending decision: build_runs registry table home (dedicated PG vs backend
  Supabase) — needed for Phase 2 runner bookkeeping.

2026-07-16 — /build P0 honest artifacts (gap map: specs/BUILD-PAGE-WIRING-GAP.md):
  engine snapshot now carries the real crate file tree (walk of
  sdkRoot/apps/<app>, target/ excluded), the curate agent's structured
  report (loadRunOutputs reads curation/result rows — covers replayed
  resumes), and per-stage transition times; completion message = curation
  summary + followUps verbatim; download = crate tarball route
  (GET /api/bff/build/runs/download) wired to the Ship banner button;
  mock artifacts swapped to the real Rust crate shape (Cargo.toml,
  openapi.yaml, src/{lib.rs,client/,tool.rs}, test.json) — flow unchanged.
  Verified E2E in-browser against the resumed geckoterminal run.

2026-07-16 — /build E2E verified in-browser against a REAL smither run
  (geckoterminal: binaries → codegen → curate via live Claude agent →
  validate-loop cargo → result; resume replay lands the page on Ship). Fixes
  found by the E2E: workflow.tsx ok/green checks must be truthy not `=== true`
  (booleans round-trip as 0/1 through the store); bun-compat gained a minimal
  `Bun` global polyfill (sleep/which, no `version` so isBunRuntime stays
  honest) and a functional node:sqlite-backed bun:sqlite shim (the engine's
  single-runner opens an in-memory scratch sqlite on every backend); engine
  maps RunStatus "finished"/"continued" (not "completed"), captures
  result.error, backfills stage statuses on replayed completed runs, and
  auto-resumes settled apps on re-POST;
2026-07-16 — /build wired to real aomi-smither (flagged): smithers-orchestrator
  0.26.1→0.27.0 (Node ≥22 + pglite/postgres backends via new SmitherBackend
  seam in packages/smither run.ts/workflow.tsx; SMITHER_DATABASE_URL wins,
  Bun keeps bun:sqlite, Node falls back to per-app PGlite); aomi-build BFF
  build engine (src/server/bff/build/engine.ts + routes; POST/GET
  /api/bff/build/runs, POST /api/bff/build/runs/decision; GitHub session +
  origin + rate-limit gated; autoApprove default until UI renders approvals);
  Node loader hooks for Bun-flavored smithers sources (src/instrumentation.ts
  + src/server/bun-compat.ts; serverExternalPackages in next.config.ts);
  use-build-session drives the real engine when NEXT_PUBLIC_BUILD_ENGINE=
  smither (poll → smither-run-mapper.ts, mock pipeline unchanged by default);
2026-07-16 — Bots page 404 root-caused to product-mono edge routing;
2026-07-16 — Environment tab: unified Variables list (declared slots + configured, `*` = required);
2026-07-16 — PR #358 (+): env-aware default chat host (prod → chat.aomi.dev,
  preview/dev → chat-staging.aomi.dev; NEXT_PUBLIC_CHAT_URL still overrides);
2026-07-14 — Account menu: Docs (aomi.dev/docs) + Home page links (Vercel-style);
2026-07-14 — Build P2 deep-link polish (⌘K / Billing / Overview → right tab);
2026-07-14 — Create stack #343–#349 merged to main (left #340);
2026-07-14 — Create Recent rail UX: one Create-header toggle (no double collapse);
2026-07-14 — Create Recent rail: user open/collapse + localStorage (⌘B);
2026-07-14 — Create composer: UI-only model picker mock (Aomi + Soon);
2026-07-14 — Create templates: Browse all opens a sheet;
2026-07-14 — Create mobile: hide Plan steps when Progress is in-thread;
2026-07-14 — Create Recent titles: derive + dedupe (hello → unique);
2026-07-14 — Create craft polish tranche (rail/empty/chat/stage/composer);
2026-07-14 — Create craft review: jargon migrate + canvas;
2026-07-14 — Create UI: builder language (no eng keywords in chat/sidebar);
2026-07-14 — AI Builder P3 (#344): nodes + compile/aomi-run (review local first);
2026-07-14 — AI Builder P0–P2 (#343): Create craft on /build;
2026-07-14 — AI Builder P1 craft port: mock layout feel in ControlPlaneShell
  (composer, stream, files, ship→Projects, in-page history; local mock timers);
2026-07-14 — AI Builder P1: intent composer + templates + local session;
2026-07-14 — AI-BUILDER-EXPERIENCE.md (Create / chat-mock port plan);
2026-07-14 — Build AI Builder: enable sidebar Build + `/build` scaffold;
2026-07-13 — Build P2 usage peek (Home meter → Operate Usage);
2026-07-13 — Build P2 Deployments timeline (history that reads as history);
2026-07-13 — Build Live status consistency (one story across list/Home/Deployments);
2026-07-13 — Build P2 Project home (live / keys / Open Chat / usage glance);
2026-07-13 — Build P1 control plane: ⌘K, toasts, Projects landing, glossary;
2026-07-13 — Build P0 trust: Soon labels, gate Integrations Save, human errors;
2026-07-13 — Build UI copy polish (em dashes / hedging essays);
2026-07-13 — Billing option A: methods live on Chat (no fake Build fetch);
2026-07-13 — BILLING-EXPERIENCE.md: backend ↔ UI map (code-checked)

2026-07-13 — Fixed required-secrets gate fail-open (P1, external review)

## Bots page `list_user_source_bots failed (404)` fix (2026-07-16)

- Cause was NOT in this repo: the dev edge proxy (product-mono
  `scripts/dev-edge-proxy.mjs`, which imports `isManagerPath` from
  `infra/cloudflare/worker/src/index.js`) had no `bots` entry in
  `MANAGER_ROUTE_PATTERNS`, so `/api/integrations/github-app/user/sources/:id/bots`
  fell through to the backend (:8080) instead of the manager (:8081) → 404.
- Fixed in product-mono (branch `feat/builder-owned-github-bots`, commit
  20c220b41): added
  `/^\/api\/integrations\/github-app\/user\/sources\/[^/]+\/bots(\/[^/]+)?$/`
  and restarted the dev proxy. Verified bots/agents/sources all reach the manager.
- Pending: redeploy the Cloudflare worker before staging/prod use the bots tab,
  or the same 404 recurs there.

## Required-secrets gate fail-open fix (2026-07-13)

Branch `feat/required-secrets-gating`, commit `5b5dea59`. External code review
found the required-secret activation/promotion gate ALWAYS failed open in
production: `missingSecretsForActivation`
(`packages/deploy/src/bff/release-manifest.ts`) read
`input.source.latestDeployment?.platformRepo`, but `source` comes from
`listUserSources`, and the backend deliberately returns
`latest_deployment: null` on that list endpoint (lazy for the list). So
`platformRepo` was always undefined and the gate silently returned `{}` —
activate, promote, and `requiredSecretsRoute` all saw zero required secret
slots regardless of what was actually missing. The existing tests hid this by
stubbing a populated `latestDeployment`, a shape that never occurs in
production.

- **Fix**: `missingSecretsForActivation` now resolves `platformRepo` via
  `client.getUserSourceLatestDeployment(...)` (the per-source detail endpoint
  that does populate it, same pattern as the redeploy route) when the cheap
  `source.latestDeployment?.platformRepo` path is empty. Fail-open is
  preserved only for the genuinely-unknown case (no GitHub token, or a source
  with no deployment at all). Fixes aomi-build + portal activate/promote
  (shared helper) plus aomi-build's `requiredSecretsRoute` (same pattern,
  fixed separately since it doesn't go through the shared helper).
- **Tests**: rewrote fixtures across
  `packages/deploy/test/release-manifest.test.ts`,
  `apps/aomi-build/src/server/bff/launch/routes.test.ts`,
  `apps/portal/src/server/bff/launch/routes.test.ts`, and
  `packages/deploy/test/launch-routes.test.ts` to use the real
  `latestDeployment: null` shape with a `getUserSourceLatestDeployment` stub,
  so they exercise the real production path instead of masking the bug.
  Proved the regression: reverted only `release-manifest.ts`, confirmed the
  corrected test fails against the old code (`{}` instead of the expected
  missing-secret map), then restored and confirmed it passes.
- **Verified**: all four vitest suites green (107 tests total across the
  four files), `@aomi-labs/deploy` build clean, `aomi-build` + `portal`
  type-check clean.
- Full writeup: `.superpowers/sdd/fix-p1-failopen-report.md`.

## Environment tab unified Variables view (2026-07-16)

`apps/aomi-build/src/features/launch/components/deployments/tabs/environment-tab.tsx`:

- Merged the split "missing required inputs inside Add or overwrite" +
  "Configured" sections into one **Variables** list: declared manifest slots
  (required + optional) and configured vault keys in a single view.
- Missing slots render as solid list rows (`Not set` chip, warning-tinted when
  required) with a **Set value** action that prefills the Add-or-overwrite
  editor — no more read-only key inputs injected into the editor.
- Required slots marked with `*` (+ legend "Required — the app cannot be
  activated without it"); optional declared slots now visible too.
- Missing-required rows sort first, directly under the "N required secrets
  missing" banner; custom configured keys follow declared slots.
- Removed the `requiredValues` state path from save(). Tests updated/added in
  `environment-tab.test.tsx` (8 pass; full launch suite 129 pass; lint clean;
  tsc failure is pre-existing stale `.next/types/validator.ts` on main).

## Build P2 deep-link polish (2026-07-14)

Branch `feat/build-p2-deep-links`:

- Shared `deep-links.ts` for project tabs, last-project Home, Environment, Usage.
- ⌘K Last project / Environment / Usage prefer last project when set.
- Overview recent deploys → project Deployments tab; Usage card / Billing links
  use last-project scoped Usage / Environment when available.

## Create Recent sidebar toggle (2026-07-14)

Branch `feat/build-recent-sidebar-toggle` (stack on #344 / p3):

- Single mental model: Recent open OR closed.
- Primary control: Create header panel icon (always visible); ⌘/Ctrl+B same state.
- Closed = no left rail (header toggle reopens); removed in-Recent collapse + narrow History rail.
- Preference persisted in localStorage; first visit defaults open on xl+ (after mount; SSR-safe).
- Shell nav remains click-only.

## Create composer model picker mock (2026-07-14)

Branch `feat/build-model-picker-mock` (stack on #344):

- Cursor-like model control on Create composer (`ComposerModelPicker`).
- Current selection: **Aomi** only; Auto / Custom rows disabled with Soon.
- Hardcoded mock — no Han API, no fake live model list fetch.
- Keeps quiet **Preview** honesty chip beside the picker (no Aomi branding spam).
- Product language only (no Smithers / eng jargon in UI).

## Create template Browse all sheet (2026-07-14)

- Empty Create keeps 3 featured templates; “Browse all” opens a right sheet
  with the full template grid (Esc / overlay / X to dismiss).

## Create mobile Progress/Plan dedupe (2026-07-14)

- On `<lg`, Plan-steps cards stay hidden during generate so they do not compete
  with the in-thread Progress timeline (rail Progress is lg+ only).

## Create Recent title dedupe (2026-07-14)

- `deriveSessionTitle` strips greeting fluff + soft-truncates; `uniqueSessionTitle`
  avoids colliding sidebar labels; list remasters persisted dupes for display.

## Create craft polish tranche (2026-07-14)

Shipped the review next-tranche on Create (`/build`):

- Right rail: single Progress timeline + Files (removed duplicate Build plan).
- Empty Create: top-anchored hero, 3 featured templates + Browse all.
- Chat density: tighter message/banner spacing; less mid-thread void.
- Stage strip: `resolveDisplayJourneyStage` + verify-gate stream honesty
  (Compile & test stays active until smoke test; Ship only when shipReady).
- Composer: Preview chip only (no stacked Aomi / model chip) — superseded by
  model picker mock above for the picker PR.

## Create craft review + jargon migrate (2026-07-14)

Screenshot review of empty Create + active session:

- Stale localStorage still showed Local mock / Smithers / aomi-run after the
  product-language pass — added `sanitize-session-copy` on load/save +
  display guards; dropped redundant empty-state `aomi` chip and dual rail titles.
- Craft canvas: `canvases/aomi-build-create-craft-review.canvas.tsx`
- Follow-up tranche shipped (see above): rail / empty / chat / stage / composer.

## Create product-language polish (2026-07-14)

Branch `feat/build-p3-smithers-nodes`:

- UI copy uses builder language only: Plan / Generator / Smoke test / Aomi /
  Ready / Preview. Eng names (Smithers, aomi-run, Local mock, Han, etc.) stay
  in types/comments, not rendered labels.
- Chat: You (right) / Aomi (assistant) / quiet system; seed model = Aomi.
- Sidebar sessions: Ready / In progress / Failed + journey stage titles.
- Ship banner: Ready to ship + Download / Open Projects; GitHub init · soon.
- Composer chip: Preview; blocked hint says smoke test (not aomi-run).

## AI Builder P1 craft port (2026-07-14)

Branch `feat/build-enable-route`:

- Ported mock portal craft into `features/build/` inside ControlPlaneShell
  (no BuildLayout, no Customize marketplace, no `/deploy/[id]`).
- Empty: centered composer + templates; active: thread + stream, lg context
  (files/stream), sticky compact composer, xl session list.
- LocalStorage mock pipeline plan→generate→validate→ready mapped to journey
  stages; ship banner → `/projects`; honest “Local mock” copy.

## AI Builder P1 intent empty state (2026-07-14)

Branch `feat/build-enable-route`:

- Working intent composer + 8 templates (seed prompts).
- Submit creates a local Create session + journey chrome.
- Superseded visually by craft port (stream/files landed).

## AI Builder experience plan (2026-07-14)

- Added `apps/aomi-build/AI-BUILDER-EXPERIENCE.md`: Cecilia decode, platform
  map, mock-vs-target, import policy, P0–P5 implementation phases.
- Direction: adapt mock craft into live `features/build/` (not wholesale port).

## Build AI Builder route (2026-07-14)

Branch `feat/build-enable-route`:

- Sidebar Build `enabled: true` (no Soon).
- Real `/build` page scaffold: journey map + disabled “Start” (no Smithers
  network yet). Manage path still Projects / Operate.

## Build P2 usage peek (2026-07-13)

Branch `feat/build-p2-usage-peek` (PR #335):

- Home Usage card: credits + tokens + day spark; Environment ≠ Billing copy.
- Deep link `/operate/usage?project=<id>`; Operate honors `?project=`.

## Build P2 Deployments timeline (2026-07-13)

Branch `feat/build-p2-deployments-timeline` (PR #334):

- Deployments tab summary uses the same Live story + history count.
- Rows lead with app names + Current; deployment id is secondary.
- Current sorts first; relative timestamps; History / Promotions labels.

## Build Live status consistency (2026-07-13)

Branch `fix/build-live-status-consistency` (PR #331):

- Shared `projectDeploymentStatus()` wraps `deploymentLifecycleFromSource`
  so Projects list, Home, and Deployments tell the same Live story.
- Deployments empty state: if live but records `[]`, show
  "No deployment history yet" instead of "No deployments yet".

## Build P2 Project home (2026-07-13)

Branch `feat/build-p2-project-home` (PR #330):

- Project pages default to a **Home** tab with Live / Environment / Chat /
  Usage status cards and one Next CTA (deploy → keys → Open Chat).
- Reuses `deploymentLifecycleFromSource`, secrets load, and operate usage peek.
- Existing Deployments / Chat / Environment / Details tabs unchanged.

## Build UI copy polish (2026-07-13)

Branch `fix/build-ui-copy-polish`:

- Shortened Settings, Billing, Secrets, Overview, Usage, Environment,
  Integrations, and wizard user-facing copy.
- Removed AI em dashes from product sentences; kept `—` only as empty
  table/stat placeholders.

## Build P0 trust — Soon, don't delete (2026-07-13)

Branch `fix/build-p0-trust-soon`:

- Integrations: Save gated (`Save · Soon`); no fake success on 501; forms kept.
- Settings: `Planned` → `Soon`; unfinished sections stay listed as Coming soon.
- Project Disconnect kept as `Disconnect · Soon` (disabled).
- Sidebar Build already Soon (unchanged).
- Auth sign-in + env errors humanized (`humanizeUserError`); no bearer essays.

## Build P1 control plane craft (2026-07-13)

Branch `feat/build-p1-control-plane`:

- Glossary terms (Project / App / Deployment / Environment) in `lib/glossary.ts`.
- Empty states use one CTA (`EmptyState`) on Projects, Deployments, Overview, Operate.
- Global toasts for env save/delete and promote/deactivate.
- ⌘K command palette (+ header Search) for Projects, Deployments, Usage, Settings.
- Default `/` opens last project or `/projects`; Overview moved to `/overview`.
- Desktop-first surface bar locked: desktop best path; tablet unbroken; phone
  usable (Search icon always visible; full Search · ⌘K from `sm+`).

## Billing option A — payment methods on Chat (2026-07-13)

Branch `feat/billing-payment-methods-status`:

- Account → Billing teaches BYOK/Tempo are on the Chat account; Build lacks
  AccountBearer so we do not call `GET /api/account/payment`.
- Adds Open Chat link; keeps Usage + Secrets; no fake method status.
- Clarifies `accountScopedFetch` comment (auth not wired on Build).
- Documents auth blocker + option A/B in `BILLING-EXPERIENCE.md` Phase C.

## Billing experience — backend/UI map in plan doc (2026-07-13)

- Expanded `apps/aomi-build/BILLING-EXPERIENCE.md` with control/data plane
  mermaid, HTTP-vs-internal table, and Build UI now/should map (Cursor-style).

## Account → Secrets stay-on-settings (2026-07-13)

Branch `feat/settings-secrets-no-auto-redirect`:

- Single-project path no longer `router.replace`s to Environment.
- Account → Secrets stays put with teaching copy + **Open Environment** CTA.
- 0 / 2+ behaviors unchanged. Tests updated in `settings-secrets-panel.test.tsx`.

## Billing experience Phase A — settings sub-nav (2026-07-13)

Branch `feat/builders-billing-experience-phase-a` (PR #319):

- Added `SettingsNav`, `SettingsLayout`, and `settings/layout.tsx` so all
  `/settings` routes share Account sub-navigation driven by `settings-data.ts`.
- Overview + every section (including Soon stubs) is one click away; badges
  show Available / Project-scoped / Soon; Billing + Secrets panels unchanged.
- Test: `settings-nav.test.tsx`.

## Billing experience plan rename (2026-07-12)

- Renamed `apps/aomi-build/BILLING-CLARITY.md` → `BILLING-EXPERIENCE.md`
  (matches `BUILDERS-EXPERIENCE.md` naming). Content uses "Billing Experience";
  A→D phases and mental model unchanged.
- Local branch renamed to `feat/builders-billing-experience-phase-a`
  (was unpushed `feat/builders-billing-phase-a-clarity`).

## Overview read-path perf (2026-07-11, aomi-build)

Follow-up to the Codex performance review of PR #309 / product-mono#787 —
the initial Overview load path, which the first round left untouched:

- `useProjects` now consumes the shell-level `GitHubSessionProvider` instead
  of refetching `/auth/github/status` (one session round trip per page, not
  two).
- Overview renders its shell immediately once the session is known; project
  stats and the deployments card hydrate independently (no more full-page
  `Loading overview...` gate on the sources fetch).
- `useGlobalDeploymentRecords` fetches per-source `deploymentHistory()` (one
  call per source, DB-backed via the `deployments` projection after
  product-mono#787) instead of `deploymentRecords()` per app per source.
  Needs backend `created_at` in deployment JSON (added in #787 branch) for
  cross-source sorting; legacy records sort last at 0.
- Operate BFF `ownedSources` caches `listUserSources` per user+platform for
  15s with in-flight coalescing — concurrent operate widgets share one
  backend ownership lookup.
- NOT addressed (pre-existing, unrelated failures): `deploy-step.test.tsx` /
  `project-row.test.tsx` fail at the branch base; another session appears to
  be fixing them — left alone.
- Projection cold start (Codex point 5) needs no new code: both latest and
  history GitHub fallbacks already write back via `project_deployment`, so
  each legacy source pays GitHub once and is DB-served afterwards.

## Deploy control-plane plan (2026-07-10)

- Drafted `docs/topics/deploy-control-plane-plan.md`: phased plan to restore
  the "GitHub only behind the BE" invariant — Phase 1 BE rerun endpoint +
  delete `enrichPendingCiStatus`/`githubToken` from app and
  `@aomi-labs/deploy`; Phase 2 webhook-fed DB projection (kills per-poll
  GitHub fan-out and the manifest/DB dual source of truth); Phase 3 R2
  artifact store for release assets; Phase 4 extract a Rust control-plane bin
  (move, not copy). Decisions + rejected alternatives recorded in the doc.
- Working tree (`fix/deploy-flow-usability`, uncommitted): `commitMatches`
  redeploy stale-run fix, activation error surfacing, sign-out wizard-state
  reset, refresh latch fix, `settleBySource` operate fault tolerance.
  Verified: launch suite 32/32, typecheck, lint. Note: the package copy
  (`packages/deploy/src/bff/launch-routes.ts`) still has the pre-fix
  `?? runs[0]` stale-fail behavior — either port or accept until Phase 1
  deletes the function.
- Phases 0–2 of the plan are IMPLEMENTED and verified in working trees
  (uncommitted): Phase 1 backend (rerun endpoint, `CiOutcome.run_id`, run-URL
  deep link) + Phase 1 TS (enrich/`githubToken` deleted from aomi-build,
  portal AND `packages/deploy`; redeploy repointed via new
  `DeploymentClient.rerunDeployment()`; OpenAPI fixture + route manifests
  regenerated) + Phase 2 (github_ci_runs migration/entity, workflow_run
  webhook projection, projection-first `resolve_deploy_ci` with 30-min
  in-flight trust window + backfill, rerun marks row queued, release reads
  skipped while CI in flight). Verified: backend 195/195 + fmt + clippy;
  widget workspace 630 passed + typechecks. Phase 1 TS deletions subsume the
  Phase 0 `commitMatches` fix; the other four Phase 0 fixes are intact in
  this diff. Phases 3–4 intentionally blocked (see plan doc §5): Phase 4
  moves the files Phases 1–2 edited (land those first); Phase 3 needs an R2
  bucket + creds; both need the bin-name call.
- Operational follow-ups for Phase 2: run the new supabase migration;
  subscribe the GitHub App to `workflow_run` webhooks; grant the App
  `Actions: read + write`.
- Decisions locked (plan doc §6): control-plane bin = `aomi/bin/manager`;
  R2 provisioning agent-driven via wrangler; keep polling (no SSE);
  partner-scoped bearers as their own change before first partner onboards.
- 2026-07-10 later session: Phase 2 REDESIGNED per Cecilia — `github_ci_runs`
  replaced by a proper `deployments` projection table (full manifest JSONB +
  indexed columns + webhook-fed ci_* columns; write-through at deploy, lazy
  backfill on status reads, workflow_run webhook matching by repo+branch+
  commit-prefix). Phase 3 CODE done: `crates/artifact-store` (config-gated
  R2/SigV4 client) + cache-through in `AppFetcher::fetch`. NO live
  Cloudflare changes; R2 is not even enabled on the account yet (dashboard
  step, Cecilia). All verified: backend 195/195, database + runtime + crate
  tests, fmt, clippy. Pre-existing env failure: runtime
  `all_plugins_load_and_have_valid_manifests` fails on SDK 3.0.1 dylibs vs
  3.0.2 host (see teammate's `docs/plans/2026-07-10-sdk-bump-app-rebuild.md`).
- Phase 4 CODE done, then upgraded to a physical extraction (Cecilia's
  call): the deploy domain — `platforms/*` handlers, deploy-surface HTTP
  endpoints (+webhook), activation auth (`PlatformActivationToken`,
  `Activation`, `AuthorizationHeaderExt`), and the `github_app.*.toml`
  configs — now LIVES in the `manager` crate (`aomi/bin/manager`, lib+bin,
  edition 2021). Dependency arrow: backend → manager (never reverse);
  backend re-exports keep `crate::handler::platforms::*` /
  `crate::auth::Activation` paths alive for its remaining callers (runtime
  reconciler, runtime-coupled `apps` endpoints, AuthRouter). Endpoints are
  substate-typed (`State<PlatformHandler>`/`State<DbPool>`) so the same fns
  mount in both routers. `PlatformHandler::new(&SharedRuntime)` was dropped
  (backend constructs via `from_pool`), keeping manager runtime-free.
  Deploy workflow toml paths updated to `aomi/bin/manager/…` (repo file
  only). Tests: backend 135 + manager 60 = same 195, all green; fmt +
  clippy clean of new warnings. NO infra/live changes anywhere.
- Read-path perf fixes done + committed (commit 2 on seperate-github-proxy):
  card hydration (`user_source_latest_deployment`), history
  (`user_source_deployments`), and the `deployment_status` hot-poll window
  now serve from the `deployments` projection (record JSONB + webhook-fed
  CI); GitHub only on row-miss, with lazy write-back backfill. New
  `DbDeployment::list_for_source` + widened index in the unapplied
  migration. Projects/Overview page loads become GitHub-free once each
  source has one row.
- Next (Cecilia): review + land both repos' diffs; run the deployments
  migration; GitHub App settings (workflow_run webhook + Actions r/w);
  enable R2 in the Cloudflare dashboard → I provision bucket/token + env;
  infra cutover for manager (systemd unit + edge routes + webhook URL) when
  ready. Ops note: freed ~80GB by deleting product-mono cargo incremental
  cache (disk hit ENOSPC mid-build; cache regenerates).

## Staging account and environment fixes (2026-07-11)

2026-07-11 — Staging Para sign-in fix (PARA_JWT_AUDIENCE) + blank-env hardening

## Staging Para sign-in broken: aud mismatch (2026-07-11)

Para login on chat-staging.aomi.dev authenticated at Para (embedded wallets
connected) but never became an Aomi session: `POST /api/auth/aomi/provider/exchange`
400'd repeatedly with jose `unexpected "aud" claim value`. Para **PROD** session
JWTs carry the Para project UUID (`8c67b747-9c8f-416a-b4d4-067bb1209c9c`) as
`aud`, but the deployed stack had no `PARA_JWT_AUDIENCE`, so
`readAccountAuthEnv` fell back to `NEXT_PUBLIC_PARA_API_KEY` (`prod…` API key)
as the expected audience. UI symptoms of the same 400: the Para modal never
dismissed and /settings sat on "Connecting your account…".

- **Vercel env (chat-portal project):** three branch-scoped
  `PARA_JWT_AUDIENCE` Preview entries existed but were **empty strings**
  (placeholders). Replaced them with one project-wide entry per environment —
  Preview, Production, Development — set to the Para project UUID above (the
  `aud` observed in our own frontend's Para tokens, signature-verified against
  Para's PROD JWKS). Production previously had no audience configured at all
  and would have broken identically on its next deploy.
- **Redeployed** main (`chat-portal-5dbokzdxx`) so chat-staging picked the
  value up; verified the alias moved and that the exchange endpoint now fails
  a bogus token with a jose JWKS error instead of "Para JWKS verification is
  not configured" / an aud mismatch. Full E2E Para login still needs a human
  retry in the browser.
- **Code hardening (working tree):** `packages/account/src/better-auth/env.ts`
  now normalizes blank/whitespace env values to `undefined` (`nonEmpty`) for
  all optional Privy/Para fields — an empty `PARA_JWT_AUDIENCE=""` is not
  nullish, so it used to stop the `??` audience fallback chain and surface as
  the misleading "Para JWKS verification is not configured". Re-added the
  "prefers explicit Para JWT audience" test (lost in the packages/auth →
  packages/account fold) plus a blank-values regression test in
  `packages/account/test/env.test.ts`. 51/51 account tests green, tsc + eslint
  clean.
## Follow-ups from the same debugging session (2026-07-11, afternoon)

Para sign-in now completes on chat-staging (modal dismisses, wallets connect,
exchange 200s). Two residual breakages were root-caused; fixes are code-side
or handed off, per Cecilia's direction (no direct backend/DB mutation):

- **/settings "Couldn't connect your account" → backend `GET /api/account`
  500s for every user.** The deployed `product-mono/backend:main` image runs
  the app-billing usage query referencing `llm_usage_events.recipient`, but
  migration `supabase/migrations/20260708010000_llm_usage_events_recipient.sql`
  (additive: `ADD COLUMN IF NOT EXISTS recipient TEXT` + partial index) was
  never applied to the shared staging/prod DB. Backend log:
  `Failed to query usage range error=column e.recipient does not exist`.
  **Pending: apply that one migration** (owner's call — staging DB IS prod
  DB), then `/api/account` and the settings page recover.
- **`GET /api/updates` 404 spam → stale committed `packages/client/dist` on
  main.** `packages/client/src/sse.ts` already targets `/api/thread/updates`,
  but main's committed dist still requests `/api/updates`, and consumers
  resolve the package through dist. The rebuilt dist (uncommitted, verified
  stable across a fresh `pnpm --filter @aomi-labs/client build`) sits in the
  working tree ready to commit — that alone stops the 404s.
- **Legacy widget-auth account graph still in the DB.** `public.aomi_users`,
  `aomi_auth_identities`, `aomi_wallets`, `aomi_account_events` are orphaned
  (zero references in aomi-widget or product-mono `origin/main`; the live
  stack uses canonical `users`/`auth_providers`/`public_keys` + `ba_*`
  better-auth tables). Staged `scripts/drop-legacy-aomi-account-tables.sql`
  (pre-flight checks + RESTRICT drops, no CASCADE) for review; also fixed the
  last stale `aomi_wallets` comment in
  `apps/shadcn-registry/src/lib/wallet-kit/account/aomi-backend-runtime.ts`.
## Aomi Build owned operate + pre-prod fixes (2026-07-08)

- Hardened launch/operate-adjacent BFF reads and writes around the signed-in
  GitHub user's owned `app_source` rows: activate requires `appSourceId` plus
  app/release-tag pair ownership; app/status/records reads are session scoped;
  portal and the shared `@aomi-labs/deploy/bff` route factory follow the same
  contract.
- Added explicit error state for deployment history and environment secret
  loads so failed reads no longer collapse into empty UI. Deployment activity
  wording now uses "Activity" instead of "Logs" for promotion records.
- Replaced the static overview placeholder with a signed-in owned-app overview,
  added a project Chat tab using the existing chat deep-link contract, split
  environment variables by app, and made the deploy stepper's busy/current/done
  states explicit.
- Follow-up review fixes split the Environment tab into plain env vs masked
  secret sections, stopped the outer wizard stepper from spinning while waiting
  on input, tightened the wizard styling to the control-plane shape, removed the
  signed-in nav flash, and avoided simultaneous overview loading/empty states.
- Shared the Aomi Build GitHub session through a control-plane context, gated
  operate pages/navigation on that session, and renders the GitHub sign-in panel
  without calling protected BFF endpoints when signed out.
- Verified with focused Vitest suites for `aomi-build`, `portal`, and
  `packages/deploy`, plus `@aomi-labs/deploy` build and app typechecks.

## Flexible-orchestration roadmap (Cecilia's direction) — COMPLETE

2026-07-07 — aomi-smither: wait-external + cross-repo agents (stage 3) — roadmap complete

- **Stage 1 — composition + clarify** ✅. Plan is a composition of typed
  phases; clarify pauses answerable from TUI + console.
- **Stage 1.5 — intake in the browser from t=0** ✅. The composer is visible
  before the workflow exists; one tab follows into the build.
- **Stage 2 — multi-loop + eval + parallel** ✅. `eval` phase (run + judge →
  metric), `eval-pass` loops with graceful `return-last` max, parallel fan-out.
  Proven on the defi-pools shape.
- **Stage 3 — wait-external + cross-repo agents** ✅ (this entry). Durable
  external pauses; agent phases in other repos. Proven on the GameFi shape.

## Recent Changes

### wait-external + cross-repo agents (2026-07-07, stage 3)

The last two primitives — for full-stack / outside-Aomi work (the GameFi
scenario):

- **plan.ts** — `wait-external` phase (waitingFor / timeoutHours / onTimeout);
  agent phases gained `repo` (run in another codebase); new `design` role
  (writes DESIGN.md for a human to build the other side from). `agentSpecsFor`
  is a pure export listing the distinct (agent, cwd) pairs the workflow
  instantiates — so cross-repo wiring is testable without running an agent.
- **schemas.ts** — `external` table doubles as the wait-external signal payload
  ({ ready, note, receivedBy }) and its output row.
- **workflow.tsx** — renders `wait-external` as a Smithers `<Signal>` keyed by
  the phase node id (schema = the registered `external` table); done when its
  row lands. Agents instantiated one-per-(agent, repo).
- **run.ts** — `sendSignal` (wraps engine `signalRun`); `executeRunUntilSettled`
  now also resumes on `waiting-event`, not just `waiting-approval`.
- **console.ts / cli.tsx** — console side channel gained `POST /signal`; new
  `aomi-smither signal --app <app> --node <phase>` subcommand. Composer intake
  prompt teaches wait-external + cross-repo + the full-stack shape.

Grounding first: an empirical `<Signal>` probe established the contract —
signalName === the Signal node id, the Signal's schema must be registered in
createSmithers, and the parked status is **`waiting-event`** (NOT
waiting-approval — that gap would have hung the settle loop; fixed).

Verified live through the real runtime, CROSS-PROCESS (the true durability
claim): process A parked a run on wait-external (`waiting-event`); process B —
the *built* `aomi-smither signal` CLI — delivered the signal by loading the
run off disk; process C resumed (`resuming? true`) and finished, with the
`external` row carrying the note from process B. Plus an in-process GameFi
proof: binaries → wait-external (park → signal → resume) → eval-loop (0.9 pass)
→ result complete. 73 vitest green (4 new: GameFi shape, wait-external stage,
cross-repo cwd separation, same-repo agent dedup); tsc + eslint clean; dist
rebuilt.

Known gap (noted, not blocking): the branded browser console shows a
wait-external node as a rail row but has no in-page "signal ready" button yet
— resume it from the CLI or a `POST /signal`. A button is UI polish for a
follow-up.

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
2026-07-03 - Tri-repo pre-merge review (aomi vs origin/main, product-mono vs origin/refactor/dbthread-unification, db-master). Local checks all green. Blockers logged below.

## Partner deploy primitives — additive on Han's main (2026-07-07)

Branch `partner-deploy-additive` (off `origin/main` `bf890120`, which merged Han's
#292 deployment-SDK-guardrails **including** his portal deployment console — codex
did NOT strip it; it is present + mounted at `/deployments`). Rather than the
earlier plan of gutting the portal launch feature into packages (which would have
collided head-on with Han's now-live console), this ships the partner-facing
primitives **purely additively** — 24 files, all under `packages/deploy/`, zero
changes to `apps/portal` or `apps/shadcn-registry`:

- **`@aomi-labs/deploy/bff`** (server-only) — framework-agnostic `(Request) =>
  Response` route factories: `createLaunchRoutes`, `createGitHubAuthRoutes`,
  `createGitHubSessionCodec`, default guards, config, validators, error mapper.
- **`@aomi-labs/deploy/launch`** (browser) — `createLaunchClient` typed client +
  wizard state machine + contracts + url-context.
- **`packages/deploy/skills/aomi-deploy/SKILL.md`** — agent-paste-able integration
  guide; ships with npm (`files` includes `skills`). Points partners at Han's
  portal console (`apps/portal/src/features/launch/`) as the worked example to
  read, not vendor.
- **`package.json`** 0.1.1 → 0.2.0 (adds `./bff` + `./launch` exports, `jose` dep,
  `skills` to files); `tsup.config.ts` adds the two entries.

Inherits Han's new SDK methods (`deactivateApp`/`promote`/`listSecrets`/
`listDeploymentRecords`/`serverTags`) from `packages/deploy/src/client.ts` with no
conflict (his additions were to files this extraction never touches). Build (4
entries) + 98 pkg tests green. **Superseded decisions:** the registry `aomi-launch`
shadcn item and the portal-as-thin-consumer rewrite are dropped — Han's console is
the portal's deploy UI + the reference; my registry component copies (old branch
`partner-deploy-readiness`, kept as backup) are redundant and not carried forward.
Deferred (not done): browser-exposed "stop"/deactivate in `createLaunchClient`;
publishing 0.2.0; unifying the portal's own launch routes onto these factories.

## Pending (from 2026-07-03 pre-merge review)

- BLOCKER: re-resolve merge of `packages/react/src/contexts/control-context.tsx` — merge commit 59cebe8e restored the pre-refactor monolith, clobbering main's composition root (`packages/react/src/control/*` now dead) and dropping `AomiPlatformFilter`/`applicationId` props main still passes.
- BLOCKER: `/api/mcp/[transport]` is unauthenticated and trusts `x-aomi-user`; gate or session-auth before deploy.
- BLOCKER: device-auth grant store is an in-process Map (`apps/portal/src/lib/device-auth-grants.ts`) — breaks on Vercel; move to Postgres.
- BLOCKER: client `/api/control/provider-keys` calls 404 vs new backend (BYOK moved to `/api/account/payment/byok`).
- HIGH: `packages/account/src/proxy.ts` fails open (mint failure → anonymous forward); apps/base forked its own anonymous proxy; committed `packages/{client,react}/dist` bundles; `scripts/smoke-auth-stack.mjs` targets deleted `/api/bff/auth/*` routes; portal next.config lost prod backend-URL fallback.
- Cross-repo: `signing_authorization` migration has no frontend counterpart; `aomi_wallets` vs backend `identity_wallets` never sync; db-master's 48 migrations are uncommitted and `rename_sessions_to_threads` is fresh-DB-only (staging/prod variant needed).
- Docs to prune before PR: AUTH-STACK-REVIEW.md, MERGE-BFF-BETTERAUTH-FIXES.md, WALLET-KIT-{CLEANUP,PR-WALKTHROUGH}.md, mcp-design.md; fix `apps/registry/` refs in DOMAIN.md/METADATA.md/repowiki.toml; prune this file's diary.

## Recent Changes

### Working trace: windowed view with animated expand/collapse (2026-07-07)

Branch `feat/working-trace-a`. A long turn's trace marched down the whole screen.
The open trace (live or after completion) is now **capped to a scrolling window**
(~5 steps / `WORKING_WINDOW_PX = 260`): newest steps stay pinned at the bottom via
flex `justify-end`, older ones clip and dissolve under a top mask. A "Show all N
steps" pill lifts the cap; "Collapse to recent steps" restores it. Both directions
tween the window height with the **Web Animations API** (`WINDOW_ANIM_MS = 300`,
ease-out), which — unlike a CSS transition — animates cleanly to/from the uncapped
`auto` height in both directions. Entirely presentational — no
runtime/merge/interpreter changes. The pill uses a horizontal-ellipsis marker (not
a chevron) so its glyph doesn't point at the header's open-chevron above it.

- `apps/shadcn-registry/src/components/assistant-ui/working-trace.tsx`
  (`WorkingTrace`): `expanded`/`overflowing`/`animating` state + `viewportRef`/
  `bodyRef`; a `windowed = !expanded` viewport with `maxHeight`/`overflow-hidden`
  and flex-end pinning; an effect measuring overflow (`bodyRef` natural height vs
  the cap); a layout effect that runs a WAAP `max-height` tween when `expanded`
  flips (skipped under reduced motion); the "Show all N steps" /
  "Collapse to recent steps" pill.
- `apps/shadcn-registry/src/themes/default.css`: new `.aui-working-trace-windowed`
  rule — a `mask-image` gradient fading the top 60px (applied only while content
  overflows and not mid-tween, so short traces are never faded).
- Verified: file typecheck (only pre-existing unrelated wallet-kit test errors)
  and eslint green. `packages/react/dist` rebuilt to sync the earlier
  `SUBMITTING_TO_WORKING_GRACE_MS` source change (650→300). Live streaming path
  (needs a real multi-tool agent turn) exercised in the user's environment.

### Working trace: paced/staggered reveal (2026-07-07)

Branch `feat/working-trace-a`. The Working trace looked "aggressive" — a burst of
2-4 tool calls flashed in together and chips popped all at once, because tool
steps arrive already-complete and a burst lands in one `messages` event, so React
committed every `WorkingStep` in a single frame. Fix is entirely in
`apps/shadcn-registry/src/components/assistant-ui/working-trace.tsx` +
a shimmer tweak in `src/themes/default.css` (no backend/runtime change):

- New `useStaggeredReveal(target, running)` hook reveals trace items one at a
  time. Adaptive cadence (1200ms base, tightening to ~360ms as backlog grows) so a
  model running ahead is caught up fast and in order; a ~220ms tail drain once the
  turn ends so the final answer is never gated on the stagger. Respects
  `prefers-reduced-motion`.
- Hook lifted into `AssistantTurnParts`; the answer now reveals only after the
  trace fully catches up. The newest revealed step shimmers as "live" (frontier
  follows the reveal); auto-collapse waits for full reveal + a 500ms grace.
- Chips fan in left-to-right via CSS `animationDelay` (100 + i·70ms) with
  `fill-mode-both`. Shimmer slowed to `3.8s ease-in-out`.
- Entrance animations play once: an `animatedCount` ref in `WorkingTrace` (survives
  the body's collapse/remount) gates each item's animate class on first reveal, so
  reopening a finished trace shows steps/chips static.
- Pacing only applies to a turn that's live at mount (`useStaggeredReveal` seeds
  `revealed = target` when not running), so a reloaded/scrollback/completed turn
  reveals everything at once and the answer never sits behind a replayed animation.
- Collapse is animated (grid-rows 1fr→0fr + opacity over 300ms, body stays
  mounted) instead of snapping shut. The final answer fake-streams via a ~500ms
  ease-out synthetic typewriter (`FakeStreamedText`); both the fake-stream and the
  entrance are gated on `liveTurn` (a `liveTurnRef` in `AssistantTurnParts`) so a
  loaded/completed turn renders the answer in full with no replay.
- Plain replies (no tool calls) buffer while the turn is still running, because
  text before the first tool call is provisional and may move into the Working
  trace if a tool arrives later. If no tool arrives, the settled final answer
  fake-streams through `FakeStreamedText` after completion, matching post-tool
  answer behavior without the pre-tool text jumping.
- Runtime turn merging only folds assistant runs that contain tool-call parts.
  Contiguous text-only assistant fragments are treated as backend streaming
  snapshots and collapse to the latest fragment, preventing duplicate replies
  such as `...?Hey — ...` from being glued into one final bubble.
- Text finalization also conservatively collapses a single text fragment that
  already contains the same answer twice back-to-back, records
  `control.lastCompletedAt` when a turn settles so late-mounted answers can
  fake-stream, and keeps final-answer text normalization in the runtime instead
  of duplicating fuzzy UI-side cleanup.
- The generated assistant-thread registry payload and landing `/r` mirror were
  refreshed so installed/served widgets get the same final-answer reveal branch.
- Verified: focused React runtime/chat Vitest coverage, targeted ESLint, React
  package build, widget registry build, and generated assistant-thread payload
  guards with pinned `pnpm@10.28.0`. Not yet eyeballed on a live tool-calling
  turn (needs backend + funded wallet).

### Auth docs cleanup pass (2026-07-02)

Branch `codex/merge-bff-betterauth`. Consolidated the stale root
`HANDOFF-LOCAL-BACKEND.md` and `docs/local-merged-bff-betterauth-stack.md` into
`docs/local-dev-stack.md`, removing the old `bff-unification` worktree and HS256
`aomi_session` local-stack story. Refreshed `specs/WIDGET-AUTH-PLAN.md` so the
surviving auth plan describes the live BetterAuth session -> BFF AccountBearer
architecture instead of deleted BetterAuth backend JWT/JWKS or legacy provider
exchange paths. Updated auth fact docs, docs indexes, repowiki globs, and
generated UserState references to point at the live `wallet-kit` / `aomi-account`
paths. The §13-A schema rename and provider-provenance FK work remains deferred.

### Portal client-token-provider dead-weight cleanup (2026-07-01)

Branch `codex/merge-bff-betterauth`. Follow-up to the thread-list race fix. The
portal wired a client-side `createAccountAccessTokenProvider` into **5**
components (widget + `general-settings`/`bots`/`apps-settings`/`app-keys`) that
minted an `Authorization: Bearer` header — but in same-origin proxy mode
(`NEXT_PUBLIC_BACKEND_URL=/`, the shipped default) the BFF proxy mints the bearer
server-side from the `better-auth.session_token` cookie and strips that header, so the whole
machine was dead weight (latency + `/api/aomi/account-bearer` 401 spam + a duplicate
`providerExchange` owner).

- **Not deleted outright — made conditional.** It is still load-bearing in
  direct-to-backend mode (browser talks cross-origin to the Rust backend), so a
  blind delete would have broken that path. New helper
  `apps/portal/src/lib/account-access-token.ts`
  (`createPortalAccountAccessTokenProvider`) returns `null` in same-origin /
  SSR and only builds a real provider when `getBackendUrl()` is cross-origin.
  This also collapsed the ~30 duplicated lines across the 5 components into one
  call. The shared `@aomi-labs/client` `createAccountAccessTokenProvider` +
  `@aomi-labs/account` `createBearerTokenRoute` (`/api/aomi/account-bearer`) are kept
  intact as the documented direct-to-backend seam (used by out-of-repo
  base/landing and the CLI-less direct path).
- **User decision:** deployment topology was "not sure — play it safe", so the
  conditional (no regression either way) was chosen over a hard delete.
- **Verified.** `typecheck:portal` + eslint clean; `packages/client` +
  `packages/account` auth suites green (36); full `scripts/smoke-auth-stack.mjs`
  with `AOMI_SMOKE_SIWE=1` against the live local stack passed every row (SIWE
  sign-in, bearer claims `kid=aomi-bff-dev-1 iss=aomi-bff aud=aomi-backend`,
  direct-backend bearer path, same-origin proxy path, thread/app-key/chat,
  cross-wallet account linking). Real `aomi` CLI e2e (isolated `AOMI_STATE_DIR`)
  passed: `account login` (SIWE) → `whoami` → `wallet whoami` → `chat` ("pong")
  → `logout` → post-logout 401. Browser manual testing left to the user.
- **Pre-existing nit (not touched):** `aomi account whoami` throws a raw stack
  trace on a 401 instead of printing "not signed in".

### Thread list "needs a refresh on login" fix (2026-07-01)

Branch `codex/merge-bff-betterauth`. On a fresh login the thread list did not
load until a manual page refresh.

- **Root cause:** the thread-list effect in
  `packages/react/src/runtime/user-state-provider.tsx` fires when `isConnected`
  flips true, but `isConnected` is forwarded from wallet _connection_
  (`apps/registry/.../wallet-kit/context.tsx` -> `identity.isConnected`), which
  lands before the SIWE/provider sign-in writes the BetterAuth `better-auth.session_token`
  cookie. On the portal every `/api/*` call is same-origin through the BFF proxy
  (`packages/account/src/proxy.ts`), which authorizes purely from that cookie
  (`injectBearer` -> `getSessionedCanonicalId`) and **ignores the browser's
  `Authorization` header** entirely. So `GET /api/sessions` 401s until the
  cookie exists. The old `listThreadsWithAuthRetry` retried only 3× over ~2.5s
  (`[250, 750, 1500]`) then gave up permanently with no re-trigger; signing a
  SIWE message routinely outlasts 2.5s, so the list stayed stranded until a
  refresh (by which point the cookie is already on disk).
- **Fix:** replaced the fixed 3-step ladder with a bounded, capped exponential
  backoff (base 300ms, ×1.7, cap 2000ms, 30s budget) that keeps retrying 401s
  while the user stays connected. Cancellation is unchanged (the effect still
  sets `cancelled` on disconnect/unmount, and `isCancelled()`/non-401/budget
  each break the loop). Threads now appear within ~2s of the cookie landing.
- **Tests:** `packages/react/src/runtime/__tests__/thread.test.tsx` gained
  "keeps retrying past the old fixed cap while the sign-in cookie lands" (4×401
  then success -> 5 calls, impossible under the old cap) and "stops retrying
  non-auth thread list failures" (a 500 fails fast, 1 call). Full react runtime
  suite green (24 thread + 45 user/thread), tsc + eslint clean, `@aomi-labs/react`
  rebuilt so the portal consumes the fix.
- **Tech debt surfaced (not fixed here, flagged for follow-up):** (1) the portal
  wires a full client-side account-bearer provider
  (`packages/client/src/account-session.ts`, `createAccountAccessTokenProvider`
  in `portal-aomi-frame.tsx`) whose `Authorization` header the proxy discards —
  dead weight on the portal (only a direct-to-backend client like the CLI needs
  it), plus a second `providerExchange` owner alongside the wallet-kit account
  runtime; (2) `is_connected` conflates "wallet connected" with "backend
  authenticated," so the widget has no true "session cookie live" signal to key
  loading off; (3) the token provider's `subscribe` does not fire on the first
  successful mint (`previous === null`), so the SSE reconnect hook misses the
  initial auth-ready moment.

### Merge BFF + BetterAuth cleanup (2026-07-01)

Branch `codex/merge-bff-betterauth`. Current auth path is BetterAuth session
cookie or bearer-plugin token -> portal proxy session resolution -> canonical
Aomi `users.id` -> EdDSA `AccountBearer` minted through the static service
topology -> backend verification. The deleted BetterAuth JWT/JWKS minter and
legacy auth-mode switch are no longer part of the contract.

- CLI BetterAuth SIWE login is wired and verified for login, `wallet whoami`,
  chat, session list/status, state fetch, and logout against the local stack.
  The only remaining CLI parity row is the browser-wallet comparison proving
  the same wallet resolves to the same `users.id` in GUI and CLI.
- Rotated the dev BFF key and aligned the portal topology data with the
  neighboring backend `service.toml` / `service.dev.toml`.
- Cleaned the stale docs/scratch surface: the old JWT contract and merge plan
  were deleted, `tmp.md` became the generated user-state shape reference, and
  dead scratch files were removed.
- `origin/main` reconciliation remains intentionally deferred for the PR author;
  do not treat this branch as rebased onto the BFF-unification changes.

### Coinbase Smart Wallet SIWE hang + Postgres deadlock (2026-06-30)

Branch `codex/merge-bff-betterauth`. Two server-side bugs surfaced when signing in
with Coinbase Wallet (EOA wallets like MetaMask/Rabby were unaffected):

- **SIWE sign-in spun forever for Coinbase.** Coinbase Wallet is a Smart Wallet
  (WebAuthn/passkey, ERC-6492-wrapped signature), so the EOA `ecrecover` path
  rejects it (`invalid signature length`) and verification falls through to the
  on-chain EIP-1271/6492 check. That `verifyMessage` ran a heavy deployless
  `eth_call` against viem's keyless default mainnet RPC (`eth.merkle.io`), which
  timed out (`The request took too long to respond`). With no tight timeout in
  the client fetch, the landing proxy, or the public client, the sign-in spinner
  hung. Fix: `packages/auth/src/better-auth/siwe.ts` (and twin
  `packages/account/src/siwe.ts`) now read a per-chain RPC env override
  (`MAINNET_RPC_URL`/`ETH_RPC_URL`, `BASE_RPC_URL`, etc.) and use
  `http(url, { timeout: 10_000, retryCount: 1 })`. **Requires** setting a real
  EVM RPC (e.g. `MAINNET_RPC_URL`) in `apps/portal/.env.local` for verification
  to actually succeed; otherwise it just fails fast instead of hanging.
- **Postgres `deadlock detected` (×24 in one session).** `ensureAccountSchema()`
  ran the full `schema.sql` (including `alter table … drop constraint` →
  AccessExclusiveLock) on the request path, gating getOrCreate / link / delete.
  Concurrent requests deadlocked the DDL against row writes on
  aomi_users/aomi_auth_identities/aomi_wallets. Fix:
  `packages/auth/src/service/account-service.ts` memoizes `ensureAccountSchema`
  so the DDL applies at most once per process (failure clears the cache to allow
  retry). The dev-auth-stack script already applies the schema at startup.

### Wallet auth bug fixes: quick sign-in de-dupe + SIWE unlink detachment (2026-06-19)

- Quick sign-in now prefers the provider-level Privy/Para auth row and suppresses
  stored embedded wallet authenticate rows for that same provider. This removes
  the duplicate "Privy" row where one row showed the provider method and another
  showed the stored SVM address.
- Manage wallets now folds stored provider wallets into the connected provider
  row for display, so a live Privy SVM connection plus stored Privy EVM wallet
  renders as one `EVM/SVM` row. Actions still target only live wallet legs.
- SIWE/link signature verification now tries EOA recovery first, then Viem
  public-client verification for contract accounts (ERC-1271 / EIP-6492), fixing
  Base Account signatures that previously returned `invalid_wallet_signature`.
- The portal dev auth E2E page no longer nests its own wallet provider inside the
  root `WalletProviders`, avoiding duplicate Privy provider instances.
- SIWE wallet unlink now detaches BetterAuth state for that wallet address, not
  just the Aomi `aomi_wallets` row: matching BetterAuth `walletAddress` and
  `account(providerId='siwe')` rows are deleted, matching Aomi
  `better_auth` identities are revoked, `aomi_users.better_auth_user_id` is
  cleared if it pointed at the detached BetterAuth user, and SIWE-only synthetic
  BetterAuth users/sessions are removed. This prevents an unlinked MetaMask/SIWE
  wallet from logging back into the old account.
- Regression coverage: `wallet-picker.test.tsx` asserts the duplicate Privy
  quick-sign-in row is suppressed. SQL cleanup was validated against local
  Postgres in a rollback-only transaction with fake SIWE rows.

### Wallet-kit: removed the account `signInPolicy` gate (2026-06-19)

Branch `codex/widget-auth-pre-rust`. Stripped the
`signInPolicy` (`evm-siwe-first | provider-token-allowed`) concept from the
account layer — any provider credential is now exchangeable in any order (create
when there's no account, link when one exists); SIWE was already ungated.

- `aomi-backend-runtime.ts`: dropped `signInPolicy` from
  `AomiBackendAccountConfig` + the hook input + effect deps; the exchange
  endpoint no longer branches on a policy (`account.user` → link via
  `/api/aomi/provider/exchange`, else create via
  `/api/auth/aomi/provider/exchange`).
- Removed `signInPolicy` from `config/types.ts` `AccountConfig` and from all
  three runtime call sites (`AomiWalletKitProvider`, `ParaPluginProvider`,
  `PrivyPluginProvider`) and the portal dev-e2e route.
- Follow-up fix: explicit sign-out now clears prior provider exchange locks and
  suppresses only the exact stale provider credential observed during sign-out
  until the SDK reports unauthenticated or changes identity. This keeps auth
  policy-free while preventing an old Privy/Para SDK session from silently
  recreating the just-signed-out account.
- Follow-up fix: rejected/failed automatic SIWE no longer poisons account
  `status` to `error`; it suppresses repeat prompts for that wallet and leaves
  provider-token sign-in free to proceed.
- Follow-up fix: provider-supplied `Sign out` rows in the wallet picker now call
  the full account sign-out path (`disconnect({ family: "all" })` +
  `account.signOut`) instead of only disconnecting the provider row.
- Dev E2E harness fix: `linkSecondTestWallet` now fetches the link nonce, signs
  a message containing it, and posts the nonce back to `/api/aomi/wallets/link`.

### Account manager: collapse Privy/Para EVM+SVM into one row (2026-06-19)

Branch `codex/widget-auth-pre-rust`. UI cleanup of the "Manage account" panel
(`apps/registry/src/components/control-bar/wallet-picker.tsx`) so a
provider-backed sign-in no longer shows as two cards per family.

- **New pure helpers + `FamilyChip`** (module scope, easy to test): `WalletLeg`,
  `sortLegs` (EVM before SVM), `joinLegAddresses`, `singleNetworkName`,
  `buildConnectedEntries`, `buildAccountAccessEntries`, `connectedLinkState`.
  `FamilyChip` renders one dot+label per family and the combined **"EVM/SVM"**
  label when a row carries both (capability dot: amber = read, emerald =
  write/connected).
- **Connected now:** `buildConnectedEntries` groups the live `walletModalRows`
  by `provider` — Privy/Para fold into one "Privy"/"Para" row whose subtitle is
  `evmAddr / svmAddr · <network?> · <linkState>`. External wallets (no provider)
  stay one row each. `ConnectedWalletSummaryRow` now takes a consolidated
  `entry` instead of a single `WalletModalRow`.
- **Account access:** `buildAccountAccessEntries` merges each provider auth
  identity with the wallets sharing its `provider` into one canonical row
  (sign-in + EVM/SVM addresses), instead of one session row + two wallet rows.
  Provider-less identities (Google) and SIWE/observed external wallets stay
  standalone. `LinkedAuthAccountRow` gained optional `wallets`/`supportedEvmChains`
  and renders the `FamilyChip` + address subtitle when wallets are folded in;
  rename/unlink still target the auth identity.
- **Manage wallets (interactive switcher):** same provider grouping applied to
  the front-panel "Connected" list. `groupConnectedByProvider` folds Privy/Para's
  EVM + SVM into one row; `FamilyStatusRow` was replaced by `ConnectedWalletRow`
  which takes `legs` + a deduped `ConnectedActionRef[]` (each action routed to its
  owning leg). Select targets the non-active EVM leg; a provider's two `signout`
  actions collapse to one full account sign-out. External wallets (no provider) are
  unchanged, one row each.
- **FamilyChip:** one capability dot (not one per family) before the combined
  "EVM/SVM" — the legs are always connected together, so two dots read as noise.
  Dot is amber only when every leg is read-only, else emerald.
- **Regression fix (provider grouping):** the first grouping pass keyed/titled on
  any non-empty `provider`, so a SIWE-verified MetaMask (`provider: "siwe"`)
  rendered as a "siwe" row. Added `isEmbeddedAccountProvider` (privy/para/
  baseAccount only) and gated `buildConnectedEntries`, `groupConnectedByProvider`,
  and `buildAccountAccessEntries` on it — `siwe`/`siws`/`observed`/etc. are
  verification methods, not wallet brands, so those rows keep their own name and
  never group. Test: "keeps a SIWE-verified external wallet's own brand, not
  'siwe'". Suite 31 green.
- **Bug fix (default link label):** `linkWallet` in
  `account/aomi-backend-runtime.ts` derived the first-link label from
  `activeEvmConnection.walletName` — the _active_ EVM signer — so linking
  MetaMask while a Privy smart wallet was active produced "Privy Smart Wallet 1".
  Extracted `resolveLinkedWalletName` (match the live EVM account by `accountId`,
  then `address`; fall back to the active connection only when absent) and named
  the label after the wallet actually being linked. Note: persisted labels keep
  via `coalesce`, so already-mislabeled rows need a manual rename; the fix is
  forward-looking. New `aomi-backend-runtime.test.ts` (6 tests) covers the
  resolver + `buildDefaultWalletLabel`. Artifact: surgically patched only
  `aomi-backend-runtime.ts` inside `aomi-wallet-kit.json` (left the file's
  pre-existing `types.ts`/`brands.ts` drift untouched; `dist/aomi-wallet-kit.json`
  is gitignored).
- **Tests:** added "collapses a provider's EVM + SVM into one row in both
  sections" (now asserts 3 consolidated chips: Manage wallets + Connected now +
  Account access) and "collapses a provider's wallets into one row in Manage
  wallets" to `wallet-picker.test.tsx`. Suite 30 green. Also green: wallet-kit +
  control-bar suites (152), `apps/registry` tsc, lint, `build:lib`, pinned
  registry-artifact test. Rebuilt registry + synced **only** `control-bar.json`
  (the artifact embedding `wallet-picker.tsx`); reverted unrelated pre-existing
  drift in the para/privy/wallet-kit provider JSONs.
- **Pre-existing, NOT from this change:** `typecheck:landing` reports 3 errors
  (`WalletsConfig.embedded` in `landing-wallet-kit-provider.tsx` +
  `para-solana-runtime-driver.tsx`, and a generated `.next` `chat-ui-lab/page.js`
  type) — confirmed present with this change stashed.
- **Not eyeballed live:** the merged Privy/Para state needs a real provider
  session, so it's verified via the component test rather than the browser.

### Widget auth plan — full rewrite + 48 locked decisions + merge model (2026-06-17)

Branch `polish-multi-wallet`. No code — extended the earlier review into a
complete decision sweep (48 questions via the question tool) and a focused
investigation of the one open risk (account clustering/merging), then **rewrote
`specs/WIDGET-AUTH-PLAN.md` from scratch** in an agent-followable style (mermaid
diagrams, ERD, structs, phase checklists). All decisions are in the plan's §16
Decisions log + the [[widget-auth-plan-decisions]] memory. Headlines:

- **Scope:** full `aomi_*` core schema (users/identities/wallets) **+**
  `aomi_account_events`; drop proofs + challenges. Provider-token sessions IN v1.
  Keep + expand the existing account UI.
- **Identity:** separate `aomi_users.id` mirroring BetterAuth user; EVM identity
  chain-independent for EOAs, chain-scoped for smart accounts; anonymous
  wallet-only users; display name derived from address.
- **Sessions/tokens:** BetterAuth + bearer plugin from day one; 7d rolling-daily;
  portal injects the Rust bearer; Rust mints now / portal at Phase F.
- **Merge model (the investigation result):** one signal-resolution ladder —
  unclaimed auto-links; a signal owned by another account warns (yellow if it
  survives, **red** if it's the last factor → move + absorb data + permanently
  close). Merge only in the red case, survivor always the current account,
  reactive only, email follows the same ladder. "Recovery" falls out of moving
  your wallet; no separate merge engine. Threads follow the wallet (real re-key is
  Phase F; v1 records the policy + an `aomi_account_events` row).
- **Build boundary:** ~85-90% ships on portal + a fresh Supabase project with the
  Rust backend untouched (the account layer is additive); §14 has the Phase F
  handoff contract.
- **Still open (data, not design):** the real `trustedOrigins` list; the Phase F
  id-mapping final pick (leaning DB unification).

Precursor PR (agreed, backend-free): the `walletKey` SVM case-sensitivity fix.

### Widget auth plan review + locked decisions (2026-06-17)

Branch `polish-multi-wallet`. No code — collaborative review of
`specs/WIDGET-AUTH-PLAN.md` (BetterAuth + SIWE + Privy/Para → canonical
`aomi_users` model). Verified the plan against the tree: `walletKey` SVM bug is
real (`wallet-utils.ts:5`), `AccountRuntime` is the thin stub the plan describes
(`account/types.ts`), and `apps/portal` is already a BFF proxy
(`api/[...slug]/route.ts` forwards `authorization` + allowlists
`/api/account/sessions/exchange`). Key find: `AomiAccountCredential`
(`types.ts:260`) already has provider-token + `{ kind: "cookie" }` variants and
`getAccountCredential` is documented to exchange for a short-lived Aomi bearer.

Four decisions locked at the time (now superseded for backend auth by the
2026-07-01 static service-topology AccountBearer path): (1) trust boundary =
thin token at the backend — BetterAuth signs an Aomi backend JWT carrying
`aomi_user_id`, Rust verifies it via JWKS;
(2) session transport pluggable — same-origin cookie now, bearer addable later;
(3) BetterAuth = successor to the System A account-session exchange, MCP approvals
(System B: `packages/auth`) untouched, reuse `makePrivyJwtVerifier`; (4)
the original SIWE-first Phase 1 decision is superseded by the 2026-06-19
policy-free model where any verified wallet or provider can create/sign into an
account. First two PRs are pure: `walletKey` SVM fix +
`AccountRuntime`/`AccountWallet` type widening (§8.3). Delivered four
diagrams (system+trust-boundary, three identity layers, ER data model, System A
vs B). See [[widget-auth-plan-decisions]].

### Account manager slide-in + ungated Account button (2026-06-16)

Branch `polish-multi-wallet`. `wallet-picker.tsx` + `wallet-picker.test.tsx`.
First slice of the locked account-management UI design (see
[[wallet-account-mgmt-ui-design]] / `specs/WALLET-ACCOUNT-MGMT-UI.md`) — the
push-nav shell + an Account panel stub.

- **Account button now shows for any connected wallet.** Was gated on
  `identity.isConnected && openAccountUI && canOpenAccountUI` (Para/Privy only);
  now gated on `hasConnectedWallets`, so wallets-only/external sessions get it too.
- **Clicking "Account" slide-navigates instead of opening the provider modal.**
  The picker body is now a double-width push-nav track (`w-[200%]`, two
  `w-1/2` panels, `-translate-x-1/2` on `view === "account"`, 300ms ease-out).
  Each panel has its own header; the inactive panel is `inert`. New `view`
  state (`"wallets" | "account"`), reset on close and when all wallets drop.
- **`AccountManagerPanel` stub**: back-chevron header, an identity card
  (provider brand mark or `UserRound` + display name + provider/wallet-count
  subtitle), three dashed "Soon" placeholder rows (Profile / Linked wallets /
  Security), and — only when `openAccountUI`+`canOpenAccountUI` exist — an
  "Open provider settings" row that hands off to the native provider modal
  (so Para/Privy lose nothing). The per-row gear "manage" action is unchanged.
- `ManageAccountButton` is now pure navigation (dropped its `canOpen` gate +
  async spinner).
- Tests: retargeted "opens account management from the picker header" →
  "slides to the account manager and can open the provider UI"; added
  "shows the account button for a wallet-only session without a provider UI";
  loosened the duplicate-"Account" text assertion; flipped the Privy-session
  test to expect the button present. New/changed picker tests pass.
- **Pre-existing failures (NOT from this change, confirmed against pristine
  HEAD):** `wallet-picker > uses the Para brand mark for manageable Para
accounts with generic names` (`getWalletIcon("…para…")` → null brand, likely
  fallout from the recent icon-registry refresh) and `network-select >
connects without a family selection`.
- Not yet eyeballed live (the connected state needs a real wallet extension):
  confirm the slide reads cleanly and the stub panel looks right.

### Wallet-kit cleanup sweep execution (2026-06-15)

Implemented a verified cleanup pass against `specs/WALLET-KIT-CLEANUP.md`:

- **C1 account ownership:** `selectAccounts(state, family, now, chain?)` now builds
  one family at a time; EVM/SVM runtimes call it with their own family; the composer
  concatenates disjoint EVM + SVM rows; `dedupeAccounts` was removed.
- **C2 partial:** dropped `ExecutionRuntime.svm`; the composer reads SVM signing/RPC
  methods only from `svm.execution`, removing the six `??` fallbacks.
- **C3 picker rows:** `WalletPicker` now consumes `adapter.walletModalRows` for
  live, stored, option, Solana, generic browser-wallet, and social/auth rows, and maps
  row actions back to the existing adapter handlers.
- **C4 duplication consolidation:** added shared `walletKey`/`toRegistryFamily`
  helpers, folded `composer/build-accounts.ts` into `accounts.ts`, merged provider
  label formatting into `formatWalletProvider`, consolidated AA provider-state
  resolution behind a single owner-strategy resolver, renamed the config-side native
  execution policy resolver, and renamed the wallet-kit address formatter to
  `formatWalletAddress`.
- **C6 Privy symmetry:** split the Privy provider monolith into
  `PrivyPluginProvider.tsx`, `PrivyProvider.tsx`, `privy-auth.ts`, `privy-svm.ts`,
  and `privy-execution.ts`; `privy.tsx` is now a compatibility barrel; Para and
  Privy plugins both expose `isAvailable`.
- **C5 dead code/deps:** removed `useSafeWagmiAccount`,
  `isProviderInternalWalletLabel`, public `EVM_PRESETS`/`SVM_WALLET_PRESETS` barrel
  exports, internal SVM helper exports, the dead Para Solana wrapper/deps, the
  branch-only `AomiBaseAccountProvider` surface/folder, and
  `ParaPluginProvider.solanaConfig`.
- **C7 layering:** moved identity grace into `registry/`, SVM network shaping into
  `catalog/`, AA owner into `execution/`, folded root wallet preferences into
  `network-preferences.tsx`, deleted `wallet-family.ts`, deleted the root
  `wallet-execution.ts` shim, and deleted the unused `internal.ts` barrel/subpath.
- **C8/C9 finish:** extracted adapter actions to
  `composer/build-wallet-kit-actions.ts`, split full-testnet pure config into
  `full-testnet-config.ts`, moved the auth-plugin composer ternary into
  `WalletKitComposerOutlet`, added the shared `WalletRuntime<F>` surface, and moved
  internal SVM identity fields to `svm*` while keeping deprecated `solana*` aliases.
- Rebuilt registry artifacts and synced `apps/registry/dist` to `apps/landing/public/r`.

Verification run:

- `pnpm run typecheck`
- `pnpm typecheck:landing`
- `pnpm --filter @aomi-labs/widget-lib exec vitest run src/lib/wallet-kit src/components/control-bar/wallet-picker.test.tsx`
- `pnpm exec vitest run packages/client/test/registry-chain-artifacts.unit.test.ts`
- `pnpm exec vitest run packages/`
- `pnpm run lint`
- `pnpm run build:lib`
- `pnpm run build:registry` + `rsync -a --delete apps/registry/dist/ apps/landing/public/r/`

Still open in the cleanup doc: the remaining C8 config-ladder collapse item and all
manual wallet-extension checks (E1/E3/E4/E5/E6/S1/S2/S3/S4/D1/P1).

### Wallet-kit cleanup sweep spec (2026-06-15)

Branch `polish-multi-wallet`. No code changes — second deep audit of the wallet-kit
after most of the migration landed, plus a new **`specs/WALLET-KIT-CLEANUP.md`**:
a 10-phase (C1–C10), checkbox-driven, verifiable cleanup backlog with a final gate +
manual landing matrix. Scorecard: registry core / EVM execution factory / pure
registry sources / SVM commands / catalog are clean; the remaining debt is a
consistency finish. Findings:

- **Root coupling (C1):** `registry/selectors.ts` `selectAccounts` is family-agnostic;
  the EVM runtime returns both families unfiltered while SVM filters — so
  `evm.selectAccounts() ⊇ svm.accounts()`, which caused the duplicate-Solana-row bug
  the user's agent band-aided with `dedupeAccounts`. Fix: `selectAccounts(state, family, now)`.
- **Symmetry (C2):** `EvmWalletRuntime`/`SvmWalletRuntime` are still two bespoke types
  (no shared `WalletRuntime<F>`); SVM execution has two sources → 6 `??` in the composer;
  SVM connect/disconnect control-flow still lives in the composer (double-disconnect).
- **Picker (C3, decided=wire it):** `walletModalRows`/`mergeWalletRows` is produced but
  the picker never reads it (builds rows ad hoc). Wire the picker, delete the assembly.
- **Dup (C4):** `walletKey` (×5), `formatProvider`≈`formatWalletProvider`, two ~80%
  AA resolvers, inline `solana→svm` mapping (×3), `formatAddress` ×2, name collisions.
- **Dead code/deps (C5, decided=delete now):** `useSafeWagmiAccount`,
  `isProviderInternalWalletLabel` stub, dead Para Solana wrapper in `para-svm.tsx`
  (drops `@getpara/solana-wallet-connectors` + `@solana-mobile/...`), `AomiBaseAccountProvider`
  - duplicate `base-account` branch + `ParaPluginProvider.solanaConfig`, `wallet-family.ts`
    (`toWireWalletFamily` 0 callers), dead `internal.ts` barrel, zero-consumer presets.
- **Provider symmetry (C6):** Privy is a 658-line monolith; split to mirror Para's
  file layout + align the plugin `isAvailable` field.
- **Layering (C7):** `registry/selectors.ts`→`runtime/evm/identity-grace` (real
  violation; move down); fold `aa/` into `execution/`; collapse root `persistence.ts`
  (dead `selectedFamily`) into `network-preferences`; delete root `wallet-execution.ts`
  shim + move its test.
- **Decomposition (C8):** config provider is STILL an 8-component ladder (the collapse
  never happened); composer `adapter` useMemo ~220 lines → extract `build-wallet-kit-actions`.
- **Naming (C9):** `AomiSessionIdentity` mixes `svm*`/`solana*`; `EvmIdentityTransform`
  via `ReturnType<…>`.

Decisions locked: wire the picker; one combined doc (incl. symmetry finish); delete the
branch-only deprecated surface now. Pending: execute C1–C10.

### Wallet-kit finish-line plan rewrite (2026-06-15)

Branch `polish-multi-wallet`. No code changes — broad architecture review of the
whole wallet-kit (4 parallel deep-dive audits: provider asymmetry, EVM/SVM runtime
symmetry, consumer surface/exports, registry core) and a from-scratch rewrite of
**`specs/WALLET-PROVIDER-PLUGIN-REFACTOR.md`**. Findings re-baselined against the
actual half-migrated tree:

- **The registry core is the good part** (pure reducer + policy + `planCommands` +
  store; active-per-family). Keep it; only consolidate scar tissue (suppression-
  reason list duplicated ×3, double-counted heal budget, extract connection-order).
- **Four seams are the real mess:** (1) two public entry points that disagree
  (`config/AomiWalletKitProvider` capability path vs `providers/index.tsx`
  `AomiWalletProvider` union) + a dead second Para mount path (`para.tsx` +
  `paraPlugin.render`, reachable only from a dev driver); (2) EVM is a real runtime
  but SVM is call-site glue (no `useSvmWalletRuntime`; connect/disconnect/identity
  smeared across the composer; SVM connect bypasses `planCommands`); (3) half-
  finished `svm`/`solana` rename with ~17 `Solana*=Svm*` aliases running through
  file interiors; (4) duplication + leaky surface (`para-aa.ts` ≈95% copy of
  `execution/aa-provider-state.ts` with drifted Alchemy/Pimlico precedence; `index.ts`
  re-exports ~100 internals via 13 `export *`; `registerAomiParaWalletProvider()`
  side-effect foot-gun that silently degrades to wallets-only if forgotten; landing
  imports via `../../../registry/src` + dev drivers reaching into `providers/para`).
- **Plan shape:** P1 vocabulary (svm internal, solana public edge) → P2 symmetric
  `useSvmWalletRuntime` + `svm/connect`·`svm/disconnect` registry commands +
  `selectSvmIdentity` → P3 unify execution behind `runtime.execution.send/sign`
  (move inline `executeWalletKitTransaction` out of composer) → P4 one
  `resolveAAProviderState({ ownerStrategy })` → P5 single entry + self-registering
  plugins that throw on misconfig + delete dead Para path → P6 registry scar
  cleanup → P7 barrel hygiene + consumer DX + dev-driver relocation → P8 whole-
  migration gate (automated + invariant re-check + manual landing matrix E1–E8/S1–S3/D1/P1).
- Decision: **full EVM/SVM symmetry in scope this migration** (not deferred). User
  approved rewriting the spec in place.

Pending: await go/no-go to execute P1–P8. No production code touched yet.

### Wallet-kit P3 cleanup sweep — Tiers 1–3 (2026-06-14)

Branch `polish-multi-wallet`. Three committed, independently-green tiers from the
architecture review. Each verified with `typecheck:landing`, the packages vitest
suite (363) + the apps/registry wallet-kit suite (128, via
`pnpm --filter @aomi-labs/widget-lib exec vitest run`), lint, and the pinned
registry-artifact test; artifacts rebuilt + synced to `apps/landing/public/r`.

- **Tier 1 (`62cfff62`):** new `execution/execution-runtime.ts`
  (`buildEvmExecutionRuntime`) routes the Para/Privy/wallets-only EVM execution
  lanes through one factory (removed ~15 duplicated lines each); deduped
  `detectSvmTransport`/`getSvmCapabilitySnapshot` (composer imports them from
  `runtime/svm`); widened provider-id + `linkedVia` unions to branded open
  strings (`(string & {})`) so adding a provider is no longer a type edit.
- **Tier 2 (`c6d82b15`):** `runtime/evm/brands.ts` gains a `registerWalletBrand`
  registry and drops the hardcoded `"para"` branch — Para registers its brand
  from `providers/para/para-brand.ts` (`PARA_BRAND_KEY`); `wallet-picker`
  `linkedVia` switch generalized off `para`/`privy`. Legacy `detached-para`
  persistence key + `paraDetached` field documented as frozen core migration
  identifiers (moving them into providers/para would regress a wallets-only build
  opened after a Para session).
- **Tier 3 (`08d7d0db`):** `providers/plugin-registry.ts` +
  `para-plugin.tsx`/`privy-plugin.tsx` descriptors replace the
  `if (provider === "para"/"privy")` branches in
  `config/AomiWalletKitProvider.tsx`, which also drops its direct
  `@getpara/react-sdk` import. Eager registration only.

Deferred (flagged to the user): lazy bundle-split of provider registration;
hoisting `WalletRegistryStore` out of the EVM runtime (its executors are
wagmi-specific, so the hoist only pays off for a Solana-only-without-EVM target,
which does not exist today).

### Wallet provider plugin refactor — grand plan rewrite (2026-06-13)

Branch `polish-multi-wallet`. No code changes — full rewrite of
**`specs/WALLET-PROVIDER-PLUGIN-REFACTOR.md`** into a single-PR "finalize
everything" plan with exact structs, the `AomiWalletKit*` naming, target folder
tree, and per-phase (P0–P8) execution detail. Decisions locked this session
(13 total) after a deep read of the actual built code (composer, Para/Privy/Base
plugins, EVM/SVM runtimes, registry core, account stub, `para-aa.ts`,
`wallet-execution.ts`, `aa/owner.ts`):

- **Naming:** wallet/account layer is `AomiWalletKit*` (NOT `AomiRuntime*` —
  that collides with `@aomi-labs/react`'s chat widget `AomiRuntimeProvider`/
  `useAomiRuntime`). `AomiWalletKit→AomiWalletKit`, `AomiSessionIdentity→
AomiSessionIdentity`, `socialLoginOptions/connectSocial→authMethods/
authenticate`, `evmWallets/solanaWallets→walletOptions`. All old names kept as
  `@deprecated` aliases for 1–2 releases.
- **Lost-wallets fix (P1):** Aomi-owned connector catalog (`catalog/`) supplying
  injected EIP-6963 + WalletConnect + Coinbase + Base Account in ONE isolated
  wagmi config, replacing the 3 duplicated per-provider configs. WC ships an
  Aomi default projectId (host override). Installed wallets already arrive via
  EIP-6963; the real gap was only WC + Coinbase. Para's modal becomes auth-only.
- **One composer path (P2/P5):** Privy and Base stop hand-building adapters; Base
  is fully replumbed to a `baseAccount()` catalog connector + execution policy
  (no longer a provider mode).
- **AA fix (P4):** additive `external-wallet` `AAOwner` variant in
  `@aomi-labs/client` (CLI `direct` + Para `session` branches untouched);
  wallets-only/Privy get real AA; the `if (!paraSession)` gate that starved
  external-wallet 4337 is dropped from the generic path. 7702→4337 fallback for
  external signers stays. Key finding: AA engine is Aomi's (Alchemy/Pimlico via
  env); Para's only role is the embedded owner/signer (the "session" = signing
  authority).
- **Public API (P6):** capability-shaped `AomiWalletKitProvider` with
  `auth`/`wallets:{evm,solana,embedded}`/`execution`/`account` + presets
  (`para`/`privy`/`wallets-only`). Embedded nested under `wallets`, usually
  implicit from the auth provider. Config = presets + override + BYO connectors.
  **wallets-only is first-class.**
- **Identity split (P0):** `walletProvider → authProvider/embeddedProvider/
walletSource`; types now, `/api/state` payload migration deferred with backend.
- **Multi-provider future:** decision #1 revised — one canonical auth (Better
  Auth), many linked providers/embedded wallets switchable, hosted SDKs
  lazy-mounted one at a time. The `mergeWalletRows` stored→`authenticate` path
  (currently computed-and-discarded) gets wired (P7) as the seam; stored wallet =
  read-visible only, write approval separate/deferred.
- **"Preview" dropped** — confirmed no such concept in code; it was "Privy."

Pending: await go/no-go to execute P0–P8. No production code touched yet.

### Wallet provider plugin refactor plan rewrite (2026-06-12)

Branch `polish-multi-wallet`. No code changes — rewrote
**`specs/WALLET-PROVIDER-PLUGIN-REFACTOR.md`** after a planning discussion grounded in
`meeting-2026-06-10-wallet-auth-backend-frontend.md`. The plan is now the successor to
WALLET-ARCHITECTURE.md §12–13 / WALLET-REFACTOR-PLAN.md. Headline changes:

- **"Wallet Links Runtime" renamed to Account Runtime** and re-shaped around a canonical
  Aomi user (`{ user, linkedAccounts, wallets }`): provider subjects (Para/Privy/Google)
  are linked accounts _under_ the user, not the root identity. `capability: "read"|"write"`
  reserved on stored wallets (linking ≠ authorization, per the meeting's impersonation
  discussion); `verifiedAt` optional; `linkedVia` gains `"observed"`.
- **Session model written in**: provider session (browser credential source) vs Aomi
  session (canonical; today `POST /api/account/sessions/exchange`, later same-origin
  cookie via Next.js server functions + Better Auth). `AomiAccountCredential` gains a
  `{ kind: "cookie" }` variant; no bearer-token assumption in the widget.
- **11 locked decisions** recorded (auth singular per deployment with `methods[]`
  multiplicity; `kind: "wallet"` method reserved for future SIWE, not built; approval
  granularity deferred; stored external row → connect, stored embedded row →
  `authenticate` action routing to `auth.login`; Para-branded connector supply kept this
  PR; RainbowKit-style BYO connect UI compatible by construction, deferred; etc.).
- **PR boundary**: this PR = Phases 1 (done) – 6: composer extraction, complete SVM
  runtime extraction out of para-sol.tsx, Para plugin split, Account Runtime
  **types + disabled stub only** (merge path tested with a mocked ready runtime, zero
  network calls), naming sweep last + cuttable. Deferred list is explicit (real Account
  Runtime, approvals, SIWE, Base Account replumb, 6963 migration, identity
  `walletProvider` split).
- Baseline verified at planning time: 110 registry tests green (18 files), F1 fix
  (`?? []` at `context.tsx:61`) confirmed in code, `runtime/solana/` already holds
  networks + registry-source.

Pending: execute Phases 2–6 of the plan; manual browser matrix at the end (extensions).

### Wallet refactor review → WALLET-FOLLOWUP-FIXES.md (2026-06-12)

Full review of the executed `WALLET-REFACTOR-PLAN.md` work plus the manual results in
`docs/wallet-manual-test-results-2026-06-12.md`. No production code changed; all
findings + executor instructions live in **`WALLET-FOLLOWUP-FIXES.md`** (repo root).
Automated baseline green at review time (107 registry tests, 360 root, lint, both
typechecks). Headline root causes, all code-verified:

- **`/api/state` 400 (rows 19–22) = `svm.capabilities: null`** at `context.tsx:61`;
  backend `Vec` + `#[serde(default)]` rejects explicit null (proven against the real
  product-mono deserializer). `auth_method: "wagmi"` is innocent. Fix: `?? []` (F1).
- **Para-auth wallet wipe with no recovery (rows 7–8) = settle timer killed** in
  `sources/wagmi-source.ts` — connections-effect cleanup clears the shared timer, the
  early-return never re-arms it → `wagmi/settled` never fires → `planHeal` never runs.
  The two earlier "heal timing" hotfixes patched symptoms of this (F2, then F3/F12).
- **Rabby → add MetaMask no-op (row 12)**: Para's branded MetaMask connector binds
  Rabby's provider (default-wallet takeover); dedupe discards the real `io.metamask`
  6963 connector; same-address connect collapses into the Rabby row (F5).
- **Phantom EVM auto-connect (rows 2/5)**: no-arg wagmi `reconnect()` tries ALL
  connectors (storage only sorts); heal executor + reconnectOnMount both trigger (F4).
- **Review defects**: 5792 `connector` silently dropped by `useSafeSendCallsSync`
  (CRITICAL, F6); capabilities not active-keyed (F7); `selectAccount` dispatch-last +
  synthetic Para row unselectable (F8); align-to-preference effect deleted undocumented
  (F9, needs decision); `resolveActive` ignores droppedAddresses (F10); family
  disconnect grace zombie (F11); picker DO-NOT-TOUCH edit removed per-row Para sign-out
  (F13, needs decision); + P3 cleanups.
- **Process**: phases 0–9 were left entirely uncommitted (plan required per-phase
  commits) — executor must commit the current tree first (fix doc §0).

### Wallet registry refactor: phases 5, 6, 8, 9 + artifacts (2026-06-11)

Branch `polish-multi-wallet`. Continued `WALLET-REFACTOR-PLAN.md` from Phase 5.

- **Phase 5 heal/disconnect is reducer-driven now.** `useWalletRegistry` uses real
  command executors instead of shadow logging: `wagmi/reconnect`, budgeted
  `wagmi/connect` by stable connector id, surgical `wagmi/disconnect` by uid, and
  Para logout via the existing hook/client fallback. The old Para-local heal ladder
  (`evmReconnect*`, `evmReattach*`, suppression refs, explicit dropped-address refs,
  active-evm legacy persistence writes) was removed from `para.tsx`. The store
  destructively migrates the old active/detached localStorage keys into
  `aomi.wallet.registry.v1`.
- **Two-pass heal is pinned.** After a config rebuild settles, the first pass runs
  silent reconnect; if nothing returns, the store schedules a second settled pass so
  policy can spend the popup reattach budget. Tests cover reconnect -> connect, budget
  decrement, suppression boundary (`now === suppressedUntil`), dropped-address heal
  exclusion, and same-address Para sign-out preserving the surviving external wallet.
- **Disconnect intent is centralized.** Per-row disconnect dispatches
  `user/disconnect-account` with the existing `evm-disconnect-plan.ts` result; the
  reducer now has an optional `markDroppedAddress` so signing out Para while a
  same-address MetaMask/Rabby remains does not suppress the surviving account.
  Family/all disconnect dispatches `user/disconnect-family`; Solana direct disconnect
  remains in the adapter for Phase 6 compatibility.
- **Phase 6 Solana connect machine moved to `sources/solana-source.ts`.** The transient
  `pendingSolanaWallet` intent lives in the registry, with
  `solana/connect-requested` and `solana/connect-settled` events. The source owns the
  400 ms autoConnect grace, observes wallet-adapter `connecting`, calls manual
  `connect()` once if needed, and avoids re-popping after an observed dismissed attempt.
  `para.tsx` now only validates/selects a wallet and dispatches the request.
- **Phase 8 stretch:** added `/privy` in the landing app, rendering the real widget
  inside `LandingPrivyProvider` for manual Privy matrix runs.
- **Phase 9 groundwork:** `AomiAccount` gained optional `linked`/`linkedVia` fields, and
  `registry/types.ts` gained future `WalletLink`. `specs/DOMAIN.md` now records the
  invariant that active wallet per family is owned by `WalletRegistry` and wallet
  recovery decisions are reducer transitions. Mechanical grep confirms
  `useSafeWagmiAccount` is no longer used inside `providers/para/`.
- **Registry artifacts refreshed.** `apps/registry/src/registry.ts` now includes the
  registry core/source files and wallet picker stack that were previously stale.
  Ran `pnpm run build:registry`, synced `apps/registry/dist` into
  `apps/landing/public/r`, and the pinned registry artifact test is green.
- **Phase 7 caveat:** the registry file lists/artifacts were refreshed, but the large
  `para.tsx` decomposition into <400-line modules was not performed in this pass to
  avoid a high-risk mechanical move on top of behavior changes. This remains the main
  incomplete item from the written execution plan.
- **Automated verification run:** registry focused tests (27 registry tests), picker
  tests, `pnpm --dir apps/registry exec tsc --noEmit`, `pnpm run build:registry`, and
  `pnpm exec vitest run packages/client/test/registry-chain-artifacts.unit.test.ts`.
  Manual matrix rows still require browser wallet extensions and are not claimed here.

Follow-up from manual browser testing: opening the Para login modal with external wallets
connected, then cancelling before login, could wipe all EVM connections because
`para/auth-flow-started` suppressed popup reattach and the Phase 5 policy did not attempt
silent recovery during ordinary `settling` transitions. Fixed `planHeal` so non-stable
missing external wallets run silent `wagmi/reconnect` even while popup reattach is
suppressed, while still refusing to heal deliberate family disconnects or dropped
addresses. Debug `evm:heal` now reports `phase` and `suppressed` for this path.
Second follow-up: allowing popup reattach during Para auth fixed the cancelled-login wipe,
but it could reopen MetaMask/Rabby while a Google login was still in progress. The store
now delays the post-`wagmi/reconnect` settled pass from `SETTLE_QUIET_MS` to
`AUTH_FLOW_RECONNECT_SETTLE_MS` while Para auth suppression is active, so silent reconnect
gets a chance to restore authorized wallets before the budgeted popup fallback is planned.

### Wallet registry refactor: executable plan (2026-06-11)

Branch `polish-multi-wallet`. New **`WALLET-REFACTOR-PLAN.md` at repo root** — the
phase-by-phase execution plan implementing WALLET-ARCHITECTURE.md §12, written for an
executor agent. No code changes. Structure:

- **10 phases (0–9), each independently green + committable**: 0 manual test matrix
  (16 rows, M1–M16) → 1 WalletRegistry pure core (types/reducer/policy/commands/
  persistence/store + unit tests, unwired) → 2 sources mounted in **shadow mode**
  (wagmi/para-session/solana sources dispatch real events, no-op executors,
  `registry:shadow-diff` comparison logging) → 3 flip identity+accounts to registry
  selectors (grace preserved as state+selector) → 4 **the behavior flip**: registry-owned
  active per family + explicit `connector:` threading through every wagmi action
  (sendTransaction/sendCalls/signTypedData/switchChain/getWalletClient for AA signer),
  delete the enforcement war + legacy localStorage keys (destructive migration) →
  5 heal ladder + disconnect intents as reducer policy (two-pass reconnect→connect,
  budget 2, 5-min suppression; reuses evm-disconnect-plan verbatim) → 6 Solana connect
  state machine into solana-source → 7 decompose para.tsx (<400-line modules, re-exports
  keep import sites; fix stale registry.ts file lists; rebuild dist + sync
  apps/landing/public/r + pinned-artifact test) → 8 optional Privy demo route →
  9 linking groundwork types (`linked`/`linkedVia` on AomiAccount, `WalletLink`),
  DOMAIN.md invariants ("never read wagmi current"), cleanup.
- **Hard guardrails**: DO-NOT-TOUCH list (types.ts additive-only, runtime-tx-handler,
  picker UI, packages/client, packages/react, context.tsx, backend payloads, privy/
  base-account until Phase 8); 9-item functional-invariants checklist; 14 documented
  gotchas (adapter must never unmount, ParaProvider prop stability, wagmi uid regenerates
  per load → persist address+connector.id, grace stays expired, canConnect ungated,
  manageable gating, Phantom-EVM 6963 fuzzy match, Rabby brand sniffing, double-path Para
  logout, switch-in-flight guard, AA both owner shapes/4337-only external, jsdom stubs,
  pure-reducer Date.now() discipline).
- **Verified baselines recorded in the plan**: registry suite 67 tests green
  (`cd apps/registry && pnpm exec vitest run`), registry tsc clean (the previously
  flagged GITHUB error at para.tsx:231 no longer reproduces), exact build/artifact
  commands (`pnpm run build:registry` + cp to `apps/landing/public/r/`).
- Effort map: ~7–10 days core path; Phases 0–4 alone are a coherent smaller PR
  (headline fixes: stable active wallet, enforcement deleted).

### Wallet architecture document + replan (2026-06-11)

Branch `polish-multi-wallet`. New **`WALLET-ARCHITECTURE.md` at repo root** — no code changes.
Full-stack explainer + diagnosis + refactor plan for the wallet/auth mess, written after a
deep sweep of the adapter lib, UI surfaces, AA/CLI flow, host wiring, and the Para/Privy
official docs + shipped SDK source. Key findings recorded there:

- **Root diagnosis**: Para is both identity provider AND wallet plumbing while we bypass its
  account model (Para's own "NONE connection mode" — external wallets via
  `externalWalletConfig` are local wagmi connections, NOT account-associated). Active wallet
  = wagmi's mutable `current` pointer, which Para's SDK re-asserts via a shipped
  `connecting_para_connectors` state machine (source-verified) — all rounds 1–5 machinery
  (enforcement budgets, heal ladder, grace windows) fights that.
- **Phantom-EVM stability explained**: it connects via wagmi's EIP-6963 injected connector
  (PHANTOM isn't in our Para external list), bypassing Para's branded-connector lifecycle.
- **Para AA constraint confirmed**: 7702 = embedded wallets only (EIP-191 prefix vs raw
  ecrecover); external wallets = 4337 only.
- **Para Account Linking** exists (getLinkedAccounts/linkAccount/verifyExternalWalletLink,
  June 2025) but is thinly documented; Para JWT carries `wallets[]` + `connectedWallets[]`.
  Privy's linked-accounts natively models the end-state (unlimited linked wallets,
  identity tokens). `/api/account/sessions/exchange` already accepts both providers.
- **Proposed target architecture** (doc §12): single owned WalletRegistry store (pure
  reducer), wagmi/Para/wallet-adapter demoted to event sources, active-per-family declared
  not derived, signing routed via wagmi's explicit `connector` param (verified in
  @wagmi/core types) so the `current` pointer is never read → enforcement deleted.
  One versioned localStorage key replaces active-evm-address + detached-para keys.
- **8-step plan for next PR** (doc §13): test matrix → registry in shadow mode → flip
  identity/accounts → flip signing + delete enforcement → reducerize heal/intent →
  decompose para.tsx (<400-line modules) → Privy demo route → linking type groundwork.
- **Open product decisions** (doc §14): linking strategy (Para linking vs Privy vs own
  signature-challenge), offer-linking UX, possibly migrating MM/Rabby to plain 6963
  connectors, SVM cluster-switch remount UX.

### Wallet round 5: adapter must never unmount + re-attach popup cap (2026-06-10)

Branch `polish-multi-wallet`. Round-4 fixed refresh-active (user confirmed). Two remaining reports, one structural root cause found:

- **"A while after Para sign-out, all wallets disconnect (and the Para quick-sign-in row looks disabled for a bit)"** — root cause: `ParaSolanaWrapper` rendered `children(false)` (raw children, NO `AomiParaPluginProvider`) whenever `useParaClient()` returned null. Para nulls its client transiently during logout/re-init → the **entire adapter subtree unmounted** → all connection state + heal refs destroyed, no recovery possible. Fix (`para-sol.tsx` + `para.tsx` Inner): the wrapper now caches the last non-null client (`lastParaRef`) so the branch never flips back to providerless mid-session, takes plain `ReactNode` children, and the Inner renders `FullTestnetWalletRouter`+`AomiParaPluginProvider` in BOTH wrapper states — only the Solana context comes and goes; the safe Solana hooks already degrade without it. Logs `para:solana-wrapper {ready}` on flips. (The "disabled for a bit" part is cosmetic: while the sign-out runAction awaits the Para server logout, the picker's global `pending` disables all rows.)
- **"Connecting Para also pops the MetaMask/Rabby extension"** — the re-attach heal re-arms on every connector-set rebuild (the Para login modal rebuilds the config) and `connectAsync` on a locked/de-authorized wallet pops the extension UI. Fix: lifetime budget of 2 re-attach runs per page load (`evmReattachBudgetRef`; logs `re-attach-budget-exhausted`). Storage-based `reconnect()` stays unlimited — it's always silent.
- **Verify next**: Para sign-out with MetaMask+Phantom connected → survivors should stay connected (heal now survives because the adapter doesn't unmount; look for `para:solana-wrapper` + `evm:heal` lines); opening Para login with wallets connected → no MM/Rabby popups (at most 2 lifetime, only after a real wipe).

### Wallet round 4: enforce-budget refund + Para logout fallback (2026-06-10)

Branch `polish-multi-wallet`. The round-3 trace nailed the remaining refresh bug: Para doesn't steal once — wagmi flips `current` to the just-(re)connected connector as each connection completes during boot (connections grew 1→2→3→4; Para re-asserted 4+ times in one load). The enforcement's "satisfied → reset budget" never fired because each satisfaction landed while the previous switch was still in flight (`skip: switch-in-flight` in the trace), so attempts accumulated ACROSS won fights and the 4th theft hit `budget-exhausted` → Para wins. **Fix**: refund the budget when a `switchAccountAsync` _succeeds_ (in `.then`), so the 3-attempt cap only bounds _consecutive failed_ switches — the boot-time war is now won regardless of rounds. Known tradeoff: switching to the Para account from inside Para's own modal would be fought back (the picker is the canonical switch surface; picking Para there updates the persisted choice so no fight).

Second report from the trace session: **per-row Para sign-out doesn't stick across refresh** (post-disconnect trace showed `init {persisted: null}` then Para reconnects as the sole connection). Instrumented + hardened: `evm:account-sign-out` log (wallet/address/isParaAccount/connectors-being-disconnected), `para:logout` logs (via useLogout / via client / ok / failed / no-path), and a duck-typed fallback to `paraSession.logout()` when the `useLogout` hook is missing or rejects — a sign-out can no longer silently no-op. **Awaiting next trace run** to see which logout path fires and whether it errors; if `para:logout` says ok and Para still re-attaches, the session revival is server/cookie-side and needs Para SDK escalation.

Also noted from the trace, unrelated: `wallet_getCapabilities` via Para's EIP-1193 provider hits `https://mainnet.base.org` and gets 403 (public RPC rejects it) — noisy but harmless; consider a capabilities transport override later.

### Wallet round 3: active-wallet debug tracing (2026-06-10)

Branch `polish-multi-wallet`. Para STILL wins active after refresh despite the round-2 enforcement — cause unknown without a timeline, so this round instruments instead of guessing. New `lib/wallet-kit/wallet-debug.ts` (`walletDebug()`, console.info under `[aomi-wallet]`; ON by default in dev, toggle via `localStorage["aomi.wallet.debug"] = "1" | "0"`). Traced: `active-evm:init` (persisted target at mount), `evm:current-changed` (current address/connector timeline — shows exactly when Para steals), `evm:connections-changed` (whether/when the wanted connection restores after refresh), `active-evm:enforce` (every decision: switch-in-flight / satisfied / wanted-connection-absent / current-not-para / budget-exhausted / target-connector-missing / switching / failed), `active-evm:user-select` + `persisted` + `persist-cleared`, `evm:heal` (reconnect / re-attach steps). Hardening: the enforce budget re-arms when the wanted connection (re)appears or its connector uid changes (early "connector not ready" failures must not consume the budget for the real fight). Exported from the lib index; added to the `aomi-wallet-kit` registry item; dist rebuilt + landing `public/r` artifacts synced. **Next step**: user reproduces the refresh-theft with the console filtered to `[aomi-wallet]` and reports the timeline — the suspect branches are wanted-connection-absent (wagmi never restores the external connection), budget-exhausted, current-not-para (Para connector named something unexpected), or no `switching` line at all (persisted target missing).

### Wallet round 2: Para re-assertion enforcement + Phantom autoConnect race + provider subfolders (2026-06-10)

Branch `polish-multi-wallet`. Follow-up to the round-1 fixes after live testing: three bugs remained + a structure ask. 64 registry + 360 root tests green, lint clean, registry+landing typecheck clean.

- **Active EVM wallet enforcement** (`providers/para/para.tsx`): replaced the attempt-once persisted-active-address restore with a watching _enforcement_ effect. Para's connector re-asserts itself as wagmi's current connection on reconnect/session syncs — stomping the chosen wallet after a refresh (the one-shot restore lost the race) and right after the first switch away from Para (the "flips back, second click sticks" bug). The effect re-switches to the persisted choice whenever its connection is live and the current connection is Para _or vacant_ (never fights a different external connector — that's a deliberate wallet-side switch), bounded at 3 attempts per theft (counter re-arms when satisfied). Covers both reported bugs via one mechanism since `selectAccount` updates the persisted address.
- **Phantom SVM connect race — root cause found in wallet-adapter + Para provider source**: Para's `ParaSolanaProvider` mounts `WalletProvider` with `autoConnect: true` (hard-coded), and wallet-adapter marks `select()` as user-initiated → the provider fires `adapter.connect()` ITSELF when the adapter lands. Our manual `connect()` raced it, and the losing attempt's error path (`onConnectError` → `changeWallet(null)`) **unselects + disconnects the wallet** — click silently dies; localStorage often kept the wallet name so a refresh re-ran a clean auto-connect → "works after refresh". Fix: the pending effect now defers to the provider's auto-connect (watches `connecting`), and only calls `connect()` after a 400 ms grace if _no_ attempt was observed (covers providers without autoConnect). A per-target `solanaConnectAttemptObservedRef` prevents re-popping the wallet after a failed/dismissed attempt and settles the pending state if wallet-adapter unselected the wallet.
- **Provider subfolders**: `providers/para/` (para.tsx, para-sol.tsx, para-aa.ts, evm-identity-grace.ts + test, index.ts), `providers/privy/` (privy.tsx, index.ts), `providers/base-account/` (base-account.tsx, index.ts). Folder names match the old module names, so every existing import path (`providers/para`, `providers/privy`, `providers/base-account`) resolves to the new folder indexes — zero changes at import sites (`providers/index.tsx`, `src/index.ts`). registry.ts file lists updated to the new paths (+ index files, + para-sol.tsx which was previously missing); dist rebuilt; the affected artifacts copied to `apps/landing/public/r/` (committed snapshot read by `packages/client/test/registry-chain-artifacts.unit.test.ts`, whose pinned path was updated to `providers/para/para.tsx`).
- **Still needs live verification**: (1) Para + MetaMask → set MetaMask active → refresh → stays MetaMask; (2) first switch away from Para sticks without a second click; (3) Phantom connects on first click (and doesn't re-pop after a dismissed popup). Watch for: enforcement tug-of-war if Para re-asserts repeatedly (bounded per theft, but verify no visible flapping).

### Wallet stack debloat + six reliability fixes (2026-06-10)

Branch `polish-multi-wallet`. Big pass over the branch's wallet/auth code: extract shared modules, then fix the six user-reported bugs on the cleaner base. 64 registry tests green (5 new), lint clean, registry+landing typecheck clean — including the previously "pre-existing" `GITHUB` OAuth-label error, which is gone (the labels map moved to `Record<string, string>`).

**Refactor / debloat**

- **New `lib/wallet-kit/wallet-brands.ts`** — single home for brand canonicalization + detection: `canonicalWalletKey`, `normalizeWalletOptionId`, installed-extension probes (`useInstalledWalletFlags` + EIP-6963 listener), connector→option mapping (`toEvmWalletOption`, `dedupeWalletOptions`, `walletOptionIsDetected`), social-login option labels (now keyed by `string`, not `TOAuthMethod` — provider-agnostic, kills the GITHUB tsc error), `solanaWalletAllowlist`, and the new provider-brand sniffing (below). Exported via the lib index; added to the `aomi-wallet-kit` registry item file list.
- **New `providers/para-aa.ts`** — `resolveParaSponsorship` + `resolveParaAAProviderState` + the AA env consts moved out of para.tsx verbatim. Added to the `aomi-para-provider` registry item file list.
- **para.tsx 1869 → ~1500 lines.** Also dropped a dead `http` import and the `|| false` tail in `hasAnyDisconnectablePath`.
- **Dedup**: `wallet-picker.tsx`'s `walletAliasKey` and `icons/wallet-map.tsx`'s `getWalletIcon` now delegate to `canonicalWalletKey` instead of re-implementing the brand `includes()` chains (wallet-map keeps a flat map keyed by canonical keys; alias fallback for unknown brands still keys on label only so connector uids don't fragment dedupe).
- **Dead code removed**: `FamilyStatusRow`'s no-`account` branch ("Not connected" fallback + `familyShortLabel`) — the picker always passes an account.
- **`useSafeConnections` memoized** on the wagmi store snapshot — it built a fresh array per render, which sat in the adapter `useMemo` deps and rebuilt the whole adapter every render.
- **Privy readiness (assessed, not wired)**: `providers/privy.tsx` already implements the same `AomiWalletKit` contract incl. `buildAccounts`/`selectAccount`; picker degrades gracefully where it lacks optional fields (`evmWallets` → falls back to `connect({family})`). Architecture is ready; actual Privy wiring deferred per user ("don't break too much before this PR").

**Bug fixes (all need live verification with real extensions — user testing manually)**

1. **Connect-button parity** (`dual-wallet-bar.tsx`): disconnected "Connect wallet" label now sits in an `h-7` row matching `AVATAR_SIZE`, so both states render the same button height/colour.
2. **Rabby shows as MetaMask until refresh** + 3. **adding MetaMask swallowed the Rabby row**: root cause — we displayed `connection.connector.name`, but with Rabby set as default wallet the "MetaMask" connector binds Rabby's provider (`isMetaMask` compat flag). New `detectEvmProviderBrand(provider)` (checks `isRabby`/`isPhantom`/`isBraveWallet`/`isRainbow`/`isCoinbaseWallet` before `isMetaMask`) + `useEvmProviderBrands(connections, connectors)` hook sniffs `connector.getProvider()` per live connection (re-sniffs on membership change, so flipping Rabby's default-wallet setting updates without refresh). Applied to `evmConnectionInputs.walletName` and the grace identity's `walletName`. The merged same-address row now truthfully reads "Rabby".
3. **Phantom click sometimes no-op until refresh** (`para.tsx` + `para-sol.tsx`): `pendingSolanaConnect: boolean` → `pendingSolanaWallet: string | null` (target wallet name). The connect effect now only completes when the _target_ wallet reports connected and waits for the `select()` adapter swap to land — a stale `publicKey` from a previous wallet no longer cancels the pending connect. `connectPreferredSolanaWallet` returns `{status, walletName?}` so callers know what was selected.
4. **EVM wallet vanishes during Para OAuth popup** (`para.tsx`): the one-shot reconnect guard is re-armed whenever Para rebuilds its connector set, and a second heal step re-attaches remembered connectors via `connectAsync` (silent for already-authorized injected wallets; skips para/walletconnect + explicitly dropped addresses) 1.5s after a wipe if storage-level `reconnect()` restored nothing.
5. **Para sign-out killed all wallets** (`para.tsx` disconnect): the per-account sign-out no longer sets the _global_ `explicitEvmDisconnectRef` when other connections remain — it records the address in a new `explicitlyDroppedEvmAddressesRef` set (grace won't resurrect it, re-attach skips it) and re-arms the heal so the Para-logout-induced wagmi wipe restores the surviving external wallets. Family/all disconnects keep the global flag. Deliberate connects clear the dropped set.

**Registry**: dist rebuilt (34 files). NOTE — the registry item file lists are stale for most of the new wallet UI (`dual-wallet-bar.tsx`, `wallet-picker.tsx`, `wallet-icon-slot.tsx`, `wallet-map.tsx`, `icons/wallets/`, `accounts.ts`, `network-preferences.tsx`, `solana-networks.ts`, `para-sol.tsx`, …) — pre-existing gap on this branch, flagged as follow-up.

### Wallet picker: Para brand logo + provider-branded social row (2026-06-10)

Branch `polish-multi-wallet`. `icons/wallets/index.tsx` + `icons/wallet-map.tsx` + `wallet-picker.tsx` + `wallet-picker.test.tsx`. GUI only; backend contract unchanged. Two product asks.

- **Para brand mark wired into the wallet icon map** (`wallet-map.tsx`): reused the existing `ParaIcon` from `icons/apps` (the apps-list Para logo) rather than a duplicate — added `para: ParaIcon` + a `key.includes("para")` branch in `getWalletIcon`. This alone fixes the **connected Para row** — it was falling back to the generic `WalletIcon`; now `WalletIconSlot` resolves "Para" → the real Para logo. Label was already "Para". (Side effect: the connect-bar trigger avatar for Para also shows the logo now — consistent.) `WalletIconSlot` renders the Para mark at `PARA_RATIO` (15% smaller than `BRAND_RATIO`) since it reads heavier than the others at the shared size — same per-brand tuning Phantom already uses.
- **Social-login row rebranded** to the account provider (`wallet-picker.tsx`, `SocialLoginRow`): title = provider brand from `formatWalletProvider(identity.walletProvider)` ("Para"), subtitle = the method label ("Email or Google"), icon = the Para brand mark (`WalletIconSlot`) instead of the mail icon. Was: title "Email or Google" / subtitle "Add an Aomi account" (linked) or "Fast account sign-in" (disconnected) / mail icon. Falls back to the old method-label + mail icon when no provider brand exists (`brandLabel` undefined) — so non-Para adapters degrade cleanly. `aria-label` stays the method label, so existing button-name queries are unaffected. Dropped the now-unused `linkedMode` prop from `SocialLoginRow`.
- Tests: harness identity gained `walletProvider: "para"` (mirrors the real adapter). 2 new cases — social row shows "Para" title + "Email or Google" subtitle + Para brand mark; falls back (no "Para" mark) when `walletProvider` is undefined. 57 registry tests green, lint clean, typecheck clean except the pre-existing `GITHUB` error (`para.tsx:231`).
- **Not yet eyeballed live**: confirm the Para "P" mark reads well at slot size on the connected row + the social row.

### Wallet picker: per-row "manage" action for manageable wallets (2026-06-10)

### Wallet picker: per-row "manage" action for manageable wallets (2026-06-10)

Branch `polish-multi-wallet`. `types.ts` + `para.tsx` + `wallet-picker.tsx` + `wallet-picker.test.tsx`. Backend contract unchanged. Driven by "wallets with a management menu should have a manage option, not just sign out — e.g. Para".

- **New optional `manageable?: boolean` on `AomiAccount`** (`types.ts`). Set when an account has an in-app management surface (the handler is the adapter's existing `openAccountUI({ family })`). External wallets managed only in their own extension (MetaMask, Phantom) leave it unset.
- **Para adapter marks its own account manageable** (`para.tsx`): after `buildAccounts`, accounts whose `walletName` canonicalizes to `"para"` get `manageable: true`, gated on `Boolean(paraModal) && isConnected`. External wallets connected _through_ Para keep their brand name → stay unmanaged. Renamed the `buildAccounts` result to `builtAccounts` and map over it.
- **Picker renders a per-row gear button** (`Settings2Icon`) **before the logout icon** in `FamilyStatusRow`, shown only when `account.manageable && adapter.openAccountUI && adapter.canOpenAccountUI`. Click → `openAccountUI({ family })` then `closePicker()` (the Para modal takes over). New `onManage` prop + `manage:${id}` pending key. The header "Account" button stays (account-level entry); the per-row button is the wallet-level manage. Order in the right cluster: Active pill → manage → logout.
- **Add-list separators tidied** (`wallet-picker.tsx`): a hairline now divides the Connected section from the link/add area (rendered after `connectedSection` when anything follows). The full-list row was renamed `"More wallet options"`/`"Connect or link additional wallets"` → **"Other wallets"** (subtitle still "Open the full wallet list", both modes). The brand connect options render as one **flat list** — EVM, then Solana, then "Other wallets" — with **no separators between families** (the earlier EVM↔Solana hairline was removed per the user, connected and disconnected alike); dropped the now-unused `Fragment` import. Test updated (`"Other wallets"`).
- **Provider sign-in row visibility = gated on Para, not on any connection**: the "Para / Email or Google" row (under a "Quick sign-in" label) shows whenever **Para itself is not connected** — including alongside connected external wallets, so Para stays reachable to (re)connect — and hides once Para is connected (`socialOptionsToShow = paraAccountConnected ? [] : socialLoginOptions`, where `paraAccountConnected = connectedAccounts.some(a => a.manageable)`). The section label is always "Quick sign-in" (dropped the "Link additional accounts" wording the user disliked). (This is the final rule after a back-and-forth: brief "hide whenever connected" pass was reverted per user — they want it shown whenever Para isn't connected.)
- **Active EVM account now persists across refresh** (`para.tsx`). Selecting a non-Para wallet (e.g. MetaMask) as active didn't survive reload — wagmi/Para's connector re-asserts Para as current. Fix: persist the chosen address to localStorage (`aomi.wallet.active-evm-address`) in `selectAccount`, and a once-per-load restore effect re-applies it via `switchAccount` once the matching connection reconnects (guarded by `accountSwitchInFlightRef` so it doesn't fight the reconnect effect). Cleared when that account / the EVM family is disconnected. **Not verified live** — needs two extensions; watch for Para re-asserting active _after_ the one-shot restore (would need a repeating enforce instead of attempt-once).
- **Fixed: Para sign-out didn't stick across refresh** (`para.tsx`). The per-row "sign out" only dropped the wagmi connector; Para's embedded/social session stayed alive and silently re-attached on the next load. Now wired `useLogout` from `@getpara/react-sdk` (re-exported via react-core) behind a `useSafeLogout` wrapper → a `logoutParaSession()` helper in `disconnect`. Called when signing out the Para account (`accountId` path, `canonicalWalletKey(walletName) === "para"`) and on a full `{ family: "all" }` disconnect; a family-scoped disconnect leaves the Para session alone. Note: Para logout is cross-tab (the reason it was previously deferred to the account modal) — acceptable for the sign-out action. **Not verified live.**
- **Fixed: first EVM account switch after load reverted** (`para.tsx`). On a fresh load with Para active, clicking MetaMask switched for a few ms then flipped back to Para; the 2nd click stuck, and a refresh reset it. Cause: during the first `switchAccount`, wagmi's _current_ connection briefly reads disconnected, the auto-reconnect effect fired `wagmiReconnect()`, and that restored the previous (Para) connection. Fix: the reconnect effect now only fires on a _truly wiped_ session (`!wagmiConnected && evmConnections.length === 0`) — during a switch the connections list stays populated — plus an `accountSwitchInFlightRef` set around `switchAccountAsync` that the effect skips on. (Still recovers the Para-session-reinit wipe it was built for, where connections go empty.) **Not verified live** — needs two real wallet extensions; confirm a single MetaMask click sticks.
- **Removed the "Active" pill and the "Switch" hover hint** (per product call). Active state still reads from the checkmark next to the name + the highlighted row border/bg; the in-progress spinner on switch is kept. With the pill gone the trailing cluster is just `[manage?] [logout]`; logout is right-anchored so it aligns across rows on its own — so the earlier `reserveManageSlot` fixed-column machinery was reverted as unnecessary. (Considered a gear on every wallet for symmetry but external wallets have no in-app management surface, so the gear would open nothing.)
- Tests: 2 new cases in `wallet-picker.test.tsx` — manage button shows for the manageable Para row but not the Phantom row and fires `openAccountUI({family:"evm"})`; hidden when `canOpenAccountUI` is false. 55 registry tests green, lint clean, typecheck clean except the pre-existing `GITHUB` error (`para.tsx:231`).
- **Not yet eyeballed live**: verify the gear renders on the Para row (not Phantom) and opens the Para account modal.

### Network selector debloat: testnet collapse + lighter rows + Command primitive (2026-06-10)

Branch `polish-multi-wallet`. `network-select.tsx` + `network-select.test.tsx` + `vitest.setup.ts`. GUI only; adapter/backend contract unchanged. Driven by "the list looks bloated" — 13 rows with testnets at full weight.

- **Collapse testnets behind a "Show testnets" toggle.** Mainnets show by default; testnets fold behind a footer toggle that advertises the hidden count ("3 hidden"). Partition is derived, not configured: `chain.testnet === true` for EVM, `cluster !== "solana:mainnet"` for SVM. Default landing view drops from 13 rows to 8. Toggle state persists to a standalone localStorage key (`aomi.network-select.show-testnets`) — kept out of `WalletPreferences` since it's a display pref, not a wallet selection. **Edge cases:** if the _active_ network is a testnet the rows stay visible and the toggle is suppressed (can't hide the network you're on); a non-empty search query also forces testnets visible so search can jump to one ("sep" → Sepolia) while collapsed.
- **Lighter rows.** Only the live network carries a filled icon chip (`bg-primary/10`); inactive rows show a bare brand mark (`text-muted-foreground`), so the list reads as one clean column instead of a stack of grey boxes.
- **Rebuilt on the `Command` (cmdk) primitive** — same as the App/Model selectors, for keyboard nav + structural consistency. Kept real chain names in rows (per the earlier "row titles keep real names" decision); did NOT shorten labels.
- **Search input is count-gated, not always-on.** Decided against a permanent search box: at ~8 branded rows it's chrome that re-bloats what we just trimmed, and logo-recognition beats typing for a small set. `CommandInput` renders only when the default (mainnet) list exceeds `SEARCH_VISIBLE_THRESHOLD` (=10) — so it stays hidden at today's scale but appears for hosts that configure many custom chains. One constant to tune (0 = always show). Search reveals testnets when active.
- **Kept intact:** connection-aware family gating (EVM-only → no SVM rows, etc.), trigger chips ("Base / Mainnet"), the destructive-SVM-switch confirm dialog, the wallet-activation guard, and the `≤1 switchable target → render null` guard (counts all targets incl. testnets).
- **Test env:** cmdk needs `ResizeObserver` + `Element.scrollIntoView`, both absent in jsdom — added no-op stubs to `vitest.setup.ts` (also unblocks future cmdk-based component tests). Reworked the 4 network-select tests for cmdk's `role="option"` items; added 2 cases (testnet hidden-by-default + toggle reveal; active-testnet keeps rows visible + suppresses toggle). 53 registry tests green, lint clean, typecheck clean except the pre-existing `GITHUB` OAuth-label error (`para.tsx:231`).
- **Not yet eyeballed live** (preview infra was flaky this session): verify the dropdown visually — testnet collapse/expand, lighter rows, trigger unchanged. Layout separation (Axis B: unified list vs two control-bar pills) was discussed and deferred — staying on the unified popover for now.

### EVM network switch killed the wallet connection (flash loop + dead switcher) (2026-06-10)

Branch `polish-multi-wallet`. Symptom: switch an EVM network once → wallet approves → EVM wallet logo + EVM network chip start flashing ~every second (off a few ms, back on) and network switching is dead until reload. Three stacked bugs in `aomi-wallet-kit`:

1. **Root cause — Para SDK rebuilt the wagmi config on every network switch** (`para.tsx`, `AomiParaProviderInner`). `resolvedWallets` was recomputed (new array identity) on each render and `paraClientConfig`/`config` were inline JSX objects. A network switch updates the network-preferences context → Inner re-renders → new `externalWalletConfig.wallets` identity → Para's `ParaProviderMin` does an identity compare (`externalWallets !== externalWalletConfig?.wallets`), pushes the array into its zustand store → `@getpara/evm-wallet-connectors` `ParaEvmProvider` sees a new wallet list → `createWagmiConfig()` from scratch → **all in-memory connections dropped** (wagmi's reconnect-on-mount doesn't re-run for a swapped config prop — mount-only effect). Fix: `useMemo` `resolvedWallets` / `paraClientConfig` / `paraConfig` (`apiKey ? {…} : null`, JSX branches on `paraClientConfig`), hoisted shared `defaultOAuthMethods` module const (a fresh `["GOOGLE"]` default array per render churned the `oAuthMethods`-keyed memos in both Inner and `AomiParaPluginProvider`).
2. **Flash oscillation — grace window restarted itself** (`evm-identity-grace.ts`). On expiry it returned `disconnectedAt: null`; the provider wrote that back to the ref, so the next render treated the still-missing address as a _fresh_ disconnect and restarted the 1.8 s grace → identity flipped cached(on) → empty(off) → cached(on) forever. That's the visible ~1 s flash of the EVM logo + chip. Fix: expired branch now preserves `disconnectedAt` so it stays expired until a live address returns. Test updated + regression test added (feed expired result back in → must stay expired).
3. **No self-heal** (`para.tsx` reconnect effect). Auto-reconnect required `paraAccount.isConnected`, so external-wallet-only sessions (MetaMask/Rabby without Para login) never recovered from an in-memory wagmi reset. Fix: reconnect now keys off `hadEvmConnectionRef && !explicitEvmDisconnectRef` (still one attempt until restored; wagmi `reconnect()` only restores storage-persisted connectors so it can't fight a deliberate disconnect). `explicitEvmDisconnectRef` declaration moved up next to the reconnect refs.
4. **Bonus race fix**: `selectNetwork`/`switchChain` set the chain preference then await `switchChainAsync`, while the align-to-preference effect _also_ fired `switchChainAsync` as soon as the preference changed (wagmi `chainId` still old) → two concurrent `wallet_switchEthereumChain` (dup popups / -32002 in some wallets). New `evmSwitchInFlightRef` set around user-initiated switches; the effect skips while set. Effect's promise also gets a `.catch` (was an unhandled rejection on user reject).
5. Typed `evmConnectionInputs` as `EvmConnectionInput[]` — fixes the `string` vs `` `0x${string}` `` tsc error the uncommitted grace wiring introduced.

51 registry tests green, lint clean, typecheck clean except the pre-existing `GITHUB` OAuth-label error (`para.tsx:231`). **Not verified live** (needs a real wallet extension): user verifying manually — load → connect → switch EVM network → no flash, switcher stays usable, repeat switches work.

### Network selector rebuild: connection-aware + unified + logos (2026-06-09)

Branch `polish-multi-wallet`. `network-select.tsx` + `network-select.test.tsx` + `icons/chains/index.tsx`. GUI only; adapter/backend contract unchanged.

- **Connection-aware gating.** Which families surface now follows what's actually _connected_ (`identity.address` for EVM, `identity.svmAddress` for SVM), not just what the host _supports_. EVM-only wallet → only EVM networks; SVM-only → only SVM; both → both. When nothing is connected it falls back to showing all supported networks so the picker doubles as a pre-connect preference. (Was: gated on supported-network counts, so it always showed both EVM+SVM tabs regardless of connection.)
- **Collapsed the EVM | Solana tab toggle into one unified list.** Single scrollable popover; when both families are present, subtle uppercase group headers (`EVM` / `SVM`) separate them. One family → no header. Matches the flat-list direction the wallet picker already landed on. Removed the `panel`/`setPanel` tab state + its reset effect + `canShowFamilyTabs`.
- **Brand logos everywhere.** Added `SolanaIcon` to `icons/chains/index.tsx` (official 3-bar mark, monochrome `currentColor`, layered opacities). SVM rows + trigger now render it; EVM rows/trigger use `getChainIcon`. The **trigger** previously had no logo (the user's main gripe — sibling Model/App selects show one): it now renders `icon + label` per shown family, joined by a `/` separator (e.g. `[Base] Base / [◎] Mainnet`). EVM chip label = chain name; SVM chip label = cluster (`Mainnet`/`Devnet`/`Testnet`), the icon carrying the family.
- **"Solana" → "SVM"** in UI chrome: group header + confirm-dialog title/body ("Switch SVM network?"). Network _row_ titles keep their real names ("Solana Mainnet" etc.).
- **Fixed first-row always looking pre-selected.** Radix auto-focuses the first row on open; `focus:bg-accent` painted it as if hovered/active. Switched to `focus-visible:` so the highlight only shows for keyboard nav, not the mouse-triggered open. `isActive && bg-accent` still marks the live network.
- **Hide guard** now counts only _visible_ (shown-family) targets — hides the selector when ≤1 switchable network is visible.
- Tests reworked: dropped the tab-click steps; added an EVM-only gating case (Solana rows absent) + a both-connected unified-list case; `createHarnessAdapter` gained `address` / `evmChains` / `solanaNetworks` overrides. 45 registry tests green, lint clean, registry typecheck clean for changed files (pre-existing `GITHUB` error in `para.tsx:222` unchanged).
- **Not yet eyeballed live**: trigger logos + connected-family gating need a real wallet connection to fully exercise (automated preview can't sign one) — user verifying via screenshots.

### Connect/wallet trigger button restyle (2026-06-09)

Branch `polish-multi-wallet`. `dual-wallet-bar.tsx` only. Iterated once on product feedback.

- **One shared button surface for both states.** Dropped the deep-black connected (`bg-primary`) state and the dashed-border disconnected state. Both now use the original `bg-muted` fill with a **solid** `border border-border` outline and `hover:bg-muted/70`, text in full `text-foreground` (was `text-muted-foreground`) so "Connect wallet" reads clearly. (First pass tried `bg-foreground/[0.05]`; reverted to muted per feedback.)
- **Connected**: active wallets render as circular brand avatars **plus the short address(es)** beside them (`formatAddress`, joined `/`). Discs are **opaque `bg-muted` with a `ring-1 ring-border` outline** and **stack** with `-ml-2` overlap — opaque so the front disc masks the one behind (a translucent fill let the back logo bleed through). Button padding tightened to `px-3.5 py-2` so more of the address fits.
- **Shared icon rendering** (`wallet-icon-slot.tsx`): the picker's `WalletIconSlot` was extracted into its own module and is now used by **both** the picker rows and the trigger avatars, so brand mark colour (`text-muted-foreground`), proportional sizing, the Phantom-art quirk, and the iconUrl/generic fallbacks are defined **once**. It takes a numeric `size` (slot px; mark scales from it via fixed ratios) + a `className` to restyle the slot (the trigger passes `rounded-full ring-1 ring-border` + stack margin; picker uses the 36px default). The trigger uses `size={28}`. This fixed the "logo colours off (esp. Phantom)" by matching the modal exactly.
- **Note**: the brand icons in `components/icons/wallets` are **monochrome** (`fill="currentColor"`), so they tint to `currentColor` — now consistently `text-muted-foreground` in both surfaces. True brand colours would need new colored SVG assets; not done (the muted-foreground look matches the approved modal).
- **Responsive disclosure (container queries).** The trigger button is now an `@container`; its content reveals more as the bar widens (fixing "button grows but text doesn't"). Each connected wallet carries a `detail` (EVM chain name via `getChainInfo`, Solana cluster via `solanaClusterLabel`). For a **single** wallet (most empty space): network `· {detail}` appears at `@[12rem]`, and the address swaps short→`longAddress` (12+8 hex) at `@[15rem]`. For **two** wallets: addresses stay short (avatars stacked), network only at `@[20rem]`. `singleWallet = connectedWallets.length === 1` drives the breakpoint choice. Breakpoints tuned for a ~15rem (w-full sidebar-footer) button — easy to nudge.
- **Not yet eyeballed live**: connected-state avatars + responsive tiers need a real wallet connection (preview can't sign one) — verify via screenshots in a real browser, and confirm/adjust the `@[...]` breakpoints against the actual sidebar width. Lint + registry typecheck clean; 13 picker tests pass.

### Wallet picker: dedup + network grouping + collapsible add-list (2026-06-09)

Branch `polish-multi-wallet`. GUI/adapter polish; backend contract unchanged. Done in two passes (same day).

Adapter (`apps/registry/src/lib/wallet-kit/`):

- **Fixed duplicate connected rows** (Rabby "take over MetaMask" / EIP-6963 impersonation). `buildAccounts` (`accounts.ts`) groups EVM connections by **lowercased address** → one row per address. Display name/`id` prefer the active connector, else a real brand over a generic "Injected" label; the row carries `connectorIds` + `chainId`. Solana deduped defensively by `publicKey`. Distinct addresses stay separate.
- **"Sign out one = sign out all" fixed** as a side effect — `disconnect({accountId})` in `para.tsx` already groups by address; correct once the display is one row per address. `para.tsx` unchanged.
- **`AomiAccount` type** (`types.ts`) gained optional `chainId` + `connectorIds`.

Picker (`wallet-picker.tsx`):

- **Connected section is one flat list** (network grouping was tried, then dropped per product feedback). Each row carries a compact **`FamilyTag`** — text "EVM"/"SVM" with a small green status dot (no chip outline) — so execution family is clear. Chain/cluster shows inline in the meta line (`0xdA6..F0 · Base`, cluster capitalized: `· Mainnet`) only when it adds info beyond the family name.
- **Switching the active wallet = click the row.** The whole row (icon + name + meta) is one button for inactive EVM accounts (chevron removed); hover highlights the card + reveals a "Switch" hint, a spinner shows while switching, and the "Active" pill fades in. Disconnect stays a separate icon button beside it. Solana/active rows render as a static (non-clickable) row.
- **Section order when connected:** Connected → Quick sign-in → Add wallet; disconnected keeps Quick sign-in on top.
- **Collapsible "Add another wallet"** expander in the connected state (brand rows hidden until expanded, smooth grid-rows transition); collapses again after a direct link. Disconnected keeps the brand grid visible for onboarding.
- **Add-list is grouped by family** (EVM rows, hairline separator, Solana rows, hairline, multichain/"More" at the bottom) so a dual-chain wallet like Phantom appearing on both chains doesn't read as a duplicate.
- **Already-connected brands filtered** from the add-list, **family-scoped** (a connected EVM Phantom hides the EVM add row but leaves its Solana entry connectable).
- **Family-aware dedup** of add options (`walletFamilyAliasKey`) so a dual-chain wallet like **Phantom is reachable on both EVM and Solana** (previously its Solana entry was collapsed away by brand-only dedup — that's why Phantom only ever connected as EVM).
- **Direct connect/switch keeps the picker open** (no success banner, no forced close — the new wallet just lands in the connected list). Only external handoffs (WalletConnect / full Para list, via `isExternalHandoff`) close the picker so their own surface can take over.
- **Social section is context-aware:** label "Quick sign-in" (disconnected) → "Link additional accounts" (connected); row subtitle adapts to "Add an Aomi account" when connected.
- Solana cluster label is capitalized in the row meta (`· Mainnet`). The "Account" header pill kept as-is (per product decision).

Tests: `accounts.test.ts` (9 dedup cases) + `wallet-picker.test.tsx` (13 cases: grouping, collapsed/expanded add-list, connected-brand filtering, success state, dual-chain Phantom reachability, DOM order). Full registry suite green (44 tests). Registry typecheck clean for changed files (pre-existing unrelated `GITHUB`/`X` OAuth error in `para.tsx:222`, flagged separately). Lint clean.

- **Not yet eyeballed live**: connected-state visuals need real Rabby/MetaMask/Phantom extensions (automated preview can't install them) — verify via screenshots in a real browser.

### Account token-exchange runtime wiring + test coverage (2026-06-08)

Branch `codex/para-solana-support-wip` (PR #150). Merged `fix/pr150-runtime-wiring` (commit "Wire account token exchange into runtime") after review: builds, dist in sync, 26 runtime tests, portal typecheck clean.

- **Reviewed & verified adaptation** of the FE↔backend contracts: `createAccountAccessTokenProvider` → `POST /api/account/sessions/exchange` (`{ provider, provider_token }` ↔ backend `ExchangeAccountSessionRequest`), and `app` on `sendSystemMessage` → `/api/system` (backend merges query + JSON body via `select_system_params`). Both correct.
- **Removed dead `ThreadContextTest.tsx`** debug component (referenced removed `threads`/`threadMetadata`; failed `tsc --noEmit`, not caught by CI). Registry typecheck now clean.
- **FE unit coverage**: `packages/client/test/account-session.unit.test.ts` — caching, forceRefresh, single in-flight coalescing, proactive timer refresh + subscriber notify, dispose teardown, snake_case mapping (7 tests).
- **Live e2e**: `client.integration.test.ts` gained an LLM-free app-scoped system-message test (green vs local backend :8080 + local supabase).
- **Backend DB e2e** (product-mono, branch `test/account-exchange-db-e2e`): `entities.rs` test mirroring the exchange's Privy identity resolution + provider scoping (green vs local supabase :54322).
- **Known gap (flagged, no code)**: backend `ScheduledIntentDueEvent` (`scheduled_intent_due`, declared System→UI) from product-mono #564 has no FE handler — falls through as a raw system message. Product decision needed.

### Multi-wallet per-family connection + hybrid picker (2026-05-29)

Branch `codex/para-solana-support-wip`. Design/plan in `docs/superpowers/specs/2026-05-29-multiwallet-per-family-picker-design.md` and `docs/superpowers/plans/2026-05-29-multiwallet-per-family-picker.md`. Backend contract unchanged.

- **Default Solana cluster → mainnet** (was devnet) in `landing-para-provider.tsx`, `landing-privy-provider.tsx`, `portal/wallet-providers.tsx`.
- **Account registry**: `AomiAccount` type + `accounts`/`selectAccount` on `AomiWalletKit`; `disconnect({accountId})` for per-account EVM disconnect (`types.ts`, new `accounts.ts` with `buildAccounts`/`isAccountSelectable` + tests).
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
- **Added provider-key support** to the TS CLI:
  - new `src/cli/commands/provider-keys.ts`
  - new `AomiClient` methods for `GET/POST/DELETE /api/control/provider-keys`
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

| Env vars          | Flag                    | Result                                  |
| ----------------- | ----------------------- | --------------------------------------- |
| (none)            | (none)                  | **AA proxy** (zero-config, via backend) |
| `ALCHEMY_API_KEY` | (none)                  | AA BYOK (Alchemy direct)                |
| `PIMLICO_API_KEY` | `--aa-provider pimlico` | AA BYOK (Pimlico direct)                |
| any               | `--eoa`                 | EOA                                     |

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

| AA configured? | Flag    | Result                                      |
| -------------- | ------- | ------------------------------------------- |
| Yes            | (none)  | **AA automatically** (7702 → 4337 fallback) |
| Yes            | `--aa`  | AA required, same fallback                  |
| Yes            | `--eoa` | EOA, skip AA                                |
| No             | (none)  | EOA                                         |
| No             | `--aa`  | Error: "configure AA first"                 |

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

- **`apps/registry/src/lib/wallet-adapter.ts` → `aomi-wallet-kit.ts`** — wallet kit exports now use the `AomiWalletKit*` naming surface consistently.
- **Registry** — item `wallet-adapter` renamed to **`aomi-wallet-kit`**; install URL is now `https://aomi.dev/r/aomi-wallet-kit.json` (rebuilt `apps/registry/dist/` → `apps/landing/public/r/`).
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

- **New file `apps/registry/src/lib/wallet-kit.ts`** — extracted `AomiWalletKit`, `AomiWalletKitContext`, `AOMI_SESSION_DISCONNECTED_IDENTITY`, `AomiWalletKitContextProvider`, and `useAomiWalletKit()`.
- **New file `apps/landing/app/components/landing-wallet-kit-bridge.tsx`** — `LandingWalletKitBridge` runs inside the Para provider tree, reads wagmi + Para auth hooks, and writes `AomiWalletKitContext`.
- **New file `apps/landing/app/components/landing-para-provider.tsx`** — `LandingParaProvider` wraps `ParaProvider` + `LandingWalletKitBridge` with all Para SDK config (apiKey, env, chains, wallets, oAuth).
- **Modified `apps/registry/src/components/aomi-frame.tsx`** — removed `AomiWalletKitContextProvider` wrapper and `adapter` prop from `Root`. Widget now reads from `AomiWalletKitContext` provided by an ancestor bridge.
- **Modified `apps/landing/app/sections/hero.tsx`** — wrapped `AomiFrame.Root` with `LandingParaProvider`.
- **Modified consumer imports** — `connect-button.tsx`, `runtime-tx-handler.tsx`, `network-select.tsx`, `account-identity.ts` now import from `lib/wallet-kit` (relative paths).
- **Updated `apps/registry/src/index.ts`** — exports the `AomiWalletKit*` wallet kit and identity surface.
- **Updated `apps/registry/src/registry.ts`** — replaced `aomi-adapter-provider` entry with `aomi-wallet-kit` + `aomi-auth-sync-bridge` entries.
- **Deleted `apps/registry/src/components/aomi-adapter-provider.tsx`** — replaced by `lib/wallet-kit.ts`.
- **Deleted `apps/registry/src/components/para-plugin-provider.tsx`** (564 lines) — replaced by the host-side `LandingWalletKitBridge` + `LandingParaProvider`.
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
  - Added 19 new redirects for restructured paths (getting-started/_, core-concepts/_, integration/_, telegram/_)
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

- Aomi Build SDK-upgrade UX rebuilt (2026-07-16, PR aomi-labs/aomi#366): `use-sdk-upgrade` hook (confirm → open PR → poll-for-merge via the idempotent sdk-upgrade endpoint → merged → redeploy), `upgrade-rail.tsx` (5-step stepper with PLATFORM/YOU/YOU/GITHUB owners, hover hints on every step, build checklist driven by deployFlow), `deployment-detail.tsx` (per-row expansion: source repo / commit / SDK / deployed platform / platform branch / apps / build artifacts — all GitHub-linked; platform-side fields lazy-load from `deploymentHistory`), `hint-bubble.tsx`; `deployments-tab.tsx` wires the CTA swap (Upgrade → Review PR #N), redeploy gating while the PR is open, and the upgrade confirm dialog with don't-ask-again; rail state persists in localStorage per source. 218 tests + typecheck + lint green. Backend path verified against staging (sdk-upgrade for 1586 now returns `current`). Not yet verified against a live signed-in browser session — needs a preview deploy.
- SDK upgrade 502 masking: FIXED. `SourceRepo::repo_route("")` trailing-slash 404 fixed in product-mono#815 (merged, staging-deployed); the remaining manager 502→500 conversions (OAuth exchange, GitHubAppError::Upstream, ActivationError gateway variants) are in product-mono#826 (open). Cloudflare replaces origin-502 bodies with branded HTML, so handler errors must never use 502/503.
- Follow-up work spun off (background sessions 2026-07-16): lightweight manager PR-state endpoint to replace the 45s tarball-download merge poll; investigation of stale `app_source` installation bindings (duplicate 141779906/142228159 branches for playground-6).
- /build engine mode: render approvals/clarifies in the UI (decision route
  exists; runs default to autoApprove until then)
- Vercel prod shape for the engine: SMITHER_DATABASE_URL (shared Postgres) +
  @smithers-orchestrator/vercel sandbox provider for compute phases (v2)
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
