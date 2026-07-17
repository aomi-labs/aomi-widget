import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Effect } from "effect";
import type { RunResult, SmithersEvent } from "smithers-orchestrator";
import type { BuildPlan } from "./plan";
import {
  createRunState,
  defaultRunsRoot,
  loadRunState,
  resetRunState,
  runDir,
  savePlan,
  smitherDbPath,
} from "./state";
import {
  buildAppWorkflow,
  createAomiSmither,
  describeBackend,
  type AomiSmitherApi,
  type SmitherBackend,
  type WorkflowDeps,
} from "./workflow";

export function isBunRuntime(): boolean {
  // Check Bun.version rather than the bare global: Node hosts (the aomi-build
  // BFF) polyfill a minimal `Bun` for the engine's unguarded Bun.sleep calls,
  // and that polyfill deliberately omits `version`.
  const bun = (globalThis as { Bun?: { version?: unknown } }).Bun;
  return typeof bun?.version === "string";
}

/** Bun-only surfaces (the gateway console bundles its UI with Bun.build). */
export function assertBunRuntime(): void {
  if (!isBunRuntime()) {
    throw new Error(
      "This aomi-smither surface needs Bun (https://bun.sh) — the gateway console bundles with Bun.build. Workflow runs themselves also work on Node via the pglite/postgres backends.",
    );
  }
}

/**
 * Pick where run state lives. An explicit SMITHER_DATABASE_URL wins on any
 * runtime (shared/durable Postgres); otherwise Bun keeps the classic
 * bun:sqlite file and Node falls back to an embedded PGlite dir beside it.
 */
export function resolveRunBackend(
  app: string,
  options: { runsRoot?: string; env?: NodeJS.ProcessEnv } = {},
): SmitherBackend {
  const env = options.env ?? process.env;
  const runsRoot = options.runsRoot ?? defaultRunsRoot;
  const connectionString = env.SMITHER_DATABASE_URL;
  if (connectionString) {
    return { kind: "postgres", connectionString };
  }
  if (isBunRuntime()) {
    return { kind: "sqlite", dbPath: smitherDbPath(app, runsRoot) };
  }
  return { kind: "pglite", dataDir: path.join(runDir(app, runsRoot), "pglite") };
}

export type PreparedRun = {
  api: AomiSmitherApi;
  workflow: Awaited<ReturnType<typeof buildAppWorkflow>>;
  plan: BuildPlan;
  runId: string;
  /** True when a prior run exists for this app and we're continuing it. */
  resume: boolean;
  backend: SmitherBackend;
  /** Human-readable state location (sqlite path, pglite dir, or "postgres"). */
  stateLocation: string;
};

export async function prepareRun(options: {
  plan: BuildPlan;
  deps?: WorkflowDeps;
  runsRoot?: string;
  overwrite?: boolean;
  backend?: SmitherBackend;
}): Promise<PreparedRun> {
  const runsRoot = options.runsRoot ?? defaultRunsRoot;
  const app = options.plan.app;
  if (options.overwrite) {
    await resetRunState(app, runsRoot);
  }
  await mkdir(runDir(app, runsRoot), { recursive: true });
  await savePlan(options.plan, runsRoot);
  const existing = await loadRunState(app, runsRoot);
  const state = existing ?? (await createRunState(app, runsRoot));
  const backend = options.backend ?? resolveRunBackend(app, { runsRoot });
  const api = await createAomiSmither(backend);
  const workflow = await buildAppWorkflow(api, options.plan, options.deps);
  return {
    api,
    workflow,
    plan: options.plan,
    runId: state.runId,
    resume: existing !== null,
    backend,
    stateLocation: describeBackend(backend),
  };
}

export async function executeRun(
  prepared: PreparedRun,
  options: {
    onEvent?: (event: SmithersEvent) => void;
    signal?: AbortSignal;
    maxConcurrency?: number;
  } = {},
): Promise<RunResult> {
  const { runWorkflow } = await import("smithers-orchestrator");
  return Effect.runPromise(
    runWorkflow(prepared.workflow, {
      input: prepared.plan,
      runId: prepared.runId,
      resume: prepared.resume,
      rootDir: prepared.plan.sdkRoot,
      maxConcurrency: options.maxConcurrency,
      onProgress: options.onEvent,
      signal: options.signal,
      // The composed graph mounts phase N only after phase N-1's output row is
      // visible to a re-render. On async backends (pglite/postgres) the run
      // must not settle between a task finishing and that re-render, or it
      // ends "finished" with unmounted phases still ahead.
      requireRerenderOnOutputChange: true,
    }),
  );
}

/** Statuses where the run is parked on something external and re-executing
 *  with resume is the way forward once that thing arrives: a durable approval
 *  decision (`waiting-approval`) or an external signal (`waiting-event`). */
const PARKED_STATUSES = new Set(["waiting-approval", "waiting-event"]);

/**
 * Run to a terminal status. `runWorkflow` RETURNS a parked status when the only
 * pending work is a human decision or an external signal — it does not block on
 * it. Those unblock via durable writes from any surface (TUI, browser console,
 * `sendSignal`), so this loop re-executes with resume until the run settles:
 * completed nodes replay from cache, decided/signaled nodes advance, and a
 * still-parked run cheaply returns to waiting.
 */
export async function executeRunUntilSettled(
  prepared: PreparedRun,
  options: {
    onEvent?: (event: SmithersEvent) => void;
    signal?: AbortSignal;
    maxConcurrency?: number;
    /** How often to re-check while parked. @default 2500 */
    approvalPollMs?: number;
  } = {},
): Promise<RunResult> {
  let attempt = prepared;
  for (;;) {
    const result = await executeRun(attempt, options);
    if (!PARKED_STATUSES.has(result.status) || options.signal?.aborted) {
      return result;
    }
    attempt = { ...attempt, resume: true };
    await new Promise((wake) => setTimeout(wake, options.approvalPollMs ?? 2500));
  }
}

/**
 * Deliver an external signal that resolves a `wait-external` pause (a Smithers
 * `<Signal>` node keyed by the phase's node id). The durable write is picked up
 * by the next resume; call from the CLI `signal` subcommand, the console
 * `/signal` endpoint, or any external system with access to the run's SQLite.
 */
export async function sendSignal(options: {
  api: AomiSmitherApi;
  runId: string;
  nodeId: string;
  ready?: boolean;
  note?: string;
  receivedBy?: string;
}): Promise<void> {
  const { SmithersDb, signalRun } = await import("smithers-orchestrator");
  const adapter = new SmithersDb(options.api.db as never);
  await Effect.runPromise(
    signalRun(adapter, options.runId, options.nodeId, {
      ready: options.ready ?? true,
      note: options.note ?? "",
      receivedBy: options.receivedBy ?? "aomi-smither",
    }),
  );
}

/** Write a durable approval decision for a paused node (deploy gate, a
 *  needsApproval task, or a select-mode clarify). The in-process engine picks
 *  it up on its next frame. For clarifies pass `selection` — it becomes the
 *  `{selected, notes}` decision row later phases read as context. */
export async function decideApproval(options: {
  api: AomiSmitherApi;
  runId: string;
  nodeId: string;
  iteration: number;
  approve: boolean;
  note?: string;
  decidedBy?: string;
  selection?: { selected: string; notes?: string };
}): Promise<void> {
  const { SmithersDb, approveNode, denyNode } = await import("smithers-orchestrator");
  const adapter = new SmithersDb(options.api.db as never);
  const decide = options.approve ? approveNode : denyNode;
  await Effect.runPromise(
    decide(
      adapter,
      options.runId,
      options.nodeId,
      options.iteration,
      options.note,
      options.decidedBy ?? "aomi-smither",
      options.selection
        ? { selected: options.selection.selected, notes: options.selection.notes ?? null }
        : undefined,
    ),
  );
}
