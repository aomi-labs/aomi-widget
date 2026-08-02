// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import bs58 from "bs58";
import nacl from "tweetnacl";
import {
  Keypair,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  executeE2ESolanaTransaction,
  executeE2EvmTransaction,
  isE2EWalletEnabled,
  mintE2EWalletCookie,
  signE2ESolanaMessage,
  verifyE2EWalletCookie,
} from "./e2e-wallet";

function enableSolanaWallet(signer: Keypair) {
  vi.stubEnv("AOMI_ENABLE_E2E_WALLET", "true");
  vi.stubEnv("AOMI_E2E_WALLET_TOKEN", "unit-test-token");
  vi.stubEnv("AOMI_E2E_EXECUTION_MODE", "real");
  vi.stubEnv(
    "AOMI_E2E_SOLANA_SIGNER_PRIVATE_KEY",
    bs58.encode(signer.secretKey),
  );
  vi.stubEnv("AOMI_E2E_SOLANA_RPC_URL", "http://127.0.0.1:8899");
}

describe("Solana E2E wallet boundary", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("mints and verifies a Solana-only seed", () => {
    const signer = Keypair.generate();
    enableSolanaWallet(signer);
    const cookie = mintE2EWalletCookie({
      svmAddress: signer.publicKey.toBase58(),
      svmCluster: "solana:devnet",
      ttlSeconds: 60,
    });
    expect(cookie).toBeTruthy();
    expect(verifyE2EWalletCookie(cookie ?? undefined)).toMatchObject({
      svmAddress: signer.publicKey.toBase58(),
      svmCluster: "solana:devnet",
    });
  });

  it("cannot be enabled in production or a Vercel deployment", () => {
    enableSolanaWallet(Keypair.generate());
    vi.stubEnv("NODE_ENV", "production");
    expect(isE2EWalletEnabled()).toBe(false);

    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(isE2EWalletEnabled()).toBe(false);
  });

  it("signs binding messages with the seeded Ed25519 key", async () => {
    const signer = Keypair.generate();
    enableSolanaWallet(signer);
    const message = new TextEncoder().encode("bind this wallet");
    const result = await signE2ESolanaMessage({
      seed: {
        svmAddress: signer.publicKey.toBase58(),
        svmCluster: "solana:devnet",
        expiresAt: Math.floor(Date.now() / 1000) + 60,
      },
      message: Buffer.from(message).toString("base64"),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        nacl.sign.detached.verify(
          message,
          Buffer.from(result.signature, "base64"),
          signer.publicKey.toBytes(),
        ),
      ).toBe(true);
    }
  });

  it("signs an unsigned versioned transaction without broadcasting", async () => {
    const signer = Keypair.generate();
    enableSolanaWallet(signer);
    const message = new TransactionMessage({
      payerKey: signer.publicKey,
      recentBlockhash: Keypair.generate().publicKey.toBase58(),
      instructions: [
        SystemProgram.transfer({
          fromPubkey: signer.publicKey,
          toPubkey: Keypair.generate().publicKey,
          lamports: 1_000_000,
        }),
      ],
    }).compileToV0Message();
    const unsigned = new VersionedTransaction(message);

    const result = await executeE2ESolanaTransaction({
      seed: {
        svmAddress: signer.publicKey.toBase58(),
        svmCluster: "solana:devnet",
        expiresAt: Math.floor(Date.now() / 1000) + 60,
      },
      payload: {
        cluster: "devnet",
        unsignedTx: Buffer.from(unsigned.serialize()).toString("base64"),
      },
      broadcast: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.signedTx) {
      const signed = VersionedTransaction.deserialize(
        Buffer.from(result.signedTx, "base64"),
      );
      expect(signed.signatures[0]?.some((byte) => byte !== 0)).toBe(true);
    }
  });

  it("refuses a non-loopback RPC", async () => {
    const signer = Keypair.generate();
    enableSolanaWallet(signer);
    vi.stubEnv(
      "AOMI_E2E_SOLANA_RPC_URL",
      "https://api.mainnet-beta.solana.com",
    );
    const result = await signE2ESolanaMessage({
      seed: {
        svmAddress: signer.publicKey.toBase58(),
        svmCluster: "solana:devnet",
        expiresAt: Math.floor(Date.now() / 1000) + 60,
      },
      message: Buffer.from("blocked").toString("base64"),
    });
    expect(result).toMatchObject({ ok: false, code: "disabled" });
  });
});

describe("EVM E2E executor fork gate", () => {
  // Anvil's well-known dev account 2 — public knowledge, never a secret.
  const DEMO_KEY =
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
  const DEMO_ADDRESS = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const OTHER_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  function enableEvmExecutor() {
    vi.stubEnv("AOMI_ENABLE_E2E_WALLET", "true");
    vi.stubEnv("AOMI_E2E_WALLET_TOKEN", "unit-test-token");
    vi.stubEnv("AOMI_E2E_EXECUTION_MODE", "real");
    vi.stubEnv("AOMI_E2E_SIGNER_PRIVATE_KEY", DEMO_KEY);
    vi.stubEnv("AOMI_E2E_RPC_URL_1", "http://127.0.0.1:59999");
  }

  function seed() {
    return {
      address: DEMO_ADDRESS as `0x${string}`,
      chainId: 1,
      expiresAt: Math.floor(Date.now() / 1000) + 60,
    };
  }

  function contractCallPayload() {
    return {
      chainId: 1,
      calls: [
        {
          to: OTHER_ADDRESS,
          value: "0x0de0b6b3a7640000",
          data: "0xa1903eab0000000000000000000000000000000000000000000000000000000000000000",
          chainId: 1,
        },
      ],
    } as never;
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("still rejects contract calls when the RPC is NOT a proven anvil fork", async () => {
    enableEvmExecutor();
    // A real RPC rejects anvil_nodeInfo — the gate must fail closed and the
    // original self-transfer-only posture must hold.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ jsonrpc: "2.0", id: 1, error: { code: -32601 } }),
      ),
    );
    const result = await executeE2EvmTransaction({
      seed: seed(),
      payload: contractCallPayload(),
    });
    expect(result).toMatchObject({ ok: false, code: "policy_rejected" });
  });

  it("fails closed when the fork probe itself errors", async () => {
    enableEvmExecutor();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connection refused");
      }),
    );
    const result = await executeE2EvmTransaction({
      seed: seed(),
      payload: contractCallPayload(),
    });
    expect(result).toMatchObject({ ok: false, code: "policy_rejected" });
  });

  it("enforces the value cap even on a proven fork", async () => {
    enableEvmExecutor();
    vi.stubEnv("AOMI_E2E_MAX_NATIVE_WEI", "1000");
    // The probe says "anvil" — but the value cap must still bind.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ jsonrpc: "2.0", id: 1, result: { forkConfig: {} } }),
      ),
    );
    const result = await executeE2EvmTransaction({
      seed: seed(),
      payload: contractCallPayload(),
    });
    expect(result).toMatchObject({ ok: false, code: "policy_rejected" });
  });
});
