"use client";

// Usage page: builder-facing revenue-share statement (gross / platform fee /
// net + charges) when the backend emits `statement`; falls back to the
// legacy token/credits meter until then. End-user spend stays in Chat billing.

import Link from "next/link";
import {
  chainLabel,
  secondsLabel,
  signedUsdLabel,
  statementPeriodLabel,
  subjectLabel,
  tokensLabel,
  truncateAddress,
  usdLabel,
} from "./format";

type Row = Record<string, any>;

const TH = "px-3 py-2 text-left text-xs uppercase text-dim font-medium";
const TD = "px-3 py-2";

function beneficiaryChainLabel(value: unknown): string {
  const raw = String(value ?? "");
  const chainId = Number(raw.split(":")[1]);
  return raw.startsWith("eip155:") && Number.isSafeInteger(chainId)
    ? chainLabel({ chainId })
    : raw;
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
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

function PartnerPayments({ payments }: { payments: Row }) {
  const summary = payments.summary ?? {};
  const resources: Row[] = payments.resources ?? [];
  const events: Row[] = payments.events ?? [];
  if (!resources.length && !events.length) return null;
  return (
    <div className="space-y-2">
      <div>
        <div className="text-foreground text-sm font-medium">
          Partner payments
        </div>
        <p className="text-dim mt-1 text-xs leading-5">
          Priced tools accrue debt to the configured beneficiary. Settlements
          are reconciled at recipient-bucket scope because one receipt can clear
          fees from more than one app.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          {
            label: "Priced calls",
            value: Number(summary.pricedCalls ?? 0).toLocaleString(),
            sub: `${resources.length} configured tool${resources.length === 1 ? "" : "s"}`,
          },
          {
            label: "Accrued",
            value: usdLabel(summary.accruedUsd),
            sub: `${Number(summary.accruedCredits ?? 0).toFixed(2)} credits`,
          },
          {
            label: "Settled",
            value: usdLabel(summary.settledUsd),
            sub: `${Number(summary.settlements ?? 0)} receipt${Number(summary.settlements ?? 0) === 1 ? "" : "s"}`,
          },
          {
            label: "Outstanding",
            value: usdLabel(summary.outstandingUsd),
            sub: "recipient bucket",
          },
        ].map((tile) => (
          <div
            key={tile.label}
            className="border-border bg-surface rounded-md border px-3 py-2.5"
          >
            <div className="text-dim text-xs">{tile.label}</div>
            <div className="text-foreground text-lg font-semibold">
              {tile.value}
            </div>
            <div className="text-dim text-xs">{tile.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-2 xl:grid-cols-2">
        <Card title="Configured prices">
          <div className="overflow-x-auto">
            <table className="divide-border min-w-full divide-y text-sm">
              <thead className="bg-surface-subtle">
                <tr>
                  <th className={TH}>Tool</th>
                  <th className={TH}>Price</th>
                  <th className={TH}>Beneficiary</th>
                  <th className={TH}>Observed</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {resources.map((resource, index) => (
                  <tr
                    key={`${resource.applicationId}-${resource.tool}-${index}`}
                  >
                    <td className={TD}>
                      <div className="font-mono text-xs">{resource.tool}</div>
                      <div className="text-dim text-xs">
                        {resource.application}
                      </div>
                    </td>
                    <td className={`${TD} whitespace-nowrap font-mono text-xs`}>
                      {Number(resource.flatCredits ?? 0).toFixed(2)} credits
                      <div className="text-dim">
                        {usdLabel(resource.flatUsd)} / success
                      </div>
                    </td>
                    <td className={TD}>
                      <div
                        className="font-mono text-xs"
                        title={resource.recipient ?? ""}
                      >
                        {truncateAddress(resource.recipient)}
                      </div>
                      <div className="text-dim text-xs">
                        {[
                          resource.beneficiary,
                          beneficiaryChainLabel(resource.chain),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </td>
                    <td className={`${TD} text-xs`}>
                      {Number(resource.observedCalls ?? 0).toLocaleString()}{" "}
                      calls
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Payment activity">
          <div className="overflow-x-auto">
            <table className="divide-border min-w-full divide-y text-sm">
              <thead className="bg-surface-subtle">
                <tr>
                  <th className={TH}>Time</th>
                  <th className={TH}>Event</th>
                  <th className={TH}>Amount</th>
                  <th className={TH}>Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className={`${TD} text-dim whitespace-nowrap text-xs`}>
                      {secondsLabel(event.occurredAt)}
                    </td>
                    <td className={TD}>
                      <div className="text-xs">
                        {event.kind === "settlement_confirmed"
                          ? "Settlement confirmed"
                          : "Fee accrued"}
                      </div>
                      <div className="text-dim text-xs">
                        {event.application ?? truncateAddress(event.recipient)}
                      </div>
                    </td>
                    <td className={`${TD} whitespace-nowrap font-mono text-xs`}>
                      {usdLabel(event.usd)}
                      <div className="text-dim">
                        {Number(event.credits ?? 0).toFixed(2)} credits
                      </div>
                    </td>
                    <td className={`${TD} font-mono text-xs`}>
                      {event.receiptId ? (
                        event.explorerUrl ? (
                          <a
                            href={event.explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            {truncateAddress(event.receiptId)}
                          </a>
                        ) : (
                          truncateAddress(event.receiptId)
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
                {!events.length ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-dim px-3 py-6 text-center text-xs"
                    >
                      Pricing is live. Payment activity appears after a
                      successful priced call.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Statement({
  statement,
  breakdown,
}: {
  statement: Row;
  breakdown: Row[];
}) {
  const summary = statement.summary;
  const revenue: Row[] = statement.revenue ?? [];
  const charges: Row[] = statement.charges ?? [];
  const entries: Row[] = statement.entries ?? [];
  const period = statementPeriodLabel(statement.range);
  return (
    <div className="space-y-4">
      <p className="text-dim text-xs leading-5">
        Revenue, platform fees, and charges for your apps in this statement
        period. End-user spend is reported separately under{" "}
        <Link
          href="/settings/billing"
          className="text-foreground hover:underline"
        >
          Account → Billing
        </Link>
        .
      </p>

      {summary ? (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            {
              label: "Gross revenue",
              value: usdLabel(summary.grossRevenue),
              sub: "collected from end users",
            },
            {
              label: "Platform fees",
              value: usdLabel(-Math.abs(summary.platformFees)),
              sub: "revenue share",
            },
            {
              label: "Service charges",
              value: usdLabel(-Math.abs(summary.serviceCharges)),
              sub: "model usage & hosting",
            },
            {
              label: "Net",
              value: signedUsdLabel(summary.net),
              sub: period,
              net: true,
            },
          ].map((tile) => (
            <div
              key={tile.label}
              className="border-border bg-surface rounded-md border px-3 py-2.5"
            >
              <div className="text-dim text-xs">{tile.label}</div>
              <div
                className={`text-lg font-semibold ${tile.net ? "text-emerald-500" : "text-foreground"}`}
              >
                {tile.value}
              </div>
              <div className="text-dim text-xs">{tile.sub}</div>
            </div>
          ))}
        </div>
      ) : null}

      {statement.payments ? (
        <PartnerPayments payments={statement.payments} />
      ) : null}

      <Card
        title="Revenue"
        right={
          period ? <span className="text-dim text-xs">{period}</span> : null
        }
      >
        <div className="overflow-x-auto">
          <table className="divide-border min-w-full divide-y text-sm">
            <thead className="bg-surface-subtle">
              <tr>
                <th className={TH}>Subject</th>
                <th className={TH}>App</th>
                <th className={TH}>Events</th>
                <th className={TH}>Gross</th>
                <th className={TH}>Platform fee</th>
                <th className={TH}>Net</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {revenue.map((row, i) => (
                <tr key={i} className={row.gross === 0 ? "text-dim" : ""}>
                  <td className={`${TD} font-medium`}>
                    {subjectLabel(row.subject)}
                  </td>
                  <td className={TD}>{row.application}</td>
                  <td className={`${TD} text-xs`}>{row.events}</td>
                  <td className={`${TD} font-mono text-xs`}>
                    {usdLabel(row.gross)}
                  </td>
                  <td className={`${TD} font-mono text-xs`}>
                    {usdLabel(row.platformFee)}
                  </td>
                  <td className={`${TD} font-mono text-xs font-semibold`}>
                    {usdLabel(row.net)}
                  </td>
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
                  <th className={TH}>Events</th>
                  <th className={TH}>Amount</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {charges.map((row, i) => (
                  <tr key={i}>
                    <td className={TD}>{subjectLabel(row.item)}</td>
                    <td className={TD}>{row.application}</td>
                    <td className={`${TD} text-dim text-xs`}>{row.events}</td>
                    <td className={`${TD} font-mono text-xs`}>
                      {usdLabel(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Model usage detail"
          right={<span className="text-dim text-xs">by provider/model</span>}
        >
          <div className="px-3 py-2">
            <div className="space-y-2">
              {breakdown.map((row, index) => (
                <div
                  key={`${row.provider}-${row.model}-${index}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate font-mono text-xs">
                    {row.provider}/{row.model}
                  </span>
                  <span className="text-dim font-mono text-xs">
                    {Number(row.creditsUsed ?? 0).toFixed(4)}
                  </span>
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

      <Card title="Entries">
        <div className="overflow-x-auto">
          <table className="divide-border min-w-full divide-y text-sm">
            <thead className="bg-surface-subtle">
              <tr>
                <th className={TH}>Day</th>
                <th className={TH}>App</th>
                <th className={TH}>Subject</th>
                <th className={TH}>Events</th>
                <th className={TH}>Gross</th>
                <th className={TH}>Platform fee</th>
                <th className={TH}>Net</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {entries.map((row, i) => (
                <tr key={i}>
                  <td className={`${TD} text-dim whitespace-nowrap`}>
                    {row.day}
                  </td>
                  <td className={TD}>{row.application}</td>
                  <td className={`${TD} text-xs`}>
                    {subjectLabel(row.subject)}
                  </td>
                  <td className={`${TD} text-xs`}>{row.events}</td>
                  <td className={`${TD} font-mono text-xs`}>
                    {usdLabel(row.gross)}
                  </td>
                  <td className={`${TD} font-mono text-xs`}>
                    {usdLabel(row.platformFee)}
                  </td>
                  <td className={`${TD} font-mono text-xs font-semibold`}>
                    {signedUsdLabel(row.net)}
                  </td>
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
        <Link
          href="/settings/billing"
          className="text-foreground hover:underline"
        >
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
                <tr
                  key={`${row.source?.id}-${row.periodUtcDay}-${row.application}-${index}`}
                >
                  <td className="px-3 py-2">{row.periodUtcDay}</td>
                  <td className="px-3 py-2">{row.application}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {tokensLabel(row.inputTokens)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {tokensLabel(row.outputTokens)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {Number(row.creditsUsed ?? 0).toFixed(4)}
                  </td>
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
                <span className="text-dim">
                  {Number(row.creditsUsed ?? 0).toFixed(4)}
                </span>
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
