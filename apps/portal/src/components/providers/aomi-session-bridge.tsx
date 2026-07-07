"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useAomiAuthAdapter } from "@aomi-labs/widget-lib";

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
  const [probeStatus, setProbeStatus] =
    useState<AomiSessionStatus>("establishing");
  const [probeAttempt, setProbeAttempt] = useState(0);

  useEffect(() => {
    if (adapterStatus === "connected") {
      setProbeStatus("ready");
      return;
    }
    if (adapterStatus === "booting") {
      setProbeStatus("establishing");
      return;
    }

    let cancelled = false;
    setProbeStatus("establishing");
    void fetch("/api/account", {
      cache: "no-store",
      headers: { "X-Thread-Id": "settings-session-probe" },
    })
      .then((response) => {
        if (cancelled) return;
        if (response.ok) {
          setProbeStatus("ready");
        } else if (response.status === 401) {
          setProbeStatus("anonymous");
        } else {
          setProbeStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) setProbeStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [adapterStatus, probeAttempt]);

  const retry = useCallback(() => {
    setProbeAttempt((attempt) => attempt + 1);
    void adapter.connect?.();
  }, [adapter]);
  return {
    status: probeStatus,
    retry,
  };
}
