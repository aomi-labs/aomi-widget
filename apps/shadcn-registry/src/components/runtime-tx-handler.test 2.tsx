import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runtimeState = vi.hoisted(() => ({
  user: {},
  currentThreadId: "thread-1",
  pendingWalletRequests: [] as Array<Record<string, unknown>>,
  resolveWalletRequest: vi.fn(),
  rejectWalletRequest: vi.fn(),
  startWalletRequest: vi.fn(),
  dismissWalletRequest: vi.fn(),
  simulateBatchTransactions: vi.fn(),
  showNotification: vi.fn(),
}));

const backendAaState = vi.hoisted(() => ({
  apiUrl: "https://backend.test",
  getAccountBearer: vi.fn(async () => "test-bearer"),
}));

const authState = vi.hoisted(() => ({
  identity: {
    chainId: 8453,
    svmAddress: "So11111111111111111111111111111111111111112",
    solanaWalletName: "Test Wallet",
  },
  isReady: true,
  activeFamily: "solana",
  selectedSolanaNetwork: {
    id: "solana-devnet",
    cluster: "solana:devnet",
  },
  supportedNetworks: {
    solana: [
      { id: "solana-devnet", cluster: "solana:devnet" },
      { id: "solana-mainnet", cluster: "solana:mainnet" },
    ],
  },
  selectNetwork: vi.fn(),
  solanaNetworkSwitchRequiresReconnect: false,
  signSolanaTransaction: vi.fn(),
  signSolanaMessage: vi.fn(),
  sendSolanaTransaction: vi.fn(),
  signTypedData: undefined as
    | ((payload: Record<string, unknown>) => Promise<{ signature: string }>)
    | undefined,
  signMessage: vi.fn(),
  signAaRequests: vi.fn(),
  supportedChains: [{ id: 4326, name: "MegaETH" }],
}));

vi.mock("@aomi-labs/react", () => ({
  cn: (...values: Array<string | undefined | false>) =>
    values.filter(Boolean).join(" "),
  UserState: {
    address: () => undefined,
  },
  appendFeeCallToPayload: vi.fn(),
  hydrateTxPayloadFromUserState: vi.fn((payload) => payload),
  parseChainId: vi.fn(),
  toViemSignTypedDataArgs: vi.fn(),
  toViemSignMessageArgs: vi.fn((payload: Record<string, unknown>) =>
    typeof payload.non_typed_data === "string"
      ? { message: payload.non_typed_data }
      : null,
  ),
  useAomiRuntime: () => runtimeState,
}));

vi.mock("../lib/wallet-kit", () => ({
  useAomiWalletKit: () => authState,
}));

vi.mock("../lib/wallet-kit/execution/backend-aa-context", () => ({
  useBackendAa: () => backendAaState,
}));

import { RuntimeTxHandler } from "./runtime-tx-handler";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("RuntimeTxHandler", () => {
  beforeEach(() => {
    runtimeState.user = {};
    runtimeState.currentThreadId = "thread-1";
    runtimeState.pendingWalletRequests = [];
    runtimeState.resolveWalletRequest.mockReset();
    runtimeState.rejectWalletRequest.mockReset();
    runtimeState.startWalletRequest.mockReset();
    runtimeState.dismissWalletRequest.mockReset();
    runtimeState.showNotification.mockReset();
    runtimeState.simulateBatchTransactions.mockReset();
    backendAaState.getAccountBearer.mockClear();
    // Default: awaiting_signature on read, terminal "confirmed" once signed.
    vi.spyOn(globalThis, "fetch").mockImplementation((async (
      input: RequestInfo | URL,
    ) => {
      const url = String(input);
      if (url.includes("/aa-operations/operation-1/signatures")) {
        return jsonResponse({
          operationId: "operation-1",
          state: "confirmed",
          txHashes: [],
        });
      }
      if (url.includes("/aa-operations/operation-1/reject")) {
        return jsonResponse({
          operationId: "operation-1",
          state: "rejected",
          txHashes: [],
        });
      }
      if (url.includes("/aa-operations/operation-1")) {
        return jsonResponse({
          operationId: "operation-1",
          state: "awaiting_signature",
          txHashes: [],
        });
      }
      return jsonResponse({ error: "unexpected" }, 404);
    }) as typeof fetch);
    authState.selectNetwork.mockReset();
    authState.signSolanaTransaction.mockReset();
    authState.signSolanaMessage.mockReset();
    authState.sendSolanaTransaction.mockReset();
    authState.signTypedData = undefined;
    authState.signMessage.mockReset();
    authState.signAaRequests.mockReset();
    authState.selectedSolanaNetwork = {
      id: "solana-devnet",
      cluster: "solana:devnet",
    };
    authState.solanaNetworkSwitchRequiresReconnect = false;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("dispatches solana_sign requests through signSolanaTransaction", async () => {
    authState.signSolanaTransaction.mockResolvedValue({
      signedTx: "SIGNED_TX",
    });
    runtimeState.pendingWalletRequests = [
      {
        id: "solana_sign-7",
        kind: "solana_sign",
        payload: {
          unsignedTx: "AQID",
          description: "Swap 1 USDC for SOL",
          cluster: "solana:devnet",
          pendingSolanaId: 7,
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(authState.signSolanaTransaction).toHaveBeenCalledWith({
        unsignedTx: "AQID",
        description: "Swap 1 USDC for SOL",
        cluster: "solana:devnet",
        pendingSolanaId: 7,
      });
    });
    expect(runtimeState.resolveWalletRequest).toHaveBeenCalledWith(
      "solana_sign-7",
      { kind: "solana_sign", signedTx: "SIGNED_TX" },
    );
    expect(runtimeState.rejectWalletRequest).not.toHaveBeenCalled();
  });

  it("dispatches solana_sign_message requests through signSolanaMessage", async () => {
    authState.signSolanaMessage.mockResolvedValue({ signature: "SIG_BASE64" });
    runtimeState.pendingWalletRequests = [
      {
        id: "solana_sign_message-9",
        kind: "solana_sign_message",
        payload: {
          message: "TWVtbw==",
          description: "Sign login proof",
          cluster: "solana:devnet",
          pendingSolanaId: 9,
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(authState.signSolanaMessage).toHaveBeenCalledWith({
        message: "TWVtbw==",
        description: "Sign login proof",
        cluster: "solana:devnet",
        pendingSolanaId: 9,
      });
    });
    expect(runtimeState.resolveWalletRequest).toHaveBeenCalledWith(
      "solana_sign_message-9",
      { kind: "solana_sign_message", signature: "SIG_BASE64" },
    );
    expect(runtimeState.rejectWalletRequest).not.toHaveBeenCalled();
  });

  it("accepts mainnet-beta send requests and invokes the Solana wallet", async () => {
    authState.selectedSolanaNetwork = {
      id: "solana-mainnet",
      cluster: "solana:mainnet",
    };
    authState.sendSolanaTransaction.mockResolvedValue({
      signature: "SOLANA_SIGNATURE",
    });
    runtimeState.pendingWalletRequests = [
      {
        id: "solana_send-1",
        kind: "solana_send",
        payload: {
          unsignedTx: "AQID",
          cluster: "mainnet-beta",
          pendingSolanaId: 1,
          pendingSolanaIds: [1],
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(authState.sendSolanaTransaction).toHaveBeenCalledWith({
        unsignedTx: "AQID",
        cluster: "mainnet-beta",
        pendingSolanaId: 1,
        pendingSolanaIds: [1],
      });
    });
    expect(authState.selectNetwork).not.toHaveBeenCalled();
    expect(runtimeState.resolveWalletRequest).toHaveBeenCalledWith(
      "solana_send-1",
      { kind: "solana_send", signature: "SOLANA_SIGNATURE" },
    );
    expect(runtimeState.rejectWalletRequest).not.toHaveBeenCalled();
  });

  it("rejects signing when the requested cluster requires reconnecting", async () => {
    authState.solanaNetworkSwitchRequiresReconnect = true;
    runtimeState.pendingWalletRequests = [
      {
        id: "solana_sign-10",
        kind: "solana_sign",
        payload: {
          unsignedTx: "AQID",
          cluster: "solana:mainnet",
          pendingSolanaId: 10,
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(runtimeState.rejectWalletRequest).toHaveBeenCalledWith(
        "solana_sign-10",
        expect.stringContaining("Reconnect"),
      );
    });
    expect(authState.signSolanaTransaction).not.toHaveBeenCalled();
  });

  it("signs a plain EVM message when typed-data signing is unavailable", async () => {
    authState.signMessage.mockResolvedValue({ signature: "0xsignature" });
    runtimeState.pendingWalletRequests = [
      {
        id: "eip712_sign-11",
        kind: "eip712_sign",
        payload: {
          non_typed_data: "AOMI_E2E_SAFE_SIGN",
          description: "Sign a harmless E2E message",
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(authState.signMessage).toHaveBeenCalledWith({
        non_typed_data: "AOMI_E2E_SAFE_SIGN",
        description: "Sign a harmless E2E message",
      });
    });
    expect(runtimeState.resolveWalletRequest).toHaveBeenCalledWith(
      "eip712_sign-11",
      { kind: "eip712_sign", signature: "0xsignature" },
    );
    expect(runtimeState.rejectWalletRequest).not.toHaveBeenCalled();
  });

  it("waits for explicit approval, then submits signatures to the operation endpoint", async () => {
    authState.signAaRequests.mockResolvedValue({
      signatures: [`0x${"aa".repeat(32)}`, `0x${"bb".repeat(32)}`],
    });
    runtimeState.pendingWalletRequests = [
      {
        id: "aa-operation-1",
        kind: "aa_sign",
        payload: {
          operationId: "operation-1",
          chainId: 4326,
          owner: "0x1111111111111111111111111111111111111111",
          executor: "0x2222222222222222222222222222222222222222",
          expiresAt: "2026-08-08T00:00:00Z",
          callsDigest: `0x${"cc".repeat(32)}`,
          calls: [
            { to: "0x3333333333333333333333333333333333333333", value: "0" },
          ],
          fees: [
            {
              asset: null,
              amount: "1000",
              recipient: "0x4444444444444444444444444444444444444444",
              call: {
                to: "0x4444444444444444444444444444444444444444",
                value: "1000",
              },
            },
          ],
          signatureRequests: [
            { kind: "personal_sign", message: `0x${"11".repeat(32)}` },
            { kind: "personal_sign", message: `0x${"22".repeat(32)}` },
          ],
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    expect(screen.getByText("Approve account action")).toBeInTheDocument();
    expect(screen.getByText("MegaETH")).toBeInTheDocument();
    expect(authState.signAaRequests).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Review & sign (2)" }));

    await waitFor(() => {
      expect(authState.signAaRequests).toHaveBeenCalledTimes(1);
    });

    // Signatures go to the dedicated operation endpoint, never through the
    // generic resolve channel (which no longer accepts an aa_sign result).
    await waitFor(() => {
      expect(runtimeState.dismissWalletRequest).toHaveBeenCalledWith(
        "aa-operation-1",
      );
    });
    const signaturePost = vi
      .mocked(globalThis.fetch)
      .mock.calls.find(([input]) =>
        String(input).endsWith("/aa-operations/operation-1/signatures"),
      );
    expect(signaturePost).toBeDefined();
    expect(JSON.parse(String(signaturePost?.[1]?.body))).toEqual({
      signatures: [`0x${"aa".repeat(32)}`, `0x${"bb".repeat(32)}`],
    });
    expect(runtimeState.resolveWalletRequest).not.toHaveBeenCalled();
  });

  it("rejects an AA request through the operation reject endpoint", async () => {
    runtimeState.pendingWalletRequests = [
      {
        id: "aa-operation-1",
        kind: "aa_sign",
        payload: {
          operationId: "operation-1",
          chainId: 4326,
          owner: "0x1111111111111111111111111111111111111111",
          executor: "0x2222222222222222222222222222222222222222",
          expiresAt: "2026-08-08T00:00:00Z",
          callsDigest: `0x${"cc".repeat(32)}`,
          calls: [],
          fees: [],
          signatureRequests: [
            { kind: "personal_sign", message: `0x${"11".repeat(32)}` },
          ],
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(runtimeState.dismissWalletRequest).toHaveBeenCalledWith(
        "aa-operation-1",
      );
    });
    const rejectPost = vi
      .mocked(globalThis.fetch)
      .mock.calls.find(([input]) =>
        String(input).endsWith("/aa-operations/operation-1/reject"),
      );
    expect(rejectPost).toBeDefined();
    expect(runtimeState.rejectWalletRequest).not.toHaveBeenCalled();
  });
});
