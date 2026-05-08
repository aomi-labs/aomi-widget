"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AomiClient,
  type AomiPaymentOverviewResponse,
  type UserState,
} from "@aomi-labs/client";
import { useAomiAuthAdapter } from "@aomi-labs/widget-lib";
import { usePaymentAwareClientOptions } from "./payment-client-options";
import {
  bindSettingsSession,
  getBackendUrl,
  getOrCreateSettingsClientId,
  getSettingsSessionId,
} from "./settings-api";
import { useSettings } from "./use-settings";

type MppStatus =
  | "disabled"
  | "wallet_required"
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

function classifyMppError(message: string): MppStatus {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("voucher") ||
    normalized.includes("insufficient") ||
    normalized.includes("top-up")
  ) {
    return "needs_top_up";
  }
  if (
    normalized.includes("payment required") ||
    normalized.includes("www-authenticate") ||
    normalized.includes("authorize") ||
    normalized.includes("wallet")
  ) {
    return "needs_reconnect";
  }
  return "error";
}

export function usePaymentStatus(): UsePaymentStatusResult {
  const { identity } = useAomiAuthAdapter();
  const { settings } = useSettings();
  const backendUrl = getBackendUrl();
  const sessionId = getSettingsSessionId();
  const clientId = getOrCreateSettingsClientId();
  const runtimeClientOptions = usePaymentAwareClientOptions();
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

  const walletUserState = useMemo<UserState | undefined>(() => {
    if (!identity.address) {
      return undefined;
    }
    return {
      address: identity.address,
      chainId: identity.chainId,
      isConnected: true,
    };
  }, [identity.address, identity.chainId]);

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

  const connectMpp = useCallback(async () => {
    if (!settings.mppEnabled || !identity.address) {
      return;
    }

    setIsConnectingMpp(true);
    setMppLastError(null);
    setMppErrorStatus(null);
    try {
      await ensureBoundSession();
      await client.sendMessage(sessionId, "Connect MPP payment session.", {
        publicKey: identity.address,
        clientId,
        paymentMethod: "tempo",
        userState: walletUserState,
      });
      await refreshPaymentStatus();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to connect MPP";
      setMppLastError(message);
      setMppErrorStatus(classifyMppError(message));
    } finally {
      setIsConnectingMpp(false);
    }
  }, [
    client,
    clientId,
    ensureBoundSession,
    identity.address,
    refreshPaymentStatus,
    sessionId,
    settings.mppEnabled,
    walletUserState,
  ]);

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
