"use client";

// Usage page: builder-facing revenue-share statement (gross / platform fee /
// net + charges) when the backend emits `statement`; falls back to the
// legacy token/credits meter until then. End-user spend stays in Chat billing.

import Link from "next/link";
import { tokensLabel } from "./format";

type Row = Record<string, any>;

const TH = "px-3 py-2 text-left text-xs uppercase text-dim font-medium";
const TD = "px-3 py-2";

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

function Statement({ statement, breakdown }: { statement: Row; breakdown: Row[] }) {
  const summary = statement.summary;
  const revenue: Row[] = statement.revenue ?? [];
  const charges: Row[] = statement.charges ?? [];
  const ledger: Row[] = statement.ledger ?? [];
  return (
    <div className="space-y-4">
      <p className="text-dim text-xs leading-5">
        Revenue, platform fees, and charges for your apps in this billing period.
        End-user spend is reported separately under{" "}
        <Link href="/settings/billing" className="text-foreground hover:underline">
          Account → Billing
        </Link>
        .
      </p>

      {summary ? (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            { label: "Gross revenue", value: summary.gross, sub: "collected from end users" },
            { label: "Platform fees", value: summary.platformFees, sub: "revenue share" },
            { label: "Service charges", value: summary.serviceCharges, sub: "model usage & hosting" },
            { label: "Net revenue", value: summary.net, sub: summary.period, net: true },
          ].map((tile) => (
            <div key={tile.label} className="border-border bg-surface rounded-md border px-3 py-2.5">
              <div className="text-dim text-xs">{tile.label}</div>
              <div className={`text-lg font-semibold ${tile.net ? "text-emerald-500" : "text-foreground"}`}>
                {tile.value}
              </div>
              <div className="text-dim text-xs">{tile.sub}</div>
            </div>
          ))}
        </div>
      ) : null}

      <Card title="Revenue" right={summary?.period ? <span className="text-dim text-xs">{summary.period}</span> : null}>
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
              {revenue.map((row, i) => (
                <tr key={i} className={row.unpriced ? "text-dim" : ""}>
                  <td className={TD}>
                    <div className="font-medium">{row.stream}</div>
                    <div className="text-dim text-xs">{row.pricing}</div>
                  </td>
                  <td className={TD}>{row.application}</td>
                  <td className={`${TD} text-xs`}>{row.activity}</td>
                  <td className={`${TD} font-mono text-xs`}>{row.gross}</td>
                  <td className={`${TD} font-mono text-xs`}>{row.platformFee}</td>
                  <td className={`${TD} font-mono text-xs font-semibold`}>{row.net}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

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
                {charges.map((row, i) => (
                  <tr key={i}>
                    <td className={TD}>{row.item}</td>
                    <td className={TD}>
                      {row.application}
                      {row.keySource ? (
                        <span
                          className={`ml-2 rounded-full border px-1.5 py-0.5 text-[10px] ${
                            row.keySource === "byok"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                              : "border-border bg-surface-subtle text-dim"
                          }`}
                        >
                          {row.keySource === "byok" ? "BYOK" : "managed"}
                        </span>
                      ) : null}
                    </td>
                    <td className={`${TD} text-dim text-xs`}>{row.description}</td>
                    <td className={`${TD} font-mono text-xs`}>{row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Model usage detail" right={<span className="text-dim text-xs">by provider/model</span>}>
          <div className="px-3 py-2">
            <div className="space-y-2">
              {breakdown.map((row, index) => (
                <div key={`${row.provider}-${row.model}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-mono text-xs">
                    {row.provider}/{row.model}
                  </span>
                  <span className="text-dim font-mono text-xs">{Number(row.creditsUsed ?? 0).toFixed(4)}</span>
                </div>
              ))}
            </div>
            <p className="text-dim mt-2 text-xs leading-4">
              Token-level usage explains the base cost. Apps using
              customer-provided keys (BYOK) incur no model charges.
            </p>
          </div>
        </Card>
      </div>

      <Card title="Billing activity">
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
              {ledger.map((row, i) => (
                <tr key={i}>
                  <td className={`${TD} text-dim whitespace-nowrap`}>{row.day}</td>
                  <td className={TD}>{row.application}</td>
                  <td className={`${TD} text-xs`}>{row.entry}</td>
                  <td className={`${TD} font-mono text-xs`}>{row.gross}</td>
                  <td className={`${TD} font-mono text-xs`}>{row.platformFee}</td>
                  <td className={`${TD} font-mono text-xs`}>{row.modelCost}</td>
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

/** Legacy token/credits meter — shown until statement billing ships. */
function Meter({ daily, breakdown }: { daily: Row[]; breakdown: Row[] }) {
  return (
    <div className="space-y-3">
      <p className="text-dim text-xs leading-5">
        Model and token credits by app and day.{" "}
        <Link href="/settings/billing" className="text-foreground hover:underline">
          Account → Billing
        </Link>{" "}
        covers payment setup in Chat.
      </p>
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="border-border overflow-x-auto rounded-md border">
          <table className="divide-border min-w-full divide-y text-sm">
            <thead className="bg-surface-subtle text-dim text-left text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Day</th>
                <th className="px-3 py-2">App</th>
                <th className="px-3 py-2">Input</th>
                <th className="px-3 py-2">Output</th>
                <th className="px-3 py-2">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-border bg-surface divide-y">
              {daily.map((row, index) => (
                <tr key={`${row.source?.id}-${row.periodUtcDay}-${row.application}-${index}`}>
                  <td className="px-3 py-2">{row.periodUtcDay}</td>
                  <td className="px-3 py-2">{row.application}</td>
                  <td className="px-3 py-2 font-mono text-xs">{tokensLabel(row.inputTokens)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{tokensLabel(row.outputTokens)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{Number(row.creditsUsed ?? 0).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-border bg-surface rounded-md border p-3">
          <div className="text-dim mb-2 text-xs uppercase">Breakdown</div>
          <div className="space-y-2">
            {breakdown.map((row, index) => (
              <div
                key={`${row.source?.id}-${row.provider}-${row.model}-${index}`}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate">
                  {row.provider}/{row.model}
                </span>
                <span className="text-dim">{Number(row.creditsUsed ?? 0).toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function UsageRows({ payload }: { payload: Row }) {
  const daily: Row[] = payload.daily ?? [];
  const breakdown: Row[] = payload.breakdown ?? [];
  if (payload.statement) {
    return <Statement statement={payload.statement} breakdown={breakdown} />;
  }
  return <Meter daily={daily} breakdown={breakdown} />;
}
