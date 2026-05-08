"use client";

import { useCallback, useEffect, useState } from "react";
import { useAomiAuthAdapter } from "@aomi-labs/widget-lib";
import { settingsApiFetch } from "@portal/lib/settings-api";
import { defaultUsageDateRange } from "@portal/lib/usage-range";

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
  user: {
    user_id: string;
    public_key: string;
    tier: string;
    verified_email?: string | null;
  };
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
  const { identity } = useAomiAuthAdapter();
  const [overview, setOverview] = useState<AppOverview | null>(null);
  const [fromDate, setFromDate] = useState<string>(
    () => defaultUsageDateRange().fromDate,
  );
  const [toDate, setToDate] = useState<string>(
    () => defaultUsageDateRange().toDate,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!identity.address) {
      setOverview(null);
      return;
    }
    if (fromDate > toDate) {
      setOverview(null);
      setError("From date must be on or before to date.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        public_key: identity.address,
        from_date: fromDate,
        to_date: toDate,
      });
      const data = await settingsApiFetch<AppOverview>(
        `/api/settings/apps/overview?${query.toString()}`,
      );
      setOverview(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load apps overview",
      );
    } finally {
      setLoading(false);
    }
  }, [fromDate, identity.address, toDate]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-foreground mb-4 text-lg font-semibold">Apps</h3>
        <div className="border-input bg-background space-y-4 rounded-3xl border p-5">
          {!identity.address && (
            <p className="text-muted-foreground text-sm">
              Connect a wallet to view app access.
            </p>
          )}
          {loading && (
            <p className="text-muted-foreground text-sm">
              Loading app usage...
            </p>
          )}
          {error && (
            <p className="text-destructive text-sm">
              Failed to load usage: {error}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-muted-foreground block text-sm">
              From
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setFromDate(next);
                  if (next > toDate) {
                    setToDate(next);
                  }
                }}
                className="border-input focus:ring-ring focus:border-ring bg-background text-foreground mt-1 w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2"
              />
            </label>
            <label className="text-muted-foreground block text-sm">
              To
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setToDate(next);
                  if (next < fromDate) {
                    setFromDate(next);
                  }
                }}
                className="border-input focus:ring-ring focus:border-ring bg-background text-foreground mt-1 w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2"
              />
            </label>
          </div>
          {!loading && overview && (
            <>
              <p className="text-muted-foreground text-sm">
                Range: {overview.period_utc_from} to {overview.period_utc_to}
              </p>
              <p className="text-muted-foreground text-sm">
                Credits: {formatNumber(overview.overall.credit_used)} /{" "}
                {formatNumber(overview.overall.credit_paid)}
              </p>
              <p className="text-muted-foreground text-sm">
                Tokens: in {formatNumber(overview.overall.input_tokens)} | out{" "}
                {formatNumber(overview.overall.output_tokens)}
              </p>
            </>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-foreground mb-4 text-lg font-semibold">
          Available Apps
        </h3>
        <div className="border-input bg-background overflow-x-auto rounded-3xl border p-2">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left">
                <th className="px-3 py-2">App</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Credits</th>
                <th className="px-3 py-2">Tokens In</th>
                <th className="px-3 py-2">Tokens Out</th>
              </tr>
            </thead>
            <tbody>
              {overview?.apps?.map((row) => (
                <tr key={row.app} className="border-border border-t">
                  <td className="text-foreground px-3 py-2">{row.app}</td>
                  <td className="text-muted-foreground px-3 py-2">
                    {row.source}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">
                    {formatNumber(row.credits_used)} /{" "}
                    {formatNumber(row.credit_paid)}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">
                    {formatNumber(row.input_tokens)}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">
                    {formatNumber(row.output_tokens)}
                  </td>
                </tr>
              ))}
              {!overview?.apps?.length && (
                <tr>
                  <td className="text-muted-foreground px-3 py-4" colSpan={5}>
                    No apps found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
