import { act, renderHook } from "@testing-library/react";
import type { Action } from "@aomi-labs/client";
import { describe, expect, it, vi } from "vitest";

import { useActionHandler } from "./action-handler";

function deferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function action(id: string): Action {
  return {
    type: "action",
    event_id: `event-${id}`,
    sequence: 1,
    turn_id: "turn-1",
    occurred_at: 1,
    id,
    revision: 1,
    state: "pending",
    request: {
      type: "execute_evm",
      transactions: [
        {
          chain_id: 1,
          from: "0x1111111111111111111111111111111111111111",
          to: "0x2222222222222222222222222222222222222222",
          data: "0x",
          label: "Transfer",
          kind: "transfer",
        },
      ],
    },
    result: null,
    created_at: 1,
    expires_at: null,
  };
}

describe("useActionHandler", () => {
  it("keeps an in-flight Action hidden when a page briefly re-reports it", async () => {
    const gate = deferred();
    const session = {
      respondToAction: vi.fn(() => gate.promise),
      rejectAction: vi.fn(),
    };
    const pending = action("action-1");
    const { result } = renderHook(() =>
      useActionHandler({ getSession: () => session as never }),
    );

    act(() => result.current.setActions([pending]));
    expect(result.current.pendingActions).toEqual([pending]);

    let response!: Promise<void>;
    act(() => {
      response = result.current.respondToAction(pending.id, {
        status: "rejected",
        reason: "Not now",
      });
    });
    expect(result.current.pendingActions).toEqual([]);
    expect(result.current.hasBlockingActions).toBe(true);

    act(() => result.current.setActions([pending]));
    expect(result.current.pendingActions).toEqual([]);

    await act(async () => {
      gate.resolve();
      await response;
    });
    expect(result.current.hasBlockingActions).toBe(false);
  });

  it("suppresses a responded Action even when acknowledgement fails", async () => {
    const gate = deferred();
    const session = {
      respondToAction: vi.fn(() => gate.promise),
      rejectAction: vi.fn(),
    };
    const pending = action("action-2");
    const { result } = renderHook(() =>
      useActionHandler({ getSession: () => session as never }),
    );

    act(() => result.current.setActions([pending]));
    let response!: Promise<void>;
    act(() => {
      response = result.current.respondToAction(pending.id, {
        status: "rejected",
        reason: "Not now",
      });
    });

    await act(async () => {
      gate.reject(new Error("network error"));
      await expect(response).rejects.toThrow("network error");
    });
    expect(result.current.pendingActions).toEqual([]);

    act(() => result.current.setActions([pending]));
    expect(result.current.pendingActions).toEqual([]);
    act(() => result.current.setActions([]));
    act(() => result.current.setActions([pending]));
    expect(result.current.pendingActions).toEqual([pending]);
  });
});
