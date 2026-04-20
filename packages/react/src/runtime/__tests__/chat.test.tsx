/**
 * Chat API Tests
 *
 * Tests for chat operations.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, waitFor } from "@testing-library/react";

import { renderRuntime, resetAomiClientMocks, setAomiClientConfig } from "./test-harness";
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
      expect(call[2]?.userState).toEqual({
        isConnected: false,
        address: undefined,
        chainId: undefined,
        ensName: undefined,
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
          address: "0xabc",
          chainId: 1,
          isConnected: true,
        });
      });

      await act(async () => {
        api.setUser({ isConnected: false });
      });

      await act(async () => {
        await api.sendMessage("after disconnect");
      });

      const call = postChatMessage.mock.calls[0] as unknown as [
        string,
        string,
        {
          publicKey?: string;
          userState?: Record<string, unknown>;
        } | undefined,
      ];

      expect(call[2]?.publicKey).toBeUndefined();
      expect(call[2]?.userState).toMatchObject({
        isConnected: false,
        address: undefined,
        chainId: undefined,
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
