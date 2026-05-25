/**
 * Event API Tests
 *
 * Tests for event system and notifications.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, waitFor } from "@testing-library/react";

import {
  renderRuntime,
  resetAomiClientMocks,
  setAomiClientConfig,
  flushPromises,
} from "./test-harness";

beforeEach(() => {
  resetAomiClientMocks();
});

afterEach(() => {
  cleanup();
});

describe("Event API", () => {
  describe("subscribe", () => {
    it("returns unsubscribe function", () => {
      const { api } = renderRuntime();
      const unsubscribe = api.subscribe("test_event", () => {});
      expect(unsubscribe).toBeInstanceOf(Function);
      unsubscribe();
    });
  });

  describe("sendSystemCommand", () => {
    it("sends command to backend", async () => {
      const postSystemMessage = vi.fn(async () => ({ res: null }));
      setAomiClientConfig({ postSystemMessage });

      const { api } = renderRuntime();

      await act(async () => {
        api.sendSystemCommand({
          type: "custom_command",
          sessionId: api.currentThreadId,
          payload: { action: "test" },
        });
        await flushPromises();
      });

      await waitFor(() => {
        expect(postSystemMessage).toHaveBeenCalled();
      });

      const call = postSystemMessage.mock.calls[0] as unknown as [
        string,
        string,
      ];
      const messageJson = JSON.parse(call[1]);
      expect(messageJson.type).toBe("custom_command");
    });
  });

  describe("sseStatus", () => {
    it("has initial status", () => {
      const { api } = renderRuntime();
      expect(api.sseStatus).toBeDefined();
      expect(["connecting", "connected", "disconnected"]).toContain(
        api.sseStatus,
      );
    });
  });

  describe("notifications", () => {
    it("starts with empty notifications", () => {
      const { api } = renderRuntime();
      expect(api.notifications).toEqual([]);
    });

    it("can show notification", async () => {
      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.showNotification({
          type: "notice",
          title: "Test",
          message: "Test message",
        });
      });

      expect(getApi().notifications).toHaveLength(1);
      expect(getApi().notifications[0].title).toBe("Test");
    });

    it("dedupes payment_required notifications", async () => {
      const { api, getApi } = renderRuntime();
      let firstId: string;
      let secondId: string;

      await act(async () => {
        firstId = api.showNotification({
          type: "error",
          kind: "payment_required",
          title: "You're out of funds",
        });
      });
      await act(async () => {
        secondId = api.showNotification({
          type: "error",
          kind: "payment_required",
          title: "You're out of funds again",
        });
      });

      // Only one entry — second call returns the existing id so the caller
      // and the modal's `dismissNotification(paymentNotification.id)` agree.
      expect(
        getApi().notifications.filter((n) => n.kind === "payment_required"),
      ).toHaveLength(1);
      expect(secondId!).toBe(firstId!);
      // First-write-wins: the original title sticks, follow-up writes are dropped.
      expect(
        getApi().notifications.find((n) => n.kind === "payment_required")
          ?.title,
      ).toBe("You're out of funds");
    });

    it("can dismiss notification", async () => {
      const { api, getApi } = renderRuntime();
      let notificationId: string;

      await act(async () => {
        notificationId = api.showNotification({
          type: "notice",
          title: "Test",
        });
      });

      expect(getApi().notifications).toHaveLength(1);

      await act(async () => {
        api.dismissNotification(notificationId);
      });

      expect(getApi().notifications).toHaveLength(0);
    });

    it("can clear all notifications", async () => {
      const { api, getApi } = renderRuntime();

      await act(async () => {
        api.showNotification({ type: "notice", title: "First" });
        api.showNotification({ type: "success", title: "Second" });
        api.showNotification({ type: "error", title: "Third" });
      });

      expect(getApi().notifications).toHaveLength(3);

      await act(async () => {
        api.clearAllNotifications();
      });

      expect(getApi().notifications).toHaveLength(0);
    });
  });
});
