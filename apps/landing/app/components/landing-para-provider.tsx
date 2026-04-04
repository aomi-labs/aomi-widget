"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import ParaWeb, {
  Environment,
  ParaEvent,
  ParaModal,
  type TExternalWallet,
  type TOAuthMethod,
} from "@getpara/react-sdk";
import { ParaProviderCore } from "@getpara/react-core/internal";
// @ts-expect-error — internal SDK provider via turbopack alias (see next.config.ts)
import { AuthProvider as ParaAuthProvider } from "@para-internal/auth-provider";
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
// ParaModal wrapper — bypasses ParaProviderMin entirely.
//
// ParaProviderMin's isReady gate never opens because the Zustand store
// subscription between @getpara/react-sdk-lite (Zustand 4) and
// @getpara/react-core (Zustand 5) is broken in pnpm monorepos.
//
// Instead we build a minimal provider chain from the SDK's primitives:
//   ParaProviderCore (CoreStoreContext, client init)
//     → AuthProvider (OAuth / phone / passkey flows)
//       → ParaModal (controlled by our own isOpen state)
//
// We pass the lite SDK's singleton store to ParaProviderCore so that
// getClient() and the bridge's useParaClient() hook continue to work.
// ---------------------------------------------------------------------------

function DirectParaModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  // Memoize the store ref — it's a module singleton and never changes, but
  // ParaProviderCore's useMemo depends on referential stability.
  const storeRef = useRef(paraLiteStore);

  // Create the client config once. ParaProviderCore calls
  // paraClientConfig.createClient() to instantiate the ParaWeb client and
  // stores it in the lite store (where getClient() reads it).
  const clientConfig = useMemo(
    () => ({
      apiKey: paraApiKey!,
      env: paraEnvironment,
      createClient: (apiKey: string, env?: Environment) =>
        env ? new ParaWeb(env, apiKey) : new ParaWeb(apiKey),
    }),
    [],
  );

  return (
    <ParaProviderCore
      paraClientConfig={clientConfig}
      config={{ appName: "Aomi Labs" }}
      store={storeRef.current}
      waitForReady={false}
    >
      <ParaAuthProvider>
        <ParaModal
          isOpen={isOpen}
          onClose={onClose}
          disableEmailLogin
          oAuthMethods={oAuthMethods}
          externalWallets={adapterWallets}
          walletConnect={
            walletConnectProjectId
              ? { projectId: walletConnectProjectId }
              : undefined
          }
        />
      </ParaAuthProvider>
    </ParaProviderCore>
  );
}

export function LandingParaProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = useCallback(() => {
    // The SDK's XState state machine can get stuck in "auth_flow" even when
    // the user has an active session (checkUserState network call failed or
    // raced during init). Body.js uses corePhase to decide between the login
    // screen (auth_flow) and the account screen (authenticated).
    //
    // Before opening, verify against the client and correct the store if
    // needed so logged-in users see account management, not a second login.
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
    // After the modal closes, nudge the bridge to re-sync auth state.
    // The bridge already listens for WALLETS_CHANGE_EVENT and calls
    // paraClient.isFullyLoggedIn() — this ensures disconnect is detected
    // even if LOGOUT_EVENT was swallowed by a race condition.
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(ParaEvent.WALLETS_CHANGE_EVENT, {
          detail: { data: null },
        }),
      );
    }, 200);
  }, []);

  if (!paraApiKey) {
    return <>{children}</>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* Our own ParaProviderCore + AuthProvider replaces ParaProviderMin.
          The lite SDK's singleton store is passed so getClient() works. */}
      <DirectParaModal isOpen={modalOpen} onClose={closeModal} />

      {/* Widget renders immediately. Bridge polls getClient() for auth. */}
      <WagmiProvider config={wagmiConfig}>
        <ParaWalletBridge onOpenModal={openModal}>
          {children}
        </ParaWalletBridge>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
