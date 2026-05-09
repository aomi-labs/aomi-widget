"use client";

import { useMemo } from "react";
import type {
  PaymentSelectProps,
  PaymentMethodStatus,
  PaymentMethodStatusTone,
} from "@aomi-labs/widget-lib";
import { usePaymentStatus } from "./use-payment-status";

export function usePaymentSelectProps(): PaymentSelectProps {
  const s = usePaymentStatus();

  return useMemo<PaymentSelectProps>(() => {
    const mppTone: PaymentMethodStatusTone =
      s.mppStatus === "ready"
        ? "ready"
        : s.mppStatus === "connecting"
          ? "connecting"
          : s.mppStatus === "error"
            ? "error"
            : "warning";

    const mppRemediable =
      s.mppStatus === "not_connected" ||
      s.mppStatus === "needs_reconnect" ||
      s.mppStatus === "needs_top_up";

    const x402Tone: PaymentMethodStatusTone =
      s.x402Status === "ready" ? "ready" : "warning";

    return {
      getStatus: (method): PaymentMethodStatus | undefined => {
        if (method === "tempo") {
          return {
            tone: mppTone,
            label: s.mppStatusText,
            connect: mppRemediable
              ? {
                  label: "Connect MPP channel",
                  run: () => s.connectMpp(),
                }
              : undefined,
          };
        }
        if (method === "coinbase") {
          return {
            tone: x402Tone,
            label: s.x402StatusText,
          };
        }
        return undefined;
      },
    };
  }, [s]);
}
