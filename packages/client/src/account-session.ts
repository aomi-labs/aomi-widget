import type { GetAccountAccessToken } from "./types";

export type AccountCredentialProvider = () => Promise<{
  provider: "para" | "privy" | (string & {});
  tokenKind?: string;
  providerToken: string;
  keyId?: string;
}>;

export class AccountCredentialUnavailableError extends Error {
  constructor(message = "Account credential is not available yet") {
    super(message);
    this.name = "AccountCredentialUnavailableError";
  }
}

export type AccountSessionExchangeResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_at: number;
  user_id: string;
};

export type BetterAuthTokenResponse = {
  token: string;
};

export type BetterAuthAccountTokenSourceOptions = {
  /**
   * Off by default until the Rust backend validates Better Auth JWTs by JWKS.
   * Current production backends still expect the legacy account-session bearer.
   */
  enabled?: boolean;
  /** Portal/auth origin. Defaults to `baseUrl` when omitted. */
  baseUrl?: string;
  /** Better Auth token endpoint under the auth origin. */
  tokenPath?: string;
  /**
   * When enabled, a missing Better Auth cookie can be created by exchanging the
   * connected wallet provider credential. Disable this when another account
   * runtime already owns provider exchange to avoid duplicate wallet prompts.
   */
  providerExchange?: boolean;
};

export type AccountAccessTokenProviderOptions = {
  baseUrl: string;
  getProviderCredential?: AccountCredentialProvider;
  betterAuthToken?: BetterAuthAccountTokenSourceOptions;
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
const DEFAULT_BETTER_AUTH_TOKEN_PATH = "/api/auth/token";
const DEFAULT_BETTER_AUTH_PROVIDER_EXCHANGE_PATH =
  "/api/auth/aomi/provider/exchange";

/** Cache and refresh the short-lived Aomi bearer used for backend requests. */
export function createAccountAccessTokenProvider({
  baseUrl,
  getProviderCredential,
  betterAuthToken,
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

  const fetchBetterAuthToken =
    async (): Promise<AccountSessionExchangeResponse | null> => {
      if (!betterAuthToken?.enabled) return null;
      const response = await fetchImpl(
        joinUrl(
          betterAuthToken.baseUrl ?? baseUrl,
          betterAuthToken.tokenPath ?? DEFAULT_BETTER_AUTH_TOKEN_PATH,
        ),
        {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );
      if (!response.ok) return null;
      const body = (await response.json()) as BetterAuthTokenResponse;
      return normalizeBetterAuthTokenResponse(body);
    };

  const exchangeBetterAuthProviderCredential =
    async (): Promise<AccountSessionExchangeResponse | null> => {
      if (
        !betterAuthToken?.enabled ||
        betterAuthToken.providerExchange === false ||
        !getProviderCredential
      ) {
        return null;
      }
      const credential = await getProviderCredential();
      const response = await fetchImpl(
        joinUrl(
          betterAuthToken.baseUrl ?? baseUrl,
          DEFAULT_BETTER_AUTH_PROVIDER_EXCHANGE_PATH,
        ),
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credential),
        },
      );
      if (!response.ok) return null;
      return fetchBetterAuthToken();
    };

  const exchangeProviderCredential =
    async (): Promise<AccountSessionExchangeResponse> => {
      if (!getProviderCredential) {
        throw new Error("No account credential source is configured");
      }
      const credential = await getProviderCredential();
      const response = await fetchImpl(
        joinUrl(baseUrl, "/api/account/sessions/exchange"),
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

  const exchange = async (): Promise<AccountSessionExchangeResponse> => {
    const betterAuthJwt = await fetchBetterAuthToken();
    if (betterAuthJwt) return betterAuthJwt;
    const exchangedBetterAuthJwt = await exchangeBetterAuthProviderCredential();
    if (exchangedBetterAuthJwt) return exchangedBetterAuthJwt;
    if (betterAuthToken?.enabled) {
      throw new Error("Failed to exchange Better Auth provider credential");
    }
    return exchangeProviderCredential();
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
    // exchange. Legacy backends may still force-refresh after a 401; Better
    // Auth mode keeps the cooldown because its provider exchange is also local.
    if (
      failedAt !== null &&
      now() - failedAt < FAILURE_COOLDOWN_MS &&
      (!forceRefresh || betterAuthToken?.enabled)
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
        .catch((error) => {
          if (!(error instanceof AccountCredentialUnavailableError)) {
            failedAt = now();
          }
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

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function normalizeBetterAuthTokenResponse(
  response: BetterAuthTokenResponse,
): AccountSessionExchangeResponse {
  if (!response.token) {
    throw new Error("Better Auth token response is missing token");
  }
  const payload = decodeJwtPayload(response.token);
  const expiresAt = Number(payload.exp);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
    throw new Error("Better Auth token is missing a valid exp claim");
  }
  const userId =
    typeof payload.aomi_user_id === "string" && payload.aomi_user_id
      ? payload.aomi_user_id
      : typeof payload.sub === "string"
        ? payload.sub
        : "";
  if (!userId) {
    throw new Error("Better Auth token is missing a user id claim");
  }
  return {
    access_token: response.token,
    token_type: "Bearer",
    expires_at: expiresAt,
    user_id: userId,
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split(".");
  if (!payload) throw new Error("Better Auth token is not a JWT");
  return JSON.parse(decodeBase64Url(payload)) as Record<string, unknown>;
}

function decodeBase64Url(value: string): string {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  if (typeof globalThis.atob === "function") {
    return globalThis.atob(normalized);
  }
  type BufferLike = {
    from(
      input: string,
      encoding: "base64",
    ): {
      toString(encoding: "utf8"): string;
    };
  };
  const BufferCtor = (globalThis as typeof globalThis & { Buffer?: BufferLike })
    .Buffer;
  if (BufferCtor) {
    return BufferCtor.from(normalized, "base64").toString("utf8");
  }
  throw new Error("No base64 decoder is available");
}
