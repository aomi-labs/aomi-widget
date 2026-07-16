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
