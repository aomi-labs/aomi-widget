import { describe, expect, it } from "vitest";

import {
  monthRange,
  recentMonthKeys,
  toMonthlyStatement,
  type WireModelStatement,
} from "./statement-api";

const WIRE: WireModelStatement = {
  period_utc_from: "2026-07-01",
  period_utc_to: "2026-07-31",
  apps: [
    {
      app: "default",
      turns: 12,
      input_tokens: 4000,
      output_tokens: 900,
      credits_used: 120,
      usd: 1.2,
      by_model: [
        {
          model: "claude-sonnet-5",
          provider: "anthropic",
          payment_method: "null",
          turns: 10,
          input_tokens: 3600,
          output_tokens: 700,
          credits_used: 100,
          usd: 1.0,
        },
        {
          model: "claude-haiku-4-5",
          provider: "anthropic",
          payment_method: "coinbase",
          turns: 2,
          input_tokens: 400,
          output_tokens: 200,
          credits_used: 20,
          usd: 0.2,
        },
      ],
    },
    {
      app: "uniswap",
      turns: 3,
      input_tokens: 800,
      output_tokens: 150,
      credits_used: 30,
      usd: 0.3,
      by_model: [
        {
          model: "claude-sonnet-5",
          provider: "anthropic",
          payment_method: "byok",
          turns: 3,
          input_tokens: 800,
          output_tokens: 150,
          credits_used: 30,
          usd: 0.3,
        },
      ],
    },
  ],
  payment: [
    {
      method: "null",
      credits_used: 100,
      usd: 1.0,
      paid_credits: 0,
      paid_usd: 0,
    },
    {
      method: "coinbase",
      credits_used: 20,
      usd: 0.2,
      paid_credits: 20,
      paid_usd: 0.2,
    },
    {
      method: "byok",
      credits_used: 30,
      usd: 0.3,
      paid_credits: 0,
      paid_usd: 0,
    },
  ],
  total_credits_used: 150,
  total_usd: 1.5,
};

describe("statement adapter", () => {
  it("computes month ranges including leap/short months", () => {
    expect(monthRange("2026-07")).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
    });
    expect(monthRange("2026-02")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(monthRange("2028-02")).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
  });

  it("lists recent months newest first across a year boundary", () => {
    const keys = recentMonthKeys(3, new Date(Date.UTC(2026, 0, 15)));
    expect(keys).toEqual(["2026-01", "2025-12", "2025-11"]);
  });

  it("maps the wire statement onto MonthlyStatement with tool/outcome absent", () => {
    const month = toMonthlyStatement(WIRE, "2026-07", {
      included: 500,
      used: 120,
    });

    expect(month.period.periodLabel).toBe("July 2026");
    expect(month.summary.totalUsd).toBeCloseTo(1.5);
    expect(month.summary.modelUsd).toBeCloseTo(1.5);
    // Unwritten subjects are absent, never invented.
    expect(month.apps.every((a) => a.tool === null && a.outcome === null)).toBe(
      true,
    );
    expect(
      month.byApp.every((r) => r.toolUsd === null && r.outcomeUsd === null),
    ).toBe(true);

    const core = month.apps.find((a) => a.id === "default");
    expect(core?.model.byModel).toHaveLength(2);
    expect(core?.model.turns).toBe(12);
    expect(core?.settings.appByok).toBe(false);

    // An app whose every line is BYOK is marked as paying with its own key.
    const uni = month.apps.find((a) => a.id === "uniswap");
    expect(uni?.settings.appByok).toBe(true);
    expect(uni?.model.billed).toBe(false);
    expect(uni?.model.byModel[0]?.note).toBe("paid by your own key");

    // Payment strip: quota applied + x402 settlement, allowance passed through.
    expect(month.payment.allowanceAppliedUsd).toBeCloseTo(1.0);
    expect(month.payment.x402SettledUsd).toBeCloseTo(0.2);
    expect(month.payment.settledVia).toBe("coinbase");
    expect(month.payment.allowanceCredits).toEqual({
      included: 500,
      used: 120,
    });
  });

  it("keeps provider and payment method on otherwise-identical model rows", () => {
    const mixed: WireModelStatement = {
      ...WIRE,
      apps: [
        {
          ...WIRE.apps[0],
          by_model: [
            {
              ...WIRE.apps[0].by_model[0],
              model: "claude-sonnet-5",
              payment_method: "null",
            },
            {
              ...WIRE.apps[0].by_model[0],
              model: "claude-sonnet-5",
              payment_method: "byok",
            },
          ],
        },
      ],
    };

    const month = toMonthlyStatement(mixed, "2026-07", {
      included: 500,
      used: 120,
    });

    expect(month.apps[0]?.model.byModel).toMatchObject([
      {
        model: "claude-sonnet-5",
        provider: "anthropic",
        paymentMethod: "null",
      },
      {
        model: "claude-sonnet-5",
        provider: "anthropic",
        paymentMethod: "byok",
        note: "paid by your own key",
      },
    ]);
  });
});
