import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSafeSvmWallet } from "./wallet-runtime";

describe("useSafeSvmWallet outside a WalletProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the disconnected state without logging missing-provider errors", () => {
    // The adapter library's default context "throws" by console.error-ing from
    // property getters instead of raising, so a try/catch alone cannot contain
    // it. This pins the descriptor-probe boundary: no reads, no log spam.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useSafeSvmWallet());

    expect(result.current.connected).toBe(false);
    expect(result.current.publicKey).toBeUndefined();
    expect(result.current.wallets).toEqual([]);
    expect(result.current.select).toBeUndefined();
    const missingProviderLogs = errorSpy.mock.calls.filter((call) =>
      String(call[0]).includes("WalletContext without providing one"),
    );
    expect(missingProviderLogs).toEqual([]);
  });
});
