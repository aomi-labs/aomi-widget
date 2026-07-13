import type { AomiWidgetAuthConfig, AuthMethodId } from "../../config/types";
import { registerAomiParaWalletProvider } from "./para-plugin";

export type ParaAuthOptions = {
  /** Para publishable API key. An empty value disables provider auth. */
  apiKey?: string;
  environment?: "PROD" | "BETA";
  methods?: readonly AuthMethodId[];
  appName?: string;
  appDescription?: string;
  appUrl?: string;
};

/** Configure Para auth for the unified `AomiWidget`. */
export function paraAuth({
  apiKey,
  environment = "BETA",
  methods = ["email", "google"],
  appName = "Aomi",
  appDescription = "Aomi widget",
  appUrl,
}: ParaAuthOptions): AomiWidgetAuthConfig {
  const resolvedApiKey = apiKey?.trim();
  if (!resolvedApiKey) return false;

  registerAomiParaWalletProvider();
  return {
    provider: "para",
    methods,
    providers: {
      para: {
        apiKey: resolvedApiKey,
        environment,
        appName,
        appDescription,
        appUrl,
      },
    },
  };
}
