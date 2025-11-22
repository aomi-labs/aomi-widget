'use client'

// import { wagmiAdapter, projectId } from '../lib/wallet-manager'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppKitProvider } from '@reown/appkit/react'
import { mainnet, arbitrum, optimism, base, polygon } from '@reown/appkit/networks'
import React, { type ReactNode } from 'react'
import { cookieStorage, cookieToInitialState, createStorage, WagmiProvider, type Config } from 'wagmi'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { useEffect, useRef } from 'react'
import { useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'
import { useRuntimeActions } from '@/components/assistant-ui/runtime'

// Get projectId from https://dashboard.reown.com
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID

if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const networks = [mainnet, arbitrum, optimism, base, polygon]

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
})

// Set up queryClient
const queryClient = new QueryClient()


const appkitProjectId = projectId as string

// Set up metadata
const metadata = {
  name: 'appkit-example',
  description: 'AppKit Example',
  url: 'https://appkitexampleapp.com', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  return (
    <AppKitProvider
      adapters={[wagmiAdapter]}
      projectId={appkitProjectId}
      networks={[mainnet, arbitrum]}
      defaultNetwork={mainnet}
      metadata={metadata}
      features={{ analytics: true }}
    >
      <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </WagmiProvider>
    </AppKitProvider>
  )
}

export default ContextProvider

export function WalletSystemMessenger() {
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { sendSystemMessage } = useRuntimeActions();
  const lastWalletRef = useRef<{
    isConnected: boolean;
    address?: string;
    chainId?: number;
  }>({ isConnected: false });

  const getNetworkName = (id: number): string => {
    switch (id) {
      case 1:
        return 'ethereum';
      case 137:
        return 'polygon';
      case 42161:
        return 'arbitrum';
      case 8453:
        return 'base';
      case 10:
        return 'optimism';
      case 11155111:
        return 'sepolia';
      case 1337:
      case 31337:
        return 'testnet';
      case 59140:
        return 'linea-sepolia';
      case 59144:
        return 'linea';
      default:
        return 'testnet';
    }
  };

  // Handle initial connect or address change
  useEffect(() => {
    const prev = lastWalletRef.current;
    const normalizedAddress = address?.toLowerCase();
    const numericChainId = typeof chainId === 'string' ? Number(chainId) : chainId;

    const shouldNotify =
      isConnected &&
      normalizedAddress &&
      numericChainId &&
      (!prev.isConnected || prev.address !== normalizedAddress);

    if (shouldNotify) {
      const networkName = getNetworkName(numericChainId as number);
      const message = `User connected wallet with address ${normalizedAddress} on ${networkName} network (Chain ID: ${numericChainId}). Ready to help with transactions.`;
      console.log(message);
      void sendSystemMessage(message);
      lastWalletRef.current = {
        isConnected: true,
        address: normalizedAddress,
        chainId: numericChainId as number,
      };
    }
  }, [address, chainId, isConnected, sendSystemMessage]);

  // Handle disconnect
  useEffect(() => {
    const prev = lastWalletRef.current;
    if (!isConnected && prev.isConnected) {
      void sendSystemMessage('Wallet disconnected by user.');
      console.log('Wallet disconnected by user.');
      lastWalletRef.current = { isConnected: false };
    }
  }, [isConnected, sendSystemMessage]);

  // Handle network switch
  useEffect(() => {
    const prev = lastWalletRef.current;
    const normalizedAddress = address?.toLowerCase();
    const numericChainId = typeof chainId === 'string' ? Number(chainId) : chainId;

    if (
      isConnected &&
      normalizedAddress &&
      numericChainId &&
      prev.isConnected &&
      prev.address === normalizedAddress &&
      prev.chainId !== numericChainId
    ) {
      const networkName = getNetworkName(numericChainId);
      const message = `User switched wallet to ${networkName} network (Chain ID: ${numericChainId}).`;
      console.log(message);
      void sendSystemMessage(message);
      lastWalletRef.current = {
        isConnected: true,
        address: normalizedAddress,
        chainId: numericChainId,
      };
    }
  }, [address, chainId, isConnected, sendSystemMessage]);

  return null;
}
