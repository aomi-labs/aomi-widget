import { afterEach, describe, expect, it, vi } from "vitest";

import { AomiClient, Session } from "../src/index";
import type {
  AomiChatResponse,
  WalletRequest,
  WalletSigningPayload,
} from "../src/index";

function createSession(id: string) {
  const client = new AomiClient({ baseUrl: "http://unit.test" });
  vi.spyOn(client, "subscribeSSE").mockImplementation(() => () => {});
  const sendMessage = vi
    .spyOn(client, "sendMessage")
    .mockResolvedValue({ is_processing: false, messages: [] });
  const complete = vi.spyOn(client, "request").mockResolvedValue({});
  return {
    client,
    session: new Session(client, { sessionId: id }),
    sendMessage,
    complete,
  };
}

const cases: Array<{
  label: string;
  requestId: string;
  payload: WalletSigningPayload;
  signatures: string[];
}> = [
  {
    label: "EVM message",
    requestId: "sign:11111111-1111-4111-8111-111111111111",
    payload: {
      requestId: "sign:11111111-1111-4111-8111-111111111111",
      chainFamily: "evm",
      executionKind: "message",
      signer: "0x1111111111111111111111111111111111111111",
      chainId: 8453,
      description: "Sign login proof",
      payloads: [{ kind: "evm_personal", message: "0x1234" }],
    },
    signatures: ["0xevmsignature"],
  },
  {
    label: "SVM transaction",
    requestId: "sign:22222222-2222-4222-8222-222222222222",
    payload: {
      requestId: "sign:22222222-2222-4222-8222-222222222222",
      chainFamily: "svm",
      executionKind: "transaction",
      signer: "So11111111111111111111111111111111111111112",
      cluster: "solana:devnet",
      description: "Sign staged instructions",
      payloads: [{ kind: "svm_transaction", transactionBase64: "AQID" }],
    },
    signatures: ["SIGNED_SVM_TRANSACTION"],
  },
  {
    label: "ERC-4337 EVM envelope",
    requestId: "sign:33333333-3333-4333-8333-333333333333",
    payload: {
      requestId: "sign:33333333-3333-4333-8333-333333333333",
      chainFamily: "evm",
      executionKind: "erc4337",
      signer: "0x1111111111111111111111111111111111111111",
      chainId: 8453,
      description: "Execute sponsored batch",
      operationId: "33333333-3333-4333-8333-333333333333",
      executor: "0x2222222222222222222222222222222222222222",
      expiresAt: "2026-08-14T00:00:00Z",
      callsDigest:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      calls: [
        {
          to: "0x3333333333333333333333333333333333333333",
          value: "1000000000000000",
          data: "0x",
        },
      ],
      fees: [
        {
          asset: { kind: "native" },
          amount: "10000000000000",
          recipient: "0x4444444444444444444444444444444444444444",
        },
      ],
      sponsorship: "required",
      payloads: [{ kind: "evm_personal", message: "0xabcd" }],
    },
    signatures: ["0xaaownersignature"],
  },
];

describe("opaque signing handoff", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  for (const testCase of cases) {
    it(`completes ${testCase.label} through the generic endpoint`, async () => {
      const { session, sendMessage, complete } = createSession(
        `session-${testCase.label}`,
      );
      sendMessage.mockResolvedValueOnce({
        is_processing: false,
        messages: [],
        system_events: [
          {
            InlineCall: {
              type: "wallet_signing_request",
              payload: {
                ...testCase.payload,
                payloads: testCase.payload.payloads.map((payload) => {
                  if (payload.kind === "evm_typed_data") {
                    return {
                      kind: payload.kind,
                      typed_data: payload.typedData,
                    };
                  }
                  if (payload.kind === "svm_message") {
                    return {
                      kind: payload.kind,
                      message_base64: payload.messageBase64,
                    };
                  }
                  if (payload.kind === "svm_transaction") {
                    return {
                      kind: payload.kind,
                      transaction_base64: payload.transactionBase64,
                    };
                  }
                  return payload;
                }),
              },
            },
          },
        ],
      } satisfies AomiChatResponse);

      const requestPromise = new Promise<WalletRequest>((resolve) => {
        session.once("wallet_signing_request", resolve);
      });
      await session.sendAsync("stage action");
      const request = await requestPromise;

      expect(request).toMatchObject({
        id: testCase.requestId,
        kind: "signing",
        payload: {
          requestId: testCase.requestId,
          chainFamily: testCase.payload.chainFamily,
          executionKind: testCase.payload.executionKind,
        },
      });
      expect(request.id).not.toMatch(/evm_sig|svm_sig|aa:/);

      await session.resolve(request.id, {
        kind: "signing",
        signatures: testCase.signatures,
      });

      expect(complete).toHaveBeenCalledWith(
        "POST",
        `/api/widget/v1/signing-requests/${encodeURIComponent(testCase.requestId)}`,
        {
          sessionId: `session-${testCase.label}`,
          body: { status: "signed", signatures: testCase.signatures },
        },
      );
      session.close();
    });
  }

  it("rejects route-revealing ids and AA as a chain family", async () => {
    const { session, sendMessage } = createSession("session-invalid-signing");
    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [
        {
          InlineCall: {
            type: "wallet_signing_request",
            payload: {
              requestId: "evm_sig:7",
              chainFamily: "aa",
              executionKind: "erc4337",
              signer: "0x1111111111111111111111111111111111111111",
              description: "invalid",
              payloads: [{ kind: "evm_personal", message: "0x1234" }],
            },
          },
        },
      ],
    } satisfies AomiChatResponse);

    await session.sendAsync("stage action");
    expect(session.getPendingRequests()).toEqual([]);
    session.close();
  });

  it("rejects non-UUID ids and chain/payload family mismatches", async () => {
    const { session, sendMessage } = createSession("session-invalid-shapes");
    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [
        {
          InlineCall: {
            type: "wallet_signing_request",
            payload: {
              requestId: "sign:not-a-uuid",
              chainFamily: "evm",
              executionKind: "message",
              signer: "0x1111111111111111111111111111111111111111",
              description: "invalid id",
              payloads: [{ kind: "evm_personal", message: "0x1234" }],
            },
          },
        },
        {
          InlineCall: {
            type: "wallet_signing_request",
            payload: {
              requestId: "sign:44444444-4444-4444-8444-444444444444",
              chainFamily: "svm",
              executionKind: "message",
              signer: "So11111111111111111111111111111111111111112",
              description: "wrong primitive family",
              payloads: [{ kind: "evm_personal", message: "0x1234" }],
            },
          },
        },
      ],
    } satisfies AomiChatResponse);

    await session.sendAsync("stage action");
    expect(session.getPendingRequests()).toEqual([]);
    session.close();
  });

  it("rejects ERC-4337 requests without complete immutable disclosure", async () => {
    const { session, sendMessage } = createSession("session-incomplete-aa");
    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [
        {
          InlineCall: {
            type: "wallet_signing_request",
            payload: {
              requestId: "sign:77777777-7777-4777-8777-777777777777",
              chainFamily: "evm",
              executionKind: "erc4337",
              signer: "0x1111111111111111111111111111111111111111",
              chainId: 8453,
              description: "Missing fee and digest disclosure",
              operationId: "77777777-7777-4777-8777-777777777777",
              executor: "0x2222222222222222222222222222222222222222",
              calls: [
                {
                  to: "0x3333333333333333333333333333333333333333",
                  value: "0",
                },
              ],
              sponsorship: "required",
              payloads: [{ kind: "evm_personal", message: "0xabcd" }],
            },
          },
        },
      ],
    } satisfies AomiChatResponse);

    await session.sendAsync("stage action");
    expect(session.getPendingRequests()).toEqual([]);
    session.close();
  });

  it("rejects malformed disclosure on non-ERC-4337 signing requests", async () => {
    const { session, sendMessage } = createSession(
      "session-invalid-transaction-disclosure",
    );
    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [
        {
          InlineCall: {
            type: "wallet_signing_request",
            payload: {
              requestId: "sign:88888888-8888-4888-8888-888888888888",
              chainFamily: "evm",
              executionKind: "transaction",
              signer: "0x1111111111111111111111111111111111111111",
              description: "Malformed optional fee disclosure",
              fees: [null],
              payloads: [{ kind: "evm_personal", message: "0xabcd" }],
            },
          },
        },
      ],
    } satisfies AomiChatResponse);

    await session.sendAsync("stage action");
    expect(session.getPendingRequests()).toEqual([]);
    session.close();
  });

  it("coalesces signing recovery while state responses are polling", async () => {
    vi.useFakeTimers();
    const { session, sendMessage, complete } = createSession(
      "session-recovery-cadence",
    );
    const recoveryCalls = () =>
      complete.mock.calls.filter(
        ([method, path]) =>
          method === "GET" && path === "/api/widget/v1/signing-requests",
      );

    await vi.runAllTicks();
    await Promise.resolve();
    expect(recoveryCalls()).toHaveLength(1);

    await session.sendAsync("first state");
    await session.sendAsync("second state");
    await session.sendAsync("third state");
    expect(sendMessage).toHaveBeenCalledTimes(3);
    expect(recoveryCalls()).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(4_999);
    expect(recoveryCalls()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(recoveryCalls()).toHaveLength(2);
    session.close();
  });

  it("rejects through the generic endpoint and keeps a request queued when completion fails", async () => {
    const { session, sendMessage, complete } = createSession(
      "session-signing-lifecycle",
    );
    const payload = cases[0].payload;
    sendMessage.mockResolvedValueOnce({
      is_processing: false,
      messages: [],
      system_events: [
        {
          InlineCall: {
            type: "wallet_signing_request",
            payload,
          },
        },
      ],
    } satisfies AomiChatResponse);

    await session.sendAsync("stage action");
    complete.mockRejectedValueOnce(new Error("completion unavailable"));
    await expect(
      session.resolve(payload.requestId, {
        kind: "signing",
        signatures: ["0xsignature"],
      }),
    ).rejects.toThrow("completion unavailable");
    expect(session.getPendingRequests()).toHaveLength(1);

    complete.mockResolvedValueOnce({});
    await session.reject(payload.requestId, "User cancelled");
    expect(complete).toHaveBeenLastCalledWith(
      "POST",
      `/api/widget/v1/signing-requests/${encodeURIComponent(payload.requestId)}`,
      {
        sessionId: "session-signing-lifecycle",
        body: { status: "rejected", reason: "User cancelled" },
      },
    );
    expect(session.getPendingRequests()).toEqual([]);
    session.close();
  });
});
