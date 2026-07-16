import type { UsageRows } from "../types";

export const usage: UsageRows = {
  revenue: [
    {
      stream: "Tool invocations",
      how: "x402 · $0.25 per call",
      events: "21 paid calls",
      gross: "$5.25",
      take: "$0.53 (10%)",
      net: "$4.72",
    },
  ],
  charges: [
    {
      item: "Model usage",
      detail: "Managed keys · $1.70 base + 10% platform rate",
      amount: "$1.87",
      badge: "managed",
    },
    {
      item: "App hosting",
      detail: "Standard plan · $10.00 per app / month",
      amount: "$10.00",
    },
  ],
  ledger: [
    { ts: 1784558000, day: "2026-07-15", entry: "Tool invocations × 13", gross: "$3.25", fee: "−$0.33", model: "−$1.02", net: "$1.90" },
    { ts: 1784468000, day: "2026-07-14", entry: "Tool invocations × 8", gross: "$2.00", fee: "−$0.20", model: "−$0.85", net: "$0.95" },
  ],
};
