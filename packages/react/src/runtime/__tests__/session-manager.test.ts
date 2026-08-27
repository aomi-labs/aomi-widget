import { describe, expect, it, vi } from "vitest";

import { SessionManager } from "../session-manager";

type FakeSession = {
  close: ReturnType<typeof vi.fn>;
  getIsProcessing: () => boolean;
  getIsPolling: () => boolean;
  getPendingActions: () => unknown[];
};

const createFakeSession = (
  options: {
    isProcessing?: boolean;
    isPolling?: boolean;
    pendingActions?: unknown[];
  } = {},
): FakeSession => ({
  close: vi.fn(),
  getIsProcessing: () => options.isProcessing ?? false,
  getIsPolling: () => options.isPolling ?? false,
  getPendingActions: () => options.pendingActions ?? [],
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
    const pendingAction = createFakeSession({ pendingActions: [{}] });

    getSessions(manager).set("active", active);
    getSessions(manager).set("idle", idle);
    getSessions(manager).set("processing", processing);
    getSessions(manager).set("polling", polling);
    getSessions(manager).set("pending-action", pendingAction);

    const beforeClose = vi.fn();
    const closedThreadIds = manager.closeIdleExcept("active", beforeClose);

    expect(closedThreadIds).toEqual(["idle"]);
    expect(beforeClose).toHaveBeenCalledWith("idle");
    expect(idle.close).toHaveBeenCalledTimes(1);
    expect(active.close).not.toHaveBeenCalled();
    expect(processing.close).not.toHaveBeenCalled();
    expect(polling.close).not.toHaveBeenCalled();
    expect(pendingAction.close).not.toHaveBeenCalled();
    expect(getSessions(manager).has("idle")).toBe(false);
  });
});
