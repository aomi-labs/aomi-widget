"use client";

// TEMPORARY design mock: builder-facing Usage as a revenue-share statement.
// The question this page answers: "how much fee has this platform cost me,
// and what did I earn through it?" — NOT user token spend (that's Chat billing).

const SUMMARY = [
  { label: "Gross revenue", value: "$178.00", sub: "collected from end users" },
  { label: "Platform fees", value: "−$27.80", sub: "revenue share", tone: "fee" },
  { label: "Service charges", value: "−$30.03", sub: "model usage & hosting", tone: "fee" },
  { label: "Net revenue", value: "+$120.17", sub: "Jul 1 – Jul 15", tone: "net" },
];

const EARNINGS = [
  {
    stream: "Tool invocations",
    how: "x402 · $1.00 per call",
    app: "goal-digger",
    events: "128 paid calls",
    gross: "$128.00",
    take: "$12.80 (10%)",
    net: "$115.20",
  },
  {
    stream: "Outcome fees",
    how: "0.5% of transaction value",
    app: "goal-digger",
    events: "1 event · $10,000 transacted",
    gross: "$50.00",
    take: "$15.00 (30%)",
    net: "$35.00",
  },
  {
    stream: "Tool invocations",
    how: "no pricing configured",
    app: "geckoterminal",
    events: "52 calls",
    gross: "$0.00",
    take: "$0.00",
    net: "$0.00",
    dim: true,
  },
];

const COSTS = [
  {
    item: "Model usage",
    app: "goal-digger",
    detail: "Managed keys · $9.12 base + 10% platform rate",
    amount: "$10.03",
    badge: "managed",
  },
  {
    item: "Model usage",
    app: "geckoterminal",
    detail: "Customer-provided key · no model charges",
    amount: "$0.00",
    badge: "BYOK",
    dim: true,
  },
  {
    item: "App hosting",
    app: "goal-digger",
    detail: "Standard plan · $10.00 per app / month",
    amount: "$10.00",
  },
  {
    item: "App hosting",
    app: "geckoterminal",
    detail: "Standard plan · $10.00 per app / month",
    amount: "$10.00",
  },
];

const LEDGER = [
  { day: "2026-07-15", app: "goal-digger", entry: "Tool invocations × 42", gross: "$42.00", fee: "−$4.20", model: "−$3.76", net: "$34.04" },
  { day: "2026-07-15", app: "goal-digger", entry: "Outcome fee · $10,000 transacted", gross: "$50.00", fee: "−$15.00", model: "—", net: "$35.00" },
  { day: "2026-07-15", app: "geckoterminal", entry: "18 sessions · customer key", gross: "—", fee: "—", model: "—", net: "—" },
  { day: "2026-07-14", app: "goal-digger", entry: "Tool invocations × 51", gross: "$51.00", fee: "−$5.10", model: "−$3.41", net: "$42.49" },
  { day: "2026-07-13", app: "goal-digger", entry: "Tool invocations × 35", gross: "$35.00", fee: "−$3.50", model: "−$2.86", net: "$28.64" },
];

const MODEL_DETAIL = [
  { model: "anthropic/claude-opus-4-8", base: "$8.21", upcharge: "$0.82", billed: "$9.03" },
  { model: "anthropic/claude-haiku-4-5", base: "$0.91", upcharge: "$0.09", billed: "$1.00" },
];

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-border bg-surface rounded-md border">
      <div className="border-border flex items-center justify-between border-b px-3 py-2">
        <span className="text-dim text-xs font-medium uppercase">{title}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

const TH = "px-3 py-2 text-left text-xs uppercase text-dim font-medium";
const TD = "px-3 py-2";

export function UsageMock() {
  return (
    <div className="space-y-4">
      <p className="text-dim text-xs leading-5">
        Revenue, platform fees, and charges for your apps in this billing period.
        End-user spend is reported separately under Account → Billing.
      </p>

      {/* Net position strip */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {SUMMARY.map((tile) => (
          <div key={tile.label} className="border-border bg-surface rounded-md border px-3 py-2.5">
            <div className="text-dim text-xs">{tile.label}</div>
            <div
              className={`text-lg font-semibold ${
                tile.tone === "net" ? "text-emerald-500" : tile.tone === "fee" ? "text-foreground" : "text-foreground"
              }`}
            >
              {tile.value}
            </div>
            <div className="text-dim text-xs">{tile.sub}</div>
          </div>
        ))}
      </div>

      {/* Earnings: gross → aomi take → net */}
      <Card title="Revenue" right={<span className="text-dim text-xs">Jul 1 – Jul 15</span>}>
        <div className="overflow-x-auto">
          <table className="divide-border min-w-full divide-y text-sm">
            <thead className="bg-surface-subtle">
              <tr>
                <th className={TH}>Stream</th>
                <th className={TH}>App</th>
                <th className={TH}>Activity</th>
                <th className={TH}>Gross</th>
                <th className={TH}>Platform fee</th>
                <th className={TH}>Net</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {EARNINGS.map((row, i) => (
                <tr key={i} className={row.dim ? "text-dim" : ""}>
                  <td className={TD}>
                    <div className="font-medium">{row.stream}</div>
                    <div className="text-dim text-xs">{row.how}</div>
                  </td>
                  <td className={TD}>{row.app}</td>
                  <td className={`${TD} text-xs`}>{row.events}</td>
                  <td className={`${TD} font-mono text-xs`}>{row.gross}</td>
                  <td className={`${TD} font-mono text-xs`}>{row.take}</td>
                  <td className={`${TD} font-mono text-xs font-semibold`}>{row.net}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Costs: what the platform charges the builder */}
      <div className="grid gap-2 lg:grid-cols-[1fr_360px]">
        <Card title="Charges">
          <div className="overflow-x-auto">
            <table className="divide-border min-w-full divide-y text-sm">
              <thead className="bg-surface-subtle">
                <tr>
                  <th className={TH}>Item</th>
                  <th className={TH}>App</th>
                  <th className={TH}>Description</th>
                  <th className={TH}>Amount</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {COSTS.map((row, i) => (
                  <tr key={i} className={row.dim ? "text-dim" : ""}>
                    <td className={TD}>{row.item}</td>
                    <td className={TD}>
                      {row.app}
                      {row.badge ? (
                        <span
                          className={`ml-2 rounded-full border px-1.5 py-0.5 text-[10px] ${
                            row.badge === "BYOK"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                              : "border-border bg-surface-subtle text-dim"
                          }`}
                        >
                          {row.badge}
                        </span>
                      ) : null}
                    </td>
                    <td className={`${TD} text-dim text-xs`}>{row.detail}</td>
                    <td className={`${TD} font-mono text-xs`}>{row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Model usage detail" right={<span className="text-dim text-xs">managed keys · 10% platform rate</span>}>
          <div className="px-3 py-2">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-dim py-1 pr-3 text-left text-xs font-medium uppercase">Model</th>
                  <th className="text-dim py-1 pr-3 text-left text-xs font-medium uppercase">Base</th>
                  <th className="text-dim py-1 pr-3 text-left text-xs font-medium uppercase">Platform rate</th>
                  <th className="text-dim py-1 text-left text-xs font-medium uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {MODEL_DETAIL.map((row) => (
                  <tr key={row.model}>
                    <td className="max-w-44 truncate py-1.5 pr-3 font-mono text-xs">{row.model}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs">{row.base}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs">{row.upcharge}</td>
                    <td className="py-1.5 font-mono text-xs font-semibold">{row.billed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-dim mt-2 text-xs leading-4">
              Token-level usage explains the base cost. Apps using
              customer-provided keys (BYOK) incur no model charges.
            </p>
          </div>
        </Card>
      </div>

      {/* Daily ledger */}
      <Card title="Billing activity" right={<span className="text-dim text-xs">Jul 13 – Jul 15</span>}>
        <div className="overflow-x-auto">
          <table className="divide-border min-w-full divide-y text-sm">
            <thead className="bg-surface-subtle">
              <tr>
                <th className={TH}>Day</th>
                <th className={TH}>App</th>
                <th className={TH}>Description</th>
                <th className={TH}>Gross</th>
                <th className={TH}>Platform fee</th>
                <th className={TH}>Model</th>
                <th className={TH}>Net</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {LEDGER.map((row, i) => (
                <tr key={i}>
                  <td className={`${TD} text-dim whitespace-nowrap`}>{row.day}</td>
                  <td className={TD}>{row.app}</td>
                  <td className={`${TD} text-xs`}>{row.entry}</td>
                  <td className={`${TD} font-mono text-xs`}>{row.gross}</td>
                  <td className={`${TD} font-mono text-xs`}>{row.fee}</td>
                  <td className={`${TD} font-mono text-xs`}>{row.model}</td>
                  <td className={`${TD} font-mono text-xs font-semibold`}>{row.net}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
