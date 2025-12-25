"use client"

import { createAppKit, AppKitProvider } from "@reown/appkit/react"
import { Config, WagmiProvider, cookieToInitialState } from "wagmi"
import React, { type ReactNode } from 'react'

import { appKitProviderConfig, wagmiAdapter } from "./config"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient()

// Initialize AppKit (runs once on client-side)
let appKitInitialized = false
const initializeAppKit = (config: Parameters<typeof createAppKit>[0]) => {
  if (appKitInitialized) return
  if (typeof window === 'undefined') return
  createAppKit(config)
  appKitInitialized = true
}

initializeAppKit(appKitProviderConfig)

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  return (
    <AppKitProvider {...appKitProviderConfig}>
      <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </WagmiProvider>
    </AppKitProvider>
  )
}

export default ContextProvider
