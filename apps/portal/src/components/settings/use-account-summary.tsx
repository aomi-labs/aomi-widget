"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAomiWalletKit } from "@aomi-labs/widget-lib";
import { settingsApiFetch } from "@portal/lib/settings-api";

export type AccountOverview = {
  user: {
    user_id: string;
    public_key: string;
    username?: string | null;
    apps: string[];
    tier?: string | null;
    status?: string | null;
    verified_email?: string | null;
    created_at: number;
    updated_at: number;
    last_seen_at?: number | null;
  };
  usage?: {
    period_utc_month: string;
    input_tokens: number;
    output_tokens: number;
    credit_used?: number;
    credit_paid?: number;
  } | null;
};

type AccountOverviewContextValue = {
  overview: AccountOverview | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

const AccountOverviewContext =
  createContext<AccountOverviewContextValue | null>(null);

export function AccountOverviewProvider({ children }: { children: ReactNode }) {
  const adapter = useAomiWalletKit();
  const identity = adapter.identity;
  const [overview, setOverview] = useState<AccountOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await settingsApiFetch<AccountOverview>("/api/account");
        if (!controller.signal.aborted) setOverview(data);
      } catch (loadError) {
        if (controller.signal.aborted) {
          setError("Account request timed out.");
        } else {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load account",
          );
        }
        setOverview(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void run();
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [attempt, identity.address, identity.isConnected]);

  const value = useMemo(
    () => ({
      overview,
      loading,
      error,
      retry: () => setAttempt((current) => current + 1),
    }),
    [error, loading, overview],
  );

  return (
    <AccountOverviewContext.Provider value={value}>
      {children}
    </AccountOverviewContext.Provider>
  );
}

export function useAccountOverview(): AccountOverviewContextValue {
  const value = useContext(AccountOverviewContext);
  if (!value) {
    throw new Error(
      "useAccountOverview must be used within AccountOverviewProvider",
    );
  }
  return value;
}

export type AccountSummary = {
  connected: boolean;
  address: string | null;
  /** Short display label for the identity row */
  identityLabel: string;
  /** Secondary line: tier, Connected, or Not connected — never a fake Free */
  statusLabel: string;
  tier: string | null;
  creditUsed: number | null;
  creditPaid: number | null;
  loading: boolean;
  accountUnavailable: boolean;
  canConnect: boolean;
  connect: () => void;
  retry: () => void;
};

function shortenAddress(address?: string | null): string {
  if (!address) return "Not connected";
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function useAccountSummary(): AccountSummary {
  const adapter = useAomiWalletKit();
  const identity = adapter.identity;
  const connected = identity.isConnected;
  const { overview, loading, error, retry } = useAccountOverview();
  const tier = overview?.user.tier?.trim() || null;
  const accountUnavailable = Boolean(error);

  const identityLabel = connected
    ? shortenAddress(identity.address)
    : "Not connected";

  let statusLabel = "Not connected";
  if (connected) {
    if (loading) statusLabel = "Loading…";
    else if (tier) statusLabel = tier;
    else if (accountUnavailable) statusLabel = "Account offline";
    else statusLabel = "Connected";
  }

  return {
    connected,
    address: identity.address ?? null,
    identityLabel,
    statusLabel,
    tier,
    creditUsed:
      typeof overview?.usage?.credit_used === "number"
        ? overview.usage.credit_used
        : null,
    creditPaid:
      typeof overview?.usage?.credit_paid === "number"
        ? overview.usage.credit_paid
        : null,
    loading,
    accountUnavailable,
    canConnect: Boolean(adapter.canConnect),
    connect: () => {
      void adapter.connect();
    },
    retry,
  };
}
