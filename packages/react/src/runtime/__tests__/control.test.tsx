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
  it("does not refetch authorized apps when the wallet address changes", async () => {
    // Refetching on every wallet/network switch caused the app picker to
    // visually reset (e.g. when toggling between EVM and Solana wallets,
    // the new app list might omit the user's previous selection). Apps are
    // scoped to the api key / auth context, not to the connected wallet.
    const getApps = vi.fn(async () => [{ name: "default" }]);
    setAomiClientConfig({
      getApps,
      getModels: async () => [],
    });

    const { api } = renderRuntime();

    await waitFor(() => {
      expect(getApps).toHaveBeenCalledTimes(1);
    });

    expect(getApps.mock.calls[0]?.[1]).toMatchObject({
      apiKey: undefined,
    });

    await act(async () => {
      api.setUser({
        address: "0xabc",
        chainId: 1,
        isConnected: true,
      });
      await flushPromises();
    });

    expect(getApps).toHaveBeenCalledTimes(1);
  });

  it("does not refetch authorized apps on thread changes", async () => {
    const getApps = vi.fn(async () => [{ name: "default" }, { name: "special" }]);
    setAomiClientConfig({
      getApps,
      getModels: async () => [],
    });

    const { api } = renderRuntime();

    await waitFor(() => {
      expect(getApps).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await api.createThread();
      await flushPromises();
    });

    expect(getApps).toHaveBeenCalledTimes(1);
  });

  it("preserves the selected app across wallet connection changes", async () => {
    // Wallet connect/disconnect no longer triggers an app refetch, so the
    // user's previously chosen app stays selected when they switch networks
    // or families.
    const sendMessage = vi.fn(
      async (): Promise<AomiChatResponse> => ({
        is_processing: false,
        messages: [],
      }),
    );
    const getApps = vi.fn(async () => [{ name: "default" }, { name: "special" }]);

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
        chainId: 1,
        isConnected: true,
      });
      await flushPromises();
    });

    expect(getApps).toHaveBeenCalledTimes(1);
    expect(getControl().getCurrentThreadApp()).toBe("special");

    await act(async () => {
      await getApi().sendMessage("hello");
    });

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalled();
    });

    expect(sendMessage.mock.calls[0]?.[2]).toMatchObject({
      app: "special",
    });
  });

  it("resends with the updated app on an existing thread session", async () => {
    const sendMessage = vi.fn(
      async (): Promise<AomiChatResponse> => ({
        is_processing: false,
        messages: [],
      }),
    );

    setAomiClientConfig({
      getApps: async () => [{ name: "default" }, { name: "special" }],
      getModels: async () => [],
      sendMessage,
    });

    const { getApi, getControl } = renderRuntime();

    await waitFor(() => {
      expect(getControl().state.authorizedApps).toEqual(["default", "special"]);
    });

    await act(async () => {
      await getApi().sendMessage("first");
    });

    act(() => {
      getControl().onAppSelect("special");
    });

    await act(async () => {
      await getApi().sendMessage("second");
    });

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledTimes(2);
    });

    expect(sendMessage.mock.calls[0]?.[2]).toMatchObject({
      app: "default",
    });
    expect(sendMessage.mock.calls[1]?.[2]).toMatchObject({
      app: "special",
    });
  });
});
