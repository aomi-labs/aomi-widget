// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  api: {},
  capture: vi.fn(),
  createAomiSmither: vi.fn(),
  findRunById: vi.fn(),
  readRunView: vi.fn(),
}));

vi.mock("@aomi-labs/smither", () => ({
  crateFileTree: vi.fn(() => []),
  createAomiSmither: mocks.createAomiSmither,
  decideApproval: vi.fn(),
  defaultSdkRoot: vi.fn(() => "/tmp"),
  executeRunUntilSettled: vi.fn(),
  finalizePlan: vi.fn(() => ({ plan: undefined })),
  prepareRun: vi.fn(),
  readRunView: mocks.readRunView,
  requestRunCancel: vi.fn(),
  resolveRunBackend: vi.fn(() => ({})),
  sanitizeAppName: vi.fn((value: string) => value),
  stageKeyForNode: vi.fn((value: string) => value),
  stagesFor: vi.fn(() => []),
}));

vi.mock("./registry", () => ({
  findRunById: mocks.findRunById,
  findRunByOwnerApp: vi.fn(),
  registerRun: vi.fn(),
  updateRun: vi.fn(),
}));

vi.mock("./supervisor", () => ({ ensureSupervisorInterval: vi.fn() }));
vi.mock("./sidecar-auth", () => ({
  mintSidecarBearer: vi.fn(),
  sidecarVerifierPublicKeyPem: vi.fn(),
}));
vi.mock("./sandbox-runner", () => ({
  dispatchSandboxRun: vi.fn(),
  maybeExtendSandbox: vi.fn(),
  sandboxRunnerConfig: vi.fn(() => ({ enabled: false })),
  stopSandbox: vi.fn(),
  stopSandboxById: vi.fn(),
}));
vi.mock("@build/server/bff/failures", () => ({
  buildFailures: {
    handle: (input: {
      error: unknown;
      upstream?: string;
      context: Record<string, unknown>;
    }) =>
      mocks.capture(input.error, {
        ...input.context,
        status: 500,
        ...(input.upstream ? { upstream: input.upstream } : {}),
      }),
  },
}));

import { reconstructBuildRun } from "./engine";

const runId = "smither-test-app-00000000-0000-0000-0000-000000000001";

describe("reconstructBuildRun operational failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAomiSmither.mockResolvedValue(mocks.api);
  });

  it("observes a registry failure and preserves the unknown-run fallback", async () => {
    const error = new Error("private registry failure");
    mocks.findRunById.mockRejectedValue(error);

    await expect(reconstructBuildRun(runId)).resolves.toBeUndefined();
    expect(mocks.capture).toHaveBeenCalledWith(error, {
      routeFamily: "/api/bff/build",
      operation: "build.reconstruct_run",
      status: 500,
    });
  });

  it("observes an observer-store failure and preserves the unknown-run fallback", async () => {
    const error = new Error("private run store failure");
    mocks.findRunById.mockResolvedValue({
      runId,
      ownerLogin: "owner",
      app: "test-app",
      runner: "vercel-sandbox",
      status: "running",
      sandboxId: "sandbox",
      sidecarUrl: "",
      planJson: "{}",
      createdAtMs: 1,
      updatedAtMs: 1,
    });
    mocks.readRunView.mockRejectedValue(error);

    await expect(reconstructBuildRun(runId)).resolves.toBeUndefined();
    expect(mocks.capture).toHaveBeenCalledWith(error, {
      routeFamily: "/api/bff/build",
      operation: "build.reconstruct_run",
      status: 500,
    });
  });

  it("returns undefined only when the durable store confirms absence", async () => {
    mocks.findRunById.mockResolvedValue(undefined);
    mocks.readRunView.mockResolvedValue({
      status: null,
      nodes: [],
      outputs: {},
    });

    await expect(reconstructBuildRun(runId)).resolves.toBeUndefined();
    expect(mocks.capture).not.toHaveBeenCalled();
  });
});
