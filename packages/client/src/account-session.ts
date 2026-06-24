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
 * No-op compatibility shim.
 *
 * Account identity is minted in the **portal BFF** and verified by the backend
 * (see the AccountBearer contract); the browser must not exchange a provider
 * token for a bearer, and there is no backend `/api/account/sessions/exchange`
 * route. This provider yields no token — a caller that supplies a static bearer
 * directly still works through `getAccountBearer`.
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

export type AccountAccessTokenProviderOptions = AccountBearerProviderOptions;
export type AccountAccessTokenProvider = AccountBearerProvider;
export const createAccountAccessTokenProvider = createAccountBearerProvider;
