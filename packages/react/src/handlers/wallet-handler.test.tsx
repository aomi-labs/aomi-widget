import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  useWalletHandler,
  type WalletRequest,
} from "./wallet-handler";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("useWalletHandler", () => {
  it("keeps an in-flight request hidden when the backend briefly re-reports it", async () => {
    const resolveDeferred = createDeferred<void>();
    const session = {
      resolve: vi.fn(() => resolveDeferred.promise),
      reject: vi.fn(),
    };

    const request: WalletRequest = {
      id: "tx-1",
      kind: "transaction",
      payload: {
        to: "0x0000000000000000000000000000000000000000",
        value: "100",
        txId: 1,
      },
      timestamp: Date.now(),
    };

    const { result } = renderHook(() =>
      useWalletHandler({
        getSession: () => session as never,
      }),
    );

    act(() => {
      result.current.setRequests([request]);
    });

    expect(result.current.pendingRequests).toEqual([request]);

    let resolvePromise!: Promise<void>;
    act(() => {
      result.current.startRequest(request.id);
      resolvePromise = result.current.resolveRequest(request.id, {
        txHash: "0xabc",
      });
    });

    expect(result.current.pendingRequests).toEqual([]);
    expect(session.resolve).toHaveBeenCalledWith(request.id, {
      txHash: "0xabc",
    });

    act(() => {
      result.current.setRequests([request]);
    });

    expect(result.current.pendingRequests).toEqual([]);

    await act(async () => {
      resolveDeferred.resolve();
      await resolvePromise;
    });

    expect(result.current.pendingRequests).toEqual([]);
  });
});
