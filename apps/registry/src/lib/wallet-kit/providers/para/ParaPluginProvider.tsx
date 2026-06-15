"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import type { Chain } from "viem";
import type { TOAuthMethod } from "@getpara/react-sdk";
import { AomiWalletKitComposer } from "../../composer/AomiWalletKitComposer";
import type {
  AuthRuntime,
  ExecutionRuntime,
  SvmWalletRuntime,
} from "../../composer/types";
import type { ExecutionConfig } from "../../config/types";
import { useAomiWalletNetworkPreferences } from "../../network-preferences";
import { inferAuthMethod } from "../../identity";
import {
  useEvmWalletRuntime,
  type EvmWalletRuntimeProviderHooks,
} from "../../runtime/evm/wallet-runtime";
import { toSocialLoginOption } from "../../runtime/evm/brands";
import { canonicalWalletKey } from "../../catalog/wallet-branding";
import { DEFAULT_SVM_CLUSTER } from "../../runtime/svm/networks";
import { REGISTRY_STORAGE_KEY } from "../../registry/types";
import { useSvmRegistrySource } from "../../runtime/svm/registry-source";
import { buildSvmTransactionMethods } from "../../runtime/svm/transactions";
import { walletDebug } from "../../wallet-debug";
import { buildEvmExecutionRuntime } from "../../execution/execution-runtime";
import type { AomiAccount, SvmNetworkOption } from "../../types";
import { resolveParaAAProviderState, resolveParaSponsorship } from "./para-aa";
import { PARA_BRAND_KEY } from "./para-brand";
import { DEFAULT_SVM_ENDPOINT, useSafeSvmWallet } from "./para-svm";
import { useParaSessionSource } from "./sources/para-session-source";
import { isParaEmbeddedAccount } from "./para-embedded-wallet";
import {
  defaultOAuthMethods,
  resolveParaAuthValue,
  useSafeIssueJwt,
  useSafeLogout,
  useSafeParaAccount,
  useSafeParaClient,
  useSafeParaModal,
} from "./para-auth";

type PluginSvmRuntimeConfig = Pick<
  {
    cluster: SvmWalletRuntime["config"]["cluster"];
    rpcHttpUrl: string;
    rpcWsUrl?: string;
    preferDirectSend: boolean;
  },
  "cluster" | "rpcHttpUrl" | "rpcWsUrl" | "preferDirectSend"
>;

export type AomiParaPluginProviderProps = {
  children: ReactNode;
  supportedChains?: readonly Chain[];
  svmConfig?: PluginSvmRuntimeConfig;
  /** @deprecated use `svmConfig` */
  solanaConfig?: PluginSvmRuntimeConfig;
  selectedSolanaNetwork?: SvmNetworkOption;
  setSelectedSolanaNetworkId?: (networkId: string) => void;
  supportedSolanaNetworks?: readonly SvmNetworkOption[];
  oAuthMethods?: readonly TOAuthMethod[];
  execution?: ExecutionConfig;
};

export function AomiParaPluginProvider({
  children,
  supportedChains: configuredChains,
  svmConfig: svmConfigProp,
  solanaConfig,
  selectedSolanaNetwork: selectedSolanaNetworkProp,
  setSelectedSolanaNetworkId: setSelectedSolanaNetworkIdProp,
  supportedSolanaNetworks: supportedSolanaNetworksProp,
  oAuthMethods = defaultOAuthMethods,
  execution,
}: AomiParaPluginProviderProps) {
  const svmConfig = svmConfigProp ?? solanaConfig;
  const paraAccount = useSafeParaAccount();
  const paraSession = useSafeParaClient();
  const issueJwt = useSafeIssueJwt();
  const paraLogout = useSafeLogout();
  const paraModal = useSafeParaModal();
  const svmWallet = useSafeSvmWallet();
  const logoutParaSession = useCallback(async () => {
    if (paraLogout) {
      try {
        walletDebug("para:logout", { via: "useLogout" });
        await paraLogout();
        walletDebug("para:logout", { result: "ok" });
        return;
      } catch (error) {
        walletDebug("para:logout", { failed: String(error) });
        console.warn("[aomi-wallet-kit] Para logout failed", error);
      }
    }

    const clientLogout = (
      paraSession as unknown as {
        logout?: (args?: unknown) => Promise<unknown>;
      } | null
    )?.logout;
    if (typeof clientLogout !== "function") {
      walletDebug("para:logout", {
        skip: paraLogout ? "hook-failed-no-client-fallback" : "no-path",
      });
      return;
    }
    try {
      walletDebug("para:logout", { via: "client" });
      await clientLogout.call(paraSession);
      walletDebug("para:logout", { result: "ok" });
    } catch (error) {
      walletDebug("para:logout", { failed: String(error) });
      console.warn("[aomi-wallet-kit] Para logout failed", error);
    }
  }, [paraLogout, paraSession]);
  const {
    selectedEvmChainId,
    selectedSolanaNetwork: preferenceSelectedSolanaNetwork,
    setSelectedEvmChainId,
    setSelectedSolanaNetworkId: preferenceSetSelectedSolanaNetworkId,
    supportedSolanaNetworks: preferenceSupportedSolanaNetworks,
  } = useAomiWalletNetworkPreferences();
  const selectedSolanaNetwork =
    selectedSolanaNetworkProp ?? preferenceSelectedSolanaNetwork;
  const setSelectedSolanaNetworkId =
    setSelectedSolanaNetworkIdProp ?? preferenceSetSelectedSolanaNetworkId;
  const supportedSolanaNetworks =
    supportedSolanaNetworksProp ?? preferenceSupportedSolanaNetworks;
  const resolvedAdapterSvmConfig = useMemo<PluginSvmRuntimeConfig>(
    () => ({
      cluster: svmConfig?.cluster ?? DEFAULT_SVM_CLUSTER,
      rpcHttpUrl:
        svmConfig?.rpcHttpUrl ??
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
        DEFAULT_SVM_ENDPOINT,
      rpcWsUrl:
        svmConfig?.rpcWsUrl ??
        process.env.NEXT_PUBLIC_SOLANA_RPC_WS_URL ??
        undefined,
      preferDirectSend: svmConfig?.preferDirectSend ?? true,
    }),
    [svmConfig],
  );
  const providerHooks = useMemo<EvmWalletRuntimeProviderHooks>(
    () => ({
      providerLogout: logoutParaSession,
      isProviderInternalConnector: (connector) =>
        connector.id === PARA_BRAND_KEY ||
        canonicalWalletKey(connector.name ?? "") === PARA_BRAND_KEY,
      onProviderReconnectRequested: (store) => {
        store.dispatch({
          type: "user/provider-reconnect-requested",
          now: Date.now(),
        });
      },
      onConnectFallback: (store) => {
        store.dispatch({
          type: "provider/auth-flow-started",
          reason: "provider-auth-connect-fallback",
          now: Date.now(),
        });
        paraModal?.openModal({ step: "AUTH_MAIN" });
      },
      onAccountDisconnectPlanned: (disconnectPlan) => {
        if (
          disconnectPlan.isProviderOwnedAccount &&
          disconnectPlan.otherConnectionsRemain
        ) {
          walletDebug("para:detach", {
            address: disconnectPlan.targetAddress,
            reason: "preserve-external-wallets",
          });
        }
      },
    }),
    [logoutParaSession, paraModal],
  );
  const evmRuntime = useEvmWalletRuntime({
    configuredChains,
    selectedEvmChainId,
    setSelectedEvmChainId,
    storageKey: REGISTRY_STORAGE_KEY,
    providerHooks,
  });
  const { registryStore, registryState } = evmRuntime;
  useParaSessionSource(registryStore, { paraAccount });
  useSvmRegistrySource(registryStore, { svmWallet });
  const startParaAuthFlow = useCallback(
    (reason: string) => {
      registryStore.dispatch({
        type: "provider/auth-flow-started",
        reason,
        now: Date.now(),
      });
    },
    [registryStore],
  );
  const registryDetachedParaAddresses = registryState.intents
    .providerSessionDetached
    ? registryState.intents.droppedAddresses
    : [];
  const paraSessionLocallyDetached = Boolean(
    paraAccount.isConnected && registryState.intents.providerSessionDetached,
  );
  const exposeParaSession = Boolean(
    paraAccount.isConnected && !paraSessionLocallyDetached,
  );
  const embeddedPrimary = exposeParaSession
    ? (paraAccount.embedded.email ??
      paraAccount.embedded.farcasterUsername ??
      paraAccount.embedded.telegramUserId ??
      undefined)
    : undefined;
  const paraAuthMethod = inferAuthMethod(paraAccount.embedded.authMethods);
  const authRuntime = useMemo<AuthRuntime>(
    () => ({
      provider: "para",
      sessionProvider: "para",
      embeddedProvider: "para",
      legacyWalletProvider: "para",
      providerLabel: "Para",
      status: paraAccount.isLoading
        ? "booting"
        : exposeParaSession
          ? "authenticated"
          : "unauthenticated",
      primaryLabel: embeddedPrimary,
      authMethod: embeddedPrimary ? paraAuthMethod : undefined,
      authValue: embeddedPrimary
        ? resolveParaAuthValue(paraAccount.embedded, paraAuthMethod)
        : undefined,
      methods: paraModal
        ? Array.from(oAuthMethods).map(toSocialLoginOption)
        : [],
      canOpenModal: Boolean(paraModal),
      startFlow: startParaAuthFlow,
      login: async (reason: string, step = "AUTH_MAIN") => {
        registryStore.dispatch({
          type: "user/provider-reconnect-requested",
          now: Date.now(),
        });
        startParaAuthFlow(reason);
        paraModal?.openModal({ step });
      },
      openAccountUI: async (reason: string, step = "ACCOUNT_MAIN") => {
        startParaAuthFlow(reason);
        paraModal?.openModal({ step });
      },
      getCredential: exposeParaSession ? (issueJwt ?? undefined) : undefined,
    }),
    [
      embeddedPrimary,
      exposeParaSession,
      issueJwt,
      oAuthMethods,
      paraAccount.embedded,
      paraAccount.isLoading,
      paraAuthMethod,
      paraModal,
      registryStore,
      startParaAuthFlow,
    ],
  );
  const svmRuntime = useMemo<SvmWalletRuntime>(
    () => ({
      wallet: svmWallet,
      config: resolvedAdapterSvmConfig,
      supportedNetworks: supportedSolanaNetworks,
      selectedNetwork: selectedSolanaNetwork,
      setSelectedNetworkId: setSelectedSolanaNetworkId,
    }),
    [
      resolvedAdapterSvmConfig,
      selectedSolanaNetwork,
      setSelectedSolanaNetworkId,
      svmWallet,
      supportedSolanaNetworks,
    ],
  );
  const providerEvmWalletOptions = useMemo(() => [], []);
  const transformEvmIdentity = useCallback(
    (identity: ReturnType<typeof evmRuntime.selectEvmIdentity>) => {
      if (
        paraSessionLocallyDetached &&
        identity.address &&
        registryDetachedParaAddresses.includes(identity.address.toLowerCase())
      ) {
        return {};
      }
      return identity;
    },
    [paraSessionLocallyDetached, registryDetachedParaAddresses],
  );
  const transformAccounts = useCallback(
    (accounts: AomiAccount[]) =>
      accounts.filter((account) => {
        if (!paraSessionLocallyDetached) return true;
        if (account.family !== "evm") return true;
        const address = account.address.toLowerCase();
        if (registryDetachedParaAddresses.includes(address)) return false;
        return !isParaEmbeddedAccount(account);
      }),
    [paraSessionLocallyDetached, registryDetachedParaAddresses],
  );
  const canManageParaAccount = useCallback(
    (account: AomiAccount) =>
      Boolean(paraModal) && exposeParaSession && isParaEmbeddedAccount(account),
    [exposeParaSession, paraModal],
  );
  const sponsorship = useMemo(
    () => resolveParaSponsorship(execution?.provider ?? "auto"),
    [execution?.provider],
  );
  const executionRuntime = useMemo<ExecutionRuntime>(
    () => ({
      sponsorship,
      evm: buildEvmExecutionRuntime(evmRuntime, {
        aaModes: execution?.modes,
        aaOwner: execution?.owner ?? "auto",
        aaPolicy: execution?.aa ?? "optional",
        aaProvider: execution?.provider ?? "auto",
        resolveAAProviderState: async (params, context) =>
          resolveParaAAProviderState({
            ...params,
            paraSession,
            walletClient: context.walletClient,
            address: context.address,
          }),
      }),
      svm: buildSvmTransactionMethods(svmWallet, resolvedAdapterSvmConfig),
    }),
    [
      evmRuntime,
      execution,
      paraSession,
      resolvedAdapterSvmConfig,
      sponsorship,
      svmWallet,
    ],
  );

  return (
    <AomiWalletKitComposer
      auth={authRuntime}
      evm={evmRuntime}
      svm={svmRuntime}
      execution={executionRuntime}
      additionalEvmWalletOptions={providerEvmWalletOptions}
      transformEvmIdentity={transformEvmIdentity}
      transformAccounts={transformAccounts}
      canManageAccount={canManageParaAccount}
      supportedChains={evmRuntime.supportedChains}
    >
      {children}
    </AomiWalletKitComposer>
  );
}
