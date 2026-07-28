"use client";

// Partner payment ledger on the Usage page: what each priced tool costs, who
// the beneficiary is, and the accrue → settle trail. Settlement is reconciled
// at recipient-bucket scope, so one receipt can clear fees from several apps.

import { Card, TD, TH } from "./table";
import {
  caipChainLabel,
  plural,
  secondsLabel,
  truncateAddress,
  usdLabel,
} from "./format";

type Row = Record<string, any>;

function eventLabel(event: Row): string {
  return event.kind === "settlement_confirmed"
    ? "Settlement confirmed"
    : "Fee accrued";
}

function SummaryTiles({
  summary,
  toolCount,
}: {
  summary: Row;
  toolCount: number;
}) {
  const settlements = Number(summary.settlements ?? 0);
  const tiles = [
    {
      label: "Priced calls",
      value: Number(summary.pricedCalls ?? 0).toLocaleString(),
      sub: plural(toolCount, "configured tool"),
    },
    {
      label: "Accrued",
      value: usdLabel(summary.accruedUsd),
      sub: `${Number(summary.accruedCredits ?? 0).toFixed(2)} credits`,
    },
    {
      label: "Settled",
      value: usdLabel(summary.settledUsd),
      sub: plural(settlements, "receipt"),
    },
    {
      label: "Outstanding",
      value: usdLabel(summary.outstandingUsd),
      sub: "recipient bucket",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {tiles.map((tile) => (
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
  );
}

function ConfiguredPrices({ resources }: { resources: Row[] }) {
  return (
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
              <tr key={`${resource.applicationId}-${resource.tool}-${index}`}>
                <td className={TD}>
                  <div className="font-mono text-xs">{resource.tool}</div>
                  <div className="text-dim text-xs">{resource.application}</div>
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
                    {[resource.beneficiary, caipChainLabel(resource.chain)]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </td>
                <td className={`${TD} text-xs`}>
                  {plural(Number(resource.observedCalls ?? 0), "call")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PaymentActivity({ events }: { events: Row[] }) {
  return (
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
                  <div className="text-xs">{eventLabel(event)}</div>
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
                  <Receipt event={event} />
                </td>
              </tr>
            ))}
            {!events.length ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-dim px-3 py-6 text-center text-xs"
                >
                  Pricing is live. Payment activity appears after a successful
                  priced call.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Receipt({ event }: { event: Row }) {
  if (!event.receiptId) return <>—</>;
  const label = truncateAddress(event.receiptId);
  if (!event.explorerUrl) return <>{label}</>;
  return (
    <a
      href={event.explorerUrl}
      target="_blank"
      rel="noreferrer"
      className="hover:underline"
    >
      {label}
    </a>
  );
}

export function PartnerPayments({ payments }: { payments: Row }) {
  const summary: Row = payments.summary ?? {};
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
      <SummaryTiles summary={summary} toolCount={resources.length} />
      <div className="grid gap-2 xl:grid-cols-2">
        <ConfiguredPrices resources={resources} />
        <PaymentActivity events={events} />
      </div>
    </div>
  );
}
