import { describe, expect, it } from "vitest";

import {
  normalizeTxPayload,
  toViemSignTypedDataArgs,
} from "../src/wallet-utils";

describe("wallet payload normalization", () => {
  it("normalizes a mixed-case address to its checksum form", () => {
    const payload = normalizeTxPayload({
      args: {
        to: "0xA0b86991c6218b36c1d19D4a2e9Eb0CE3606eb48",
        value: "0",
        data: "0x",
        chainId: 1,
      },
    });

    expect(payload).toMatchObject({
      to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      value: "0",
      data: "0x",
      chainId: 1,
    });
  });

  it("removes EIP712Domain before producing viem signing args", () => {
    const signArgs = toViemSignTypedDataArgs({
      typed_data: {
        domain: {
          chainId: 1,
          name: "Permit2",
        },
        types: {
          EIP712Domain: [{ name: "name", type: "string" }],
          PermitSingle: [{ name: "details", type: "PermitDetails" }],
        },
        primaryType: "PermitSingle",
        message: {
          spender: "0x0000000000000000000000000000000000000001",
        },
      },
    });

    expect(signArgs).toMatchObject({
      domain: {
        chainId: 1,
        name: "Permit2",
      },
      primaryType: "PermitSingle",
      message: {
        spender: "0x0000000000000000000000000000000000000001",
      },
    });
    expect(signArgs?.types).toEqual({
      PermitSingle: [{ name: "details", type: "PermitDetails" }],
    });
  });
});
