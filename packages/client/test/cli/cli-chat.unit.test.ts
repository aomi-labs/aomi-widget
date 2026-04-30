import { describe, expect, it, vi } from "vitest";

import type { CliConfig } from "../../src/cli/types";
import {
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
  it("broadcasts wallet changes only when a private key-backed wallet changes", () => {
    const config = createConfig({ privateKey: "0xabc" });

    expect(
      shouldBroadcastWalletStateChange(
        config,
        null,
        { publicKey: "0x111", chainId: 1 },
      ),
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
        createConfig(),
        null,
        { publicKey: "0x111", chainId: 1 },
      ),
    ).toBe(false);

    expect(
      shouldBroadcastWalletStateChange(
        config,
        { publicKey: "0x111", chainId: 1 },
        { publicKey: "0x111" },
      ),
    ).toBe(false);
  });

  it("syncs user_state and emits wallet:state_changed before chat", async () => {
    const resolveUserState = vi.fn();
    const syncUserState = vi.fn().mockResolvedValue(undefined);
    const sendSystemMessage = vi.fn().mockResolvedValue(undefined);

    await syncWalletStateForChat(
      createConfig({ privateKey: "0xabc" }),
      { publicKey: "0xold", chainId: 1 },
      { publicKey: "0xnew", chainId: 8453 },
      { sessionId: "session-1" } as never,
      {
        resolveUserState,
        syncUserState,
        client: { sendSystemMessage },
      },
    );

    expect(resolveUserState).toHaveBeenCalledWith({
      address: "0xnew",
      chain_id: 8453,
      is_connected: true,
      ext: { client_type: "ts_cli" },
    });
    expect(syncUserState).toHaveBeenCalledTimes(1);
    expect(sendSystemMessage).toHaveBeenCalledTimes(1);
    expect(sendSystemMessage.mock.calls[0]?.[0]).toBe("session-1");
    expect(JSON.parse(sendSystemMessage.mock.calls[0]?.[1] as string)).toEqual({
      type: "wallet:state_changed",
      payload: {
        address: "0xnew",
        chainId: 8453,
        isConnected: true,
      },
    });
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
