'use client'

import { wagmiAdapter, projectId } from '../lib/wallet-manager'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppKitProvider } from '@reown/appkit/react'
import { mainnet, arbitrum } from '@reown/appkit/networks'
import React, { type ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

// Set up queryClient
const queryClient = new QueryClient()

if (!projectId) {
  throw new Error('Project ID is not defined')
}

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
      themeVariables={{
        '--apkt-accent': 'white',
        '--w3m-border-radius-master': '99999999px',
        // '--apkt-border-radius-master': '99999999px'
      }}
    >
      <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </WagmiProvider>
    </AppKitProvider>
  )
}

export default ContextProvider
