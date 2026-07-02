import { privateKeyToAccount } from "viem/accounts";
import type { GetAccountAccessToken } from "../types";
import type { CliAuthSession, CliSessionState } from "./state";

type SiweNonceResponse = {
  nonce?: unknown;
  domain?: unknown;
  uri?: unknown;
};

type SiweVerifyResponse = {
  token?: unknown;
  success?: unknown;
  user_id?: unknown;
  user?: {
    id?: unknown;
    walletAddress?: unknown;
    chainId?: unknown;
  };
};

type PortalAccountResponse = {
  session?: {
    betterAuthUserId?: unknown;
    expiresAt?: unknown;
  } | null;
};

export type CliSiweLoginOptions = {
  baseUrl: string;
  privateKey: `0x${string}`;
  chainId?: number;
  fetch?: typeof fetch;
  now?: () => number;
};

export type CliSiweLoginResult = {
  auth: CliAuthSession;
  address: `0x${string}`;
};

const DEFAULT_CHAIN_ID = 1;
const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const AUTH_REFRESH_SKEW_MS = 30 * 1000;
const SESSION_TOKEN_HEADERS = ["set-auth-token", "x-auth-token", "auth-token"];
const NONCE_COOKIE_NAME = "aomi_siwe_nonce";
const SESSION_COOKIE_NAME = "aomi_session";

export function createCliAuthTokenProvider(
  readState: () => Pick<
    CliSessionState,
    "accountBearer" | "auth" | "sessionCookie"
  >,
  now: () => number = Date.now,
): GetAccountAccessToken {
  return async () => {
    const state = readState();
    const auth = state.auth;
    if (
      auth?.sessionToken &&
      auth.expiresAt > now() + AUTH_REFRESH_SKEW_MS
    ) {
      return auth.sessionToken;
    }
    return state.accountBearer ?? state.sessionCookie;
  };
}

export async function signInWithCliSiwe({
  baseUrl,
  privateKey,
  chainId = DEFAULT_CHAIN_ID,
  fetch: fetchImpl = fetch,
  now = Date.now,
}: CliSiweLoginOptions): Promise<CliSiweLoginResult> {
  const portalUrl = normalizeBaseUrl(baseUrl);
  const account = privateKeyToAccount(privateKey);
  const address = account.address;
  const nonceHttpResponse = await fetchImpl(
    joinUrl(portalUrl, "/api/bff/auth/siwe/nonce"),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ walletAddress: address, chainId }),
    },
  );
  if (!nonceHttpResponse.ok) {
    throw new Error(
      `SIWE nonce failed: HTTP ${nonceHttpResponse.status} ${await safeResponseText(
        nonceHttpResponse,
      )}`,
    );
  }
  const nonceResponse =
    (await nonceHttpResponse.json()) as SiweNonceResponse;
  const nonceCookie = getCookie(nonceHttpResponse.headers, NONCE_COOKIE_NAME);
  const nonce =
    typeof nonceResponse.nonce === "string" ? nonceResponse.nonce : "";
  if (!nonce) {
    throw new Error("SIWE nonce response is missing nonce");
  }

  const message = buildSiweMessage({
    address,
    chainId,
    nonce,
    domain:
      normalizeDomain(nonceResponse.domain) ?? domainFromBaseUrl(portalUrl),
    uri: normalizeUri(nonceResponse.uri) ?? portalUrl,
  });
  const signature = await account.signMessage({ message });
  const verifyHeaders = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  if (nonceCookie) {
    verifyHeaders.set("Cookie", `${NONCE_COOKIE_NAME}=${nonceCookie}`);
  }
  const verifyResponse = await fetchImpl(
    joinUrl(portalUrl, "/api/bff/auth/siwe/verify"),
    {
      method: "POST",
      headers: verifyHeaders,
      credentials: "include",
      body: JSON.stringify({
        message,
        signature,
        walletAddress: address,
        chainId,
      }),
    },
  );

  if (!verifyResponse.ok) {
    throw new Error(
      `SIWE verify failed: HTTP ${verifyResponse.status} ${await safeResponseText(
        verifyResponse,
      )}`,
    );
  }

  const verifyBody = (await verifyResponse
    .json()
    .catch(() => ({}))) as SiweVerifyResponse;
  const sessionToken =
    getSessionTokenHeader(verifyResponse.headers) ??
    getCookie(verifyResponse.headers, SESSION_COOKIE_NAME) ??
    (typeof verifyBody.token === "string" ? verifyBody.token : "");
  if (!sessionToken) {
    throw new Error("SIWE verify response is missing BFF session token");
  }

  const accountInfo = await fetchPortalAccount(
    fetchImpl,
    portalUrl,
    sessionToken,
  );
  const expiresAt =
    parseExpiresAt(accountInfo?.session?.expiresAt) ??
    now() + DEFAULT_SESSION_TTL_MS;

  return {
    address,
    auth: {
      sessionToken,
      expiresAt,
      walletAddress:
        typeof verifyBody.user?.walletAddress === "string"
          ? verifyBody.user.walletAddress
          : address,
      chainId:
        typeof verifyBody.user?.chainId === "number"
          ? verifyBody.user.chainId
          : chainId,
      betterAuthUserId:
        typeof accountInfo?.session?.betterAuthUserId === "string"
          ? accountInfo.session.betterAuthUserId
          : typeof verifyBody.user_id === "string"
            ? verifyBody.user_id
          : typeof verifyBody.user?.id === "string"
            ? verifyBody.user.id
            : undefined,
    },
  };
}

export async function signOutCliSession(input: {
  baseUrl: string;
  sessionToken?: string;
  fetch?: typeof fetch;
}): Promise<void> {
  if (!input.sessionToken) return;
  const response = await (input.fetch ?? fetch)(
    joinUrl(normalizeBaseUrl(input.baseUrl), "/api/auth/sign-out"),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input.sessionToken}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({}),
    },
  );
  if (!response.ok && response.status !== 401) {
    throw new Error(
      `Sign-out failed: HTTP ${response.status} ${await safeResponseText(
        response,
      )}`,
    );
  }
}

export function buildSiweMessage(input: {
  address: string;
  chainId: number;
  nonce: string;
  domain: string;
  uri: string;
}): string {
  return `${input.domain} wants you to sign in with your Ethereum account:
${input.address}

Sign in to Aomi.

URI: ${input.uri}
Version: 1
Chain ID: ${input.chainId}
Nonce: ${input.nonce}
Issued At: ${new Date().toISOString()}`;
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("Portal URL is required");
  return trimmed;
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function domainFromBaseUrl(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/\/.*$/, "");
  }
}

function normalizeDomain(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return new URL(trimmed).host || undefined;
  } catch {
    return trimmed
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
      .replace(/\/.*$/, "")
      .trim();
  }
}

function normalizeUri(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}

function getSessionTokenHeader(headers: Headers): string | null {
  for (const header of SESSION_TOKEN_HEADERS) {
    const value = headers.get(header);
    if (value) return value;
  }
  return null;
}

function getCookie(headers: Headers, name: string): string | null {
  const setCookieHeaders = [
    ...((headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ??
      []),
  ];
  const singleHeader = headers.get("set-cookie");
  if (singleHeader) setCookieHeaders.push(singleHeader);

  for (const header of setCookieHeaders) {
    const match = new RegExp(`(?:^|,\\s*)${name}=([^;,]+)`).exec(
      header,
    );
    if (match?.[1]) return match[1];
  }
  return null;
}

async function fetchPortalAccount(
  fetchImpl: typeof fetch,
  baseUrl: string,
  sessionToken: string,
): Promise<PortalAccountResponse | null> {
  const response = await fetchImpl(joinUrl(baseUrl, "/api/aomi/account"), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
  });
  if (!response.ok) return null;
  return (await response
    .json()
    .catch(() => null)) as PortalAccountResponse | null;
}

async function requestJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  label: string,
): Promise<T> {
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json", ...(init.headers ?? {}) },
    ...init,
  });
  if (!response.ok) {
    throw new Error(
      `${label} failed: HTTP ${response.status} ${await safeResponseText(
        response,
      )}`,
    );
  }
  return (await response.json()) as T;
}

function parseExpiresAt(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? value : value * 1000;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

async function safeResponseText(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  return text ? `- ${text}` : "";
}
