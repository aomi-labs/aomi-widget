import { providerAuth } from "../../config/provider-auth";
import type { AomiWidgetAuthConfig, AuthMethodId } from "../../config/types";
import { registerAomiPrivyWalletProvider } from "./privy-plugin";

export type PrivyAuthOptions = {
  appId: string;
  environment?: string;
  methods?: readonly AuthMethodId[];
  appName?: string;
  appLogoUrl?: string;
};

/**
 * Build the widget auth config for the Privy provider. Calling this is the
 * supported entry point for Privy-backed widgets.
 */
export function privyAuth({
  appId,
  environment = "PROD",
  methods,
  appName = "Aomi",
  appLogoUrl,
}: PrivyAuthOptions): AomiWidgetAuthConfig {
  const resolvedAppId = appId?.trim();
  if (!resolvedAppId) {
    throw new Error("Privy widget auth requires an appId");
  }
  // The plugin module self-registers on import, but consumers reach it only
  // through this helper. Re-registering here gives the bundler a live reference
  // to the plugin module so tree-shaking cannot drop its side-effect
  // registration when the widget imports `privyAuth` alone.
  registerAomiPrivyWalletProvider();
  return providerAuth({
    provider: "privy",
    environment,
    methods,
    config: { appId: resolvedAppId, appName, appLogoUrl },
  });
}
