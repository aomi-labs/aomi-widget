"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import ParaWeb, {
  Environment,
  ParaEvent,
  ParaProviderMin,
  type TExternalWallet,
  type TOAuthMethod,
} from "@getpara/react-sdk";
// @ts-expect-error — internal SDK store via turbopack alias (see next.config.ts)
import { store as paraLiteStore } from "@para-internal/store";
import "@getpara/react-sdk/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defineChain, http, type Chain, type Transport } from "viem";
import { WagmiProvider, createConfig } from "wagmi";
import {
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  sepolia,
  linea,
  lineaSepolia,
} from "wagmi/chains";
import { ParaWalletBridge } from "@aomi-labs/widget-lib";

const useLocalhost = process.env.NEXT_PUBLIC_USE_LOCALHOST === "true";

const paraApiKey = process.env.NEXT_PUBLIC_PARA_API_KEY;
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  process.env.NEXT_PUBLIC_PROJECT_ID;
const paraEnvironment =
  (process.env.NEXT_PUBLIC_PARA_ENVIRONMENT as Environment | undefined) ??
  Environment.BETA;

const localhost = defineChain({
  id: 31337,
  name: "Localhost",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
  },
  blockExplorers: {
    default: {
      name: "Local",
      url: "http://127.0.0.1:8545",
    },
  },
});

const defaultNetworks = [
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  sepolia,
  linea,
  lineaSepolia,
] as const;

const networks = (useLocalhost
  ? [localhost, ...defaultNetworks]
  : [...defaultNetworks]) as readonly [Chain, ...Chain[]];

const transports = Object.fromEntries(
  networks.map((network) => [network.id, http(network.rpcUrls.default.http[0])]),
) as Record<number, Transport>;

const externalWallets: TExternalWallet[] = [
  "WALLETCONNECT",
  "METAMASK",
  "COINBASE",
  "RAINBOW",
  "RABBY",
];

const adapterWallets = walletConnectProjectId
  ? externalWallets
  : externalWallets.filter((wallet) => wallet !== "WALLETCONNECT");

const oAuthMethods: TOAuthMethod[] = ["GOOGLE"];

const wagmiConfig = createConfig({
  chains: networks,
  transports,
  ssr: true,
});

// ---------------------------------------------------------------------------
// ParaProviderMin wrapper
//
// ParaProviderMin gates its children + embedded modal behind `isReady`,
// which may never fire in pnpm monorepos due to Zustand store version
// mismatch between @getpara/react-sdk-lite and @getpara/react-core.
//
// Workaround: after the Para client initialises, force isReady = true in
// the lite store so the embedded modal renders with full ExternalWallet
// context (WalletConnect, MetaMask, Coinbase, etc.).
// ---------------------------------------------------------------------------

/** Force the lite store's isReady flag so ParaProviderMin unblocks. */
function useForceParaReady() {
  useEffect(() => {
    // Poll briefly — the client is created async inside ParaProviderCore.
    const id = setInterval(() => {
      const s = paraLiteStore.getState() as any;
      if (s.client && !s.paraState?.isReady) {
        paraLiteStore.setState({
          paraState: { ...s.paraState, isReady: true },
        });
        clearInterval(id);
      } else if (s.paraState?.isReady) {
        clearInterval(id);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);
}

/**
 * Invisible child of ParaProviderMin that:
 * 1. Forces isReady so the embedded modal can render
 * 2. Renders nothing itself — the widget lives outside ParaProviderMin
 */
function ParaReadyForcer() {
  useForceParaReady();
  return null;
}

export function LandingParaProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = useCallback(() => {
    const state = paraLiteStore.getState() as any;
    const client = state.client as ParaWeb | null;
    const corePhase = state.paraState?.corePhase;

    if (client && corePhase === "auth_flow") {
      client
        .isFullyLoggedIn()
        .then((loggedIn: boolean) => {
          if (loggedIn) {
            paraLiteStore.setState({
              paraState: { ...state.paraState, corePhase: "authenticated" },
            });
          }
        })
        .catch(() => {})
        .finally(() => setModalOpen(true));
      return;
    }

    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(ParaEvent.WALLETS_CHANGE_EVENT, {
          detail: { data: null },
        }),
      );
    }, 200);
  }, []);

  const paraModalConfig = useMemo(
    () => ({
      isOpen: modalOpen,
      onClose: closeModal,
      disableEmailLogin: true,
      oAuthMethods,
    }),
    [modalOpen, closeModal],
  );

  const externalWalletConfig = useMemo(
    () => ({
      wallets: adapterWallets,
      ...(walletConnectProjectId
        ? { walletConnect: { projectId: walletConnectProjectId } }
        : {}),
    }),
    [],
  );

  if (!paraApiKey) {
    return <>{children}</>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* ParaProviderMin sets up the full provider chain including
          ExternalWalletWrapper so the modal shows wallet buttons.
          We force isReady via ParaReadyForcer so the embedded modal
          renders despite the Zustand version mismatch. */}
      <ParaProviderMin
        paraClientConfig={{
          apiKey: paraApiKey,
          env: paraEnvironment,
        }}
        config={{ appName: "Aomi Labs" }}
        paraModalConfig={paraModalConfig}
        externalWalletConfig={externalWalletConfig}
      >
        <ParaReadyForcer />
      </ParaProviderMin>

      {/* Widget renders immediately outside ParaProviderMin.
          Bridge polls the shared lite store for auth state. */}
      <WagmiProvider config={wagmiConfig}>
        <ParaWalletBridge onOpenModal={openModal}>
          {children}
        </ParaWalletBridge>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
