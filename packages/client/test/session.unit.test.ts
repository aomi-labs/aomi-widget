import { afterEach, describe, expect, it, vi } from "vitest";

import { AomiClient, Session } from "../src/index";
import type { AomiChatResponse, AomiStateResponse } from "../src/index";
import { CLIENT_TYPE_WEB_UI, UserState } from "../src/index";

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
      connection: { is_connected: true },
      evm: {
        address: "0xdef",
        aa: undefined,
        sponsorship: undefined,
      },
      ext: { SIMMER_API_KEY: "sk_live_3" },
      pending: undefined,
      solana: undefined,
    });

    session.removeExtValue("SIMMER_API_KEY");
    await session.sendAsync("second");

    expect(sendMessage.mock.calls[1][2]?.userState).toMatchObject({
      connection: { is_connected: true },
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
      connection: { is_connected: true },
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

  it("preserves AA mode and smart account across partial backend user_state snapshots", async () => {
    const { client, fetchState, sendMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-unit-5c",
      userState: {
        address: "0xabc",
        chain_id: 8453,
        is_connected: true,
        aa_mode: "4337",
        smart_account: "0xsmart",
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
    await session.sendAsync("keep aa state");

    expect(sendMessage.mock.calls[0][2]?.userState).toMatchObject({
      connection: { is_connected: true },
      evm: {
        address: "0xabc",
        chain_id: 8453,
        aa: {
          mode: "4337",
          smart_account: "0xsmart",
        },
      },
    });

    session.close();
  });

  it("normalizes camelCase AA user_state aliases", () => {
    expect(UserState.normalize({
      address: "0xabc",
      aaMode: "4337",
      smartAccount: "0xsmart",
    })).toMatchObject({
      evm: {
        address: "0xabc",
        aa: {
          mode: "4337",
          smart_account: "0xsmart",
        },
      },
    });
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

  it("dedupes a synthetic single-tx request once the backend wallet event arrives", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, { sessionId: "session-unit-7c-dedupe" });

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
            tx_id: "tx:pending:15:123",
            aa_preference: "auto",
          },
        },
      }],
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
      system_events: [{
        InlineCall: {
          type: "wallet_tx_request",
          payload: {
            tx_ids: [1, 2],
            aa_preference: "auto",
          },
        },
      }],
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

    await session.resolve((request as { id: string }).id, {
      kind: "transaction",
      txHash: "0xabc",
    });

    expect(session.getUserState()).toMatchObject({
      evm: {
        aa: {
          mode: "7702",
        },
      },
      pending: {
        evm_txs: {
          7: expect.objectContaining({
            chain_id: 8453,
          }),
        },
      },
    });

    expect(sendSystemMessage).toHaveBeenCalledWith(
      "session-unit-8",
      JSON.stringify({
        type: "wallet:tx_complete",
        payload: {
          txHash: "0xabc",
          status: "success",
          amount: undefined,
          pending_tx_ids: [7],
          aa_requested_mode: "7702",
          aa_resolved_mode: "7702",
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

  it("emits wallet_solana_sign_request from a wallet::solana_sign_request InlineCall", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, { sessionId: "session-solana-1" });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [{
        InlineCall: {
          type: "wallet::solana_sign_request",
          payload: {
            unsigned_tx: "QkFTRTY0VFhCWVRFUw",
            description: "swap 1 USDC for SOL",
            cluster: "solana:devnet",
            pending_solana_id: 7,
          },
        },
      }],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_sign_request", resolve);
    });

    await session.sendAsync("queue solana signature");
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

    expect(request.id).toBe("solana_sign-7");
    expect(request.kind).toBe("solana_sign");
    expect(request.payload.unsignedTx).toBe("QkFTRTY0VFhCWVRFUw");
    expect(request.payload.description).toBe("swap 1 USDC for SOL");
    expect(request.payload.cluster).toBe("solana:devnet");
    expect(request.payload.pendingSolanaId).toBe(7);

    session.close();
  });

  it("emits wallet_solana_sign_message_request from a wallet::solana_sign_request message_sign InlineCall", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-solana-message-sign-1",
    });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [{
        InlineCall: {
          type: "wallet::solana_sign_request",
          payload: {
            chain_kind: "svm",
            request_kind: "message_sign",
            kind: "svm_message",
            message_base64: "TWVtbw==",
            description: "sign login proof",
            cluster: "solana:devnet",
            pending_solana_id: 17,
          },
        },
      }],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_sign_message_request", resolve);
    });

    await session.sendAsync("sign solana message");
    const request = (await requestPromise) as {
      id: string;
      kind: string;
      payload: {
        message?: string;
        description?: string;
        cluster?: string;
        pendingSolanaId?: number;
      };
    };

    expect(request.id).toBe("solana_sign_message-17");
    expect(request.kind).toBe("solana_sign_message");
    expect(request.payload.message).toBe("TWVtbw==");
    expect(request.payload.description).toBe("sign login proof");
    expect(request.payload.cluster).toBe("solana:devnet");
    expect(request.payload.pendingSolanaId).toBe(17);

    session.close();
  });

  it("posts wallet::solana_sign_complete with signed_tx on resolve", async () => {
    const { client, sendMessage, sendSystemMessage } = createMockClient();
    const session = new Session(client, { sessionId: "session-solana-2" });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [{
        InlineCall: {
          type: "wallet::solana_sign_request",
          payload: {
            unsigned_tx: "AQAA",
            description: "claim rewards",
            pending_solana_id: 3,
          },
        },
      }],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_sign_request", resolve);
    });

    await session.sendAsync("sign solana");
    const request = (await requestPromise) as { id: string };

    await session.resolve(request.id, {
      kind: "solana_sign",
      signedTx: "SIGNED:AQAA",
    });

    expect(sendSystemMessage).toHaveBeenCalledWith(
      "session-solana-2",
      JSON.stringify({
        type: "wallet::solana_sign_complete",
        payload: {
          status: "signed",
          signed_tx: "SIGNED:AQAA",
          unsigned_tx: "AQAA",
          description: "claim rewards",
          pending_solana_id: 3,
        },
      }),
    );

    session.close();
  });

  it("keeps the request queued when resolve receives the wrong result kind", async () => {
    const { client, sendMessage, sendSystemMessage } = createMockClient();
    const session = new Session(client, { sessionId: "session-solana-kind-mismatch" });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [{
        InlineCall: {
          type: "wallet::solana_sign_request",
          payload: {
            unsigned_tx: "AQAA",
            description: "claim rewards",
            pending_solana_id: 9,
          },
        },
      }],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_sign_request", resolve);
    });

    await session.sendAsync("sign solana");
    const request = (await requestPromise) as { id: string };

    await expect(
      session.resolve(request.id, {
        kind: "eip712_sign",
        signature: "0xdeadbeef",
      }),
    ).rejects.toThrow(/kind mismatch/i);

    expect(sendSystemMessage).not.toHaveBeenCalled();
    expect(session.getPendingRequests()).toEqual([
      expect.objectContaining({
        id: request.id,
        kind: "solana_sign",
      }),
    ]);

    session.close();
  });

  it("posts wallet::solana_sign_complete rejected on reject", async () => {
    const { client, sendMessage, sendSystemMessage } = createMockClient();
    const session = new Session(client, { sessionId: "session-solana-3" });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [{
        InlineCall: {
          type: "wallet::solana_sign_request",
          payload: {
            unsigned_tx: "AQAA",
            description: "claim rewards",
            pending_solana_id: 4,
          },
        },
      }],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_sign_request", resolve);
    });

    await session.sendAsync("sign solana");
    const request = (await requestPromise) as { id: string };

    await session.reject(request.id, "User cancelled in Phantom");

    expect(sendSystemMessage).toHaveBeenCalledWith(
      "session-solana-3",
      JSON.stringify({
        type: "wallet::solana_sign_complete",
        payload: {
          status: "rejected",
          error: "User cancelled in Phantom",
          unsigned_tx: "AQAA",
          description: "claim rewards",
          pending_solana_id: 4,
        },
      }),
    );

    session.close();
  });

  it("emits wallet_solana_send_request from a wallet::solana_send_request InlineCall", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, { sessionId: "session-solana-send-1" });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [{
        InlineCall: {
          type: "wallet::solana_send_request",
          payload: {
            unsigned_tx: "QkFTRTY0U0VORFRY",
            description: "send 0.01 SOL",
            cluster: "devnet",
            pending_solana_id: 11,
          },
        },
      }],
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
    expect(request.payload.cluster).toBe("devnet");
    expect(request.payload.pendingSolanaId).toBe(11);

    session.close();
  });

  it("posts wallet::solana_send_complete with signature on resolve", async () => {
    const { client, sendMessage, sendSystemMessage } = createMockClient();
    const session = new Session(client, { sessionId: "session-solana-send-2" });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [{
        InlineCall: {
          type: "wallet::solana_send_request",
          payload: {
            unsigned_tx: "AQABAg",
            description: "swap for BONK",
            pending_solana_id: 12,
          },
        },
      }],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_send_request", resolve);
    });

    await session.sendAsync("send solana");
    const request = (await requestPromise) as { id: string };

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
    );

    session.close();
  });

  it("emits wallet_solana_send_request from a backend wallet_tx_request svm payload", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, { sessionId: "session-solana-send-4" });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [{
        InlineCall: {
          type: "wallet_tx_request",
          payload: {
            chain_kind: "svm",
            svm_tx_ids: [14],
            request_kind: "send_transaction",
            unsigned_tx: "U0VORE1F",
            description: "transfer SOL",
            cluster: "solana:devnet",
            pending_solana_id: 14,
          },
        },
      }],
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
      };
    };

    expect(request.id).toBe("solana_send-14");
    expect(request.kind).toBe("solana_send");
    expect(request.payload.unsignedTx).toBe("U0VORE1F");
    expect(request.payload.pendingSolanaId).toBe(14);

    session.close();
  });

  it("emits wallet_solana_sign_message_request from a wallet::solana_sign_message_request InlineCall", async () => {
    const { client, sendMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-solana-sign-message-1",
    });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [{
        InlineCall: {
          type: "wallet::solana_sign_message_request",
          payload: {
            message_base64: "TWVtbw==",
            description: "sign login proof",
            cluster: "solana:devnet",
            pending_solana_id: 17,
          },
        },
      }],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_sign_message_request", resolve);
    });

    await session.sendAsync("sign solana message");
    const request = (await requestPromise) as {
      id: string;
      kind: string;
      payload: {
        message?: string;
        description?: string;
        cluster?: string;
        pendingSolanaId?: number;
      };
    };

    expect(request.id).toBe("solana_sign_message-17");
    expect(request.kind).toBe("solana_sign_message");
    expect(request.payload.message).toBe("TWVtbw==");
    expect(request.payload.description).toBe("sign login proof");
    expect(request.payload.cluster).toBe("solana:devnet");
    expect(request.payload.pendingSolanaId).toBe(17);

    session.close();
  });

  it("posts wallet::solana_sign_message_complete with signature on resolve", async () => {
    const { client, sendMessage, sendSystemMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-solana-sign-message-2",
    });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [{
        InlineCall: {
          type: "wallet::solana_sign_message_request",
          payload: {
            message_base64: "TWVtbw==",
            description: "sign login proof",
            cluster: "solana:devnet",
            pending_solana_id: 17,
          },
        },
      }],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_sign_message_request", resolve);
    });

    await session.sendAsync("sign solana message");
    const request = (await requestPromise) as { id: string };

    await session.resolve(request.id, {
      kind: "solana_sign_message",
      signature: "SIGN:MEMO",
    });

    expect(sendSystemMessage).toHaveBeenCalledWith(
      "session-solana-sign-message-2",
      JSON.stringify({
        type: "wallet::solana_sign_message_complete",
        payload: {
          status: "signed",
          signature: "SIGN:MEMO",
          message: "TWVtbw==",
          description: "sign login proof",
          pending_solana_id: 17,
        },
      }),
    );

    session.close();
  });

  it("keeps the sign_message request queued when resolve receives the wrong result kind", async () => {
    const { client, sendMessage, sendSystemMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-solana-sign-message-kind-mismatch",
    });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [{
        InlineCall: {
          type: "wallet::solana_sign_message_request",
          payload: {
            message_base64: "TWVtbw==",
            description: "sign login proof",
            pending_solana_id: 17,
          },
        },
      }],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_sign_message_request", resolve);
    });

    await session.sendAsync("sign solana message");
    const request = (await requestPromise) as { id: string };

    await expect(
      session.resolve(request.id, {
        kind: "solana_sign",
        signedTx: "SIGNED:MEMO",
      }),
    ).rejects.toThrow(/kind mismatch/i);

    expect(sendSystemMessage).not.toHaveBeenCalled();
    expect(session.getPendingRequests()).toEqual([
      expect.objectContaining({
        id: request.id,
        kind: "solana_sign_message",
      }),
    ]);

    session.close();
  });

  it("posts wallet::solana_sign_message_complete rejected on reject", async () => {
    const { client, sendMessage, sendSystemMessage } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-solana-sign-message-3",
    });

    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [{
        InlineCall: {
          type: "wallet::solana_sign_message_request",
          payload: {
            message_base64: "TWVtbw==",
            description: "sign login proof",
            pending_solana_id: 17,
          },
        },
      }],
    } satisfies AomiChatResponse);

    const requestPromise = new Promise((resolve) => {
      session.once("wallet_solana_sign_message_request", resolve);
    });

    await session.sendAsync("sign solana message");
    const request = (await requestPromise) as { id: string };

    await session.reject(request.id, "user cancel");

    expect(sendSystemMessage).toHaveBeenCalledWith(
      "session-solana-sign-message-3",
      JSON.stringify({
        type: "wallet::solana_sign_message_complete",
        payload: {
          status: "rejected",
          error: "user cancel",
          message: "TWVtbw==",
          description: "sign login proof",
          pending_solana_id: 17,
        },
      }),
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
      system_events: [{
        InlineCall: {
          type: "wallet::solana_sign_and_send_request",
          payload: {
            unsigned_tx: "Qg==",
            description: "swap+send",
            cluster: "solana:mainnet",
            pending_solana_id: 22,
          },
        },
      }],
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
      system_events: [{
        InlineCall: {
          type: "wallet::solana_sign_and_send_request",
          payload: {
            unsigned_tx: "Qg==",
            description: "swap+send",
            cluster: "solana:mainnet",
            pending_solana_id: 22,
          },
        },
      }],
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
      system_events: [{
        InlineCall: {
          type: "wallet::solana_sign_and_send_request",
          payload: {
            unsigned_tx: "Qg==",
            description: "swap+send",
            pending_solana_id: 22,
          },
        },
      }],
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
      system_events: [{
        InlineCall: {
          type: "wallet::solana_sign_and_send_request",
          payload: {
            unsigned_tx: "Qg==",
            description: "swap+send",
            pending_solana_id: 22,
          },
        },
      }],
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
    );

    session.close();
  });

  it("rebuilds solana_sign requests from user_state.pending_solana_txs", async () => {
    const { client, fetchState } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-solana-4",
      userState: {
        address: "0xabc",
        chainId: 1,
        isConnected: true,
        svmAddress: "So1aBcExampleSigner",
      },
    });

    fetchState.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        address: "0xabc",
        chain_id: 1,
        is_connected: true,
        svm_address: "So1aBcExampleSigner",
        pending_solana_txs: {
          12: {
            signer: "So1aBcExampleSigner",
            cluster: "solana:mainnet",
            description: "byreal swap",
            unsigned_tx: "AQABAg",
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

    const solana = requests.find((r) => r.kind === "solana_sign");
    expect(solana).toBeDefined();
    expect(solana?.id).toBe("solana_sign-12");
    expect(solana?.payload.unsignedTx).toBe("AQABAg");
    expect(solana?.payload.pendingSolanaId).toBe(12);

    session.close();
  });

  it("rebuilds solana_send requests from nested user_state.pending.solana_txs", async () => {
    const { client, fetchState } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-solana-send-3",
      userState: {
        connection: {
          is_connected: true,
          primary_family: "solana",
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
          primary_family: "solana",
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

  it("rebuilds eip712 requests from canonical user_state.pending.evm_sigs", async () => {
    const { client, fetchState } = createMockClient();
    const session = new Session(client, {
      sessionId: "session-eip712-sigs-1",
      userState: {
        connection: {
          is_connected: true,
          primary_family: "evm",
        },
        evm: {
          address: "0xabc",
          chain_id: 8453,
        },
      },
    });

    fetchState.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      user_state: {
        connection: {
          is_connected: true,
          primary_family: "evm",
        },
        evm: {
          address: "0xabc",
          chain_id: 8453,
        },
        pending: {
          evm_sigs: {
            11: {
              description: "Permit2 signature",
              typed_data: {
                domain: { chainId: 8453, name: "Permit2" },
                types: { Permit: [{ name: "owner", type: "address" }] },
                primaryType: "Permit",
                message: { owner: "0xabc" },
              },
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
      payload: { eip712Id?: number };
    }>;

    const eip712 = requests.find((r) => r.kind === "eip712_sign");
    expect(eip712).toBeDefined();
    expect(eip712?.id).toBe("eip712-11");
    expect(eip712?.payload.eip712Id).toBe(11);

    session.close();
  });
});
