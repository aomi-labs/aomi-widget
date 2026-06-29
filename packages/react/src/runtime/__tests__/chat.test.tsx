/**
 * Chat API Tests
 *
 * Tests for chat operations.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, waitFor } from "@testing-library/react";

import {
  renderRuntime,
  resetAomiClientMocks,
  setAomiClientConfig,
} from "./test-harness";
import type { AomiChatResponse } from "@aomi-labs/client";

beforeEach(() => {
  resetAomiClientMocks();
});

afterEach(() => {
  cleanup();
});

describe("Chat API", () => {
  describe("sendMessage", () => {
    it("sends message to backend", async () => {
      const postChatMessage = vi.fn(
        async (): Promise<AomiChatResponse> => ({
          is_processing: true,
          messages: [],
        }),
      );
      setAomiClientConfig({ postChatMessage });

      const { api } = renderRuntime();

      await act(async () => {
        await api.sendMessage("Hello world");
      });

      await waitFor(() => {
        expect(postChatMessage).toHaveBeenCalled();
      });

      const call = postChatMessage.mock.calls[0] as unknown as [
        string,
        string,
        { userState?: Record<string, unknown> } | undefined,
      ];
      expect(call[1]).toBe("Hello world");
    });

    it("shows an optimistic sending message before the backend send finishes", async () => {
      let resolveChat: ((value: AomiChatResponse) => void) | undefined;
      const createThread = vi.fn();
      const postChatMessage = vi.fn(
        () =>
          new Promise<AomiChatResponse>((resolve) => {
            resolveChat = resolve;
          }),
      );
      setAomiClientConfig({ createThread, postChatMessage });

      const { api } = renderRuntime();
      let sendPromise: Promise<void>;

      await act(async () => {
        sendPromise = api.sendMessage("Slow send");
      });

      const messages = api.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        role: "user",
        metadata: {
          custom: {
            aomiOriginalText: "Slow send",
            aomiSendStatus: "sending",
          },
        },
      });
      expect(createThread).toHaveBeenCalledWith(api.currentThreadId);
      expect(postChatMessage).toHaveBeenCalled();

      await act(async () => {
        resolveChat?.({ is_processing: false, messages: [] });
        await sendPromise!;
      });
    });

    it("marks the optimistic message as failed when sending fails", async () => {
      setAomiClientConfig({
        postChatMessage: vi.fn(async () => {
          throw new Error("network down");
        }),
      });

      const { api } = renderRuntime();

      await act(async () => {
        await expect(api.sendMessage("Retry me")).rejects.toThrow(
          "network down",
        );
      });

      expect(api.getMessages()).toHaveLength(1);
      expect(api.getMessages()[0]).toMatchObject({
        role: "user",
        metadata: {
          custom: {
            aomiOriginalText: "Retry me",
            aomiSendError: "network down",
            aomiSendStatus: "failed",
          },
        },
      });
    });

    it("adds an inline x402 credits notice when the backend returns 402", async () => {
      const createThread = vi.fn();
      const deleteThread = vi.fn(async () => undefined);
      const setModel = vi.fn(async () => ({ rig: "auto-model" }));
      const postChatMessage = vi.fn(async () => {
        throw new Error("HTTP 402: Payment Required");
      });
      setAomiClientConfig({
        createThread,
        deleteThread,
        getModels: vi.fn(async () => ["auto-model"]),
        setModel,
        postChatMessage,
      });

      const { api, control } = renderRuntime();

      await act(async () => {
        await control.getAvailableModels();
      });

      await waitFor(() => {
        expect(
          api.getThreadMetadata(api.currentThreadId)?.control.controlDirty,
        ).toBe(true);
      });

      await act(async () => {
        await expect(api.sendMessage("Need quota")).rejects.toThrow("HTTP 402");
      });

      const messages = api.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0]).toMatchObject({
        role: "user",
        metadata: {
          custom: {
            aomiOriginalText: "Need quota",
            aomiSendStatus: "failed",
          },
        },
      });
      expect(messages[1]).toMatchObject({
        role: "assistant",
        metadata: {
          custom: {
            aomiNoticeKind: "payment_required",
            aomiNoticeTitle: "Credits needed",
          },
        },
      });
      expect(messages[1].content).toEqual([
        {
          type: "text",
          text: "You're out of funds, please set up a payment method.",
        },
      ]);
      expect(createThread).toHaveBeenCalledWith(api.currentThreadId);
      expect(setModel).toHaveBeenCalledWith(
        api.currentThreadId,
        "auto-model",
        expect.objectContaining({ app: "default" }),
      );
      expect(setModel.mock.invocationCallOrder[0]).toBeLessThan(
        postChatMessage.mock.invocationCallOrder[0],
      );
      expect(deleteThread).toHaveBeenCalledWith(api.currentThreadId);
    });

    it("syncs dirty control state before the first message on a new thread", async () => {
      const setModel = vi.fn(async () => ({ rig: "auto-model" }));
      const postChatMessage = vi.fn(
        async (): Promise<AomiChatResponse> => ({
          is_processing: false,
          messages: [],
        }),
      );
      setAomiClientConfig({
        getModels: vi.fn(async () => ["auto-model"]),
        setModel,
        postChatMessage,
      });

      const { api, control } = renderRuntime();

      await act(async () => {
        await control.getAvailableModels();
      });

      await waitFor(() => {
        expect(
          api.getThreadMetadata(api.currentThreadId)?.control.controlDirty,
        ).toBe(true);
      });

      await act(async () => {
        await api.sendMessage("Use selected model");
      });

      expect(setModel).toHaveBeenCalledWith(
        api.currentThreadId,
        "auto-model",
        expect.objectContaining({ app: "default" }),
      );
      expect(postChatMessage).toHaveBeenCalled();
      expect(setModel.mock.invocationCallOrder[0]).toBeLessThan(
        postChatMessage.mock.invocationCallOrder[0],
      );
    });

    it("creates a connected EVM thread without calling stale account ensure", async () => {
      const ensureAccount = vi.fn(async () => undefined);
      const createThread = vi.fn(async (threadId: string) => ({
        session_id: threadId,
      }));
      const postChatMessage = vi.fn(
        async (): Promise<AomiChatResponse> => ({
          is_processing: false,
          messages: [],
        }),
      );
      setAomiClientConfig({ ensureAccount, createThread, postChatMessage });

      const { api } = renderRuntime();

      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          evm: [{ address: "0xabc", chain_id: 8453 }],
        });
      });

      await act(async () => {
        await api.sendMessage("Persist this wallet thread");
      });

      expect(ensureAccount).not.toHaveBeenCalled();
      expect(createThread).toHaveBeenCalledWith(api.currentThreadId);
      expect(createThread.mock.invocationCallOrder[0]).toBeLessThan(
        postChatMessage.mock.invocationCallOrder[0],
      );
    });

    it("sends a Solana-only chat through user_state", async () => {
      const ensureAccount = vi.fn(async () => undefined);
      const createThread = vi.fn(async (threadId: string) => ({
        session_id: threadId,
      }));
      const postChatMessage = vi.fn(
        async (): Promise<AomiChatResponse> => ({
          is_processing: false,
          messages: [],
        }),
      );
      setAomiClientConfig({ ensureAccount, createThread, postChatMessage });

      const { api } = renderRuntime();

      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          svm: {
            address: "So1anaCaseSensitiveSigner",
            cluster: "solana:mainnet",
          },
        });
      });

      await act(async () => {
        await api.sendMessage("Use my Solana wallet");
      });

      expect(ensureAccount).not.toHaveBeenCalled();
      expect(createThread).toHaveBeenCalledWith(api.currentThreadId);
      expect(postChatMessage).toHaveBeenCalledWith(
        api.currentThreadId,
        "Use my Solana wallet",
        expect.objectContaining({
          userState: expect.objectContaining({
            svm: expect.objectContaining({
              address: "So1anaCaseSensitiveSigner",
            }),
          }),
        }),
      );
    });

    it("replaces the optimistic message with backend messages on success", async () => {
      setAomiClientConfig({
        postChatMessage: vi.fn(
          async (): Promise<AomiChatResponse> =>
            ({
              is_processing: false,
              messages: [
                {
                  sender: "user",
                  content: "No duplicates",
                  timestamp: new Date().toISOString(),
                },
                {
                  sender: "assistant",
                  content: "Done",
                  timestamp: new Date().toISOString(),
                },
              ],
            }) as AomiChatResponse,
        ),
      });

      const { api } = renderRuntime();

      await act(async () => {
        await api.sendMessage("No duplicates");
      });

      const messages = api.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages.map((message) => message.role)).toEqual([
        "user",
        "assistant",
      ]);
      expect(
        messages.filter(
          (message) =>
            message.metadata?.custom?.aomiOriginalText === "No duplicates",
        ),
      ).toHaveLength(0);
    });

    it("sends ext values via userState in message options", async () => {
      const postChatMessage = vi.fn(
        async (): Promise<AomiChatResponse> => ({
          is_processing: false,
          messages: [],
        }),
      );
      setAomiClientConfig({ postChatMessage });

      const { api } = renderRuntime();
      await act(async () => {
        api.addExtValue("SIMMER_API_KEY", "sk_react_test");
      });

      await act(async () => {
        await api.sendMessage("send ext");
      });

      const call = postChatMessage.mock.calls[0] as unknown as [
        string,
        string,
        { userState?: Record<string, unknown> } | undefined,
      ];
      expect(call[2]?.userState).toMatchObject({
        connection: { is_connected: false },
        ext: {
          SIMMER_API_KEY: "sk_react_test",
        },
      });
    });

    it("passes ext values in fetchState during polling", async () => {
      const postChatMessage = vi.fn(
        async (): Promise<AomiChatResponse> => ({
          is_processing: true,
          messages: [],
        }),
      );
      const fetchState = vi.fn(async () => ({
        is_processing: false,
        messages: [],
      }));
      setAomiClientConfig({ postChatMessage, fetchState });

      const { api } = renderRuntime();
      await act(async () => {
        api.addExtValue("PARA_API_KEY", "para_poll_test");
      });

      await act(async () => {
        await api.sendMessage("poll with ext");
      });

      await waitFor(() => {
        expect(
          fetchState.mock.calls.some(
            (call) =>
              (call[1] as { ext?: Record<string, unknown> } | undefined)?.ext?.[
                "PARA_API_KEY"
              ] === "para_poll_test",
          ),
        ).toBe(true);
      });
    });

    it("does not send a stale public key after disconnect", async () => {
      const postChatMessage = vi.fn(
        async (): Promise<AomiChatResponse> => ({
          is_processing: false,
          messages: [],
        }),
      );
      setAomiClientConfig({ postChatMessage });

      const { api } = renderRuntime();

      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          evm: [{ address: "0xabc", chain_id: 1 }],
        });
      });

      await act(async () => {
        api.setUser({ connection: { is_connected: false } });
      });

      await act(async () => {
        await api.sendMessage("after disconnect");
      });

      const call = postChatMessage.mock.calls[0] as unknown as [
        string,
        string,
        (
          | {
              userState?: Record<string, unknown>;
            }
          | undefined
        ),
      ];

      expect(call[2]?.userState).toMatchObject({
        connection: { is_connected: false },
      });
    });

    it("hydrates pending wallet requests from backend user_state", async () => {
      setAomiClientConfig({
        fetchThreads: async () => [
          {
            session_id: "thread-with-wallet-request",
            title: "Wallet request",
          },
        ],
        fetchState: async () => ({
          is_processing: false,
          messages: [],
          user_state: {
            connection: { is_connected: true },
            evm: [{ address: "0xabc", chain_id: 8453 }],
            pending: {
              evm_sigs: {
                7: {
                  typed_data: {
                    domain: { chainId: 8453 },
                    types: {
                      Permit: [{ name: "spender", type: "address" }],
                    },
                    primaryType: "Permit",
                    message: { spender: "0x123" },
                  },
                  description: "Permit2",
                },
              },
            },
          },
        }),
      });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({
          connection: { is_connected: true },
          evm: [{ address: "0xabc", chain_id: 8453 }],
        });
      });

      await waitFor(() => {
        expect(
          getApi().getThreadMetadata("thread-with-wallet-request"),
        ).toBeDefined();
      });

      await act(async () => {
        getApi().selectThread("thread-with-wallet-request");
      });

      await waitFor(() => {
        expect(getApi().pendingWalletRequests).toEqual([
          expect.objectContaining({
            id: "eip712-7",
            kind: "eip712_sign",
            payload: expect.objectContaining({
              eip712Id: 7,
              description: "Permit2",
            }),
          }),
        ]);
      });
    });
  });

  describe("getMessages", () => {
    it("returns messages for current thread", () => {
      const { api } = renderRuntime();
      const messages = api.getMessages();
      expect(Array.isArray(messages)).toBe(true);
    });

    it("returns empty array for non-existent thread", () => {
      const { api } = renderRuntime();
      const messages = api.getMessages("non-existent");
      expect(messages).toEqual([]);
    });
  });

  describe("isRunning", () => {
    it("starts false", () => {
      const { api } = renderRuntime();
      expect(api.isRunning).toBe(false);
    });
  });

  describe("cancelGeneration", () => {
    it("is a function", () => {
      const { api } = renderRuntime();
      expect(api.cancelGeneration).toBeInstanceOf(Function);
    });
  });
});
