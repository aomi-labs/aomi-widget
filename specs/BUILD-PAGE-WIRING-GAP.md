# /build ↔ aomi-smither wiring gap map

The mock flow on `/build` is the product spec; aomi-smither is the engine.
Both are verified working (mock in prod; engine E2E'd locally on Node/PGlite
via the BFF and on Bun/sqlite via the CLI). This maps every page surface to
its real counterpart and what's missing to wire it. Artifacts are Rust crates
(`apps/<name>/{Cargo.toml,openapi.yaml,src/{lib.rs,client/,tool.rs}}` →
`plugins/<name>.dylib`), never the mock's TypeScript tree.

Legend: ✅ wired (PR #364) · 🟡 partial · ❌ missing

## Surface-by-surface

| # | Page surface (mock behavior) | Real engine counterpart | Status → gap |
|---|---|---|---|
| 1 | **Intent composer** — one prompt starts the pipeline | `finalizePlan(draft)` → BuildPlan; app slug + existing-spec auto-detect | ✅ works; 🟡 naming UX (slug collisions, rename before run) |
| 2 | **Templates** (arb bot, OpenAPI agent, …) seed the prompt | Plan presets: template → `{userStory, source, openApiUrl?, smokePrompt, phases?}` | ❌ templates only paste prompt text; map each `tpl_*` to a plan preset (e.g. multi-venue → `parallel` branches) |
| 3 | **Chat / "Refine or start another build…"** | `distillIntent` — the intent agent turns conversation into a plan draft + follow-up questions, probes viability (no-API targets caught in chat) | ❌ biggest UX gap: engine mode treats every send as a new run. Wire a BFF intent endpoint (read-only CLI agent, same as TUI intake) so chat refines the draft plan; run starts on confirm |
| 4 | **Plan nodes panel** ("Compose plan / Hyperliquid tools / Smoke test") | `stagesFor(plan)` — real stage rows incl. parallel branch rows | ✅ mapped; 🟡 mock derives multi-venue nodes from keywords — real equivalent is a composed plan with `parallel` phases, which needs #3 (or #2 presets) |
| 5 | **Progress timeline** (plan/generate/validate/ready + messages, timestamps) | Node events (`NodeStarted/Finished/Failed`), activity lines | ✅ lanes mapped; 🟡 static lane messages/no timestamps — feed real event text + times from `handle.lines` |
| 6 | **Files panel** (mock TS tree) | The crate on disk: `apps/<app>/` after codegen/curate | ❌ engine sends `fileTree: []`. Server walks `sdkRoot/apps/<app>` into `BuildFileNode[]` on snapshot; **also swap the mock's hardcoded tree to the Rust shape** (`Cargo.toml`, `openapi.yaml`, `src/lib.rs`, `src/client/`, `src/tool.rs`) |
| 7 | **Assistant completion message** (mock lists fake files) | Curate agent's structured output `{summary, changedFiles, followUps}` (already in the `curation` row) + result row summary | ❌ we synthesize a line. Read the curation row from the run backend and render summary + followUps; list real tools (parse `tool.rs` or take them from the summary) |
| 8 | **"Verify before you ship" — Compiled / Smoke test buttons** | validate-loop runs cargo automatically; smoke = `plan.smoke` + `aomi-run --prompt`; gates = smithers `Approval` | 🟡 buttons disabled in engine mode; to keep the mock UX 1:1, compose the plan with `smoke: true` behind a `gate` and let the buttons answer the gate via the existing decision route |
| 9 | **Ship panel — Download code** | The crate (or `.dylib` once compile/smoke is in the plan) | ❌ add a BFF route that tars `apps/<app>` for the session's run |
| 10 | **Ship panel — Open Projects / deploy** | `aomi-build deploy` (activation token, deploy repo w/ tracked `aomi.toml`) — the deploy/launch feature already manages sources | ❌ needs the generated crate pushed to a repo ("GitHub init · soon" chip is honest) — largest scope, keep phased |
| 11 | **Cancel (Esc)** | `runWorkflow({ signal })` abort | ❌ engine ignores cancel (poll just stops). Add AbortController per handle + a cancel route |
| 12 | **Model picker ("Aomi · Preview")** | `plan.builder: claude \| codex` | ❌ UI-only; pass through to the create request |
| 13 | **Recent rail** (localStorage) | Durable runs in PGlite/Postgres (`loadRunState`, run.json per app) | 🟡 localStorage fine for v1; a `GET /runs` list would survive browsers |
| 14 | **Approvals/clarifies** (absent in mock) | `clarify` (select-mode) + curate approval + deploy gate; options already ride on `stage.clarify`; decision route exists | ❌ chat-rendered approval cards; until then runs are `autoApprove` |

## Infra gaps (independent of UI)

- **Prod can't run the engine**: Vercel functions have no cargo/claude/CLI.
  Local dev works today (`NEXT_PUBLIC_BUILD_ENGINE=smither`). Prod needs a
  runner: `@smithers-orchestrator/vercel` sandbox provider (compute phases in
  Vercel Sandbox) or a dedicated host; until then prod shows the mock.
- **Workspace isolation**: all runs share one `AOMI_SDK_ROOT` checkout — two
  users building the same app name collide. Needs per-run worktree/sandbox
  for multi-tenant; single-operator local use is fine.
- **SDK freshness**: real runs want `git fetch` + cargo build of
  `aomi-build`/`aomi-run`; server strategy = prebuilt binaries snapshot +
  `AOMI_ALLOW_STALE_SDK` for dev, CI-built binaries for prod.
- **Persistence at scale**: per-app PGlite is single-process; multi-instance
  prod needs `SMITHER_DATABASE_URL` (shared Postgres) and instance pinning or
  the sandbox runner.
- **Cost control**: curate ≈ 18k tokens/run on the operator's claude
  subscription; multi-user needs quotas/API-key billing.

## Suggested wiring order

1. **P0 — honest artifacts** (small, high-trust): Rust mock tree; real file
   tree in snapshot; curation summary/followUps as the completion message;
   real event text/timestamps in the timeline; download-crate route.
2. **P1 — real verify gates**: `smoke: true` plan + gates the page buttons
   answer (decision route exists); cancel route; builder pass-through;
   template → plan presets.
3. **P2 — conversational intent**: BFF `distillIntent` endpoint so chat
   refines the plan (parallel/multi-venue compositions come free); approval
   cards in chat.
4. **P3 — ship**: GitHub init + deploy handoff to Projects; prod runner
   (sandbox provider + Postgres).
