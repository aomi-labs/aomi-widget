import { afterEach, describe, expect, it, vi } from "vitest";

import { AomiClient, Session } from "../src/index";
import type { AomiChatResponse, AomiStateResponse } from "../src/index";
import { CLIENT_TYPE_WEB_UI, UserState } from "../src/index";

function createSerializedSolanaTransactionBase64(): string {
  return "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQACBze9yJWsbqTbnUiruXeZbHqIy/BaQd1UCCVe1GfudGivVNbgjaz4czD0q91ZPUZxlTq9s13835CVa+PSjizkq2teI0IZn3VSjcqRRQskF9qFq2Zlfqj34I+nqiTQs0EuSpL6J7MXfuoBbVCR6gPpz3qT8eX0mPdmeEXgt601lv7ksoYaZa0ZuOykPPWQK9mdR+XAjqOctjCYRJlGapf0M3oDBkZv5SEXMv/srbpyw5vnvIzlu8X3EmssQ5s6QAAAAAY00hfx5PhTIw4frM/vninJ79+8fqRa5+HbpLoNaiTIV0cb8EE8yckcu5VkPvGUqBH8hy7DIb7MVsx7B4DI+OICBQAFAq9WAgAGFAANCQgKBxIUAwIODwsRDBATARUEKR7xY9ze2hIzAC0xAQAAAABSOBkAAAAAAAAAAAAAAAAAAAAAAAAAAAABAvwDnAmOrTN/ziyz/kclDi1tJPgEebksJycmNOV7yVu/AAcABQYBAhkDF3JHWXSsa3h2cA0oler3oXpCTBtn+vmrgbTwn1QUBrwEBAIBAwQIBgkF";
}

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

describe("ClientSession SSE lifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("can deactivate and reactivate SSE without closing the session", () => {
    const client = new AomiClient({ baseUrl: "http://unit.test" });
    const unsubscribeA = vi.fn();
    const unsubscribeB = vi.fn();
    const subscribeSSE = vi
      .spyOn(client, "subscribeSSE")
      .mockReturnValueOnce(unsubscribeA)
      .mockReturnValueOnce(unsubscribeB);

    const session = new Session(client, { sessionId: "session-sse-1" });

    expect(session.getIsSSEActive()).toBe(false);
    expect(subscribeSSE).not.toHaveBeenCalled();

    session.setSSEActive(true);
    expect(session.getIsSSEActive()).toBe(true);
    expect(subscribeSSE).toHaveBeenCalledTimes(1);
    expect(subscribeSSE).toHaveBeenLastCalledWith(
      "session-sse-1",
      expect.any(Function),
      expect.any(Function),
      { applicationId: undefined },
    );

    session.setSSEActive(false);
    expect(session.getIsSSEActive()).toBe(false);
    expect(unsubscribeA).toHaveBeenCalledTimes(1);

    session.setSSEActive(false);
    expect(unsubscribeA).toHaveBeenCalledTimes(1);

    session.setSSEActive(true);
    expect(session.getIsSSEActive()).toBe(true);
    expect(subscribeSSE).toHaveBeenCalledTimes(2);

    session.close();
    expect(unsubscribeB).toHaveBeenCalledTimes(1);
  });

  it("reopens an active SSE stream when application_id changes", () => {
    const client = new AomiClient({ baseUrl: "http://unit.test" });
    const firstUnsubscribe = vi.fn();
    const secondUnsubscribe = vi.fn();
    const subscribeSSE = vi
      .spyOn(client, "subscribeSSE")
      .mockReturnValueOnce(firstUnsubscribe)
      .mockReturnValueOnce(secondUnsubscribe);
    const session = new Session(client, {
      sessionId: "session-sse-app",
      applicationId: 10,
    });

    session.setSSEActive(true);
    session.syncRuntimeOptions({ app: "hosted", applicationId: 20 });

    expect(firstUnsubscribe).toHaveBeenCalledTimes(1);
    expect(subscribeSSE).toHaveBeenCalledTimes(2);
    expect(subscribeSSE).toHaveBeenLastCalledWith(
      "session-sse-app",
      expect.any(Function),
      expect.any(Function),
      { applicationId: 20 },
    );
  });
});

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
    expect(sendMessage.mock.calls[0][2]?.userState).toMatchObject({
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
      connection: { is_connected: true },
      evm: {
        address: "0xabc",
        chain_id: 1,
        ens_name: "wallet.eth",
      },
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
      evm: {
        address: "0xdef",
      },
      ext: { SIMMER_API_KEY: "sk_live_3" },
    });

    session.removeExtValue("SIMMER_API_KEY");
    await session.sendAsync("second");

    expect(sendMessage.mock.calls[1][2]?.userState).toMatchObject({
      evm: {
        address: "0xdef",
      },
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
      { app: "default", applicationId: undefined },
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

    expect(sendMessage.mock.calls[0][2]?.userState).toMatchObject({
      evm: {
        address: "0x123",
      },
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

  it("preserves chain_id across partial backend user_state snapshots", async () => {
    const { client, fetchState, sendMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-unit-5b",
      userState: {
        address: "0xabc",
        chain_id: 8453,
        is_connected: true,
      },
    });

    fetchState.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        address: "0xabc",
        is_connected: true,
        pending_txs: {},
      },
    } satisfies AomiStateResponse);

    await session.syncUserState();
    await session.sendAsync("keep chain");

    expect(sendMessage.mock.calls[0][2]?.userState).toMatchObject({
      connection: { is_connected: true },
      evm: {
        address: "0xabc",
        chain_id: 8453,
      },
    });

    session.close();
  });

  it("preserves owner/chain across partial backend snapshots without sending aa or pending", async () => {
    const { client, fetchState, sendMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-unit-5c",
      userState: {
        address: "0xabc",
        chain_id: 8453,
        is_connected: true,
      },
    });

    fetchState.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        address: "0xabc",
        is_connected: true,
        pending_txs: {},
      },
    } satisfies AomiStateResponse);

    await session.syncUserState();
    await session.sendAsync("keep owner state");

    const sent = sendMessage.mock.calls[0][2]?.userState;
    expect(sent).toMatchObject({
      connection: { is_connected: true },
      evm: { address: "0xabc", chain_id: 8453 },
    });
    // AA / sponsorship are backend authority; `pending` is backend in-flight
    // state. Neither is ever sent back.
    expect(sent?.evm).not.toHaveProperty("aa");
    expect(sent).not.toHaveProperty("pending");

    session.close();
  });

  it("strips backend-authority aa/sponsorship aliases while normalizing the rest", () => {
    const normalized = UserState.normalize({
      address: "0xabc",
      aaMode: "4337",
      smartAccount: "0xsmart",
      walletProvider: "baseAccount",
      authMethod: "google",
      sponsorProvider: "coinbase",
      sponsorAccount: "gp_test",
    } as unknown as Parameters<typeof UserState.normalize>[0]);
    expect(normalized).toMatchObject({
      evm: { address: "0xabc" },
      connection: { provider: "baseAccount", auth_method: "google" },
    });
    expect(normalized?.evm).not.toHaveProperty("aa");
    expect(normalized?.evm).not.toHaveProperty("sponsorship");
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

    await expect(
      session.sendAsync("null normalization check"),
    ).resolves.toMatchObject({
      is_processing: false,
    });
    expect(warnSpy).not.toHaveBeenCalled();

    session.close();
  });

  it("hydrates pending transaction requests from backend user_state", async () => {
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
      },
    } satisfies AomiStateResponse);

    await session.fetchCurrentState();

    expect(session.getPendingRequests()).toEqual([
      expect.objectContaining({
        id: "tx-1",
        kind: "transaction",
        payload: expect.objectContaining({
          txId: 1,
          txIds: [1],
          chainId: 8453,
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
      system_events: [
        {
          InlineCall: {
            type: "wallet_tx_request",
            payload: {
              tx_ids: [15],
              aa_preference: "auto",
            },
          },
        },
      ],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_tx_request", resolve);
    });

    await session.sendAsync("queue id-only tx");
    const request = requestPromise as Promise<{
      kind: "transaction";
      payload: {
        txId?: number;
        txIds?: number[];
        to?: string;
        value?: string;
        chainId?: number;
      };
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

  it("dedupes a synthetic single-tx request once the backend wallet event arrives", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-unit-7c-dedupe",
    });

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
      system_events: [
        {
          InlineCall: {
            type: "wallet_tx_request",
            payload: {
              tx_ids: [15],
              tx_id: "tx:pending:15:123",
              aa_preference: "auto",
            },
          },
        },
      ],
    } satisfies AomiChatResponse);

    await session.sendAsync("queue id-only tx");

    expect(session.getPendingRequests()).toEqual([
      expect.objectContaining({
        id: "txreq-tx:pending:15:123",
        kind: "transaction",
        payload: expect.objectContaining({
          txId: 15,
          txIds: [15],
          chainId: 8453,
        }),
      }),
    ]);

    session.close();
  });

  it("preserves batched wallet_tx_request payloads across user_state sync", async () => {
    const { client, sendMessage, fetchState } = createMockClient();
    const session = new Session(client, { sessionId: "session-unit-7d" });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        pending_txs: {
          1: {
            to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            value: "0",
            data: "0x095ea7b3",
            chain_id: 1,
          },
          2: {
            to: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
            value: "0",
            data: "0x3df02124",
            chain_id: 1,
          },
        },
      },
      system_events: [
        {
          InlineCall: {
            type: "wallet_tx_request",
            payload: {
              tx_ids: [1, 2],
              aa_preference: "auto",
            },
          },
        },
      ],
    } satisfies AomiChatResponse);

    await session.sendAsync("queue batched tx");

    expect(session.getPendingRequests()).toEqual([
      expect.objectContaining({
        id: "tx-1-2",
        kind: "transaction",
        payload: expect.objectContaining({
          txIds: [1, 2],
          txId: 1,
          chainId: 1,
          calls: expect.arrayContaining([
            expect.objectContaining({ txId: 1 }),
            expect.objectContaining({ txId: 2 }),
          ]),
        }),
      }),
    ]);

    fetchState.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        pending_txs: {
          1: {
            to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            value: "0",
            data: "0x095ea7b3",
            chain_id: 1,
            batch_status: "Batch [1,2] passed",
          },
          2: {
            to: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
            value: "0",
            data: "0x3df02124",
            chain_id: 1,
            batch_status: "Batch [1,2] passed",
          },
        },
      },
    } satisfies AomiStateResponse);

    await session.fetchCurrentState();

    expect(session.getPendingRequests()).toEqual([
      expect.objectContaining({
        id: "tx-1-2",
        kind: "transaction",
        payload: expect.objectContaining({
          txIds: [1, 2],
          txId: 1,
          chainId: 1,
          calls: expect.arrayContaining([
            expect.objectContaining({ txId: 1 }),
            expect.objectContaining({ txId: 2 }),
          ]),
        }),
      }),
    ]);

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
      system_events: [
        {
          InlineCall: {
            type: "wallet_tx_request",
            payload: {
              tx_ids: [7],
              aa_preference: "auto",
            },
          },
        },
      ],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_tx_request", resolve);
    });

    await session.sendAsync("queue tx");
    const request = await requestPromise;

    await session.resolve((request as { id: string }).id, {
      kind: "transaction",
      txHash: "0xabc",
    });

    expect(session.getUserState()).toMatchObject({
      pending: {
        evm_txs: {
          7: expect.objectContaining({
            chain_id: 8453,
          }),
        },
      },
    });
    // AA state is backend authority and is no longer written into user_state
    // on tx completion.
    expect(session.getUserState()?.evm?.aa).toBeUndefined();

    expect(sendSystemMessage).toHaveBeenCalledWith(
      "session-unit-8",
      JSON.stringify({
        type: "wallet:tx_complete",
        payload: {
          txHash: "0xabc",
          status: "success",
          amount: undefined,
          pending_tx_ids: [7],
          execution_kind: undefined,
          batched: false,
          call_count: 1,
        },
      }),
      { app: "default" },
    );

    session.close();
  });

  it("does not rebuild AA authority from parked user state", async () => {
    const { client, fetchState } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-unit-aa-resync",
    });

    fetchState.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        pending_txs: {
          7: {
            from: "0x1111111111111111111111111111111111111111",
            to: "0x000000000000000000000000000000000000dead",
            value: "0",
            data: "0x",
            chain_id: 4326,
            label: "Execute three calls",
            current_lifecycle: "awaiting_aa_signature",
            aa_handoff: {
              prepared_blob: { type: "array", data: [] },
              signature_requests: [
                {
                  kind: "eip7702_authorization",
                  contract_address:
                    "0x0000000000000000000000000000000000007702",
                  chain_id: 4326,
                  nonce: 0,
                  raw_payload: `0x${"11".repeat(32)}`,
                },
                {
                  kind: "personal_sign",
                  message: "0xprepared-user-operation",
                  raw_payload: `0x${"22".repeat(32)}`,
                },
              ],
              tx_ids: [7],
              aa_mode: "7702",
              executor: "0x1111111111111111111111111111111111111111",
            },
          },
        },
      },
    } satisfies AomiStateResponse);

    await session.fetchCurrentState();

    expect(session.getPendingRequests()).toEqual([]);
    session.close();
  });

  it("does not re-offer backend-held AA records as plain transactions", async () => {
    const { client, fetchState } = createMockClient();
    const session = new Session(client, { sessionId: "session-unit-aa-held" });

    fetchState.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        pending_txs: {
          3: {
            to: "0x000000000000000000000000000000000000beef",
            value: "0",
            data: "0x",
            chain_id: 4326,
            current_lifecycle: "inflight",
            aa_prepared_call_id: "prep-1",
          },
        },
      },
    } satisfies AomiStateResponse);

    await session.fetchCurrentState();

    expect(session.getPendingRequests()).toEqual([]);
    session.close();
  });

  it("emits wallet_solana_send_request from a wallet::solana_send_request InlineCall", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, { sessionId: "session-solana-send-1" });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [
        {
          InlineCall: {
            type: "wallet::solana_send_request",
            payload: {
              unsigned_tx: "QkFTRTY0U0VORFRY",
              description: "send 0.01 SOL",
              cluster: "devnet",
              pending_solana_id: 11,
            },
          },
        },
      ],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_send_request", resolve);
    });

    await session.sendAsync("send solana");
    const request = (await requestPromise) as {
      id: string;
      kind: string;
      payload: {
        unsignedTx?: string;
        description?: string;
        cluster?: string;
        pendingSolanaId?: number;
      };
    };

    expect(request.id).toBe("solana_send-11");
    expect(request.kind).toBe("solana_send");
    expect(request.payload.unsignedTx).toBe("QkFTRTY0U0VORFRY");
    expect(request.payload.description).toBe("send 0.01 SOL");
    expect(request.payload.cluster).toBe("solana:devnet");
    expect(request.payload.pendingSolanaId).toBe(11);

    session.close();
  });

  it("posts wallet::solana_send_complete with signature on resolve", async () => {
    const { client, sendMessage, sendSystemMessage } = createMockClient();
    const session = new Session(client, { sessionId: "session-solana-send-2" });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        pending: {
          svm_ixs: {
            "12": {
              unsigned_tx: "AQABAg",
              pending_solana_id: 12,
            },
          },
        },
      },
      system_events: [
        {
          InlineCall: {
            type: "wallet::solana_send_request",
            payload: {
              unsigned_tx: "AQABAg",
              description: "swap for BONK",
              pending_solana_id: 12,
            },
          },
        },
      ],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_send_request", resolve);
    });

    await session.sendAsync("send solana");
    const request = (await requestPromise) as { id: string };
    const startPolling = vi.spyOn(session, "startPolling");

    await session.resolve(request.id, {
      kind: "solana_send",
      signature: "5sV4SolanaSignature",
      signedTx: "SIGNED:AQABAg",
    });

    expect(sendSystemMessage).toHaveBeenCalledWith(
      "session-solana-send-2",
      JSON.stringify({
        type: "wallet::solana_send_complete",
        payload: {
          status: "submitted",
          signature: "5sV4SolanaSignature",
          signed_tx: "SIGNED:AQABAg",
          unsigned_tx: "AQABAg",
          description: "swap for BONK",
          pending_solana_id: 12,
        },
      }),
      { app: "default" },
    );
    expect(session.getUserState()?.pending?.svm_ixs).toEqual({});
    expect(startPolling).toHaveBeenCalledOnce();

    session.close();
  });

  it("returns every pending SVM id for a multi-instruction send", async () => {
    const { client, sendMessage, sendSystemMessage } = createMockClient();
    const session = new Session(client, { sessionId: "session-solana-send-4" });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [
        {
          InlineCall: {
            type: "wallet_tx_request",
            payload: {
              chain_kind: "svm",
              svm_tx_ids: [14, 15],
              request_kind: "send_transaction",
              unsigned_tx: "U0VORE1F",
              description: "transfer SOL",
              cluster: "solana:devnet",
              pending_solana_id: 14,
            },
          },
        },
      ],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_send_request", resolve);
    });

    await session.sendAsync("send solana through backend svm flow");
    const request = (await requestPromise) as {
      id: string;
      kind: string;
      payload: {
        unsignedTx?: string;
        description?: string;
        cluster?: string;
        pendingSolanaId?: number;
        pendingSolanaIds?: number[];
      };
    };

    expect(request.id).toBe("solana_send-14");
    expect(request.kind).toBe("solana_send");
    expect(request.payload.unsignedTx).toBe("U0VORE1F");
    expect(request.payload.pendingSolanaId).toBe(14);
    expect(request.payload.pendingSolanaIds).toEqual([14, 15]);

    await session.resolve(request.id, {
      kind: "solana_send",
      signature: "multi-signature",
      signedTx: "SIGNED:U0VORE1F",
    });
    expect(sendSystemMessage).toHaveBeenCalledWith(
      "session-solana-send-4",
      JSON.stringify({
        type: "wallet::solana_send_complete",
        payload: {
          status: "submitted",
          signature: "multi-signature",
          signed_tx: "SIGNED:U0VORE1F",
          unsigned_tx: "U0VORE1F",
          description: "transfer SOL",
          pending_solana_id: 14,
          pending_svm_tx_ids: [14, 15],
        },
      }),
      { app: "default" },
    );

    session.close();
  });

  it("emits wallet_solana_sign_and_send_request from a wallet::solana_sign_and_send_request InlineCall", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-solana-sign-and-send-1",
    });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [
        {
          InlineCall: {
            type: "wallet::solana_sign_and_send_request",
            payload: {
              unsigned_tx: "Qg==",
              description: "swap+send",
              cluster: "solana:mainnet",
              pending_solana_id: 22,
            },
          },
        },
      ],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_sign_and_send_request", resolve);
    });

    await session.sendAsync("sign and send solana");
    const request = (await requestPromise) as {
      id: string;
      kind: string;
      payload: {
        unsignedTx?: string;
        description?: string;
        cluster?: string;
        pendingSolanaId?: number;
      };
    };

    expect(request.id).toBe("solana_sign_and_send-22");
    expect(request.kind).toBe("solana_sign_and_send");
    expect(request.payload.unsignedTx).toBe("Qg==");
    expect(request.payload.description).toBe("swap+send");
    expect(request.payload.cluster).toBe("solana:mainnet");
    expect(request.payload.pendingSolanaId).toBe(22);

    session.close();
  });

  it("posts wallet::solana_sign_and_send_complete with signature and signed_tx on resolve", async () => {
    const { client, sendMessage, sendSystemMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-solana-sign-and-send-2",
    });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [
        {
          InlineCall: {
            type: "wallet::solana_sign_and_send_request",
            payload: {
              unsigned_tx: "Qg==",
              description: "swap+send",
              cluster: "solana:mainnet",
              pending_solana_id: 22,
            },
          },
        },
      ],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_sign_and_send_request", resolve);
    });

    await session.sendAsync("sign and send solana");
    const request = (await requestPromise) as { id: string };

    await session.resolve(request.id, {
      kind: "solana_sign_and_send",
      signature: "SIG",
      signedTx: "SIGNED:Qg==",
    });

    expect(sendSystemMessage).toHaveBeenCalledWith(
      "session-solana-sign-and-send-2",
      JSON.stringify({
        type: "wallet::solana_sign_and_send_complete",
        payload: {
          status: "submitted",
          signature: "SIG",
          signed_tx: "SIGNED:Qg==",
          unsigned_tx: "Qg==",
          description: "swap+send",
          pending_solana_id: 22,
        },
      }),
      { app: "default" },
    );

    session.close();
  });

  it("keeps the sign_and_send request queued when resolve receives the wrong result kind", async () => {
    const { client, sendMessage, sendSystemMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-solana-sign-and-send-kind-mismatch",
    });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [
        {
          InlineCall: {
            type: "wallet::solana_sign_and_send_request",
            payload: {
              unsigned_tx: "Qg==",
              description: "swap+send",
              pending_solana_id: 22,
            },
          },
        },
      ],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_sign_and_send_request", resolve);
    });

    await session.sendAsync("sign and send solana");
    const request = (await requestPromise) as { id: string };

    await expect(
      session.resolve(request.id, {
        kind: "solana_send",
        signature: "SIG",
        signedTx: "SIGNED:Qg==",
      }),
    ).rejects.toThrow(/kind mismatch/i);

    expect(sendSystemMessage).not.toHaveBeenCalled();
    expect(session.getPendingRequests()).toEqual([
      expect.objectContaining({
        id: request.id,
        kind: "solana_sign_and_send",
      }),
    ]);

    session.close();
  });

  it("posts wallet::solana_sign_and_send_complete rejected on reject", async () => {
    const { client, sendMessage, sendSystemMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-solana-sign-and-send-3",
    });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [
        {
          InlineCall: {
            type: "wallet::solana_sign_and_send_request",
            payload: {
              unsigned_tx: "Qg==",
              description: "swap+send",
              pending_solana_id: 22,
            },
          },
        },
      ],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_sign_and_send_request", resolve);
    });

    await session.sendAsync("sign and send solana");
    const request = (await requestPromise) as { id: string };

    await session.reject(request.id, "user cancel");

    expect(sendSystemMessage).toHaveBeenCalledWith(
      "session-solana-sign-and-send-3",
      JSON.stringify({
        type: "wallet::solana_sign_and_send_complete",
        payload: {
          status: "rejected",
          error: "user cancel",
          unsigned_tx: "Qg==",
          description: "swap+send",
          pending_solana_id: 22,
        },
      }),
      { app: "default" },
    );

    session.close();
  });

  it("rebuilds solana_send requests from nested user_state.pending.solana_txs", async () => {
    const { client, fetchState } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-solana-send-3",
      userState: {
        connection: {
          is_connected: true,
        },
        solana: {
          address: "So1aBcExampleSigner",
          cluster: "solana:devnet",
        },
      },
    });

    fetchState.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        connection: {
          is_connected: true,
        },
        solana: {
          address: "So1aBcExampleSigner",
          cluster: "solana:devnet",
        },
        pending: {
          solana_txs: {
            21: {
              request_kind: "send_transaction",
              description: "bridge back to main wallet",
              cluster: "devnet",
              unsigned_tx: "U0VORE1F",
            },
          },
        },
      },
    } satisfies AomiStateResponse);

    const changedPromise = new Promise<unknown>((resolve) => {
      session.once("wallet_requests_changed", resolve);
    });

    await session.fetchCurrentState();
    const requests = (await changedPromise) as Array<{
      id: string;
      kind: string;
      payload: { unsignedTx?: string; pendingSolanaId?: number };
    }>;

    const solana = requests.find((r) => r.kind === "solana_send");
    expect(solana).toBeDefined();
    expect(solana?.id).toBe("solana_send-21");
    expect(solana?.payload.unsignedTx).toBe("U0VORE1F");
    expect(solana?.payload.pendingSolanaId).toBe(21);

    session.close();
  });
});
