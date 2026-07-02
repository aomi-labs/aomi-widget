"use client";

import { type ReactNode, useCallback } from "react";
import { useAomiAuthAdapter, type AomiAuthStatus } from "@aomi-labs/widget-lib";

export type AomiSessionStatus = "anonymous" | "establishing" | "error" | "ready";

export function AomiSessionProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function mapStatus(status: AomiAuthStatus): AomiSessionStatus {
  if (status === "connected") return "ready";
  if (status === "booting") return "establishing";
  return "anonymous";
}

export function useAomiSession(): {
  status: AomiSessionStatus;
  retry: () => void;
} {
  const adapter = useAomiAuthAdapter();
  const retry = useCallback(() => {
    void adapter.connect?.();
  }, [adapter]);
  return {
    status: mapStatus(adapter.identity.status),
    retry,
  };
}
