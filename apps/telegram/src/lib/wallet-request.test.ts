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

  it("shows every typed-signing section, including the verifying contract", () => {
    const request = {
      id: "sign:11111111-1111-4111-8111-111111111111",
      kind: "signing",
      timestamp: 1,
      payload: {
        requestId: "sign:11111111-1111-4111-8111-111111111111",
        chainFamily: "evm",
        executionKind: "message",
        signer: "0x0000000000000000000000000000000000000003",
        chainId: 1,
        description: "Sign permit",
        payloads: [
          {
            kind: "evm_typed_data",
            typedData: {
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
        ],
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

  it("shows backend-owned calls and fees before ERC-4337 approval", () => {
    const request = {
      id: "sign:22222222-2222-4222-8222-222222222222",
      kind: "signing",
      timestamp: 1,
      payload: {
        requestId: "sign:22222222-2222-4222-8222-222222222222",
        chainFamily: "evm",
        executionKind: "erc4337",
        signer: "0x1111111111111111111111111111111111111111",
        chainId: 1,
        description: "Execute sponsored batch",
        calls: [
          {
            to: "0x2222222222222222222222222222222222222222",
            value: "10",
            data: "0x1234",
          },
        ],
        fees: [
          {
            asset: { kind: "native" },
            amount: "2",
            recipient: "0x3333333333333333333333333333333333333333",
          },
        ],
        payloads: [{ kind: "evm_personal", message: "0xabcd" }],
      },
    } as unknown as WalletRequest;

    const summary = describeRequest(request, mainnet);

    expect(summary?.title).toBe("Approve account action");
    expect(summary?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Calls",
          value: expect.stringContaining(
            "0x2222222222222222222222222222222222222222",
          ),
        }),
        expect.objectContaining({
          label: "Fees",
          value: expect.stringContaining(
            "0x3333333333333333333333333333333333333333",
          ),
        }),
        { label: "Message", value: "0xabcd", mono: true },
      ]),
    );
  });
});
