import { getAddress } from "viem";
import { createSiweMessage } from "viem/siwe";
import type { GetAuthorization } from "./types";

export type WidgetSessionSigner = {
  address: string;
  chainId: number;
  signMessage: (message: string) => Promise<string>;
};

export type WidgetSessionProviderOptions = {
  baseUrl: string;
  getSigner: () => Promise<WidgetSessionSigner>;
  fetch?: typeof fetch;
  now?: () => number;
  refreshBeforeExpiryMs?: number;
};

export type WidgetSessionProvider = GetAuthorization & {
  revoke: () => Promise<void>;
  dispose: () => void;
  subscribe: (listener: () => void) => () => void;
};

type Session = {
  accessToken: string;
  expiresAt: number;
  fingerprint: string;
};

type Challenge = {
  nonce: string;
  domain: string;
  uri: string;
  issuedAt: string;
  expirationTime: string;
};

const DEFAULT_REFRESH_BEFORE_EXPIRY_MS = 60_000;
const NONCE_PATH = "/api/widget/auth/siwe/nonce";
const VERIFY_PATH = "/api/widget/auth/siwe/verify";
const SESSION_PATH = "/api/widget/auth/session";

export function createWidgetSessionProvider({
  baseUrl,
  getSigner,
  fetch: fetchImpl = fetch,
  now = Date.now,
  refreshBeforeExpiryMs = DEFAULT_REFRESH_BEFORE_EXPIRY_MS,
}: WidgetSessionProviderOptions): WidgetSessionProvider {
  let cached: Session | null = null;
  let pending: { fingerprint: string; promise: Promise<Session> } | null = null;
  let disposed = false;
  const listeners = new Set<() => void>();

  const revokeSession = async (session: Session): Promise<void> => {
    await fetchImpl(joinUrl(baseUrl, SESSION_PATH), {
      method: "DELETE",
      credentials: "omit",
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }).catch(() => undefined);
  };

  const getAuthorization: WidgetSessionProvider = async ({
    forceRefresh = false,
  } = {}) => {
    if (disposed) return undefined;
    const signer = normalizeSigner(await getSigner());
    const fingerprint = signerFingerprint(signer);
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
      const promise = authenticate({
        baseUrl,
        fetchImpl,
        signer,
        fingerprint,
      }).then((session) => {
        if (disposed) return session;
        cached = session;
        for (const listener of listeners) listener();
        return session;
      });
      pending = { fingerprint, promise };
      const clearPending = () => {
        if (pending?.promise === promise) pending = null;
      };
      void promise.then(clearPending, clearPending);
    }
    return (await pending.promise).accessToken;
  };

  getAuthorization.revoke = async () => {
    const session = cached;
    cached = null;
    if (session) await revokeSession(session);
  };
  getAuthorization.dispose = () => {
    disposed = true;
    cached = null;
    pending = null;
    listeners.clear();
  };
  getAuthorization.subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return getAuthorization;
}

async function authenticate(input: {
  baseUrl: string;
  fetchImpl: typeof fetch;
  signer: WidgetSessionSigner & { address: `0x${string}` };
  fingerprint: string;
}): Promise<Session> {
  const challengeResponse = await input.fetchImpl(
    joinUrl(input.baseUrl, NONCE_PATH),
    {
      method: "POST",
      credentials: "omit",
      headers: jsonHeaders(),
      body: JSON.stringify({
        wallet_address: input.signer.address,
        chain_id: input.signer.chainId,
      }),
    },
  );
  if (!challengeResponse.ok) {
    throw new Error(
      `Widget SIWE challenge failed: ${challengeResponse.status}`,
    );
  }
  const challenge = parseChallenge(await challengeResponse.json());
  const message = createSiweMessage({
    address: input.signer.address,
    chainId: input.signer.chainId,
    domain: challenge.domain,
    uri: challenge.uri,
    version: "1",
    nonce: challenge.nonce,
    issuedAt: new Date(challenge.issuedAt),
    expirationTime: new Date(challenge.expirationTime),
    statement: "Sign in to Aomi from this site.",
  });
  const signature = await input.signer.signMessage(message);

  const verifyResponse = await input.fetchImpl(
    joinUrl(input.baseUrl, VERIFY_PATH),
    {
      method: "POST",
      credentials: "omit",
      headers: jsonHeaders(),
      body: JSON.stringify({
        message,
        signature,
        wallet_address: input.signer.address,
        chain_id: input.signer.chainId,
      }),
    },
  );
  if (!verifyResponse.ok) {
    throw new Error(`Widget SIWE verify failed: ${verifyResponse.status}`);
  }
  const session = parseSession(await verifyResponse.json());
  return { ...session, fingerprint: input.fingerprint };
}

function normalizeSigner(
  signer: WidgetSessionSigner,
): WidgetSessionSigner & { address: `0x${string}` } {
  if (!Number.isInteger(signer.chainId) || signer.chainId <= 0) {
    throw new Error("Widget SIWE signer has no valid chain id");
  }
  return { ...signer, address: getAddress(signer.address) };
}

function signerFingerprint(signer: WidgetSessionSigner): string {
  return `${signer.chainId}:${signer.address.toLowerCase()}`;
}

function parseChallenge(value: unknown): Challenge {
  if (!value || typeof value !== "object") {
    throw new Error("Widget SIWE challenge response is invalid");
  }
  if (
    !("nonce" in value) ||
    typeof value.nonce !== "string" ||
    !("domain" in value) ||
    typeof value.domain !== "string" ||
    !("uri" in value) ||
    typeof value.uri !== "string" ||
    !("issued_at" in value) ||
    typeof value.issued_at !== "string" ||
    !("expiration_time" in value) ||
    typeof value.expiration_time !== "string"
  ) {
    throw new Error("Widget SIWE challenge response is invalid");
  }
  return {
    nonce: value.nonce,
    domain: value.domain,
    uri: value.uri,
    issuedAt: value.issued_at,
    expirationTime: value.expiration_time,
  };
}

function parseSession(value: unknown): Omit<Session, "fingerprint"> {
  if (!value || typeof value !== "object") {
    throw new Error("Widget session response is invalid");
  }
  const accessToken = "access_token" in value ? value.access_token : undefined;
  const expiresAt = "expires_at" in value ? value.expires_at : undefined;
  if (
    typeof accessToken !== "string" ||
    !accessToken ||
    typeof expiresAt !== "number" ||
    !Number.isFinite(expiresAt)
  ) {
    throw new Error("Widget session response is invalid");
  }
  return { accessToken, expiresAt };
}

function jsonHeaders(): HeadersInit {
  return { Accept: "application/json", "Content-Type": "application/json" };
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
