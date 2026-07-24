import { providerAuth } from "../../config/provider-auth";
import type { AomiWidgetAuthConfig, AuthMethodId } from "../../config/types";
import { registerAomiParaWalletProvider } from "./para-plugin";

export type ParaAuthOptions = {
  apiKey: string;
  environment?: "PROD" | "BETA";
  methods?: readonly AuthMethodId[];
  appName?: string;
  appDescription?: string;
  appUrl?: string;
  disableWorkers?: boolean;
};

export function paraAuth({
  apiKey,
  environment = "BETA",
  methods = ["email", "google"],
  appName = "Aomi",
  appDescription = "Aomi widget",
  appUrl,
  disableWorkers,
}: ParaAuthOptions): AomiWidgetAuthConfig {
  const resolvedApiKey = apiKey?.trim();
  if (!resolvedApiKey) {
    throw new Error("Para widget auth requires an apiKey");
  }
  // The plugin module self-registers on import, but consumers reach it only
  // through this helper. Re-registering here gives the bundler a live reference
  // to the plugin module so tree-shaking cannot drop its side-effect
  // registration when the widget imports `paraAuth` alone.
  registerAomiParaWalletProvider();
  return providerAuth({
    provider: "para",
    environment,
    methods,
    config: {
      apiKey: resolvedApiKey,
      environment,
      appName,
      appDescription,
      appUrl,
      disableWorkers,
    },
  });
}
