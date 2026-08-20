/**
 * User API Tests
 *
 * Tests for user state management:
 * - user state
 * - setUser
 * - getUserState
 * - onUserStateChange
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, waitFor } from "@testing-library/react";

import {
  renderRuntime,
  resetAomiClientMocks,
  setAomiClientConfig,
  flushPromises,
} from "./test-harness";
import type { AomiThread } from "@aomi-labs/client";

beforeEach(() => {
  resetAomiClientMocks();
});

afterEach(() => {
  cleanup();
});

describe("User API", () => {
  describe("user state", () => {
    it("initializes with default disconnected state", () => {
      const { api } = renderRuntime();

      expect(api.user).toEqual({
        connection: {
          is_connected: false,
        },
        ext: undefined,
      });
    });

    it("reflects current user state", async () => {
      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({
          address: "0xABC",
          chainId: 1,
          isConnected: true,
        });
      });

      expect(getApi().user).toEqual({
        connection: {
          is_connected: true,
        },
        evm: {
          address: "0xABC",
          chain_id: 1,
        },
        ext: undefined,
      });
    });
  });

  describe("setUser", () => {
    it("updates user state partially", async () => {
      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0x123" });
      });

      expect(getApi().user.evm?.address).toBe("0x123");
      expect(getApi().user.connection?.is_connected).toBe(false);

      await act(async () => {
        api.setUser({ isConnected: true });
      });

      expect(getApi().user.evm?.address).toBe("0x123");
      expect(getApi().user.connection?.is_connected).toBe(true);

      await act(async () => {
        api.setUser({ chainId: 1, isConnected: true });
      });

      expect(getApi().user.evm?.address).toBe("0x123");
      expect(getApi().user.evm?.chain_id).toBe(1);
      expect(getApi().user.connection?.is_connected).toBe(true);
    });

    it("notifies live wallet connection transitions", async () => {
      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({
          address: "0x123",
          chainId: 1,
          isConnected: true,
        });
        await flushPromises();
      });

      expect(getApi().notifications).toEqual([
        expect.objectContaining({
          type: "wallet",
          title: "Wallet connected",
        }),
      ]);

      await act(async () => {
        getApi().clearAllNotifications();
      });
      await act(async () => {
        getApi().setUser({ isConnected: false });
        await flushPromises();
      });

      expect(getApi().notifications).toEqual([
        expect.objectContaining({
          type: "wallet",
          title: "Wallet disconnected",
        }),
      ]);
    });

    it("updates all user state fields", async () => {
      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({
          address: "0xDEF",
          chainId: 137,
          isConnected: true,
          ensName: "user.eth",
        });
      });

      expect(getApi().user).toEqual({
        connection: {
          is_connected: true,
        },
        evm: {
          address: "0xDEF",
          chain_id: 137,
          ens_name: "user.eth",
        },
        ext: undefined,
      });
    });

    it("prewarms empty drafts without a legacy wallet callback", async () => {
      const createThread = vi.fn(async (threadId: string) => ({
        session_id: threadId,
      }));
      const postSystemMessage = vi.fn(async () => ({ res: null }));

      setAomiClientConfig({ createThread, postSystemMessage });

      const { api } = renderRuntime();

      await waitFor(() => expect(createThread).toHaveBeenCalled());

      await act(async () => {
        api.setUser({
          address: "0x789",
          chainId: 1,
          isConnected: true,
        });
        await flushPromises();
      });

      expect(createThread).toHaveBeenCalledWith(api.currentThreadId);
      expect(postSystemMessage).not.toHaveBeenCalled();
    });

    it("carries the latest wallet state on the next Agent send", async () => {
      const postSystemMessage = vi.fn(async () => ({ res: null }));
      const postChatMessage = vi.fn(async () => ({
        is_processing: false,
        messages: [],
      }));

      setAomiClientConfig({ postSystemMessage, postChatMessage });

      const { api } = renderRuntime();

      await act(async () => {
        api.setUser({
          address: "0x789",
          chainId: 1,
          isConnected: true,
          connection: {
            is_connected: true,
            provider: "para",
            provider_label: "Para",
            primary_family: "svm",
            wallet_provider_subject: "provider-subject",
            auth_method: "email",
            auth_value: "wallet@example.com",
            auth_verified_at: 1_777_777_777,
          },
          svm: {
            address: "Bv9abc",
            cluster: "solana:mainnet",
            wallet_name: "Phantom",
            transport: "extension",
            capabilities: ["can_sign_message", "can_sign_transaction"],
          },
        });
        await flushPromises();
      });

      await act(async () => {
        await api.sendMessage("Materialize this thread");
        await flushPromises();
      });

      await act(async () => {
        api.setUser({ chainId: 137 });
        await flushPromises();
      });

      await act(async () => {
        await api.sendMessage("Use the updated wallet");
      });

      expect(postSystemMessage).not.toHaveBeenCalled();
      expect(postChatMessage).toHaveBeenLastCalledWith(
        api.currentThreadId,
        "Use the updated wallet",
        expect.objectContaining({
          userState: expect.objectContaining({
            connection: expect.objectContaining({ is_connected: true }),
            evm: expect.objectContaining({ address: "0x789", chain_id: 137 }),
            svm: expect.objectContaining({
              address: "Bv9abc",
              cluster: "solana:mainnet",
            }),
          }),
        }),
      );
    });

    it("does not issue a legacy callback for wallet-only updates", async () => {
      const postSystemMessage = vi.fn(async () => {
        throw new Error("legacy callback must remain unused");
      });

      setAomiClientConfig({ postSystemMessage });

      const { api } = renderRuntime();

      await act(async () => {
        api.setUser({ chainId: 5042002 });
        await flushPromises();
      });

      expect(postSystemMessage).not.toHaveBeenCalled();
    });

    it("keeps a materialized thread remote after a stale list fetch resolves", async () => {
      let resolveListThreads:
        | ((threads: AomiThread[] | PromiseLike<AomiThread[]>) => void)
        | undefined;
      const listThreads = vi.fn(
        () =>
          new Promise<AomiThread[]>((resolve) => {
            resolveListThreads = resolve;
          }),
      );
      const createThread = vi.fn(async (threadId: string) => ({
        session_id: threadId,
      }));
      const postSystemMessage = vi.fn(async () => ({ res: null }));
      const postChatMessage = vi.fn(async () => ({
        is_processing: false,
        messages: [],
      }));

      setAomiClientConfig({
        listThreads,
        createThread,
        postSystemMessage,
        postChatMessage,
      });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({
          address: "0x789",
          chainId: 1,
          isConnected: true,
        });
        await flushPromises();
      });

      await waitFor(() => {
        expect(listThreads).toHaveBeenCalledWith(
          expect.stringMatching(/^control:/),
        );
      });

      await act(async () => {
        await getApi().sendMessage("Materialize during list fetch");
      });
      const materializedThreadId = getApi().currentThreadId;

      await act(async () => {
        resolveListThreads?.([]);
        await flushPromises();
      });

      await act(async () => {
        getApi().setUser({ chainId: 137 });
        await flushPromises();
        await getApi().sendMessage("Continue after stale list");
      });

      expect(getApi().currentThreadId).toBe(materializedThreadId);
      expect(postSystemMessage).not.toHaveBeenCalled();
      expect(postChatMessage).toHaveBeenLastCalledWith(
        materializedThreadId,
        "Continue after stale list",
        expect.objectContaining({
          userState: expect.objectContaining({
            evm: expect.objectContaining({ chain_id: 137 }),
          }),
        }),
      );
    });

    it("lists EVM remote threads without calling stale account ensure", async () => {
      const ensureAccount = vi.fn(async () => undefined);
      const listThreads = vi.fn(async (): Promise<AomiThread[]> => []);

      setAomiClientConfig({ ensureAccount, listThreads });

      const { api } = renderRuntime();

      await act(async () => {
        api.setUser({
          address: "0x789",
          chainId: 8453,
          isConnected: true,
        });
        await flushPromises();
      });

      await waitFor(() => {
        expect(listThreads).toHaveBeenCalled();
      });
      expect(ensureAccount).not.toHaveBeenCalled();
      expect(listThreads).toHaveBeenCalledWith(
        expect.stringMatching(/^control:/),
      );
    });

    it("lists remote threads for Solana-only account state without a legacy public_key", async () => {
      const ensureAccount = vi.fn(async () => undefined);
      const listThreads = vi.fn(async (): Promise<AomiThread[]> => []);

      setAomiClientConfig({ ensureAccount, listThreads });

      const { api } = renderRuntime();

      await act(async () => {
        api.setUser({
          connection: { is_connected: true, primary_family: "svm" },
          svm: {
            address: "So1anaCaseSensitiveSigner",
            cluster: "solana:mainnet",
          },
        });
        await flushPromises();
      });

      expect(ensureAccount).not.toHaveBeenCalled();
      expect(listThreads).toHaveBeenCalledWith(
        expect.stringMatching(/^control:/),
      );
    });

    it("does not send wallet state changes to the previous wallet thread when the address changes", async () => {
      const listThreads = vi
        .fn<() => Promise<AomiThread[]>>()
        .mockResolvedValueOnce([
          { session_id: "wallet-a-thread", title: "Wallet A Thread" },
        ])
        .mockResolvedValueOnce([
          { session_id: "wallet-b-thread", title: "Wallet B Thread" },
        ]);
      const postSystemMessage = vi.fn(async () => ({ res: null }));

      setAomiClientConfig({
        listThreads,
        postSystemMessage,
      });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({
          address: "0xAAA",
          chainId: 1,
          isConnected: true,
        });
        await flushPromises();
      });

      await waitFor(() => {
        expect(getApi().getThreadMetadata("wallet-a-thread")?.title).toBe(
          "Wallet A Thread",
        );
      });

      await act(async () => {
        getApi().selectThread("wallet-a-thread");
        await flushPromises();
      });

      postSystemMessage.mockClear();

      await act(async () => {
        getApi().setUser({
          address: "0xBBB",
          chainId: 1,
          isConnected: true,
        });
        await flushPromises();
      });

      expect(postSystemMessage).not.toHaveBeenCalled();
    });

    it("answers user_state_request with the live connected wallet state", async () => {
      const postSystemMessage = vi.fn(async () => ({ res: null }));

      setAomiClientConfig({
        sendMessage: async () => ({
          is_processing: false,
          messages: [],
          user_state: {
            connection: {
              is_connected: false,
            },
          },
          system_events: [
            {
              InlineCall: {
                type: "user_state_request",
              },
            },
          ],
        }),
        postSystemMessage,
      });

      const { api } = renderRuntime();

      await act(async () => {
        api.setUser({
          address: "0xLIVE",
          chainId: 8453,
          isConnected: true,
        });
        await flushPromises();
      });

      postSystemMessage.mockClear();

      await act(async () => {
        await api.sendMessage("hello");
        await flushPromises();
      });

      await waitFor(() => {
        expect(postSystemMessage).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          { app: "default" },
        );
      });

      const [, message] = postSystemMessage.mock.calls[0] as [string, string];
      expect(JSON.parse(message)).toEqual({
        type: "user_state_response",
        payload: {
          connection: {
            is_connected: true,
          },
          evm: {
            address: "0xLIVE",
            chain_id: 8453,
          },
        },
      });
    });

    it("keeps the thread counter stable when a wallet with older chat names connects", async () => {
      const listThreads = vi
        .fn<() => Promise<AomiThread[]>>()
        .mockResolvedValue([
          { session_id: "wallet-a-thread", title: "Chat 9" },
        ]);

      setAomiClientConfig({ listThreads });

      const { api, getApi, getThreadCount } = renderRuntime();

      await act(async () => {
        api.setUser({
          address: "0xAAA",
          chainId: 1,
          isConnected: true,
        });
        await flushPromises();
      });

      await waitFor(() => {
        expect(getApi().getThreadMetadata("wallet-a-thread")?.title).toBe(
          "Chat 9",
        );
      });
      await waitFor(() => {
        expect(getThreadCount()).toBe(9);
      });

      await waitFor(() => {
        expect(getThreadCount()).toBe(9);
      });
      expect(listThreads).toHaveBeenCalledTimes(1);
    });
  });

  describe("ext helpers", () => {
    it("adds and removes ext values without manual deep merge", async () => {
      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.addExtValue("SIMMER_API_KEY", "sk_123");
        api.addExtValue("PARA_API_KEY", "para_123");
      });

      expect(getApi().user.ext).toEqual({
        SIMMER_API_KEY: "sk_123",
        PARA_API_KEY: "para_123",
      });

      await act(async () => {
        api.removeExtValue("PARA_API_KEY");
      });
      expect(getApi().user.ext).toEqual({
        SIMMER_API_KEY: "sk_123",
      });

      await act(async () => {
        api.removeExtValue("SIMMER_API_KEY");
      });
      expect(getApi().user.ext).toBeUndefined();
    });

    it("does not send wallet state change to backend for ext-only updates", async () => {
      const postSystemMessage = vi.fn(async () => ({ res: null }));
      setAomiClientConfig({ postSystemMessage });

      const { api } = renderRuntime();

      await act(async () => {
        api.addExtValue("SIMMER_API_KEY", "sk_123");
        await flushPromises();
      });

      expect(postSystemMessage).not.toHaveBeenCalled();

      await act(async () => {
        api.removeExtValue("SIMMER_API_KEY");
        await flushPromises();
      });

      expect(postSystemMessage).not.toHaveBeenCalled();
    });
  });

  describe("getUserState", () => {
    it("returns current user state synchronously", async () => {
      const { api } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0xABC", chainId: 1, isConnected: true });
      });

      const state = api.getUserState();
      expect(state.evm?.address).toBe("0xABC");
      expect(state.evm?.chain_id).toBe(1);
      expect(state.connection?.is_connected).toBe(true);
    });

    it("returns fresh state on each call", async () => {
      const { api } = renderRuntime();

      const state1 = api.getUserState();

      await act(async () => {
        api.setUser({ address: "0x111" });
      });

      const state2 = api.getUserState();

      expect(state1.evm?.address).toBeUndefined();
      expect(state2.evm?.address).toBe("0x111");
    });
  });

  describe("onUserStateChange", () => {
    it("subscribes to user state changes", async () => {
      const { api } = renderRuntime();
      const callback = vi.fn();

      api.onUserStateChange(callback);

      await act(async () => {
        api.setUser({ address: "0xNEW" });
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          evm: expect.objectContaining({ address: "0xNEW" }),
        }),
      );
    });

    it("returns unsubscribe function", async () => {
      const { api } = renderRuntime();
      const callback = vi.fn();

      const unsubscribe = api.onUserStateChange(callback);

      await act(async () => {
        api.setUser({ address: "0x001" });
      });

      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      await act(async () => {
        api.setUser({ address: "0x002" });
      });

      // Should not be called after unsubscribe
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("supports multiple subscribers", async () => {
      const { api } = renderRuntime();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      api.onUserStateChange(callback1);
      api.onUserStateChange(callback2);

      await act(async () => {
        api.setUser({ chainId: 42 });
      });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it("keeps previous chain when connected updates omit chainId", async () => {
      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({
          address: "0xAAA",
          chainId: 1,
          isConnected: true,
        });
      });

      await act(async () => {
        api.setUser({ isConnected: true, chainId: undefined });
      });

      expect(getApi().user.evm?.address).toBe("0xAAA");
      expect(getApi().user.evm?.chain_id).toBe(1);
      expect(getApi().user.connection?.is_connected).toBe(true);
    });
  });

  describe("wallet connection flow", () => {
    it("handles connect -> disconnect cycle", async () => {
      const { api, getApi } = renderRuntime();

      // Connect
      await act(async () => {
        api.setUser({
          address: "0xWALLET",
          chainId: 1,
          isConnected: true,
          ensName: "wallet.eth",
        });
      });

      expect(getApi().user.connection?.is_connected).toBe(true);
      expect(getApi().user.evm?.address).toBe("0xWALLET");

      // Disconnect
      await act(async () => {
        api.setUser({
          address: undefined,
          chainId: undefined,
          isConnected: false,
          ensName: undefined,
        });
      });

      expect(getApi().user.connection?.is_connected).toBe(false);
      expect(getApi().user.evm?.address).toBeUndefined();
    });

    it("clears wallet identity on partial disconnect updates", async () => {
      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({
          address: "0xWALLET",
          chainId: 1,
          isConnected: true,
          ensName: "wallet.eth",
        });
      });

      await act(async () => {
        api.setUser({ isConnected: false });
      });

      expect(getApi().user.connection?.is_connected).toBe(false);
      expect(getApi().user.evm?.address).toBeUndefined();
      expect(getApi().user.evm?.chain_id).toBe(1);
      expect(getApi().user.evm?.ens_name).toBeUndefined();
    });

    it("handles chain switching", async () => {
      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({
          address: "0xUSER",
          chainId: 1, // Mainnet
          isConnected: true,
        });
      });

      expect(getApi().user.evm?.chain_id).toBe(1);

      await act(async () => {
        api.setUser({ chainId: 137 }); // Polygon
      });

      expect(getApi().user.evm?.chain_id).toBe(137);
      expect(getApi().user.evm?.address).toBe("0xUSER");
    });
  });
});
