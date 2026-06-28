import { AomiClient } from "../client";
import type { GetAccountBearer } from "../types";
import { createSessionGetAccountBearer } from "./account-auth";
import type { CliConfig } from "./types";

const DEFAULT_BACKEND_URL = "https://api.aomi.dev";

type CliClientOverrides = {
  apiKey?: string;
  baseUrl?: string;
};

export function resolveCliBaseUrl(config: Pick<CliConfig, "baseUrl">): string {
  return config.baseUrl ?? DEFAULT_BACKEND_URL;
}

export function createCliGetAccountBearer(
  config: CliConfig,
): GetAccountBearer | undefined {
  // A static `--account-bearer` is the explicit escape hatch (CI / power users)
  // and wins when set.
  if (config.accountBearer) {
    const bearer = config.accountBearer;
    return async () => bearer;
  }

  // The normal path: hold the SIWE-established BFF session and mint short-lived
  // AccountBearers from `/api/bff/auth/token`, refreshing on 401/expiry.
  if (config.accountSession) {
    return createSessionGetAccountBearer({
      baseUrl: resolveCliBaseUrl(config),
      sessionToken: config.accountSession,
    });
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
    getAccountBearer: createCliGetAccountBearer(mergedConfig),
  });
}
