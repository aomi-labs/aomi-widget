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
 * Finish the Aomi account session for an already-connected wallet.
 *
 * `openAccountUI` opens the provider's *account management* surface
 * (Para `ACCOUNT_MAIN`), which cannot mint the missing Aomi session — it just
 * re-shows the email/profile popup. `connect` runs the provider auth flow
 * (`AUTH_MAIN`) and re-arms the credential exchange that creates the session.
 */
function finishAccountSignIn(adapter: ReturnType<typeof useAomiWalletKit>) {
  void adapter.connect?.();
}

/**
 * The chip's second line is a single truncated row, so backend error copy
 * (e.g. the 409 "already linked to another Aomi account" sentence) gets clipped
 * into nonsense there. Keep the chip to a short status and let the menu render
 * the full explanation.
 */
const CHIP_ACCOUNT_ERROR_LABEL = "Sign-in needs attention";

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
  const { accountUser, accountError, identity } = adapter;

  return useMemo(() => {
    if (!identity.isConnected) return undefined;

    const usage = overview?.usage;
    // A wallet can be connected while the Aomi account session is missing:
    // the provider credential exchange either has not run yet or it failed.
    const needsAccountSignIn = !accountUser;
    const secondaryLine =
      usage && usage.credit_paid > 0
        ? formatAllowanceSummary(usage.credit_used, usage.credit_paid)
        : usage
          ? `${Math.max(0, usage.credit_paid - usage.credit_used).toLocaleString()} credits left`
          : accountUser
            ? "Loading allowance…"
            : accountError
              ? CHIP_ACCOUNT_ERROR_LABEL
              : "Sign in for allowance";

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
      secondaryLine,
      noticeLine: accountUser ? undefined : accountError,
      walletLabel: activeAccount?.walletName,
      networkLabel,
      themeLabel: isDark ? "Dark" : "Light",
      onSwitchNetwork: openHeaderNetworkSelect,
      onToggleTheme: () =>
        updateSetting("colorMode", isDark ? "light" : "dark"),
      onOpenSettings,
      onOpenDeployments: () => {
        window.location.assign("/deployments");
      },
      onSignIn: needsAccountSignIn
        ? () => finishAccountSignIn(adapter)
        : undefined,
      // No onDisconnect: DualWalletBar's default already runs the canonical
      // teardown (account/widget session sign-out, then wallet disconnect).
    };
  }, [
    accountError,
    accountUser,
    adapter,
    identity.chainId,
    identity.isConnected,
    identity.svmCluster,
    onOpenSettings,
    overview?.usage,
    settings.colorMode,
    updateSetting,
  ]);
}
