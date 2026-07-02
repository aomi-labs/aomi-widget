"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import {
  hashMessage,
  parseSignature,
  serializeSignature,
  type Chain,
} from "viem";
import type { TOAuthMethod } from "@getpara/react-sdk";
import { AomiWalletKitComposer } from "../../composer/AomiWalletKitComposer";
import { useResolvedAccountRuntime } from "../../account/use-resolved-account-runtime";
import type {
  AuthRuntime,
  ExecutionRuntime,
  SvmWalletRuntime,
} from "../../composer/types";
import type { AccountConfig, ExecutionConfig } from "../../config/types";
import { useAomiWalletNetworkPreferences } from "../../network-preferences";
import { inferAuthMethod } from "../../identity";
import {
  useEvmWalletRuntime,
  type EvmWalletRuntimeProviderHooks,
} from "../../runtime/evm/wallet-runtime";
import { toSocialLoginOption } from "../../runtime/evm/brands";
import { canonicalWalletKey } from "../../catalog/wallet-branding";
import { DEFAULT_SVM_CLUSTER } from "../../catalog/svm-networks";
import { REGISTRY_STORAGE_KEY } from "../../registry/types";
import { walletDebug } from "../../wallet-debug";
import { buildEvmExecutionRuntime } from "../../execution/execution-runtime";
import type { AomiAccount, SvmNetworkOption } from "../../types";
import {
  resolveAAProviderState,
  resolveAASponsorship,
} from "../../execution/aa-provider-state";
import { PARA_BRAND_KEY } from "./para-brand";
import {
  DEFAULT_SVM_ENDPOINT,
  useSafeSvmWallet,
  useSvmWalletRuntime,
} from "../../runtime/svm/wallet-runtime";
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
    cluster: SvmNetworkOption["cluster"];
    rpcHttpUrl: string;
    rpcWsUrl?: string;
    preferDirectSend: boolean;
  },
  "cluster" | "rpcHttpUrl" | "rpcWsUrl" | "preferDirectSend"
>;

type ParaSigningWallet = {
  id?: string;
  address?: string;
  type?: string;
};

type ParaSigningClient = {
  findWalletByAddress?: (
    address: `0x${string}`,
    filter?: { type?: readonly string[] },
  ) => ParaSigningWallet | undefined;
  signMessage?: (args: {
    walletId: string;
    messageBase64: string;
  }) => Promise<{ signature?: string }>;
  wallets?: Record<string, ParaSigningWallet>;
};

export type AomiParaPluginProviderProps = {
  children: ReactNode;
  supportedChains?: readonly Chain[];
  svmConfig?: PluginSvmRuntimeConfig;
  selectedSolanaNetwork?: SvmNetworkOption;
  setSelectedSolanaNetworkId?: (networkId: string) => void;
  supportedSolanaNetworks?: readonly SvmNetworkOption[];
  oAuthMethods?: readonly TOAuthMethod[];
  execution?: ExecutionConfig;
  account?: AccountConfig;
};

function hexToBase64(hex: string): string {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  let binary = "";
  for (let index = 0; index < normalized.length; index += 2) {
    binary += String.fromCharCode(
      parseInt(normalized.slice(index, index + 2), 16),
    );
  }
  return btoa(binary);
}

function normalizeParaSignature(signature: string): `0x${string}` {
  const normalized = signature.startsWith("0x") ? signature : `0x${signature}`;
  const parsed = parseSignature(normalized as `0x${string}`);
  return serializeSignature({
    r: parsed.r,
    s: parsed.s,
    yParity: parsed.yParity,
  });
}

function findParaSigningWallet(
  paraSession: ParaSigningClient,
  address: `0x${string}`,
): ParaSigningWallet | undefined {
  const wallet = paraSession.findWalletByAddress?.(address, { type: ["EVM"] });
  if (wallet) {
    return wallet;
  }

  return Object.entries(paraSession.wallets ?? {}).find(([, candidate]) => {
    return (
      candidate.address?.toLowerCase() === address.toLowerCase() &&
      (!candidate.type || candidate.type === "EVM")
    );
  })?.[1];
}

async function signParaMessage(
  paraSession: ParaSigningClient,
  address: `0x${string}`,
  message: string,
): Promise<`0x${string}`> {
  const wallet = findParaSigningWallet(paraSession, address);
  const walletId = wallet?.id;
  if (!walletId || typeof paraSession.signMessage !== "function") {
    throw new Error("Para embedded wallet is not available for signing");
  }

  const result = await paraSession.signMessage({
    walletId,
    messageBase64: hexToBase64(hashMessage(message)),
  });
  if (!result.signature) {
    throw new Error("Para embedded wallet did not return a signature");
  }
  return normalizeParaSignature(result.signature);
}

export function AomiParaPluginProvider({
  children,
  supportedChains: configuredChains,
  svmConfig,
  selectedSolanaNetwork: selectedSolanaNetworkProp,
  setSelectedSolanaNetworkId: setSelectedSolanaNetworkIdProp,
  supportedSolanaNetworks: supportedSolanaNetworksProp,
  oAuthMethods = defaultOAuthMethods,
  execution,
  account,
}: AomiParaPluginProviderProps) {
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
      signMessageForProviderAccount: async ({ connection, message }) => {
        if (connection.stableId !== PARA_BRAND_KEY || !paraSession) {
          return null;
        }
        return signParaMessage(
          paraSession as ParaSigningClient,
          connection.address as `0x${string}`,
          message,
        );
      },
    }),
    [logoutParaSession, paraModal, paraSession],
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
      logout: logoutParaSession,
      getCredential: exposeParaSession ? (issueJwt ?? undefined) : undefined,
    }),
    [
      embeddedPrimary,
      exposeParaSession,
      issueJwt,
      logoutParaSession,
      oAuthMethods,
      paraAccount.embedded,
      paraAccount.isLoading,
      paraAuthMethod,
      paraModal,
      registryStore,
      startParaAuthFlow,
    ],
  );
  const svmRuntime = useSvmWalletRuntime({
    preferDirectSend: resolvedAdapterSvmConfig.preferDirectSend,
    registryStore,
    selectedNetwork: selectedSolanaNetwork,
    supportedNetworks: supportedSolanaNetworks,
    setSelectedNetworkId: setSelectedSolanaNetworkId,
    wallet: svmWallet,
  });
  const providerEvmWalletOptions = useMemo(() => [], []);
  const transformEvmIdentity = useCallback(
    (identity: ReturnType<typeof evmRuntime.identity>) => {
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
      accounts
        .filter((account) => {
          if (!paraSessionLocallyDetached) return true;
          if (account.family !== "evm") return true;
          const address = account.address.toLowerCase();
          if (registryDetachedParaAddresses.includes(address)) return false;
          return !isParaEmbeddedAccount(account);
        })
        .map((account) => {
          if (!exposeParaSession || !isParaEmbeddedAccount(account)) {
            return account;
          }
          return {
            ...account,
            manageable: Boolean(paraModal),
            actions: [
              ...(paraModal
                ? [{ kind: "manage" as const, label: "Manage" }]
                : []),
              { kind: "signout" as const, label: "Sign out" },
            ],
          };
        }),
    [
      exposeParaSession,
      paraModal,
      paraSessionLocallyDetached,
      registryDetachedParaAddresses,
    ],
  );
  const canManageParaAccount = useCallback(
    (account: AomiAccount) =>
      Boolean(paraModal) && exposeParaSession && isParaEmbeddedAccount(account),
    [exposeParaSession, paraModal],
  );
  const sponsorship = useMemo(
    () => resolveAASponsorship(execution?.provider ?? "auto"),
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
          resolveAAProviderState({
            ...params,
            ownerStrategy: {
              kind: "provider-session",
              provider: "para",
              session: paraSession,
            },
            walletClient: context.walletClient,
            address: context.address,
          }),
      }),
    }),
    [evmRuntime, execution, paraSession, sponsorship],
  );
  const accountRuntime = useResolvedAccountRuntime({
    account,
    auth: authRuntime,
    evm: evmRuntime,
    svm: svmRuntime,
  });

  return (
    <AomiWalletKitComposer
      auth={authRuntime}
      account={accountRuntime}
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
