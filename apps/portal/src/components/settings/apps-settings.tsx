"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccountIdentity } from "@/lib/use-account-identity";
import { getSettingsApiKey, setSettingsApiKey, settingsApiFetch } from "@/lib/settings-api";
import { defaultUsageDateRange } from "@/lib/usage-range";

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
  const identity = useAccountIdentity();
  const [overview, setOverview] = useState<AppOverview | null>(null);
  const [fromDate, setFromDate] = useState<string>(() => defaultUsageDateRange().fromDate);
  const [toDate, setToDate] = useState<string>(() => defaultUsageDateRange().toDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [applyingKey, setApplyingKey] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : "Failed to load apps overview");
    } finally {
      setLoading(false);
    }
  }, [fromDate, identity.address, toDate]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    setKeyInput(getSettingsApiKey() ?? "");
  }, []);

  const applyDisabled = useMemo(
    () => applyingKey || !identity.address,
    [applyingKey, identity.address],
  );

  const onApplyKey = useCallback(async () => {
    if (applyDisabled) return;

    setApplyingKey(true);
    setStatus(null);
    try {
      const nextApiKey = keyInput.trim() || null;
      setSettingsApiKey(nextApiKey);
      await fetchOverview();
      setStatus(
        nextApiKey
          ? "API key applied. App access refreshed."
          : "API key cleared. App access refreshed.",
      );
      window.dispatchEvent(
        new CustomEvent("aomi:apps-updated", {
          detail: { apiKey: nextApiKey },
        }),
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to apply API key");
    } finally {
      setApplyingKey(false);
    }
  }, [applyDisabled, fetchOverview, keyInput]);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Apps</h3>
        <div className="rounded-3xl border border-input bg-background p-5 space-y-4">
          {!identity.address && (
            <p className="text-sm text-muted-foreground">Connect a wallet to view app access.</p>
          )}
          {loading && <p className="text-sm text-muted-foreground">Loading app usage...</p>}
          {error && <p className="text-sm text-destructive">Failed to load usage: {error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-muted-foreground">
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
                className="mt-1 w-full px-3 py-2 border border-input rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-sm bg-background text-foreground"
              />
            </label>
            <label className="block text-sm text-muted-foreground">
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
                className="mt-1 w-full px-3 py-2 border border-input rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-sm bg-background text-foreground"
              />
            </label>
          </div>
          {!loading && overview && (
            <>
              <p className="text-sm text-muted-foreground">
                Range: {overview.period_utc_from} to {overview.period_utc_to}
              </p>
              <p className="text-sm text-muted-foreground">
                Credits: {formatNumber(overview.overall.credit_used)} / {formatNumber(overview.overall.credit_paid)}
              </p>
              <p className="text-sm text-muted-foreground">
                Tokens: in {formatNumber(overview.overall.input_tokens)} | out {formatNumber(overview.overall.output_tokens)}
              </p>
            </>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">App API Key</h3>
        <div className="rounded-3xl border border-input bg-background p-5 space-y-3">
          <label htmlFor="app-api-key" className="block text-sm font-medium text-foreground">
            API key
          </label>
          <input
            id="app-api-key"
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Enter API key (optional)"
            className="w-full px-5 py-3 border border-input rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-sm bg-background text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            API keys expand app access per request and are not bound to your account profile.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setKeyInput("");
              }}
              disabled={applyingKey}
              className="px-5 py-2.5 text-sm font-medium text-foreground bg-secondary rounded-full hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear input
            </button>
            <button
              type="button"
              onClick={() => {
                void onApplyKey();
              }}
              disabled={applyDisabled}
              className="px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {applyingKey ? "Applying..." : "Apply key"}
            </button>
          </div>
          {status && <p className="text-sm text-muted-foreground">{status}</p>}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Available Apps</h3>
        <div className="rounded-3xl border border-input bg-background p-2 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2">App</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Credits</th>
                <th className="px-3 py-2">Tokens In</th>
                <th className="px-3 py-2">Tokens Out</th>
              </tr>
            </thead>
            <tbody>
              {overview?.apps?.map((row) => (
                <tr key={row.app} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">{row.app}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.source}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatNumber(row.credits_used)} / {formatNumber(row.credit_paid)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{formatNumber(row.input_tokens)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatNumber(row.output_tokens)}</td>
                </tr>
              ))}
              {!overview?.apps?.length && (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
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
