"use client";

import { useMemo } from "react";
import { getChainInfo } from "@aomi-labs/react";
import {
  useAomiWalletKit,
  type WalletAccountMenuOptions,
} from "@aomi-labs/widget-lib";
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
  onManageAccount: () => void = onOpenSettings,
): WalletAccountMenuOptions | undefined {
  const overview = useAccountOverview();
  const { settings, updateSetting } = useSettings();
  const adapter = useAomiWalletKit();
  const { accountGuest, accountUser, accountError, identity } = adapter;

  return useMemo(() => {
    // A Better Auth guest is only transport for guest chat. Do not present it
    // as an account or offer account-management actions; linking a wallet
    // replaces this temporary session with a verified wallet sign-in.
    if (!accountUser || accountGuest) return undefined;

    const usage = overview?.usage;
    // A wallet can be connected while the Aomi account session is missing:
    // the provider credential exchange either has not run yet or it failed.
    const secondaryLine =
      usage && usage.credit_paid > 0
        ? formatAllowanceSummary(usage.credit_used, usage.credit_paid)
        : usage
          ? `${Math.max(0, usage.credit_paid - usage.credit_used).toLocaleString()} credits left`
          : "Loading allowance…";

    const activeAccount = adapter.accounts.find((account) => account.active);

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
      primaryLine:
        accountUser.displayName ?? accountUser.email ?? "Aomi account",
      secondaryLine,
      noticeLine: accountError,
      walletLabel: activeAccount?.walletName,
      networkLabel,
      themeLabel: isDark ? "Dark" : "Light",
      onSwitchNetwork: openHeaderNetworkSelect,
      onToggleTheme: () =>
        updateSetting("colorMode", isDark ? "light" : "dark"),
      onManageAccount,
      onOpenSettings,
      onOpenDeployments: () => {
        window.location.assign("/deployments");
      },
      // No session overrides: DualWalletBar keeps account sign-out and wallet
      // connector teardown as two explicit, independent actions.
    };
  }, [
    accountError,
    accountGuest,
    accountUser,
    adapter,
    identity.chainId,
    identity.isConnected,
    identity.svmCluster,
    onManageAccount,
    onOpenSettings,
    overview?.usage,
    settings.colorMode,
    updateSetting,
  ]);
}
