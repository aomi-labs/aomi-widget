import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import { UsageSettings } from "./usage-settings";
import { seedAccountOverview } from "@portal/lib/account-overview";

const STATEMENT = {
  period_utc_from: "2026-07-01",
  period_utc_to: "2026-07-31",
  apps: [
    {
      app: "default",
      turns: 8,
      input_tokens: 2000,
      output_tokens: 400,
      credits_used: 80,
      usd: 0.8,
      by_model: [
        {
          model: "claude-sonnet-5",
          provider: "anthropic",
          payment_method: "null",
          turns: 8,
          input_tokens: 2000,
          output_tokens: 400,
          credits_used: 80,
          usd: 0.8,
        },
      ],
    },
  ],
  payment: [
    { method: "null", credits_used: 80, usd: 0.8, paid_credits: 0, paid_usd: 0 },
  ],
  total_credits_used: 80,
  total_usd: 0.8,
};

describe("usage settings wiring", () => {
  beforeEach(() => {
    seedAccountOverview({
      user: { user_id: "acct-1", verified_email: "alice@example.com" },
      usage: {
        input_tokens: 2000,
        output_tokens: 400,
        credit_used: 80,
        credit_paid: 500,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    seedAccountOverview(null);
  });

  it("loads the month from the statement route and renders subjects honestly", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = new URL(input.toString(), "https://portal.test");
        calls.push(url.pathname + url.search);
        if (url.pathname === "/api/account/statement") {
          return Response.json(STATEMENT);
        }
        return new Response("unexpected", { status: 500 });
      }),
    );

    await act(async () => {
      render(<UsageSettings />);
    });

    // One statement fetch, month-ranged.
    const statementCall = calls.find((c) => c.startsWith("/api/account/statement"));
    expect(statementCall).toMatch(/from_date=\d{4}-\d{2}-01/);

    // Model spend is real (Models row, Total, and the matrix all carry it);
    // unwritten subjects render as absent, not $0.00.
    expect(screen.getAllByText("$0.80").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/8 turns/).length).toBeGreaterThanOrEqual(1);
    // Allowance meter fed by the profile's credit position.
    expect(screen.getByText(/Credits 80\/500/)).toBeTruthy();
  });
});
