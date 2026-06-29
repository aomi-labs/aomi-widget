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
          connection: { is_connected: true },
          evm: [{ address: "0xABC", chain_id: 1 }],
        });
      });

      expect(getApi().user).toEqual({
        connection: {
          is_connected: true,
        },
        evm: [
          {
            address: "0xABC",
            chain_id: 1,
          },
        ],
        ext: undefined,
      });
    });
  });

  describe("setUser", () => {
    it("updates user state partially", async () => {
      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({ evm: [{ address: "0x123" }] });
      });

      expect(getApi().user.evm?.[0]?.address).toBe("0x123");
      expect(getApi().user.connection?.is_connected).toBe(false);

      await act(async () => {
        api.setUser({ connection: { is_connected: true } });
      });

      expect(getApi().user.evm?.[0]?.address).toBe("0x123");
      expect(getApi().user.connection?.is_connected).toBe(true);

      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          evm: [{ chain_id: 1 }],
        });
      });

      expect(getApi().user.evm?.[0]?.address).toBe("0x123");
      expect(getApi().user.evm?.[0]?.chain_id).toBe(1);
      expect(getApi().user.connection?.is_connected).toBe(true);
    });

    it("updates all user state fields", async () => {
      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          evm: [{ address: "0xDEF", chain_id: 137, ens_name: "user.eth" }],
        });
      });

      expect(getApi().user).toEqual({
        connection: {
          is_connected: true,
        },
        evm: [
          {
            address: "0xDEF",
            chain_id: 137,
            ens_name: "user.eth",
          },
        ],
        ext: undefined,
      });
    });

    it("does not send wallet state changes to empty draft threads", async () => {
      const createThread = vi.fn(async (threadId: string) => ({
        session_id: threadId,
      }));
      const postSystemMessage = vi.fn(async () => ({ res: null }));

      setAomiClientConfig({ createThread, postSystemMessage });

      const { api } = renderRuntime();

      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          evm: [{ address: "0x789", chain_id: 1 }],
        });
        await flushPromises();
      });

      expect(createThread).not.toHaveBeenCalled();
      expect(postSystemMessage).not.toHaveBeenCalled();
    });

    it("sends wallet state changes to materialized threads", async () => {
      const postSystemMessage = vi.fn(async () => ({ res: null }));

      setAomiClientConfig({ postSystemMessage });

      const { api } = renderRuntime();

      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          evm: [{ address: "0x789", chain_id: 1 }],
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

      expect(postSystemMessage).not.toHaveBeenCalled();

      await act(async () => {
        await api.sendMessage("Materialize this thread");
        await flushPromises();
      });

      await act(async () => {
        api.setUser({ evm: [{ chain_id: 137 }] });
        await flushPromises();
      });

      await waitFor(() => {
        expect(postSystemMessage).toHaveBeenCalled();
      });

      // Check the system message contains wallet state
      const call = postSystemMessage.mock.calls[0] as unknown as [
        string,
        string,
        { app?: string } | undefined,
      ];
      const messageJson = JSON.parse(call[1]);
      expect(messageJson.type).toBe("wallet:state_changed");
      expect(call[2]).toEqual({ app: "default" });
      expect(messageJson.payload.evm?.[0]?.address).toBe("0x789");
      expect(messageJson.payload.ext).toBeUndefined();
      expect(messageJson.payload.evm?.[0]?.chain_id).toBe(137);
      expect(messageJson.payload.connection.is_connected).toBe(true);
      expect(messageJson.payload.svm).toEqual({
        address: "Bv9abc",
        cluster: "solana:mainnet",
        wallet_name: "Phantom",
        transport: "extension",
        capabilities: ["can_sign_message", "can_sign_transaction"],
      });
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

      setAomiClientConfig({
        listThreads,
        createThread,
        postSystemMessage,
      });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          evm: [{ address: "0x789", chain_id: 1 }],
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
        getApi().setUser({ evm: [{ chain_id: 137 }] });
        await flushPromises();
      });

      await waitFor(() => {
        expect(postSystemMessage).toHaveBeenCalledWith(
          materializedThreadId,
          expect.any(String),
          { app: "default" },
        );
      });
    });

    it("lists EVM remote threads without calling stale account ensure", async () => {
      const ensureAccount = vi.fn(async () => undefined);
      const listThreads = vi.fn(async (): Promise<AomiThread[]> => []);

      setAomiClientConfig({ ensureAccount, listThreads });

      const { api } = renderRuntime();

      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          evm: [{ address: "0x789", chain_id: 8453 }],
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

    it("does not list remote threads for Solana-only wallets without an account address", async () => {
      const ensureAccount = vi.fn(async () => undefined);
      const listThreads = vi.fn(async (): Promise<AomiThread[]> => []);

      setAomiClientConfig({ ensureAccount, listThreads });

      const { api } = renderRuntime();

      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          svm: {
            address: "So1anaCaseSensitiveSigner",
            cluster: "solana:mainnet",
          },
        });
        await flushPromises();
      });

      expect(ensureAccount).not.toHaveBeenCalled();
      expect(listThreads).not.toHaveBeenCalled();
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
          connection: { is_connected: true },
          evm: [{ address: "0xAAA", chain_id: 1 }],
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

      await act(async () => {
        getApi().setUser({
          connection: { is_connected: true },
          evm: [{ address: "0xBBB", chain_id: 1 }],
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
          connection: { is_connected: true },
          evm: [{ address: "0xLIVE", chain_id: 8453 }],
        });
        await flushPromises();
      });

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
          evm: [
            {
              address: "0xLIVE",
              chain_id: 8453,
            },
          ],
        },
      });
    });

    it("keeps the thread counter stable when a wallet with older chat names connects", async () => {
      const listThreads = vi
        .fn<() => Promise<AomiThread[]>>()
        .mockResolvedValueOnce([
          { session_id: "wallet-a-thread", title: "Chat 9" },
        ])
        .mockResolvedValueOnce([
          { session_id: "wallet-b-thread", title: "Chat 3" },
        ]);

      setAomiClientConfig({ listThreads });

      const { api, getApi, getThreadCount } = renderRuntime();

      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          evm: [{ address: "0xAAA", chain_id: 1 }],
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

      await act(async () => {
        getApi().setUser({
          connection: { is_connected: true },
          evm: [{ address: "0xBBB", chain_id: 1 }],
        });
        await flushPromises();
      });

      await waitFor(() => {
        expect(getApi().getThreadMetadata("wallet-b-thread")?.title).toBe(
          "Chat 3",
        );
      });
      await waitFor(() => {
        expect(getThreadCount()).toBe(9);
      });
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
        api.setUser({
          connection: { is_connected: true },
          evm: [{ address: "0xABC", chain_id: 1 }],
        });
      });

      const state = api.getUserState();
      expect(state.evm?.[0]?.address).toBe("0xABC");
      expect(state.evm?.[0]?.chain_id).toBe(1);
      expect(state.connection?.is_connected).toBe(true);
    });

    it("returns fresh state on each call", async () => {
      const { api } = renderRuntime();

      const state1 = api.getUserState();

      await act(async () => {
        api.setUser({ evm: [{ address: "0x111" }] });
      });

      const state2 = api.getUserState();

      expect(state1.evm?.[0]?.address).toBeUndefined();
      expect(state2.evm?.[0]?.address).toBe("0x111");
    });
  });

  describe("onUserStateChange", () => {
    it("subscribes to user state changes", async () => {
      const { api } = renderRuntime();
      const callback = vi.fn();

      api.onUserStateChange(callback);

      await act(async () => {
        api.setUser({ evm: [{ address: "0xNEW" }] });
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          evm: expect.arrayContaining([
            expect.objectContaining({ address: "0xNEW" }),
          ]),
        }),
      );
    });

    it("returns unsubscribe function", async () => {
      const { api } = renderRuntime();
      const callback = vi.fn();

      const unsubscribe = api.onUserStateChange(callback);

      await act(async () => {
        api.setUser({ evm: [{ address: "0x001" }] });
      });

      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      await act(async () => {
        api.setUser({ evm: [{ address: "0x002" }] });
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
        api.setUser({ evm: [{ chain_id: 42 }] });
      });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it("keeps previous chain when connected updates omit chainId", async () => {
      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          evm: [{ address: "0xAAA", chain_id: 1 }],
        });
      });

      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          evm: [{ chain_id: undefined }],
        });
      });

      expect(getApi().user.evm?.[0]?.address).toBe("0xAAA");
      expect(getApi().user.evm?.[0]?.chain_id).toBe(1);
      expect(getApi().user.connection?.is_connected).toBe(true);
    });
  });

  describe("wallet connection flow", () => {
    it("handles connect -> disconnect cycle", async () => {
      const { api, getApi } = renderRuntime();

      // Connect
      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          evm: [{ address: "0xWALLET", chain_id: 1, ens_name: "wallet.eth" }],
        });
      });

      expect(getApi().user.connection?.is_connected).toBe(true);
      expect(getApi().user.evm?.[0]?.address).toBe("0xWALLET");

      // Disconnect
      await act(async () => {
        api.setUser({
          connection: { is_connected: false },
          evm: [
            { address: undefined, chain_id: undefined, ens_name: undefined },
          ],
        });
      });

      expect(getApi().user.connection?.is_connected).toBe(false);
      expect(getApi().user.evm?.[0]?.address).toBeUndefined();
    });

    it("clears wallet identity on partial disconnect updates", async () => {
      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          evm: [{ address: "0xWALLET", chain_id: 1, ens_name: "wallet.eth" }],
        });
      });

      await act(async () => {
        api.setUser({ connection: { is_connected: false } });
      });

      expect(getApi().user.connection?.is_connected).toBe(false);
      expect(getApi().user.evm?.[0]?.address).toBeUndefined();
      expect(getApi().user.evm?.[0]?.chain_id).toBeUndefined();
      expect(getApi().user.evm?.[0]?.ens_name).toBeUndefined();
    });

    it("handles chain switching", async () => {
      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          evm: [{ address: "0xUSER", chain_id: 1 }], // Mainnet
        });
      });

      expect(getApi().user.evm?.[0]?.chain_id).toBe(1);

      await act(async () => {
        api.setUser({ evm: [{ chain_id: 137 }] }); // Polygon
      });

      expect(getApi().user.evm?.[0]?.chain_id).toBe(137);
      expect(getApi().user.evm?.[0]?.address).toBe("0xUSER");
    });
  });
});
