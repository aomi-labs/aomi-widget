/**
 * Basic integration tests for AomiRuntimeProvider
 *
 * Tests the provider mounts correctly and exposes the unified API.
 * For specific API tests, see:
 * - thread.test.tsx - Thread API tests
 * - chat.test.tsx - Chat API tests
 * - user.test.tsx - User API tests
 * - event.test.tsx - Event API tests
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup } from "@testing-library/react";

import {
  renderRuntime,
  resetBackendApiMocks,
  setBackendApiConfig,
} from "./test-harness";

beforeEach(() => {
  resetBackendApiMocks();
});

afterEach(() => {
  cleanup();
});

describe("AomiRuntimeProvider", () => {
  it("mounts and provides the unified API", () => {
    const { api } = renderRuntime();

    // Verify all API sections are present
    expect(api).toBeDefined();

    // User API
    expect(api.user).toBeDefined();
    expect(api.getUserState).toBeInstanceOf(Function);
    expect(api.setUser).toBeInstanceOf(Function);
    expect(api.onUserStateChange).toBeInstanceOf(Function);

    // Thread API
    expect(api.currentThreadId).toBeDefined();
    expect(api.threadViewKey).toBeDefined();
    expect(api.threadMetadata).toBeInstanceOf(Map);
    expect(api.getThreadMetadata).toBeInstanceOf(Function);
    expect(api.createThread).toBeInstanceOf(Function);
    expect(api.deleteThread).toBeInstanceOf(Function);
    expect(api.renameThread).toBeInstanceOf(Function);
    expect(api.archiveThread).toBeInstanceOf(Function);
    expect(api.selectThread).toBeInstanceOf(Function);

    // Chat API
    expect(typeof api.isRunning).toBe("boolean");
    expect(api.getMessages).toBeInstanceOf(Function);
    expect(api.sendMessage).toBeInstanceOf(Function);
    expect(api.cancelGeneration).toBeInstanceOf(Function);

    // Notification API
    expect(Array.isArray(api.notifications)).toBe(true);
    expect(api.showNotification).toBeInstanceOf(Function);
    expect(api.dismissNotification).toBeInstanceOf(Function);
    expect(api.clearAllNotifications).toBeInstanceOf(Function);

    // Event API
    expect(api.subscribe).toBeInstanceOf(Function);
    expect(api.sendSystemCommand).toBeInstanceOf(Function);
    expect(api.sseStatus).toBeDefined();
  });

  it("initializes with default values", () => {
    const { api } = renderRuntime();

    // Default user state
    expect(api.user.isConnected).toBe(false);
    expect(api.user.address).toBeUndefined();

    // Default thread state
    expect(api.currentThreadId).toBeDefined();
    expect(api.threadViewKey).toBe(0);

    // Default running state
    expect(api.isRunning).toBe(false);

    // Default notifications
    expect(api.notifications).toHaveLength(0);
  });

  it("creates initial thread metadata", () => {
    const { api } = renderRuntime();

    const metadata = api.getThreadMetadata(api.currentThreadId);
    expect(metadata).toBeDefined();
    expect(metadata?.title).toBe("New Chat");
    expect(metadata?.status).toBe("pending");
  });

  it("allows custom backend URL", () => {
    setBackendApiConfig({
      fetchState: async () => ({
        is_processing: false,
        messages: [],
      }),
    });

    const { api } = renderRuntime({ backendUrl: "http://custom-backend:9000" });
    expect(api).toBeDefined();
  });
});
