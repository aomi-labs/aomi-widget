"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthRuntime, SvmWalletRuntime } from "../composer/types";
import type { EvmWalletRuntime } from "../runtime/evm/wallet-runtime";
import { brandDisplayName } from "../runtime/evm/brands";
import type { AccountRuntime, AccountWallet } from "./types";
import type { AomiAccount, WalletFamily } from "../types";
import {
  createAomiBackendAccountClient,
  type AomiBackendAccountResponse,
  type AomiBackendNonceResponse,
} from "./aomi-backend-client";

export type AomiBackendAccountConfig = {
  mode: "aomi-backend";
  baseUrl?: string;
  authDomain?: string;
  authUri?: string;
};

const CREDENTIAL_EXCHANGE_FAILURE_COOLDOWN_MS = 30_000;

export function useAomiBackendAccountRuntime(input: {
  enabled: boolean;
  baseUrl?: string;
  authDomain?: string;
  authUri?: string;
  auth: AuthRuntime;
  evm: EvmWalletRuntime;
  svm?: SvmWalletRuntime;
}): AccountRuntime {
  const accountClient = useMemo(
    () => createAomiBackendAccountClient({ baseUrl: input.baseUrl }),
    [input.baseUrl],
  );
  const authMessageConfig = useMemo(
    () =>
      resolveAuthMessageConfig({
        baseUrl: input.baseUrl,
        authDomain: input.authDomain,
        authUri: input.authUri,
      }),
    [input.authDomain, input.authUri, input.baseUrl],
  );
  const [account, setAccount] = useState<AomiBackendAccountResponse | null>(
    null,
  );
  const [status, setStatus] = useState<AccountRuntime["status"]>(
    input.enabled ? "loading" : "disabled",
  );
  const [errorVersion, setErrorVersion] = useState(0);
  const siweInFlight = useRef<string | null>(null);
  const signedOutEvmKey = useRef<string | null>(null);
  const signedOutCredentialKey = useRef<string | null>(null);
  const credentialInFlight = useRef<string | null>(null);
  const credentialExchanged = useRef<string | null>(null);
  const credentialFailed = useRef<{
    attemptKey: string;
    failedAt: number;
  } | null>(null);

  const refresh = useCallback(async () => {
    if (!input.enabled) return;
    setStatus((current) => (current === "ready" ? current : "loading"));
    try {
      const next = await accountClient.getAccount();
      setAccount(next);
      setStatus("ready");
    } catch {
      setStatus("error");
      setErrorVersion((version) => version + 1);
    }
  }, [accountClient, input.enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (input.auth.status !== "authenticated") {
      signedOutCredentialKey.current = null;
      credentialInFlight.current = null;
      credentialExchanged.current = null;
      credentialFailed.current = null;
    }
  }, [input.auth.status, input.auth.subject]);

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
      address: activeEvmAddress as `0x${string}`,
      accountClient,
      chainId: activeEvmChainId,
      signMessageAsync: input.evm.signMessageAsync as (args: {
        message: string;
      }) => Promise<`0x${string}`>,
      messageConfig: authMessageConfig,
    })
      .then(refresh)
      .catch(() => {
        // A rejected/failed auto-SIWE attempt must not block provider-token
        // sign-in; suppress repeat prompts for this wallet and keep runtime live.
        signedOutEvmKey.current = key;
        setStatus("ready");
        setErrorVersion((version) => version + 1);
      })
      .finally(() => {
        siweInFlight.current = null;
      });
  }, [
    account,
    activeEvmAddress,
    activeEvmChainId,
    accountClient,
    authMessageConfig,
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
      const credential = await input.auth.getCredential?.().catch(() => null);
      if (!credential || cancelled) return;
      const key = credentialKey(credential);
      const signedOutKey = authCredentialKey(input.auth, key);
      if (!account?.user && signedOutCredentialKey.current === signedOutKey) {
        return;
      }
      // Any provider credential is exchangeable, in any order: link to the
      // current account if one exists, otherwise create one. No policy gate.
      const hasAccount = Boolean(account?.user);
      const attemptKey = `${hasAccount ? "link" : "session"}:${account?.user?.id ?? "new"}:${key}`;
      const failedAttempt = credentialFailed.current;
      if (
        credentialInFlight.current === attemptKey ||
        credentialExchanged.current === attemptKey ||
        (failedAttempt?.attemptKey === attemptKey &&
          Date.now() - failedAttempt.failedAt <
            CREDENTIAL_EXCHANGE_FAILURE_COOLDOWN_MS)
      ) {
        return;
      }
      credentialInFlight.current = attemptKey;
      try {
        const result = await accountClient.exchangeProviderCredential(
          credential,
          { hasAccount },
        );
        credentialExchanged.current = attemptKey;
        if (result.account) setAccount(result.account);
        await refresh();
      } catch {
        credentialFailed.current = { attemptKey, failedAt: Date.now() };
        setStatus("ready");
        setErrorVersion((version) => version + 1);
      } finally {
        if (credentialInFlight.current === attemptKey) {
          credentialInFlight.current = null;
        }
      }
    }
    void exchange();
    return () => {
      cancelled = true;
    };
  }, [
    account?.user,
    accountClient,
    input.auth,
    input.enabled,
    refresh,
    status,
  ]);

  const liveAccounts = useMemo(
    () => [
      ...input.evm.accounts(Date.now()),
      ...(input.svm?.accounts(Date.now()) ?? []),
    ],
    [errorVersion, input.evm, input.svm],
  );

  const liveWalletKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const acct of liveAccounts) {
      keys.add(walletAccountKey(acct.family, acct.address));
    }
    return keys;
  }, [liveAccounts]);

  const wallets = useMemo(
    () =>
      (account?.wallets ?? []).map((wallet) => {
        const key = walletAccountKey(wallet.family, wallet.address);
        return {
          ...normalizeAccountWalletProvider(wallet, liveAccounts),
          capability: liveWalletKeys.has(key) ? "write" : "read",
        } satisfies AccountWallet;
      }),
    [account?.wallets, liveAccounts, liveWalletKeys],
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
      if (input.auth.status === "authenticated" && input.auth.getCredential) {
        const credential = await input.auth.getCredential().catch(() => null);
        if (credential) {
          signedOutCredentialKey.current = authCredentialKey(
            input.auth,
            credentialKey(credential),
          );
        }
      }
      credentialInFlight.current = null;
      credentialExchanged.current = null;
      credentialFailed.current = null;
      await accountClient.signOut();
      setAccount({
        user: null,
        linkedAccounts: [],
        wallets: [],
        session: null,
      });
      setStatus("ready");
    },
    deleteAccount: async () => {
      if (activeEvmAddress && activeEvmChainId) {
        signedOutEvmKey.current = `${activeEvmAddress}:${activeEvmChainId}`;
      }
      if (input.auth.status === "authenticated" && input.auth.getCredential) {
        const credential = await input.auth.getCredential().catch(() => null);
        if (credential) {
          signedOutCredentialKey.current = authCredentialKey(
            input.auth,
            credentialKey(credential),
          );
        }
      }
      credentialInFlight.current = null;
      credentialExchanged.current = null;
      credentialFailed.current = null;
      await accountClient.deleteAccount();
      setAccount({
        user: null,
        linkedAccounts: [],
        wallets: [],
        session: null,
      });
      setStatus("ready");
    },
    updateAccount: async ({ displayName, avatarUrl }) => {
      await accountClient.updateAccount({ displayName, avatarUrl });
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
      const nonceResult = await accountClient.getWalletLinkNonce({
        address: wallet.address,
        chainId,
      });
      const message = buildWalletLinkMessage({
        address: wallet.address,
        chainId,
        nonce: nonceResult.nonce,
        ...messageConfigFromNonce(nonceResult, authMessageConfig),
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
      const result = await accountClient.linkWallet(body);
      if (result.account) setAccount(result.account);
      await refresh();
    },
    updateWallet: async ({ walletId, label }) => {
      await accountClient.updateWallet(walletId, { label });
      await refresh();
    },
    updateAuthIdentity: async ({ identityId, displayLabel }) => {
      await accountClient.updateAuthIdentity(identityId, { displayLabel });
      await refresh();
    },
    unlinkWallet: async (walletId) => {
      await accountClient.unlinkWallet(walletId);
      await refresh();
    },
    unlinkAuthIdentity: async (identityId) => {
      await accountClient.unlinkAuthIdentity(identityId);
      await refresh();
    },
  };
}

function walletAccountKey(family: WalletFamily, address: string): string {
  return family === "evm"
    ? `${family}:${address.toLowerCase()}`
    : `${family}:${address}`;
}

export function normalizeAccountWalletProvider(
  wallet: AccountWallet,
  liveAccounts: readonly Pick<
    AomiAccount,
    "family" | "address" | "provider" | "walletKind"
  >[],
): AccountWallet {
  const liveAccount = liveAccounts.find(
    (account) =>
      account.family === wallet.family &&
      walletAccountKey(account.family, account.address) ===
        walletAccountKey(wallet.family, wallet.address),
  );
  const provider = liveAccount?.provider;
  const walletKind = liveAccount?.walletKind;
  if (
    provider &&
    walletKind &&
    walletKind !== "embedded" &&
    walletKind !== "smart_account"
  ) {
    return wallet;
  }
  const inferredProvider =
    provider ?? providerLinkedWalletVia(wallet.linkedVia);
  if (!inferredProvider) return wallet;

  return {
    ...wallet,
    provider: wallet.provider ?? inferredProvider,
    kind:
      walletKind === "embedded" || walletKind === "smart_account"
        ? walletKind
        : (wallet.kind ?? "embedded"),
  };
}

function providerLinkedWalletVia(linkedVia: AccountWallet["linkedVia"]) {
  if (
    linkedVia === "siwe" ||
    linkedVia === "siws" ||
    linkedVia === "challenge" ||
    linkedVia === "import" ||
    linkedVia === "observed" ||
    linkedVia === "migration"
  ) {
    return null;
  }
  return linkedVia;
}

function credentialKey(credential: unknown): string {
  return (JSON.stringify(credential) ?? "").slice(0, 96);
}

function authCredentialKey(
  auth: Pick<AuthRuntime, "provider" | "subject">,
  key: string,
): string {
  return `${auth.provider}:${auth.subject ?? "unknown"}:${key}`;
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
  accountClient: ReturnType<typeof createAomiBackendAccountClient>;
  address: `0x${string}`;
  chainId: number;
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>;
  messageConfig: AuthMessageConfig;
}): Promise<void> {
  const nonceResult = await input.accountClient.createSiweNonce({
    walletAddress: input.address,
    chainId: input.chainId,
  });
  const message = buildSiweMessage({
    address: input.address,
    chainId: input.chainId,
    nonce: nonceResult.nonce,
    ...messageConfigFromNonce(nonceResult, input.messageConfig),
  });
  const signature = await input.signMessageAsync({ message });
  await input.accountClient.verifySiwe({
    message,
    signature,
    walletAddress: input.address,
    chainId: input.chainId,
  });
}

export type AuthMessageConfig = {
  domain: string;
  uri: string;
};

export function resolveAuthMessageConfig(input: {
  baseUrl?: string;
  authDomain?: string;
  authUri?: string;
}): AuthMessageConfig {
  const base = absoluteUrl(input.baseUrl);
  const fallbackOrigin =
    base?.origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const fallbackDomain =
    base?.host ?? (typeof window !== "undefined" ? window.location.host : "");
  return {
    domain: normalizeDomain(input.authDomain) ?? fallbackDomain,
    uri: normalizeUri(input.authUri) ?? fallbackOrigin,
  };
}

export function buildSiweMessage(input: {
  address: string;
  chainId: number;
  nonce: string;
  domain: string;
  uri: string;
}): string {
  const { domain, uri } = requireAuthMessageConfig(input);
  return `${domain} wants you to sign in with your Ethereum account:
${input.address}

Sign in to Aomi.

URI: ${uri}
Version: 1
Chain ID: ${input.chainId}
Nonce: ${input.nonce}
Issued At: ${new Date().toISOString()}`;
}

export function buildWalletLinkMessage(input: {
  address: string;
  chainId: number;
  nonce: string;
  domain: string;
  uri: string;
}): string {
  const { domain, uri } = requireAuthMessageConfig(input);
  return `${domain} wants to link this wallet to your Aomi account:
${input.address}

Only sign this message if you want this wallet attached to the current Aomi account.

URI: ${uri}
Version: 1
Chain ID: ${input.chainId}
Nonce: ${input.nonce}
Issued At: ${new Date().toISOString()}`;
}

function messageConfigFromNonce(
  nonce: AomiBackendNonceResponse,
  fallback: AuthMessageConfig,
): AuthMessageConfig {
  const browserFallback = browserAuthMessageConfig();
  return {
    domain:
      normalizeDomain(nonce.domain) ??
      normalizeDomain(fallback.domain) ??
      browserFallback.domain,
    uri:
      normalizeUri(nonce.uri) ??
      normalizeUri(fallback.uri) ??
      browserFallback.uri,
  };
}

function browserAuthMessageConfig(): AuthMessageConfig {
  if (typeof window === "undefined") {
    return { domain: "", uri: "" };
  }
  return {
    domain: window.location.host,
    uri: window.location.origin,
  };
}

function requireAuthMessageConfig(input: AuthMessageConfig): AuthMessageConfig {
  const browserFallback = browserAuthMessageConfig();
  const domain = normalizeDomain(input.domain) ?? browserFallback.domain;
  const uri = normalizeUri(input.uri) ?? browserFallback.uri;
  if (!domain || !uri) {
    throw new Error("Auth domain and URI are required to build SIWE messages");
  }
  return { domain, uri };
}

function absoluteUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function normalizeDomain(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    return new URL(trimmed).host;
  } catch {
    return (
      trimmed
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .trim() || undefined
    );
  }
}

function normalizeUri(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/\/+$/, "");
  return trimmed || undefined;
}
