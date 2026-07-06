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
```

## How it works

1. **Intent chat** (`intent.ts`) — a read-only CLI agent turns the
   conversation into a partial `BuildPlan` plus follow-up questions.
2. **Plan** (`plan.ts`) — the validated `BuildPlan` is the single contract:
   `stagesFor(plan)` is the composed stage list shown in the preview, and the
   workflow renders from the same ids.
3. **Smithers run** (`workflow.tsx`, `run.ts`) — the plan becomes a JSX task
   graph executed by `smithers-orchestrator` on Bun's SQLite runtime. Outputs
   persist per task; **a completed task is never re-executed**, so crashes and
   Ctrl-C resume exactly where they stopped (state under
   `.smithers/runs/<app>/`). Approval gates (agent curation, deploy) are
   durable — the TUI prompts inline, and a headless `--yes` run auto-approves.
4. **Repair loop** — validation failures mount a repair agent task that forks
   the curator's session (full context, no re-prompting), up to
   `--max-fix-rounds` times.

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
