import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callTool: vi.fn(),
  run: vi.fn(),
}));

vi.mock("../../src/cli/context", () => ({
  createControlClient: () => ({
    pipeline: { callTool: mocks.callTool, run: mocks.run },
  }),
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
    mocks.callTool.mockReset().mockResolvedValue({ balance: 1 });
    mocks.run.mockReset().mockResolvedValue({ value: 1, steps: [] });
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("calls only through client.pipeline with explicit safe defaults", async () => {
    await pipelineCallCommand(
      { baseUrl: "https://portal.example", secrets: {} },
      {
        toolId: "svm_get_balance",
        arguments: '{"owner":"wallet"}',
      },
    );

    expect(mocks.callTool).toHaveBeenCalledWith({
      sessionId: "active-session",
      toolId: "svm_get_balance",
      arguments: { owner: "wallet" },
      app: "svm-read-only",
      skills: [],
    });
  });

  it("passes the MCP program grammar through without local interpretation", async () => {
    const program = "balance=$(svm_get_balance owner=wallet)\nreturn $balance";
    await pipelineRunCommand({ secrets: {} }, { program });

    expect(mocks.run).toHaveBeenCalledWith({
      sessionId: "active-session",
      program,
      app: "svm-read-only",
      skills: [],
    });
  });

  it("rejects non-object argument JSON before any request", () => {
    expect(() => parsePipelineArguments("[]")).toThrow(
      "--arguments must be a JSON object",
    );
  });
});
