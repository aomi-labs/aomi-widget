"use client";

import { useCallback, useEffect, useState } from "react";
import { useAomiWalletKit } from "@aomi-labs/widget-lib";
import { settingsApiFetch } from "@portal/lib/settings-api";

type AccountOverview = {
  user: {
    tier?: string | null;
    status?: string | null;
  };
  usage?: {
    credit_used?: number;
    credit_paid?: number;
  } | null;
};

export type AccountSummary = {
  connected: boolean;
  address: string | null;
  /** Short display label for the identity row */
  identityLabel: string;
  /** Secondary line: tier, Connected, or Not connected — never a fake Free */
  statusLabel: string;
  tier: string | null;
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
  const [tier, setTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountUnavailable, setAccountUnavailable] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setAccountUnavailable(false);
    try {
      const data = await settingsApiFetch<AccountOverview>("/api/account");
      if (signal?.aborted) return;
      setTier(data.user?.tier?.trim() || null);
      setAccountUnavailable(false);
    } catch {
      if (signal?.aborted) return;
      setTier(null);
      setAccountUnavailable(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    void load(controller.signal);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [load, connected, identity.address]);

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
    loading,
    accountUnavailable,
    canConnect: Boolean(adapter.canConnect),
    connect: () => {
      void adapter.connect();
    },
    retry: () => {
      void load();
    },
  };
}
