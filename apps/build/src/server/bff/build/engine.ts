import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";
import {
  decideApproval,
  defaultSdkRoot,
  executeRunUntilSettled,
  finalizePlan,
  prepareRun,
  resolveRunBackend,
  stageKeyForNode,
  stagesFor,
  type BuildPlan,
  type PreparedRun,
} from "@aomi-labs/smither";
import type {
  BuildRunApproval,
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
  prepared: PreparedRun;
  status: BuildRunStatus;
  stageStatus: Record<string, BuildRunStageStatus>;
  approvals: BuildRunApproval[];
  lines: string[];
  result?: { status: string; summary: string };
  error?: string;
  createdAt: string;
  updatedAt: string;
};

type Registry = {
  byRunId: Map<string, RunHandle>;
  byApp: Map<string, RunHandle>;
};

const REGISTRY_KEY = Symbol.for("aomi-build.smither-engine");

function registry(): Registry {
  const holder = globalThis as { [REGISTRY_KEY]?: Registry };
  holder[REGISTRY_KEY] ??= { byRunId: new Map(), byApp: new Map() };
  return holder[REGISTRY_KEY];
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

/** Same folding as the TUI's reduceEvent: node events light plan stages,
 *  approval events maintain the pending-approval list. */
function reduceEvent(handle: RunHandle, event: EngineEvent) {
  const setStage = (nodeId: string, status: BuildRunStageStatus) => {
    const key = stageKeyForNode(handle.plan, nodeId);
    // Never let a later loop iteration mark a finished stage pending again.
    if (handle.stageStatus[key] === "complete" && status === "running") return;
    handle.stageStatus[key] = status;
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

function execute(handle: RunHandle) {
  void executeRunUntilSettled(handle.prepared, {
    onEvent: (event) => reduceEvent(handle, event as EngineEvent),
  })
    .then((result) => {
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
      const output = (
        result as { output?: { status?: string; summary?: string } }
      ).output;
      if (output?.summary) {
        handle.result = {
          status: output.status ?? status,
          summary: output.summary,
        };
      }
      if (handle.status === "completed") {
        // A resumed run replays cached tasks without live node events; a
        // finished run means the composition settled, so backfill stages the
        // reducer never saw (leave live-set failed/waiting keys alone).
        for (const stage of stagesFor(handle.plan)) {
          handle.stageStatus[stage.id] ??= "complete";
        }
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

  const root = sdkRoot();
  // An app that already carries a discovered/curated spec resumes idempotently
  // (gen-* keeps curated sources); a fresh app goes through spec discovery.
  const hasSpec = existsSync(path.join(root, "apps", app, "openapi.yaml"));
  const { plan, issues } = finalizePlan({
    app,
    sdkRoot: root,
    source: hasSpec ? "existing" : "discover",
    userStory: options.prompt,
    // No web surface answers gates yet — run unattended by default. The
    // decision route exists, so callers can opt back in per run.
    autoApprove: options.autoApprove ?? true,
    // Dev knob: accept a dirty/behind SDK checkout and reuse its prebuilt
    // release binaries instead of failing the binaries phase.
    allowStaleSdk: process.env.AOMI_ALLOW_STALE_SDK === "1",
  });
  if (!plan) {
    throw new BuildEngineError(`invalid build plan: ${issues.join("; ")}`, 400);
  }

  const stateRoot = runsRoot();
  const prepared = await prepareRun({
    plan,
    deps: { env: process.env },
    runsRoot: stateRoot,
    backend: resolveRunBackend(app, { runsRoot: stateRoot }),
  });

  const now = new Date().toISOString();
  const handle: RunHandle = {
    runId: prepared.runId,
    app,
    plan,
    prepared,
    status: "running",
    stageStatus: {},
    approvals: [],
    lines: [
      `${prepared.resume ? "resuming" : "starting"} run ${prepared.runId} (state: ${prepared.stateLocation})`,
    ],
    createdAt: now,
    updatedAt: now,
  };
  registry().byRunId.set(handle.runId, handle);
  registry().byApp.set(app, handle);
  execute(handle);
  return handle;
}

export function getBuildRun(runId: string): RunHandle | undefined {
  return registry().byRunId.get(runId);
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
    api: handle.prepared.api,
    runId: handle.runId,
    nodeId: options.nodeId,
    iteration: options.iteration,
    approve: options.approve,
    note: options.note,
    decidedBy: "aomi-build-web",
    selection: options.selection,
  });
}

export function snapshotBuildRun(handle: RunHandle): BuildRunSnapshot {
  const stages: BuildRunStage[] = stagesFor(handle.plan).map((stage) => ({
    id: stage.id,
    label: stage.label,
    kind: stage.kind,
    status: handle.stageStatus[stage.id] ?? "pending",
    ...(stage.branchOf ? { branchOf: stage.branchOf } : {}),
    ...(stage.clarify ? { clarify: stage.clarify } : {}),
  }));
  return {
    runId: handle.runId,
    app: handle.app,
    status: handle.status,
    stages,
    approvals: handle.approvals,
    lines: handle.lines.slice(-40),
    ...(handle.result ? { result: handle.result } : {}),
    ...(handle.error ? { error: handle.error } : {}),
    createdAt: handle.createdAt,
    updatedAt: handle.updatedAt,
  };
}
