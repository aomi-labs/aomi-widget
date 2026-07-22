import { providerAuth } from "../../config/provider-auth";
import type { AomiWidgetAuthConfig, AuthMethodId } from "../../config/types";
import { registerAomiPrivyWalletProvider } from "./privy-plugin";

export type PrivyAuthOptions = {
  appId?: string;
  environment?: string;
  methods?: readonly AuthMethodId[];
  appName?: string;
  appLogoUrl?: string;
};

/** The backend descriptor is registered but disabled for external widgets in v1. */
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
  registerAomiPrivyWalletProvider();
  return providerAuth({
    provider: "privy",
    environment,
    methods,
    config: { appId: resolvedAppId, appName, appLogoUrl },
  });
}
