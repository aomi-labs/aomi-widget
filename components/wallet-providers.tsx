'use client'

// import { wagmiAdapter, projectId } from '../lib/wallet-manager'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppKitProvider } from '@reown/appkit/react'
import { mainnet, arbitrum, optimism, base, polygon } from '@reown/appkit/networks'
import React, { type ReactNode } from 'react'
import { cookieStorage, cookieToInitialState, createStorage, WagmiProvider, type Config } from 'wagmi'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

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
