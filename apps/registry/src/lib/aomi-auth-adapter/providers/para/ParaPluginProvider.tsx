"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import type { Chain } from "viem";
import type { TOAuthMethod } from "@getpara/react-sdk";
import { AomiAdapterComposer } from "../../composer/AomiAdapterComposer";
import type {
  AuthRuntime,
  ExecutionRuntime,
  SolanaWalletRuntime,
} from "../../composer/types";
import { useAomiWalletNetworkPreferences } from "../../network-preferences";
import { inferAuthMethod } from "../../identity";
import {
  useEvmWalletRuntime,
  type EvmWalletRuntimeProviderHooks,
} from "../../runtime/evm/wallet-runtime";
import {
  canonicalWalletKey,
  toSocialLoginOption,
} from "../../runtime/evm/brands";
import { DEFAULT_SOLANA_CLUSTER } from "../../runtime/solana/networks";
import { REGISTRY_STORAGE_KEY } from "../../registry/types";
import { useSolanaRegistrySource } from "../../runtime/solana/registry-source";
import { walletDebug } from "../../wallet-debug";
import type { AomiAccount } from "../../types";
import { resolveParaAAProviderState, resolveParaSponsorship } from "./para-aa";
import {
  DEFAULT_SOLANA_ENDPOINT,
  useSafeSolanaWallet,
  type ResolvedSolanaConfig,
} from "./para-sol";
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

type AdapterSolanaRuntimeConfig = Pick<
  ResolvedSolanaConfig,
  "cluster" | "rpcHttpUrl" | "rpcWsUrl" | "preferDirectSend"
>;

export type AomiParaAdapterProviderProps = {
  children: ReactNode;
  supportedChains?: readonly Chain[];
  solanaConfig?: ResolvedSolanaConfig;
  oAuthMethods?: readonly TOAuthMethod[];
};

export function AomiParaAdapterProvider({
  children,
  supportedChains: configuredChains,
  solanaConfig,
  oAuthMethods = defaultOAuthMethods,
}: AomiParaAdapterProviderProps) {
  const paraAccount = useSafeParaAccount();
  const paraSession = useSafeParaClient();
  const issueJwt = useSafeIssueJwt();
  const paraLogout = useSafeLogout();
  const paraModal = useSafeParaModal();
  const solanaWallet = useSafeSolanaWallet();
  const logoutParaSession = useCallback(async () => {
    if (paraLogout) {
      try {
        walletDebug("para:logout", { via: "useLogout" });
        await paraLogout();
        walletDebug("para:logout", { result: "ok" });
        return;
      } catch (error) {
        walletDebug("para:logout", { failed: String(error) });
        console.warn("[aomi-auth-adapter] Para logout failed", error);
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
      console.warn("[aomi-auth-adapter] Para logout failed", error);
    }
  }, [paraLogout, paraSession]);
  const {
    selectedEvmChainId,
    selectedSolanaNetwork,
    setSelectedEvmChainId,
    setSelectedSolanaNetworkId,
    supportedSolanaNetworks,
  } = useAomiWalletNetworkPreferences();
  const resolvedAdapterSolanaConfig = useMemo<AdapterSolanaRuntimeConfig>(
    () => ({
      cluster: solanaConfig?.cluster ?? DEFAULT_SOLANA_CLUSTER,
      rpcHttpUrl:
        solanaConfig?.rpcHttpUrl ??
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
        DEFAULT_SOLANA_ENDPOINT,
      rpcWsUrl:
        solanaConfig?.rpcWsUrl ??
        process.env.NEXT_PUBLIC_SOLANA_RPC_WS_URL ??
        undefined,
      preferDirectSend: solanaConfig?.preferDirectSend ?? true,
    }),
    [solanaConfig],
  );
  const providerHooks = useMemo<EvmWalletRuntimeProviderHooks>(
    () => ({
      providerLogout: logoutParaSession,
      isProviderInternalConnector: (connector) =>
        connector.id === "para" ||
        canonicalWalletKey(connector.name ?? "") === "para",
      onProviderReconnectRequested: (store) => {
        store.dispatch({
          type: "user/provider-reconnect-requested",
          now: Date.now(),
        });
      },
      onConnectFallback: (store) => {
        store.dispatch({
          type: "provider/auth-flow-started",
          reason: "para-more-wallets",
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
  useSolanaRegistrySource(registryStore, { solanaWallet });
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
  const solanaRuntime = useMemo<SolanaWalletRuntime>(
    () => ({
      wallet: solanaWallet,
      config: resolvedAdapterSolanaConfig,
      supportedNetworks: supportedSolanaNetworks,
      selectedNetwork: selectedSolanaNetwork,
      setSelectedNetworkId: setSelectedSolanaNetworkId,
    }),
    [
      resolvedAdapterSolanaConfig,
      selectedSolanaNetwork,
      setSelectedSolanaNetworkId,
      solanaWallet,
      supportedSolanaNetworks,
    ],
  );
  const providerEvmWalletOptions = useMemo(
    () =>
      paraModal
        ? [
            {
              id: "walletConnect",
              label: "More wallets",
              family: "evm" as const,
              kind: "walletconnect" as const,
              status: "available" as const,
              description: "Open Para for WalletConnect and more wallets",
            },
          ]
        : [],
    [paraModal],
  );
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
  const sponsorship = useMemo(() => resolveParaSponsorship(), []);
  const executionRuntime = useMemo<ExecutionRuntime>(
    () => ({
      sponsorship,
      evm: {
        activeConnector: evmRuntime.activeConnector,
        capabilities: evmRuntime.capabilities,
        chainsById: evmRuntime.chainsById,
        currentChainId: evmRuntime.activeEvmConnection?.chainId,
        getWalletClientFor: evmRuntime.getWalletClientFor,
        sendCallsSyncAsync: evmRuntime.sendCallsSyncAsync,
        sendTransactionAsync: evmRuntime.sendTransactionAsync,
        shouldUseExternalSigner: evmRuntime.shouldUseExternalSigner,
        signMessageAsync: evmRuntime.signMessageAsync,
        signTypedDataAsync: evmRuntime.signTypedDataAsync,
        switchChainAsync: evmRuntime.switchChainAsync,
        walletClient: evmRuntime.walletClient,
        resolveAAProviderState: async (params, context) =>
          resolveParaAAProviderState({
            ...params,
            paraSession,
            walletClient: context.walletClient,
            address: context.address,
          }),
      },
    }),
    [evmRuntime, paraSession, sponsorship],
  );

  return (
    <AomiAdapterComposer
      auth={authRuntime}
      evm={evmRuntime}
      solana={solanaRuntime}
      execution={executionRuntime}
      additionalEvmWalletOptions={providerEvmWalletOptions}
      transformEvmIdentity={transformEvmIdentity}
      transformAccounts={transformAccounts}
      canManageAccount={canManageParaAccount}
      supportedChains={evmRuntime.supportedChains}
    >
      {children}
    </AomiAdapterComposer>
  );
}
