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

  describe("recordUiInteraction", () => {
    it("records UI context on the active thread", async () => {
      const postSystemMessage = vi.fn(async () => ({ res: null }));
      setAomiClientConfig({ postSystemMessage });

      const { api } = renderRuntime();

      await act(async () => {
        await api.recordUiInteraction({
          event: "deposit_review_opened",
          asset: "USDC",
        });
      });

      expect(postSystemMessage).toHaveBeenCalledWith(
        api.currentThreadId,
        JSON.stringify({
          type: "ui_interaction",
          payload: {
            event: "deposit_review_opened",
            asset: "USDC",
          },
        }),
        expect.any(Object),
      );
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

    it("routes live system notices and errors to notifications", async () => {
      setAomiClientConfig({
        postChatMessage: vi.fn(async () => ({
          is_processing: false,
          messages: [],
          system_events: [
            { SystemNotice: "Backend connected" },
            { SystemError: "Transaction simulation failed" },
          ],
        })),
      });

      const { api, getApi } = renderRuntime();

      await act(async () => {
        await api.sendMessage("Connect and simulate");
      });

      expect(getApi().notifications).toEqual([
        expect.objectContaining({
          type: "error",
          title: "Error",
          message: "Transaction simulation failed",
        }),
        expect.objectContaining({
          type: "notice",
          title: "System notice",
          message: "Backend connected",
        }),
      ]);
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

describe("failed-turn notice", () => {
  const noticeKinds = (messages: readonly unknown[]) =>
    messages
      .map(
        (message) =>
          (
            message as {
              metadata?: { custom?: { aomiNoticeKind?: string } };
            }
          ).metadata?.custom?.aomiNoticeKind,
      )
      .filter(Boolean);

  it("shows one notice when the durable record and the live error describe the same failure", async () => {
    // A backend that persists the notice sends both in one response: the
    // durable `notice` message in the projection, and the transient
    // SystemError that drives the toast. The reader must see one card.
    setAomiClientConfig({
      postChatMessage: vi.fn(async () => ({
        is_processing: false,
        messages: [
          { sender: "user", content: "hi" },
          {
            sender: "notice",
            content: "This app hit an error and couldn't respond.",
          },
        ],
        system_events: [{ SystemError: "CompletionError: ProviderError" }],
      })),
    });

    const { api, getThreadContext } = renderRuntime();
    await act(async () => {
      await api.sendMessage("hi");
    });

    const threadContext = getThreadContext();
    const messages = threadContext.getThreadMessages(
      threadContext.currentThreadId,
    );
    expect(noticeKinds(messages)).toEqual(["error"]);
  });

  it("still explains the failure when the backend sends no durable notice", async () => {
    // Older backends drain `system_events` and persist nothing, so the
    // transient error is the only signal there is.
    setAomiClientConfig({
      postChatMessage: vi.fn(async () => ({
        is_processing: false,
        messages: [{ sender: "user", content: "hi" }],
        system_events: [{ SystemError: "CompletionError: ProviderError" }],
      })),
    });

    const { api, getThreadContext } = renderRuntime();
    await act(async () => {
      await api.sendMessage("hi");
    });

    const threadContext = getThreadContext();
    const messages = threadContext.getThreadMessages(
      threadContext.currentThreadId,
    );
    expect(noticeKinds(messages)).toEqual(["error"]);
  });
});
