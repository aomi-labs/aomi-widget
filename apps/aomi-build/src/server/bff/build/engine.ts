import "server-only";

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  createAomiSmither,
  decideApproval,
  defaultSdkRoot,
  executeRunUntilSettled,
  finalizePlan,
  prepareRun,
  readRunView,
  requestRunCancel,
  resolveRunBackend,
  sanitizeAppName,
  stageKeyForNode,
  stagesFor,
  type AomiSmitherApi,
  type BuildPlan,
  type PreparedRun,
  type RunView,
} from "@aomi-labs/smither";
import {
  curationFromOutputs,
  resultFromOutputs,
  runStatusFromView,
  stageStatusesFromView,
} from "./run-view";
import {
  dispatchSandboxRun,
  maybeExtendSandbox,
  sandboxRunnerConfig,
  stopSandbox,
  type SandboxDispatch,
} from "./sandbox-runner";
import type {
  BuildRunApproval,
  BuildRunFileNode,
  BuildRunSnapshot,
  BuildRunStage,
  BuildRunStageStatus,
  BuildRunStatus,
} from "@build/features/build/run-contracts";

/**
 * In-process aomi-smither engine behind the /build page.
 *
 * Durable run state lives in the backend `resolveRunBackend` picks (postgres
 * via SMITHER_DATABASE_URL, else an embedded PGlite dir per app), so a server
 * restart loses only this in-memory registry, not the run — re-creating the
 * same app resumes it. The registry itself is process-local: on multi-instance
 * deployments, polling must reach the instance that executes the run (pin the
 * BFF to one instance, or move execution into a sandbox provider — v2).
 *
 * Runtime note: smithers-orchestrator ships Bun-flavored TS; on Node the
 * module hooks registered in src/instrumentation.ts make it loadable, and
 * next.config.ts lists these packages in serverExternalPackages so the
 * bundler leaves them to the Node loader.
 */

type EngineEvent = {
  type: string;
  nodeId?: string;
  iteration?: number;
  attempt?: number;
  status?: string;
  error?: unknown;
  request?: { title?: string };
};

type RunHandle = {
  runId: string;
  app: string;
  plan: BuildPlan;
  api: AomiSmitherApi;
  /** Present on handles this process executes; absent on observer handles
   *  reconstructed for runs another process (or a past life) started. */
  prepared?: PreparedRun;
  /** Present when this run executes in a Vercel Sandbox this process booted. */
  dispatch?: SandboxDispatch;
  status: BuildRunStatus;
  stageStatus: Record<string, BuildRunStageStatus>;
  /** HH:MM:SS of each stage's latest live transition. */
  stageTimes: Record<string, string>;
  approvals: BuildRunApproval[];
  lines: string[];
  error?: string;
  createdAt: string;
  updatedAt: string;
};

type Registry = {
  byRunId: Map<string, RunHandle>;
  byApp: Map<string, RunHandle>;
  /** One open store handle per app — the embedded PGlite backend cannot be
   *  opened twice on one dataDir in a process. */
  apis: Map<string, Promise<AomiSmitherApi>>;
};

const REGISTRY_KEY = Symbol.for("aomi-build.smither-engine");

function registry(): Registry {
  const holder = globalThis as { [REGISTRY_KEY]?: Registry };
  holder[REGISTRY_KEY] ??= {
    byRunId: new Map(),
    byApp: new Map(),
    apis: new Map(),
  };
  return holder[REGISTRY_KEY];
}

function apiFor(app: string): Promise<AomiSmitherApi> {
  const { apis } = registry();
  let api = apis.get(app);
  if (!api) {
    api = createAomiSmither(resolveRunBackend(app, { runsRoot: runsRoot() }));
    api.catch(() => apis.delete(app));
    apis.set(app, api);
  }
  return api;
}

export class BuildEngineError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function sdkRoot(): string {
  const root = process.env.AOMI_SDK_ROOT ?? defaultSdkRoot();
  if (!existsSync(root)) {
    throw new BuildEngineError(
      `Aomi SDK checkout not found at ${root}. Set AOMI_SDK_ROOT to a local aomi-sdk checkout.`,
      503,
    );
  }
  return root;
}

function runsRoot(): string {
  return (
    process.env.SMITHER_RUNS_ROOT ??
    path.join(process.cwd(), ".smithers", "runs")
  );
}

/** Package-name slug from a free-text prompt, e.g. "Hyperliquid & Binance
 *  arb bot" → "hyperliquid-binance-arb-bot". */
export function appSlugFromPrompt(prompt: string): string {
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 5)
    .join("-");
  return slug || "aomi-app";
}

function pushLine(handle: RunHandle, line: string) {
  handle.lines = [...handle.lines.slice(-120), line];
  handle.updatedAt = new Date().toISOString();
}

function nowStamp(): string {
  return new Date().toTimeString().slice(0, 8);
}

const TREE_SKIP = new Set(["target", "node_modules", ".git", "Cargo.lock"]);

/** The generated crate as the page's file-tree shape. Paths are prefixed with
 *  the app name, matching the mock's convention ("<app>/src/tool.rs"). */
function crateFileTree(appDir: string, app: string): BuildRunFileNode[] {
  const walk = (dir: string, rel: string, depth: number): BuildRunFileNode[] => {
    if (depth > 4) return [];
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    return entries
      .filter((e) => !TREE_SKIP.has(e.name) && !e.name.startsWith("."))
      .sort((a, b) =>
        a.isDirectory() === b.isDirectory()
          ? a.name.localeCompare(b.name)
          : a.isDirectory()
            ? -1
            : 1,
      )
      .map((e) => {
        const childRel = `${rel}/${e.name}`;
        return e.isDirectory()
          ? {
              path: childRel,
              type: "folder" as const,
              children: walk(path.join(dir, e.name), childRel, depth + 1),
            }
          : { path: childRel, type: "file" as const };
      });
  };
  if (!existsSync(appDir)) return [];
  return [{ path: app, type: "folder", children: walk(appDir, app, 0) }];
}

/** Same folding as the TUI's reduceEvent: node events light plan stages,
 *  approval events maintain the pending-approval list. */
function reduceEvent(handle: RunHandle, event: EngineEvent) {
  const setStage = (nodeId: string, status: BuildRunStageStatus) => {
    const key = stageKeyForNode(handle.plan, nodeId);
    // Never let a later loop iteration mark a finished stage pending again.
    if (handle.stageStatus[key] === "complete" && status === "running") return;
    handle.stageStatus[key] = status;
    handle.stageTimes[key] = nowStamp();
  };
  switch (event.type) {
    case "NodeStarted":
      if (event.nodeId) {
        setStage(event.nodeId, "running");
        pushLine(handle, `▸ ${event.nodeId}`);
      }
      break;
    case "NodeFinished":
      if (event.nodeId) {
        setStage(event.nodeId, "complete");
        pushLine(handle, `✓ ${event.nodeId}`);
      }
      break;
    case "NodeFailed": {
      if (!event.nodeId) break;
      setStage(event.nodeId, "failed");
      const message =
        event.error instanceof Error
          ? event.error.message
          : typeof event.error === "string"
            ? event.error
            : JSON.stringify(event.error ?? "failed");
      pushLine(handle, `✗ ${event.nodeId}: ${message.slice(0, 400)}`);
      break;
    }
    case "NodeWaitingApproval": {
      if (!event.nodeId) break;
      setStage(event.nodeId, "waiting");
      const iteration = event.iteration ?? 0;
      if (
        !handle.approvals.some(
          (a) => a.nodeId === event.nodeId && a.iteration === iteration,
        )
      ) {
        handle.approvals.push({ nodeId: event.nodeId, iteration });
        pushLine(handle, `⏸ ${event.nodeId} awaiting approval`);
      }
      // executeRunUntilSettled keeps polling while parked, so the parked
      // status is only visible through events.
      handle.status = "waiting-approval";
      break;
    }
    case "ApprovalRequested": {
      const pending = handle.approvals.find((a) => a.nodeId === event.nodeId);
      if (pending && event.request?.title) pending.title = event.request.title;
      break;
    }
    case "ApprovalGranted":
    case "ApprovalDenied":
      handle.approvals = handle.approvals.filter(
        (a) => a.nodeId !== event.nodeId,
      );
      if (handle.approvals.length === 0 && handle.status === "waiting-approval") {
        handle.status = "running";
      }
      break;
    case "RunStatusChanged":
      if (event.status) pushLine(handle, `run status: ${event.status}`);
      break;
    default:
      break;
  }
}

/**
 * Execution seam, selected via AOMI_BUILD_RUNNER: "local" runs the workflow
 * in this process (dev, single host); "vercel-sandbox" dispatches
 * `aomi-smither run-plan` into a sandbox booted from the golden image
 * (infra/build-runner). Snapshots never care — they read the shared store
 * either way (Phase 1).
 */
function runnerKind(): "local" | "vercel-sandbox" {
  const kind = process.env.AOMI_BUILD_RUNNER ?? "local";
  if (kind !== "local" && kind !== "vercel-sandbox") {
    throw new BuildEngineError(`unknown AOMI_BUILD_RUNNER "${kind}"`, 503);
  }
  return kind;
}

function execute(handle: RunHandle, prepared: PreparedRun) {
  void executeRunUntilSettled(prepared, {
    onEvent: (event) => reduceEvent(handle, event as EngineEvent),
  })
    .then((result) => {
      // Snapshot reads derive statuses/outputs from the durable store; here
      // we only keep the in-memory garnish coherent.
      const status = String(result.status);
      handle.status =
        status === "finished" || status === "continued"
          ? "completed"
          : status === "waiting-approval" || status === "waiting-event"
            ? (status as BuildRunStatus)
            : "failed";
      if (handle.status === "failed" && result.error !== undefined) {
        handle.error =
          result.error instanceof Error
            ? result.error.message
            : typeof result.error === "string"
              ? result.error
              : JSON.stringify(result.error);
      }
      pushLine(
        handle,
        `run settled: ${status}${handle.error ? ` — ${handle.error.slice(0, 400)}` : ""}`,
      );
    })
    .catch((error: unknown) => {
      handle.status = "failed";
      handle.error = error instanceof Error ? error.message : String(error);
      pushLine(handle, `run failed: ${handle.error}`);
    });
}

/** The BuildPlan for an app — deterministic given (app, story), so observer
 *  processes can recompose the identical stage shape without the original
 *  request (the story only flavors agent prompts). `sdkRootOverride` targets
 *  a filesystem this process can't see (the sandbox image); spec detection
 *  is skipped there, so remote runs always go through discovery for now. */
function composePlan(
  app: string,
  userStory: string,
  autoApprove = true,
  sdkRootOverride?: string,
): BuildPlan {
  const root = sdkRootOverride ?? sdkRoot();
  // An app that already carries a discovered/curated spec resumes idempotently
  // (gen-* keeps curated sources); a fresh app goes through spec discovery.
  const hasSpec = sdkRootOverride
    ? false
    : existsSync(path.join(root, "apps", app, "openapi.yaml"));
  const { plan, issues } = finalizePlan({
    app,
    sdkRoot: root,
    source: hasSpec ? "existing" : "discover",
    userStory,
    // No web surface answers gates yet — run unattended by default. The
    // decision route exists, so callers can opt back in per run.
    autoApprove,
    // Dev knob: accept a dirty/behind SDK checkout and reuse its prebuilt
    // release binaries instead of failing the binaries phase.
    allowStaleSdk: process.env.AOMI_ALLOW_STALE_SDK === "1",
  });
  if (!plan) {
    throw new BuildEngineError(`invalid build plan: ${issues.join("; ")}`, 400);
  }
  return plan;
}

export async function startBuildRun(options: {
  prompt: string;
  app?: string;
  autoApprove?: boolean;
}): Promise<RunHandle> {
  const app = options.app ?? appSlugFromPrompt(options.prompt);
  const existing = registry().byApp.get(app);
  // Reuse a live handle; a settled one gets a fresh execution (the durable
  // backend replays completed work, so this is a resume, not a redo).
  if (
    existing &&
    existing.status !== "completed" &&
    existing.status !== "failed"
  ) {
    return existing;
  }

  const now = new Date().toISOString();
  let handle: RunHandle;

  if (runnerKind() === "vercel-sandbox") {
    // The BFF composes and registers; the sandbox executes. Re-creating a
    // settled app reuses its run id so run-plan resumes from store state.
    const config = sandboxRunnerConfig();
    const plan = composePlan(
      app,
      options.prompt,
      options.autoApprove ?? true,
      config.sdkRoot,
    );
    const runId =
      existing?.runId ??
      `smither-${sanitizeAppName(app)}-${crypto.randomUUID()}`;
    const dispatch = await dispatchSandboxRun({
      planJson: JSON.stringify(plan),
      app,
      runId,
      config,
    });
    handle = {
      runId,
      app,
      plan,
      api: await apiFor(app),
      dispatch,
      status: "running",
      stageStatus: {},
      stageTimes: {},
      approvals: [],
      lines: [`dispatched run ${runId} to sandbox ${dispatch.sandbox.sandboxId}`],
      createdAt: now,
      updatedAt: now,
    };
  } else {
    const plan = composePlan(app, options.prompt, options.autoApprove ?? true);
    const prepared = await prepareRun({
      plan,
      deps: { env: process.env },
      runsRoot: runsRoot(),
      api: await apiFor(app),
    });
    handle = {
      runId: prepared.runId,
      app,
      plan,
      api: prepared.api,
      prepared,
      status: "running",
      stageStatus: {},
      stageTimes: {},
      approvals: [],
      lines: [
        `${prepared.resume ? "resuming" : "starting"} run ${prepared.runId} (state: ${prepared.stateLocation})`,
      ],
      createdAt: now,
      updatedAt: now,
    };
    execute(handle, prepared);
  }

  registry().byRunId.set(handle.runId, handle);
  registry().byApp.set(app, handle);
  return handle;
}

/** Request cancellation of a run. Works from any instance — the cancel is a
 *  durable store write the executing engine polls (local or in-sandbox);
 *  stopping a sandbox we booted is best-effort cleanup on top. */
export async function cancelBuildRun(runId: string): Promise<void> {
  const handle = getBuildRun(runId) ?? (await reconstructBuildRun(runId));
  if (!handle) {
    throw new BuildEngineError(`unknown run: ${runId}`, 404);
  }
  await requestRunCancel(handle.api, handle.runId);
  pushLine(handle, "cancel requested");
  if (handle.dispatch) await stopSandbox(handle.dispatch);
}

export function getBuildRun(runId: string): RunHandle | undefined {
  return registry().byRunId.get(runId);
}

const RUN_ID = /^smither-(.+)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Serve a run this process never executed (another instance started it, or a
 * restart dropped the registry): recompose the plan from the app name and
 * read everything else from the durable store. The handle observes; it does
 * not execute.
 */
export async function reconstructBuildRun(
  runId: string,
): Promise<RunHandle | undefined> {
  const app = RUN_ID.exec(runId)?.[1];
  if (!app || sanitizeAppName(app) !== app) return undefined;
  let handle: RunHandle;
  try {
    const api = await apiFor(app);
    const view = await readRunView(api, runId);
    if (view.status === null) return undefined;
    const now = new Date().toISOString();
    handle = {
      runId,
      app,
      plan: composePlan(app, "observed run"),
      api,
      status: runStatusFromView(view.status) ?? "running",
      stageStatus: {},
      stageTimes: {},
      approvals: [],
      lines: [`observing run ${runId}`],
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.warn(
      `could not reconstruct run ${runId}:`,
      error instanceof Error ? error.message : error,
    );
    return undefined;
  }
  registry().byRunId.set(runId, handle);
  return handle;
}

export async function decideBuildRun(options: {
  runId: string;
  nodeId: string;
  iteration: number;
  approve: boolean;
  note?: string;
  selection?: { selected: string; notes?: string };
}): Promise<void> {
  const handle = registry().byRunId.get(options.runId);
  if (!handle) {
    throw new BuildEngineError(`unknown run: ${options.runId}`, 404);
  }
  await decideApproval({
    api: handle.api,
    runId: handle.runId,
    nodeId: options.nodeId,
    iteration: options.iteration,
    approve: options.approve,
    note: options.note,
    decidedBy: "aomi-build-web",
    selection: options.selection,
  });
}

export async function snapshotBuildRun(
  handle: RunHandle,
): Promise<BuildRunSnapshot> {
  // The durable store is the source of truth; the live reducer maps only
  // garnish (sub-poll latency, activity lines, timestamps).
  let view: RunView | undefined;
  try {
    view = await readRunView(handle.api, handle.runId);
  } catch (error) {
    pushLine(
      handle,
      `store read failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const status =
    (view && runStatusFromView(view.status)) ??
    (handle.status as BuildRunStatus);
  // Serverless-shaped sandbox keepalive: each poll of a live sandbox run
  // lazily extends its timeout; an unpolled run lets the sandbox lapse (the
  // next create resumes it from store state).
  if (handle.dispatch && (status === "running" || status === "waiting-approval")) {
    void maybeExtendSandbox(handle.dispatch);
  }
  const stageStatus = view
    ? stageStatusesFromView(
        view,
        (nodeId) => stageKeyForNode(handle.plan, nodeId),
        handle.stageStatus,
      )
    : handle.stageStatus;
  const outputs = view?.outputs ?? {};
  const curation = curationFromOutputs(outputs);
  const result = resultFromOutputs(outputs);
  const error = view?.error ?? handle.error;

  const stages: BuildRunStage[] = stagesFor(handle.plan).map((stage) => ({
    id: stage.id,
    label: stage.label,
    kind: stage.kind,
    status: stageStatus[stage.id] ?? "pending",
    ...(handle.stageTimes[stage.id] ? { time: handle.stageTimes[stage.id] } : {}),
    ...(stage.branchOf ? { branchOf: stage.branchOf } : {}),
    ...(stage.clarify ? { clarify: stage.clarify } : {}),
  }));
  // The crate appears once codegen ran; a completed replay has it too.
  const codegenDone =
    stageStatus[`${handle.app}:codegen`] === "complete" ||
    status === "completed";
  const fileTree = codegenDone
    ? crateFileTree(path.join(handle.plan.sdkRoot, "apps", handle.app), handle.app)
    : [];
  return {
    runId: handle.runId,
    app: handle.app,
    status,
    stages,
    approvals: handle.approvals,
    lines: handle.lines.slice(-40),
    fileTree,
    ...(curation ? { curation } : {}),
    ...(result ? { result } : {}),
    ...(error ? { error } : {}),
    createdAt: handle.createdAt,
    updatedAt: handle.updatedAt,
  };
}
