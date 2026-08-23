// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the backend transport so we can assert which endpoint each MCP tool
// routes to without standing up the kernel. thread id is made deterministic.
vi.mock("@portal/server/mcp/backend", () => ({
  resourceGet: vi.fn(),
  toolCall: vi.fn(),
  execRun: vi.fn(),
}));
vi.mock("@portal/server/mcp/thread", () => ({
  mcpThreadId: () => "thread-deterministic",
}));

import { execRun, resourceGet, toolCall } from "@portal/server/mcp/backend";
import { MCP_TOOLS, dispatchTool } from "./tools";

const resourceGetMock = vi.mocked(resourceGet);
const toolCallMock = vi.mocked(toolCall);
const execRunMock = vi.mocked(execRun);

const ok = (body: unknown) => ({ ok: true, status: 200, body });

const USER = "user-123";

beforeEach(() => {
  resourceGetMock.mockReset();
  toolCallMock.mockReset();
  execRunMock.mockReset();
  resourceGetMock.mockResolvedValue(ok({ results: [] }));
  toolCallMock.mockResolvedValue(ok({ done: true }));
  execRunMock.mockResolvedValue(ok({ value: {}, steps: [] }));
});

describe("MCP tool inventory", () => {
  it("exposes every resident tool with a well-formed object schema", () => {
    for (const tool of MCP_TOOLS) {
      expect(tool.name).toMatch(/^aomi_/);
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.inputSchema.type).toBe("object");
    }
    // Names are unique.
    const names = MCP_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("freezes the exact rollback inventory and order", () => {
    const names = MCP_TOOLS.map((t) => t.name);
    expect(names).toEqual([
      "aomi_get_agent_context",
      "aomi_list_apps",
      "aomi_search_apps",
      "aomi_search_tools",
      "aomi_select_app",
      "aomi_list_namespaces",
      "aomi_list_tools",
      "aomi_describe_tool",
      "aomi_run",
      "aomi_call_tool",
    ]);
  });

  it("aomi_run's description carries the grammar and the steering rule", () => {
    const run = MCP_TOOLS.find((t) => t.name === "aomi_run");
    expect(run).toBeDefined();
    // The description is the model-facing language spec: it must teach the
    // subset, exclude real-bash constructs, and steer single actions away.
    expect(run!.description).toContain("for x in $ref");
    expect(run!.description).toContain("NOT supported: while");
    expect(run!.description).toContain("aomi_call_tool for a single action");
  });
});

describe("dispatchTool routing", () => {
  it("aomi_search_apps -> GET /api/resource/search/apps with q + limit", async () => {
    await dispatchTool(USER, "aomi_search_apps", { q: "swap", limit: 5 });
    expect(resourceGetMock).toHaveBeenCalledWith(
      USER,
      "/api/resource/search/apps",
      {
        q: "swap",
        limit: 5,
      },
    );
  });

  it("aomi_search_tools -> GET /api/resource/search/tools with q + app + limit", async () => {
    await dispatchTool(USER, "aomi_search_tools", {
      q: "stage",
      app: "default",
      limit: 7,
    });
    expect(resourceGetMock).toHaveBeenCalledWith(
      USER,
      "/api/resource/search/tools",
      {
        q: "stage",
        app: "default",
        limit: 7,
      },
    );
  });

  it("aomi_list_tools -> GET /api/resource/tools", async () => {
    await dispatchTool(USER, "aomi_list_tools", { app: "default" });
    expect(resourceGetMock).toHaveBeenCalledWith(
      USER,
      "/api/resource/tools",
      expect.objectContaining({ app: "default" }),
    );
  });

  it("aomi_call_tool -> execution syscall with the deterministic thread id", async () => {
    await dispatchTool(USER, "aomi_call_tool", {
      tool_id: "evm_stage_tx",
      arguments: { chain: "1" },
      app: "default",
    });
    expect(toolCallMock).toHaveBeenCalledWith(USER, "thread-deterministic", {
      tool_id: "evm_stage_tx",
      arguments: { chain: "1" },
      app: "default",
    });
  });

  it("aomi_run -> POST /api/exec/run with program + app + deterministic thread", async () => {
    const program = "q=$(quote a=1)\nswap min_out=$q.out";
    await dispatchTool(USER, "aomi_run", { program, app: "default" });
    expect(execRunMock).toHaveBeenCalledWith(USER, "thread-deterministic", {
      program,
      app: "default",
    });
  });

  it("aomi_run honors an explicit thread_id", async () => {
    await dispatchTool(USER, "aomi_run", {
      program: "quote a=1",
      thread_id: "thread-custom",
    });
    expect(execRunMock).toHaveBeenCalledWith(
      USER,
      "thread-custom",
      expect.objectContaining({ program: "quote a=1" }),
    );
  });

  it("aomi_run requires program", async () => {
    const out = await dispatchTool(USER, "aomi_run", {});
    expect(out.isError).toBe(true);
    expect(execRunMock).not.toHaveBeenCalled();
  });

  it("aomi_call_tool requires tool_id", async () => {
    const out = await dispatchTool(USER, "aomi_call_tool", {});
    expect(out.isError).toBe(true);
    expect(toolCallMock).not.toHaveBeenCalled();
  });

  it("unknown tool is a tool error, not a throw", async () => {
    const out = await dispatchTool(USER, "aomi_nope", {});
    expect(out.isError).toBe(true);
  });

  it("propagates a backend failure as isError", async () => {
    resourceGetMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      body: "upstream",
    });
    const out = await dispatchTool(USER, "aomi_search_apps", { q: "swap" });
    expect(out.isError).toBe(true);
    expect(out.result).toEqual({
      error: "backend request failed",
      status: 502,
      detail: "upstream",
    });
  });
});
