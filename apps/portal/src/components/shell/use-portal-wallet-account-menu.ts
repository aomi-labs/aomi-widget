"use client";

import { useMemo } from "react";
import { getChainInfo } from "@aomi-labs/react";
import { useAomiWalletKit, type WalletAccountMenuOptions } from "@aomi-labs/widget-lib";
import {
  formatAllowanceSummary,
  useAccountOverview,
} from "@portal/lib/account-overview";
import { useSettings } from "@portal/lib/use-settings";

function openHeaderNetworkSelect() {
  document
    .querySelector<HTMLElement>("[data-aomi-network-select-trigger]")
    ?.click();
}

/**
 * Portal-only account menu config for the sidebar wallet chip.
 * Reuses the shared `/api/account` overview — same source as General settings.
 */
export function usePortalWalletAccountMenu(
  onOpenSettings: () => void,
): WalletAccountMenuOptions | undefined {
  const overview = useAccountOverview();
  const { settings, updateSetting } = useSettings();
  const adapter = useAomiWalletKit();
  const { accountUser, identity } = adapter;

  return useMemo(() => {
    if (!accountUser) return undefined;

    const usage = overview?.usage;
    const secondaryLine =
      usage && usage.credit_paid > 0
        ? formatAllowanceSummary(usage.credit_used, usage.credit_paid)
        : undefined;

    const isDark =
      settings.colorMode === "dark" ||
      (settings.colorMode === "auto" &&
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark"));

    const networkLabel =
      getChainInfo(identity.chainId)?.name ??
      identity.svmCluster?.replace(/^solana:/, "") ??
      undefined;

    return {
      enabled: true,
      secondaryLine,
      networkLabel,
      themeLabel: isDark ? "Dark" : "Light",
      onSwitchNetwork: openHeaderNetworkSelect,
      onToggleTheme: () =>
        updateSetting("colorMode", isDark ? "light" : "dark"),
      onOpenSettings,
      onOpenDeployments: () => {
        window.location.assign("/deployments");
      },
    };
  }, [
    accountUser,
    identity.chainId,
    identity.svmCluster,
    onOpenSettings,
    overview?.usage,
    settings.colorMode,
    updateSetting,
  ]);
}
