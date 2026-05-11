"use client";

import { useMemo } from "react";
import type {
  PaymentSelectProps,
  PaymentMethodStatus,
  PaymentMethodStatusTone,
} from "@aomi-labs/widget-lib";
import { usePaymentStatus } from "./use-payment-status";

/**
 * Maps portal's `usePaymentStatus()` into the shape `<PaymentSelect>`'s
 * optional `getStatus` prop expects.
 *
 * The returned object intentionally omits the `connect` field. Wallet-method
 * handshakes (MPP/x402) happen automatically on the next chat turn via the
 * response-header dispatcher in `payment-client-options.ts`; surfacing an
 * explicit "Connect" CTA in the popover is no longer needed.
 *
 * Hosts integrating their own payment methods MAY still attach a `connect`
 * action in their adapter — the public `PaymentSelectProps` contract keeps
 * `connect` as an optional capability.
 */
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

    const x402Tone: PaymentMethodStatusTone =
      s.x402Status === "ready" ? "ready" : "warning";

    return {
      getStatus: (method): PaymentMethodStatus | undefined => {
        if (method === "tempo") {
          return { tone: mppTone, label: s.mppStatusText };
        }
        if (method === "coinbase") {
          return { tone: x402Tone, label: s.x402StatusText };
        }
        return undefined;
      },
    };
  }, [s]);
}
