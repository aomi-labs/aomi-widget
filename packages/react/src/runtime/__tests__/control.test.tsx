import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, waitFor } from "@testing-library/react";

import {
  flushPromises,
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

describe("Control context", () => {
  it("refetches authorized apps when the wallet address changes", async () => {
    const getApps = vi.fn(async () => ["default"]);
    setAomiClientConfig({
      getApps,
      getModels: async () => [],
    });

    const { api } = renderRuntime();

    await waitFor(() => {
      expect(getApps).toHaveBeenCalledTimes(1);
    });

    expect(getApps.mock.calls[0]?.[1]).toMatchObject({
      publicKey: undefined,
      apiKey: undefined,
    });

    await act(async () => {
      api.setUser({
        address: "0xabc",
        isConnected: true,
      });
      await flushPromises();
    });

    await waitFor(() => {
      expect(getApps).toHaveBeenCalledTimes(2);
    });

    expect(getApps.mock.calls[1]?.[1]).toMatchObject({
      publicKey: "0xabc",
      apiKey: undefined,
    });
  });

  it("falls back to the default app when a previous selection is no longer authorized", async () => {
    const sendMessage = vi.fn(
      async (): Promise<AomiChatResponse> => ({
        is_processing: false,
        messages: [],
      }),
    );
    const getApps = vi.fn(
      async (_sessionId: string, options?: { publicKey?: string }) =>
        options?.publicKey ? ["default"] : ["default", "special"],
    );

    setAomiClientConfig({
      getApps,
      getModels: async () => [],
      sendMessage,
    });

    const { api, getApi, getControl } = renderRuntime();

    await waitFor(() => {
      expect(getControl().state.authorizedApps).toEqual(["default", "special"]);
    });

    act(() => {
      getControl().onAppSelect("special");
    });

    expect(getControl().getCurrentThreadApp()).toBe("special");

    await act(async () => {
      api.setUser({
        address: "0xabc",
        isConnected: true,
      });
      await flushPromises();
    });

    await waitFor(() => {
      expect(getControl().state.authorizedApps).toEqual(["default"]);
    });

    expect(getControl().getCurrentThreadApp()).toBe("default");

    await act(async () => {
      await getApi().sendMessage("hello");
    });

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalled();
    });

    expect(sendMessage.mock.calls[0]?.[2]).toMatchObject({
      app: "default",
      publicKey: "0xabc",
    });
  });
});
