import { describe, expect, it, vi } from "vitest";

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

describe("CLI chat wallet sync", () => {
  it("treats a base58 --public-key as SVM in an SVM cluster context", () => {
    expect(
      resolveSvmAddressForChat(
        createConfig({ app: "svm", svmCluster: "solana:devnet" }),
        "J2w7ZT5Wd4ACuQAH3dmzjWoRhaqejMRoMRL4C7Qbg5Ks",
        undefined,
        undefined,
      ),
    ).toBe("J2w7ZT5Wd4ACuQAH3dmzjWoRhaqejMRoMRL4C7Qbg5Ks");
  });

  it("treats a base58 --public-key as SVM in the default dual-chain app", () => {
    expect(
      resolveSvmAddressForChat(
        createConfig(),
        "J2w7ZT5Wd4ACuQAH3dmzjWoRhaqejMRoMRL4C7Qbg5Ks",
        undefined,
        undefined,
      ),
    ).toBe("J2w7ZT5Wd4ACuQAH3dmzjWoRhaqejMRoMRL4C7Qbg5Ks");
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

  it("syncs user_state before chat", async () => {
    const resolveUserState = vi.fn();
    const syncUserState = vi.fn().mockResolvedValue(undefined);

    await syncWalletStateForChat(
      createConfig({ privateKey: "0xabc" }),
      { publicKey: "0xold", chainId: 1 },
      { publicKey: "0xnew", chainId: 8453 },
      {
        sessionId: "session-1",
        toState: () => ({ accountBearer: "token" }),
      } as never,
      {
        resolveUserState,
        syncUserState,
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
    expect(syncUserState).toHaveBeenCalledTimes(1);
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
        svmCluster: "solana:devnet",
        toState: () => ({}),
      } as never,
      {
        resolveUserState,
        syncUserState,
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

  it("does not sync when chainId is missing", async () => {
    const resolveUserState = vi.fn();
    const syncUserState = vi.fn().mockResolvedValue(undefined);

    await syncWalletStateForChat(
      createConfig({ privateKey: "0xabc" }),
      { publicKey: "0xold", chainId: 1 },
      { publicKey: "0xnew" },
      { sessionId: "session-1" } as never,
      {
        resolveUserState,
        syncUserState,
      },
    );

    expect(resolveUserState).not.toHaveBeenCalled();
    expect(syncUserState).not.toHaveBeenCalled();
  });
});
