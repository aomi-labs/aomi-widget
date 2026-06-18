"use client";

import { useEffect, useMemo, useState } from "react";
import { UserState, useUser } from "@aomi-labs/react";
import { AomiWalletKitContextProvider } from "../context";
import type { AomiAccount, AomiWalletKit } from "../types";
import { EVM_IDENTITY_GRACE_MS, REGISTRY_STORAGE_KEY } from "../registry/types";
import { walletDebug } from "../wallet-debug";
import { DISABLED_ACCOUNT_RUNTIME } from "../account/disabled-runtime";
import { buildWalletKitAccounts } from "../accounts";
import { buildWalletKitIdentity } from "./build-identity";
import { buildWalletKitActions } from "./build-wallet-kit-actions";
import { mergeWalletRows } from "./merge-wallet-rows";
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
    const identity = evm.identity(Date.now());
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
    const registryEvmConnected = registryState.connections.some(
      (connection) => connection.family === "evm",
    );
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
        ...evm.accounts(Date.now()),
        ...(svm?.accounts(Date.now()) ?? []),
      ],
      accountWallets: account.wallets,
      transformAccounts,
      canManageAccount,
    });
    const evmWalletOptions = [...evm.options, ...additionalEvmWalletOptions];
    const svmWalletOptions =
      svm?.options.map((option) => ({
        ...option,
        family: "svm" as const,
        kind: "solana" as const,
      })) ?? [];
    const walletModalRows = mergeWalletRows({
      accounts,
      storedWallets: account.wallets,
      auth,
      options: [...evmWalletOptions, ...svmWalletOptions, ...auth.methods],
    });
    const actions = buildWalletKitActions({
      accounts,
      auth,
      evm,
      svm,
      execution,
      registryStore,
      evmAddress: address,
      registryEvmConnected,
      svmIdentity,
    });
    const hasAnyDisconnectablePath = Boolean(
      registryState.connections.length > 0 || svmIdentity?.address,
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
      accountStatus: account.status,
      accountUser: account.user,
      accountLinkedAccounts: account.linkedAccounts,
      accountWallets: account.wallets,
      accountConfirmation: account.pendingConfirmation,
      updateLinkedWallet: account.updateWallet,
      unlinkLinkedWallet: account.unlinkWallet,
      selectAccount: actions.selectAccount,
      evmWallets: evmWalletOptions,
      connectEvmWallet: actions.connectEvmWallet,
      socialLoginOptions: auth.methods,
      connectSocial: actions.connectSocial,
      solanaWallets: solanaWalletDescriptors,
      connectSolanaWallet: actions.connectSolanaWallet,
      supportedChains,
      supportedNetworks: {
        evm: supportedChains,
        solana: svm?.supportedNetworks ?? [],
      },
      solanaNetworkSwitchRequiresReconnect: Boolean(svmIdentity?.address),
      connect: actions.connect,
      disconnect: actions.disconnect,
      openAccountUI: actions.openAccountUI,
      switchChain: actions.switchChain,
      selectNetwork: actions.selectNetwork,
      sendTransaction: execution.evm.sendTransaction,
      signTypedData: execution.evm.signTypedData,
      signMessage: execution.evm.signMessage,
      getAccountCredential:
        auth.status === "authenticated" ? auth.getCredential : undefined,
      signSolanaTransaction: svm?.execution.signSolanaTransaction,
      signSolanaMessage: svm?.execution.signSolanaMessage,
      sendSolanaTransaction: svm?.execution.sendSolanaTransaction,
      signAndSendSolanaTransaction: svm?.execution.signAndSendSolanaTransaction,
      solanaRpcHttpUrl: svm?.execution.solanaRpcHttpUrl,
      solanaRpcWsUrl: svm?.execution.solanaRpcWsUrl,
    };
  }, [
    auth,
    account.wallets,
    account.linkedAccounts,
    account.pendingConfirmation,
    account.status,
    account.unlinkWallet,
    account.updateWallet,
    account.user,
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
