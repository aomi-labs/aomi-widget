import type { AomiWidgetAuthConfig, AuthMethodId } from "../../config/types";
import { registerAomiPrivyWalletProvider } from "./privy-plugin";

export type PrivyAuthOptions = {
  /** Privy publishable app id. An empty value disables provider auth. */
  appId?: string;
  methods?: readonly AuthMethodId[];
  appName?: string;
  appLogoUrl?: string;
};

/** Configure Privy auth for the unified `AomiWidget`. */
export function privyAuth({
  appId,
  methods,
  appName = "Aomi",
  appLogoUrl,
}: PrivyAuthOptions): AomiWidgetAuthConfig {
  const resolvedAppId = appId?.trim();
  if (!resolvedAppId) return false;

  registerAomiPrivyWalletProvider();
  return {
    provider: "privy",
    methods,
    providers: {
      privy: { appId: resolvedAppId, appName, appLogoUrl },
    },
  };
}
