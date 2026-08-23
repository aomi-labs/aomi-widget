import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createControlClient: vi.fn(),
  callTool: vi.fn(),
  run: vi.fn(),
}));

vi.mock("../../src/cli/context", () => ({
  createControlClient: (...args: unknown[]) => {
    mocks.createControlClient(...args);
    return { pipeline: { callTool: mocks.callTool, run: mocks.run } };
  },
}));

vi.mock("../../src/cli/cli-session", () => ({
  CliSession: { load: () => ({ sessionId: "active-session" }) },
}));

import {
  parsePipelineArguments,
  pipelineCallCommand,
  pipelineRunCommand,
} from "../../src/cli/commands/pipeline";

describe("Pipeline CLI", () => {
  beforeEach(() => {
    mocks.createControlClient.mockReset();
    mocks.callTool.mockReset().mockResolvedValue({ balance: 1 });
    mocks.run.mockReset().mockResolvedValue({ value: 1, steps: [] });
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("calls only through client.pipeline with public execution context", async () => {
    await pipelineCallCommand(
      { baseUrl: "https://portal.example", secrets: {} },
      {
        toolId: "svm_get_balance",
        arguments: '{"owner":"wallet"}',
        app: "portfolio",
        applicationId: "42",
        platform: "community",
        skills: ["balances"],
        idempotencyKey: "call-1",
      },
    );

    expect(mocks.callTool).toHaveBeenCalledWith(
      {
        sessionId: "active-session",
        toolId: "svm_get_balance",
        arguments: { owner: "wallet" },
        app: "portfolio",
        applicationId: 42,
        platform: "community",
        skills: ["balances"],
      },
      { idempotencyKey: "call-1" },
    );
    expect(mocks.createControlClient).toHaveBeenCalledWith(
      expect.objectContaining({ secrets: {} }),
      expect.objectContaining({
        payment: true,
        onPayment: expect.any(Function),
      }),
    );
  });

  it("passes the MCP program grammar through without local interpretation", async () => {
    const program = "balance=$(svm_get_balance owner=wallet)\nreturn $balance";
    await pipelineRunCommand(
      { secrets: {} },
      { program, idempotencyKey: "run-1" },
    );

    expect(mocks.run).toHaveBeenCalledWith(
      {
        sessionId: "active-session",
        program,
        app: "default",
        skills: [],
      },
      { idempotencyKey: "run-1" },
    );
  });

  it("rejects non-object argument JSON before any request", () => {
    expect(() => parsePipelineArguments("[]")).toThrow(
      "--arguments must be a JSON object",
    );
  });

  it("rejects invalid dynamic application ids before execution", async () => {
    await expect(
      pipelineRunCommand(
        { secrets: {} },
        {
          program: "return value",
          applicationId: "not-an-id",
          idempotencyKey: "run-2",
        },
      ),
    ).rejects.toThrow("--application-id must be a positive integer");
    expect(mocks.run).not.toHaveBeenCalled();
  });
});
