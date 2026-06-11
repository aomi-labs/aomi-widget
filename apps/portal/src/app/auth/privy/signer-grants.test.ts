import { describe, expect, it, vi } from "vitest";

import {
  ensureServerSignerAccess,
  isDuplicateSignerGrantError,
} from "./signer-grants";

describe("ensureServerSignerAccess", () => {
  it("treats duplicate signer errors as already granted and continues", async () => {
    const addSigners = vi
      .fn<({ address }: { address: string }) => Promise<unknown>>()
      .mockImplementation(async ({ address }) => {
        if (address === "0xabc") {
          throw new Error(
            "Duplicate signer(s) provided when updating wallet. To address, ensure each additional signer has not already been added.",
          );
        }
        return {};
      });

    const result = await ensureServerSignerAccess({
      wallets: [
        { address: "0xabc", chainType: "ethereum" },
        {
          address: "So11111111111111111111111111111111111111112",
          chainType: "solana",
        },
      ],
      signerId: "signer-1",
      addSigners,
      retryDelaysMs: [0],
    });

    expect(result).toBeNull();
    expect(addSigners).toHaveBeenCalledTimes(2);
    expect(addSigners.mock.calls[1]?.[0]).toMatchObject({
      address: "So11111111111111111111111111111111111111112",
    });
  });

  it("returns the wallet-scoped error when a grant really fails", async () => {
    const addSigners = vi
      .fn<({ address }: { address: string }) => Promise<unknown>>()
      .mockImplementation(async ({ address }) => {
        if (address === "0xabc") {
          throw new Error("Duplicate signer(s) provided when updating wallet.");
        }
        throw new Error("temporary upstream failure");
      });

    const result = await ensureServerSignerAccess({
      wallets: [
        { address: "0xabc", chainType: "ethereum" },
        {
          address: "So11111111111111111111111111111111111111112",
          chainType: "solana",
        },
      ],
      signerId: "signer-1",
      addSigners,
      retryDelaysMs: [0],
    });

    expect(result).toBe("solana: temporary upstream failure");
  });
});

describe("isDuplicateSignerGrantError", () => {
  it("matches Privy duplicate signer wording", () => {
    expect(
      isDuplicateSignerGrantError(
        "Duplicate signer(s) provided when updating wallet. To address, ensure each additional signer has not already been added.",
      ),
    ).toBe(true);
  });
});
