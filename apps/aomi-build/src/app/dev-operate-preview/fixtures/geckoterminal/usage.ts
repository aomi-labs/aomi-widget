import type { UsageRows } from "../types";

export const usage: UsageRows = {
  revenue: [
    {
      stream: "Tool invocations",
      how: "no pricing configured",
      events: "52 calls",
      gross: "$0.00",
      take: "$0.00",
      net: "$0.00",
      dim: true,
    },
  ],
  charges: [
    {
      item: "Model usage",
      detail: "Customer-provided key · no model charges",
      amount: "$0.00",
      badge: "BYOK",
      dim: true,
    },
    {
      item: "App hosting",
      detail: "Standard plan · $10.00 per app / month",
      amount: "$10.00",
    },
  ],
  ledger: [
    { ts: 1784559500, day: "2026-07-15", entry: "18 sessions · customer key", gross: "—", fee: "—", model: "—", net: "—" },
    { ts: 1784469000, day: "2026-07-14", entry: "22 sessions · customer key", gross: "—", fee: "—", model: "—", net: "—" },
  ],
};
