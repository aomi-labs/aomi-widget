"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AomiClient,
  type AomiPaymentOverviewResponse,
} from "@aomi-labs/client";
import { useAomiAuthAdapter } from "@aomi-labs/widget-lib";
import { useAccount } from "wagmi";
import { usePaymentAwareClientOptions } from "./payment-client-options";
import {
  bindSettingsSession,
  getBackendUrl,
  getSettingsSessionId,
} from "./settings-api";
import { useSettings } from "./use-settings";

type MppStatus =
  | "disabled"
  | "wallet_required"
  | "unsupported_wallet"
  | "not_connected"
  | "connecting"
  | "ready"
  | "needs_top_up"
  | "needs_reconnect"
  | "error";

type X402Status = "disabled" | "wallet_required" | "ready";

type UsePaymentStatusResult = {
  isLoading: boolean;
  isRefreshing: boolean;
  isConnectingMpp: boolean;
  isClearingMpp: boolean;
  mppStatus: MppStatus;
  mppStatusText: string;
  mppReceiptId: string | null;
  mppCachePresent: boolean;
  mppLastError: string | null;
  x402Status: X402Status;
  x402StatusText: string;
  refreshPaymentStatus: () => Promise<void>;
  connectMpp: () => Promise<void>;
  clearMppCache: () => Promise<void>;
};

function deriveMppStatusText(status: MppStatus): string {
  switch (status) {
    case "disabled":
      return "MPP disabled";
    case "wallet_required":
      return "Connect wallet";
    case "unsupported_wallet":
      return "Use Para wallet";
    case "not_connected":
      return "Not connected";
    case "connecting":
      return "Connecting";
    case "ready":
      return "MPP ready";
    case "needs_top_up":
      return "Needs top-up";
    case "needs_reconnect":
      return "Needs reconnect";
    case "error":
      return "Setup failed";
  }
}

function deriveX402StatusText(status: X402Status): string {
  switch (status) {
    case "disabled":
      return "x402 disabled";
    case "wallet_required":
      return "Connect wallet";
    case "ready":
      return "x402 ready";
  }
}

export function usePaymentStatus(): UsePaymentStatusResult {
  const { identity } = useAomiAuthAdapter();
  const account = useAccount();
  const { settings } = useSettings();
  const backendUrl = getBackendUrl();
  const sessionId = getSettingsSessionId();
  const runtimeClientOptions = usePaymentAwareClientOptions();
  const connectorName = account.connector?.name?.toLowerCase() ?? "";
  const mppSupported = !connectorName || connectorName.includes("para");
  const client = useMemo(
    () => new AomiClient({ baseUrl: backendUrl, ...runtimeClientOptions }),
    [backendUrl, runtimeClientOptions],
  );

  const [overview, setOverview] = useState<AomiPaymentOverviewResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnectingMpp, setIsConnectingMpp] = useState(false);
  const [isClearingMpp, setIsClearingMpp] = useState(false);
  const [mppLastError, setMppLastError] = useState<string | null>(null);
  const [mppErrorStatus, setMppErrorStatus] = useState<MppStatus | null>(null);

  const ensureBoundSession = useCallback(async () => {
    await bindSettingsSession({
      publicKey: identity.address,
      chainId: identity.chainId,
    });
  }, [identity.address, identity.chainId]);

  const refreshPaymentStatus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await ensureBoundSession();
      const nextOverview = await client.getPaymentOverview(sessionId);
      setOverview(nextOverview);
      if (nextOverview.streams.some((stream) => stream.method === "tempo")) {
        setMppLastError(null);
        setMppErrorStatus(null);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load payment status";
      setMppLastError(message);
      setMppErrorStatus("error");
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [client, ensureBoundSession, sessionId]);

  useEffect(() => {
    void refreshPaymentStatus();
  }, [refreshPaymentStatus]);

  const tempoStream = useMemo(
    () => overview?.streams.find((stream) => stream.method === "tempo") ?? null,
    [overview],
  );

  // Connecting MPP is no longer an explicit user step. Once the dispatcher in
  // `payment-client-options.ts` is in place, the first chat turn that reaches
  // the Tempo gate triggers the 402 → mppx-sign → 200 handshake automatically
  // and the backend caches the channel. The previously-named `connectMpp`
  // button now just refreshes the cached overview state, so the call sites
  // (settings panel button, popover) stay meaningful as "Refresh status".
  const connectMpp = useCallback(async () => {
    setIsConnectingMpp(true);
    setMppLastError(null);
    setMppErrorStatus(null);
    try {
      await refreshPaymentStatus();
    } finally {
      setIsConnectingMpp(false);
    }
  }, [refreshPaymentStatus]);

  const clearMppCache = useCallback(async () => {
    setIsClearingMpp(true);
    setMppLastError(null);
    setMppErrorStatus(null);
    try {
      await ensureBoundSession();
      await client.clearTempoPayment(sessionId);
      await refreshPaymentStatus();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to clear MPP session";
      setMppLastError(message);
      setMppErrorStatus("error");
    } finally {
      setIsClearingMpp(false);
    }
  }, [client, ensureBoundSession, refreshPaymentStatus, sessionId]);

  const mppStatus = useMemo<MppStatus>(() => {
    if (!settings.mppEnabled) {
      return "disabled";
    }
    if (!identity.address) {
      return "wallet_required";
    }
    if (!mppSupported) {
      return "unsupported_wallet";
    }
    if (isConnectingMpp) {
      return "connecting";
    }
    if (tempoStream) {
      return "ready";
    }
    if (mppErrorStatus) {
      return mppErrorStatus;
    }
    return "not_connected";
  }, [
    identity.address,
    isConnectingMpp,
    mppErrorStatus,
    mppSupported,
    settings.mppEnabled,
    tempoStream,
  ]);

  const x402Status = useMemo<X402Status>(() => {
    if (!settings.x402Enabled) {
      return "disabled";
    }
    if (!identity.address) {
      return "wallet_required";
    }
    return "ready";
  }, [identity.address, settings.x402Enabled]);

  return {
    isLoading,
    isRefreshing,
    isConnectingMpp,
    isClearingMpp,
    mppStatus,
    mppStatusText: deriveMppStatusText(mppStatus),
    mppReceiptId: tempoStream?.receipt_id ?? null,
    mppCachePresent: Boolean(tempoStream),
    mppLastError,
    x402Status,
    x402StatusText: deriveX402StatusText(x402Status),
    refreshPaymentStatus,
    connectMpp,
    clearMppCache,
  };
}
