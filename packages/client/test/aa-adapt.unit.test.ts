import { describe, expect, it, vi } from "vitest";
import type { TransactionReceipt } from "viem";

import {
  adaptSmartAccount,
  isAlchemySponsorshipLimitError,
  type ParaSmartAccountLike,
} from "../src/aa/adapt";

describe("adaptSmartAccount", () => {
  const mockReceipt = {
    transactionHash: "0xabc123",
  } as TransactionReceipt;

  function makeMockAccount(): ParaSmartAccountLike {
    return {
      provider: "ALCHEMY",
      mode: "7702",
      smartAccountAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      delegationAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      sendTransaction: vi.fn().mockResolvedValue(mockReceipt),
      sendBatchTransaction: vi.fn().mockResolvedValue(mockReceipt),
    };
  }

  it("maps smartAccountAddress to AAAddress", () => {
    const account = makeMockAccount();
    const adapted = adaptSmartAccount(account);

    expect(adapted.AAAddress).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(adapted.provider).toBe("ALCHEMY");
    expect(adapted.mode).toBe("7702");
    expect(adapted.delegationAddress).toBe("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  });

  it("drops a 7702 delegation address when it matches the smart account address", () => {
    const account = {
      ...makeMockAccount(),
      smartAccountAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      delegationAddress: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    } satisfies ParaSmartAccountLike;

    const adapted = adaptSmartAccount(account);

    expect(adapted.AAAddress).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(adapted.delegationAddress).toBeUndefined();
  });

  it("preserves matching smart and delegation addresses outside 7702 mode", () => {
    const account = {
      ...makeMockAccount(),
      mode: "4337",
      smartAccountAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      delegationAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    } satisfies ParaSmartAccountLike;

    const adapted = adaptSmartAccount(account);

    expect(adapted.delegationAddress).toBe(
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
  });

  it("unwraps TransactionReceipt to { transactionHash }", async () => {
    const account = makeMockAccount();
    const adapted = adaptSmartAccount(account);

    const result = await adapted.sendTransaction({
      to: "0x1111111111111111111111111111111111111111",
      value: 0n,
    });

    expect(result).toEqual({ transactionHash: "0xabc123" });
  });

  it("unwraps batch TransactionReceipt", async () => {
    const account = makeMockAccount();
    const adapted = adaptSmartAccount(account);

    const result = await adapted.sendBatchTransaction([
      { to: "0x1111111111111111111111111111111111111111", value: 0n },
      { to: "0x2222222222222222222222222222222222222222", value: 1n },
    ]);

    expect(result).toEqual({ transactionHash: "0xabc123" });
  });
});

describe("isAlchemySponsorshipLimitError", () => {
  it("detects 'gas sponsorship limit' message", () => {
    expect(
      isAlchemySponsorshipLimitError(
        new Error(
          "This transaction's USD cost will put your team over your gas sponsorship Limit.",
        ),
      ),
    ).toBe(true);
  });

  it("detects 'buy gas credits' message", () => {
    expect(
      isAlchemySponsorshipLimitError(
        new Error("Please buy gas credits in your Gas Manager Dashboard."),
      ),
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isAlchemySponsorshipLimitError(new Error("validation reverted"))).toBe(false);
  });

  it("handles non-Error values", () => {
    expect(isAlchemySponsorshipLimitError("gas sponsorship limit")).toBe(true);
    expect(isAlchemySponsorshipLimitError(null)).toBe(false);
    expect(isAlchemySponsorshipLimitError(undefined)).toBe(false);
  });
});
