"use client";

import type ParaWeb from "@getpara/react-sdk";
import { useAccount as useParaAccount } from "@getpara/react-sdk";
import { CoreStoreContext } from "@getpara/react-core/internal";
import { useContext, useEffect, useState } from "react";
import { useAccount } from "wagmi";

export type AccountIdentityKind = "disconnected" | "social" | "wallet";

export type AccountIdentity = {
  kind: AccountIdentityKind;
  isConnected: boolean;
  address?: string;
  chainId?: number;
  authProvider?: string;
  primaryLabel: string;
  secondaryLabel?: string;
};

const DISCONNECTED_PARA_ACCOUNT = {
  isConnected: false,
  embedded: {
    authMethods: new Set<string>(),
    email: undefined,
    farcasterUsername: undefined,
    telegramUserId: undefined,
    wallets: undefined,
  },
  external: {
    evm: undefined,
  },
};

type DirectParaState = {
  isConnected: boolean;
  primaryLabel?: string;
  authProvider?: string;
  embeddedAddress?: string;
  externalAddress?: string;
};

declare global {
  interface Window {
    __AOMI_PARA_CLIENT__?: ParaWeb;
  }
}

function formatAddress(address?: string): string | undefined {
  if (!address) return undefined;
  return `${address.slice(0, 5)}..${address.slice(-2)}`;
}

function formatAuthProvider(provider?: string): string | undefined {
  if (!provider) return undefined;

  const labelMap: Record<string, string> = {
    google: "Google",
    github: "GitHub",
    apple: "Apple",
    facebook: "Facebook",
    x: "X",
    discord: "Discord",
    farcaster: "Farcaster",
    telegram: "Telegram",
    email: "Email",
    phone: "Phone",
  };

  return labelMap[provider] ?? provider;
}

function inferAuthProvider(authMethods: unknown): string | undefined {
  if (!(authMethods instanceof Set) || authMethods.size === 0) return undefined;

  const allowed = new Set([
    "google",
    "github",
    "apple",
    "facebook",
    "x",
    "discord",
    "farcaster",
    "telegram",
    "email",
    "phone",
  ]);

  for (const method of authMethods) {
    if (typeof method !== "string") continue;
    const normalized = method.toLowerCase();
    if (allowed.has(normalized)) return normalized;
  }

  const first = authMethods.values().next().value;
  return typeof first === "string" ? first.toLowerCase() : undefined;
}

function getDirectParaState(client?: ParaWeb): DirectParaState {
  if (!client) {
    return {
      isConnected: false,
      primaryLabel: undefined,
      authProvider: undefined,
      embeddedAddress: undefined,
      externalAddress: undefined,
    };
  }

  const authInfo = client.authInfo;
  const currentEvmWalletId = client.currentWalletIds.EVM?.[0];
  const currentAddress =
    (currentEvmWalletId ? client.getAddress(currentEvmWalletId) : undefined) ??
    client.getAddress();
  const embeddedWallet =
    (currentEvmWalletId ? client.wallets[currentEvmWalletId] : undefined) ??
    Object.values(client.wallets).find((wallet) => !wallet.isExternal);
  const externalWallet =
    Object.values(client.externalWallets).find((wallet) => wallet.address) ??
    Object.values(client.wallets).find((wallet) => wallet.isExternal);

  const primaryLabel =
    client.email ??
    client.farcasterUsername ??
    client.telegramUserId ??
    authInfo?.identifier ??
    undefined;

  const authProvider =
    authInfo?.authType === "externalWallet" ? "wallet" : authInfo?.authType;

  const hasAnyWallet =
    Object.keys(client.wallets).length > 0 ||
    Object.keys(client.externalWallets).length > 0;

  return {
    isConnected: Boolean(client.userId || authInfo || hasAnyWallet),
    primaryLabel,
    authProvider,
    embeddedAddress: embeddedWallet?.address ?? currentAddress,
    externalAddress: externalWallet?.address,
  };
}

export function useAccountIdentity(): AccountIdentity {
  const coreStore = useContext(CoreStoreContext);
  const paraAccount = coreStore ? useParaAccount() : DISCONNECTED_PARA_ACCOUNT;
  const [directParaVersion, setDirectParaVersion] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cleanup = () => undefined;
    let watcher: ReturnType<typeof setInterval> | null = null;

    const bindClient = (): boolean => {
      const client = window.__AOMI_PARA_CLIENT__;
      if (!client) return false;

      const unsubscribeReady = client.onReadyStateChange(() => {
        setDirectParaVersion((value) => value + 1);
      });
      const unsubscribePhase = client.onStatePhaseChange(() => {
        setDirectParaVersion((value) => value + 1);
      });

      cleanup = () => {
        unsubscribeReady();
        unsubscribePhase();
      };

      setDirectParaVersion((value) => value + 1);
      return true;
    };

    if (!bindClient()) {
      watcher = setInterval(() => {
        if (bindClient() && watcher) {
          clearInterval(watcher);
          watcher = null;
        }
      }, 300);
    }

    return () => {
      cleanup();
      if (watcher) clearInterval(watcher);
    };
  }, []);

  let wagmiAddress: string | undefined;
  let chainId: number | undefined;
  let wagmiConnected = false;

  try {
    const wagmiAccount = useAccount();
    wagmiAddress = wagmiAccount.address;
    chainId = wagmiAccount.chainId;
    wagmiConnected = wagmiAccount.isConnected;
  } catch {
    wagmiAddress = undefined;
    chainId = undefined;
    wagmiConnected = false;
  }

  const directParaState =
    typeof window === "undefined"
      ? getDirectParaState(undefined)
      : getDirectParaState(window.__AOMI_PARA_CLIENT__);

  void directParaVersion;

  const embeddedPrimary =
    paraAccount.embedded.email ??
    paraAccount.embedded.farcasterUsername ??
    paraAccount.embedded.telegramUserId ??
    directParaState.primaryLabel ??
    undefined;

  const embeddedWallet = paraAccount.embedded.wallets?.[0] as
    | { address?: string }
    | undefined;
  const embeddedAddress = embeddedWallet?.address ?? directParaState.embeddedAddress;
  const externalAddress =
    paraAccount.external.evm?.address ?? directParaState.externalAddress;
  const address = wagmiAddress ?? externalAddress ?? embeddedAddress;

  const authProvider =
    inferAuthProvider(paraAccount.embedded.authMethods) ??
    directParaState.authProvider;
  const providerLabel = formatAuthProvider(authProvider);
  const isConnected = Boolean(
    paraAccount.isConnected || directParaState.isConnected || wagmiConnected,
  );

  if (isConnected && embeddedPrimary) {
    return {
      kind: "social",
      isConnected,
      address,
      chainId: chainId ?? undefined,
      authProvider,
      primaryLabel: embeddedPrimary,
      secondaryLabel: providerLabel,
    };
  }

  if (isConnected && address) {
    return {
      kind: "wallet",
      isConnected,
      address,
      chainId: chainId ?? undefined,
      authProvider,
      primaryLabel: formatAddress(address) ?? "Connected wallet",
    };
  }

  return {
    kind: "disconnected",
    isConnected: false,
    address: undefined,
    chainId: chainId ?? undefined,
    authProvider,
    primaryLabel: "Not connected",
    secondaryLabel: undefined,
  };
}
