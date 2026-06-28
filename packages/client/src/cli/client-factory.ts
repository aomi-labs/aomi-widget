import { AomiClient } from "../client";
import type { GetAccountBearer } from "../types";
import type { CliConfig } from "./types";

const DEFAULT_BACKEND_URL = "https://api.aomi.dev";
const RAW_BACKEND_HOSTS = new Set([
  "api.aomi.dev",
  "api-staging.aomi.dev",
  "127.0.0.1",
  "localhost",
  "::1",
]);

type CliClientOverrides = {
  apiKey?: string;
  baseUrl?: string;
};

export function resolveCliBaseUrl(config: Pick<CliConfig, "baseUrl">): string {
  return config.baseUrl ?? DEFAULT_BACKEND_URL;
}

export function isRawBackendBaseUrl(baseUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return false;
  }

  if (
    parsed.hostname === "api.aomi.dev" ||
    parsed.hostname === "api-staging.aomi.dev"
  ) {
    return true;
  }

  return (
    RAW_BACKEND_HOSTS.has(parsed.hostname) &&
    (parsed.port === "8080" || parsed.port === "")
  );
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

  // The normal path: present the SIWE-established BFF session as the credential.
  // The CLI points at a BFF, so it sends the session as `Authorization: Bearer
  // <aomi_session>` (matching arixon's `bearer()` plugin) and the proxy mints the
  // short-lived backend bearer from it per request — no client-side `/token`
  // round-trip or refresh needed (the proxy re-mints on every call).
  if (config.sessionCookie) {
    const sessionCookie = config.sessionCookie;
    return async () => sessionCookie;
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
