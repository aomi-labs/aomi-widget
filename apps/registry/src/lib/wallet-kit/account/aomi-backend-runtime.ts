"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthRuntime, SvmWalletRuntime } from "../composer/types";
import type { EvmWalletRuntime } from "../runtime/evm/wallet-runtime";
import type {
  AccountConfirmation,
  AccountRuntime,
  AccountWallet,
} from "./types";

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

type ConfirmationResponse = {
  status: "needs_confirmation";
  severity: "yellow" | "red";
  otherAccountWillClose: boolean;
};

type ProviderExchangeResponse =
  | { status: "linked"; account?: AccountResponse }
  | ConfirmationResponse;

type LinkWalletResponse =
  | {
      status: "linked" | "moved" | "merged" | "noop";
      account?: AccountResponse;
    }
  | ConfirmationResponse;

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
  const [pendingConfirmation, setPendingConfirmation] = useState<
    AccountConfirmation | undefined
  >();
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

  useEffect(() => {
    if (!input.enabled) setPendingConfirmation(undefined);
  }, [input.enabled]);

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
      const exchangeCredential = async (confirm = false) =>
        fetchJson<ProviderExchangeResponse>(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...credential, confirm }),
        });
      try {
        const result = await exchangeCredential();
        if (isConfirmationResponse(result)) {
          credentialExchanged.current = attemptKey;
          setPendingConfirmation(
            createAccountConfirmation({
              response: result,
              subject: "sign-in method",
              onConfirm: async () => {
                const confirmed = await exchangeCredential(true);
                if (isConfirmationResponse(confirmed)) {
                  throw new Error("Account confirmation was not accepted");
                }
                if (confirmed.account) setAccount(confirmed.account);
                setPendingConfirmation(undefined);
                await refresh();
              },
              onDismiss: () => setPendingConfirmation(undefined),
            }),
          );
          return;
        }
        credentialExchanged.current = attemptKey;
        if ("account" in result && result.account) setAccount(result.account);
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
    pendingConfirmation,
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
      setPendingConfirmation(undefined);
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
      const body = {
        ...wallet,
        chainId,
        message,
        signature,
        nonce: nonceResult.nonce,
      };
      const link = async (confirm = false) =>
        fetchJson<LinkWalletResponse>(`${baseUrl}/api/aomi/wallets/link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, confirm }),
        });
      const result = await link();
      if (isConfirmationResponse(result)) {
        setPendingConfirmation(
          createAccountConfirmation({
            response: result,
            subject: "wallet",
            onConfirm: async () => {
              const confirmed = await link(true);
              if (isConfirmationResponse(confirmed)) {
                throw new Error("Wallet confirmation was not accepted");
              }
              if (confirmed.account) setAccount(confirmed.account);
              setPendingConfirmation(undefined);
              await refresh();
            },
            onDismiss: () => setPendingConfirmation(undefined),
          }),
        );
        return;
      }
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

function isConfirmationResponse(
  result: ProviderExchangeResponse | LinkWalletResponse,
): result is ConfirmationResponse {
  return result.status === "needs_confirmation";
}

function createAccountConfirmation(input: {
  response: ConfirmationResponse;
  subject: "wallet" | "sign-in method";
  onConfirm: () => Promise<void>;
  onDismiss: () => void;
}): AccountConfirmation {
  const destructive = input.response.severity === "red";
  const subjectTitle = input.subject === "wallet" ? "wallet" : "sign-in method";
  return {
    severity: input.response.severity,
    otherAccountWillClose: input.response.otherAccountWillClose,
    title: destructive ? "Merge another account?" : `Move ${subjectTitle}?`,
    message: destructive
      ? `This ${subjectTitle} is the last login method on another Aomi account. Continuing will close that account and move it here.`
      : `This ${subjectTitle} is already linked to another Aomi account. Continuing will move it to this account.`,
    confirmLabel: destructive ? "Merge account" : "Move link",
    confirm: input.onConfirm,
    dismiss: input.onDismiss,
  };
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
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

function normalizeBaseUrl(baseUrl?: string): string {
  return baseUrl?.replace(/\/+$/, "") ?? "";
}
