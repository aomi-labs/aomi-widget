import { describe, expect, it } from "vitest";
import { mainnet } from "viem/chains";

import type { WalletRequest } from "@aomi-labs/client";

import { describeRequest, requestedAaMode } from "./wallet-request";

describe("Telegram wallet request policy", () => {
  it("keeps auto and omitted AA preferences on the canonical 7702 path", () => {
    expect(requestedAaMode({ aaPreference: "auto" })).toBe("7702");
    expect(requestedAaMode({})).toBe("7702");
    expect(requestedAaMode({ aaPreference: "eip4337" })).toBe("4337");
    expect(requestedAaMode({ aaPreference: "none" })).toBe("none");
  });

  it("shows every signed EIP-712 section, including the verifying contract", () => {
    const request = {
      id: "eip712-1",
      kind: "eip712_sign",
      timestamp: 1,
      payload: {
        typed_data: {
          domain: {
            chainId: 1,
            name: "Permit",
            verifyingContract: "0x0000000000000000000000000000000000000001",
            version: "1",
          },
          types: {
            Permit: [
              { name: "spender", type: "address" },
              { name: "value", type: "uint256" },
            ],
          },
          primaryType: "Permit",
          message: {
            spender: "0x0000000000000000000000000000000000000002",
            value: "10",
          },
        },
      },
    } as unknown as WalletRequest;
    const summary = describeRequest(request, mainnet);

    expect(summary?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Domain",
          value: expect.stringContaining(
            "0x0000000000000000000000000000000000000001",
          ),
        }),
        expect.objectContaining({
          label: "Types",
          value: expect.stringContaining("spender"),
        }),
        expect.objectContaining({
          label: "Message",
          value: expect.stringContaining("value"),
        }),
      ]),
    );
  });

  it("shows complete transaction calldata instead of only its selector", () => {
    const calldata = `0x12345678${"ab".repeat(32)}`;
    const summary = describeRequest(
      {
        id: "tx-1",
        kind: "transaction",
        timestamp: 1,
        payload: {
          calls: [
            {
              txId: 1,
              to: "0x0000000000000000000000000000000000000001",
              data: calldata,
              value: "0",
              chainId: 1,
            },
          ],
        },
      },
      mainnet,
    );

    expect(summary?.fields).toContainEqual({
      label: "Calldata",
      value: calldata,
      mono: true,
    });
  });
});
