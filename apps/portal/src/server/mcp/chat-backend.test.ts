// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mintAccountBearer: vi.fn(),
  query: vi.fn(),
  failure: vi.fn(),
}));

vi.mock("@aomi-labs/account", () => ({
  mintAccountBearer: mocks.mintAccountBearer,
  getPool: () => ({ query: mocks.query }),
}));
vi.mock("@portal/server/backend-url", () => ({
  configuredBackendUrl: () => "https://api.example.test",
}));
vi.mock("@portal/server/bff/failures", () => ({
  portalFailures: { handle: mocks.failure },
}));
vi.mock("@portal/server/mcp/thread", () => ({
  mcpThreadId: () => "mcp-caller",
}));

import {
  ensureThread,
  fetchState,
  listThreads,
  sendChat,
} from "./chat-backend";

describe("MCP chat backend", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.mintAccountBearer.mockReset().mockResolvedValue({ bearer: "secret" });
    mocks.query.mockReset().mockResolvedValue({ rows: [] });
    mocks.failure.mockReset();
  });

  it("uses both migration-era thread headers on every thread call", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response("{}", { status: 200 }));
    await ensureThread("user-1", "mcp-new");
    await fetchState("user-1", "mcp-new");

    for (const [, init] of fetchMock.mock.calls) {
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer secret");
      expect(headers.get("x-session-id")).toBe("mcp-new");
      expect(headers.get("x-thread-id")).toBe("mcp-new");
    }
    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe(
      "/api/threads",
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
  });

  it("sends only the wallets the caller resolved, never a looked-up default", async () => {
    // A stray account-graph read at send time is the original defect. If one
    // ever returns, this row would leak into user_state.
    mocks.query.mockResolvedValue({
      rows: [{ chain_type: "evm", address: "0xnever-selected" }],
    });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    await sendChat("user-1", "mcp-new", "swap", "default", undefined, {
      evm: "0xabc",
      svm: "SolanaAddress",
    });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/thread/chat");
    expect(url.searchParams.get("message")).toBe("swap");
    expect(url.searchParams.get("app")).toBe("default");
    expect(JSON.parse(url.searchParams.get("user_state")!)).toEqual({
      connection: { is_connected: true },
      evm: { address: "0xabc" },
      svm: { address: "SolanaAddress" },
      ext: { client_type: "mcp" },
    });
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("reports no connection when the turn has no selected wallet", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    await sendChat("user-1", "mcp-new", "swap");

    expect(fetchMock.mock.calls[0][0]).toBeDefined();
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("user_state")).toBeNull();
  });

  it("preserves an explicit Base chain context", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    await sendChat("user-1", "mcp-new", "swap", undefined, {
      family: "evm",
      chain_id: 8453,
    });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(JSON.parse(url.searchParams.get("user_state")!)).toEqual({
      connection: { is_connected: false },
      evm: { chain_id: 8453 },
      ext: { client_type: "mcp" },
    });
  });

  it("preserves an explicit supported Solana cluster context", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    await sendChat(
      "user-1",
      "mcp-new",
      "swap",
      undefined,
      { family: "solana", cluster: "solana:devnet" },
      { svm: "SolanaAddress" },
    );

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(JSON.parse(url.searchParams.get("user_state")!)).toEqual({
      connection: { is_connected: true },
      svm: { address: "SolanaAddress", cluster: "solana:devnet" },
      ext: { client_type: "mcp" },
    });
  });

  it("lists account threads with a bounded caller context", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("[]", { status: 200 }));
    await listThreads("user-1", 12);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(url.pathname).toBe("/api/threads");
    expect(url.searchParams.get("limit")).toBe("12");
    expect(headers.get("x-thread-id")).toBe("mcp-caller");
  });

  it("reports upstream 5xx without exposing its body to telemetry", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("private failure", { status: 503 }),
    );
    await fetchState("user-1", "mcp-new");
    expect(mocks.failure).toHaveBeenCalledWith(
      expect.objectContaining({
        upstream: "rust",
        status: 503,
        context: expect.objectContaining({ operation: "mcp_chat_state" }),
      }),
    );
    expect(JSON.stringify(mocks.failure.mock.calls)).not.toContain(
      "private failure",
    );
  });
});
