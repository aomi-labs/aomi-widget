"use client";

import { useCallback, useEffect, useState } from "react";
import { useAomiAuthAdapter } from "@aomi-labs/widget-lib";
import {
  seedAccountOverview,
  type AccountOverview,
} from "@portal/lib/account-overview";

const SESSION_RETRY_BUDGET_MS = 30_000;
const SESSION_RETRY_BASE_DELAY_MS = 300;
const SESSION_RETRY_MAX_DELAY_MS = 2_000;
const SESSION_RETRY_BACKOFF_FACTOR = 1.7;

export type AomiSessionStatus =
  | "anonymous"
  | "establishing"
  | "error"
  | "ready";

export function useAomiSession(): {
  status: AomiSessionStatus;
  retry: () => void;
} {
  const adapter = useAomiAuthAdapter();
  const adapterStatus = adapter.identity.status;
  const accountStatus = adapter.accountStatus;
  const accountUserId = adapter.accountUser?.id;
  const [probeStatus, setProbeStatus] =
    useState<AomiSessionStatus>("establishing");
  const [probeAttempt, setProbeAttempt] = useState(0);
  // A provider whose account exchange never settles (accountStatus stuck on
  // "loading") must not hold the gate on "Connecting…" forever — after this
  // deadline we probe /api/account anyway and let its answer decide.
  const [adapterWaitExpired, setAdapterWaitExpired] = useState(false);

  const adapterSettling =
    adapterStatus === "booting" ||
    (adapterStatus === "connected" && accountStatus === "loading");

  useEffect(() => {
    if (!adapterSettling) {
      setAdapterWaitExpired(false);
      return;
    }
    const timer = globalThis.setTimeout(
      () => setAdapterWaitExpired(true),
      15_000,
    );
    return () => globalThis.clearTimeout(timer);
  }, [adapterSettling]);

  useEffect(() => {
    if (adapterSettling && !adapterWaitExpired) {
      setProbeStatus("establishing");
      return;
    }

    let cancelled = false;
    setProbeStatus("establishing");

    const run = async () => {
      let nextDelay = SESSION_RETRY_BASE_DELAY_MS;
      let waitedMs = 0;

      for (;;) {
        try {
          const response = await fetch("/api/account", {
            cache: "no-store",
            headers: { "X-Thread-Id": "settings-session-probe" },
          });
          if (cancelled) return;
          if (response.ok) {
            // The probe already paid for the account payload — share it so
            // the settings tabs don't refetch /api/account individually.
            try {
              seedAccountOverview((await response.json()) as AccountOverview);
            } catch {
              // Non-JSON body; consumers fetch on demand instead.
            }
            setProbeStatus("ready");
            return;
          }
          if (
            adapterStatus === "connected" &&
            response.status === 401 &&
            waitedMs < SESSION_RETRY_BUDGET_MS
          ) {
            setProbeStatus("establishing");
          } else if (response.status === 401) {
            seedAccountOverview(null);
            setProbeStatus("anonymous");
            return;
          } else {
            setProbeStatus("error");
            return;
          }
        } catch {
          if (cancelled) return;
          setProbeStatus("error");
          return;
        }

        await new Promise((resolve) => globalThis.setTimeout(resolve, nextDelay));
        waitedMs += nextDelay;
        nextDelay = Math.min(
          Math.round(nextDelay * SESSION_RETRY_BACKOFF_FACTOR),
          SESSION_RETRY_MAX_DELAY_MS,
        );
        if (cancelled) return;
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    adapterSettling,
    adapterStatus,
    accountStatus,
    accountUserId,
    adapterWaitExpired,
    probeAttempt,
  ]);

  const retry = useCallback(() => {
    setProbeAttempt((attempt) => attempt + 1);
    void adapter.connect?.();
  }, [adapter]);
  return {
    status: probeStatus,
    retry,
  };
}
