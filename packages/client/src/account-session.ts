import type { GetAccountAccessToken } from "./types";

export type AccountCredentialProvider = () => Promise<{
  provider: "para" | "privy" | (string & {});
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

const DEFAULT_REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000;
const FAILURE_COOLDOWN_MS = 30 * 1000;

/** Cache and refresh the short-lived Aomi bearer minted from Para or Privy. */
export function createAccountAccessTokenProvider({
  baseUrl,
  getProviderCredential,
  fetch: fetchImpl = fetch,
  now = Date.now,
  refreshBeforeExpiryMs = DEFAULT_REFRESH_BEFORE_EXPIRY_MS,
}: AccountAccessTokenProviderOptions): AccountAccessTokenProvider {
  let cached: AccountSessionExchangeResponse | null = null;
  let pending: Promise<AccountSessionExchangeResponse | null> | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let failedAt: number | null = null;
  const listeners = new Set<() => void>();

  const scheduleRefresh = (session: AccountSessionExchangeResponse) => {
    if (refreshTimer) clearTimeout(refreshTimer);
    const refreshAt = session.expires_at * 1000 - refreshBeforeExpiryMs;
    refreshTimer = setTimeout(
      () => {
        void getAccountAccessToken({ forceRefresh: true }).catch(
          () => undefined,
        );
      },
      Math.max(refreshAt - now(), 1000),
    );
  };

  const exchange = async (): Promise<AccountSessionExchangeResponse> => {
    const credential = await getProviderCredential();
    const response = await fetchImpl(
      `${baseUrl.replace(/\/+$/, "")}/api/account/sessions/exchange`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: credential.provider,
          provider_token: credential.providerToken,
        }),
      },
    );
    if (!response.ok) {
      throw new Error(
        `Failed to exchange account credential: HTTP ${response.status}`,
      );
    }
    return (await response.json()) as AccountSessionExchangeResponse;
  };

  const getAccountAccessToken: AccountAccessTokenProvider = async ({
    forceRefresh = false,
  } = {}) => {
    const refreshAt = cached
      ? cached.expires_at * 1000 - refreshBeforeExpiryMs
      : 0;
    if (!forceRefresh && cached && now() < refreshAt) {
      return cached.access_token;
    }
    // The account bearer is optional/additive. When the wallet provider can't
    // mint a credential yet (e.g. Para before biometric/external-wallet
    // verification 403s on issueJwt) or the exchange fails, resolve to no token
    // so the caller's request proceeds unauthenticated instead of erroring.
    // A short cooldown prevents every backend poll from re-triggering a failing
    // exchange; an explicit forceRefresh (the 401 retry path) bypasses it.
    if (
      !forceRefresh &&
      failedAt !== null &&
      now() - failedAt < FAILURE_COOLDOWN_MS
    ) {
      return undefined;
    }
    if (!pending) {
      pending = exchange()
        .then((next) => {
          failedAt = null;
          const previous = cached;
          cached = next;
          scheduleRefresh(next);
          if (
            previous &&
            (previous.access_token !== next.access_token ||
              previous.expires_at !== next.expires_at)
          ) {
            for (const listener of listeners) listener();
          }
          return next;
        })
        .catch(() => {
          failedAt = now();
          return null;
        })
        .finally(() => {
          pending = null;
        });
    }
    return (await pending)?.access_token;
  };

  getAccountAccessToken.subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  getAccountAccessToken.dispose = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = null;
    listeners.clear();
  };
  return getAccountAccessToken;
}
