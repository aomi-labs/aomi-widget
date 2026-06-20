import { AomiClient } from "../client";
import type { GetAccountAccessToken } from "../types";
import type { CliConfig } from "./types";

const DEFAULT_BACKEND_URL = "https://api.aomi.dev";

type CliClientOverrides = {
  apiKey?: string;
  baseUrl?: string;
};

export function resolveCliBaseUrl(config: Pick<CliConfig, "baseUrl">): string {
  return config.baseUrl ?? DEFAULT_BACKEND_URL;
}

export function createCliGetAccountAccessToken(
  config: CliConfig,
): GetAccountAccessToken | undefined {
  if (config.accountAccessToken) {
    return async () => config.accountAccessToken;
  }

  return undefined;
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
    getAccountAccessToken: createCliGetAccountAccessToken(mergedConfig),
  });
}
