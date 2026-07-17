"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useAomiAuthAdapter } from "@aomi-labs/widget-lib";

const SESSION_RETRY_BUDGET_MS = 30_000;
const SESSION_RETRY_BASE_DELAY_MS = 300;
const SESSION_RETRY_MAX_DELAY_MS = 2_000;
const SESSION_RETRY_BACKOFF_FACTOR = 1.7;

export type AomiSessionStatus =
  | "anonymous"
  | "establishing"
  | "error"
  | "ready";

export function AomiSessionProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

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

  useEffect(() => {
    if (
      adapterStatus === "booting" ||
      (adapterStatus === "connected" && accountStatus === "loading")
    ) {
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
  }, [adapterStatus, accountStatus, accountUserId, probeAttempt]);

  const retry = useCallback(() => {
    setProbeAttempt((attempt) => attempt + 1);
    void adapter.connect?.();
  }, [adapter]);
  return {
    status: probeStatus,
    retry,
  };
}
