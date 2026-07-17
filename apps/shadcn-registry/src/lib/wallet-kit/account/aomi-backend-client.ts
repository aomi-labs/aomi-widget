import type { AomiAccountCredential } from "../types";
import type { SvmCluster } from "../types";
import type { AccountRuntime, AccountWallet } from "./types";

export type AomiBackendAccountResponse = {
  user: AccountRuntime["user"] | null;
  linkedAccounts: AccountRuntime["linkedAccounts"];
  wallets: AccountWallet[];
  session: { betterAuthUserId: string; expiresAt?: number } | null;
};

export type AomiBackendProviderExchangeResponse = {
  status: "linked" | "noop";
  account?: AomiBackendAccountResponse;
};

export type AomiBackendLinkWalletResponse = {
  status: "linked" | "noop";
  account?: AomiBackendAccountResponse;
};

export type AomiBackendDeleteAccountResponse = {
  status: "deactivated";
  revokedIdentities: number;
  revokedWallets: number;
};

export type AomiBackendNonceResponse = {
  nonce: string;
  domain?: string;
  uri?: string;
};

export type AomiBackendAccountEndpointConfig = Partial<{
  accountPath: string;
  signOutPath: string;
  existingSessionProviderExchangePath: string;
  newSessionProviderExchangePath: string;
  walletLinkPath: string;
  walletPath: (walletId: string) => string;
  identityPath: (identityId: string) => string;
  siweNoncePath: string;
  siweVerifyPath: string;
  siwsNoncePath: string;
  siwsVerifyPath: string;
}>;

const DEFAULT_ENDPOINTS = {
  accountPath: "/api/aomi/account",
  signOutPath: "/api/aomi/sign-out",
  existingSessionProviderExchangePath: "/api/aomi/provider/exchange",
  newSessionProviderExchangePath: "/api/auth/aomi/provider/exchange",
  walletLinkPath: "/api/aomi/wallets/link",
  walletPath: (walletId: string) =>
    `/api/aomi/wallets/${encodeURIComponent(walletId)}`,
  identityPath: (identityId: string) =>
    `/api/aomi/identities/${encodeURIComponent(identityId)}`,
  siweNoncePath: "/api/auth/siwe/nonce",
  siweVerifyPath: "/api/auth/siwe/verify",
  siwsNoncePath: "/api/auth/siws/nonce",
  siwsVerifyPath: "/api/auth/siws/verify",
} satisfies Required<AomiBackendAccountEndpointConfig>;

export function createAomiBackendAccountClient(input: {
  baseUrl?: string;
  endpoints?: AomiBackendAccountEndpointConfig;
  fetch?: typeof fetch;
}) {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const fetchImpl = input.fetch ?? fetch;
  const endpoints = { ...DEFAULT_ENDPOINTS, ...(input.endpoints ?? {}) };

  const urlFor = (path: string) => `${baseUrl}${path}`;
  const request = <T>(path: string, init: RequestInit) =>
    fetchJson<T>(fetchImpl, urlFor(path), init);

  return {
    getAccount: () =>
      request<AomiBackendAccountResponse>(endpoints.accountPath, {
        method: "GET",
      }),
    updateAccount: (body: {
      displayName?: string | null;
      avatarUrl?: string | null;
    }) =>
      request<AomiBackendAccountResponse>(endpoints.accountPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    deleteAccount: () =>
      request<AomiBackendDeleteAccountResponse>(endpoints.accountPath, {
        method: "DELETE",
      }),
    signOut: () => request(endpoints.signOutPath, { method: "POST" }),
    exchangeProviderCredential: (
      credential: AomiAccountCredential,
      options: { hasAccount: boolean },
    ) =>
      request<AomiBackendProviderExchangeResponse>(
        options.hasAccount
          ? endpoints.existingSessionProviderExchangePath
          : endpoints.newSessionProviderExchangePath,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credential),
        },
      ),
    getWalletLinkNonce: (input: { address: string; chainId: number }) => {
      const params = new URLSearchParams({
        address: input.address,
        chainId: String(input.chainId),
      });
      return request<AomiBackendNonceResponse>(
        `${endpoints.walletLinkPath}?${params.toString()}`,
        { method: "GET" },
      );
    },
    linkWallet: (body: unknown) =>
      request<AomiBackendLinkWalletResponse>(endpoints.walletLinkPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    updateWallet: (walletId: string, body: { label?: string | null }) =>
      request(endpoints.walletPath(walletId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    updateAuthIdentity: (
      identityId: string,
      body: { displayLabel?: string | null },
    ) =>
      request(endpoints.identityPath(identityId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    unlinkWallet: (walletId: string) =>
      request(endpoints.walletPath(walletId), { method: "DELETE" }),
    unlinkAuthIdentity: (identityId: string) =>
      request(endpoints.identityPath(identityId), { method: "DELETE" }),
    createSiweNonce: (body: { walletAddress: string; chainId: number }) =>
      request<AomiBackendNonceResponse>(endpoints.siweNoncePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    verifySiwe: (body: {
      message: string;
      signature: string;
      walletAddress: string;
      chainId: number;
    }) =>
      request(endpoints.siweVerifyPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    createSiwsNonce: (body: {
      walletAddress: string;
      chainId: SvmCluster;
      intent: "sign-in" | "link";
    }) =>
      request<AomiBackendNonceResponse>(endpoints.siwsNoncePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    verifySiws: (body: {
      message: string;
      signature: string;
      walletAddress: string;
      chainId: SvmCluster;
      intent: "sign-in" | "link";
      label?: string;
    }) =>
      request(endpoints.siwsVerifyPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  };
}

async function fetchJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetchImpl(url, {
    credentials: "include",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const code = extractErrorCode(error);
    throw new Error(formatAccountRequestError(response.status, code));
  }
  return (await response.json()) as T;
}

function extractErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  if ("error" in error && error.error) return String(error.error);
  if ("message" in error && error.message) return String(error.message);
  return null;
}

function formatAccountRequestError(
  status: number,
  code: string | null,
): string {
  if (status === 409 && code === "already_linked_to_another_account") {
    return "This wallet or sign-in method is already linked to another Aomi account. Sign in to that account to unlink it first.";
  }
  return code ?? `Request failed: ${status}`;
}

function normalizeBaseUrl(baseUrl?: string): string {
  return baseUrl?.replace(/\/+$/, "") ?? "";
}
