"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthRuntime, SvmWalletRuntime } from "../composer/types";
import type { EvmWalletRuntime } from "../runtime/evm/wallet-runtime";
import { brandDisplayName } from "../runtime/evm/brands";
import type { AccountRuntime, AccountWallet } from "./types";
import type { WalletFamily } from "../types";

export type AomiBackendAccountConfig = {
  mode: "aomi-backend";
  baseUrl?: string;
  signInPolicy?: "evm-siwe-first" | "provider-token-allowed";
};

type AccountResponse = {
  user: AccountRuntime["user"] | null;
  linkedAccounts: AccountRuntime["linkedAccounts"];
  wallets: AccountWallet[];
  session: { betterAuthUserId: string; expiresAt?: number } | null;
};

type ProviderExchangeResponse = {
  status: "linked" | "noop";
  account?: AccountResponse;
};

type LinkWalletResponse = {
  status: "linked" | "noop";
  account?: AccountResponse;
};

export function useAomiBackendAccountRuntime(input: {
  enabled: boolean;
  baseUrl?: string;
  auth: AuthRuntime;
  evm: EvmWalletRuntime;
  svm?: SvmWalletRuntime;
  signInPolicy: "evm-siwe-first" | "provider-token-allowed";
}): AccountRuntime {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [status, setStatus] = useState<AccountRuntime["status"]>(
    input.enabled ? "loading" : "disabled",
  );
  const [errorVersion, setErrorVersion] = useState(0);
  const siweInFlight = useRef<string | null>(null);
  const signedOutEvmKey = useRef<string | null>(null);
  const credentialInFlight = useRef<string | null>(null);
  const credentialExchanged = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!input.enabled) return;
    setStatus((current) => (current === "ready" ? current : "loading"));
    try {
      const next = await fetchJson<AccountResponse>(
        `${baseUrl}/api/aomi/account`,
        { method: "GET" },
      );
      setAccount(next);
      setStatus("ready");
    } catch {
      setStatus("error");
      setErrorVersion((version) => version + 1);
    }
  }, [baseUrl, input.enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeEvmAddress = input.evm.activeEvmConnection?.address;
  const activeEvmChainId = input.evm.activeEvmConnection?.chainId;

  useEffect(() => {
    if (
      !input.enabled ||
      status === "error" ||
      account === null ||
      account.user
    ) {
      return;
    }
    if (!activeEvmAddress || !activeEvmChainId || !input.evm.signMessageAsync) {
      signedOutEvmKey.current = null;
      return;
    }
    const key = `${activeEvmAddress}:${activeEvmChainId}`;
    if (signedOutEvmKey.current === key) return;
    if (siweInFlight.current === key) return;
    siweInFlight.current = key;
    signInWithActiveEvmWallet({
      baseUrl,
      address: activeEvmAddress as `0x${string}`,
      chainId: activeEvmChainId,
      signMessageAsync: input.evm.signMessageAsync as (args: {
        message: string;
      }) => Promise<`0x${string}`>,
    })
      .then(refresh)
      .catch(() => {
        setStatus("error");
        setErrorVersion((version) => version + 1);
      })
      .finally(() => {
        siweInFlight.current = null;
      });
  }, [
    account,
    activeEvmAddress,
    activeEvmChainId,
    baseUrl,
    input.enabled,
    input.evm.signMessageAsync,
    refresh,
    status,
  ]);

  useEffect(() => {
    if (
      !input.enabled ||
      status === "error" ||
      input.auth.status !== "authenticated"
    ) {
      return;
    }
    if (!input.auth.getCredential) return;
    let cancelled = false;
    async function exchange() {
      const credential = await input.auth.getCredential?.();
      if (!credential || cancelled) return;
      const key = JSON.stringify(credential).slice(0, 96);
      const endpoint = account?.user
        ? `${baseUrl}/api/aomi/provider/exchange`
        : input.signInPolicy === "provider-token-allowed"
          ? `${baseUrl}/api/auth/aomi/provider/exchange`
          : null;
      if (!endpoint) {
        return;
      }
      const attemptKey = `${endpoint}:${account?.user?.id ?? "new"}:${key}`;
      if (
        credentialInFlight.current === attemptKey ||
        credentialExchanged.current === attemptKey
      ) {
        return;
      }
      credentialInFlight.current = attemptKey;
      const exchangeCredential = async () =>
        fetchJson<ProviderExchangeResponse>(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credential),
        });
      try {
        const result = await exchangeCredential();
        credentialExchanged.current = attemptKey;
        if (result.account) setAccount(result.account);
        await refresh();
      } finally {
        if (credentialInFlight.current === attemptKey) {
          credentialInFlight.current = null;
        }
      }
    }
    void exchange().catch(() => {
      setStatus("error");
      setErrorVersion((version) => version + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [
    account?.user,
    baseUrl,
    input.auth,
    input.enabled,
    input.signInPolicy,
    refresh,
    status,
  ]);

  const liveWalletKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const acct of input.evm.accounts(Date.now())) {
      keys.add(`evm:${acct.address.toLowerCase()}`);
    }
    const svmIdentity = input.svm?.identity(Date.now());
    if (svmIdentity?.address) keys.add(`svm:${svmIdentity.address}`);
    return keys;
  }, [errorVersion, input.evm, input.svm]);

  const wallets = useMemo(
    () =>
      (account?.wallets ?? []).map((wallet) => {
        const key =
          wallet.family === "evm"
            ? `evm:${wallet.address.toLowerCase()}`
            : `svm:${wallet.address}`;
        return {
          ...wallet,
          capability: liveWalletKeys.has(key) ? "write" : "read",
        } satisfies AccountWallet;
      }),
    [account?.wallets, liveWalletKeys],
  );

  return {
    status: input.enabled ? status : "disabled",
    user: account?.user ?? undefined,
    linkedAccounts: account?.linkedAccounts ?? [],
    wallets,
    refresh,
    signOut: async () => {
      if (activeEvmAddress && activeEvmChainId) {
        signedOutEvmKey.current = `${activeEvmAddress}:${activeEvmChainId}`;
      }
      await fetchJson(`${baseUrl}/api/aomi/sign-out`, { method: "POST" });
      setAccount({
        user: null,
        linkedAccounts: [],
        wallets: [],
        session: null,
      });
      setStatus("ready");
    },
    updateAccount: async ({ displayName, avatarUrl }) => {
      await fetchJson(`${baseUrl}/api/aomi/account`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, avatarUrl }),
      });
      await refresh();
    },
    linkWallet: async (wallet) => {
      if (
        wallet.family !== "evm" ||
        (!input.evm.signMessageForAccount && !input.evm.signMessageAsync)
      ) {
        throw new Error("Wallet linking requires an active EVM signer");
      }
      const chainId = wallet.chainId ?? activeEvmChainId;
      if (!chainId) throw new Error("Wallet linking requires an EVM chain id");
      const nonceResult = await fetchJson<{ nonce: string }>(
        `${baseUrl}/api/aomi/wallets/link?address=${encodeURIComponent(
          wallet.address,
        )}&chainId=${encodeURIComponent(String(chainId))}`,
        { method: "GET" },
      );
      const message = buildWalletLinkMessage({
        address: wallet.address,
        chainId,
        nonce: nonceResult.nonce,
      });
      const signature =
        wallet.accountId && input.evm.signMessageForAccount
          ? await input.evm.signMessageForAccount({
              accountId: wallet.accountId,
              chainId,
              message,
            })
          : await signMessageWithActiveEvm(input.evm.signMessageAsync, message);
      // Name the label after the wallet actually being linked, not whichever
      // wallet happens to be the active EVM signer — linking MetaMask while a
      // Privy smart wallet is active must read "MetaMask N", not "Privy …".
      const defaultLabel = buildDefaultWalletLabel({
        walletName: resolveLinkedWalletName({
          accounts: input.evm.accounts(Date.now()),
          accountId: wallet.accountId,
          address: wallet.address,
          fallbackWalletName: input.evm.activeEvmConnection?.walletName,
        }),
        existingWallets: account?.wallets ?? [],
        family: wallet.family,
      });
      const body = {
        ...wallet,
        chainId,
        label: defaultLabel,
        message,
        signature,
        nonce: nonceResult.nonce,
      };
      const link = async () =>
        fetchJson<LinkWalletResponse>(`${baseUrl}/api/aomi/wallets/link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      const result = await link();
      if (result.account) setAccount(result.account);
      await refresh();
    },
    updateWallet: async ({ walletId, label }) => {
      await fetchJson(`${baseUrl}/api/aomi/wallets/${walletId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      await refresh();
    },
    updateAuthIdentity: async ({ identityId, displayLabel }) => {
      await fetchJson(`${baseUrl}/api/aomi/identities/${identityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayLabel }),
      });
      await refresh();
    },
    unlinkWallet: async (walletId) => {
      await fetchJson(`${baseUrl}/api/aomi/wallets/${walletId}`, {
        method: "DELETE",
      });
      await refresh();
    },
    unlinkAuthIdentity: async (identityId) => {
      await fetchJson(`${baseUrl}/api/aomi/identities/${identityId}`, {
        method: "DELETE",
      });
      await refresh();
    },
  };
}

/**
 * Resolve the brand name of the wallet being linked from the live EVM accounts,
 * matching by stable account id first and address second. Falls back to the
 * caller-supplied active-connection name only when the linked wallet isn't in
 * the live set — so a default label is always brand-correct for the wallet the
 * user actually picked, even when a different wallet is the active signer.
 */
export function resolveLinkedWalletName(input: {
  accounts: ReadonlyArray<{
    id: string;
    address?: string;
    walletName?: string;
  }>;
  accountId?: string;
  address: string;
  fallbackWalletName?: string;
}): string | undefined {
  const target = input.address.toLowerCase();
  const match = input.accounts.find(
    (candidate) =>
      (input.accountId !== undefined && candidate.id === input.accountId) ||
      candidate.address?.toLowerCase() === target,
  );
  return match?.walletName ?? input.fallbackWalletName;
}

/**
 * Build a first-link default label like "Rabby 1" / "MetaMask 2" so the
 * account-management row is never blank before the user renames it. Only used
 * as the initial value — `upsertWallet` keeps an existing label via
 * `coalesce(aomi_wallets.label, excluded.label)`, so user renames stick.
 */
export function buildDefaultWalletLabel(input: {
  walletName?: string | null;
  existingWallets: readonly AccountWallet[];
  family: WalletFamily;
}): string {
  const brand = brandDisplayName(input.walletName);
  const sameBrand = input.existingWallets.filter(
    (wallet) =>
      wallet.family === input.family &&
      wallet.label?.toLowerCase().startsWith(brand.toLowerCase()),
  ).length;
  return `${brand} ${sameBrand + 1}`;
}

async function signMessageWithActiveEvm(
  signMessageAsync: EvmWalletRuntime["signMessageAsync"],
  message: string,
): Promise<`0x${string}`> {
  if (!signMessageAsync) {
    throw new Error("Wallet linking requires an active EVM signer");
  }
  return (await (
    signMessageAsync as (args: { message: string }) => Promise<`0x${string}`>
  )({ message })) as `0x${string}`;
}

async function signInWithActiveEvmWallet(input: {
  baseUrl: string;
  address: `0x${string}`;
  chainId: number;
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>;
}): Promise<void> {
  const nonceResult = await fetchJson<{ nonce: string }>(
    `${input.baseUrl}/api/auth/siwe/nonce`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress: input.address,
        chainId: input.chainId,
      }),
    },
  );
  const message = buildSiweMessage({
    address: input.address,
    chainId: input.chainId,
    nonce: nonceResult.nonce,
  });
  const signature = await input.signMessageAsync({ message });
  await fetchJson(`${input.baseUrl}/api/auth/siwe/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      signature,
      walletAddress: input.address,
      chainId: input.chainId,
    }),
  });
}

function buildSiweMessage(input: {
  address: string;
  chainId: number;
  nonce: string;
}): string {
  const origin = window.location.origin;
  const domain = window.location.host;
  return `${domain} wants you to sign in with your Ethereum account:
${input.address}

Sign in to Aomi.

URI: ${origin}
Version: 1
Chain ID: ${input.chainId}
Nonce: ${input.nonce}
Issued At: ${new Date().toISOString()}`;
}

function buildWalletLinkMessage(input: {
  address: string;
  chainId: number;
  nonce: string;
}): string {
  return `${window.location.host} wants to link this wallet to your Aomi account:
${input.address}

Only sign this message if you want this wallet attached to the current Aomi account.

URI: ${window.location.origin}
Version: 1
Chain ID: ${input.chainId}
Nonce: ${input.nonce}
Issued At: ${new Date().toISOString()}`;
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const code =
      error && typeof error === "object" && "error" in error
        ? String(error.error)
        : null;
    throw new Error(formatAccountRequestError(response.status, code));
  }
  return (await response.json()) as T;
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
