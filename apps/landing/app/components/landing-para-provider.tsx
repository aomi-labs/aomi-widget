"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Environment,
  ParaProviderMin,
  ParaEvent,
  type TExternalWallet,
  type TOAuthMethod,
} from "@getpara/react-sdk";
// @ts-expect-error internal SDK store via turbopack alias (see next.config.ts)
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

const oAuthMethods: TOAuthMethod[] = [
  "GOOGLE",
  "APPLE",
  "DISCORD",
  "TWITTER",
  "FACEBOOK",
  "TELEGRAM",
];
const disabledExternalWallets: TExternalWallet[] = [];

const wagmiConfig = createConfig({
  chains: networks,
  transports,
  ssr: true,
});

function useForceParaReady() {
  useEffect(() => {
    const id = setInterval(() => {
      const state = paraLiteStore.getState() as {
        client?: unknown;
        paraState?: { isReady?: boolean };
      };

      if (state.client && !state.paraState?.isReady) {
        paraLiteStore.setState({
          paraState: { ...state.paraState, isReady: true },
        });
        clearInterval(id);
      } else if (state.paraState?.isReady) {
        clearInterval(id);
      }
    }, 100);

    return () => clearInterval(id);
  }, []);
}

function ParaReadyForcer() {
  useForceParaReady();
  return null;
}

export function LandingParaProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [portalReady, setPortalReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setPortalReady(true);
    return () => setPortalReady(false);
  }, []);

  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(ParaEvent.WALLETS_CHANGE_EVENT, {
          detail: { data: null },
        }),
      );
    }, 200);
  };

  const externalWalletConfig = useMemo(
    () => ({
      wallets: disabledExternalWallets,
    }),
    [],
  );

  if (!paraApiKey) {
    return <>{children}</>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {portalReady
        ? createPortal(
            <ParaProviderMin
              paraClientConfig={{
                apiKey: paraApiKey,
                env: paraEnvironment,
              }}
              config={{ appName: "Aomi Labs" }}
              paraModalConfig={{
                isOpen: modalOpen,
                onClose: closeModal,
                disableEmailLogin: false,
                disablePhoneLogin: false,
                oAuthMethods,
              }}
              externalWalletConfig={externalWalletConfig}
            >
              <ParaReadyForcer />
            </ParaProviderMin>,
            document.body,
          )
        : null}

      <WagmiProvider config={wagmiConfig}>
        <ParaWalletBridge
          onOpenModal={(_step) => {
            setModalOpen(true);
          }}
        >
          {children}
        </ParaWalletBridge>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
