import { AomiClient } from "../client";
import { createCliAuthTokenProvider } from "./auth";
import { readState } from "./state";
import type { CliConfig } from "./types";

export const DEFAULT_CLI_BASE_URL = "https://chat.aomi.dev";

type CliClientOverrides = {
  apiKey?: string;
  baseUrl?: string;
};

export function resolveCliBaseUrl(config: Pick<CliConfig, "baseUrl">): string {
  return config.baseUrl ?? DEFAULT_CLI_BASE_URL;
}

export function createCliClient(
  config: CliConfig,
  overrides: CliClientOverrides = {},
): AomiClient {
  const mergedConfig: CliConfig = {
    ...config,
    baseUrl: overrides.baseUrl ?? config.baseUrl,
    apiKey: overrides.apiKey ?? config.apiKey,
  };

  return new AomiClient({
    baseUrl: resolveCliBaseUrl(mergedConfig),
    apiKey: mergedConfig.apiKey,
    getAccountBearer: createCliAuthTokenProvider(() => {
      // `--account-bearer` is the explicit escape hatch and wins when set.
      if (mergedConfig.accountBearer) {
        return { accountBearer: mergedConfig.accountBearer };
      }
      const disk = readState();
      return {
        accountBearer: disk?.accountBearer,
        auth: disk?.auth,
        sessionCookie: disk?.sessionCookie,
      };
    }),
  });
}
