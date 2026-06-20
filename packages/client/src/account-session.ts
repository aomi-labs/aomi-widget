import type { GetAccountAccessToken } from "./types";

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

export type AccountAccessTokenProviderOptions = {
  baseUrl: string;
  getProviderCredential: AccountCredentialProvider;
  fetch?: typeof fetch;
  now?: () => number;
  refreshBeforeExpiryMs?: number;
};

export type AccountAccessTokenProvider = GetAccountAccessToken & {
  subscribe: (listener: () => void) => () => void;
  dispose: () => void;
};

/**
 * Legacy compatibility shim.
 *
 * The backend provider-token exchange route was removed. Until the portal BFF
 * account bridge exists, provider credentials cannot be converted into Aomi
 * account bearers from the browser or CLI. Static account bearer support still
 * works through `getAccountAccessToken` callers that provide one directly.
 */
export function createAccountAccessTokenProvider(
  _options: AccountAccessTokenProviderOptions,
): AccountAccessTokenProvider {
  const listeners = new Set<() => void>();

  const getAccountAccessToken: AccountAccessTokenProvider = async ({
    forceRefresh: _forceRefresh = false,
  } = {}) => {
    return undefined;
  };

  getAccountAccessToken.subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  getAccountAccessToken.dispose = () => {
    listeners.clear();
  };
  return getAccountAccessToken;
}
