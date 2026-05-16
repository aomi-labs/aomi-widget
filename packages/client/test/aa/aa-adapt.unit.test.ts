import { describe, expect, it, vi } from "vitest";
import type { Hex, TransactionReceipt } from "viem";

import {
  adaptSmartAccount,
  isAlchemySponsorshipLimitError,
} from "../../src/aa/adapt";

const OWNER_ADDRESS: Hex = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

describe("adaptSmartAccount", () => {
  const mockReceipt = {
    transactionHash: "0xabc123",
  } as TransactionReceipt;

  type MockAccount = Parameters<typeof adaptSmartAccount>[0];

  function makeMockAccount(overrides: Partial<MockAccount> = {}): MockAccount {
    return {
      provider: "ALCHEMY",
      mode: "7702",
      smartAccountAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      delegationAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      sendTransaction: vi.fn().mockResolvedValue(mockReceipt),
      sendBatchTransaction: vi.fn().mockResolvedValue(mockReceipt),
      ...overrides,
    };
  }

  it("lowercases the SDK provider and exposes address + Delegation7702 in 7702 mode", () => {
    const adapted = adaptSmartAccount(makeMockAccount(), OWNER_ADDRESS);

    expect(adapted.provider).toBe("alchemy");
    expect(adapted.mode).toBe("7702");
    expect(adapted.address).toBe(OWNER_ADDRESS);
    expect(adapted.Delegation7702).toBe(
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    );
    expect(adapted.SmartAccount4337).toBeUndefined();
  });

  it("exposes SmartAccount4337 (and not Delegation7702) in 4337 mode", () => {
    const adapted = adaptSmartAccount(
      makeMockAccount({
        mode: "4337",
        smartAccountAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
      }),
      OWNER_ADDRESS,
    );

    expect(adapted.mode).toBe("4337");
    expect(adapted.address).toBe(OWNER_ADDRESS);
    expect(adapted.SmartAccount4337).toBe(
      "0xcccccccccccccccccccccccccccccccccccccccc",
    );
    expect(adapted.Delegation7702).toBeUndefined();
  });

  it("drops a 7702 delegation address when it matches the smart-account address", () => {
    const adapted = adaptSmartAccount(
      makeMockAccount({
        smartAccountAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        delegationAddress: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      }),
      OWNER_ADDRESS,
    );

    expect(adapted.Delegation7702).toBeUndefined();
  });

  it("rejects an unsupported SDK provider", () => {
    expect(() =>
      adaptSmartAccount(makeMockAccount({ provider: "BICONOMY" }), OWNER_ADDRESS),
    ).toThrow(/Unsupported AA provider/);
  });

  it("unwraps TransactionReceipt to { transactionHash }", async () => {
    const adapted = adaptSmartAccount(makeMockAccount(), OWNER_ADDRESS);

    const result = await adapted.sendTransaction({
      to: "0x1111111111111111111111111111111111111111",
      value: 0n,
    });

    expect(result).toEqual({ transactionHash: "0xabc123" });
  });

  it("unwraps batch TransactionReceipt", async () => {
    const adapted = adaptSmartAccount(makeMockAccount(), OWNER_ADDRESS);

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
