// @vitest-environment node
//
// `@solana/web3.js` deserializes via `@solana/buffer-layout`, whose runtime
// `instanceof Uint8Array` check fails under jsdom's Buffer polyfill. The
// signing path here is pure-Node by design — the CLI never ships in a
// browser — so pin this test to the node env.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import bs58 from "bs58";

// Real keypair + real legacy transaction — round-trip exercises the actual
// `@solana/web3.js` deserialize / sign / serialize path. The CLI mocks
// only the backend HTTP surface and on-disk session state.
const SIGNER_KP = Keypair.generate();
const SIGNER_PUBKEY = SIGNER_KP.publicKey.toBase58();
const SIGNER_SECRET_BS58 = bs58.encode(SIGNER_KP.secretKey);

function buildUnsignedLegacyTxBase64(): string {
  // 32 bytes of zeros base58-encoded → a placeholder blockhash. The real
  // signer in our CLI doesn't broadcast, so an unverifiable blockhash is
  // fine for the sign/serialize round trip.
  const blockhash = bs58.encode(new Uint8Array(32));
  const tx = new Transaction({
    feePayer: SIGNER_KP.publicKey,
    recentBlockhash: blockhash,
  });
  tx.add(
    SystemProgram.transfer({
      fromPubkey: SIGNER_KP.publicKey,
      toPubkey: new PublicKey("11111111111111111111111111111112"),
      lamports: 1,
    }),
  );
  const bytes = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  return Buffer.from(bytes).toString("base64");
}

const UNSIGNED_BASE64 = buildUnsignedLegacyTxBase64();

const mocks = vi.hoisted(() => ({
  fetchState: vi.fn(),
  sendSystemMessage: vi.fn(),
  syncUserState: vi.fn(),
  resolveWallet: vi.fn(),
  close: vi.fn(),
  readState: vi.fn(),
  syncPendingTxsFromUserState: vi.fn(),
  writeState: vi.fn(),
  addSignedSolTx: vi.fn(),
}));

vi.mock("../../src/session", () => ({
  ClientSession: class MockClientSession {
    client = {
      fetchState: mocks.fetchState,
      sendSystemMessage: mocks.sendSystemMessage,
    };

    resolveUserState = vi.fn();
    resolveWallet = mocks.resolveWallet;
    syncUserState = mocks.syncUserState;
    close = mocks.close;
  },
}));

vi.mock("../../src/cli/state", async () => {
  const actual = await vi.importActual<typeof import("../../src/cli/state")>(
    "../../src/cli/state",
  );
  return {
    ...actual,
    readState: mocks.readState,
    syncPendingTxsFromUserState: mocks.syncPendingTxsFromUserState,
    writeState: mocks.writeState,
    addSignedSolTx: mocks.addSignedSolTx,
  };
});

import { signCommand } from "../../src/cli/commands/wallet";

function seedSolanaPending(): void {
  mocks.fetchState.mockResolvedValue({
    user_state: {
      address: "0x9999999999999999999999999999999999999999",
      chain_id: 1,
      is_connected: true,
      svm_address: SIGNER_PUBKEY,
      pending_solana_txs: {
        "5": {
          signer: SIGNER_PUBKEY,
          cluster: "solana:devnet",
          description: "test swap",
          unsigned_tx: UNSIGNED_BASE64,
        },
      },
    },
  });
  mocks.syncUserState.mockResolvedValue({
    user_state: {
      address: "0x9999999999999999999999999999999999999999",
      chain_id: 1,
      is_connected: true,
      svm_address: SIGNER_PUBKEY,
      pending_solana_txs: {},
    },
  });
  mocks.syncPendingTxsFromUserState.mockImplementation((state) => ({
    pendingTxs: state.pendingTxs ?? [],
    pendingSolTxs: state.pendingSolTxs ?? [],
  }));
  mocks.readState.mockReturnValue({
    sessionId: "session-solana-cli",
    baseUrl: "http://127.0.0.1:8080",
    app: "default",
    apiKey: "test-key",
    publicKey: undefined,
    privateKey: undefined,
    chainId: 1,
    pendingTxs: [],
    pendingSolTxs: [
      {
        id: "tx-5",
        solanaId: 5,
        description: "test swap",
        unsignedTx: UNSIGNED_BASE64,
        cluster: "solana:devnet",
        signer: SIGNER_PUBKEY,
        timestamp: Date.now(),
        payload: {
          pending_solana_id: 5,
          pendingSolanaId: 5,
          unsigned_tx: UNSIGNED_BASE64,
          unsignedTx: UNSIGNED_BASE64,
          cluster: "solana:devnet",
          description: "test swap",
          signer: SIGNER_PUBKEY,
        },
      },
    ],
    signedTxs: [],
    signedSolTxs: [],
  });
}

describe("CLI wallet sign — solana_sign branch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedSolanaPending();
  });

  it("signs a base64 unsigned tx and posts wallet::solana_sign_complete", async () => {
    await signCommand(
      {
        baseUrl: "http://127.0.0.1:8080",
        app: "default",
        apiKey: "test-key",
        solanaPrivateKey: SIGNER_SECRET_BS58,
        secrets: {},
      },
      ["tx-5"],
    );

    expect(mocks.sendSystemMessage).toHaveBeenCalledTimes(1);
    const [sessionId, body] = mocks.sendSystemMessage.mock.calls[0];
    expect(sessionId).toBe("session-solana-cli");

    const event = JSON.parse(body) as {
      type: string;
      payload: { status: string; signed_tx: string; pending_solana_id: number };
    };
    expect(event.type).toBe("wallet::solana_sign_complete");
    expect(event.payload.status).toBe("signed");
    expect(event.payload.pending_solana_id).toBe(5);
    expect(typeof event.payload.signed_tx).toBe("string");
    // Real signed bytes — round-trip must be deserializable as a legacy tx
    // and carry the signer's signature on the fee-payer slot.
    const signedBytes = Buffer.from(event.payload.signed_tx, "base64");
    const reread = Transaction.from(signedBytes);
    expect(reread.signatures).toHaveLength(1);
    expect(reread.signatures[0].publicKey.toBase58()).toBe(SIGNER_PUBKEY);
    expect(reread.signatures[0].signature).not.toBeNull();
  });

  it("persists a signed_tx record locally with the canonical fields", async () => {
    await signCommand(
      {
        baseUrl: "http://127.0.0.1:8080",
        app: "default",
        apiKey: "test-key",
        solanaPrivateKey: SIGNER_SECRET_BS58,
        secrets: {},
      },
      ["tx-5"],
    );

    // CliSession.addSignedSolTx() flushes via writeState(); the mock
    // receives the entire session-state snapshot. Pull out the latest
    // write that contains a signedSolTxs entry for tx-5 and assert its
    // shape — kept on a separate `signedSolTxs` array, not co-mingled
    // with EVM `signedTxs`.
    expect(mocks.writeState).toHaveBeenCalled();
    const writtenStates = mocks.writeState.mock.calls.map(([state]) => state);
    const signedRecord = writtenStates
      .flatMap((state) => state.signedSolTxs ?? [])
      .find((tx: { id: string }) => tx.id === "tx-5");
    expect(signedRecord).toBeDefined();
    expect(signedRecord.cluster).toBe("solana:devnet");
    expect(signedRecord.signer).toBe(SIGNER_PUBKEY);
    expect(typeof signedRecord.signedTx).toBe("string");
    expect(signedRecord.signedTx.length).toBeGreaterThan(0);
  });

  it("reads SOLANA_PRIVATE_KEY from env when no flag is passed", async () => {
    const prev = process.env.SOLANA_PRIVATE_KEY;
    process.env.SOLANA_PRIVATE_KEY = SIGNER_SECRET_BS58;
    try {
      await signCommand(
        {
          baseUrl: "http://127.0.0.1:8080",
          app: "default",
          apiKey: "test-key",
          secrets: {},
        },
        ["tx-5"],
      );
      expect(mocks.sendSystemMessage).toHaveBeenCalledTimes(1);
    } finally {
      if (prev === undefined) {
        delete process.env.SOLANA_PRIVATE_KEY;
      } else {
        process.env.SOLANA_PRIVATE_KEY = prev;
      }
    }
  });

  it("aborts when no Solana keypair is available", async () => {
    await expect(
      signCommand(
        {
          baseUrl: "http://127.0.0.1:8080",
          app: "default",
          apiKey: "test-key",
          secrets: {},
        },
        ["tx-5"],
      ),
    ).rejects.toThrow();

    expect(mocks.sendSystemMessage).not.toHaveBeenCalled();
  });

  it("rejects mixed solana + EVM batches", async () => {
    // Sticky override (not Once): reload() inside syncPendingFromUserState
    // re-reads state, so the mixed-fixture has to survive multiple reads.
    mocks.readState.mockReturnValue({
      sessionId: "session-solana-cli",
      baseUrl: "http://127.0.0.1:8080",
      app: "default",
      apiKey: "test-key",
      pendingTxs: [
        {
          id: "tx-6",
          kind: "transaction",
          txId: 6,
          to: "0x1111111111111111111111111111111111111111",
          chainId: 1,
          timestamp: Date.now(),
          payload: { txId: 6 },
        },
      ],
      pendingSolTxs: [
        {
          id: "tx-5",
          solanaId: 5,
          unsignedTx: UNSIGNED_BASE64,
          cluster: "solana:devnet",
          timestamp: Date.now(),
          payload: {},
        },
      ],
      signedTxs: [],
      signedSolTxs: [],
    });

    await expect(
      signCommand(
        {
          baseUrl: "http://127.0.0.1:8080",
          app: "default",
          apiKey: "test-key",
          solanaPrivateKey: SIGNER_SECRET_BS58,
          secrets: {},
        },
        ["tx-5", "tx-6"],
      ),
    ).rejects.toThrow();

    expect(mocks.sendSystemMessage).not.toHaveBeenCalled();
  });
});
