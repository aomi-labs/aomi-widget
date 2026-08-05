// =============================================================================
// Deployment watch loop — polling with backoff, shared by the server client
// (`BackendClient.watchDeployment`) and the browser client
// (`createLaunchClient().watch`).
//
// Browser-safe: no fetch, no env, no transport. It takes a `poll` closure so
// each client supplies its own request and its own "this error is fatal" rule.
// =============================================================================

import type {
  DeploymentProgressEvent,
  DeploymentStatus,
  ProgressModel,
  WatchDeploymentOptions,
} from "../types";

const TOTAL_STEPS = 8;

/** Where a deployment sits in the 8-step build → release arc. */
export function deploymentProgress(
  status: DeploymentStatus,
  lastCompleted: number,
): ProgressModel {
  const total = TOTAL_STEPS;
  switch (status.state) {
    case "pending":
      return { completed: 1, total, label: "Waiting for build" };
    case "building":
      return { completed: 2, total, label: "Building CI" };
    case "releasing":
      return { completed: 5, total, label: "Verifying release assets" };
    case "ready":
      return { completed: 8, total, label: "Build ready" };
    case "no_ci":
      return { completed: lastCompleted, total, label: "No CI" };
    case "failed":
      return { completed: lastCompleted, total, label: "Build failed" };
    default:
      return { completed: lastCompleted, total, label: "Waiting for build" };
  }
}

export function backoffDelay(
  failures: number,
  baseMs: number,
  maxMs: number,
): number {
  return Math.min(baseMs * Math.pow(2, failures), maxMs);
}

/** A deployment stops moving in exactly these states. */
export function isTerminalState(status: DeploymentStatus): boolean {
  return (
    status.state === "ready" ||
    status.state === "failed" ||
    status.state === "no_ci"
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function failedStatus(message: string): DeploymentStatus {
  return { state: "failed", releaseTags: [], message };
}

export type WatchLoopOptions = WatchDeploymentOptions & {
  /**
   * Whether an error means "stop now" rather than "retry". Transports differ
   * (`BackendError` server-side, `LaunchRequestError` in the browser), so the
   * caller decides; the default retries everything until `maxRetries`.
   */
  isFatal?: (error: unknown) => boolean;
};

/**
 * Poll `poll()` until the deployment reaches a terminal state or retries are
 * exhausted, calling `onEvent` on every tick.
 *
 * It never throws and never rejects: a failure is delivered as an `error`
 * event, so a UI render loop has exactly one code path to handle. `completed`
 * is monotonic — progress never visibly goes backwards on a flapping poll.
 */
export async function watchDeploymentLoop(
  poll: () => Promise<DeploymentStatus>,
  onEvent: (event: DeploymentProgressEvent) => void,
  options: WatchLoopOptions = {},
): Promise<void> {
  const baseDelayMs = options.baseDelayMs ?? 3000;
  const maxDelayMs = options.maxDelayMs ?? 30000;
  const maxRetries = options.maxRetries ?? 8;
  const signal = options.signal;
  const isFatal = options.isFatal ?? (() => false);

  let failures = 0;
  let lastCompleted = 0;
  let lastProgress: ProgressModel = {
    completed: 0,
    total: TOTAL_STEPS,
    label: "Waiting for build",
  };

  while (!signal?.aborted && failures < maxRetries) {
    try {
      const status = await poll();
      const mapped = deploymentProgress(status, lastCompleted);
      const completed = Math.max(mapped.completed, lastCompleted);
      const progress: ProgressModel = { ...mapped, completed };
      lastCompleted = completed;
      lastProgress = progress;

      const terminal = isTerminalState(status);
      onEvent({ kind: terminal ? "terminal" : "progress", status, progress });
      if (terminal) return;

      failures = 0;
      await sleep(backoffDelay(0, baseDelayMs, maxDelayMs));
    } catch (err) {
      if (isFatal(err)) {
        const error = err instanceof Error ? err : new Error(String(err));
        onEvent({
          kind: "error",
          status: failedStatus(error.message),
          progress: lastProgress,
          error,
        });
        return;
      }
      failures++;
      const error = err instanceof Error ? err : new Error(String(err));
      onEvent({
        kind: "warning",
        status: failedStatus(
          `Polling attempt failed (${failures}/${maxRetries}): ${error.message}`,
        ),
        progress: lastProgress,
        error,
      });
      await sleep(backoffDelay(failures, baseDelayMs, maxDelayMs));
    }
  }

  const message = signal?.aborted
    ? "Watch cancelled"
    : `Polling stopped after ${maxRetries} consecutive failures`;
  onEvent({
    kind: "error",
    status: failedStatus(message),
    progress: lastProgress,
    error: new Error(message),
  });
}
