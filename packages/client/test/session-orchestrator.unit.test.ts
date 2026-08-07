import { afterEach, describe, expect, it, vi } from "vitest";

import { AomiClient, Session, type AomiChatResponse } from "../src/index";
import type { WalletRequest } from "../src/session";

const motherPayload = {
  pending_eip712_id: 9,
  description: "Approve orchestrated action",
  typed_data: {
    domain: { name: "Aomi", version: "1", chainId: 1 },
    types: { Approval: [{ name: "approved", type: "bool" }] },
    primaryType: "Approval",
    message: { approved: true },
  },
};

describe("orchestrator mother wallet transport", () => {
  afterEach(() => vi.restoreAllMocks());

  it("queues normally and posts the resolved callback to the session thread", async () => {
    const client = new AomiClient({ baseUrl: "http://unit.test" });
    vi.spyOn(client, "sendMessage").mockResolvedValueOnce({
      messages: [],
      is_processing: false,
      system_events: [
        {
          InlineCall: {
            type: "wallet_eip712_request",
            payload: motherPayload,
          },
        },
      ],
    } satisfies AomiChatResponse);
    const sendSystemMessage = vi
      .spyOn(client, "sendSystemMessage")
      .mockResolvedValue(undefined);
    const session = new Session(client, {
      sessionId: "mother-unit-1",
      app: "orchestrator",
    });
    const requestPromise = new Promise<WalletRequest>((resolve) => {
      session.once("wallet_eip712_request", resolve);
    });

    await session.sendAsync("delegate, review, then commit");
    const request = await requestPromise;
    expect(request).toMatchObject({
      id: "eip712-9",
      kind: "eip712_sign",
    });
    expect(request).not.toHaveProperty("targetThreadId");
    expect(request).not.toHaveProperty("agentId");

    await session.resolve(request.id, {
      kind: "eip712_sign",
      signature: "0xsigned",
    });
    expect(sendSystemMessage).toHaveBeenCalledWith(
      "mother-unit-1",
      JSON.stringify({
        type: "wallet_eip712_response",
        payload: {
          status: "success",
          signature: "0xsigned",
          description: "Approve orchestrated action",
          pending_eip712_id: 9,
        },
      }),
      { app: "orchestrator", applicationId: undefined },
    );
    session.close();
  });
});
