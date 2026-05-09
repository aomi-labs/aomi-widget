"use client";

import { useMemo } from "react";
import {
  PaymentSettings as PaymentSettingsPanel,
  type PaymentSettingsProps,
} from "@aomi-labs/widget-lib";
import { useSettings } from "@portal/lib/use-settings";
import { usePaymentStatus } from "@portal/lib/use-payment-status";

export function PaymentSettings() {
  const { settings, updateSettings } = useSettings();
  const status = usePaymentStatus();

  const toggles = useMemo<PaymentSettingsProps["toggles"]>(
    () => ({
      preferredPaymentMethod: settings.preferredPaymentMethod,
      setPreferredPaymentMethod: (method) =>
        updateSettings({ preferredPaymentMethod: method }),
      mppEnabled: settings.mppEnabled,
      setMppEnabled: (enabled) => updateSettings({ mppEnabled: enabled }),
      x402Enabled: settings.x402Enabled,
      setX402Enabled: (enabled) => updateSettings({ x402Enabled: enabled }),
    }),
    [
      settings.preferredPaymentMethod,
      settings.mppEnabled,
      settings.x402Enabled,
      updateSettings,
    ],
  );

  return <PaymentSettingsPanel status={status} toggles={toggles} />;
}
