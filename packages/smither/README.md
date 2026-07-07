# Aomi Smither

Bun-based CLI/TUI that builds Aomi apps by **composing a Smithers workflow on
the fly from your intent**. You describe the app in a terminal conversation;
Smither distills a `BuildPlan` and renders it into a durable
[Smithers](https://smithers.sh) task graph — deterministic Rust codegen,
multi-agent curation (Claude/Codex), a validate/repair loop, optional local
smoke, and an approval-gated deploy.

```bash
pnpm --filter @aomi-labs/smither build

# Interactive: chat about what to build, review the composed plan, run it
pnpm --filter @aomi-labs/smither exec aomi-smither

# Headless: compose straight from flags
pnpm --filter @aomi-labs/smither exec aomi-smither --app my-app --yes

# Preview the composed workflow without executing anything
pnpm --filter @aomi-labs/smither exec aomi-smither --app my-app --deploy --dry-run

# Watch an app's run from a browser while it executes in another terminal
pnpm --filter @aomi-labs/smither exec aomi-smither console --app my-app

# Resume a run parked on a wait-external pause (once the outside work is done)
pnpm --filter @aomi-labs/smither exec aomi-smither signal --app my-app --node await-apis
```

## How it works

1. **Intent chat** (`intent.ts`) — a read-only CLI agent turns the
   conversation into a partial `BuildPlan` plus follow-up questions. It is
   also the **composer**: for targets the standard pipeline can't serve, it
   proposes a `phases` composition (see below) that the human reviews in the
   preview. It probes viability first — a platform with no public HTTP API
   (e.g. Morpho: GraphQL + contracts only) is caught in the chat, not at
   codegen, with research-mode / draft-spec / different-target offered as
   choices.
2. **Plan** (`plan.ts`) — the validated `BuildPlan` is the single contract:
   `stagesFor(plan)` is the composed stage list shown in the preview, and the
   workflow renders from the same ids.
3. **Smithers run** (`workflow.tsx`, `run.ts`) — the composition becomes a JSX
   task graph executed by `smithers-orchestrator` on Bun's SQLite runtime.
   Outputs persist per task; **a completed task is never re-executed**, so
   crashes and Ctrl-C resume exactly where they stopped (state under
   `.smithers/runs/<app>/`). Approval gates (agent curation, clarify, deploy)
   are durable — the TUI prompts inline, and a headless `--yes` run
   auto-approves.
4. **Repair loop** — validation failures mount a repair agent task carrying
   the validation log (fresh session; CLI agents don't persist forkable
   session snapshots in 0.26.1), up to `--max-fix-rounds` times.

## Composition & clarify

A plan is a composition of typed phases (`plan.ts`), not flags on one
hardcoded pipeline — the flag-driven pipeline is just the default composition,
with identical node ids (existing runs resume cleanly). The vocabulary:

- **compute** — deterministic ops (`binaries`, `codegen`, `validate`,
  `smoke`, `deploy`, `result`); the only phases that touch the shell.
- **agent** — LLM roles: `curate`/`review`/`fix` (classic), plus `research`
  (protocol study → `apps/<app>/research.md`), `draft-spec` (OpenAPI from
  docs), and `synthesize` (research → preambles/building blocks) for
  spec-less targets. Each takes an optional `brief`.
- **clarify** — the run pauses on a human question with 2–6 options
  (select-mode Smithers approval). Answerable from the TUI **or** the browser
  console; the durable `{selected, notes}` decision is folded into every
  later agent prompt as context. Headless `--yes` auto-selects the first
  (recommended) option.
- **gate** — binary approval (the deploy gate).
- **eval** — run the compiled plugin against a `scenario` prompt, then an LLM
  `judge` scores the transcript 0..1 against a `rubric`; passes at `threshold`.
  Behavioral testing ("did it do the right thing"), not just cargo. The exit
  signal for an `eval-pass` loop. (`evals.ts`)
- **loop** — bounded retry. `until: "validation-green"` (body: a `validate`
  compute + optional `fix` agent `onlyIf: "prev-red"`) or `until: "eval-pass"`
  (body: an `eval` + optional refine agent `onlyIf: "prev-eval-fail"` that
  improves the app from the judge's feedback). `onMax: "return-last"` stops
  gracefully at the round cap so the composition continues — pair it with a
  following clarify to escalate to the human instead of hard-failing.
- **parallel** — `branches` run concurrently (each is its own sequence); the
  composition waits for all. For independent work that doesn't write the same
  files — researching several protocols, building several venues.
- **wait-external** — a durable pause (Smithers `<Signal>`) for work that
  happens *outside* this run: a teammate building the other side of an
  integration, an external CI, a partner's deploy. The run parks (status
  `waiting-event`) and **survives restarts** until a signal keyed by the
  phase's node id arrives — from the console signal button, `aomi-smither
  signal --app <app> --node <phase>`, or any system POSTing the console's
  `/signal` endpoint. Optional `timeoutHours`. (`run.ts` `sendSignal`)
- **cross-repo agents** — any agent phase can set `repo: "<path>"` to run in a
  *different* codebase (the workflow makes one CLI agent per distinct
  (agent, repo)). The `design` role writes an integration `DESIGN.md` a human
  builds the other side from. Full-stack shape: `design(repo: game-engine)` →
  `gate` (review the design) → `wait-external` (other side shipped) →
  codegen/curate → `eval`.

`executeRunUntilSettled` (run.ts) is the approval-aware runner: the engine
*returns* `waiting-approval` rather than blocking on it, so the runner
re-executes with resume after each durable decision — from whichever surface
wrote it. The browser console gets a loopback **decision endpoint**
(`POST /decide`) beside the gateway, because the stock gateway approve route
drops decision payloads (0.26.1) and select-mode clarifies need them.

## Intake view (watch the composition from t=0)

The composer (`distillIntent`) runs *before* any Smithers workflow exists, so
it can't be a gateway node. Interactive runs instead boot a lightweight
**intake view** (`intake.ts`) at startup and print a `⌗ intake view:` URL — an
aomi-branded page that streams the conversation, the composer thinking, the
plan taking shape, and the composed stage preview live as you chat. When you
confirm the plan and the build starts, the page **follows itself** to the
gateway console (`buildUrl`) — one browser tab across the whole flow: intake →
compose → build → deploy. `--no-console` disables it along with the build
console.

## Browser console (live workflow visualization)

Interactive runs boot a [Smithers Gateway](https://smithers.sh) sidecar on
`127.0.0.1` (`console.ts`) and print a `⌗ live console:` URL — an **aomi-branded
React UI** (`ui/aomi-smither.tsx`, served at `/workflows/<app>`) showing the
plan's named build stages coloured by the live event stream, per-node output,
the activity feed, and **approve/deny buttons** (an approval can be answered
from the TUI or the browser; both write the same durable decision). Headless
runs opt in with `--console`; `--no-console` disables, `--console-port` moves
it off 7331, and `--console-builtin` swaps in the generic Smithers operator
console (also always available at `/console`).

The UI is a first-class Gateway UI entry: the gateway bundles it with
`Bun.build` on first request and exposes the full [`gateway-react`] hook
surface (`useGatewayRunEvents`, `useGatewayApprovals`, `useGatewayActions`, …).
Live runs light the stage rail from streaming events; a run that finished
before the console attached is reconstructed from the persisted devtools
snapshot (`getDevToolsSnapshot`) — only stages that actually mounted show
`done`. The pure event→stage reducer lives in `console-model.ts` and is unit
tested.

Because the gateway reads the run's own SQLite (`smithers.sqlite`) and
bridges persisted events from runs executed by other processes,
`aomi-smither console --app <name>` observes a run *from outside* — start the
build in one terminal, watch its graph from a browser via another. The
`plan.json` persisted beside the run state is what lets the observer rebuild
the identical workflow shape and stage labels.

[`gateway-react`]: https://smithers.sh/examples/workflow-ui-react

## Fresh-from-GitHub binaries

Every run starts by syncing the SDK checkout with GitHub: `git fetch origin`,
fast-forward when the checkout is clean and strictly behind, then a release
`cargo build` of `aomi-build`/`aomi-run` from that synced HEAD. A checkout
that can't be guaranteed fresh (offline, dirty, diverged, not a git repo)
fails the run unless you pass `--allow-stale-sdk`.

## Requirements

- **Bun** (https://bun.sh) — Smithers persists runs via `bun:sqlite`; the
  `aomi-smither` bin shebang prefers Bun automatically.
- `claude` and/or `codex` CLIs on PATH for agent stages and the intent chat.

`aomi-build` remains the deterministic Rust build/deploy CLI. `aomi-smither`
is the recommended path when an app needs long-running agent assistance,
workflow persistence, approvals, and validation loops. `aomi-smither rollback`
(deterministic, no Smithers involvement) rolls an app back to a previous
deployment using the backend activation log.
