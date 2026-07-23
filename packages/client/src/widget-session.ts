import { getAddress } from "viem";
import { createSiweMessage } from "viem/siwe";
import type { GetAccountBearer } from "./types";
import { joinUrl } from "./internal/url";
import { decodeJwtSubject } from "./internal/encoding";

export type WidgetSession = {
  accessToken: string;
  expiresAt: number;
};

export type WidgetAuthAdapter = {
  kind: string;
  getFingerprint(): string | null | Promise<string | null>;
  exchange(input: {
    baseUrl: string;
    fetch: typeof fetch;
  }): Promise<WidgetSession>;
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
  chainId: string;
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
    kind: input.provider,
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
  kind: string;
  noncePath: string;
  verifyPath: string;
  getSigner(): Promise<S>;
  normalizeSigner(signer: S): N;
  getFingerprint(signer: N): string;
  buildMessage(input: { signer: N; challenge: Challenge }): string;
}): WidgetAuthAdapter {
  return {
    kind: config.kind,
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
    kind: "siwe",
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
        statement: "Sign in to Aomi from this site.",
      }),
  });
}

export function createSiwsWidgetAuthAdapter(input: {
  getSigner(): Promise<SiwsWidgetSessionSigner>;
}): WidgetAuthAdapter {
  return createSignedChallengeAdapter({
    kind: "siws",
    noncePath: "/api/widget/auth/siws/nonce",
    verifyPath: "/api/widget/auth/siws/verify",
    getSigner: input.getSigner,
    normalizeSigner: (signer) => signer,
    getFingerprint: (signer) => `${signer.chainId}:${signer.address}`,
    buildMessage: ({ signer, challenge }) =>
      [
        `${challenge.domain} wants you to sign in with your Solana account:`,
        signer.address,
        "",
        "Sign in to Aomi.",
        "",
        `URI: ${challenge.uri}`,
        "Version: 1",
        `Chain ID: ${signer.chainId}`,
        `Nonce: ${challenge.nonce}`,
        `Issued At: ${challenge.issuedAt}`,
      ].join("\n"),
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
  let cached: (WidgetSession & { fingerprint: string }) | null = null;
  let pending: { fingerprint: string; promise: Promise<WidgetSession> } | null =
    null;
  let disposed = false;
  const listeners = new Set<() => void>();

  const revokeSession = async (session: WidgetSession): Promise<void> => {
    await fetchImpl(joinUrl(input.baseUrl, "/api/widget/auth/session"), {
      method: "DELETE",
      credentials: "omit",
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }).catch(() => undefined);
  };

  const provider = (async ({ forceRefresh = false } = {}) => {
    if (disposed) return undefined;
    const fingerprint = await adapter.getFingerprint();
    if (!fingerprint) throw new Error("Widget auth identity is unavailable");
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
        .then((session) => {
          if (!disposed) {
            cached = { ...session, fingerprint };
            for (const listener of listeners) listener();
          }
          return session;
        });
      pending = { fingerprint, promise };
      void promise.then(clearPending, clearPending);

      function clearPending() {
        if (pending?.promise === promise) pending = null;
      }
    }
    return (await pending.promise).accessToken;
  }) as WidgetSessionProvider;

  Object.defineProperty(provider, "required", { value: true });
  provider.revoke = async () => {
    const session = cached;
    cached = null;
    if (session) await revokeSession(session);
  };
  provider.signOut = async () => {
    await provider.revoke();
    await adapter.signOut?.();
  };
  provider.dispose = () => {
    disposed = true;
    cached = null;
    pending = null;
    listeners.clear();
  };
  provider.subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
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
): Promise<WidgetSession> {
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
  return { ...signer, address: getAddress(signer.address) as `0x${string}` };
}
