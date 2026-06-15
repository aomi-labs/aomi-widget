"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserState, useUser } from "@aomi-labs/react";
import { AomiWalletKitContextProvider } from "../context";
import type { AomiAccount, AomiWalletKit } from "../types";
import { EVM_IDENTITY_GRACE_MS, REGISTRY_STORAGE_KEY } from "../registry/types";
import { walletDebug } from "../wallet-debug";
import { DISABLED_ACCOUNT_RUNTIME } from "../account/disabled-runtime";
import { buildWalletKitAccounts } from "./build-accounts";
import { buildWalletKitIdentity } from "./build-identity";
import { mergeWalletRows, type WalletModalRow } from "./merge-wallet-rows";
import type { AomiWalletKitComposerProps } from "./types";

export function AomiWalletKitComposer({
  children,
  auth,
  evm,
  svm,
  execution,
  account = DISABLED_ACCOUNT_RUNTIME,
  additionalEvmWalletOptions = [],
  transformEvmIdentity,
  transformAccounts,
  canManageAccount,
  supportedChains,
}: AomiWalletKitComposerProps) {
  const { user } = useUser();
  const userAAMode = UserState.aaMode(user);
  const userSmartAccount4337 = UserState.SmartAccount4337(user);
  const userDelegation7702 = UserState.Delegation7702(user);
  const [evmIdentityGraceVersion, bumpEvmIdentityGrace] = useState(0);
  const { registryStore, registryState } = evm;

  const registryEvmIdentity = useMemo(() => {
    const identity = evm.selectEvmIdentity(Date.now());
    return transformEvmIdentity ? transformEvmIdentity(identity) : identity;
  }, [evmIdentityGraceVersion, evm, transformEvmIdentity]);

  const gracefulEvmIdentity = {
    identity: registryEvmIdentity,
    disconnectedAt: registryState.evmGrace.disconnectedAt,
    usingCachedIdentity: Boolean(
      registryState.evmGrace.disconnectedAt && registryEvmIdentity.address,
    ),
  };

  useEffect(() => {
    if (
      !gracefulEvmIdentity.usingCachedIdentity ||
      gracefulEvmIdentity.disconnectedAt === null
    ) {
      return;
    }

    const elapsed = Date.now() - gracefulEvmIdentity.disconnectedAt;
    const timeout = window.setTimeout(
      () => bumpEvmIdentityGrace((version) => version + 1),
      Math.max(0, EVM_IDENTITY_GRACE_MS - elapsed) + 1,
    );
    return () => window.clearTimeout(timeout);
  }, [
    gracefulEvmIdentity.disconnectedAt,
    gracefulEvmIdentity.usingCachedIdentity,
  ]);

  useEffect(() => {
    if (registryState.phase !== "stable") return;
    const registryAddress =
      registryState.activeByFamily.evm?.address.toLowerCase() ?? null;
    const liveAddress =
      gracefulEvmIdentity.identity.address?.toLowerCase() ?? null;
    if (registryAddress === liveAddress) return;
    walletDebug("registry:shadow-diff", {
      registryAddress,
      liveAddress,
      registryActive: registryState.activeByFamily.evm,
    });
  }, [
    gracefulEvmIdentity.identity.address,
    registryState.activeByFamily.evm,
    registryState.phase,
  ]);

  const adapter = useMemo<AomiWalletKit>(() => {
    const address = gracefulEvmIdentity.identity.address;
    const effectiveChainId = gracefulEvmIdentity.identity.chainId;
    const svmIdentity = svm?.identity(Date.now());
    const registryEvmConnected = evm.registryEvmConnected;
    const isConnected = Boolean(
      auth.status === "authenticated" ||
      registryEvmConnected ||
      address ||
      svmIdentity?.address,
    );
    const isBooting = auth.status === "booting" && !isConnected;
    const solanaWalletDescriptors =
      svm?.options.map((option) => ({
        name: option.label,
        installed: Boolean(option.installed),
        ready: option.ready !== false && option.status !== "unavailable",
        iconUrl: option.iconUrl,
      })) ?? [];
    const accounts = buildWalletKitAccounts({
      accounts: [
        ...evm.selectAccounts(Date.now()),
        ...(svm?.accounts(Date.now()) ?? []),
      ],
      accountWallets: account.wallets,
      transformAccounts,
      canManageAccount,
    });
    const evmWalletOptions = [
      ...evm.evmWalletOptions,
      ...additionalEvmWalletOptions,
    ];
    const optionRows: WalletModalRow[] = evmWalletOptions.map((option) => ({
      id: option.id,
      family: option.family === "svm" ? "svm" : "evm",
      label: option.label,
      walletName: option.label,
      source: "option",
      status: option.status === "unavailable" ? "unavailable" : "available",
      provider: option.connectorId,
      actions: [{ kind: "connect", label: "Connect" }],
    }));
    const walletModalRows = [
      ...mergeWalletRows({
        accounts,
        storedWallets: account.wallets,
        auth,
      }),
      ...optionRows,
    ];
    const hasAnyDisconnectablePath = Boolean(
      evm.canDisconnectEvm || svm?.status === "ready",
    );
    const identity = buildWalletKitIdentity({
      auth,
      address,
      chainId: effectiveChainId ?? undefined,
      isBooting,
      isConnected,
      svm,
      aa: {
        aaMode: userAAMode ?? "none",
        SmartAccount4337: userSmartAccount4337 ?? undefined,
        Delegation7702: userDelegation7702 ?? undefined,
      },
      sponsorship: {
        sponsored: execution.sponsorship.sponsored,
        sponsorProvider: execution.sponsorship.sponsorProvider,
        sponsorAccount: execution.sponsorship.sponsorAccount,
      },
      walletName: gracefulEvmIdentity.identity.walletName,
      walletSource: gracefulEvmIdentity.identity.walletSource,
    });
    return {
      identity,
      isReady: !isBooting,
      isSwitchingChain: evm.isSwitchingChain,
      canConnect:
        Boolean(auth.canOpenModal) ||
        Boolean(solanaWalletDescriptors.length) ||
        Boolean(evmWalletOptions.length),
      canOpenAccountUI:
        Boolean(auth.openAccountUI) &&
        auth.status === "authenticated" &&
        identity.isConnected,
      canDisconnect: hasAnyDisconnectablePath,
      accounts,
      walletModalRows,
      selectAccount: async (id: string) => {
        const target = accounts.find((account) => account.id === id);
        if (!target) {
          throw new Error(`Unknown account: ${id}`);
        }
        if (target.family === "evm") {
          await evm.selectEvmAccount(id);
          return;
        }
        if (target.family === "svm") await svm?.selectAccount(id);
      },
      evmWallets: evmWalletOptions,
      connectEvmWallet: evm.connectEvmWallet,
      socialLoginOptions: auth.methods,
      connectSocial: async (id: string) => {
        await auth.login?.(`social-login:${id}`, "AUTH_ALL_OPTIONS");
      },
      solanaWallets: solanaWalletDescriptors,
      connectSolanaWallet: svm
        ? async (walletName: string) => {
            await svm.connect(walletName);
          }
        : undefined,
      supportedChains,
      supportedNetworks: {
        evm: supportedChains,
        solana: svm?.supportedNetworks ?? [],
      },
      solanaNetworkSwitchRequiresReconnect: Boolean(svmIdentity?.address),
      connect: async (options) => {
        const requestedFamily =
          options?.family === "solana" ? "svm" : (options?.family ?? "evm");
        if (requestedFamily === "svm" && svm && !svmIdentity?.address) {
          await svm.connect();
          return;
        }
        if (requestedFamily === "evm" && (address || registryEvmConnected)) {
          return;
        }
        await auth.login?.("auth-modal", "AUTH_MAIN");
      },
      disconnect: async (options) => {
        if (options?.accountId) {
          const target = accounts.find((a) => a.id === options.accountId);
          if (target?.family === "evm") {
            await evm.disconnectEvmAccount(target);
          }
          return;
        }

        const requestedFamily = options?.family ?? "all";
        const registryFamily =
          requestedFamily === "solana" ? "svm" : requestedFamily;
        const wantsAll = requestedFamily === "all";
        auth.startFlow?.(wantsAll ? "provider-logout" : "family-disconnect");
        if (
          (wantsAll || registryFamily === "svm") &&
          svmIdentity?.address &&
          svm
        ) {
          try {
            await svm.disconnect();
          } catch (error) {
            console.warn(
              "[aomi-wallet-kit] Solana wallet disconnect failed",
              error,
            );
          }
        }

        registryStore.dispatch({
          type: "user/disconnect-family",
          family: registryFamily,
          now: Date.now(),
        });
      },
      openAccountUI: async (options) => {
        const requestedFamily =
          options?.family === "solana" ? "svm" : (options?.family ?? "evm");
        if (requestedFamily === "svm" && svm && !svmIdentity?.address) {
          await svm.connect();
          return;
        }
        await auth.openAccountUI?.("account-modal", "ACCOUNT_MAIN");
      },
      switchChain: execution.evm.switchChainAsync
        ? evm.switchEvmChain
        : undefined,
      selectNetwork: async (target) => {
        if (target.family === "evm") {
          await evm.switchEvmChain(target.chainId);
          return;
        }
        if (!svm) return;
        await svm.selectNetwork(target.networkId);
      },
      sendTransaction: execution.evm.sendTransaction,
      signTypedData: execution.evm.signTypedData,
      signMessage: execution.evm.signMessage,
      getAccountCredential:
        auth.status === "authenticated" ? auth.getCredential : undefined,
      signSolanaTransaction:
        execution.svm?.signSolanaTransaction ??
        svm?.execution.signSolanaTransaction,
      signSolanaMessage:
        execution.svm?.signSolanaMessage ?? svm?.execution.signSolanaMessage,
      sendSolanaTransaction:
        execution.svm?.sendSolanaTransaction ??
        svm?.execution.sendSolanaTransaction,
      signAndSendSolanaTransaction:
        execution.svm?.signAndSendSolanaTransaction ??
        svm?.execution.signAndSendSolanaTransaction,
      solanaRpcHttpUrl:
        execution.svm?.solanaRpcHttpUrl ?? svm?.execution.solanaRpcHttpUrl,
      solanaRpcWsUrl:
        execution.svm?.solanaRpcWsUrl ?? svm?.execution.solanaRpcWsUrl,
    };
  }, [
    auth,
    account.wallets,
    additionalEvmWalletOptions,
    canManageAccount,
    evm,
    execution,
    gracefulEvmIdentity.identity.address,
    gracefulEvmIdentity.identity.chainId,
    gracefulEvmIdentity.identity.walletName,
    registryStore,
    svm,
    supportedChains,
    transformAccounts,
    userAAMode,
    userDelegation7702,
    userSmartAccount4337,
  ]);

  return (
    <AomiWalletKitContextProvider value={adapter}>
      {children}
    </AomiWalletKitContextProvider>
  );
}
