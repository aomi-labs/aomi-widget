import { describe, expect, it, vi } from "vitest";

import { Aomi, AgentRun } from "../src";
import type { AgentAction, AgentDelta } from "../src";

const evmAction: AgentAction = {
  id: "action-1",
  type: "external_transaction",
  chainFamily: "evm",
  executionKind: "eoa",
  chainId: 8453,
  signer: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  broadcaster: "wallet",
  generation: 1,
  contextGeneration: 0,
  revision: 1,
  status: "finalized",
  createdAt: "2026-08-25T00:00:00Z",
  expiresAt: null,
  description: "Supply USDC",
  transactions: [
    {
      id: "leg-1",
      from: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      to: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      value: "0",
      data: "0x1234",
      gas: "21000",
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      gasPrice: null,
      nonce: null,
      transactionType: null,
      accessList: [],
      description: "Supply",
      simulation: { success: true, gasUsed: "21000", error: null },
      intentHash: `0x${"1".repeat(64)}`,
    },
  ],
};

function delta(overrides: Partial<AgentDelta> = {}): AgentDelta {
  return {
    sessionId: "agent-1",
    status: "complete",
    cursor: "stream-v1.cursor-1",
    messages: [
      {
        id: "message-1",
        role: "agent",
        content: "Done",
        createdAt: "2026-08-25T00:00:01Z",
        streaming: false,
      },
    ],
    activity: [],
    actions: [evmAction],
    title: "Aave supply",
    hasMore: false,
    ...overrides,
  };
}

describe("high-level Aomi Agent", () => {
  it("is awaitable while exposing compatible action, simulation, and completion events", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(delta()));
    const aomi = new Aomi({
      baseUrl: "https://api.example",
      fetch,
      guest: false,
      wallet: {
        evm: {
          address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          chainId: 8453,
          sendCalls: vi.fn(),
        },
      },
    });

    const run = aomi.agent.run("Supply 100 USDC to Aave", {
      sessionId: "agent-1",
    });
    const actions = vi.fn();
    const simulations = vi.fn();
    const completed = vi.fn();
    run.on("action", actions);
    run.on("simulation", simulations);
    run.on("completed", completed);

    const result = await run;

    expect(run).toBeInstanceOf(AgentRun);
    expect(result).toMatchObject({
      sessionId: "agent-1",
      title: "Aave supply",
      actions: [
        {
          id: "action-1",
          chainFamily: "evm",
          kind: "calls",
          status: "finalized",
        },
      ],
    });
    expect(actions).toHaveBeenCalledTimes(1);
    expect(simulations).toHaveBeenCalledWith(
      expect.objectContaining({ status: "passed", warnings: [] }),
    );
    expect(completed).toHaveBeenCalledWith(result);
    expect(JSON.parse(fetch.mock.calls[0][1].body as string)).toMatchObject({
      sessionId: "agent-1",
      message: "Supply 100 USDC to Aave",
      wallets: {
        evm: {
          address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          chainId: 8453,
        },
      },
    });
  });

  it("reuses the wallet controller to resolve Agent requests automatically", async () => {
    const pendingAction: AgentAction = {
      ...evmAction,
      id: "wallet-action",
      revision: 3,
      status: "pending",
    };
    const sendCalls = vi.fn().mockResolvedValue({ hashes: ["0xagenttx"] });
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/v1/agent/chat") && init?.method === "POST") {
        return Response.json(
          delta({
            sessionId: "agent-wallet",
            status: "awaiting_user",
            cursor: "stream-v1.cursor-1",
            messages: [],
            actions: [pendingAction],
          }),
        );
      }
      if (url.includes("/actions/wallet-action/result")) {
        return Response.json({
          action: { ...pendingAction, revision: 4, status: "submitted" },
        });
      }
      if (url.includes("/v1/agent/chat/agent-wallet")) {
        return Response.json(
          delta({
            sessionId: "agent-wallet",
            cursor: "stream-v1.cursor-2",
            actions: [{ ...pendingAction, revision: 4, status: "submitted" }],
          }),
        );
      }
      throw new Error(`Unexpected request ${url}`);
    });
    const aomi = new Aomi({
      baseUrl: "https://api.example",
      fetch: fetch as typeof globalThis.fetch,
      guest: false,
      wallet: {
        evm: {
          address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          chainId: 8453,
          sendCalls,
        },
      },
    });
    const run = aomi.agent.run("Execute", {
      sessionId: "agent-wallet",
      pollIntervalMs: 1,
    });
    const walletRequests = vi.fn();
    run.on("wallet_request", walletRequests);

    const result = await run.result();

    expect(result.sessionId).toBe("agent-wallet");
    expect(walletRequests).toHaveBeenCalledWith(
      expect.objectContaining({ id: "txreq-wallet-action" }),
    );
    expect(sendCalls).toHaveBeenCalledTimes(1);
    const resolution = fetch.mock.calls.find(([url]) =>
      url.includes("/actions/wallet-action/result"),
    );
    expect(JSON.parse(resolution?.[1]?.body as string)).toMatchObject({
      status: "submitted",
      revision: 3,
      legs: [
        {
          id: "leg-1",
          status: "submitted",
          transactionId: "0xagenttx",
        },
      ],
    });
  });
});
