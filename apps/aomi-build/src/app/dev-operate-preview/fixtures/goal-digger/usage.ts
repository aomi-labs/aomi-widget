import type { UsageRows } from "../types";

export const usage: UsageRows = {
  revenue: [
    {
      stream: "Tool invocations",
      how: "x402 · $1.00 per call",
      events: "128 paid calls",
      gross: "$128.00",
      take: "$12.80 (10%)",
      net: "$115.20",
    },
    {
      stream: "Outcome fees",
      how: "0.5% of transaction value",
      events: "1 event · $10,000 transacted",
      gross: "$50.00",
      take: "$15.00 (30%)",
      net: "$35.00",
    },
  ],
  charges: [
    {
      item: "Model usage",
      detail: "Managed keys · $9.12 base + 10% platform rate",
      amount: "$10.03",
      badge: "managed",
    },
    {
      item: "App hosting",
      detail: "Standard plan · $10.00 per app / month",
      amount: "$10.00",
    },
  ],
  ledger: [
    { ts: 1784560000, day: "2026-07-15", entry: "Tool invocations × 42", gross: "$42.00", fee: "−$4.20", model: "−$3.76", net: "$34.04" },
    { ts: 1784559000, day: "2026-07-15", entry: "Outcome fee · $10,000 transacted", gross: "$50.00", fee: "−$15.00", model: "—", net: "$35.00" },
    { ts: 1784470000, day: "2026-07-14", entry: "Tool invocations × 51", gross: "$51.00", fee: "−$5.10", model: "−$3.41", net: "$42.49" },
    { ts: 1784380000, day: "2026-07-13", entry: "Tool invocations × 35", gross: "$35.00", fee: "−$3.50", model: "−$2.86", net: "$28.64" },
  ],
};
