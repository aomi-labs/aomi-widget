'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PrivyProvider,
  usePrivy,
  type PrivyClientConfig,
} from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import {
  SmartWalletsProvider,
  useSmartWallets,
} from '@privy-io/react-auth/smart-wallets';
import {
  WagmiProvider,
  createConfig as createPrivyWagmiConfig,
} from '@privy-io/wagmi';
import { http, type Chain, type Transport } from 'viem';
import { useChainId } from 'wagmi';
import { arbitrum, base, mainnet, optimism, polygon } from 'wagmi/chains';

import { getTelegramUserId, readyTelegramWebApp } from '@/lib/telegram-webapp';

type RequestedFamily = 'evm' | 'svm';

const queryClient = new QueryClient();
const defaultNetworks = [mainnet, arbitrum, optimism, base, polygon] as const;
const defaultSolanaCluster = 'solana:mainnet';
const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_PROJECT_ID
  || process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
  || '';
const defaultTransports: Record<
  | typeof mainnet.id
  | typeof arbitrum.id
  | typeof optimism.id
  | typeof base.id
  | typeof polygon.id,
  Transport
> = {
  [mainnet.id]: http(mainnet.rpcUrls.default.http[0]),
  [arbitrum.id]: http(arbitrum.rpcUrls.default.http[0]),
  [optimism.id]: http(optimism.rpcUrls.default.http[0]),
  [base.id]: http(base.rpcUrls.default.http[0]),
  [polygon.id]: http(polygon.rpcUrls.default.http[0]),
};

function parseRequestedFamily(search: string): RequestedFamily {
  const family = new URLSearchParams(search).get('family');
  return family === 'solana' || family === 'svm' ? 'svm' : 'evm';
}

function useRequestedFamily(): RequestedFamily {
  const [family, setFamily] = useState<RequestedFamily>('evm');

  useEffect(() => {
    setFamily(parseRequestedFamily(window.location.search));
  }, []);

  return family;
}

function PrivyProviders({ children }: { children: React.ReactNode }) {
  const wagmiConfig = useMemo(
    () =>
      createPrivyWagmiConfig({
        chains: defaultNetworks,
        transports: defaultTransports,
        ssr: true,
      }),
    [],
  );

  if (!privyAppId) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={
        {
          appearance: {
            walletList: ['detected_wallets', 'metamask', 'wallet_connect'],
          },
          embeddedWallets: {
            ethereum: { createOnLogin: 'users-without-wallets' },
            solana: { createOnLogin: 'all-users' },
          },
          defaultChain: defaultNetworks[0] as Chain,
          supportedChains: defaultNetworks as unknown as Chain[],
          ...(walletConnectProjectId
            ? { walletConnectCloudProjectId: walletConnectProjectId }
            : {}),
          appName: 'Aomi',
        } as PrivyClientConfig
      }
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <SmartWalletsProvider>{children}</SmartWalletsProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

type SafePrivyHook = ReturnType<typeof usePrivy>;
type SafeSmartWalletsHook = ReturnType<typeof useSmartWallets>;
type SafeSolanaWalletsHook = ReturnType<typeof useSolanaWallets>;

const disconnectedPrivy: SafePrivyHook = {
  ready: false,
  authenticated: false,
  user: null,
  login: async () => undefined,
  logout: async () => undefined,
} as unknown as SafePrivyHook;

const disconnectedSmartWallets: SafeSmartWalletsHook = {
  client: undefined,
} as unknown as SafeSmartWalletsHook;

const disconnectedSolanaWallets: SafeSolanaWalletsHook = {
  wallets: [],
  ready: false,
} as unknown as SafeSolanaWalletsHook;

function useSafePrivy(): SafePrivyHook {
  try {
    return usePrivy();
  } catch {
    return disconnectedPrivy;
  }
}

function useSafeSmartWallets(): SafeSmartWalletsHook {
  try {
    return useSmartWallets();
  } catch {
    return disconnectedSmartWallets;
  }
}

function useSafeSolanaWallets(): SafeSolanaWalletsHook {
  try {
    return useSolanaWallets();
  } catch {
    return disconnectedSolanaWallets;
  }
}

function useSafeChainId(): number {
  try {
    return useChainId();
  } catch {
    return defaultNetworks[0].id;
  }
}

function ConnectPrivyContent() {
  const requestedFamily = useRequestedFamily();
  const { ready, authenticated, login, logout } = useSafePrivy();
  const { client: smartWalletClient } = useSafeSmartWallets();
  const { wallets: solanaWallets } = useSafeSolanaWallets();
  const chainId = useSafeChainId();

  const [tgUserId, setTgUserId] = useState<string | undefined>();
  const [forceNew, setForceNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginRequested = useRef(false);
  const forceNewHandled = useRef(false);
  const completionSent = useRef(false);

  useEffect(() => {
    readyTelegramWebApp();
    const params = new URLSearchParams(window.location.search);
    setTgUserId(getTelegramUserId() || undefined);
    setForceNew(params.get('force_new') === 'true');
  }, []);

  useEffect(() => {
    if (!ready || !forceNew || !authenticated || forceNewHandled.current) {
      return;
    }
    forceNewHandled.current = true;
    try {
      logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset Privy session.');
    }
  }, [authenticated, forceNew, logout, ready]);

  useEffect(() => {
    if (!ready || authenticated || loginRequested.current) {
      return;
    }
    loginRequested.current = true;
    try {
      login();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Privy login failed.');
      loginRequested.current = false;
    }
  }, [authenticated, login, ready]);

  const evmAddress = smartWalletClient?.account?.address;
  const svmAddress = solanaWallets[0]?.address;
  const providerLabel = requestedFamily === 'svm' ? 'Privy Solana' : 'Privy EVM';
  const desiredReady = requestedFamily === 'svm' ? Boolean(svmAddress) : Boolean(evmAddress);

  useEffect(() => {
    if (!authenticated || !desiredReady || completionSent.current) {
      return;
    }

    completionSent.current = true;
    const payload = {
      address: evmAddress ?? null,
      chainId: evmAddress ? chainId : null,
      ensName: null,
      svmAddress: svmAddress ?? null,
      svmCluster: svmAddress ? defaultSolanaCluster : null,
      walletProvider: 'privy',
      providerLabel,
    };

    const userId = tgUserId || `privy-${requestedFamily}-${evmAddress || svmAddress || 'wallet'}`;

    fetch('/api/sessions/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        address: payload.address,
        chainId: payload.chainId,
        svmAddress: payload.svmAddress,
        svmCluster: payload.svmCluster,
        walletProvider: payload.walletProvider,
        providerLabel: payload.providerLabel,
        source: 'mini_app',
      }),
    }).catch((err: unknown) => {
      console.warn('[privy-connect] backup POST failed:', err);
    });

    if (window.Telegram?.WebApp?.sendData) {
      window.Telegram.WebApp.sendData(JSON.stringify(payload));
      window.Telegram.WebApp.close();
      return;
    }

    console.log('[privy-connect] connected:', payload);
  }, [
    authenticated,
    chainId,
    desiredReady,
    evmAddress,
    providerLabel,
    requestedFamily,
    svmAddress,
    tgUserId,
  ]);

  let body = 'Opening Privy...';
  if (!privyAppId) {
    body = 'Privy is not configured for this Telegram app.';
  } else if (error) {
    body = error;
  } else if (!ready) {
    body = 'Loading Privy...';
  } else if (authenticated && !desiredReady) {
    body =
      requestedFamily === 'svm'
        ? 'Waiting for your Privy Solana wallet...'
        : 'Waiting for your Privy EVM wallet...';
  } else if (authenticated) {
    body = 'Connecting wallet to Telegram...';
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-white" />
        <p className="text-base font-medium">{providerLabel}</p>
        <p className="mt-3 text-sm text-white/65">{body}</p>
      </div>
    </main>
  );
}

export default function ConnectPrivyWallet() {
  return (
    <PrivyProviders>
      <ConnectPrivyContent />
    </PrivyProviders>
  );
}
