'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ParaProvider, type TExternalWallet } from '@getpara/react-sdk';
import { http } from 'wagmi';
import { mainnet, arbitrum, optimism, polygon, base } from 'wagmi/chains';
import type { ReactNode } from 'react';

import '@getpara/react-sdk/styles.css';

import { getParaClient, isParaEnabled } from '@/lib/para-client';

const queryClient = new QueryClient();

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_PROJECT_ID
  || process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
  || '';
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '';

const externalWallets: TExternalWallet[] = [
  'METAMASK',
  'COINBASE',
  'RAINBOW',
  'WALLETCONNECT',
];

function getAlchemyTransports() {
  if (!alchemyApiKey) {
    return undefined;
  }

  return {
    [mainnet.id]: http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`),
    [arbitrum.id]: http(`https://arb-mainnet.g.alchemy.com/v2/${alchemyApiKey}`),
    [optimism.id]: http(`https://opt-mainnet.g.alchemy.com/v2/${alchemyApiKey}`),
    [polygon.id]: http(`https://polygon-mainnet.g.alchemy.com/v2/${alchemyApiKey}`),
    [base.id]: http(`https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`),
  };
}

export function isParaConfigured(): boolean {
  return isParaEnabled();
}

export function initWalletProviders() {
  // ParaProvider handles initialization internally.
}

export function initAppKit() {
  initWalletProviders();
}

export function Providers({ children }: { children: ReactNode }) {
  const paraClient = getParaClient();

  if (!paraClient) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ParaProvider
        paraClientConfig={paraClient}
        config={{
          appName: 'Aomi',
        }}
        paraModalConfig={{
          oAuthMethods: [],
          disableEmailLogin: false,
          disablePhoneLogin: false,
          theme: {
            mode: 'dark',
            accentColor: '#ffffff',
            backgroundColor: '#000000',
            foregroundColor: '#ffffff',
            borderRadius: 'lg',
          },
        }}
        externalWalletConfig={{
          wallets: externalWallets,
          evmConnector: {
            config: {
              chains: [mainnet, arbitrum, optimism, polygon, base],
              transports: getAlchemyTransports(),
            },
          },
          walletConnect: {
            projectId: walletConnectProjectId,
          },
        }}
      >
        {children}
      </ParaProvider>
    </QueryClientProvider>
  );
}
