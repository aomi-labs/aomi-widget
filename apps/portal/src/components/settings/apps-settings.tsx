"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccountCredentialUnavailableError,
  createAccountAccessTokenProvider,
} from "@aomi-labs/client";
import { Input, useAomiWalletKit } from "@aomi-labs/widget-lib";
import { getBackendUrl, settingsApiFetch } from "@portal/lib/settings-api";
import { defaultUsageDateRange } from "@portal/lib/usage-range";
import { shouldUseBetterAuthBackendJwt } from "@portal/lib/backend-auth";
import {
  settingsBodyTextClass,
  settingsCardStackClass,
  settingsCardTitleClass,
  settingsInputClass,
  settingsLabelClass,
  settingsPageClass,
  settingsSubTitleClass,
  settingsTableCardClass,
  settingsTitleClass,
} from "./settings-styles";

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
  const { accountUser, getAccountCredential } = useAomiWalletKit();
  const [overview, setOverview] = useState<AppOverview | null>(null);
  const [fromDate, setFromDate] = useState<string>(
    () => defaultUsageDateRange().fromDate,
  );
  const [toDate, setToDate] = useState<string>(
    () => defaultUsageDateRange().toDate,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountAccessTokenProvider = useMemo(() => {
    return createAccountAccessTokenProvider({
      baseUrl: getBackendUrl(),
      betterAuthToken: {
        enabled: shouldUseBetterAuthBackendJwt(),
        baseUrl: "",
      },
      getProviderCredential: async () => {
        if (!getAccountCredential) {
          throw new AccountCredentialUnavailableError();
        }
        const credential = await getAccountCredential();
        if (!credential) {
          throw new AccountCredentialUnavailableError(
            "No account credential is available",
          );
        }
        if ("providerToken" in credential) {
          return credential;
        }
        if (credential.kind === "token") {
          return {
            provider: credential.provider,
            providerToken: credential.token,
          };
        }
        throw new Error("Account credential cannot be exchanged");
      },
    });
  }, [getAccountCredential]);

  useEffect(
    () => () => {
      accountAccessTokenProvider.dispose();
    },
    [accountAccessTokenProvider],
  );

  const accountFetch = useCallback(
    async <T,>(path: string, options?: RequestInit): Promise<T> => {
      const accessToken = await accountAccessTokenProvider();
      const headers = new Headers(options?.headers);
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
      return settingsApiFetch<T>(path, { ...options, headers });
    },
    [accountAccessTokenProvider],
  );

  const fetchOverview = useCallback(async () => {
    if (!accountUser) {
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
        from_date: fromDate,
        to_date: toDate,
      });
      const data = await accountFetch<AppOverview>(
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
  }, [accountFetch, accountUser, fromDate, toDate]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  return (
    <div className={settingsPageClass}>
      <div>
        <h1 className={`${settingsTitleClass} mb-4`}>Usage</h1>
        <div className={settingsCardStackClass}>
          {!accountUser && (
            <p className={settingsBodyTextClass}>
              Connect your account to view usage across your apps.
            </p>
          )}
          {loading && <p className={settingsBodyTextClass}>Loading usage...</p>}
          {error && (
            <p className="text-destructive text-sm">
              Failed to load usage: {error}
            </p>
          )}
          <p className={settingsCardTitleClass}>Date Range</p>
          <div className="mr-2 grid gap-8 sm:grid-cols-2">
            <label className={settingsLabelClass}>
              From
              <Input
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
                className={`${settingsInputClass} mt-2`}
              />
            </label>
            <label className={settingsLabelClass}>
              To
              <Input
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
                className={`${settingsInputClass} mt-1`}
              />
            </label>
          </div>
          {!loading && overview && (
            <>
              <p className={settingsBodyTextClass}>
                Range: {overview.period_utc_from} to {overview.period_utc_to}
              </p>
              <p className={settingsBodyTextClass}>
                Credits: {formatNumber(overview.overall.credit_used)} /{" "}
                {formatNumber(overview.overall.credit_paid)}
              </p>
              <p className={settingsBodyTextClass}>
                Tokens: in {formatNumber(overview.overall.input_tokens)} | out{" "}
                {formatNumber(overview.overall.output_tokens)}
              </p>
            </>
          )}
        </div>
      </div>

      <div>
        <h2 className={`${settingsSubTitleClass} mb-4`}>Usage by App</h2>
        <div className={settingsTableCardClass}>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-center">
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
                  <td
                    className="text-muted-foreground px-3 py-4 text-center"
                    colSpan={5}
                  >
                    No usage found.
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
