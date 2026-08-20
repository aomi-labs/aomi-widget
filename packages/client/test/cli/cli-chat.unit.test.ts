import { describe, expect, it, vi } from "vitest";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

import type { CliConfig } from "../../src/cli/types";
import {
  resolveSvmAddressForChat,
  shouldBroadcastWalletStateChange,
  syncWalletStateForChat,
} from "../../src/cli/commands/chat";

function createConfig(overrides: Partial<CliConfig> = {}): CliConfig {
  return {
    baseUrl: "https://api.aomi.dev",
    app: "default",
    secrets: {},
    ...overrides,
  };
}

// A throwaway keypair generated fresh per test run; never funded.
const TEST_KP = Keypair.generate();
const TEST_SOLANA_SECRET = bs58.encode(TEST_KP.secretKey);

describe("CLI chat wallet sync", () => {
  it("prefers the address derived from the private key over the persisted one", () => {
    expect(
      resolveSvmAddressForChat(
        "PersistedAddr11111111111111111111111111111",
        TEST_SOLANA_SECRET,
      ),
    ).toBe(TEST_KP.publicKey.toBase58());
  });

  it("falls back to the persisted address when no key is supplied", () => {
    expect(
      resolveSvmAddressForChat(
        "J2w7ZT5Wd4ACuQAH3dmzjWoRhaqejMRoMRL4C7Qbg5Ks",
        undefined,
      ),
    ).toBe("J2w7ZT5Wd4ACuQAH3dmzjWoRhaqejMRoMRL4C7Qbg5Ks");
  });

  it("resolves to undefined when neither key nor persisted address exist", () => {
    expect(resolveSvmAddressForChat(undefined, undefined)).toBeUndefined();
  });

  it("broadcasts wallet changes only when a private key-backed wallet changes", () => {
    const config = createConfig({ privateKey: "0xabc" });

    expect(
      shouldBroadcastWalletStateChange(config, null, {
        publicKey: "0x111",
        chainId: 1,
      }),
    ).toBe(true);

    expect(
      shouldBroadcastWalletStateChange(
        config,
        { publicKey: "0x111", chainId: 1 },
        { publicKey: "0x111", chainId: 1 },
      ),
    ).toBe(false);

    expect(
      shouldBroadcastWalletStateChange(
        config,
        { publicKey: "0x111", chainId: 1, aaMode: null, smartAccount: null },
        {
          publicKey: "0x111",
          chainId: 1,
          aaMode: "4337",
          smartAccount: "0x222",
        },
      ),
    ).toBe(true);

    // Wallet state must broadcast even for read-only sessions (no
    // privateKey) so backend tools like commit_message can see the
    // connected wallet. The privateKey is only required at sign time.
    expect(
      shouldBroadcastWalletStateChange(createConfig(), null, {
        publicKey: "0x111",
        chainId: 1,
      }),
    ).toBe(true);

    expect(
      shouldBroadcastWalletStateChange(
        config,
        { publicKey: "0x111", chainId: 1 },
        { publicKey: "0x111" },
      ),
    ).toBe(false);
  });

  it("stages wallet state locally for the canonical Agent start", async () => {
    const resolveUserState = vi.fn();
    const syncUserState = vi.fn().mockResolvedValue(undefined);
    const sendSystemMessage = vi.fn().mockResolvedValue(undefined);

    await syncWalletStateForChat(
      createConfig({ privateKey: "0xabc" }),
      { publicKey: "0xold", chainId: 1 },
      { publicKey: "0xnew", chainId: 8453 },
      {
        sessionId: "session-1",
        resolvedSvmCluster: () => "solana:mainnet",
        toState: () => ({ accountBearer: "token" }),
      } as never,
      {
        resolveUserState,
        syncUserState,
        client: { sendSystemMessage },
      },
    );

    expect(resolveUserState).toHaveBeenCalledWith({
      connection: {
        is_connected: true,
      },
      evm: {
        address: "0xnew",
        chain_id: 8453,
      },
      ext: { client_type: "ts_cli" },
    });
    expect(syncUserState).not.toHaveBeenCalled();
    expect(sendSystemMessage).not.toHaveBeenCalled();
  });

  it("preserves the saved SVM cluster during an EVM-only chat command", async () => {
    const resolveUserState = vi.fn();
    const syncUserState = vi.fn().mockResolvedValue(undefined);

    await syncWalletStateForChat(
      createConfig({ chain: 1 }),
      {
        publicKey: "0x1111111111111111111111111111111111111111",
        chainId: 1,
        svmAddress: undefined,
      },
      {
        publicKey: "0x1111111111111111111111111111111111111111",
        chainId: 1,
        svmAddress: "J2w7ZT5Wd4ACuQAH3dmzjWoRhaqejMRoMRL4C7Qbg5Ks",
      },
      {
        sessionId: "session-1",
        resolvedSvmCluster: (fromConfig?: string) =>
          fromConfig ?? "solana:devnet",
        toState: () => ({}),
      } as never,
      {
        resolveUserState,
        syncUserState,
        client: { sendSystemMessage: vi.fn() },
      },
    );

    expect(resolveUserState).toHaveBeenCalledWith(
      expect.objectContaining({
        svm: {
          address: "J2w7ZT5Wd4ACuQAH3dmzjWoRhaqejMRoMRL4C7Qbg5Ks",
          cluster: "solana:devnet",
        },
      }),
    );
  });

  it("never emits the legacy wallet:state_changed callback", async () => {
    const resolveUserState = vi.fn();
    const syncUserState = vi.fn().mockResolvedValue(undefined);
    const sendSystemMessage = vi.fn().mockResolvedValue(undefined);

    await syncWalletStateForChat(
      createConfig({ privateKey: "0xabc" }),
      { publicKey: "0xold", chainId: 1 },
      { publicKey: "0xnew", chainId: 8453 },
      {
        sessionId: "session-1",
        resolvedSvmCluster: () => "solana:mainnet",
        toState: () => ({}),
      } as never,
      {
        resolveUserState,
        syncUserState,
        client: { sendSystemMessage },
      },
    );

    expect(resolveUserState).toHaveBeenCalledTimes(1);
    expect(syncUserState).not.toHaveBeenCalled();
    expect(sendSystemMessage).not.toHaveBeenCalled();
  });

  it("syncs an SVM-only session with no EVM key", async () => {
    const resolveUserState = vi.fn();
    const syncUserState = vi.fn().mockResolvedValue(undefined);

    await syncWalletStateForChat(
      createConfig(),
      null,
      {
        publicKey: undefined,
        chainId: undefined,
        svmAddress: "J2w7ZT5Wd4ACuQAH3dmzjWoRhaqejMRoMRL4C7Qbg5Ks",
      },
      {
        sessionId: "session-1",
        resolvedSvmCluster: () => "solana:mainnet",
        toState: () => ({}),
      } as never,
      {
        resolveUserState,
        syncUserState,
        client: { sendSystemMessage: vi.fn() },
      },
    );

    expect(resolveUserState).toHaveBeenCalledWith({
      connection: { is_connected: true },
      svm: {
        address: "J2w7ZT5Wd4ACuQAH3dmzjWoRhaqejMRoMRL4C7Qbg5Ks",
        cluster: "solana:mainnet",
      },
      ext: { client_type: "ts_cli" },
    });
    expect(syncUserState).toHaveBeenCalledTimes(1);
  });

  it("does not sync or emit wallet:state_changed when chainId is missing", async () => {
    const resolveUserState = vi.fn();
    const syncUserState = vi.fn().mockResolvedValue(undefined);
    const sendSystemMessage = vi.fn().mockResolvedValue(undefined);

    await syncWalletStateForChat(
      createConfig({ privateKey: "0xabc" }),
      { publicKey: "0xold", chainId: 1 },
      { publicKey: "0xnew" },
      { sessionId: "session-1" } as never,
      {
        resolveUserState,
        syncUserState,
        client: { sendSystemMessage },
      },
    );

    expect(resolveUserState).not.toHaveBeenCalled();
    expect(syncUserState).not.toHaveBeenCalled();
    expect(sendSystemMessage).not.toHaveBeenCalled();
  });
});
