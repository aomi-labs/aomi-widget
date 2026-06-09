"use client";

import { useCallback } from "react";
import { useOptionalAomiRuntime } from "@aomi-labs/react";

export function useWalletActivationGuard(): () => boolean {
  const runtime = useOptionalAomiRuntime();

  return useCallback(() => {
    if (!runtime?.hasBlockingWalletRequests) {
      return true;
    }

    runtime.showNotification({
      type: "wallet",
      title: "Finish the pending wallet request",
      message:
        "Approve or reject the current wallet request before switching wallets or networks.",
    });
    return false;
  }, [runtime]);
}
