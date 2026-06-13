"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
  UserState,
  useUser,
} from "@aomi-labs/react";
import { AomiAuthAdapterProvider } from "../context";
import type { AomiAccount, AomiAuthAdapter } from "../types";
import { EVM_IDENTITY_GRACE_MS, REGISTRY_STORAGE_KEY } from "../registry/types";
import {
  buildSvmWalletDescriptors,
  connectPreferredSvmWallet,
} from "../runtime/svm/wallet-runtime";
import { buildSvmTransactionMethods } from "../runtime/svm/transactions";
import {
  executeAdapterTransaction,
  getPreferredRpcUrl,
} from "../wallet-execution";
import { walletDebug } from "../wallet-debug";
import { DISABLED_ACCOUNT_RUNTIME } from "../account/disabled-runtime";
import { buildAdapterAccounts } from "./build-accounts";
import { buildAdapterIdentity } from "./build-identity";
import { buildSocialLoginOptions } from "./build-methods";
import { mergeWalletRows, type WalletModalRow } from "./merge-wallet-rows";
import type { AomiAdapterComposerProps } from "./types";

export function AomiAdapterComposer({
  children,
  auth,
  evm,
  svm: svmProp,
  solana,
  execution,
  account = DISABLED_ACCOUNT_RUNTIME,
  additionalEvmWalletOptions = [],
  transformEvmIdentity,
  transformAccounts,
  canManageAccount,
  supportedChains,
}: AomiAdapterComposerProps) {
  const svm = svmProp ?? solana;
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

  const requestSvmConnect = useCallback(
    (walletName: string) => {
      registryStore.dispatch({
        type: "svm/connect-requested",
        walletName,
        now: Date.now(),
      });
    },
    [registryStore],
  );

  const settlePendingSvmConnect = useCallback(() => {
    const walletName = registryState.intents.pendingSvmWallet;
    if (!walletName) return;
    registryStore.dispatch({
      type: "svm/connect-settled",
      walletName,
      now: Date.now(),
    });
  }, [registryState.intents.pendingSvmWallet, registryStore]);

  const adapter = useMemo<AomiAuthAdapter>(() => {
    const address = gracefulEvmIdentity.identity.address;
    const effectiveChainId = gracefulEvmIdentity.identity.chainId;
    const registryEvmConnected = evm.registryEvmConnected;
    const isConnected = Boolean(
      auth.status === "authenticated" ||
      registryEvmConnected ||
      address ||
      svm?.wallet.publicKey,
    );
    const isBooting = auth.status === "booting" && !isConnected;
    const solanaWalletDescriptors = svm
      ? buildSvmWalletDescriptors(svm.wallet)
      : [];
    const accounts = buildAdapterAccounts({
      accounts: evm.selectAccounts(Date.now()),
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
      family: option.family === "solana" ? "solana" : "evm",
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
      evm.canDisconnectEvm || svm?.wallet.disconnect,
    );
    const identity = buildAdapterIdentity({
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
    });
    const solanaMethods = svm
      ? buildSvmTransactionMethods(svm.wallet, svm.config)
      : {};

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
        }
      },
      evmWallets: evmWalletOptions,
      connectEvmWallet: evm.connectEvmWallet,
      socialLoginOptions: buildSocialLoginOptions(auth.methods),
      connectSocial: async (id: string) => {
        await auth.login?.(`social-login:${id}`, "AUTH_ALL_OPTIONS");
      },
      solanaWallets: solanaWalletDescriptors,
      connectSolanaWallet:
        svm?.wallet.select && svm.wallet.connect
          ? async (walletName: string) => {
              const target = svm.wallet.wallets.find(
                (entry) => entry.adapter.name === walletName,
              );
              if (!target) {
                throw new Error(`Unknown Solana wallet: ${walletName}`);
              }
              if (
                svm.wallet.walletName === walletName &&
                svm.wallet.publicKey
              ) {
                return;
              }
              svm.wallet.select!(walletName as never);
              requestSvmConnect(walletName);
            }
          : undefined,
      supportedChains,
      supportedNetworks: {
        evm: supportedChains,
        solana: svm?.supportedNetworks ?? [],
      },
      solanaNetworkSwitchRequiresReconnect: Boolean(svm?.wallet.publicKey),
      connect: async (options) => {
        const requestedFamily = options?.family ?? "evm";
        if (requestedFamily === "solana" && svm && !svm.wallet.publicKey) {
          try {
            const result = await connectPreferredSvmWallet(svm.wallet);
            if (result.status === "connected") {
              settlePendingSvmConnect();
              return;
            }
            if (result.status === "selecting") {
              requestSvmConnect(result.walletName);
              return;
            }
          } catch (error) {
            console.warn(
              "[aomi-auth-adapter] Initial Solana wallet attach failed",
              error,
            );
          }
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
        const wantsAll = requestedFamily === "all";
        auth.startFlow?.(wantsAll ? "provider-logout" : "family-disconnect");
        if (
          (wantsAll || requestedFamily === "solana") &&
          svm?.wallet.publicKey &&
          svm.wallet.disconnect
        ) {
          try {
            await svm.wallet.disconnect();
          } catch (error) {
            console.warn(
              "[aomi-auth-adapter] Solana wallet disconnect failed",
              error,
            );
          }
        }

        registryStore.dispatch({
          type: "user/disconnect-family",
          family: requestedFamily,
          now: Date.now(),
        });
      },
      openAccountUI: async (options) => {
        const requestedFamily = options?.family ?? "evm";
        if (requestedFamily === "solana" && svm && !svm.wallet.publicKey) {
          try {
            const result = await connectPreferredSvmWallet(svm.wallet);
            if (result.status === "connected") {
              settlePendingSvmConnect();
              return;
            }
            if (result.status === "selecting") {
              requestSvmConnect(result.walletName);
            }
          } catch (error) {
            console.warn(
              "[aomi-auth-adapter] Solana wallet attach failed",
              error,
            );
          }
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

        settlePendingSvmConnect();
        if (svm.selectedNetwork?.id === target.networkId) {
          return;
        }
        if (svm.wallet.publicKey && svm.wallet.disconnect) {
          await svm.wallet.disconnect();
        }
        svm.setSelectedNetworkId(target.networkId);
      },
      sendTransaction: execution.evm.sendTransactionAsync
        ? async (payload) => {
            return executeAdapterTransaction({
              payload,
              state: {
                currentChainId: effectiveChainId,
                capabilities: execution.evm.capabilities,
                sendCallsSyncAsync: execution.evm.sendCallsSyncAsync
                  ? async (args) =>
                      execution.evm.sendCallsSyncAsync!({
                        ...args,
                        connector: execution.evm.activeConnector,
                      })
                  : undefined,
                sendTransactionAsync: async (args) =>
                  execution.evm.sendTransactionAsync!({
                    ...args,
                    connector: execution.evm.activeConnector,
                  }),
                switchChainAsync: execution.evm.switchChainAsync
                  ? async ({ chainId }) =>
                      execution.evm.switchChainAsync!({
                        chainId,
                        connector: execution.evm.activeConnector,
                      })
                  : undefined,
                chainsById: execution.evm.chainsById,
                getPreferredRpcUrl,
              },
              shouldUseExternalSigner: execution.evm.shouldUseExternalSigner,
              resolveAAProviderState: execution.evm.resolveAAProviderState
                ? async (params) =>
                    execution.evm.resolveAAProviderState!(params, {
                      address,
                      walletClient: execution.evm.shouldUseExternalSigner
                        ? await execution.evm.getWalletClientFor({
                            connector: execution.evm.activeConnector,
                            chainId: params.callList[0]?.chainId,
                          })
                        : execution.evm.walletClient,
                    })
                : undefined,
              forceAA: true,
              preferAAForSingleCall: true,
            });
          }
        : undefined,
      signTypedData: execution.evm.signTypedDataAsync
        ? async (payload) => {
            const signArgs = toViemSignTypedDataArgs(payload);
            if (!signArgs) {
              throw new Error("Missing typed_data payload");
            }
            const signature = await execution.evm.signTypedDataAsync!({
              ...(signArgs as Record<string, unknown>),
              connector: execution.evm.activeConnector,
            } as never);
            return { signature };
          }
        : undefined,
      signMessage: execution.evm.signMessageAsync
        ? async (payload) => {
            const messageArgs = toViemSignMessageArgs(payload);
            if (!messageArgs) {
              throw new Error("Missing non_typed_data payload");
            }
            const signature = await execution.evm.signMessageAsync!({
              ...(messageArgs as Record<string, unknown>),
              connector: execution.evm.activeConnector,
            } as never);
            return { signature };
          }
        : undefined,
      getAccountCredential:
        auth.status === "authenticated" ? auth.getCredential : undefined,
      ...solanaMethods,
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
    requestSvmConnect,
    settlePendingSvmConnect,
    svm,
    supportedChains,
    transformAccounts,
    userAAMode,
    userDelegation7702,
    userSmartAccount4337,
  ]);

  return (
    <AomiAuthAdapterProvider value={adapter}>
      {children}
    </AomiAuthAdapterProvider>
  );
}
