import { describe, expect, it, vi } from "vitest";

import { SessionManager } from "../session-manager";

type FakeSession = {
  close: ReturnType<typeof vi.fn>;
  getIsProcessing: () => boolean;
  getIsPolling: () => boolean;
  getPendingRequests: () => unknown[];
};

const createFakeSession = (
  options: {
    isProcessing?: boolean;
    isPolling?: boolean;
    pendingRequests?: unknown[];
  } = {},
): FakeSession => ({
  close: vi.fn(),
  getIsProcessing: () => options.isProcessing ?? false,
  getIsPolling: () => options.isPolling ?? false,
  getPendingRequests: () => options.pendingRequests ?? [],
});

const getSessions = (manager: SessionManager) =>
  (
    manager as unknown as {
      sessions: Map<string, FakeSession>;
    }
  ).sessions;

describe("SessionManager", () => {
  it("closes only inactive idle sessions", () => {
    const manager = new SessionManager(() => ({}) as never);
    const active = createFakeSession();
    const idle = createFakeSession();
    const processing = createFakeSession({ isProcessing: true });
    const polling = createFakeSession({ isPolling: true });
    const pendingWallet = createFakeSession({ pendingRequests: [{}] });

    getSessions(manager).set("active", active);
    getSessions(manager).set("idle", idle);
    getSessions(manager).set("processing", processing);
    getSessions(manager).set("polling", polling);
    getSessions(manager).set("pending-wallet", pendingWallet);

    const beforeClose = vi.fn();
    const closedThreadIds = manager.closeIdleExcept("active", beforeClose);

    expect(closedThreadIds).toEqual(["idle"]);
    expect(beforeClose).toHaveBeenCalledWith("idle");
    expect(idle.close).toHaveBeenCalledTimes(1);
    expect(active.close).not.toHaveBeenCalled();
    expect(processing.close).not.toHaveBeenCalled();
    expect(polling.close).not.toHaveBeenCalled();
    expect(pendingWallet.close).not.toHaveBeenCalled();
    expect(getSessions(manager).has("idle")).toBe(false);
  });
});
