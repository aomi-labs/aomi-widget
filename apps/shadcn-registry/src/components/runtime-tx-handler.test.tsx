import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Keypair } from "@solana/web3.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const EVM_OWNER = "0x1111111111111111111111111111111111111111";
const SVM_OWNER = "So11111111111111111111111111111111111111112";

/**
 * A payer-signed v0 VersionedTransaction assembled at the byte level:
 * version prefix, header, one account (the payer), a blockhash, zero
 * instructions, zero address-table lookups. Hand-rolled because web3.js
 * message *serialization* breaks under vitest's browser-condition bundle;
 * the handler only ever *deserializes* these bytes and extracts the payer
 * signature, which no test verifies cryptographically.
 */
function signedSvmFixture() {
  const payer = Keypair.generate();
  const message = Uint8Array.from([
    0x80, // v0 message prefix
    1,
    0,
    0, // header: 1 required signature, 0 read-only signed/unsigned
    1,
    ...payer.publicKey.toBytes(),
    ...new Uint8Array(32).fill(7), // recent blockhash
    0, // instructions
    0, // address table lookups
  ]);
  const signature = new Uint8Array(64).fill(42);
  const unsigned = Uint8Array.from([1, ...new Uint8Array(64), ...message]);
  const signed = Uint8Array.from([1, ...signature, ...message]);
  return {
    owner: payer.publicKey.toBase58(),
    unsignedBase64: Buffer.from(unsigned).toString("base64"),
    signedBase64: Buffer.from(signed).toString("base64"),
    signatureBase64: Buffer.from(signature).toString("base64"),
  };
}

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

  it("completes a sign-only SVM transaction with the full signed bytes", async () => {
    const fixture = signedSvmFixture();
    walletState.identity.svmAddress = fixture.owner;
    walletState.signSolanaTransaction.mockResolvedValue({
      signedTx: fixture.signedBase64,
    });
    runtimeState.pendingWalletRequests = [
      {
        id: "sign:22222222-2222-4222-8222-222222222222",
        kind: "signing",
        payload: {
          requestId: "sign:22222222-2222-4222-8222-222222222222",
          chainFamily: "svm",
          executionKind: "transaction",
          signer: fixture.owner,
          cluster: "solana:devnet",
          description: "Sign staged instructions",
          payloads: [
            {
              kind: "svm_transaction",
              transactionBase64: fixture.unsignedBase64,
            },
          ],
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    await waitFor(() => {
      expect(walletState.signSolanaTransaction).toHaveBeenCalledWith({
        unsignedTx: fixture.unsignedBase64,
        description: "Sign staged instructions",
        cluster: "solana:devnet",
      });
    });
    // No operationId means the backend holds no sealed envelope for this
    // request: its consumer (the venue submit lane) needs the full signed
    // transaction, not just the payer's signature.
    expect(runtimeState.resolveWalletRequest).toHaveBeenCalledWith(
      "sign:22222222-2222-4222-8222-222222222222",
      { kind: "signing", signatures: [fixture.signedBase64] },
    );
  });

  it("holds a sealed SVM operation for the approval dialog", async () => {
    const fixture = signedSvmFixture();
    walletState.identity.svmAddress = fixture.owner;
    walletState.signSolanaTransaction.mockResolvedValue({
      signedTx: fixture.signedBase64,
    });
    runtimeState.pendingWalletRequests = [
      {
        id: "sign:55555555-5555-4555-8555-555555555555",
        kind: "signing",
        payload: {
          requestId: "sign:55555555-5555-4555-8555-555555555555",
          chainFamily: "svm",
          executionKind: "transaction",
          signer: fixture.owner,
          cluster: "devnet",
          description: "Execute sealed Solana batch",
          broadcaster: "hosted",
          operationId: "operation-2",
          fees: [
            {
              asset: { kind: "native" },
              amount: "5000",
              recipient: "8dHEEnEajRxLgHtSPBg1bAGNWSjooj7MK77J8ASNBrGk",
            },
          ],
          payloads: [
            {
              kind: "svm_transaction",
              transactionBase64: fixture.unsignedBase64,
            },
          ],
        },
        timestamp: Date.now(),
      },
    ];

    render(<RuntimeTxHandler />);

    expect(screen.getByText("Approve account action")).toBeInTheDocument();
    expect(walletState.signSolanaTransaction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Review & sign" }));

    await waitFor(() => {
      expect(runtimeState.resolveWalletRequest).toHaveBeenCalledWith(
        "sign:55555555-5555-4555-8555-555555555555",
        { kind: "signing", signatures: [fixture.signatureBase64] },
      );
    });
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
          expiresAt: "2026-08-14T00:00:00Z",
          callsDigest:
            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          calls: [
            { to: "0x3333333333333333333333333333333333333333", value: "0" },
          ],
          fees: [
            {
              asset: { kind: "native" },
              amount: "1000",
              recipient: "0x4444444444444444444444444444444444444444",
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
    expect(screen.getByText("Required · backend only")).toBeInTheDocument();
    expect(screen.getByText("Application calls")).toBeInTheDocument();
    expect(screen.getByText("Mandatory Aomi fees")).toBeInTheDocument();
    expect(screen.getByText("Amount: 1000")).toBeInTheDocument();
    expect(
      screen.getByText(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toBeInTheDocument();
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
          operationId: "operation-2",
          executor: "0x2222222222222222222222222222222222222222",
          expiresAt: "2026-08-14T00:00:00Z",
          callsDigest:
            "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          calls: [
            {
              to: "0x3333333333333333333333333333333333333333",
              value: "0",
            },
          ],
          fees: [
            {
              asset: {
                kind: "token",
                address: "0x5555555555555555555555555555555555555555",
              },
              amount: "1000",
              recipient: "0x4444444444444444444444444444444444444444",
            },
          ],
          sponsorship: "required",
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
