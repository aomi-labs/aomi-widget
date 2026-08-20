import { afterEach, describe, expect, it, vi } from "vitest";

import { AomiClient, Session } from "../src";
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
    );
    expect(session.getMessages()).toEqual([
      expect.objectContaining({
        id: "msg_1",
        sender: "agent",
        content: "done",
      }),
    ]);
    expect(messages).toHaveBeenCalledTimes(1);
    session.close();
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
});
