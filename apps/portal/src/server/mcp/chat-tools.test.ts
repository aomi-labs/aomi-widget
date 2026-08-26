// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@portal/server/mcp/chat-backend", () => ({
  ensureThread: vi.fn(),
  sendChat: vi.fn(),
  fetchState: vi.fn(),
  interrupt: vi.fn(),
  listThreads: vi.fn(),
}));
vi.mock("@portal/server/mcp/thread", () => ({
  newMcpThreadId: () => "mcp-generated",
}));
vi.mock("@portal/server/mcp/wallet-selection", () => ({
  resolveSessionWallets: vi.fn(),
}));

import {
  ensureThread,
  fetchState,
  interrupt,
  listThreads,
  sendChat,
} from "@portal/server/mcp/chat-backend";
import { resolveSessionWallets } from "@portal/server/mcp/wallet-selection";
import { CHAT_MCP_TOOLS, dispatchChatTool } from "./chat-tools";

const USER = "user-1";
const ok = (body: unknown) => ({ ok: true, status: 200, body });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ensureThread).mockResolvedValue(ok({}));
  vi.mocked(sendChat).mockResolvedValue(
    ok({ messages: [], system_events: [], is_processing: true }),
  );
  vi.mocked(fetchState).mockResolvedValue(
    ok({ messages: [], system_events: [], is_processing: false }),
  );
  vi.mocked(interrupt).mockResolvedValue(
    ok({ messages: [], system_events: [], is_processing: false }),
  );
  vi.mocked(listThreads).mockResolvedValue(ok([]));
  vi.mocked(resolveSessionWallets).mockResolvedValue({
    ok: true,
    wallets: { evm: "0xselected" },
  });
});

describe("MCP chat tools", () => {
  it("exposes exactly the four agent-path tools", () => {
    expect(CHAT_MCP_TOOLS.map((tool) => tool.name)).toEqual([
      "aomi_chat",
      "aomi_check",
      "aomi_interrupt",
      "aomi_list_sessions",
    ]);
    expect(new Set(CHAT_MCP_TOOLS.map((tool) => tool.name)).size).toBe(4);
  });

  it("creates and account-binds a new session before firing chat", async () => {
    vi.mocked(sendChat).mockResolvedValue(
      ok({
        messages: [
          { sender: "user", content: "hello" },
          { sender: "agent", content: "hi" },
        ],
        system_events: [],
        is_processing: false,
        title: "Greeting",
      }),
    );
    const outcome = await dispatchChatTool(USER, "aomi_chat", {
      message: "hello",
      app: "default",
    });
    expect(ensureThread).toHaveBeenCalledWith(USER, "mcp-generated");
    expect(sendChat).toHaveBeenCalledWith(
      USER,
      "mcp-generated",
      "hello",
      "default",
      undefined,
      { evm: "0xselected" },
    );
    expect(outcome.result).toMatchObject({
      session_id: "mcp-generated",
      status: "complete",
      reply: "hi",
      new_messages: [{ sender: "agent", content: "hi" }],
      cursor: {
        session_id: "mcp-generated",
        messages: 2,
        system_events: 0,
      },
    });
  });

  it("polls from the self-contained cursor without repeating session_id", async () => {
    await dispatchChatTool(USER, "aomi_check", {
      cursor: {
        session_id: "existing",
        messages: 1,
        system_events: 2,
      },
    });
    expect(fetchState).toHaveBeenCalledWith(USER, "existing");
  });

  it("continues a supplied session without recreating it", async () => {
    await dispatchChatTool(USER, "aomi_chat", {
      message: "continue",
      session_id: "existing",
    });
    expect(ensureThread).not.toHaveBeenCalled();
    expect(sendChat).toHaveBeenCalledWith(
      USER,
      "existing",
      "continue",
      undefined,
      undefined,
      { evm: "0xselected" },
    );
  });

  it("passes explicit Base and supported Solana contexts without defaults", async () => {
    await dispatchChatTool(USER, "aomi_chat", {
      message: "use Base",
      chain_context: { family: "evm", chain_id: 8453 },
    });
    expect(sendChat).toHaveBeenLastCalledWith(
      USER,
      "mcp-generated",
      "use Base",
      undefined,
      { family: "evm", chain_id: 8453 },
      { evm: "0xselected" },
    );

    await dispatchChatTool(USER, "aomi_chat", {
      message: "use Solana devnet",
      chain_context: { family: "solana", cluster: "solana:devnet" },
    });
    expect(sendChat).toHaveBeenLastCalledWith(
      USER,
      "mcp-generated",
      "use Solana devnet",
      undefined,
      { family: "solana", cluster: "solana:devnet" },
      { evm: "0xselected" },
    );
  });

  it("refuses the turn when the account's wallet is ambiguous", async () => {
    vi.mocked(resolveSessionWallets).mockResolvedValue({
      ok: false,
      failure: {
        error: "wallet_selection_required",
        selection_required: [
          {
            family: "evm",
            wallets: [
              { address: "0xone", is_primary: true },
              { address: "0xtwo", is_primary: false },
            ],
          },
        ],
        guidance: "ask the user",
      },
    });

    const outcome = await dispatchChatTool(USER, "aomi_chat", {
      message: "swap 15 USDC",
    });

    // The turn must not reach the agent: a chat that cannot name its wallet
    // would get a confident answer about an arbitrary one.
    expect(sendChat).not.toHaveBeenCalled();
    expect(outcome.isError).toBe(true);
    expect(outcome.result).toMatchObject({
      error: "wallet_selection_required",
      session_id: "mcp-generated",
    });
  });

  it("forwards a caller-chosen wallet to selection", async () => {
    await dispatchChatTool(USER, "aomi_chat", {
      message: "swap",
      wallet: { evm_address: "0xChosen" },
      chain_context: { family: "evm", chain_id: 1 },
    });

    expect(resolveSessionWallets).toHaveBeenCalledWith({
      canonicalUserId: USER,
      sessionId: "mcp-generated",
      requested: { evm: "0xChosen" },
      familyInPlay: "evm",
    });
  });

  it("rejects a malformed wallet argument", async () => {
    const outcome = await dispatchChatTool(USER, "aomi_chat", {
      message: "swap",
      wallet: { evm_address: "0xok", nonsense: true },
    });
    expect(outcome).toEqual({
      result: { error: "wallet contains unsupported fields" },
      isError: true,
    });
    expect(sendChat).not.toHaveBeenCalled();
  });

  it("rejects unsupported Solana cluster context", async () => {
    const outcome = await dispatchChatTool(USER, "aomi_chat", {
      message: "use Solana",
      chain_context: { family: "solana", cluster: "mainnet-beta" },
    });
    expect(outcome).toEqual({
      result: {
        error:
          "chain_context.cluster must be solana:mainnet, solana:devnet, or solana:testnet",
      },
      isError: true,
    });
    expect(ensureThread).not.toHaveBeenCalled();
    expect(sendChat).not.toHaveBeenCalled();
  });

  it("returns message deltas while treating drained events as new receipts", async () => {
    vi.mocked(fetchState).mockResolvedValue(
      ok({
        messages: [
          { sender: "user", content: "do work" },
          { sender: "agent", content: "done" },
        ],
        system_events: [
          {
            InlineCall: {
              type: "tool_complete",
              payload: { tool_name: "quote", result: { amount: "1" } },
            },
          },
        ],
        is_processing: false,
      }),
    );
    const outcome = await dispatchChatTool(USER, "aomi_check", {
      session_id: "existing",
      cursor: { messages: 1, system_events: 7 },
    });
    expect(outcome.result).toMatchObject({
      status: "complete",
      new_messages: [{ sender: "agent", content: "done" }],
      activity: [
        {
          type: "tool_complete",
          tool: "quote",
          result_preview: '{"amount":"1"}',
        },
      ],
      cursor: { messages: 2, system_events: 8 },
    });
  });

  it("holds the mutable streaming tail so the completed reply remains a delta", async () => {
    vi.mocked(fetchState)
      .mockResolvedValueOnce(
        ok({
          messages: [
            { sender: "user", content: "do work" },
            { sender: "agent", content: "partial" },
          ],
          system_events: [],
          is_processing: true,
        }),
      )
      .mockResolvedValueOnce(
        ok({
          messages: [
            { sender: "user", content: "do work" },
            { sender: "agent", content: "finished" },
          ],
          system_events: [],
          is_processing: false,
        }),
      );

    const streaming = await dispatchChatTool(USER, "aomi_check", {
      session_id: "existing",
      cursor: { messages: 1, system_events: 0 },
    });
    expect(streaming.result).toMatchObject({
      status: "processing",
      new_messages: [],
      cursor: { messages: 1, system_events: 0 },
    });

    const complete = await dispatchChatTool(USER, "aomi_check", {
      session_id: "existing",
      cursor: (streaming.result as { cursor: unknown }).cursor,
    });
    expect(complete.result).toMatchObject({
      status: "complete",
      new_messages: [{ sender: "agent", content: "finished" }],
      cursor: { messages: 2, system_events: 0 },
    });
  });

  it("compresses task narration and maps processing state", async () => {
    vi.mocked(fetchState).mockResolvedValue(
      ok({
        messages: [],
        system_events: [
          { type: "task_started", agent_id: "agent-1", label: "Research" },
          {
            type: "task_activity",
            agent_id: "agent-1",
            kind: "tool_call",
            tool_name: "search",
            child_seq: 1,
          },
          {
            type: "task_completed",
            agent_id: "agent-1",
            status: "completed",
            steps: 1,
          },
        ],
        is_processing: true,
      }),
    );
    const outcome = await dispatchChatTool(USER, "aomi_check", {
      session_id: "existing",
    });
    expect(outcome.result).toMatchObject({
      status: "processing",
      activity: [
        { type: "task_started", agent_id: "agent-1", label: "Research" },
        {
          type: "task_activity",
          agent_id: "agent-1",
          tool: "search",
          child_seq: 1,
        },
        {
          type: "task_completed",
          agent_id: "agent-1",
          status: "completed",
          steps: 1,
        },
      ],
    });
  });

  it("surfaces compact wallet requests and an actionable portal handoff", async () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://portal.example");
    vi.mocked(fetchState).mockResolvedValue(
      ok({
        messages: [],
        system_events: [],
        is_processing: true,
        user_state: {
          pending: {
            evmTxs: {
              "4": {
                to: "0xabc",
                value: "100",
                chainId: 8453,
                data: "sensitive-calldata",
                label: "Approve transfer",
              },
            },
            evmSigs: {
              "5": {
                chainId: 1,
                description: "Permit",
                typedData: {
                  primaryType: "Permit",
                  domain: { name: "USDC", verifyingContract: "0xdef" },
                  message: { private: "omitted" },
                },
              },
            },
          },
        },
      }),
    );
    const outcome = await dispatchChatTool(USER, "aomi_check", {
      session_id: "existing",
    });
    expect(outcome.result).toMatchObject({
      status: "awaiting_user",
      pending_requests: [
        {
          id: "tx-4",
          kind: "transaction",
          to: "0xabc",
          value: "100",
          chain_id: 8453,
          description: "Approve transfer",
        },
        {
          id: "tx-5",
          kind: "eip712_sign",
          primary_type: "Permit",
          domain: "USDC",
          verifying_contract: "0xdef",
        },
      ],
      handoff: {
        portal_url: "https://portal.example/?thread=existing",
        cli: "aomi tx sign <request-id>",
      },
    });
    expect(JSON.stringify(outcome.result)).not.toContain("sensitive-calldata");
    expect(JSON.stringify(outcome.result)).not.toContain('"private"');
  });

  it("interrupts and lists resumable sessions", async () => {
    vi.mocked(listThreads).mockResolvedValue(
      ok([{ thread_id: "thread-1", title: "Swap", last_active_at: 123 }]),
    );
    const interrupted = await dispatchChatTool(USER, "aomi_interrupt", {
      session_id: "thread-1",
    });
    expect(interrupt).toHaveBeenCalledWith(USER, "thread-1");
    expect(interrupted.result).toMatchObject({ interrupted: true });

    const listed = await dispatchChatTool(USER, "aomi_list_sessions", {
      limit: 5,
    });
    expect(listThreads).toHaveBeenCalledWith(USER, 5);
    expect(listed.result).toEqual({
      sessions: [{ id: "thread-1", title: "Swap", updated_at: 123 }],
    });
  });

  it("returns validation and backend failures as MCP tool errors", async () => {
    expect((await dispatchChatTool(USER, "aomi_chat", {})).isError).toBe(true);
    vi.mocked(fetchState).mockResolvedValue({
      ok: false,
      status: 503,
      body: { error: "down" },
    });
    await expect(
      dispatchChatTool(USER, "aomi_check", { session_id: "thread-1" }),
    ).resolves.toEqual({
      result: {
        error: "backend request failed",
        status: 503,
        detail: { error: "down" },
      },
      isError: true,
    });
  });
});
