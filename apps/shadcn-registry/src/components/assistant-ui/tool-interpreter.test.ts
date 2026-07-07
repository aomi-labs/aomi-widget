import { describe, expect, it } from "vitest";
import { PencilLineIcon, PuzzleIcon } from "lucide-react";

import { interpretToolStep } from "@/components/assistant-ui/tool-interpreter";

const labelsFor = (chips: { label: string }[]) =>
  chips.map((chip) => chip.label);

describe("tool interpreter", () => {
  it("recognizes web search results", () => {
    const step = interpretToolStep({
      toolName: "Check current ETH price",
      result: {
        args: [
          "Found 3 results:",
          "",
          "1. ETHUSD - Ethereum Price Chart - TradingView",
          "   URL: https://www.tradingview.com/symbols/ETHUSD/",
        ].join("\n"),
      },
    });

    expect(step.title).toBe("Search web");
    expect(labelsFor(step.chips)).toEqual([
      "ETH",
      "3 results",
      "tradingview.com",
    ]);
  });

  it("wraps plain text results before matching", () => {
    const step = interpretToolStep({
      toolName: "Check current ETH price",
      result: [
        "Found 2 results:",
        "",
        "1. ETHUSD - Ethereum Price Chart - TradingView",
        "   URL: https://www.tradingview.com/symbols/ETHUSD/",
      ].join("\n"),
    });

    expect(step.title).toBe("Search web");
    expect(labelsFor(step.chips)).toEqual([
      "ETH",
      "2 results",
      "tradingview.com",
    ]);
  });

  it("unwraps routed tool envelopes before matching", () => {
    const step = interpretToolStep({
      toolName: "Confirm Base network",
      result: {
        __aomi_tool_routes: [{ id: "route-1" }],
        value: {
          chain_name: "base",
          chain_id: 8453,
          rpc_endpoint: "http://127.0.0.1:56293",
          block_number: 48317939,
        },
      },
    });

    expect(step.title).toBe("Check network");
    expect(labelsFor(step.chips)).toEqual(["Base", "48,317,939"]);
  });

  it("uses parsed argsText facts in the fallback path", () => {
    const step = interpretToolStep({
      toolName: "Check USDC",
      argsText: JSON.stringify({ chain_id: 8453 }),
    });

    expect(step.title).toBe("Check USDC");
    expect(labelsFor(step.chips)).toEqual(["USDC", "Base"]);
    expect(step.confidence).toBe("medium");
  });

  it("surfaces error results with normalized status chips", () => {
    const step = interpretToolStep({
      toolName: "Call token contract",
      result: {
        is_error: true,
        error: { code: "rpc_error" },
      },
    });

    expect(step.title).toBe("Call token contract");
    expect(labelsFor(step.chips)).toEqual(["Failed"]);
    expect(step.chips[0].icon).toBeTypeOf("object");
    expect(step.chips[0].dot).toBeUndefined();
  });

  it("recognizes skill activation", () => {
    const step = interpretToolStep({
      toolName: "Activate skills",
      result: {
        activated: ["aerodrome"],
        rejected: [["common_erc20", "token_budget_trim"]],
        applied_scope: "current_serve_cycle",
      },
    });

    expect(step.title).toBe("Activate skill");
    expect(labelsFor(step.chips)).toEqual(["Aerodrome"]);
    expect(step.chips[0].icon).toBe(PuzzleIcon);
    expect(step.chips[0].icon).not.toBe(step.icon);
  });

  it("recognizes Base chain context", () => {
    const step = interpretToolStep({
      toolName: "Confirm Base network and current block time",
      result: {
        chain_name: "base",
        chain_id: 8453,
        rpc_endpoint: "http://127.0.0.1:56293",
        block_number: 48314732,
        gas_price_wei: "1004545855",
      },
    });

    expect(step.title).toBe("Check network");
    expect(labelsFor(step.chips)).toEqual(["Base", "48,314,732"]);
    expect(step.chips[0].icon).toBeTypeOf("function");
    expect(step.chips[0].dot).toBeUndefined();
    expect(step.chips[1].icon).toBeTypeOf("object");
  });

  it("recognizes native balances", () => {
    const step = interpretToolStep({
      toolName: "Check connected wallet balance on Base",
      result: {
        address: "0xda65d415cc9d5ddc2a08bdffc996750755fc3cf0",
        balance_wei: "865899754337366",
        balance_eth: "0.000865899754337366",
        nonce: 594,
      },
    });

    expect(step.title).toBe("Check connected wallet balance on Base");
    expect(labelsFor(step.chips)).toEqual(["0xda65...3cf0", "0.00087"]);
    expect(step.chips[1].icon).toBeTypeOf("function");
  });

  it("standardizes token resolution chips", () => {
    const step = interpretToolStep({
      toolName: "Resolve USDC on Base",
      result: {
        found: true,
        count: 1,
        contracts: [
          {
            address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
            chain: "base",
            chain_id: 8453,
            name: "FiatTokenProxy",
            symbol: "USDC",
          },
        ],
      },
    });

    expect(step.title).toBe("Resolve contract");
    expect(labelsFor(step.chips)).toEqual(["Base", "USDC"]);
    expect(step.chips[0].icon).toBeTypeOf("function");
    expect(step.chips[1].icon).toBeTypeOf("object");
  });

  it("omits not-found badges for token misses", () => {
    const step = interpretToolStep({
      toolName: "Resolve AERO token",
      result: {
        found: false,
        count: 0,
        contracts: [],
      },
    });

    expect(step.title).toBe("Resolve token");
    expect(labelsFor(step.chips)).toEqual(["AERO"]);
  });

  it("shows chain for token misses when the payload carries one", () => {
    const step = interpretToolStep({
      toolName: "Resolve AERO token",
      result: {
        found: false,
        count: 0,
        chain_id: 8453,
        contracts: [],
      },
    });

    expect(step.title).toBe("Resolve token");
    expect(labelsFor(step.chips)).toEqual(["Base", "AERO"]);
  });

  it("recognizes ERC-20 balance calls without token-specific formatting", () => {
    const step = interpretToolStep({
      toolName: "Check USDC balance on Base",
      result: {
        success: true,
        tx: {
          from: "0xda65d415cc9d5ddc2a08bdffc996750755fc3cf0",
          to: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          input:
            "0x70a08231000000000000000000000000da65d415cc9d5ddc2a08bdffc996750755fc3cf0",
          chain_id: 8453,
        },
        result_decoded: {
          decoded: {
            type: "uint256",
            decoded: "131961",
          },
        },
      },
    });

    expect(step.title).toBe("Check token balance");
    expect(labelsFor(step.chips)).toEqual(["Base", "USDC", "0xda65...3cf0"]);
    expect(step.chips[0].icon).toBeTypeOf("function");
    expect(step.chips[1].icon).toBeTypeOf("object");
    expect(step.chips[2].icon).toBeTypeOf("object");
  });

  it("recognizes ERC-20 decimal reads", () => {
    const step = interpretToolStep({
      toolName: "Check USDT decimals on Base",
      result: {
        success: true,
        tx: {
          to: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          input: "0x313ce567",
          chain_id: 8453,
        },
        result_decoded: {
          decoded: {
            type: "uint256",
            decoded: "6",
          },
        },
      },
    });

    expect(step.title).toBe("Read token decimals");
    expect(labelsFor(step.chips)).toEqual(["Base", "USDT", "6 decimals"]);
    expect(step.chips[2].icon).toBeTypeOf("object");
  });

  it("recognizes allowance checks without value chips", () => {
    const step = interpretToolStep({
      toolName: "Check USDC allowance for Aerodrome router",
      result: {
        success: true,
        tx: {
          from: "0xda65d415cc9d5ddc2a08bdffc996750755fc3cf0",
          to: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          input:
            "0xdd62ed3e000000000000000000000000da65d415cc9d5ddc2a08bdffc996750755fc3cf0000000000000000000000000cf77a3ba9a5ca399b7c97c74d54e5b1beb874e43",
          chain_id: 8453,
        },
        result_decoded: {
          decoded: {
            type: "uint256",
            decoded: "0",
          },
        },
      },
    });

    expect(step.title).toBe("Check allowance");
    expect(labelsFor(step.chips)).toEqual([
      "Base",
      "USDC",
      "0xda65...3cf0",
      "0xcf77...4e43",
    ]);
    expect(step.chips[2].icon).toBeTypeOf("object");
  });

  it("falls back to the model label for protocol-specific calls", () => {
    const step = interpretToolStep({
      toolName: "Check Aerodrome volatile USDC AERO pool",
      result: {
        success: true,
        tx: {
          from: "0xda65d415cc9d5ddc2a08bdffc996750755fc3cf0",
          to: "0x420DD381b31aEf6683db6B902084cB0FFECe40Da",
          input:
            "0x79bc57d5000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000940181a94a35a4569e4529a3cdfb74e38fd986310000000000000000000000000000000000000000000000000000000000000000",
          chain_id: 8453,
        },
        result_decoded: {
          decoded: {
            as_address: "0x6cdcb1c4a4d1c3c6d054b27ac5b77e89eafb971d",
          },
        },
      },
    });

    expect(step.title).toBe("Check Aerodrome volatile USDC AERO pool");
    expect(labelsFor(step.chips)).toEqual([
      "Base",
      "0xda65...3cf0",
      "0x420d...40da",
    ]);
    expect(step.chips[0].icon).toBeTypeOf("function");
    expect(step.chips[1].icon).toBeTypeOf("object");
    expect(step.chips[2].icon).toBeTypeOf("object");
  });

  it("recognizes staged swaps", () => {
    const step = interpretToolStep({
      toolName: "Stage Aerodrome USDC to AERO swap",
      result: {
        chain_id: 8453,
        data: "0xcac88ea9000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000940181a94a35a4569e4529a3cdfb74e38fd98631",
        kind: "swap",
        pending_tx_id: 2,
        current_lifecycle: "queued",
      },
    });

    expect(step.title).toBe("Stage Aerodrome USDC to AERO swap");
    expect(labelsFor(step.chips)).toEqual(["Base", "Swap", "2 txs", "Queued"]);
    expect(step.chips[0].icon).toBeTypeOf("function");
    expect(step.chips[1].icon).toBeTypeOf("object");
    expect(step.chips[2].icon).toBeTypeOf("object");
  });

  it("capitalizes staged ERC-20 approval labels and uses action and tx icons", () => {
    const step = interpretToolStep({
      toolName: "Stage exact USDC approval for Aerodrome swap",
      result: {
        chain_id: 8453,
        data: "0x095ea7b3000000000000000000000000cf77a3ba9a5ca399b7c97c74d54e5b1beb874e430000000000000000000000000000000000000000000000000000000000002710",
        kind: "erc20_approve",
        pending_tx_id: 1,
        current_lifecycle: "queued",
      },
    });

    expect(step.title).toBe("Stage exact USDC approval for Aerodrome swap");
    expect(labelsFor(step.chips)).toEqual([
      "Base",
      "Approve",
      "1 tx",
      "Queued",
    ]);
    expect(step.chips[1].icon).toBe(PencilLineIcon);
    expect(step.chips[2].icon).toBeTypeOf("object");
  });

  it("keeps a generic icon on unknown staged action chips", () => {
    const step = interpretToolStep({
      toolName: "Stage custom governance action",
      result: {
        chain_id: 8453,
        data: "0x12345678",
        kind: "delegate_vote",
        pending_tx_id: 3,
        current_lifecycle: "queued",
      },
    });

    expect(labelsFor(step.chips)).toEqual([
      "Base",
      "Delegate vote",
      "3 txs",
      "Queued",
    ]);
    expect(step.chips[1].icon).toBeTypeOf("object");
  });

  it("does not infer routes from hardcoded protocol or token addresses", () => {
    const step = interpretToolStep({
      toolName: "Quote Aerodrome AERO to USDC",
      result: {
        success: true,
        tx: {
          from: "0xda65d415cc9d5ddc2a08bdffc996750755fc3cf0",
          to: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
          input:
            "0x5509a1ac000000000000000000000000940181a94a35a4569e4529a3cdfb74e38fd98631000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913",
          chain_id: 8453,
        },
      },
    });

    expect(step.title).toBe("Quote Aerodrome AERO to USDC");
    expect(labelsFor(step.chips)).toEqual([
      "Base",
      "0xda65...3cf0",
      "0xcf77...4e43",
    ]);
  });

  it("recognizes simulations", () => {
    const step = interpretToolStep({
      toolName: "Simulate exact USDC approval plus Aerodrome swap on Base",
      result: {
        simulation: {
          batch_success: true,
          network: "base",
          total_gas: 262888,
          steps: [{ step: 1 }, { step: 2 }],
        },
      },
    });

    expect(step.title).toBe("Simulate batch");
    expect(labelsFor(step.chips)).toEqual([
      "Base",
      "2 txs",
      "262,888 gas",
      "Success",
    ]);
    expect(step.chips[0].icon).toBeTypeOf("function");
    expect(step.chips[1].icon).toBeTypeOf("object");
    expect(step.chips[2].icon).toBeTypeOf("object");
    expect(step.chips[3].icon).toBeTypeOf("object");
    expect(step.chips[3].dot).toBeUndefined();
  });

  it("recognizes pending wallet approval", () => {
    const step = interpretToolStep({
      toolName: "Commit Aerodrome USDC to AERO swap batch",
      result: {
        chain_id: 8453,
        status: "pending_approval",
        tx_ids: [1, 2],
      },
    });

    expect(step.title).toBe("Await wallet approval");
    expect(labelsFor(step.chips)).toEqual([
      "Base",
      "2 txs",
      "Pending approval",
    ]);
    expect(step.chips[0].icon).toBeTypeOf("function");
    expect(step.chips[1].icon).toBeTypeOf("object");
    expect(step.chips[2].icon).toBeTypeOf("object");
    expect(step.chips[2].dot).toBeUndefined();
  });
});
