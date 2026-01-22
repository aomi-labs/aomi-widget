/**
 * Chat API Tests
 *
 * Tests for chat operations.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, waitFor } from "@testing-library/react";

import {
  renderRuntime,
  resetBackendApiMocks,
  setBackendApiConfig,
  flushPromises,
} from "./test-harness";
import type { ApiChatResponse } from "../../backend/types";

beforeEach(() => {
  resetBackendApiMocks();
});

afterEach(() => {
  cleanup();
});

describe("Chat API", () => {
  describe("sendMessage", () => {
    it("sends message to backend", async () => {
      const postChatMessage = vi.fn(
        async (): Promise<ApiChatResponse> => ({
          session_exists: true,
          is_processing: true,
          messages: [],
        }),
      );
      setBackendApiConfig({ postChatMessage });

      const { api } = renderRuntime();

      await act(async () => {
        await api.sendMessage("Hello world");
      });

      await waitFor(() => {
        expect(postChatMessage).toHaveBeenCalled();
      });

      const call = postChatMessage.mock.calls[0] as unknown as [string, string];
      expect(call[1]).toBe("Hello world");
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
