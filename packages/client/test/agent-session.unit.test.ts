import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentApiError, AomiClient, Session } from "../src";
import type { AgentAction, AgentDelta } from "../src";

function delta(overrides: Partial<AgentDelta> = {}): AgentDelta {
  return {
    sessionId: "session-agent",
    status: "complete",
    cursor: "stream-v1.cursor-1",
    messages: [],
    activity: [],
    actions: [],
    title: "Agent thread",
    hasMore: false,
    ...overrides,
  };
}

function client() {
  return new AomiClient({
    baseUrl: "https://portal.example",
    fetch: vi.fn(),
  });
}

const evmAction: AgentAction = {
  id: "act_evm",
  type: "external_transaction",
  chainFamily: "evm",
  executionKind: "eoa",
  chainId: 8453,
  signer: "0x1111111111111111111111111111111111111111",
  broadcaster: "wallet",
  generation: 1,
  contextGeneration: 0,
  revision: 3,
  status: "pending",
  createdAt: "2026-08-20T00:00:00Z",
  expiresAt: null,
  description: "Approve batch",
  transactions: [
    {
      id: "leg_1",
      from: "0x1111111111111111111111111111111111111111",
      to: "0x2222222222222222222222222222222222222222",
      value: "0x1",
      data: "0x",
      gas: null,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      gasPrice: null,
      nonce: null,
      transactionType: null,
      accessList: [],
      description: "First",
      simulation: { success: true, gasUsed: null, error: null },
      intentHash: `0x${"1".repeat(64)}`,
    },
    {
      id: "leg_2",
      from: "0x1111111111111111111111111111111111111111",
      to: "0x3333333333333333333333333333333333333333",
      value: "0x2",
      data: "0x",
      gas: null,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      gasPrice: null,
      nonce: null,
      transactionType: null,
      accessList: [],
      description: "Second",
      simulation: { success: true, gasUsed: null, error: null },
      intentHash: `0x${"2".repeat(64)}`,
    },
  ],
};

describe("ClientSession Agent transport", () => {
  afterEach(() => vi.restoreAllMocks());

  it("starts through client.agent and applies stable message deltas", async () => {
    const api = client();
    vi.spyOn(api.agent, "start").mockResolvedValue(
      delta({
        messages: [
          {
            id: "msg_1",
            role: "agent",
            content: "done",
            createdAt: "2026-08-20T00:00:00Z",
            streaming: false,
          },
        ],
      }),
    );
    const session = new Session(api, {
      sessionId: "session-agent",
      app: "default",
    });
    const messages = vi.fn();
    session.on("messages", messages);

    await expect(session.send("hello")).resolves.toMatchObject({
      title: "Agent thread",
    });
    expect(api.agent.start).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-agent",
        message: "hello",
        app: "default",
      }),
      { idempotencyKey: expect.stringMatching(/^idem_[a-f0-9]{32}$/) },
    );
    expect(session.getMessages()).toEqual([
      expect.objectContaining({
        id: "msg_1",
        sender: "agent",
        content: "done",
      }),
    ]);
    expect(messages).toHaveBeenCalledTimes(1);
    expect(session.getAgentStatus()).toBe("complete");
    session.close();
  });

  it("reuses the start operation key after an uncertain response", async () => {
    const api = client();
    const start = vi
      .spyOn(api.agent, "start")
      .mockRejectedValueOnce(
        new AgentApiError(503, "upstream_unavailable", "try again", true),
      )
      .mockResolvedValue(delta());
    const session = new Session(api, { sessionId: "session-agent" });

    await expect(session.send("hello")).rejects.toThrow("try again");
    await expect(session.send("hello")).resolves.toBeDefined();

    expect(start).toHaveBeenCalledTimes(2);
    expect(start.mock.calls[0]?.[1]?.idempotencyKey).toBe(
      start.mock.calls[1]?.[1]?.idempotencyKey,
    );
    session.close();
  });

  it("applies a progressive tool trace before the final without interrupting", async () => {
    vi.useFakeTimers();
    const api = client();
    vi.spyOn(api.agent, "start").mockResolvedValue(
      delta({
        status: "processing",
        cursor: "stream-v1.cursor-3",
        messages: [
          {
            id: "msg_user",
            role: "user",
            content: "Check ETH price",
            createdAt: "2026-08-21T00:00:00Z",
            streaming: false,
          },
          {
            id: "msg_tool",
            role: "agent",
            content: "",
            createdAt: "2026-08-21T00:00:01Z",
            streaming: false,
            toolResult: ["Check ETH price", '{"price":2352}'],
            toolName: "web_search",
            toolArguments: { query: "ETH price" },
          },
        ],
      }),
    );
    vi.spyOn(api.agent, "check").mockResolvedValue(
      delta({
        cursor: "stream-v1.cursor-5",
        messages: [
          {
            id: "msg_final",
            role: "agent",
            content: "ETH is $2,352.",
            createdAt: "2026-08-21T00:00:02Z",
            streaming: false,
          },
        ],
      }),
    );
    const interrupt = vi.spyOn(api.agent, "interrupt");
    const session = new Session(api, {
      sessionId: "session-agent",
      pollIntervalMs: 10,
    });

    await session.sendAsync("Check ETH price");
    expect(session.getIsProcessing()).toBe(true);
    expect(session.getMessages()[1]).toMatchObject({
      id: "msg_tool",
      tool_result: ["Check ETH price", '{"price":2352}'],
      tool_name: "web_search",
      tool_arguments: { query: "ETH price" },
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(api.agent.check).toHaveBeenCalledWith("session-agent", {
      cursor: "stream-v1.cursor-3",
      waitMs: 25_000,
    });
    expect(session.getMessages().at(-1)).toMatchObject({
      id: "msg_final",
      content: "ETH is $2,352.",
    });
    expect(session.getIsProcessing()).toBe(false);
    expect(interrupt).not.toHaveBeenCalled();

    session.close();
    vi.useRealTimers();
  });

  it("reconstructs an awaiting EVM action and preserves partial batch truth", async () => {
    const api = client();
    vi.spyOn(api.agent, "start").mockResolvedValue(
      delta({ status: "awaiting_user", actions: [evmAction] }),
    );
    const resolveAction = vi
      .spyOn(api.agent, "resolveAction")
      .mockResolvedValue({ ...evmAction, status: "submitted", revision: 4 });
    const session = new Session(api, { sessionId: "session-agent" });

    await session.sendAsync("execute");
    expect(session.getPendingRequests()).toEqual([
      expect.objectContaining({
        id: "txreq-act_evm",
        kind: "transaction",
        payload: expect.objectContaining({ txIds: [1, 2], chainId: 8453 }),
      }),
    ]);
    await session.resolve("txreq-act_evm", {
      kind: "transaction",
      txHash: "0xconfirmed",
      completedTxIds: [1],
      failedTxIds: [2],
      failureReason: "reverted",
    });

    expect(resolveAction).toHaveBeenCalledWith("session-agent", "act_evm", {
      status: "submitted",
      revision: 3,
      legs: [
        { id: "leg_1", status: "submitted", transactionId: "0xconfirmed" },
        { id: "leg_2", status: "failed", reason: "reverted" },
      ],
    });
    expect(session.getPendingRequests()).toEqual([]);
    session.close();
  });

  it("recovers a signing action on refresh and submits ordered outputs", async () => {
    const api = client();
    const signing: AgentAction = {
      id: "act_sign",
      type: "signing_request",
      chainFamily: "evm",
      executionKind: "message",
      signer: "0x1111111111111111111111111111111111111111",
      broadcaster: "wallet",
      generation: 1,
      contextGeneration: 0,
      revision: 7,
      status: "pending",
      createdAt: "2026-08-20T00:00:00Z",
      expiresAt: null,
      description: "Sign message",
      payloads: [
        {
          id: "payload_1",
          kind: "evm_personal",
          message: "0x6869",
          digest: `0x${"3".repeat(64)}`,
        },
      ],
      chainId: 1,
      cluster: null,
      operationId: null,
      executor: null,
      callsDigest: null,
      calls: [],
      fees: [],
      sponsorship: null,
    };
    vi.spyOn(api.agent, "check").mockResolvedValue(
      delta({ status: "awaiting_user", actions: [signing] }),
    );
    const resolveAction = vi
      .spyOn(api.agent, "resolveAction")
      .mockResolvedValue({ ...signing, status: "signed", revision: 8 });
    const session = new Session(api, { sessionId: "session-agent" });

    await session.fetchCurrentState();
    expect(session.getPendingRequests()[0]).toMatchObject({
      id: "act_sign",
      kind: "signing",
    });
    await session.resolve("act_sign", {
      kind: "signing",
      signatures: ["0xsigned"],
    });
    expect(resolveAction).toHaveBeenCalledWith("session-agent", "act_sign", {
      status: "signed",
      revision: 7,
      outputs: [{ id: "payload_1", signature: "0xsigned" }],
    });
    session.close();
  });

  it("preserves per-leg SVM batch outcomes", async () => {
    const api = client();
    const svm: AgentAction = {
      id: "act_svm",
      type: "external_transaction",
      chainFamily: "svm",
      executionKind: "wallet",
      cluster: "solana:devnet",
      signer: "Signer1111111111111111111111111111111111111",
      broadcaster: "wallet",
      generation: 1,
      contextGeneration: 0,
      revision: 2,
      status: "pending",
      createdAt: "2026-08-20T00:00:00Z",
      expiresAt: null,
      description: "Approve SVM batch",
      transactions: [
        {
          id: "leg_1",
          unsignedTransactionBase64: "dHgx",
          recentBlockhash: "blockhash-1",
          lastValidBlockHeight: null,
          preserveBlockhash: true,
          description: "First",
          intentHash: `0x${"4".repeat(64)}`,
        },
        {
          id: "leg_2",
          unsignedTransactionBase64: "dHgy",
          recentBlockhash: "blockhash-2",
          lastValidBlockHeight: null,
          preserveBlockhash: true,
          description: "Second",
          intentHash: `0x${"5".repeat(64)}`,
        },
      ],
    };
    vi.spyOn(api.agent, "start").mockResolvedValue(
      delta({ status: "awaiting_user", actions: [svm] }),
    );
    const resolveAction = vi
      .spyOn(api.agent, "resolveAction")
      .mockResolvedValue({ ...svm, status: "submitted", revision: 3 });
    const session = new Session(api, { sessionId: "session-agent" });

    await session.sendAsync("execute svm batch");
    expect(session.getPendingRequests()[0]).toMatchObject({
      id: "act_svm",
      payload: {
        transactions: [
          { id: "leg_1", unsignedTx: "dHgx" },
          { id: "leg_2", unsignedTx: "dHgy" },
        ],
      },
    });
    await session.resolve("act_svm", {
      kind: "solana_sign_and_send",
      signature: "sig-1",
      legs: [
        {
          id: "leg_1",
          status: "submitted",
          signature: "sig-1",
          signedTx: "c2lnbmVkLTE=",
        },
        { id: "leg_2", status: "failed", reason: "expired blockhash" },
      ],
    });

    expect(resolveAction).toHaveBeenCalledWith("session-agent", "act_svm", {
      status: "submitted",
      revision: 2,
      legs: [
        {
          id: "leg_1",
          status: "submitted",
          transactionId: "sig-1",
          signedTransactionBase64: "c2lnbmVkLTE=",
        },
        { id: "leg_2", status: "failed", reason: "expired blockhash" },
      ],
    });
    session.close();
  });
});
