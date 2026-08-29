import { describe, expect, it } from "vitest";
import { mainnet } from "viem/chains";

import type { Action } from "@aomi-labs/client";

import { describeAction } from "./action";

const meta = {
  type: "action" as const,
  event_id: "event-1",
  sequence: 1,
  turn_id: "turn-1",
  occurred_at: 1,
  revision: 1,
  state: "pending" as const,
  result: null,
  created_at: 1,
  expires_at: null,
};

describe("Telegram Action presentation", () => {
  it("shows every typed-signing section, including the verifying contract", () => {
    const action = {
      ...meta,
      id: "action-1",
      request: {
        type: "sign",
        requestId: "sign-1",
        chainFamily: "evm",
        executionKind: "message",
        signer: "0x0000000000000000000000000000000000000003",
        chainId: 1,
        description: "Sign permit",
        payloads: [
          {
            kind: "evm_typed_data",
            typed_data: {
              domain: {
                chainId: 1,
                name: "Permit",
                verifyingContract:
                  "0x0000000000000000000000000000000000000001",
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
    } as unknown as Action;

    const summary = describeAction(action, mainnet);

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
    const action = {
      ...meta,
      id: "action-2",
      request: {
        type: "execute_evm",
        transactions: [
          {
            chain_id: 1,
            from: "0x0000000000000000000000000000000000000002",
            to: "0x0000000000000000000000000000000000000001",
            data: calldata,
            value: "0",
            label: "Transfer",
            kind: "transfer",
          },
        ],
      },
    } as Action;

    expect(describeAction(action, mainnet)?.fields).toContainEqual({
      label: "Calldata",
      value: calldata,
      mono: true,
    });
  });

  it("shows backend-owned calls and fees before ERC-4337 approval", () => {
    const action = {
      ...meta,
      id: "action-3",
      request: {
        type: "sign",
        requestId: "sign-3",
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
    } as unknown as Action;

    const summary = describeAction(action, mainnet);

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
