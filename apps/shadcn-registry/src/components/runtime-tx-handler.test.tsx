import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const EVM_OWNER = "0x1111111111111111111111111111111111111111";
const SVM_OWNER = "So11111111111111111111111111111111111111112";

const runtimeState = vi.hoisted(() => ({
  user: {},
  pendingWalletRequests: [] as Array<Record<string, unknown>>,
  resolveWalletRequest: vi.fn(),
  rejectWalletRequest: vi.fn(),
  simulateBatchTransactions: vi.fn(),
  showNotification: vi.fn(),
}));

const walletState = vi.hoisted(() => ({
  identity: {
    address: "0x1111111111111111111111111111111111111111",
    chainId: 4326,
    svmAddress: "So11111111111111111111111111111111111111112",
  },
  isReady: true,
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
  supportedChains: [{ id: 4326, name: "MegaETH" }],
  selectNetwork: vi.fn(),
  switchChain: vi.fn(),
  solanaNetworkSwitchRequiresReconnect: false,
  signSolanaTransaction: vi.fn(),
  signSolanaMessage: vi.fn(),
  sendSolanaTransaction: vi.fn(),
  signTypedData: vi.fn(),
  signMessage: vi.fn(),
}));

vi.mock("@aomi-labs/react", () => ({
  cn: (...values: Array<string | undefined | false>) =>
    values.filter(Boolean).join(" "),
  UserState: { address: () => undefined },
  appendFeeCallToPayload: vi.fn(),
  hydrateTxPayloadFromUserState: vi.fn((payload) => payload),
  useAomiRuntime: () => runtimeState,
}));

vi.mock("../lib/wallet-kit", () => ({
  useAomiWalletKit: () => walletState,
}));

import { RuntimeTxHandler } from "./runtime-tx-handler";

describe("RuntimeTxHandler", () => {
  beforeEach(() => {
    runtimeState.pendingWalletRequests = [];
    runtimeState.resolveWalletRequest.mockReset();
    runtimeState.rejectWalletRequest.mockReset();
    runtimeState.simulateBatchTransactions.mockReset();
    runtimeState.showNotification.mockReset();
    walletState.identity.address = EVM_OWNER;
    walletState.identity.chainId = 4326;
    walletState.identity.svmAddress = SVM_OWNER;
    walletState.selectedSolanaNetwork = {
      id: "solana-devnet",
      cluster: "solana:devnet",
    };
    walletState.solanaNetworkSwitchRequiresReconnect = false;
    walletState.selectNetwork.mockReset();
    walletState.switchChain.mockReset();
    walletState.signSolanaTransaction.mockReset();
    walletState.signSolanaMessage.mockReset();
    walletState.sendSolanaTransaction.mockReset();
    walletState.signTypedData.mockReset();
    walletState.signMessage.mockReset();
  });

  afterEach(cleanup);

  it("completes an EVM message through the generic signing result", async () => {
    walletState.signMessage.mockResolvedValue({ signature: "0xsignature" });
    runtimeState.pendingWalletRequests = [
      {
        id: "sign:11111111-1111-4111-8111-111111111111",
        kind: "signing",
        payload: {
          requestId: "sign:11111111-1111-4111-8111-111111111111",
          chainFamily: "evm",
          executionKind: "message",
          signer: EVM_OWNER,
          chainId: 4326,
          description: "Sign a login proof",
          payloads: [{ kind: "evm_personal", message: "0x1234" }],
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(walletState.signMessage).toHaveBeenCalledWith({
        non_typed_data: "0x1234",
        description: "Sign a login proof",
        signer: EVM_OWNER,
        chainId: 4326,
      });
    });
    expect(runtimeState.resolveWalletRequest).toHaveBeenCalledWith(
      "sign:11111111-1111-4111-8111-111111111111",
      { kind: "signing", signatures: ["0xsignature"] },
    );
  });

  it("completes an SVM transaction through the same signing result", async () => {
    walletState.signSolanaTransaction.mockResolvedValue({
      signedTx: "SIGNED_TX",
    });
    runtimeState.pendingWalletRequests = [
      {
        id: "sign:22222222-2222-4222-8222-222222222222",
        kind: "signing",
        payload: {
          requestId: "sign:22222222-2222-4222-8222-222222222222",
          chainFamily: "svm",
          executionKind: "transaction",
          signer: SVM_OWNER,
          cluster: "solana:devnet",
          description: "Sign staged instructions",
          payloads: [{ kind: "svm_transaction", transactionBase64: "AQID" }],
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(walletState.signSolanaTransaction).toHaveBeenCalledWith({
        unsignedTx: "AQID",
        description: "Sign staged instructions",
        cluster: "solana:devnet",
      });
    });
    expect(runtimeState.resolveWalletRequest).toHaveBeenCalledWith(
      "sign:22222222-2222-4222-8222-222222222222",
      { kind: "signing", signatures: ["SIGNED_TX"] },
    );
  });

  it("selects the AA disclosure from executionKind and waits for approval", async () => {
    walletState.signMessage
      .mockResolvedValueOnce({ signature: "0xowner-signature-1" })
      .mockResolvedValueOnce({ signature: "0xowner-signature-2" });
    runtimeState.pendingWalletRequests = [
      {
        id: "sign:33333333-3333-4333-8333-333333333333",
        kind: "signing",
        payload: {
          requestId: "sign:33333333-3333-4333-8333-333333333333",
          chainFamily: "evm",
          executionKind: "erc4337",
          signer: EVM_OWNER,
          chainId: 4326,
          description: "Execute application batch",
          operationId: "operation-1",
          executor: "0x2222222222222222222222222222222222222222",
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
          sponsorship: "required",
          payloads: [
            { kind: "evm_personal", message: "0x1111" },
            { kind: "evm_personal", message: "0x2222" },
          ],
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    expect(screen.getByText("Approve account action")).toBeInTheDocument();
    expect(screen.getByText("MegaETH")).toBeInTheDocument();
    expect(walletState.signMessage).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Review & sign (2)" }));

    await waitFor(() => {
      expect(runtimeState.resolveWalletRequest).toHaveBeenCalledWith(
        "sign:33333333-3333-4333-8333-333333333333",
        {
          kind: "signing",
          signatures: ["0xowner-signature-1", "0xowner-signature-2"],
        },
      );
    });
  });

  it("rejects ERC-4337 through the generic signing endpoint", async () => {
    runtimeState.pendingWalletRequests = [
      {
        id: "sign:44444444-4444-4444-8444-444444444444",
        kind: "signing",
        payload: {
          requestId: "sign:44444444-4444-4444-8444-444444444444",
          chainFamily: "evm",
          executionKind: "erc4337",
          signer: EVM_OWNER,
          chainId: 4326,
          description: "Execute application batch",
          executor: "0x2222222222222222222222222222222222222222",
          calls: [],
          fees: [],
          payloads: [{ kind: "evm_personal", message: "0x1111" }],
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(runtimeState.rejectWalletRequest).toHaveBeenCalledWith(
        "sign:44444444-4444-4444-8444-444444444444",
        "Request rejected",
      );
    });
  });
});
