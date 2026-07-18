import "server-only";

/**
 * Vercel Sandbox dispatch for build runs (ship plan Phase 3).
 *
 * The sandbox boots from a golden image (infra/build-runner/) carrying the
 * Rust toolchain, Bun, the claude CLI, a pinned aomi-sdk checkout, and the
 * built aomi-smither package. The BFF pre-allocates the run id, ships the
 * plan as base64 JSON, and the sandbox executes `aomi-smither run-plan`,
 * writing every state transition to the shared Postgres — which is the only
 * channel the web tier reads (Phase 1), so snapshots work from any instance.
 *
 * Lifecycle: sandboxes are created at Vercel's 5-minute create-time ceiling
 * and extended lazily from the poll path (maybeExtendSandbox) — no background
 * loop, which keeps this serverless-shaped. If nobody polls, the sandbox
 * times out; the run resumes in a fresh sandbox on the next create for the
 * same app (run-plan resumes from store state). Cancel is a durable store
 * write the in-sandbox engine polls; stopping the sandbox is best-effort
 * cleanup on top.
 *
 * The @vercel/sandbox SDK is injected behind SandboxClientLike so tests run
 * against a fake and the module loads without the dependency.
 */

export type SandboxLike = {
  sandboxId: string;
  runCommand(params: {
    cmd: string;
    args: string[];
    cwd?: string;
    env?: Record<string, string>;
    detached: true;
  }): Promise<unknown>;
  extendTimeout(durationMs: number): Promise<unknown>;
  stop(): Promise<unknown>;
};

export type SandboxClientLike = {
  create(params: {
    image: string;
    timeout: number;
    resources: { vcpus: number };
    env: Record<string, string>;
    tags: Record<string, string>;
  }): Promise<SandboxLike>;
};

export type SandboxRunnerConfig = {
  image: string;
  vcpus: number;
  databaseUrl: string;
  /** aomi-sdk checkout path inside the image. */
  sdkRoot: string;
  /** packages/smither dir inside the image (where dist/cli.js lives). */
  smitherDir: string;
  builderApiKey?: string;
};

/** Create-time ceiling per Vercel; extensions carry the sandbox beyond it. */
const CREATE_TIMEOUT_MS = 5 * 60_000;
const EXTEND_STEP_MS = 10 * 60_000;
const EXTEND_MIN_INTERVAL_MS = 2 * 60_000;

export function sandboxRunnerConfig(
  env: NodeJS.ProcessEnv = process.env,
): SandboxRunnerConfig {
  const image = env.AOMI_RUNNER_IMAGE;
  const databaseUrl = env.SMITHER_DATABASE_URL;
  if (!image || !databaseUrl) {
    throw new Error(
      "sandbox runner needs AOMI_RUNNER_IMAGE and SMITHER_DATABASE_URL " +
        "(the sandbox writes run state to the shared Postgres the web tier reads)",
    );
  }
  return {
    image,
    vcpus: Number(env.AOMI_SANDBOX_VCPUS) || 4,
    databaseUrl,
    sdkRoot: env.AOMI_SANDBOX_SDK_ROOT ?? "/workspace/aomi-sdk",
    smitherDir: env.AOMI_SANDBOX_SMITHER_DIR ?? "/workspace/aomi/packages/smither",
    builderApiKey: env.AOMI_BUILDER_API_KEY,
  };
}

async function defaultClient(): Promise<SandboxClientLike> {
  const { Sandbox } = await import("@vercel/sandbox");
  // The SDK's Sandbox is a superset of SandboxLike; the seam keeps tests
  // SDK-free, so narrow through unknown.
  return {
    create: (params) =>
      Sandbox.create(params) as unknown as Promise<SandboxLike>,
  };
}

export type SandboxDispatch = {
  sandbox: SandboxLike;
  lastExtendMs: number;
};

/** Boot a sandbox and launch the headless runner for (plan, runId). */
export async function dispatchSandboxRun(options: {
  planJson: string;
  app: string;
  runId: string;
  config: SandboxRunnerConfig;
  client?: SandboxClientLike;
}): Promise<SandboxDispatch> {
  const { config } = options;
  const client = options.client ?? (await defaultClient());
  const sandbox = await client.create({
    image: config.image,
    timeout: CREATE_TIMEOUT_MS,
    resources: { vcpus: config.vcpus },
    env: {
      SMITHER_DATABASE_URL: config.databaseUrl,
      AOMI_ALLOW_STALE_SDK: "1",
      ...(config.builderApiKey
        ? { AOMI_BUILDER_API_KEY: config.builderApiKey }
        : {}),
    },
    tags: { app: options.app.slice(0, 64) },
  });
  await sandbox.runCommand({
    cmd: "bun",
    args: [
      "dist/cli.js",
      "run-plan",
      "--plan-b64",
      Buffer.from(options.planJson, "utf8").toString("base64"),
      "--run-id",
      options.runId,
    ],
    cwd: config.smitherDir,
    detached: true,
  });
  return { sandbox, lastExtendMs: Date.now() };
}

/** Lazily extend the sandbox from the poll path while the run is live. */
export async function maybeExtendSandbox(
  dispatch: SandboxDispatch,
  nowMs = Date.now(),
): Promise<boolean> {
  if (nowMs - dispatch.lastExtendMs < EXTEND_MIN_INTERVAL_MS) return false;
  dispatch.lastExtendMs = nowMs;
  try {
    await dispatch.sandbox.extendTimeout(EXTEND_STEP_MS);
    return true;
  } catch {
    // Expired/stopped sandbox — the run resumes in a fresh one on re-create.
    return false;
  }
}

export async function stopSandbox(dispatch: SandboxDispatch): Promise<void> {
  try {
    await dispatch.sandbox.stop();
  } catch {
    // Best-effort: durable cancel already reached the store.
  }
}
