import { describe, expect, it, vi } from "vitest";

import type { AgentFacade } from "./facade";
import { AGENT_MCP_TOOLS, dispatchAgentMcp } from "./mcp";

const delta = {
  session: "sess_1",
  turn: { status: "awaiting_input" as const },
  messages: [],
  activity: [],
  actions: [{ id: "act_1" }],
  cursor: "cursor_1",
};

describe("Agent MCP facade", () => {
  it("exposes exactly the four public Agent tools", () => {
    expect(AGENT_MCP_TOOLS.map(({ name }) => name)).toEqual([
      "aomi_chat",
      "aomi_check",
      "aomi_interrupt",
      "aomi_list_sessions",
    ]);
  });

  it("dispatches every tool through the supplied in-process facade", async () => {
    const facade = {
      chat: vi.fn(async () => delta),
      check: vi.fn(async () => delta),
      interrupt: vi.fn(async () => delta),
      sessions: vi.fn(async () => ({ sessions: [], nextCursor: null })),
    } as unknown as AgentFacade;
    const application = vi.fn(async () => ({
      id: "app_AQ",
      internalId: 1n,
      name: "default",
      label: "Default",
      platform: "community",
      activeRelease: null,
      capabilities: ["agent" as const],
      isPublic: true,
    }));
    const dependencies = {
      application,
      idempotencyKey: () => "mcp_123456789012",
    };

    const chat = await dispatchAgentMcp(
      facade,
      "aomi_chat",
      { message: "hello", application: "app_AQ", session: "sess_1" },
      dependencies,
    );
    await dispatchAgentMcp(facade, "aomi_check", { session: "sess_1" });
    await dispatchAgentMcp(
      facade,
      "aomi_interrupt",
      { session: "sess_1" },
      dependencies,
    );
    await dispatchAgentMcp(facade, "aomi_list_sessions", { limit: 10 });

    expect(application).toHaveBeenCalledWith("app_AQ", {
      includePrivate: true,
    });
    expect(facade.chat).toHaveBeenCalledWith({
      request: {
        session: "sess_1",
        application: "app_AQ",
        message: "hello",
        model: "default",
        wallets: {},
      },
      idempotencyKey: "mcp_123456789012",
    });
    expect(facade.check).toHaveBeenCalledOnce();
    expect(facade.interrupt).toHaveBeenCalledOnce();
    expect(facade.sessions).toHaveBeenCalledOnce();
    expect(chat.isError).toBe(false);
    expect(chat.result).toMatchObject({
      cursor: "cursor_1",
      handoff: { guidance: expect.stringContaining("human") },
    });
  });
});
