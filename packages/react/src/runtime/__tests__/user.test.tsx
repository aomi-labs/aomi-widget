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
  resetBackendApiMocks,
  setBackendApiConfig,
  getLatestBackendApi,
  flushPromises,
} from "./test-harness";

beforeEach(() => {
  resetBackendApiMocks();
});

afterEach(() => {
  cleanup();
});

describe("User API", () => {
  describe("user state", () => {
    it("initializes with default disconnected state", () => {
      const { api } = renderRuntime();

      expect(api.user).toEqual({
        isConnected: false,
        address: undefined,
        chainId: undefined,
        ensName: undefined,
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
        address: "0xABC",
        chainId: 1,
        isConnected: true,
        ensName: undefined,
      });
    });
  });

  describe("setUser", () => {
    it("updates user state partially", async () => {
      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0x123" });
      });

      expect(getApi().user.address).toBe("0x123");
      expect(getApi().user.isConnected).toBe(false); // unchanged

      await act(async () => {
        api.setUser({ isConnected: true });
      });

      expect(getApi().user.address).toBe("0x123"); // unchanged
      expect(getApi().user.isConnected).toBe(true);
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
        address: "0xDEF",
        chainId: 137,
        isConnected: true,
        ensName: "user.eth",
      });
    });

    it("sends wallet state change to backend", async () => {
      const postSystemMessage = vi.fn(async () => ({ res: null }));

      setBackendApiConfig({ postSystemMessage });

      const { api } = renderRuntime();

      await act(async () => {
        api.setUser({
          address: "0x789",
          chainId: 1,
          isConnected: true,
        });
        await flushPromises();
      });

      await waitFor(() => {
        expect(postSystemMessage).toHaveBeenCalled();
      });

      // Check the system message contains wallet state
      const call = postSystemMessage.mock.calls[0] as unknown as [
        string,
        string,
      ];
      const messageJson = JSON.parse(call[1]);
      expect(messageJson.type).toBe("wallet:state_changed");
      expect(messageJson.payload.address).toBe("0x789");
    });
  });

  describe("getUserState", () => {
    it("returns current user state synchronously", async () => {
      const { api } = renderRuntime();

      await act(async () => {
        api.setUser({ address: "0xABC", isConnected: true });
      });

      const state = api.getUserState();
      expect(state.address).toBe("0xABC");
      expect(state.isConnected).toBe(true);
    });

    it("returns fresh state on each call", async () => {
      const { api } = renderRuntime();

      const state1 = api.getUserState();

      await act(async () => {
        api.setUser({ address: "0x111" });
      });

      const state2 = api.getUserState();

      expect(state1.address).toBeUndefined();
      expect(state2.address).toBe("0x111");
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
        expect.objectContaining({ address: "0xNEW" }),
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

      expect(getApi().user.isConnected).toBe(true);
      expect(getApi().user.address).toBe("0xWALLET");

      // Disconnect
      await act(async () => {
        api.setUser({
          address: undefined,
          chainId: undefined,
          isConnected: false,
          ensName: undefined,
        });
      });

      expect(getApi().user.isConnected).toBe(false);
      expect(getApi().user.address).toBeUndefined();
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

      expect(getApi().user.chainId).toBe(1);

      await act(async () => {
        api.setUser({ chainId: 137 }); // Polygon
      });

      expect(getApi().user.chainId).toBe(137);
      expect(getApi().user.address).toBe("0xUSER"); // address preserved
    });
  });
});
