# Ship plan: /build → aomi-smither, end to end in production

Goal: a builder on build.aomi.dev types an intent, a real aomi-smither run
(codegen → Claude curate → cargo validate → smoke) executes in an isolated
runner, the page streams honest progress and artifacts, and the result is a
downloadable Rust crate — with resume-on-anything durability.

Everything below builds on verified ground: the engine runs E2E locally on
Node/PGlite (browser) and Bun/sqlite (CLI); Vercel Sandbox specs and the
smithers 0.27 Postgres backend are confirmed; P0 honest artifacts are done.

## Target architecture

```
Browser ── /build page (Vercel, Next.js — UI only)
              │ poll /api/bff/build/runs?id=…   POST /runs, /decision, /download
              ▼
        BFF routes (Vercel functions, stateless)
              │ read/write                        create/stop
              ▼                                     ▼
        Shared Postgres (SMITHER_DATABASE_URL)   Vercel Sandbox (1 per run)
          · smithers run state (frames,            boots golden image:
            outputs, approvals)                    rust + node + claude CLI +
          · build_runs registry (app, runId,       aomi-sdk checkout + prebuilt
            sandboxId, userId, quota, status)      aomi-build/aomi-run + warm
              ▲                                    cargo caches
              └────── engine writes ───────────  runs `aomi-smither run-plan`
```

Key property: **the sandbox is disposable; the run is durable.** All state
lives in Postgres; any sandbox (or local process) can resume any run. The BFF
never holds a run in memory.

## Phase 1 — Postgres-backed run reads (BFF becomes stateless)

Removes the in-memory registry as source of truth; also fixes local
multi-instance and the "replays emit no events" class of bugs for good.

- `packages/smither`: add `readRunView(api, runId)` — status, per-node
  statuses, and outputs reconstructed from the persisted tables (status from
  the runs table, node statuses from task-state rows the same way the
  gateway's devtools snapshot does, outputs via existing `loadRunOutputs`).
- BFF `engine.ts`: `snapshotBuildRun` composes from `readRunView` + the plan
  (stages via `stagesFor`) instead of the event-reducer maps; the reducer
  remains only as a low-latency garnish (activity lines, timestamps).
- New `build_runs` registry table (app, run_id, user_id, status, runner,
  sandbox_id, created_at): owned by the web app, same Postgres.
  ⚠ Decision needed: which database — the aomi backend Supabase (staging and
  prod share one DB per ops memory, so migrations are prod-affecting) or a
  dedicated small Postgres for build runs (cleaner blast radius; recommended).
- Local dev keeps working unchanged (PGlite when no SMITHER_DATABASE_URL).

Verify: two dev-server instances against one Postgres; create on A, poll on B.
Estimate: 2–3 days.

## Phase 2 — Runner seam + headless plan runner

- `packages/smither`: new `aomi-smither run-plan` subcommand — takes
  `--plan <path|base64 JSON>` + `--run-id <id>` + `--yes`, executes
  `prepareRun`/`executeRunUntilSettled` non-interactively (no TTY, no intent
  chat). The BFF composes the plan; the runner only executes.
- BFF: extract a `Runner` interface with two impls:
  - `LocalRunner` — today's in-process execution (dev default).
  - `SandboxRunner` — creates the sandbox, injects env
    (`SMITHER_DATABASE_URL`, `ANTHROPIC_API_KEY`, `AOMI_SDK_ROOT`,
    `AOMI_ALLOW_STALE_SDK=1`), launches `run-plan`, records sandbox_id,
    extends timeout on heartbeat, destroys on settle.
  Selected by env `AOMI_BUILD_RUNNER=local|vercel-sandbox`.
- Agent auth: plumb `apiKey` into `makeWorkAgent` (ClaudeCodeAgent supports
  it) from `AOMI_BUILDER_API_KEY` — sandbox runs bill an API key, not a
  personal subscription.
- Cancel: abort signal in LocalRunner; `sandbox.stop()` in SandboxRunner;
  POST /runs/cancel route; Esc wired on the page.

Verify: local runner regression suite + run-plan smoke on Bun and Node.
Estimate: 3–4 days.

## Phase 3 — Golden image + sandbox execution

- Image (Dockerfile, published to Vercel Container Registry via CI):
  Amazon-Linux-compatible base with Node 24 + Bun, rustup toolchain, `claude`
  CLI, aomi-sdk checkout pinned to a released SHA, `cargo build --release`
  of aomi-build/aomi-run, warmed cargo registry + `target/`, and the built
  `@aomi-labs/smither` dist. Rebuild on SDK release (CI job in aomi-sdk).
- SandboxRunner against the real SDK: create from image, 4 vCPU/8 GB,
  `timeout` extended via heartbeat up to 45–60 min, `cleanup: destroy`
  (state is in Postgres; nothing to keep).
- Failure paths: sandbox creation failure → run marked failed with reason;
  sandbox death mid-run → next POST resumes in a fresh sandbox (replay).

Verify: full discover-mode run (new app, not geckoterminal) from the staging
page; kill the sandbox mid-curate and confirm resume-in-new-sandbox.
Estimate: 4–5 days (image plumbing is most of it).

## Phase 4 — Hardening + staged rollout

- **Quotas**: per-user daily run cap + global concurrent-sandbox cap in
  `build_runs`; friendly 429 in chat. Token telemetry: persist
  `TokenUsageReported` per run for cost dashboards.
- **Access**: GitHub session required (existing gate); launch behind an
  allowlist of GitHub logins (env or table), then open up.
- **Workspace hygiene**: every run works in the sandbox's own SDK copy —
  no shared-checkout collisions; app-name collisions across users resolved
  by per-user app namespacing in `build_runs` (slug + owner).
- **Vercel env (staging first)**: `NEXT_PUBLIC_BUILD_ENGINE=smither`,
  `AOMI_BUILD_RUNNER=vercel-sandbox`, `SMITHER_DATABASE_URL`,
  `AOMI_BUILDER_API_KEY`, image ref. Prod after staging soak.
- Observability: runs list surface (Operate or a simple admin view) reading
  `build_runs`; sandbox logs retained via `vercel sandbox` CLI during soak.

Verify: 10 concurrent for-fun runs on staging (the exact scenario asked):
10 sandboxes, no toolchain installs, per-build cost logged (~$0.10–0.30
infra + agent tokens), resumes green.
Estimate: 3–4 days + soak.

## Phase 5 — product completion (from BUILD-PAGE-WIRING-GAP.md)

- P1: real verify gates — compose plans with `smoke: true` behind a gate;
  the page's Compiled/Smoke-test buttons answer it via the decision route.
  Template → plan presets; builder (claude|codex) pass-through from the
  model picker.
- P2: conversational intent — BFF `distillIntent` endpoint so chat refines
  the plan before running (multi-venue parallel compositions come free);
  approval/clarify cards in chat.
- P3: ship — GitHub init (push crate to a repo) → deploy handoff into the
  existing Projects/launch flow.

## Sequencing & total

1 → 2 → 3 → 4 ship the E2E (~2.5–3 weeks of focused work + soak); 5 layers
product depth after. Phases 1–2 are pure TS in this repo; 3 needs aomi-sdk
CI cooperation for the image; 4 needs env/DB decisions.

## Decisions needed up front

1. Postgres home for run state: dedicated instance (recommended) vs the
   shared backend Supabase.
2. Anthropic billing: which API key/org funds builder runs; per-user cap.
3. SDK pinning: which ref the golden image tracks, and who owns the image
   rebuild CI in aomi-sdk.
4. Launch gate: allowlist size for the staging soak.

## Risks

- smithers 0.27 Postgres-path quirks (we already found and worked around
  two: unguarded `Bun` globals, boolean 0/1 rows). Mitigation: the run-plan
  runner executes on Bun inside the sandbox (battle-tested path), while the
  BFF only *reads* Postgres — the web tier never executes workflow code.
- Sandbox regionality (iad1 only) — latency fine for builds.
- Image drift vs SDK — pin + CI rebuild, `--allow-stale-sdk` inside the
  image, freshness comes from image releases rather than per-run git sync.
