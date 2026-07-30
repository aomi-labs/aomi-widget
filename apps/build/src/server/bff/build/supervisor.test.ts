// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  api: {},
  capture: vi.fn(),
  listRunningRuns: vi.fn(),
  readRunView: vi.fn(),
  stopSandboxById: vi.fn(),
  storeQuery: vi.fn(),
  updateRun: vi.fn(),
}));

vi.mock("@aomi-labs/smither", () => ({
  createAomiSmither: vi.fn(async () => mocks.api),
  readRunView: mocks.readRunView,
  resolveRunBackend: vi.fn(() => ({})),
  storeQuery: mocks.storeQuery,
}));

vi.mock("./registry", () => ({
  listRunningRuns: mocks.listRunningRuns,
  updateRun: mocks.updateRun,
}));

vi.mock("./sandbox-runner", () => ({
  extendSandboxById: vi.fn(),
  stopSandboxById: mocks.stopSandboxById,
}));

vi.mock("@build/server/bff/failures", () => ({
  buildFailures: {
    handle: (input: { error: unknown; context: Record<string, unknown> }) =>
      mocks.capture(input.error, { ...input.context, status: 500 }),
  },
}));

import { superviseOnce } from "./supervisor";

const record = {
  runId: "smither-app-00000000-0000-0000-0000-000000000001",
  ownerLogin: "owner",
  app: "app",
  runner: "vercel-sandbox" as const,
  status: "running" as const,
  sandboxId: "sandbox",
  sidecarUrl: "",
  planJson: "{}",
  createdAtMs: 1,
  updatedAtMs: 1,
};

describe("superviseOnce artifact observation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listRunningRuns.mockResolvedValue([record]);
    mocks.storeQuery.mockResolvedValue([
      { status: "finished", heartbeat_at_ms: Date.now() },
    ]);
    mocks.readRunView.mockResolvedValue({
      status: "finished",
      nodes: [],
      outputs: { result: [{ artifactFailure: "crate_tar" }] },
    });
  });

  it("captures a bounded artifact failure from a completed sandbox run", async () => {
    await expect(superviseOnce()).resolves.toEqual([
      { runId: record.runId, app: "app", decision: "release-completed" },
    ]);

    expect(mocks.updateRun).toHaveBeenCalledWith(mocks.api, record.runId, {
      status: "completed",
    });
    expect(mocks.capture).toHaveBeenCalledOnce();
    expect(mocks.capture).toHaveBeenCalledWith(expect.any(Error), {
      routeFamily: "/api/bff/build/supervise",
      operation: "build.artifact_crate_tar",
      status: 500,
    });
    expect(String(mocks.capture.mock.calls[0]?.[0])).toBe(
      "Error: Sandbox artifact failure: crate_tar",
    );
  });

  it("does not reinterpret unbounded durable output as telemetry", async () => {
    mocks.readRunView.mockResolvedValue({
      status: "finished",
      nodes: [],
      outputs: {
        result: [{ artifactFailure: "private path and generated output" }],
      },
    });

    await superviseOnce();

    expect(mocks.capture).not.toHaveBeenCalled();
  });

  it("does not duplicate the in-process observer for local runs", async () => {
    mocks.listRunningRuns.mockResolvedValue([{ ...record, runner: "local" }]);

    await superviseOnce();

    expect(mocks.readRunView).not.toHaveBeenCalled();
    expect(mocks.capture).not.toHaveBeenCalled();
  });
});
