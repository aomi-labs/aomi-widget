import { getAddress } from "viem";
import { createSiweMessage } from "viem/siwe";
import type { GetAccountBearer } from "./types";
import { joinUrl } from "./internal/url";
import { decodeJwtSubject } from "./internal/encoding";
import { buildSiwsMessage, type SiwsChainId } from "./siws";

/**
 * A widget `expires_at` above this bound is a millisecond timestamp, not the
 * seconds value the refresh math assumes. Mirrors account-session.ts.
 */
const EXPIRES_AT_MILLISECONDS_THRESHOLD = 100_000_000_000;

export type WidgetAuthSession = {
  accessToken: string;
  expiresAt: number;
};

/**
 * @deprecated Ambiguous with the `WidgetSession` type exported by
 * `@aomi-labs/account`, which describes a different (BFF-side) shape. Prefer
 * {@link WidgetAuthSession}. Retained as an alias for backward compatibility
 * with the published `@aomi-labs/client` API.
 */
export type WidgetSession = WidgetAuthSession;

export type WidgetAuthAdapter = {
  getFingerprint(): string | null | Promise<string | null>;
  exchange(input: {
    baseUrl: string;
    fetch: typeof fetch;
  }): Promise<WidgetAuthSession>;
  signOut?(): Promise<void>;
};

export type WidgetSessionProvider = GetAccountBearer & {
  readonly required: true;
  revoke(): Promise<void>;
  signOut(): Promise<void>;
  dispose(): void;
  subscribe(listener: () => void): () => void;
};

export type WidgetSessionSigner = {
  address: string;
  chainId: number;
  signMessage(message: string): Promise<string>;
};

export type SiwsWidgetSessionSigner = {
  address: string;
  chainId: SiwsChainId;
  signMessage(message: string): Promise<string>;
};

export type ProviderCredential = {
  provider: string;
  tokenKind?: string;
  providerToken: string;
  keyId?: string;
};

export function createProviderCredentialAdapter(input: {
  provider: string;
  environment: string;
  getCredential(): Promise<ProviderCredential | null>;
  getSubject(): string | null;
  signOut?: () => Promise<void>;
}): WidgetAuthAdapter {
  let inferredFingerprint: string | null = null;
  let stagedCredential: ProviderCredential | null = null;

  return {
    getFingerprint: async () => {
      const subject = input.getSubject();
      if (subject) return `${input.provider}:${subject}`;
      if (inferredFingerprint) return inferredFingerprint;

      // Some provider SDKs expose an authenticated session before their
      // account hook exposes the stable subject. Stage one credential and use
      // its unverified JWT `sub` only as an in-memory cache partition key. The
      // Portal remains the authority and verifies the credential before it
      // issues any widget session.
      const credential = await input.getCredential();
      if (!credential || credential.provider !== input.provider) return null;
      stagedCredential = credential;
      const tokenSubject = decodeJwtSubject(credential.providerToken);
      // Tradeoff: when the provider token carries no `sub`, this falls back to a
      // subject-less, provider-wide partition key. On a shared browser where the
      // SDK session silently expires (no explicit signOut to bump the provider
      // generation), the next user under the same provider can momentarily reuse
      // the previous user's cached widget session until the fingerprint resolves
      // to a real subject or the token exchange re-runs. This is an in-memory
      // cache-partition hint only — the Portal still verifies every credential
      // server-side before issuing a widget session, so it cannot escalate
      // privileges; it can only briefly mis-partition the local cache.
      inferredFingerprint = tokenSubject
        ? `${input.provider}:${tokenSubject}`
        : `${input.provider}:authenticated-session`;
      return inferredFingerprint;
    },
    exchange: async ({ baseUrl, fetch: fetchImpl }) => {
      const credential = stagedCredential ?? (await input.getCredential());
      stagedCredential = null;
      if (!credential || credential.provider !== input.provider) {
        throw new Error("Widget provider credential is unavailable");
      }
      return exchangeJson(
        fetchImpl,
        joinUrl(baseUrl, "/api/widget/auth/exchange"),
        {
          provider: input.provider,
          environment: input.environment,
          provider_token: credential.providerToken,
          key_id: credential.keyId,
        },
      );
    },
    signOut: async () => {
      inferredFingerprint = null;
      stagedCredential = null;
      await input.signOut?.();
    },
  };
}

/**
 * Shared implementation for the sign-a-server-challenge adapters (SIWE, SIWS).
 * Both fetch a nonce, build a provider-specific message, sign it, and POST the
 * signature back for verification. The per-family bits — how to normalize the
 * signer, derive its fingerprint, and format the message — are injected.
 */
function createSignedChallengeAdapter<
  S extends WidgetSessionSigner | SiwsWidgetSessionSigner,
  N extends {
    address: string;
    chainId: number | string;
    signMessage(message: string): Promise<string>;
  },
>(config: {
  noncePath: string;
  verifyPath: string;
  getSigner(): Promise<S>;
  normalizeSigner(signer: S): N;
  getFingerprint(signer: N): string;
  buildMessage(input: { signer: N; challenge: Challenge }): string;
}): WidgetAuthAdapter {
  return {
    getFingerprint: async () =>
      config.getFingerprint(config.normalizeSigner(await config.getSigner())),
    exchange: async ({ baseUrl, fetch: fetchImpl }) => {
      const signer = config.normalizeSigner(await config.getSigner());
      const challenge = await challengeJson(
        fetchImpl,
        joinUrl(baseUrl, config.noncePath),
        { wallet_address: signer.address, chain_id: signer.chainId },
      );
      const message = config.buildMessage({ signer, challenge });
      const signature = await signer.signMessage(message);
      return exchangeJson(fetchImpl, joinUrl(baseUrl, config.verifyPath), {
        message,
        signature,
        wallet_address: signer.address,
        chain_id: signer.chainId,
      });
    },
  };
}

export function createSiweWidgetAuthAdapter(input: {
  getSigner(): Promise<WidgetSessionSigner>;
}): WidgetAuthAdapter {
  return createSignedChallengeAdapter({
    noncePath: "/api/widget/auth/siwe/nonce",
    verifyPath: "/api/widget/auth/siwe/verify",
    getSigner: input.getSigner,
    normalizeSigner: normalizeSiweSigner,
    getFingerprint: (signer) =>
      `${signer.chainId}:${signer.address.toLowerCase()}`,
    buildMessage: ({ signer, challenge }) =>
      createSiweMessage({
        address: signer.address,
        chainId: signer.chainId,
        domain: challenge.domain,
        uri: challenge.uri,
        version: "1",
        nonce: challenge.nonce,
        issuedAt: new Date(challenge.issuedAt),
        expirationTime: new Date(challenge.expirationTime),
        // Kept identical to the SIWS statement (buildSiwsMessage). The SIWS
        // server verifier requires exactly "Sign in to Aomi."; the SIWE
        // verifier does not check statement text, so aligning is safe.
        statement: "Sign in to Aomi.",
      }),
  });
}

export function createSiwsWidgetAuthAdapter(input: {
  getSigner(): Promise<SiwsWidgetSessionSigner>;
}): WidgetAuthAdapter {
  return createSignedChallengeAdapter({
    noncePath: "/api/widget/auth/siws/nonce",
    verifyPath: "/api/widget/auth/siws/verify",
    getSigner: input.getSigner,
    normalizeSigner: (signer) => signer,
    getFingerprint: (signer) => `${signer.chainId}:${signer.address}`,
    buildMessage: ({ signer, challenge }) =>
      buildSiwsMessage({
        address: signer.address,
        chainId: signer.chainId,
        nonce: challenge.nonce,
        intent: "sign-in",
        domain: challenge.domain,
        uri: challenge.uri,
        issuedAt: new Date(challenge.issuedAt),
      }),
  });
}

export function createWidgetSessionProvider(input: {
  baseUrl: string;
  adapter: WidgetAuthAdapter;
  fetch?: typeof fetch;
  now?: () => number;
  refreshBeforeExpiryMs?: number;
}): WidgetSessionProvider {
  const { adapter } = input;
  const fetchImpl = input.fetch ?? fetch;
  const now = input.now ?? Date.now;
  const refreshBeforeExpiryMs = input.refreshBeforeExpiryMs ?? 60_000;
  let cached: (WidgetAuthSession & { fingerprint: string }) | null = null;
  let pending: {
    fingerprint: string;
    promise: Promise<WidgetAuthSession>;
  } | null = null;
  let disposed = false;
  // Bumped on every teardown (revoke/signOut/dispose). An exchange captures the
  // epoch when it starts; a resolution whose epoch no longer matches belongs to
  // a session the caller has already torn down and must not re-cache a token.
  let epoch = 0;
  // Tracks the most recently requested identity. A resolution for a superseded
  // fingerprint (a fast wallet switch queued a newer exchange) must not
  // overwrite `cached` with the wrong-identity session.
  let latestFingerprint: string | null = null;
  let nextFingerprintRequestId = 0;
  let latestResolvedFingerprint:
    | { requestId: number; fingerprint: string }
    | null = null;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  const revokeSession = async (session: WidgetAuthSession): Promise<void> => {
    await fetchImpl(joinUrl(input.baseUrl, "/api/widget/auth/session"), {
      method: "DELETE",
      credentials: "omit",
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }).catch(() => undefined);
  };

  const base = async ({ forceRefresh = false } = {}) => {
    if (disposed) {
      throw new Error("Widget session provider has been disposed");
    }
    // Capture the generation up-front so a teardown that happens while the
    // identity resolves (or the exchange is in flight) discards this result.
    const startEpoch = epoch;
    const fingerprintRequestId = ++nextFingerprintRequestId;
    const fingerprint = await adapter.getFingerprint();
    if (!fingerprint) throw new Error("Widget auth identity is unavailable");
    if (disposed || epoch !== startEpoch) {
      throw new Error("Widget session request was superseded");
    }
    if (
      latestResolvedFingerprint &&
      latestResolvedFingerprint.requestId > fingerprintRequestId &&
      latestResolvedFingerprint.fingerprint !== fingerprint
    ) {
      throw new Error("Widget session request was superseded");
    }
    if (
      !latestResolvedFingerprint ||
      fingerprintRequestId > latestResolvedFingerprint.requestId
    ) {
      latestResolvedFingerprint = {
        requestId: fingerprintRequestId,
        fingerprint,
      };
    }
    latestFingerprint = fingerprint;
    const refreshAt = cached
      ? cached.expiresAt * 1000 - refreshBeforeExpiryMs
      : 0;
    if (
      !forceRefresh &&
      cached?.fingerprint === fingerprint &&
      now() < refreshAt
    ) {
      return cached.accessToken;
    }
    if (cached) {
      const stale = cached;
      cached = null;
      void revokeSession(stale);
    }
    if (!pending || pending.fingerprint !== fingerprint) {
      const promise = adapter
        .exchange({ baseUrl: input.baseUrl, fetch: fetchImpl })
        .then(async (session) => {
          // A late exchange is not merely excluded from the cache: revoke its
          // server-side token and reject the waiting request. Returning it would
          // let an API call continue after explicit sign-out or execute as the
          // wallet that was active before a fast account switch.
          const isCurrent =
            !disposed &&
            epoch === startEpoch &&
            fingerprint === latestFingerprint;
          if (!isCurrent) {
            await revokeSession(session);
            throw new Error("Widget session exchange was superseded");
          }
          cached = { ...session, fingerprint };
          notify();
          return session;
        });
      pending = { fingerprint, promise };
      void promise.then(clearPending, clearPending);

      function clearPending() {
        if (pending?.promise === promise) pending = null;
      }
    }
    return (await pending.promise).accessToken;
  };

  // Invalidate the current session generation: drop the cached token and any
  // in-flight exchange, and notify subscribers so live streams tear down
  // immediately instead of waiting for the next reconnect.
  const revoke = async () => {
    const session = cached;
    epoch += 1;
    cached = null;
    pending = null;
    latestResolvedFingerprint = null;
    notify();
    if (session) await revokeSession(session);
  };

  const provider: WidgetSessionProvider = Object.assign(base, {
    required: true as const,
    revoke,
    signOut: async () => {
      await revoke();
      await adapter.signOut?.();
    },
    dispose: () => {
      disposed = true;
      epoch += 1;
      cached = null;
      pending = null;
      latestResolvedFingerprint = null;
      notify();
      listeners.clear();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  });
  return provider;
}

type Challenge = {
  nonce: string;
  domain: string;
  uri: string;
  issuedAt: string;
  expirationTime: string;
};

async function challengeJson(
  fetchImpl: typeof fetch,
  url: string,
  body: unknown,
): Promise<Challenge> {
  const response = await fetchImpl(url, requestInit(body));
  if (!response.ok)
    throw new Error(`Widget challenge failed: ${response.status}`);
  const value = (await response.json()) as Record<string, unknown>;
  for (const key of [
    "nonce",
    "domain",
    "uri",
    "issued_at",
    "expiration_time",
  ]) {
    if (typeof value[key] !== "string")
      throw new Error("Widget challenge is invalid");
  }
  return {
    nonce: value.nonce as string,
    domain: value.domain as string,
    uri: value.uri as string,
    issuedAt: value.issued_at as string,
    expirationTime: value.expiration_time as string,
  };
}

async function exchangeJson(
  fetchImpl: typeof fetch,
  url: string,
  body: unknown,
): Promise<WidgetAuthSession> {
  const response = await fetchImpl(url, requestInit(body));
  if (!response.ok)
    throw new Error(`Widget auth exchange failed: ${response.status}`);
  const value = (await response.json()) as Record<string, unknown>;
  if (
    typeof value.access_token !== "string" ||
    typeof value.expires_at !== "number"
  ) {
    throw new Error("Widget session response is invalid");
  }
  // `expiresAt` is treated as seconds throughout (multiplied by 1000 when
  // computing the refresh window). Mirror account-session.ts's guard so a
  // millisecond value can never masquerade as a far-future expiry.
  if (value.expires_at > EXPIRES_AT_MILLISECONDS_THRESHOLD) {
    throw new Error("Widget session expires_at must be seconds, not ms");
  }
  return { accessToken: value.access_token, expiresAt: value.expires_at };
}

function requestInit(body: unknown): RequestInit {
  return {
    method: "POST",
    credentials: "omit",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function normalizeSiweSigner(
  signer: WidgetSessionSigner,
): WidgetSessionSigner & { address: `0x${string}` } {
  if (!Number.isInteger(signer.chainId) || signer.chainId <= 0) {
    throw new Error("Widget SIWE signer has no valid chain id");
  }
  // NOTE: cast is load-bearing — this repo's abitype register resolves viem's
  // `Address` to plain `string`, so `getAddress` does not narrow to `0x${string}`.
  return { ...signer, address: getAddress(signer.address) as `0x${string}` };
}
