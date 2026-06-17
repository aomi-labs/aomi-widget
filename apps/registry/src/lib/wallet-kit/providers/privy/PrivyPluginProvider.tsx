"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Chain, Hex } from "viem";
import type { WalletEip712Payload } from "@aomi-labs/react";
import { toViemSignTypedDataArgs } from "@aomi-labs/react";
import { AomiWalletKitComposer } from "../../composer/AomiWalletKitComposer";
import type { AuthRuntime, ExecutionRuntime } from "../../composer/types";
import { resolveAAProviderState } from "../../execution/aa-provider-state";
import { buildEvmExecutionRuntime } from "../../execution/execution-runtime";
import { useAomiWalletNetworkPreferences } from "../../network-preferences";
import { useEvmWalletRuntime } from "../../runtime/evm/wallet-runtime";
import { useSvmWalletRuntime } from "../../runtime/svm/wallet-runtime";
import { REGISTRY_STORAGE_KEY } from "../../registry/types";
import type { AomiAccount, AomiAccountCredential } from "../../types";
import type { ExecutionConfig } from "../../config/types";
import {
  inferPrivyAuthMethod,
  inferPrivyPrimaryLabel,
  privyLoginMethodsToOptions,
  useSafePrivy,
  useSafeSmartWallets,
  useSafeSvmWallets,
} from "./privy-auth";
import type { PrivyClientConfig } from "@privy-io/react-auth";
import { buildPrivySvmWalletState } from "./privy-svm";
import { sendPrivySmartWalletTransaction } from "./privy-execution";

export type AomiPrivyPluginProviderProps = {
  children: ReactNode;
  supportedChains: readonly Chain[];
  loginMethods?: PrivyClientConfig["loginMethods"];
  execution?: ExecutionConfig;
  preferDirectSend?: boolean;
};

export function AomiPrivyPluginProvider({
  children,
  supportedChains,
  loginMethods,
  execution,
  preferDirectSend = true,
}: AomiPrivyPluginProviderProps) {
  const privy = useSafePrivy();
  const { client: smartWalletClient, getClientForChain } =
    useSafeSmartWallets();
  const { wallets: solanaWallets } = useSafeSvmWallets();
  const [activeSolanaAddress, setActiveSolanaAddress] = useState<
    string | undefined
  >();
  const {
    selectedEvmChainId,
    selectedSolanaNetwork,
    setSelectedEvmChainId,
    setSelectedSolanaNetworkId,
    supportedSolanaNetworks,
  } = useAomiWalletNetworkPreferences();
  const evmRuntime = useEvmWalletRuntime({
    configuredChains: supportedChains,
    selectedEvmChainId,
    setSelectedEvmChainId,
    storageKey: REGISTRY_STORAGE_KEY,
    providerHooks: { providerLogout: privy.logout },
  });
  const smartAddress = smartWalletClient?.account?.address as Hex | undefined;
  const activeSolanaWallet =
    solanaWallets.find((wallet) => wallet.address === activeSolanaAddress) ??
    solanaWallets[0];
  const svmWallet = useMemo(
    () =>
      buildPrivySvmWalletState({
        wallet: activeSolanaWallet,
        wallets: solanaWallets,
        setActiveAddress: setActiveSolanaAddress,
      }),
    [activeSolanaWallet, solanaWallets],
  );

  useEffect(() => {
    if (
      activeSolanaAddress &&
      solanaWallets.some((wallet) => wallet.address === activeSolanaAddress)
    ) {
      return;
    }
    setActiveSolanaAddress(solanaWallets[0]?.address);
  }, [activeSolanaAddress, solanaWallets]);

  useEffect(() => {
    evmRuntime.registryStore.dispatch({
      type: "provider/embedded-session-changed",
      up: privy.authenticated && Boolean(smartAddress),
      providerId: "privy",
      uid: "privy-smart-session",
      stableId: "privy",
      walletName: "Privy Smart Wallet",
      embeddedEvmAddress: smartAddress ?? null,
      now: Date.now(),
    });
  }, [evmRuntime.registryStore, privy.authenticated, smartAddress]);

  const authMethod = inferPrivyAuthMethod(privy.user);
  const primaryLabel = inferPrivyPrimaryLabel(privy.user);
  const authRuntime = useMemo<AuthRuntime>(
    () => ({
      provider: "privy",
      sessionProvider: "privy",
      embeddedProvider: "privy",
      legacyWalletProvider: "privy",
      providerLabel: "Privy",
      status: !privy.ready
        ? "booting"
        : privy.authenticated
          ? "authenticated"
          : "unauthenticated",
      subject: privy.user?.id,
      primaryLabel,
      authMethod,
      authValue: primaryLabel,
      methods: privyLoginMethodsToOptions(loginMethods),
      canOpenModal: Boolean(privy.login),
      login: async () => {
        await privy.login();
      },
      logout: privy.logout,
      getCredential: privy.getAccessToken
        ? async (): Promise<AomiAccountCredential | null> => {
            const token = (await privy.getAccessToken())?.trim();
            return token ? { provider: "privy", providerToken: token } : null;
          }
        : undefined,
    }),
    [
      authMethod,
      loginMethods,
      primaryLabel,
      privy.authenticated,
      privy.getAccessToken,
      privy.login,
      privy.logout,
      privy.ready,
      privy.user?.id,
    ],
  );

  const transformPrivyAccounts = useCallback(
    (accounts: AomiAccount[]) =>
      accounts.map((account) => {
        if (
          !privy.authenticated ||
          !account.walletName?.toLowerCase().startsWith("privy")
        ) {
          return account;
        }
        return {
          ...account,
          linkedVia: account.linkedVia ?? "privy",
          actions: [{ kind: "signout" as const, label: "Sign out" }],
        };
      }),
    [privy.authenticated],
  );

  const svmRuntime = useSvmWalletRuntime({
    preferDirectSend,
    registryStore: evmRuntime.registryStore,
    selectedNetwork: selectedSolanaNetwork,
    supportedNetworks: supportedSolanaNetworks,
    setSelectedNetworkId: setSelectedSolanaNetworkId,
    wallet: svmWallet,
  });
  const executionRuntime = useMemo<ExecutionRuntime>(
    () => ({
      sponsorship: {},
      evm: buildEvmExecutionRuntime(evmRuntime, {
        aaModes: execution?.modes,
        aaOwner: execution?.owner ?? "auto",
        aaPolicy: execution?.aa ?? "optional",
        aaProvider: execution?.provider ?? "auto",
        resolveAAProviderState: async (params, context) =>
          resolveAAProviderState({
            ...params,
            ownerStrategy: { kind: "external-wallet" },
            walletClient: context.walletClient,
            address: context.address,
          }),
        sendTransaction:
          execution?.aa === "off"
            ? undefined
            : smartWalletClient
              ? async (payload) =>
                  sendPrivySmartWalletTransaction({
                    payload,
                    smartWalletClient,
                    getClientForChain,
                    wagmiChainId: evmRuntime.activeEvmConnection?.chainId,
                    smartAddress,
                  })
              : undefined,
        signTypedData: smartWalletClient
          ? async (payload: WalletEip712Payload) => {
              const args = toViemSignTypedDataArgs(payload);
              if (!args) throw new Error("Missing typed_data payload");
              const signature = await smartWalletClient.signTypedData(
                args as never,
              );
              return { signature };
            }
          : undefined,
      }),
    }),
    [evmRuntime, execution, getClientForChain, smartAddress, smartWalletClient],
  );

  return (
    <AomiWalletKitComposer
      auth={authRuntime}
      evm={evmRuntime}
      svm={svmRuntime}
      execution={executionRuntime}
      transformAccounts={transformPrivyAccounts}
      supportedChains={supportedChains}
    >
      {children}
    </AomiWalletKitComposer>
  );
}
