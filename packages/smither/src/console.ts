import { createServer as createNetServer } from "node:net";
import type { GatewayOptions } from "smithers-orchestrator";
import { assertBunRuntime } from "./run";
import { defaultRunsRoot, loadPlan, smitherDbPath } from "./state";
import {
  buildAppWorkflow,
  createAomiSmither,
  type AomiWorkflow,
} from "./workflow";

/** Structural view of the Gateway surface we drive. The class itself is
 *  imported lazily so the CLI stays fast when no console is requested. */
type GatewayLike = {
  register: (
    key: string,
    workflow: AomiWorkflow,
    options?: { ui?: boolean | { entry: string; title?: string } },
  ) => GatewayLike;
  listen: (options?: {
    port?: number;
    host?: string;
  }) => Promise<{ address: () => unknown }>;
  close: () => Promise<void>;
};

export type ConsoleHandle = {
  port: number;
  host: string;
  /** Built-in operator console — every registered workflow, runs, approvals. */
  consoleUrl: string;
  /** Per-workflow view inside the operator console. */
  workflowUrl: string;
  close: () => Promise<void>;
};

export type ConsoleOptions = {
  workflow: AomiWorkflow;
  app: string;
  /** First port to try; increments on EADDRINUSE. @default 7331 */
  port?: number;
  /** @default "127.0.0.1" — loopback only; no auth is configured, so the
   *  gateway must never bind a routable interface. */
  host?: string;
  /** @default 10 */
  maxPortTries?: number;
};

export const DEFAULT_CONSOLE_PORT = 7331;

function isAddrInUse(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === "EADDRINUSE"
  );
}

/** Whether (host, port) is bindable right now. Must run BEFORE
 *  `gateway.listen`: on a busy port the gateway's internal server emits an
 *  unhandled 'error' event that crashes the process — it never rejects, so a
 *  try/catch around listen() cannot implement port retry. */
function probePort(host: string, port: number): Promise<boolean> {
  return new Promise((resolveProbe) => {
    const probe = createNetServer();
    probe.unref();
    probe.once("error", () => resolveProbe(false));
    probe.listen({ host, port, exclusive: true }, () => {
      probe.close(() => resolveProbe(true));
    });
  });
}

function boundPort(server: { address: () => unknown }, fallback: number): number {
  const addr = server.address();
  if (addr && typeof addr === "object" && "port" in addr) {
    return Number((addr as { port: number }).port);
  }
  return fallback;
}

/**
 * Boot a Smithers Gateway sidecar for one app workflow and serve the built-in
 * operator console. The gateway shares the workflow's SQLite store, so runs
 * executed by this process (or any other process on the same DB — the
 * out-of-process event bridge polls persisted events) stream live into the
 * browser: task graph, node outputs, events, and approve/deny controls.
 *
 * No auth is configured — the unauthenticated gateway grants the operator
 * role to every caller, which is only acceptable because we bind loopback.
 */
export async function startConsole(options: ConsoleOptions): Promise<ConsoleHandle> {
  const { Gateway } = (await import("smithers-orchestrator/gateway")) as unknown as {
    Gateway: new (opts?: GatewayOptions) => GatewayLike;
  };
  const host = options.host ?? "127.0.0.1";
  const firstPort = options.port ?? DEFAULT_CONSOLE_PORT;
  const tries = Math.max(1, options.maxPortTries ?? 10);

  let lastError: unknown;
  for (let attempt = 0; attempt < tries; attempt += 1) {
    const port = firstPort + attempt;
    if (!(await probePort(host, port))) {
      lastError = new Error(`port ${port} in use`);
      continue;
    }
    // A fresh Gateway per attempt: a failed listen() can leave a dead server
    // handle on the instance, and register() is cheap (config + idempotent DDL).
    const gateway = new Gateway({});
    gateway.register(options.app, options.workflow, { ui: true });
    try {
      const server = await gateway.listen({ port, host });
      const actualPort = boundPort(server, port);
      const origin = `http://${host}:${actualPort}`;
      return {
        port: actualPort,
        host,
        consoleUrl: `${origin}/console`,
        // ui:true mounts the built-in console at the workflow-level default
        // path, /workflows/<key> (see resolveGatewayUiConfig).
        workflowUrl: `${origin}/workflows/${encodeURIComponent(options.app)}`,
        close: () => gateway.close(),
      };
    } catch (error) {
      // Backstop for the probe→listen race; keep trying on address conflicts.
      await gateway.close().catch(() => {});
      if (!isAddrInUse(error)) {
        throw error;
      }
      lastError = error;
    }
  }
  throw new Error(
    `No free console port in ${firstPort}..${firstPort + tries - 1}: ${String(
      (lastError as Error | undefined)?.message ?? lastError,
    )}`,
  );
}

/**
 * Observer mode: boot a console for an app whose run lives (or lived) in this
 * package's run state — typically while `aomi-smither --app <name>` executes
 * in another terminal. Rebuilds the identical workflow from the persisted
 * plan.json and registers it without running anything; the gateway's
 * out-of-process event bridge streams the executing run's persisted events.
 */
export async function startConsoleForApp(options: {
  app: string;
  runsRoot?: string;
  port?: number;
  host?: string;
}): Promise<ConsoleHandle> {
  assertBunRuntime();
  const runsRoot = options.runsRoot ?? defaultRunsRoot;
  const plan = await loadPlan(options.app, runsRoot);
  if (!plan) {
    throw new Error(
      `No stored plan for app "${options.app}" under ${runsRoot}. Start a run first — plan.json is written when a run starts.`,
    );
  }
  const api = await createAomiSmither(smitherDbPath(options.app, runsRoot));
  // Register-only workflow: agents/runners are constructed but never invoked.
  const workflow = await buildAppWorkflow(api, plan);
  return startConsole({
    workflow,
    app: options.app,
    port: options.port,
    host: options.host,
  });
}
