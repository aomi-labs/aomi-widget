import { afterEach, describe, expect, it, vi } from "vitest";

import { AomiClient, Session } from "../src/index";
import type { AomiChatResponse, AomiStateResponse } from "../src/index";
import { CLIENT_TYPE_WEB_UI } from "../src/index";

function createMockClient() {
  const client = new AomiClient({ baseUrl: "http://unit.test" });
  vi.spyOn(client, "subscribeSSE").mockImplementation(() => () => {});

  const sendMessage = vi
    .spyOn(client, "sendMessage")
    .mockResolvedValue({ is_processing: false, messages: [] });
  const fetchState = vi
    .spyOn(client, "fetchState")
    .mockResolvedValue({ is_processing: false, messages: [] });
  const sendSystemMessage = vi
    .spyOn(client, "sendSystemMessage")
    .mockResolvedValue(undefined);

  return { client, sendMessage, fetchState, sendSystemMessage };
}

describe("ClientSession ext helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes ext via addExtValue on empty user state", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, { sessionId: "session-unit-1" });

    session.addExtValue("SIMMER_API_KEY", "sk_live_1");
    await session.sendAsync("hello");

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][2]?.userState).toEqual({
      ext: { SIMMER_API_KEY: "sk_live_1" },
    });

    session.close();
  });

  it("preserves wallet fields and merges ext values", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-unit-2",
      userState: {
        address: "0xabc",
        chainId: 1,
        isConnected: true,
        ensName: "wallet.eth",
      },
    });

    session.addExtValue("SIMMER_API_KEY", "sk_live_2");
    session.addExtValue("PARA_API_KEY", "para_live_2");
    await session.sendAsync("ping");

    expect(sendMessage.mock.calls[0][2]?.userState).toEqual({
      address: "0xabc",
      chain_id: 1,
      is_connected: true,
      ens_name: "wallet.eth",
      ext: {
        SIMMER_API_KEY: "sk_live_2",
        PARA_API_KEY: "para_live_2",
      },
    });

    session.close();
  });

  it("removeExtValue removes a key and deletes ext when empty", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-unit-3",
      userState: { address: "0xdef", isConnected: true },
    });

    session.addExtValue("SIMMER_API_KEY", "sk_live_3");
    session.addExtValue("PARA_API_KEY", "para_live_3");
    session.removeExtValue("PARA_API_KEY");
    await session.sendAsync("first");

    expect(sendMessage.mock.calls[0][2]?.userState).toEqual({
      address: "0xdef",
      is_connected: true,
      ext: { SIMMER_API_KEY: "sk_live_3" },
    });

    session.removeExtValue("SIMMER_API_KEY");
    await session.sendAsync("second");

    expect(sendMessage.mock.calls[1][2]?.userState).toEqual({
      address: "0xdef",
      is_connected: true,
    });
    expect(sendMessage.mock.calls[1][2]?.userState?.ext).toBeUndefined();

    session.close();
  });

  it("syncUserState carries ext to fetchState", async () => {
    const { client, fetchState } = createMockClient();
    const session = new Session(client, { sessionId: "session-unit-4" });

    session.addExtValue("SIMMER_API_KEY", "sk_live_4");
    await session.syncUserState();

    expect(fetchState).toHaveBeenCalledWith(
      "session-unit-4",
      {
        ext: { SIMMER_API_KEY: "sk_live_4" },
      },
      expect.any(String),
    );

    session.close();
  });

  it("applies clientType onto userState ext from session options", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-unit-4b",
      clientType: CLIENT_TYPE_WEB_UI,
      userState: { address: "0x123", isConnected: true },
    });

    await session.sendAsync("hello from web");

    expect(sendMessage.mock.calls[0][2]?.userState).toEqual({
      address: "0x123",
      is_connected: true,
      ext: { client_type: CLIENT_TYPE_WEB_UI },
    });

    session.close();
  });

  it("accepts backend user_state superset when ext keys match expected subset", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-unit-5",
      userState: {
        address: "0x999",
        is_connected: true,
        ext: { SIMMER_API_KEY: "sk_live_5" },
      },
    });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        address: "0x999",
        is_connected: true,
        ext: {
          SIMMER_API_KEY: "sk_live_5",
          PARA_API_KEY: "para_live_5",
        },
      },
    } satisfies AomiChatResponse);

    await expect(session.sendAsync("subset check")).resolves.toMatchObject({
      is_processing: false,
    });

    session.close();
  });

  it("warns when backend user_state ext mismatches expected subset", async () => {
    const { client, fetchState } = createMockClient();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const session = new Session(client, {
      sessionId: "session-unit-6",
      userState: {
        address: "0x888",
        is_connected: true,
        ext: { SIMMER_API_KEY: "expected" },
      },
    });

    fetchState.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        address: "0x888",
        is_connected: true,
        ext: { SIMMER_API_KEY: "different" },
      },
    } satisfies AomiStateResponse);

    await expect(session.syncUserState()).resolves.toMatchObject({
      is_processing: false,
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Backend user_state mismatch (non-fatal)"),
    );

    session.close();
  });

  it("accepts backend nulls for optional user_state fields", async () => {
    const { client, sendMessage } = createMockClient();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const session = new Session(client, {
      sessionId: "session-unit-7",
      userState: {
        address: "0x9C7a99480c59955a635123EDa064456393e519f5",
        chain_id: 8453,
        is_connected: true,
        ens_name: undefined,
        ext: undefined,
      },
    });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        address: "0x9C7a99480c59955a635123EDa064456393e519f5",
        chain_id: 8453,
        is_connected: true,
        ens_name: null,
        ext: null,
        pending_txs: {},
        pending_eip712s: {},
      },
    } satisfies AomiChatResponse);

    await expect(session.sendAsync("null normalization check")).resolves.toMatchObject({
      is_processing: false,
    });
    expect(warnSpy).not.toHaveBeenCalled();

    session.close();
  });

  it("hydrates pending wallet requests from backend user_state", async () => {
    const { client, fetchState } = createMockClient();
    const session = new Session(client, { sessionId: "session-unit-7b" });
    const requestsChanged = vi.fn();

    session.on("wallet_requests_changed", requestsChanged);

    fetchState.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        address: "0x9C7a99480c59955a635123EDa064456393e519f5",
        chain_id: 8453,
        is_connected: true,
        pending_txs: {
          1: {
            to: "0x742d35Cc6634C0532925a3b844Bc9e7595f33749",
            value: "0",
            data: "0x",
            chain_id: 8453,
          },
        },
        pending_eip712s: {
          7: {
            description: "Permit2 signature",
            typed_data: {
              domain: { chainId: 8453, name: "Permit2" },
              types: { Permit: [{ name: "owner", type: "address" }] },
              primaryType: "Permit",
              message: { owner: "0x123" },
            },
          },
        },
      },
    } satisfies AomiStateResponse);

    await session.fetchCurrentState();

    expect(session.getPendingRequests()).toEqual([
      expect.objectContaining({
        id: "tx-1",
        kind: "transaction",
        payload: expect.objectContaining({ txId: 1, txIds: [1], chainId: 8453 }),
      }),
      expect.objectContaining({
        id: "eip712-7",
        kind: "eip712_sign",
        payload: expect.objectContaining({
          eip712Id: 7,
          description: "Permit2 signature",
        }),
      }),
    ]);
    expect(requestsChanged).toHaveBeenCalled();

    session.close();
  });

  it("hydrates id-only wallet_tx_request payloads from backend user_state", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, { sessionId: "session-unit-7c" });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        pending_txs: {
          15: {
            to: "0x742d35Cc6634C0532925a3b844Bc9e7595f33749",
            value: "42",
            data: "0x",
            chain_id: 8453,
          },
        },
      },
      system_events: [{
        InlineCall: {
          type: "wallet_tx_request",
          payload: {
            tx_ids: [15],
            aa_preference: "auto",
          },
        },
      }],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_tx_request", resolve);
    });

    await session.sendAsync("queue id-only tx");
    const request = requestPromise as Promise<{
      kind: "transaction";
      payload: { txId?: number; txIds?: number[]; to?: string; value?: string; chainId?: number };
    }>;

    await expect(request).resolves.toMatchObject({
      kind: "transaction",
      payload: {
        txId: 15,
        txIds: [15],
        to: "0x742D35cc6634C0532925a3b844bC9e7595f33749",
        value: "42",
        chainId: 8453,
      },
    });

    session.close();
  });

  it("forwards backend tx identifiers in wallet completion callbacks", async () => {
    const { client, sendMessage, sendSystemMessage } = createMockClient();
    const session = new Session(client, { sessionId: "session-unit-8" });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        pending_txs: {
          7: {
            to: "0x742d35Cc6634C0532925a3b844Bc9e7595f33749",
            value: "0",
            data: "0x",
            chain_id: 8453,
          },
        },
      },
      system_events: [{
        InlineCall: {
          type: "wallet_tx_request",
          payload: {
            tx_ids: [7],
            aa_preference: "auto",
          },
        },
      }],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_tx_request", resolve);
    });

    await session.sendAsync("queue tx");
    const request = await requestPromise;

    await session.resolve((request as { id: string }).id, { txHash: "0xabc" });

    expect(sendSystemMessage).toHaveBeenCalledWith(
      "session-unit-8",
      JSON.stringify({
        type: "wallet:tx_complete",
        payload: {
          txHash: "0xabc",
          status: "success",
          amount: undefined,
          pending_tx_ids: [7],
          aa_requested_mode: "4337",
          aa_resolved_mode: "4337",
          aa_fallback_reason: undefined,
          execution_kind: undefined,
          batched: false,
          call_count: 1,
          sponsored: undefined,
          smart_account_address: undefined,
          delegation_address: undefined,
        },
      }),
    );

    session.close();
  });

  it("forwards backend eip712 identifiers in wallet rejection callbacks", async () => {
    const { client, sendMessage, sendSystemMessage } = createMockClient();
    const session = new Session(client, { sessionId: "session-unit-9" });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [{
        InlineCall: {
          type: "wallet_eip712_request",
          payload: {
            eip712Id: 11,
            description: "Permit2 signature",
            typed_data: {
              domain: { chainId: 8453, name: "Permit2" },
              types: { Permit: [{ name: "owner", type: "address" }] },
              primaryType: "Permit",
              message: { owner: "0x123" },
            },
          },
        },
      }],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_eip712_request", resolve);
    });

    await session.sendAsync("queue signature");
    const request = await requestPromise;

    await session.reject((request as { id: string }).id, "User rejected");

    expect(sendSystemMessage).toHaveBeenCalledWith(
      "session-unit-9",
      JSON.stringify({
        type: "wallet_eip712_response",
        payload: {
          status: "failed",
          error: "User rejected",
          description: "Permit2 signature",
          pending_eip712_id: 11,
        },
      }),
    );

    session.close();
  });
});
