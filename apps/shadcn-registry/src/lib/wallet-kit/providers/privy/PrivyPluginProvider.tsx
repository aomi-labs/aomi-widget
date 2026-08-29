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
import { useResolvedAccountRuntime } from "../../account/use-resolved-account-runtime";
import { buildEvmExecutionRuntime } from "../../execution/execution-runtime";
import { useAomiWalletNetworkPreferences } from "../../network-preferences";
import { useEvmWalletRuntime } from "../../runtime/evm/wallet-runtime";
import {
  useMergedSvmWallet,
  useSafeSvmWallet,
  useSvmWalletRuntime,
  type SafeSvmWalletState,
} from "../../runtime/svm/wallet-runtime";
import { REGISTRY_STORAGE_KEY } from "../../registry/types";
import type { AomiAccount, AomiAccountCredential } from "../../types";
import type { AccountConfig, ExecutionConfig } from "../../config/types";
import {
  inferPrivyAuthMethod,
  inferPrivyPrimaryLabel,
  pickPrivyEmbeddedEvmWallet,
  pickPrivyEmbeddedEvmUserWallet,
  privyLoginMethodsToOptions,
  useSafePrivy,
  useSafeSmartWallets,
  useSafeSvmWallets,
  useSafeWallets,
} from "./privy-auth";
import type { PrivyClientConfig } from "@privy-io/react-auth";
import { buildPrivySvmWalletState } from "./privy-svm";
import { sendPrivySmartWalletTransaction } from "./privy-execution";
import { useEmbeddedSessionSource } from "../sources/embedded-session-source";

export type AomiPrivyPluginProviderProps = {
  children: ReactNode;
  supportedChains: readonly Chain[];
  loginMethods?: PrivyClientConfig["loginMethods"];
  execution?: ExecutionConfig;
  account?: AccountConfig;
  preferDirectSend?: boolean;
  externalSvmWallet?: SafeSvmWalletState;
};

export function AomiPrivyPluginProvider({
  children,
  supportedChains,
  loginMethods,
  execution,
  account,
  preferDirectSend = true,
  externalSvmWallet,
}: AomiPrivyPluginProviderProps) {
  const privy = useSafePrivy();
  const { client: smartWalletClient, getClientForChain } =
    useSafeSmartWallets();
  const { wallets: solanaWallets } = useSafeSvmWallets();
  const { wallets: connectedWallets } = useSafeWallets();
  const contextSvmWallet = useSafeSvmWallet();
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
  const startPrivyAuthFlow = useCallback(
    (reason: string) => {
      evmRuntime.registryStore.dispatch({
        type: "provider/auth-flow-started",
        reason,
        now: Date.now(),
      });
    },
    [evmRuntime.registryStore],
  );
  const smartAddress = smartWalletClient?.account?.address as Hex | undefined;
  // Embedded EVM EOA from Privy's connected-wallet snapshot or user record.
  // Surfaced as a synthetic EVM connection so it appears in "Connected now"
  // with write capability, mirroring the Para session source. Falls back to
  // the smart wallet address when one is active so account-abstracted
  // execution stays the primary surface when present.
  const embeddedEvmWallet = pickPrivyEmbeddedEvmWallet(connectedWallets);
  const embeddedEvmUserWallet = pickPrivyEmbeddedEvmUserWallet(privy.user);
  const embeddedEvmAddress = (embeddedEvmWallet?.address ??
    embeddedEvmUserWallet?.address) as Hex | undefined;
  // Backend-owned AA treats Privy's embedded EOA as the owner and provisions
  // its executor server-side. Never replace the owner identity with Privy's
  // client-managed smart account when both are present.
  const sessionEvmAddress = embeddedEvmAddress ?? smartAddress ?? null;
  const sessionReady =
    privy.authenticated &&
    Boolean(embeddedEvmWallet || embeddedEvmUserWallet || smartAddress);
  const activeSolanaWallet =
    solanaWallets.find((wallet) => wallet.address === activeSolanaAddress) ??
    solanaWallets[0];
  const privySvmWallet = useMemo(
    () =>
      buildPrivySvmWalletState({
        wallet: activeSolanaWallet,
        wallets: solanaWallets,
        setActiveAddress: setActiveSolanaAddress,
      }),
    [activeSolanaWallet, solanaWallets],
  );
  const svmWallet = useMergedSvmWallet(
    externalSvmWallet ?? contextSvmWallet,
    privySvmWallet,
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

  useEmbeddedSessionSource(evmRuntime.registryStore, {
    up: sessionReady,
    providerId: "privy",
    uid: "privy-smart-session",
    stableId: "privy",
    walletName: "Privy Smart Wallet",
    embeddedEvmAddress: sessionEvmAddress,
    chainId: selectedEvmChainId,
  });

  const authMethod = inferPrivyAuthMethod(privy.user);
  const primaryLabel = inferPrivyPrimaryLabel(privy.user);
  const authRuntime = useMemo<AuthRuntime>(
    () => ({
      provider: "privy",
      sessionProvider: "privy",
      embeddedProvider: "privy",
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
      startFlow: startPrivyAuthFlow,
      login: async (reason = "provider-auth-modal") => {
        evmRuntime.registryStore.dispatch({
          type: "user/provider-reconnect-requested",
          now: Date.now(),
        });
        startPrivyAuthFlow(reason);
        await privy.login();
      },
      logout: privy.logout,
      getCredential:
        (privy.getIdentityToken ?? privy.getAccessToken)
          ? async (): Promise<AomiAccountCredential | null> => {
              const identityToken = (await privy.getIdentityToken?.())?.trim();
              if (identityToken) {
                return {
                  provider: "privy",
                  tokenKind: "identity_token",
                  providerToken: identityToken,
                };
              }
              const accessToken = (await privy.getAccessToken?.())?.trim();
              return accessToken
                ? {
                    provider: "privy",
                    tokenKind: "access_token",
                    providerToken: accessToken,
                  }
                : null;
            }
          : undefined,
    }),
    [
      authMethod,
      loginMethods,
      primaryLabel,
      privy.authenticated,
      privy.getAccessToken,
      privy.getIdentityToken,
      privy.login,
      privy.logout,
      privy.ready,
      privy.user?.id,
      evmRuntime.registryStore,
      startPrivyAuthFlow,
    ],
  );

  const transformPrivyAccounts = useCallback(
    (accounts: AomiAccount[]) =>
      accounts.map((account) => {
        if (
          !privy.authenticated ||
          account.provider !== "privy" ||
          (account.walletKind !== "embedded" &&
            account.walletKind !== "smart_account")
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
      evm: buildEvmExecutionRuntime(evmRuntime, {
        signMessage:
          embeddedEvmWallet && embeddedEvmAddress
            ? async (payload: WalletEip712Payload) => {
                const owner = payload.signer ?? embeddedEvmAddress;
                if (owner.toLowerCase() !== embeddedEvmAddress.toLowerCase()) {
                  throw new Error(
                    "The active Privy EOA is not the requested signer",
                  );
                }
                if (!payload.non_typed_data) {
                  throw new Error("Missing non_typed_data payload");
                }
                const provider = await embeddedEvmWallet.getEthereumProvider();
                const signature = await provider.request({
                  method: "personal_sign",
                  params: [payload.non_typed_data, owner],
                });
                if (typeof signature !== "string") {
                  throw new Error("Privy returned an invalid signature");
                }
                return { signature };
              }
            : undefined,
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
        signTypedData:
          embeddedEvmWallet && embeddedEvmAddress
            ? async (payload: WalletEip712Payload) => {
                const owner = payload.signer ?? embeddedEvmAddress;
                if (owner.toLowerCase() !== embeddedEvmAddress.toLowerCase()) {
                  throw new Error(
                    "The active Privy EOA is not the requested signer",
                  );
                }
                const args = toViemSignTypedDataArgs(payload);
                if (!args) throw new Error("Missing typed_data payload");
                const provider = await embeddedEvmWallet.getEthereumProvider();
                const signature = await provider.request({
                  method: "eth_signTypedData_v4",
                  params: [owner, JSON.stringify(args)],
                });
                if (typeof signature !== "string") {
                  throw new Error("Privy returned an invalid signature");
                }
                return { signature };
              }
            : smartWalletClient
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
    [
      embeddedEvmAddress,
      embeddedEvmWallet,
      evmRuntime,
      execution,
      getClientForChain,
      smartAddress,
      smartWalletClient,
    ],
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
      transformAccounts={transformPrivyAccounts}
      supportedChains={supportedChains}
    >
      {children}
    </AomiWalletKitComposer>
  );
}
