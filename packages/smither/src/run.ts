import { mkdir } from "node:fs/promises";
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
  type AomiSmitherApi,
  type WorkflowDeps,
} from "./workflow";

export function assertBunRuntime(): void {
  if (typeof (globalThis as { Bun?: unknown }).Bun === "undefined") {
    throw new Error(
      "aomi-smither runs its Smithers workflows on Bun's durable SQLite runtime. Install Bun (https://bun.sh) and re-run — the aomi-smither bin already prefers it via its shebang.",
    );
  }
}

export type PreparedRun = {
  api: AomiSmitherApi;
  workflow: Awaited<ReturnType<typeof buildAppWorkflow>>;
  plan: BuildPlan;
  runId: string;
  /** True when a prior run exists for this app and we're continuing it. */
  resume: boolean;
  dbPath: string;
};

export async function prepareRun(options: {
  plan: BuildPlan;
  deps?: WorkflowDeps;
  runsRoot?: string;
  overwrite?: boolean;
}): Promise<PreparedRun> {
  assertBunRuntime();
  const runsRoot = options.runsRoot ?? defaultRunsRoot;
  const app = options.plan.app;
  if (options.overwrite) {
    await resetRunState(app, runsRoot);
  }
  await mkdir(runDir(app, runsRoot), { recursive: true });
  await savePlan(options.plan, runsRoot);
  const existing = await loadRunState(app, runsRoot);
  const state = existing ?? (await createRunState(app, runsRoot));
  const dbPath = smitherDbPath(app, runsRoot);
  const api = await createAomiSmither(dbPath);
  const workflow = await buildAppWorkflow(api, options.plan, options.deps);
  return {
    api,
    workflow,
    plan: options.plan,
    runId: state.runId,
    resume: existing !== null,
    dbPath,
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
    }),
  );
}

/** Write a durable approval decision for a paused node (deploy gate or a
 *  needsApproval task). The in-process engine picks it up on its next frame. */
export async function decideApproval(options: {
  api: AomiSmitherApi;
  runId: string;
  nodeId: string;
  iteration: number;
  approve: boolean;
  note?: string;
  decidedBy?: string;
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
    ),
  );
}
