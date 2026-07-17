"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@aomi-labs/widget-lib";
import { settingsApiFetch } from "@portal/lib/settings-api";
import { defaultUsageDateRange } from "@portal/lib/usage-range";
import {
  SettingsEmpty,
  SettingsPanel,
  SettingsPromoCard,
  SettingsPill,
  SettingsRow,
  SettingsSkeletonRows,
  SettingsTable,
} from "@portal/components/settings/settings-primitives";

type AppRow = {
  app: string;
  is_available: boolean;
  source: string;
  input_tokens: number;
  output_tokens: number;
  credits_used: number;
  credit_paid: number;
};

type AppOverview = {
  period_utc_from: string;
  period_utc_to: string;
  overall: {
    input_tokens: number;
    output_tokens: number;
    credit_used: number;
    credit_paid: number;
  };
  apps: AppRow[];
};

function formatNumber(n?: number): string {
  if (typeof n !== "number") return "0";
  return new Intl.NumberFormat().format(n);
}

export function AppsSettings() {
  const [overview, setOverview] = useState<AppOverview | null>(null);
  const [fromDate, setFromDate] = useState(
    () => defaultUsageDateRange().fromDate,
  );
  const [toDate, setToDate] = useState(() => defaultUsageDateRange().toDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    if (fromDate > toDate) {
      setOverview(null);
      setError("From date must be on or before to date.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        from_date: fromDate,
        to_date: toDate,
      });
      const data = await settingsApiFetch<AppOverview>(
        `/api/account/usage?${query.toString()}`,
      );
      setOverview(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load usage overview",
      );
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  return (
    <SettingsPanel
      title="Usage"
      description="Credits and tokens by app and date range."
    >
      <SettingsRow label="From" description="UTC start date">
        <Input
          type="date"
          value={fromDate}
          max={toDate}
          onChange={(e) => {
            const next = e.target.value;
            setFromDate(next);
            if (next > toDate) setToDate(next);
          }}
          className="border-border h-8 w-auto rounded-full border px-3 text-[12.5px] shadow-none"
        />
      </SettingsRow>
      <SettingsRow label="To" description="UTC end date">
        <Input
          type="date"
          value={toDate}
          min={fromDate}
          onChange={(e) => {
            const next = e.target.value;
            setToDate(next);
            if (next < fromDate) setFromDate(next);
          }}
          className="border-border h-8 w-auto rounded-full border px-3 text-[12.5px] shadow-none"
        />
      </SettingsRow>

      {loading ? <SettingsSkeletonRows count={4} /> : null}

      {!loading && error ? (
        <SettingsPromoCard
          title="Account offline"
          description={error}
          action={
            <SettingsPill onClick={() => void fetchOverview()}>
              Retry
            </SettingsPill>
          }
        />
      ) : null}

      {!loading && !error && overview ? (
        <>
          <SettingsRow
            label="Credits"
            description={`${overview.period_utc_from} → ${overview.period_utc_to}`}
          >
            <span className="text-foreground text-[12.5px] font-medium">
              {formatNumber(overview.overall.credit_used)} /{" "}
              {formatNumber(overview.overall.credit_paid)}
            </span>
          </SettingsRow>
          <SettingsRow label="Tokens in">
            <span className="text-muted-foreground text-[12.5px]">
              {formatNumber(overview.overall.input_tokens)}
            </span>
          </SettingsRow>
          <SettingsRow label="Tokens out">
            <span className="text-muted-foreground text-[12.5px]">
              {formatNumber(overview.overall.output_tokens)}
            </span>
          </SettingsRow>

          {overview.apps.length ? (
            <SettingsTable
              headers={["App", "Source", "Credits", "In", "Out"]}
            >
              {overview.apps.map((row) => (
                <tr key={row.app} className="border-border/50 border-t">
                  <td className="text-foreground px-3 py-2.5 font-medium">
                    {row.app}
                  </td>
                  <td className="text-muted-foreground px-3 py-2.5">
                    {row.source}
                  </td>
                  <td className="text-muted-foreground px-3 py-2.5">
                    {formatNumber(row.credits_used)} /{" "}
                    {formatNumber(row.credit_paid)}
                  </td>
                  <td className="text-muted-foreground px-3 py-2.5">
                    {formatNumber(row.input_tokens)}
                  </td>
                  <td className="text-muted-foreground px-3 py-2.5">
                    {formatNumber(row.output_tokens)}
                  </td>
                </tr>
              ))}
            </SettingsTable>
          ) : (
            <SettingsEmpty
              title="No usage in this range"
              description="Widen the range or send a few messages first."
            />
          )}
        </>
      ) : null}
    </SettingsPanel>
  );
}
