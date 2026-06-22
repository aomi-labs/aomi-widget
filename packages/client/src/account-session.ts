import type { GetAccountBearer } from "./types";

export type AccountCredentialProvider = () => Promise<{
  provider: "para" | "privy";
  providerToken: string;
}>;

export type AccountSessionExchangeResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_at: number;
  user_id: string;
};

export type AccountBearerProviderOptions = {
  baseUrl: string;
  getProviderCredential: AccountCredentialProvider;
  fetch?: typeof fetch;
  now?: () => number;
  refreshBeforeExpiryMs?: number;
};

export type AccountBearerProvider = GetAccountBearer & {
  subscribe: (listener: () => void) => () => void;
  dispose: () => void;
};

/**
 * No-op bearer provider — correct for the proxy-inject design (Option 2).
 *
 * The browser holds no AccountBearer. The portal establishes an httpOnly
 * `aomi_session` cookie at login (the BFF `/api/account/sessions/exchange` route,
 * triggered by the portal's AomiSessionBridge), and the same-origin proxy injects
 * the bearer from that cookie on every `/api/*` call. So this provider yields no
 * token by design — a caller that supplies a static bearer directly (e.g. the
 * CLI) still works through `getAccountBearer`.
 */
export function createAccountBearerProvider(
  _options: AccountBearerProviderOptions,
): AccountBearerProvider {
  const listeners = new Set<() => void>();

  const getAccountBearer: AccountBearerProvider = async ({
    forceRefresh: _forceRefresh = false,
  } = {}) => undefined;

  getAccountBearer.subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  getAccountBearer.dispose = () => {
    listeners.clear();
  };
  return getAccountBearer;
}
